import dayjs from "dayjs";
import axios from "axios";
import xmlParser from "xml2json-light";
import { uniq, uniqBy } from "lodash";
import { mapSeries } from "p-iteration";
import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { ParameterKey } from "src/app.dto";
import { formatNumber } from "src/utils/format-number";
import { sanitize } from "src/utils/sanitize";
import {
  formatSearchResult,
  isDownloadable,
  RankedResult,
  sortByBest,
} from "src/utils/torrent-ranking";

import { ParamsService } from "src/modules/params/params.service";
import { LibraryQueryService } from "src/modules/library/library-query.service";

import { TVSeasonDAO } from "src/entities/dao/tvseason.dao";
import { TVEpisodeDAO } from "src/entities/dao/tvepisode.dao";

import { JackettResult, JackettIndexer } from "./jackett.dto";
import { Entertainment } from "../tmdb/tmdb.dto";
import {
  JACKETT_RESPONSE_TIMEOUT,
  JACKETT_SEARCH_CONCURRENCY,
} from "src/config";
import { env } from "src/env";
import { mapConcurrent } from "src/utils/map-concurrent";

@Injectable()
export class JackettService {
  public constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly paramsService: ParamsService,
    private readonly libraryService: LibraryQueryService,
    private readonly tvSeasonDAO: TVSeasonDAO,
    private readonly tvEpisodeDAO: TVEpisodeDAO,
  ) {
    this.logger = logger.child({ context: "JackettService" });
  }

  private async request<TData>(
    path: string,
    params: Record<string, any>,
    timeoutMs = JACKETT_RESPONSE_TIMEOUT.manual,
  ) {
    const jackettApiKey = await this.paramsService.get(
      ParameterKey.JACKETT_API_KEY,
    );

    const client = axios.create({
      baseURL: env.JACKETT_BASE_URL,
      params: { apikey: jackettApiKey },
      timeout: timeoutMs,
    });

    return client.get<TData>(path, { params });
  }

  private async xmlRequest<TData>(
    path: string,
    params: Record<string, any>,
    timeoutMs = JACKETT_RESPONSE_TIMEOUT.manual,
  ) {
    const { data: xml } = await this.request(path, params, timeoutMs);
    return xmlParser.xml2json(xml) as TData;
  }

  public async getConfiguredIndexers() {
    try {
      const { indexers } = await this.xmlRequest<{
        indexers: {
          indexer: JackettIndexer[] | JackettIndexer;
        };
      }>(
        "/results/torznab",
        { t: "indexers", configured: true },
        JACKETT_RESPONSE_TIMEOUT.manual,
      );
      if (!indexers?.indexer) return [];
      return Array.isArray(indexers.indexer)
        ? indexers.indexer
        : [indexers.indexer];
    } catch (error) {
      this.logger.warn("jackett unreachable, returning no indexers", {
        error: error instanceof Error ? error.message : error,
      });
      return [];
    }
  }

  public async searchMovie(movieId: number, quality?: string) {
    this.logger.info("search movie", { movieId, quality });

    const maxSize = await this.paramsService.getNumber(
      ParameterKey.MAX_MOVIE_DOWNLOAD_SIZE,
    );

    const movie = await this.libraryService.getMovie(movieId);
    const queries = [
      `${movie.title} ${dayjs(movie.releaseDate).format("YYYY")}`,
      `${movie.originalTitle} ${dayjs(movie.releaseDate).format("YYYY")}`,
    ];

    return this.search(queries, { maxSize, type: Entertainment.Movie, quality });
  }

  public async searchSeason(seasonId: number, quality?: string) {
    this.logger.info("search tv season", { seasonId, quality });

    const maxSize = await this.paramsService.getNumber(
      ParameterKey.MAX_TVSHOW_EPISODE_DOWNLOAD_SIZE,
    );

    const tvSeason = await this.tvSeasonDAO.findOneOrFail({
      where: { id: seasonId },
      relations: ["tvShow", "episodes"],
    });

    const tvShow = await this.libraryService.getTVShow(tvSeason.tvShow.id);
    const enTVShow = await this.libraryService.getTVShow(tvSeason.tvShow.id, {
      language: "en",
    });

    const titles = [tvShow.title, enTVShow.title];
    if (this.canSearchOriginalTitle(tvShow.originCountry)) {
      titles.push(tvShow.originalTitle);
    }

    const queries = uniq(titles)
      // support "American Dad!" like
      .map((title) => title.replace("!", ""))
      .map((title) => [
        `${title} S${formatNumber(tvSeason.seasonNumber)}`,
        `${title} Season ${formatNumber(tvSeason.seasonNumber)}`,
        `${title} Saison ${formatNumber(tvSeason.seasonNumber)}`,
      ])
      .flat();

    return this.search(queries, {
      maxSize: maxSize * tvSeason.episodes.length,
      isSeason: true,
      type: Entertainment.TvShow,
      quality,
    });
  }

  public async searchEpisode(episodeId: number, quality?: string) {
    this.logger.info("search tv episode", { episodeId, quality });

    const maxSize = await this.paramsService.getNumber(
      ParameterKey.MAX_TVSHOW_EPISODE_DOWNLOAD_SIZE,
    );

    const tvEpisode = await this.tvEpisodeDAO.findOneOrFail({
      where: { id: episodeId },
      relations: ["tvShow"],
    });

    const tvShow = await this.libraryService.getTVShow(tvEpisode.tvShow.id);
    const enTVShow = await this.libraryService.getTVShow(tvEpisode.tvShow.id, {
      language: "en",
    });

    const s = formatNumber(tvEpisode.seasonNumber);
    const e = formatNumber(tvEpisode.episodeNumber);

    const titles = [tvShow.title, enTVShow.title];
    if (this.canSearchOriginalTitle(tvShow.originCountry)) {
      titles.push(tvShow.originalTitle);
    }

    const queries = uniq(titles)
      .map((title) => [
        `${title} S${s}E${e}`,
        `${title} Season ${s} Episode ${e}`,
        `${title} Saison ${s} Episode ${e}`,
      ])
      .flat();

    return this.search(queries, { maxSize, type: Entertainment.TvShow, quality });
  }

  public async search(
    queries: string[],
    opts: {
      maxSize?: number;
      isSeason?: boolean;
      withoutFilter?: boolean;
      quality?: string;
      type?: Entertainment;
    },
  ) {
    const indexers = await this.getConfiguredIndexers();
    const noResultsError = "NO_RESULTS";

    try {
      const timeout = opts.withoutFilter
        ? JACKETT_RESPONSE_TIMEOUT.manual
        : JACKETT_RESPONSE_TIMEOUT.automatic;
      const allIndexers = await mapConcurrent<
        JackettIndexer,
        RankedResult[] | undefined
      >(indexers, JACKETT_SEARCH_CONCURRENCY, (indexer) =>
        Promise.race([
          this.searchIndexer({ ...opts, queries, indexer, timeoutMs: timeout }),
          new Promise<undefined>((resolve) =>
            setTimeout(() => resolve(undefined), timeout),
          ),
        ]),
      );

      const flattenIndexers = allIndexers
        .filter((item): item is RankedResult[] => Boolean(item))
        ?.flat();

      const sortedByBest = sortByBest(flattenIndexers);

      let results = opts.withoutFilter ? sortedByBest : [sortedByBest[0]];

      if (opts.quality) {
        const byQuality = sortedByBest.filter(
          (result) => result.quality.label === opts.quality,
        );
        results = opts.withoutFilter ? byQuality : [byQuality[0]];
      }

      return results;
    } catch (error) {
      // return empty results array, let application continue it's lifecycle
      if (Array.isArray(error) && error[0].message === noResultsError) {
        return [];
      }

      // its a non handled error, throw
      // throw first non handled error from promises
      if (Array.isArray(error)) {
        throw error[0];
      }

      throw error;
    }
  }

  public async searchIndexer({
    queries,
    indexer,
    maxSize = Infinity,
    isSeason = false,
    withoutFilter = false,
    type,
    timeoutMs = JACKETT_RESPONSE_TIMEOUT.automatic,
  }: {
    queries: string[];
    indexer?: JackettIndexer;
    maxSize?: number;
    isSeason?: boolean;
    withoutFilter?: boolean;
    type?: Entertainment;
    timeoutMs?: number;
  }) {
    const qualityParams = await this.paramsService.getQualities(type);
    const preferredTags = await this.paramsService.getTags();

    const rawResults = await mapSeries(uniq(queries), async (query) => {
      const normalizedQuery = sanitize(query);
      this.logger.info("search torrents with query", {
        indexer: indexer?.title || "all",
        query: normalizedQuery,
      });

      try {
        const { data } = await this.request<{ Results: JackettResult[] }>(
          "/results",
          {
            Query: normalizedQuery,
            Category: [2000, 5000, 5070],
            Tracker: indexer ? [indexer.id] : undefined,
            _: Number(new Date()),
          },
          timeoutMs,
        );

        return data.Results;
      } catch (error) {
        this.logger.warn("indexer search failed, continuing", {
          indexer: indexer?.title || "all",
          error: error instanceof Error ? error.message : error,
        });
        return [];
      }
    });

    this.logger.info(`found ${rawResults.flat().length} potential results`);
    const results = uniqBy(rawResults.flat(), "Guid")
      .filter((result) => result.Link || result.MagnetUri)
      .map((result) =>
        formatSearchResult({ result, qualityParams, preferredTags }),
      )
      .filter((result) =>
        isDownloadable({ result, maxSize, isSeason, withoutFilter }),
      );

    this.logger.info(`found ${results.length} downloadable results`);

    return results;
  }

  private canSearchOriginalTitle(originalCountries: string[]) {
    // original titles may be hard to search on occidental trackers
    // they may return incorrect torrent to download
    return !originalCountries.some((country) =>
      ["CN", "CH", "JP"].includes(country),
    );
  }
}
