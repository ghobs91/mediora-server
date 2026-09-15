import dayjs from 'dayjs';
import path from 'path';
import { promises as fs } from 'fs';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { mapSeries } from 'p-iteration';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { DataSource, EntityManager } from 'typeorm';
import { Logger } from 'winston';

import { Transaction, TransactionManager } from 'src/utils/transaction';

import {
  JobsQueue,
  FileType,
  DownloadableMediaState,
  OrganizeQueueProcessors,
  ParameterKey,
  OrganizeLibraryStrategy,
} from 'src/app.dto';

import allowedExtensions from 'src/utils/allowed-file-extensions.json';
import { formatNumber } from 'src/utils/format-number';

import { MovieDAO } from 'src/entities/dao/movie.dao';
import { TVSeasonDAO } from 'src/entities/dao/tvseason.dao';
import { TVEpisodeDAO } from 'src/entities/dao/tvepisode.dao';
import { TorrentDAO } from 'src/entities/dao/torrent.dao';

import { TransmissionService } from 'src/modules/transmission/transmission.service';
import { LibraryQueryService } from 'src/modules/library/library-query.service';
import { ParamsService } from 'src/modules/params/params.service';
import { FileDAO } from 'src/entities/dao/file.dao';
import { LibraryFoldersService } from 'src/modules/library/library-folders.service';

@Processor(JobsQueue.RENAME_AND_LINK)
export class OrganizeProcessor extends WorkerHost {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly dataSource: DataSource,
    private readonly transmissionService: TransmissionService,
    private readonly libraryService: LibraryQueryService,
    private readonly paramsService: ParamsService,
    private readonly libraryFoldersService: LibraryFoldersService
  ) {
    super();
    this.logger = this.logger.child({ context: 'OrganizeProcessor' });
  }

  public async process(job: Job): Promise<any> {
    switch (job.name) {
      case OrganizeQueueProcessors.HANDLE_MOVIE:
        return this.renameAndLinkMovie(job as Job<{ movieId: number }>);
      case OrganizeQueueProcessors.HANDLE_EPISODE:
        return this.renameAndLinkEpisode(job as Job<{ episodeId: number }>);
      case OrganizeQueueProcessors.HANDLE_SEASON:
        return this.renameAndLinkSeason(job as Job<{ seasonId: number }>);
      default:
        this.logger.warn('unknown organize job name', { name: job.name });
        return undefined;
    }
  }

  private getDownloadPath(filename: string): string {
    const downloadDir = '/downloads/complete';
    if (path.isAbsolute(filename)) {
      return path.normalize(filename);
    }
    return path.join(downloadDir, filename);
  }

  // fs-based organize: no shell interpolation (filenames with quotes/$/backticks
  // are safe), idempotent re-runs, and verifiable before torrent deletion.
  private async placeFile(
    strategy: OrganizeLibraryStrategy,
    src: string,
    dest: string
  ): Promise<void> {
    const normalizedSrc = path.normalize(src);
    const normalizedDest = path.normalize(dest);
    if (normalizedSrc.includes('..') || normalizedDest.includes('..')) {
      throw new Error(`refusing path with traversal: ${src} -> ${dest}`);
    }

    const srcStat = await fs.stat(normalizedSrc).catch(() => null);
    if (!srcStat) {
      throw new Error(`source file missing: ${normalizedSrc}`);
    }

    await fs.mkdir(path.dirname(normalizedDest), { recursive: true });

    // Idempotent re-run: if dest already exists with non-zero size, keep it.
    const destStat = await fs.stat(normalizedDest).catch(() => null);
    if (destStat && destStat.size > 0) {
      return;
    }
    // Remove stale empty dest / previous symlink so LINK acts like ln -sf.
    if (destStat) {
      await fs.unlink(normalizedDest).catch(() => undefined);
    }

    if (strategy === OrganizeLibraryStrategy.LINK) {
      await fs.symlink(normalizedSrc, normalizedDest);
    } else if (strategy === OrganizeLibraryStrategy.COPY) {
      await fs.copyFile(normalizedSrc, normalizedDest);
    } else {
      try {
        await fs.rename(normalizedSrc, normalizedDest);
      } catch (error) {
        // Cross-device move (EXDEV): fall back to copy + unlink.
        if (
          error instanceof Error &&
          'code' in error &&
          (error as NodeJS.ErrnoException).code === 'EXDEV'
        ) {
          await fs.copyFile(normalizedSrc, normalizedDest);
          await fs.unlink(normalizedSrc);
        } else {
          throw error;
        }
      }
    }

    const placed = await fs.stat(normalizedDest).catch(() => null);
    if (!placed || placed.size === 0) {
      throw new Error(`organize failed verification: ${normalizedDest}`);
    }
  }

  private async verifyDestinations(paths: string[]): Promise<void> {
    for (const p of paths) {
      const stat = await fs.stat(p).catch(() => null);
      if (!stat || stat.size === 0) {
        throw new Error(`destination missing before torrent delete: ${p}`);
      }
    }
  }

  @Transaction()
  public async renameAndLinkMovie(
    job: Job<{ movieId: number }>,
    @TransactionManager() manager?: EntityManager
  ) {
    const { movieId } = job.data;

    const movieDAO = MovieDAO.fromManager(manager!);
    const torrentDAO = TorrentDAO.fromManager(manager!);
    const fileDAO = FileDAO.fromManager(manager!);

    const organizeStrategy = (await this.paramsService.get(
      ParameterKey.ORGANIZE_LIBRARY_STRATEGY
    )) as OrganizeLibraryStrategy;

    this.logger.info(`start rename and ${organizeStrategy} movie`, { movieId });

    const movie = await this.libraryService.getMovie(movieId);
    const torrent = await this.transmissionService.getResourceTorrent({
      resourceId: movie.id,
      resourceType: FileType.MOVIE,
    });

    if (!torrent) {
      throw new Error(`No torrent found for movie ${movieId}`);
    }

    const year = dayjs(movie.releaseDate).format('YYYY');
    const folderName = `${movie.title} (${year})`;

    const nextName = [folderName, torrent.quality, torrent.tag.toUpperCase()]
      .filter((str) => str.toLowerCase() !== 'unknown')
      .join(' ');

    const torrentFiles = torrent.transmissionTorrent.files.reduce<
      Array<{ original: string; next: string }>
    >((results, file) => {
      const ext = path.extname(file.name);
      const isAllowedExt = allowedExtensions.includes(ext.replace(/^\./, ''));
      const alreadyProcessed = results.some((_) => _.original === file.name);

      if (isAllowedExt && !alreadyProcessed) {
        // find files with same extension, we will pick the largest file
        // which should be the movie and not a sample
        const sameExtensionFiles = torrent.transmissionTorrent.files.filter(
          (_) => _.name.endsWith(ext)
        );

        // we have more than one file, we will pick the largest
        if (sameExtensionFiles.length > 1) {
          const maxSizeFile = sameExtensionFiles.reduce((result, _) =>
            result && result.length > _.length ? result : _
          );

          return [
            ...results,
            { original: maxSizeFile.name, next: `${nextName}${ext}` },
          ];
        }

        return [...results, { original: file.name, next: `${nextName}${ext}` }];
      }

      if (!isAllowedExt && !alreadyProcessed) {
        const [fileName] = file.name.split('/').reverse();
        return [...results, { original: file.name, next: fileName }];
      }

      return results;
    }, []);

    const newFolder = path.join(
      await this.libraryFoldersService.getFolderPath('movies'),
      folderName
    );

    await fs.mkdir(newFolder, { recursive: true });
    await mapSeries(torrentFiles, async (torrentFile) => {
      const downloadPath = this.getDownloadPath(torrentFile.original);
      const destPath = path.join(newFolder, torrentFile.next);
      await this.placeFile(organizeStrategy, downloadPath, destPath);

      await fileDAO.save({
        movieId,
        path: destPath,
      });
    });

    if (organizeStrategy === OrganizeLibraryStrategy.MOVE) {
      const dests = torrentFiles.map((f) => path.join(newFolder, f.next));
      await this.verifyDestinations(dests);
      await this.transmissionService.removeTorrentAndFiles(torrent.torrentHash);
      await torrentDAO.remove(torrent);
    }

    await movieDAO.save({
      id: movieId,
      state: DownloadableMediaState.PROCESSED,
    });

    this.logger.info('finish rename and link movie', { movieId });
  }

  @Transaction()
  public async renameAndLinkEpisode(
    job: Job<{ episodeId: number }>,
    @TransactionManager() manager?: EntityManager
  ) {
    const { episodeId } = job.data;

    const tvEpisodeDAO = TVEpisodeDAO.fromManager(manager!);
    const torrentDAO = TorrentDAO.fromManager(manager!);
    const fileDAO = FileDAO.fromManager(manager!);

    const organizeStrategy = (await this.paramsService.get(
      ParameterKey.ORGANIZE_LIBRARY_STRATEGY
    )) as OrganizeLibraryStrategy;

    this.logger.info(`start rename and ${organizeStrategy} episode`, {
      episodeId,
    });

    const episode = await tvEpisodeDAO.findOneOrFail({
      where: { id: episodeId },
      relations: ['season', 'season.tvShow'],
    });

    const tvShow = await this.libraryService.getTVShow(
      episode.season.tvShow.id,
      { language: 'en' }
    );

    const torrent = await this.transmissionService.getResourceTorrent({
      resourceId: episode.id,
      resourceType: FileType.EPISODE,
    });

    if (!torrent) {
      throw new Error(`No torrent found for episode ${episodeId}`);
    }

    const seasonNb = formatNumber(episode.season.seasonNumber);
    const seasonFolder = path.join(
      await this.libraryFoldersService.getFolderPath('tvshows'),
      tvShow.title,
      `Season ${seasonNb}`
    );

    const torrentFiles = torrent.transmissionTorrent.files
      .filter((file) => {
        const ext = path.extname(file.name);
        return allowedExtensions.includes(ext.replace(/^\./, ''));
      })
      .map((file) => {
        const ext = path.extname(file.name);
        const next = [
          tvShow.title,
          `S${seasonNb}E${formatNumber(episode.episodeNumber)}`,
          `${torrent.quality} [${torrent.tag.toUpperCase()}]`,
        ].join(' - ');
        return { original: file.name, next: `${next}${ext}` };
      });

    await fs.mkdir(seasonFolder, { recursive: true });
    await mapSeries(torrentFiles, async (torrentFile) => {
      const downloadPath = this.getDownloadPath(torrentFile.original);
      const destPath = path.join(seasonFolder, torrentFile.next);
      await this.placeFile(organizeStrategy, downloadPath, destPath);

      await fileDAO.save({
        episodeId,
        path: destPath,
      });
    });

    if (organizeStrategy === OrganizeLibraryStrategy.MOVE) {
      const dests = torrentFiles.map((f) => path.join(seasonFolder, f.next));
      await this.verifyDestinations(dests);
      await this.transmissionService.removeTorrentAndFiles(torrent.torrentHash);
      await torrentDAO.remove(torrent);
    }

    await tvEpisodeDAO.save({
      id: episode.id,
      state: DownloadableMediaState.PROCESSED,
    });

    this.logger.info('finish rename and link episode', { episodeId });
  }

  @Transaction()
  public async renameAndLinkSeason(
    job: Job<{ seasonId: number }>,
    @TransactionManager() manager?: EntityManager
  ) {
    const { seasonId } = job.data;

    const tvSeasonDAO = TVSeasonDAO.fromManager(manager!);
    const tvEpisodeDAO = TVEpisodeDAO.fromManager(manager!);
    const torrentDAO = TorrentDAO.fromManager(manager!);
    const fileDAO = FileDAO.fromManager(manager!);

    const organizeStrategy = (await this.paramsService.get(
      ParameterKey.ORGANIZE_LIBRARY_STRATEGY
    )) as OrganizeLibraryStrategy;

    this.logger.info(`start rename and ${organizeStrategy} season`, {
      seasonId,
    });

    const season = await tvSeasonDAO.findOneOrFail({
      where: { id: seasonId },
      relations: ['tvShow', 'episodes'],
    });

    const tvShow = await this.libraryService.getTVShow(season.tvShow.id, {
      language: 'en',
    });

    const torrent = await this.transmissionService.getResourceTorrent({
      resourceId: season.id,
      resourceType: FileType.SEASON,
    });

    if (!torrent) {
      throw new Error(`No torrent found for season ${seasonId}`);
    }

    const seasonNb = formatNumber(season.seasonNumber);
    const seasonFolder = path.join(
      await this.libraryFoldersService.getFolderPath('tvshows'),
      tvShow.title,
      `Season ${seasonNb}`
    );

    const torrentFiles = torrent.transmissionTorrent.files.reduce(
      (
        results: Array<{
          original: string;
          ext: string;
          episodeNbs: number[];
          part?: string;
        }>,
        file
      ) => {
        const ext = path.extname(file.name);
        const fileName = path.basename(file.name.toUpperCase());

        const [, episodeNb1, episodeNb1End] =
          /S\d+ ?E(\d+)(?:\s*[-_~]\s*E?(\d+))?/.exec(fileName) || []; // S01E01, S01E01-E02
        const [, episodeNb2] = /\d+X(\d+)/.exec(fileName) || []; // 1x01
        const [, episodeNb3] = /(?:^|[\s._-])EP?(\d{1,3})(?:[\s._-]|$)/.exec(fileName) || []; // EP01 fallback

        const [, part] = /part ?(\d+)/.exec(fileName.toLowerCase()) || []; // Part1

        const episodeNbs = (() => {
          const start = episodeNb1 || episodeNb2 || episodeNb3;
          if (!start) return [];
          const startNb = parseInt(start, 10);
          const endNb = episodeNb1End ? parseInt(episodeNb1End, 10) : startNb;
          if (endNb < startNb || endNb - startNb > 20) return [startNb];
          return Array.from(
            { length: endNb - startNb + 1 },
            (_, i) => startNb + i
          );
        })();

        if (
          episodeNbs.length > 0 &&
          allowedExtensions.includes(ext.replace(/^\./, ''))
        ) {
          return [
            ...results,
            {
              ext,
              part,
              original: file.name,
              episodeNbs,
            },
          ];
        }

        return results;
      },
      []
    );

    if (torrentFiles.length === 0) {
      this.logger.error('did not find any files in torrent');
      this.logger.error('here are the raw torrent files (before filter)', {
        files: torrent.transmissionTorrent.files,
      });

      throw new Error('could not find any files in torrent');
    }

    await fs.mkdir(seasonFolder, { recursive: true });
    const placedPaths: string[] = [];
    await mapSeries(torrentFiles, async (file) => {
      const downloadPath = this.getDownloadPath(file.original);
      // One source file can cover a multi-episode range (E01-E02): link it
      // once per episode so each episode row resolves to a playable file.
      for (const episodeNb of file.episodeNbs) {
        const newName = [
          tvShow.title,
          `S${seasonNb}E${formatNumber(episodeNb)}`,
          file.part ? `Part ${file.part}` : undefined,
          `${torrent.quality} [${torrent.tag.toUpperCase()}]`,
        ]
          .filter((v) => v !== undefined)
          .join(' - ');

        const destPath = path.join(seasonFolder, `${newName}${file.ext}`);
        await this.placeFile(organizeStrategy, downloadPath, destPath);
        placedPaths.push(destPath);

        const episode = season.episodes.find(
          (k) => k.episodeNumber === episodeNb
        );

        if (episode) {
          await fileDAO.save({
            episodeId: episode.id,
            path: destPath,
          });
        }
      }
    });

    if (organizeStrategy === OrganizeLibraryStrategy.MOVE) {
      await this.verifyDestinations(placedPaths);
      await this.transmissionService.removeTorrentAndFiles(torrent.torrentHash);
      await torrentDAO.remove(torrent);
    }

    const coveredEpisodeNbs = new Set(
      torrentFiles.flatMap((file) => file.episodeNbs)
    );
    // set downloaded episodes to processed
    await tvEpisodeDAO.save(
      season.episodes
        .filter((episode) => coveredEpisodeNbs.has(episode.episodeNumber))
        .map((episode) => ({
          id: episode.id,
          state: DownloadableMediaState.PROCESSED,
        }))
    );

    // set other episodes to missing
    await tvEpisodeDAO.save(
      season.episodes
        .filter((episode) => !coveredEpisodeNbs.has(episode.episodeNumber))
        .map((episode) => ({
          id: episode.id,
          state: DownloadableMediaState.MISSING,
        }))
    );

    // set tvSeason as processed too
    await tvSeasonDAO.save({
      id: season.id,
      state: DownloadableMediaState.PROCESSED,
    });

    this.logger.info('finsh rename and link season', { seasonId });
  }
}
