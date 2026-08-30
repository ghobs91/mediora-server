# Mediora client integration — module scaffolding

New tree under `packages/api/src/modules/sonarr-radarr/`. This is a skeleton with
clear TODOs — wire the real service dependencies to finish it.
See `docs/MEDIORA_CLIENT_INTEGRATION.md` for the contract, field sets, and plan.

---

### `sonarr-radarr.module.ts`

```ts
import { Module } from '@nestjs/common';

import { RadarrController } from './radarr.controller';
import { SonarrController } from './sonarr.controller';
import { SonarrRadarrService } from './sonarr-radarr.service';
import { XApiKeyGuard } from './guards/x-api-key.guard';
import { TmdbModule } from '../tmdb/tmdb.module';
import { TransmissionModule } from '../transmission/transmission.module';

@Module({
  imports: [TmdbModule, TransmissionModule],
  controllers: [RadarrController, SonarrController],
  providers: [SonarrRadarrService, XApiKeyGuard],
})
export class SonarrRadarrModule {}
```

---

### `guards/x-api-key.guard.ts`

```ts
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { env } from 'src/env';

/**
 * Validates the X-Api-Key header the Mediora client sends.
 * Mark the v3 controllers @Public() so the global JwtAuthGuard is skipped,
 * then this guard enforces the API key.
 */
@Injectable()
export class XApiKeyGuard {
  public canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers['x-api-key'];
    const expected = env.SONARR_RADARR_API_KEY; // set this in .env

    // Minimal v1: accept any non-empty key once setup is complete.
    // Tighten to an exact match once you have a stored key.
    if (!key || typeof key !== 'string' || key.length === 0) {
      throw new UnauthorizedException('Missing X-Api-Key');
    }
    if (expected && key !== expected) {
      throw new UnauthorizedException('Invalid X-Api-Key');
    }
    return true;
  }
}
```

---

### `dto/shared.dto.ts`

```ts
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('SystemStatusResponse')
export class SystemStatusDto {
  @Field() appName: string;
  @Field() version: string;
  @Field({ nullable: true }) startTime?: string;
  @Field({ nullable: true }) os?: string;
}

@ObjectType('RootFolderResponse')
export class RootFolderDto {
  @Field({ type: Int }) id: number;
  @Field() path: string;
  @Field({ type: Float }) freeSpace: number;
  @Field() accessible: boolean;
}

@ObjectType('QualityProfileResponse')
export class QualityProfileDto {
  @Field({ type: Int }) id: number;
  @Field() name: string;
}
```

---

### `dto/radarr.dto.ts`

```ts
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('RadarrMovie')
export class RadarrMovieDto {
  @Field({ type: Int }) id: number;
  @Field({ type: Int }) tmdbId: number;
  @Field() title: string;
  @Field() originalTitle: string;
  @Field() sortTitle: string;
  @Field() status: string;
  @Field() overview: string;
  @Field({ nullable: true }) year?: number;
  @Field({ nullable: true }) runtime?: number;
  @Field({ nullable: true }) imdbId?: string;
  @Field(() => [any]) images: { coverType: string; url: string; remoteUrl?: string }[];
  @Field({ nullable: true }) remotePoster?: string;
  @Field({ nullable: true }) path?: string;
  @Field({ nullable: true }) folderName?: string;
  @Field({ nullable: true }) qualityProfileId?: number;
  @Field({ nullable: true }) rootFolderPath?: string;
  @Field() monitored: boolean;
  @Field() minimumAvailability: string;
  @Field() isAvailable: boolean;
  @Field() hasFile: boolean;
  @Field(() => [string]) genres: string[];
  @Field() ratings: { votes: number; value: number };
  @Field(() => [any]) tags: number[];
}

@ObjectType('RadarrQueueItem')
export class RadarrQueueItemDto {
  @Field({ type: Int }) id: number;
  @Field({ type: Int }) movieId: number;
  @Field() title: string;
  @Field({ type: Float }) size: number;
  @Field({ type: Float }) sizeleft: number;
  @Field() timeleft: string;
  @Field({ nullable: true }) estimatedCompletionTime?: string;
  @Field() status: string;
  @Field() trackedDownloadStatus: string;
  @Field() trackedDownloadState: string;
  @Field() downloadId: string;
  @Field() protocol: string;
  @Field() downloadClient: string;
  @Field() indexer: string;
  @Field() outputPath: string;
}

@ObjectType('RadarrQueueResponse')
export class RadarrQueueResponseDto {
  @Field(() => [RadarrQueueItemDto]) records: RadarrQueueItemDto[];
  @Field({ type: Int }) totalRecords: number;
}
```

---

### `dto/sonarr.dto.ts`

```ts
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('SonarrSeason')
export class SonarrSeasonDto {
  @Field({ type: Int }) seasonNumber: number;
  @Field() monitored: boolean;
  @Field({ nullable: true }) statistics?: any;
}

@ObjectType('SonarrSeries')
export class SonarrSeriesDto {
  @Field({ type: Int }) id: number;
  @Field({ type: Int }) tvdbId: number;
  @Field({ type: Int }) tmdbId: number;
  @Field() title: string;
  @Field() sortTitle: string;
  @Field() status: string;
  @Field() overview: string;
  @Field({ nullable: true }) year?: number;
  @Field({ nullable: true }) runtime?: number;
  @Field({ nullable: true }) network?: string;
  @Field({ nullable: true }) imdbId?: string;
  @Field(() => [any]) images: { coverType: string; url: string; remoteUrl?: string }[];
  @Field({ nullable: true }) remotePoster?: string;
  @Field(() => [SonarrSeasonDto]) seasons: SonarrSeasonDto[];
  @Field({ nullable: true }) path?: string;
  @Field({ nullable: true }) qualityProfileId?: number;
  @Field() seasonFolder: boolean;
  @Field() monitored: boolean;
  @Field() seriesType: string;
  @Field(() => [string]) genres: string[];
  @Field() ratings: { votes: number; value: number };
  @Field() hasFile: boolean;
  @Field() isAvailable: boolean;
  @Field(() => [any]) tags: number[];
}

@ObjectType('SonarrEpisode')
export class SonarrEpisodeDto {
  @Field({ type: Int }) id: number;
  @Field({ type: Int }) seriesId: number;
  @Field({ type: Int }) tvdbId: number;
  @Field({ type: Int }) episodeFileId: number;
  @Field({ type: Int }) seasonNumber: number;
  @Field({ type: Int }) episodeNumber: number;
  @Field() title: string;
  @Field() airDate: string;
  @Field() hasFile: boolean;
  @Field() monitored: boolean;
}

@ObjectType('SonarrEpisodeFile')
export class SonarrEpisodeFileDto {
  @Field({ type: Int }) id: number;
  @Field({ type: Int }) seriesId: number;
  @Field({ type: Int }) seasonNumber: number;
  @Field() relativePath: string;
  @Field() path: string;
  @Field({ type: Float }) size: number;
  @Field({ nullable: true }) sceneName?: string | null;
  @Field() quality: { quality: { id: number; name: string } };
}

@ObjectType('SonarrQueueItem')
export class SonarrQueueItemDto {
  @Field({ type: Int }) id: number;
  @Field({ type: Int }) seriesId: number;
  @Field({ type: Int }) episodeId: number;
  @Field() title: string;
  @Field({ type: Float }) size: number;
  @Field({ type: Float }) sizeleft: number;
  @Field() timeleft: string;
  @Field({ nullable: true }) estimatedCompletionTime?: string;
  @Field() status: string;
  @Field() trackedDownloadStatus: string;
  @Field() trackedDownloadState: string;
  @Field() downloadId: string;
  @Field() protocol: string;
  @Field() downloadClient: string;
  @Field() indexer: string;
  @Field() outputPath: string;
  @Field(() => SonarrEpisodeDto) episode: SonarrEpisodeDto;
  @Field(() => SonarrSeriesDto) series: SonarrSeriesDto;
}

@ObjectType('SonarrQueueResponse')
export class SonarrQueueResponseDto {
  @Field(() => [SonarrQueueItemDto]) records: SonarrQueueItemDto[];
  @Field({ type: Int }) totalRecords: number;
}
```

---

### `mappers/media-mapper.ts`

```ts
import { Movie } from 'src/entities/movie.entity';
import { TVShow } from 'src/entities/tvshow.entity';
import { RadarrMovieDto } from '../dto/radarr.dto';
import { SonarrSeriesDto } from '../dto/sonarr.dto';

/**
 * Maps Bobarr entities -> Radarr/Sonarr DTOs.
 * Fill in TMDB-sourced fields (year, runtime, imdbId, images, genres) via the
 * TmdbService; the mapper only needs Bobarr's stored columns + torrent/file
 * state for the required fields.
 */
export class MediaMapper {
  static toRadarrMovie(m: Movie, extra: Partial<RadarrMovieDto>): RadarrMovieDto {
    return {
      id: m.id,
      tmdbId: m.tmdbId,
      title: m.title,
      originalTitle: m.title,
      sortTitle: m.title.toLowerCase(),
      status: 'continued',
      overview: '',
      year: undefined,       // populate from TMDB
      runtime: undefined,
      imdbId: undefined,
      images: [],
      isAvailable: m.state === 'downloaded' || m.state === 'processed',
      hasFile: (m.files?.length ?? 0) > 0,
      monitored: true,
      minimumAvailability: 'released',
      ...extra,
    };
  }

  static toSonarrSeries(s: TVShow, extra: Partial<SonarrSeriesDto>): SonarrSeriesDto {
    return {
      id: s.id,
      tvdbId: 0,             // store tvdbId on TVShow (from TMDB)
      tmdbId: s.tmdbId,
      title: s.title,
      sortTitle: s.title.toLowerCase(),
      status: 'continued',
      overview: '',
      year: undefined,
      seasons: (s.seasons ?? []).map((season) => ({
        seasonNumber: season.seasonNumber,
        monitored: season.monitored ?? true,
      })),
      seasonFolder: true,
      monitored: true,
      seriesType: 'standard',
      isAvailable: true,
      hasFile: true,
      ...extra,
    };
  }
}
```

---

### `sonarr-radarr.service.ts`

```ts
import { Injectable } from '@nestjs/common';

/**
 * Orchestrates the v3 endpoints. Dependencies below are illustrative —
 * wire the real DAOs / services and resolve circular module imports.
 */
@Injectable()
export class SonarrRadarrService {
  constructor(
    // private readonly movieDAO: MovieDAO,
    // private readonly tvShowDAO: TVShowDAO,
    // private readonly torrentDAO: TorrentDAO,
    // private readonly tmdbService: TmdbService,
    // private readonly transmissionService: TransmissionService,
    // private readonly libraryOrg: LibraryOrganizationService, // trackMovie/trackTVShow/removeMovie/removeTVShow
  ) {}

  // ---- Radarr ----
  async getSystemStatus() {
    return { appName: 'Bobarr', version: '1.0.0', os: 'linux' };
  }

  async getRootFolders() {
    // map library mounts -> RootFolderDto[]
    return [];
  }

  async getMovies() {
    // query MovieDAO -> map to RadarrMovieDto[]
    return [];
  }

  async addMovie(payload: any) {
    // 1. create Movie { tmdbId: payload.tmdbId, title, state: 'searching' }
    // 2. kick off the existing download/search pipeline
    // 3. return RadarrMovieDto
    return {};
  }

  async getMovieQueue() {
    // join Torrent (resourceType=movie) + Transmission status
    // -> { records: RadarrQueueItemDto[], totalRecords }
    return { records: [], totalRecords: 0 };
  }

  // ---- Sonarr ----
  async getSeries() {
    // query TVShowDAO -> map to SonarrSeriesDto[]
    return [];
  }

  async addSeries(payload: any) {
    // 1. trackTVShow({ tmdbId, seasonNumbers })
    // 2. return SonarrSeriesDto
    return {};
  }

  async getEpisodesBySeriesId(seriesId: number) {
    // query TVEpisode rows for this TVShow
    return [];
  }

  async getSeriesQueue() {
    // join Torrent (resourceType=season|episode) + Transmission status
    // -> { records: SonarrQueueItemDto[], totalRecords }
    return { records: [], totalRecords: 0 };
  }

  async triggerSeasonSearch(seriesId: number, seasonNumber: number) {
    // re-run the Jackett search job for the season
  }
}
```

---

### `radarr.controller.ts`

```ts
import {
  Controller, Get, Post, Delete, Param, Query, Body, UseGuards,
} from '@nestjs/common';

import { Public } from 'src/auth/public.decorator';
import { XApiKeyGuard } from './guards/x-api-key.guard';
import { SonarrRadarrService } from './sonarr-radarr.service';

@Controller('radarr')
@Public()
@UseGuards(XApiKeyGuard)
export class RadarrController {
  constructor(private readonly svc: SonarrRadarrService) {}

  @Get('system/status')
  status() { return this.svc.getSystemStatus(); }

  @Get('rootFolder')
  rootFolders() { return this.svc.getRootFolders(); }

  @Get('qualityprofile')
  qualityProfiles() { return [{ id: 1, name: 'SD/HD' }]; }

  @Get('movie')
  movies() { return this.svc.getMovies(); }

  @Get('movie/:id')
  movie(@Param('id') id: string) { /* fetch Movie by id -> RadarrMovieDto */ }

  @Get('movie/lookup')
  lookupMovie(@Query('term') term: string) { /* TMDB search -> partial */ }

  @Post('movie')
  addMovie(@Body() body: any) { return this.svc.addMovie(body); }

  @Delete('movie/:id')
  async removeMovie(@Param('id') id: string, @Query('deleteFiles') deleteFiles: string) {
    await this.svc.removeMovie(Number(id), deleteFiles === 'true');
    return;
  }

  @Get('queue')
  queue() { return this.svc.getMovieQueue(); }
}
```

---

### `sonarr.controller.ts`

```ts
import {
  Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards,
} from '@nestjs/common';

import { Public } from 'src/auth/public.decorator';
import { XApiKeyGuard } from './guards/x-api-key.guard';
import { SonarrRadarrService } from './sonarr-radarr.service';

@Controller('sonarr')
@Public()
@UseGuards(XApiKeyGuard)
export class SonarrController {
  constructor(private readonly svc: SonarrRadarrService) {}

  @Get('system/status')
  status() { return this.svc.getSystemStatus(); }

  @Get('rootFolder')
  rootFolders() { return this.svc.getRootFolders(); }

  @Get('qualityprofile')
  qualityProfiles() { return [{ id: 1, name: 'SD/HD' }]; }

  @Get('series')
  series() { return this.svc.getSeries(); }

  @Get('series/:id')
  seriesById(@Param('id') id: string) { /* fetch TVShow by id -> SonarrSeriesDto */ }

  @Get('series/lookup')
  lookupSeries(@Query('term') term: string) { /* TMDB search -> partial */ }

  @Post('series')
  addSeries(@Body() body: any) { return this.svc.addSeries(body); }

  @Put('series/:id')
  async updateSeries(
    @Param('id') id: string,
    @Body() body: { seasons?: { seasonNumber: number; monitored: boolean }[] },
  ) {
    // toggle season monitored flags
    return;
  }

  @Delete('series/:id')
  async removeSeries(@Param('id') id: string, @Query('deleteFiles') deleteFiles: string) {
    await this.svc.removeTVShow(Number(id), deleteFiles === 'true');
    return;
  }

  @Get('episode')
  episodes(@Query('seriesId') seriesId: string) {
    return this.svc.getEpisodesBySeriesId(Number(seriesId));
  }

  @Get('episodefile')
  episodeFiles(@Query('seriesId') seriesId: string) {
    // map scanned File rows for this TVShow -> SonarrEpisodeFileDto[]
    return [];
  }

  @Get('queue')
  queue() { return this.svc.getSeriesQueue(); }

  @Post('command')
  command(@Body() body: { name: string; seriesId: number; seasonNumber: number }) {
    if (body.name === 'SeasonSearch') {
      return this.svc.triggerSeasonSearch(body.seriesId, body.seasonNumber);
    }
    return;
  }
}
```
