import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { SonarrQueueItem, SonarrSeries } from '../dto/sonarr.dto';
import { AddSeriesRequest, SeriesSearchRequest } from '../dto/request.dto';
import { BaseDTO } from '../dto/shared.dto';

import { SonarrRadarrService } from '../services/sonarr-radarr.service';
import { XApiKeyGuard } from '../guards/x-api-key.guard';

import { Public } from 'src/auth/public.decorator';
import { MediaMountState } from 'src/entities/media-mount.entity';
import { getFreeSpace } from '../mappers/media-mapper';

@Controller({
  path: 'sonarr/v1',
})
@Public()
@UseGuards(XApiKeyGuard)
export class SonarrController {
  public constructor(private readonly sonarrRadarrService: SonarrRadarrService) {}

  @Get('system/status')
  public async getStatus() {
    return this.sonarrRadarrService.getSystemStatus();
  }

  @Get('series')
  public async getSeries(): Promise<SonarrSeries[]> {
    return this.sonarrRadarrService.getSeriesList();
  }

  @Get('series/queue')
  public async getSeriesQueue(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{ page: number; pageSize: number; recordsTotal: number; totalRecords: number; items: SonarrQueueItem[] }> {
    const items = await this.sonarrRadarrService.getSeriesQueue();

    return {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 100,
      recordsTotal: items.length,
      totalRecords: items.length,
      items,
    };
  }

  @Get('series/:id')
  public async getSeriesById(@Param('id', ParseIntPipe) id: number): Promise<SonarrSeries> {
    return this.sonarrRadarrService.getSeriesById(String(id));
  }

  @Post('series')
  public async addSeries(@Body() body: AddSeriesRequest): Promise<SonarrSeries> {
    return this.sonarrRadarrService.addSeries(body);
  }

  @Put('series/:id/delete')
  public async removeSeries(
    @Param('id', ParseIntPipe) id: number,
    @Query('deleteFiles') deleteFiles: boolean,
  ): Promise<void> {
    return this.sonarrRadarrService.removeTVShow(String(id), deleteFiles);
  }

  @Put('series/:id')
  public async updateSeries(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { seasons: { seasonNumber: number; monitored: boolean }[] },
  ): Promise<void> {
    return this.sonarrRadarrService.updateSeries(String(id), body);
  }

  @Post('series/:id/triggerSearch')
  public async triggerSeriesSearch(
    @Param('id', ParseIntPipe) id: number,
    @Body() _body: SeriesSearchRequest,
  ): Promise<void> {
    return this.sonarrRadarrService.triggerSeriesSearch(String(id));
  }

  @Post('series/:id/seasons/:seasonId/triggerSearch')
  public async triggerSeasonSearch(
    @Param('id', ParseIntPipe) id: number,
    @Param('seasonId', ParseIntPipe) seasonId: number,
    @Body() body: SeriesSearchRequest,
  ): Promise<void> {
    return this.sonarrRadarrService.triggerSeasonSearch(String(id), {
      seasonNumber: body.seasonNumber,
    });
  }

  @Get('rootfolder')
  public async getRootFolders(): Promise<BaseDTO[]> {
    const rootFolders = await this.sonarrRadarrService.getRootFolders();

    return Promise.all(
      rootFolders.map(async (mount) => ({
        id: String(mount.id),
        path: mount.path,
        freeSpace: await getFreeSpace(mount.path),
        isAvailable: mount.state === MediaMountState.READY,
      }))
    );
  }
}
