import dayjs from 'dayjs';
import path from 'path';
import { childCommand } from 'child-command';
import { oneLine } from 'common-tags';
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

  private getOrganizeStrategyCommand(strategy: OrganizeLibraryStrategy) {
    switch (strategy) {
      case OrganizeLibraryStrategy.LINK:
        return 'ln -s';
      case OrganizeLibraryStrategy.MOVE:
        return 'mv';
      case OrganizeLibraryStrategy.COPY:
        return 'cp -R';
      default: {
        throw new Error('unknown strategy');
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

    await childCommand(`mkdir -p "${newFolder}"`);
    await mapSeries(torrentFiles, async (torrentFile) => {
      await childCommand(
        oneLine`
            cd "${newFolder}" &&
            ${this.getOrganizeStrategyCommand(organizeStrategy)}
              "../../downloads/complete/${torrentFile.original}"
              "${torrentFile.next}"
          `
      );

      await fileDAO.save({
        movieId,
        path: path.join(newFolder, torrentFile.next),
      });
    });

    if (organizeStrategy === OrganizeLibraryStrategy.MOVE) {
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

    await childCommand(`mkdir -p "${seasonFolder}"`);
    await mapSeries(torrentFiles, async (torrentFile) => {
      await childCommand(
        oneLine`
          cd "${seasonFolder}" &&
          ${this.getOrganizeStrategyCommand(organizeStrategy)}
            "../../../downloads/complete/${torrentFile.original}"
            "${torrentFile.next}"
        `
      );

      await fileDAO.save({
        episodeId,
        path: path.join(seasonFolder, torrentFile.next),
      });
    });

    if (organizeStrategy === OrganizeLibraryStrategy.MOVE) {
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
          episodeNb: number;
          part?: string;
        }>,
        file
      ) => {
        const ext = path.extname(file.name);
        const fileName = path.basename(file.name.toUpperCase());

        const [, episodeNb1] = /S\d+ ?E(\d+)/.exec(fileName) || []; // Foobar_S01E01.mkv
        const [, episodeNb2] = /\d+X(\d+)/.exec(fileName) || []; // Foobar_1x01.mkv
        const episodeNb = episodeNb1 || episodeNb2;

        const [, part] = /part ?(\d+)/.exec(fileName.toLowerCase()) || []; // Foobar_S01E01_Part1

        if (episodeNb && allowedExtensions.includes(ext.replace(/^\./, ''))) {
          return [
            ...results,
            {
              ext,
              part,
              original: file.name,
              episodeNb: parseInt(episodeNb, 10),
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

    await childCommand(`mkdir -p "${seasonFolder}"`);
    await mapSeries(torrentFiles, async (file) => {
      const newName = [
        tvShow.title,
        `S${seasonNb}E${formatNumber(file.episodeNb)}`,
        file.part ? `Part ${file.part}` : undefined,
        `${torrent.quality} [${torrent.tag.toUpperCase()}]`,
      ]
        .filter((v) => v !== undefined)
        .join(' - ');

      await childCommand(
        oneLine`
          cd "${seasonFolder}" &&
          ${this.getOrganizeStrategyCommand(organizeStrategy)}
          "../../../downloads/complete/${file.original}"
          "${newName}${file.ext}"
        `
      );

      const episode = season.episodes.find(
        (k) => k.episodeNumber === file.episodeNb
      );

      if (episode) {
        await fileDAO.save({
          episodeId: episode.id,
          path: `${path.join(seasonFolder, newName)}.${file.ext}`,
        });
      }
    });

    if (organizeStrategy === OrganizeLibraryStrategy.MOVE) {
      await this.transmissionService.removeTorrentAndFiles(torrent.torrentHash);
      await torrentDAO.remove(torrent);
    }

    // set downloaded episodes to processed
    await tvEpisodeDAO.save(
      season.episodes
        .filter((episode) =>
          torrentFiles.some((file) => file.episodeNb === episode.episodeNumber)
        )
        .map((episode) => ({
          id: episode.id,
          state: DownloadableMediaState.PROCESSED,
        }))
    );

    // set other episodes to missing
    await tvEpisodeDAO.save(
      season.episodes
        .filter((episode) =>
          torrentFiles.every((file) => file.episodeNb !== episode.episodeNumber)
        )
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
