import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  RadarrMovie,
  RadarrQueueItem,
} from '../dto/radarr.dto';
import { AddMovieRequest } from '../dto/request.dto';
import { BaseDTO } from '../dto/shared.dto';

import { SonarrRadarrService } from '../services/sonarr-radarr.service';
import { XApiKeyGuard } from '../guards/x-api-key.guard';

import { Public } from 'src/auth/public.decorator';
import { MediaMountState } from 'src/entities/media-mount.entity';
import { getFreeSpace } from '../mappers/media-mapper';

@Controller({
  path: 'radarr/v1',
})
@Public()
@UseGuards(XApiKeyGuard)
export class RadarrController {
  public constructor(private readonly sonarrRadarrService: SonarrRadarrService) {}

  @Get('system/status')
  public async getStatus() {
    return this.sonarrRadarrService.getSystemStatus();
  }

  @Get('movie')
  public async getMovies(): Promise<RadarrMovie[]> {
    return this.sonarrRadarrService.getMovies();
  }

  @Get('movie/queue')
  public async getMovieQueue(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{ page: number; pageSize: number; recordsTotal: number; totalRecords: number; items: RadarrQueueItem[] }> {
    const items = await this.sonarrRadarrService.getMovieQueue();

    return {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 100,
      recordsTotal: items.length,
      totalRecords: items.length,
      items,
    };
  }

  @Get('movie/:id')
  public async getMovie(@Param('id') id: string): Promise<RadarrMovie> {
    return this.sonarrRadarrService.getMovie(id);
  }

  @Post('movie')
  public async addMovie(@Body() body: AddMovieRequest): Promise<RadarrMovie> {
    return this.sonarrRadarrService.addMovie(body);
  }

  @Put('movie/:id/delete')
  public async removeMovie(
    @Param('id') id: string,
    @Query('deleteFiles') deleteFiles: boolean,
  ): Promise<void> {
    return this.sonarrRadarrService.removeMovie(id, deleteFiles);
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
