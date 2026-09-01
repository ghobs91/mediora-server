import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { forEachSeries, forEach, reduce } from "p-iteration";
import { flatten, times, uniq } from "lodash";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import childCommand from "child-command";
import path from "path";
import { DeepPartial, DataSource, EntityManager } from "typeorm";

import { FileType, DownloadableMediaState } from "src/app.dto";
import { TransactionManager, LazyTransaction } from "src/utils/transaction";
import { MovieDAO } from "src/entities/dao/movie.dao";
import { Movie } from "src/entities/movie.entity";
import { TorrentDAO } from "src/entities/dao/torrent.dao";
import { TVShowDAO } from "src/entities/dao/tvshow.dao";
import { TVSeasonDAO } from "src/entities/dao/tvseason.dao";
import { TVEpisodeDAO } from "src/entities/dao/tvepisode.dao";
import { ParameterDAO } from "src/entities/dao/parameter.dao";
import { QualityDAO } from "src/entities/dao/quality.dao";
import { TagDAO } from "src/entities/dao/tag.dao";
import { FileDAO } from "src/entities/dao/file.dao";
import { TVSeason } from "src/entities/tvseason.entity";
import { TMDBService } from "src/modules/tmdb/tmdb.service";
import { JobsService } from "src/modules/jobs/jobs.service";
import { TransmissionService } from "src/modules/transmission/transmission.service";
import { ParamsService } from "src/modules/params/params.service";

@Injectable()
export class LibraryOrganizationService {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly dataSource: DataSource,
    private readonly movieDAO: MovieDAO,
    private readonly tmdbService: TMDBService,
    private readonly jobsService: JobsService,
    private readonly transmissionService: TransmissionService,
    private readonly paramsService: ParamsService,
  ) {
    this.logger = logger.child({ context: "LibraryOrganizationService" });
  }

  public async trackMovie(movieAttributes: DeepPartial<Movie>) {
    this.logger.info("track movie", { tmdbId: movieAttributes.tmdbId });
    const movie = await this.movieDAO.save(movieAttributes);
    await this.jobsService.startDownloadMovie(movie.id);
    return movie;
  }

  public async trackTVShow({
    tmdbId,
    seasonNumbers,
  }: {
    tmdbId: number;
    seasonNumbers: number[];
  }) {
    const { tvShow, missingSeasons } = await this.trackMissingSeasons({
      tmdbId,
      seasonNumbers,
    });
    await forEachSeries(missingSeasons, (season) =>
      this.jobsService.startDownloadSeason(season.id),
    );
    return tvShow;
  }

  @LazyTransaction()
  private async trackMissingSeasons(
    { tmdbId, seasonNumbers }: { tmdbId: number; seasonNumbers: number[] },
    @TransactionManager() manager?: EntityManager,
  ) {
    this.logger.info("track missing seasons", { seasonNumbers });
    const tvShowDAO = TVShowDAO.fromManager(manager!);
    const tvSeasonDAO = TVSeasonDAO.fromManager(manager!);
    const tvEpisodeDAO = TVEpisodeDAO.fromManager(manager!);
    const tmdbTVShow = await this.tmdbService.getTVShow(tmdbId);
    const tvShow = await tvShowDAO.findOrCreate({
      tmdbId,
      title: tmdbTVShow.name,
    });
    const missingSeasons = await reduce(
      seasonNumbers,
      async (result, seasonNumber) => {
        const tmdbSeason = tmdbTVShow.seasons.find(
          (_) => _.season_number === seasonNumber,
        );
        if (!tmdbSeason)
          throw new HttpException(
            `Season number ${seasonNumber} not found on TMDB`,
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        const alreadyExists = await tvSeasonDAO.findOne({
          where: { tvShow, seasonNumber },
        });
        if (alreadyExists) return result;
        const season = await tvSeasonDAO.save({ tvShow, seasonNumber });
        this.logger.info("new season added to library", {
          seasonId: season.id,
        });
        await tvEpisodeDAO.save(
          times(tmdbSeason.episode_count, (episodeNumber) => ({
            tvShow,
            season,
            seasonNumber,
            episodeNumber: episodeNumber + 1,
          })),
        );
        this.logger.info("new season episodes added to library", {
          seasonId: season.id,
        });
        return [...result, season];
      },
      [] as TVSeason[],
    );
    return { tvShow, missingSeasons };
  }

  @LazyTransaction()
  public async removeMovie(
    { tmdbId, softDelete = false }: { tmdbId: number; softDelete?: boolean },
    @TransactionManager() manager: EntityManager | null,
  ) {
    this.logger.info("start remove movie", { tmdbId });
    const movieDAO = MovieDAO.fromManager(manager!);
    const torrentDAO = TorrentDAO.fromManager(manager!);
    const fileDAO = FileDAO.fromManager(manager!);
    const movie = await movieDAO.findOneOrFail({
      where: { tmdbId },
      relations: ["files"],
    });
    const torrent = await torrentDAO.findOne({
      where: { resourceType: FileType.MOVIE, resourceId: movie.id },
    });
    if (torrent) {
      await this.transmissionService.removeTorrentAndFiles(torrent.torrentHash);
      await torrentDAO.remove(torrent);
      this.logger.info("movie torrent removed", { torrent: torrent.id });
    }
    await forEachSeries(
      uniq(movie.files.map((file) => path.dirname(file.path))),
      (folder) => childCommand(`rm -rf "${folder}"`),
    );
    await fileDAO.remove(movie.files);
    if (softDelete)
      await movieDAO.save({
        id: movie.id,
        state: DownloadableMediaState.MISSING,
      });
    else await movieDAO.remove(movie);
    this.logger.info("finish remove movie", { tmdbId });
  }

  @LazyTransaction()
  public async removeTVShow(
    tmdbId: number,
    @TransactionManager() manager?: EntityManager,
  ) {
    this.logger.info("start remove tv show", { tmdbId });
    const tvShowDAO = TVShowDAO.fromManager(manager!);
    const torrentDAO = TorrentDAO.fromManager(manager!);
    const fileDAO = FileDAO.fromManager(manager!);
    const tvShow = await tvShowDAO.findOneOrFail({
      where: { tmdbId },
      relations: ["seasons", "episodes", "episodes.files"],
    });
    await forEach(tvShow.seasons, async (season) => {
      const torrent = await torrentDAO.findOne({
        where: { resourceId: season.id, resourceType: FileType.SEASON },
      });
      if (torrent) {
        await torrentDAO.remove(torrent);
        await this.transmissionService.removeTorrentAndFiles(
          torrent.torrentHash,
        );
        this.logger.info("season torrent removed", { torrent: torrent.id });
      }
    });
    await forEach(tvShow.episodes, async (episode) => {
      const torrent = await torrentDAO.findOne({
        where: { resourceId: episode.id, resourceType: FileType.EPISODE },
      });
      if (torrent) {
        await torrentDAO.remove(torrent);
        await this.transmissionService.removeTorrentAndFiles(
          torrent.torrentHash,
        );
        this.logger.info("episode torrent removed", { torrent: torrent.id });
      }
    });
    const folders = uniq(
      flatten(
        tvShow.episodes.map((episode) =>
          episode.files.map((file) => path.dirname(path.dirname(file.path))),
        ),
      ),
    );
    await forEachSeries(folders, (folder) =>
      childCommand(`rm -rf "${folder}"`),
    );
    await fileDAO.remove(
      flatten(tvShow.episodes.map((episode) => episode.files)),
    );
    await tvShowDAO.remove(tvShow);
    this.logger.info("finish remove tv show", { tmdbId });
  }

  @LazyTransaction()
  public async reset(
    {
      deleteFiles = false,
      resetSettings = false,
    }: { deleteFiles: boolean; resetSettings: boolean },
    @TransactionManager() manager: EntityManager | null,
  ) {
    this.logger.info("start reset library", { deleteFiles, resetSettings });
    await MovieDAO.fromManager(manager!).delete({});
    await TVShowDAO.fromManager(manager!).delete({});
    await TVSeasonDAO.fromManager(manager!).delete({});
    await TVEpisodeDAO.fromManager(manager!).delete({});
    if (deleteFiles) {
      await forEachSeries(
        await TorrentDAO.fromManager(manager!).find(),
        (torrent) =>
          this.transmissionService.removeTorrentAndFiles(torrent.torrentHash),
      );
      await TorrentDAO.fromManager(manager!).delete({});
    }
    if (resetSettings) {
      await ParameterDAO.fromManager(manager!).delete({});
      await QualityDAO.fromManager(manager!).delete({});
      await TagDAO.fromManager(manager!).delete({});
      await this.paramsService.initializeParamsStore(manager);
      await this.paramsService.initializeQuality(manager);
    }
    this.jobsService.startScanLibrary();
    this.logger.info("finish reset library", { deleteFiles, resetSettings });
  }

  public async replaceSeason(seasonId: number, manager: EntityManager) {
    const tvSeasonDAO = TVSeasonDAO.fromManager(manager);
    const torrentDAO = TorrentDAO.fromManager(manager);
    const tvEpisodeDAO = TVEpisodeDAO.fromManager(manager);
    const fileDAO = FileDAO.fromManager(manager);
    const tvSeason = await tvSeasonDAO.findOneOrFail({
      where: { id: seasonId },
      relations: ["episodes", "episodes.files"],
    });
    if (tvSeason.state !== DownloadableMediaState.MISSING) {
      await forEach(tvSeason.episodes, async (episode) => {
        const torrent = await torrentDAO.findOne({
          where: { resourceId: episode.id, resourceType: FileType.EPISODE },
        });
        if (torrent) {
          await torrentDAO.remove(torrent);
          await this.transmissionService.removeTorrentAndFiles(
            torrent.torrentHash,
          );
          this.logger.info("episode torrent removed", { torrent: torrent.id });
        }
      });
      const folders = uniq(
        flatten(
          tvSeason.episodes.map((episode) =>
            episode.files.map((file) => path.dirname(file.path)),
          ),
        ),
      );
      await forEachSeries(folders, (folder) =>
        childCommand(`rm -rf "${folder}"`),
      );
      await fileDAO.remove(
        flatten(tvSeason.episodes.map((episode) => episode.files)),
      );
    }
    await tvEpisodeDAO.save(
      tvSeason.episodes.map((v) => ({
        id: v.id,
        state: DownloadableMediaState.SEARCHING,
      })),
    );
    await tvSeasonDAO.save({
      id: seasonId,
      state: DownloadableMediaState.DOWNLOADING,
    });
  }

  public async replaceTVEpisode(episodeId: number, manager: EntityManager) {
    const tvEpisodeDAO = TVEpisodeDAO.fromManager(manager);
    const torrentDAO = TorrentDAO.fromManager(manager);
    const episode = await tvEpisodeDAO.findOneOrFail({
      where: { id: episodeId },
    });
    if (episode.state !== DownloadableMediaState.MISSING) {
      const torrents = await torrentDAO.find({
        where: { resourceId: episodeId, resourceType: FileType.EPISODE },
      });
      await forEachSeries(torrents, (torrent) =>
        this.transmissionService.removeTorrentAndFiles(torrent.torrentHash),
      );
      await torrentDAO.remove(torrents);
    }
    await tvEpisodeDAO.save({
      id: episodeId,
      state: DownloadableMediaState.DOWNLOADING,
    });
  }

  public async replaceMovie(movieId: number, manager: EntityManager) {
    const movieDAO = MovieDAO.fromManager(manager);
    const torrentDAO = TorrentDAO.fromManager(manager);
    const movie = await movieDAO.findOneOrFail({ where: { id: movieId } });
    if (movie.state !== DownloadableMediaState.MISSING) {
      const torrents = await torrentDAO.find({
        where: { resourceId: movieId, resourceType: FileType.MOVIE },
      });
      await forEachSeries(torrents, (torrent) =>
        this.transmissionService.removeTorrentAndFiles(torrent.torrentHash),
      );
      await torrentDAO.remove(torrents);
    }
    await movieDAO.save({
      id: movieId,
      state: DownloadableMediaState.DOWNLOADING,
    });
  }
}
