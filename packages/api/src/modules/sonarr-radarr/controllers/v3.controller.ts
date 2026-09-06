import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Public } from 'src/auth/public.decorator';
import { XApiKeyGuard } from '../guards/x-api-key.guard';
import { SonarrRadarrService } from '../services/sonarr-radarr.service';
import { SonarrV3Series } from '../dto/v3.dto';

interface SeriesLookupQuery {
  term?: string;
}

interface CommandBody {
  name: string;
  seriesId?: number;
  seasonNumber?: number;
  tmdbId?: number;
}

interface SeriesUpdateBody {
  seasons: { seasonNumber: number; monitored: boolean }[];
}

@Controller('api/v3')
@Public()
@UseGuards(XApiKeyGuard)
export class V3Controller {
  public constructor(private readonly sonarrRadarrService: SonarrRadarrService) {}

  // ---------------------------------------------------------------------------
  // Shared
  // ---------------------------------------------------------------------------

  @Get('system/status')
  public async getStatus() {
    return this.sonarrRadarrService.getV3SystemStatus();
  }

  @Get('rootFolder')
  public async getRootFolders() {
    return this.sonarrRadarrService.getRootFoldersV3();
  }

  @Get('qualityprofile')
  public async getQualityProfiles() {
    return this.sonarrRadarrService.getV3QualityProfiles();
  }

  @Get('queue')
  public async getQueue(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const [sonarrQueue, radarrQueue] = await Promise.all([
      this.sonarrRadarrService.getV3SonarrQueue(),
      this.sonarrRadarrService.getV3RadarrQueue(),
    ]);

    const records = [...sonarrQueue, ...radarrQueue];
    const size = Math.max(1, Math.min(Number(pageSize) || records.length || 1, 1000));
    const pageNb = Math.max(1, Number(page) || 1);
    const start = (pageNb - 1) * size;
    return {
      page: pageNb,
      pageSize: size,
      records: records.slice(start, start + size),
      totalRecords: records.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Sonarr v3
  // ---------------------------------------------------------------------------

  @Get('series')
  public async getSeries() {
    return this.sonarrRadarrService.getV3SeriesList();
  }

  @Get('series/lookup')
  public async lookupSeries(
    @Query() query: SeriesLookupQuery,
  ): Promise<SonarrV3Series[]> {
    const term = query.term?.trim();

    if (!term) return [];

    if (term.toLowerCase().startsWith('tvdb:')) {
      const tvdbId = Number(term.slice('tvdb:'.length));
      if (!Number.isFinite(tvdbId)) return [];
      return [await this.sonarrRadarrService.getV3SeriesByTvdbId(tvdbId)];
    }

    return this.sonarrRadarrService.searchV3Series(term);
  }

  @Get('series/:id')
  public async getSeriesById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SonarrV3Series> {
    return this.sonarrRadarrService.getV3Series(id);
  }

  @Post('series')
  public async addSeries(@Body() body: SonarrV3Series): Promise<SonarrV3Series> {
    return this.sonarrRadarrService.addV3Series(body);
  }

  @Put('series/:id')
  public async updateSeries(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SeriesUpdateBody,
  ): Promise<SonarrV3Series> {
    return this.sonarrRadarrService.updateV3Series(id, body);
  }

  @Delete('series/:id')
  public async deleteSeries(
    @Param('id', ParseIntPipe) id: number,
    @Query('deleteFiles') deleteFiles: string,
  ): Promise<void> {
    return this.sonarrRadarrService.removeTVShow(String(id), deleteFiles === 'true');
  }

  @Get('episode')
  public async getEpisodes(
    @Query('seriesId', ParseIntPipe) seriesId: number,
  ) {
    return this.sonarrRadarrService.getV3EpisodesBySeriesId(seriesId);
  }

  @Get('episodefile')
  public async getEpisodeFiles(
    @Query('seriesId', ParseIntPipe) seriesId: number,
  ) {
    return this.sonarrRadarrService.getV3EpisodeFilesBySeriesId(seriesId);
  }

  @Post('command')
  public async sendCommand(@Body() body: CommandBody): Promise<void> {
    if (body.name === 'SeasonSearch' && body.seriesId && body.seasonNumber) {
      return this.sonarrRadarrService.triggerV3SeasonSearch(
        body.seriesId,
        body.seasonNumber,
      );
    }

    if (body.name === 'SeriesSearch' && body.seriesId) {
      return this.sonarrRadarrService.triggerSeriesSearch(String(body.seriesId));
    }

    throw new BadRequestException(`Unsupported command: ${body.name}`);
  }

  // ---------------------------------------------------------------------------
  // Radarr v3
  // ---------------------------------------------------------------------------

  @Get('movie')
  public async getMovies() {
    const movies = await this.sonarrRadarrService.getV3MovieList();
    return movies;
  }

  // NOTE: static lookup routes must stay above `movie/:id`, otherwise
  // `lookup` matches `:id` and ParseIntPipe rejects it with a 400.
  @Get('movie/lookup')
  public async lookupMovie(@Query('term') term?: string) {
    const normalized = term?.trim();
    if (!normalized) return [];
    return this.sonarrRadarrService.searchV3Movies(normalized);
  }

  @Get('movie/lookup/tmdb')
  public async lookupMovieByTmdbId(
    @Query('tmdbId', ParseIntPipe) tmdbId: number,
  ) {
    return this.sonarrRadarrService.getV3MovieByTmdbId(tmdbId);
  }

  @Get('movie/:id')
  public async getMovie(@Param('id', ParseIntPipe) id: number) {
    return this.sonarrRadarrService.getV3Movie(id);
  }

  @Post('movie')
  public async addMovie(@Body() body: { tmdbId: number; title?: string }) {
    return this.sonarrRadarrService.addV3Movie(body);
  }

  @Delete('movie/:id')
  public async deleteMovie(
    @Param('id', ParseIntPipe) id: number,
    @Query('deleteFiles') deleteFiles: string,
  ): Promise<void> {
    return this.sonarrRadarrService.removeMovie(String(id), deleteFiles === 'true');
  }
}
