import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { DataSource, EntityManager } from "typeorm";
import { FileType, DownloadableMediaState } from "src/app.dto";
import { LazyTransaction, TransactionManager } from "src/utils/transaction";
import { TransmissionService } from "src/modules/transmission/transmission.service";
import { JackettInput } from "./library.dto";
import { LibraryOrganizationService } from "./library-organization.service";
import { MovieDAO } from "src/entities/dao/movie.dao";

@Injectable()
export class LibraryDownloadService {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly dataSource: DataSource,
    private readonly transmissionService: TransmissionService,
    private readonly organizationService: LibraryOrganizationService,
  ) {
    this.logger = logger.child({ context: "LibraryDownloadService" });
  }

  @LazyTransaction()
  public async downloadMovie(
    movieId: number,
    jackettResult: JackettInput,
    @TransactionManager() manager: EntityManager | null,
  ) {
    this.logger.info("start download movie", { movieId });
    this.logger.info(jackettResult.title);
    const movieDAO = MovieDAO.fromManager(manager!);
    const movie = await movieDAO.findOneOrFail({ where: { id: movieId } });
    if (movie.state !== DownloadableMediaState.MISSING)
      await this.organizationService.removeMovie(
        { tmdbId: movie.tmdbId, softDelete: true },
        manager,
      );
    await movieDAO.save({
      id: movieId,
      state: DownloadableMediaState.DOWNLOADING,
    });
    const torrent = await this.transmissionService.addTorrent(
      {
        torrent: jackettResult.downloadLink,
        torrentType: "url",
        torrentAttributes: {
          resourceType: FileType.MOVIE,
          resourceId: movieId,
          quality: jackettResult.quality,
          tag: jackettResult.tag,
        },
      },
      manager,
    );
    this.logger.info("download movie started", {
      movieId,
      torrent: torrent.id,
    });
  }

  @LazyTransaction()
  public async downloadTVSeason(
    seasonId: number,
    jackettResult: JackettInput,
    @TransactionManager() manager: EntityManager | null,
  ) {
    this.logger.info("start download tv season", { seasonId });
    this.logger.info(jackettResult.title);
    await this.organizationService.replaceSeason(seasonId, manager!);
    const torrent = await this.transmissionService.addTorrent(
      {
        torrent: jackettResult.downloadLink,
        torrentType: "url",
        torrentAttributes: {
          resourceType: FileType.SEASON,
          resourceId: seasonId,
          quality: jackettResult.quality,
          tag: jackettResult.tag,
        },
      },
      manager,
    );
    this.logger.info("download tv season started", {
      seasonId,
      torrentId: torrent.id,
    });
  }

  @LazyTransaction()
  public async downloadTVEpisode(
    episodeId: number,
    jackettResult: JackettInput,
    @TransactionManager() manager: EntityManager | null,
  ) {
    this.logger.info("start download tv episode", { episodeId });
    this.logger.info(jackettResult.title);
    await this.organizationService.replaceTVEpisode(episodeId, manager!);
    const torrent = await this.transmissionService.addTorrent(
      {
        torrent: jackettResult.downloadLink,
        torrentType: "url",
        torrentAttributes: {
          resourceType: FileType.EPISODE,
          resourceId: episodeId,
          quality: jackettResult.quality,
          tag: jackettResult.tag,
        },
      },
      manager,
    );
    this.logger.info("download episode started", {
      episodeId,
      torrentId: torrent.id,
    });
  }

  @LazyTransaction()
  public async downloadOwnTorrent(
    {
      mediaId,
      mediaType,
      torrent,
    }: { mediaId: number; mediaType: FileType; torrent: string },
    @TransactionManager() manager: EntityManager | null,
  ) {
    this.logger.info("start download own torrent", { mediaId, mediaType });
    const baseOpts = {
      torrent,
      torrentType: torrent.startsWith("magnet") ? "url" : "base64",
      torrentAttributes: { resourceId: mediaId, resourceType: mediaType },
    } as const;
    if (mediaType === FileType.SEASON)
      await this.organizationService.replaceSeason(mediaId, manager!);
    if (mediaType === FileType.EPISODE)
      await this.organizationService.replaceTVEpisode(mediaId, manager!);
    if (mediaType === FileType.MOVIE)
      await this.organizationService.replaceMovie(mediaId, manager!);
    const torrentEntity = await this.transmissionService.addTorrent(
      baseOpts,
      manager,
    );
    this.logger.info("download started", {
      mediaId,
      mediaType,
      torrentId: torrentEntity.id,
    });
  }
}
