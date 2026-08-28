import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseInterceptors } from '@nestjs/common';

import { GraphQLCommonResponse } from 'src/app.dto';
import { MediaMount, MediaMountAccessType } from 'src/entities/media-mount.entity';

import { makeCacheInterceptor } from '../redis/cache.interceptor';
import { CacheKeys } from '../redis/cache.dto';
import { MediaMountsService } from './media-mounts.service';

@Resolver(() => MediaMount)
export class MediaMountsResolver {
  public constructor(
    private readonly mediaMountsService: MediaMountsService,
  ) {}

  @UseInterceptors(makeCacheInterceptor({ key: CacheKeys.MEDIA_MOUNTS, ttl: 1000 * 30 }))
  @Query(() => [MediaMount])
  public async getMediaMounts(): Promise<MediaMount[]> {
    return this.mediaMountsService.findAll();
  }

  @Mutation(() => GraphQLCommonResponse)
  public async addMediaMount(
    @Args('path') path: string,
    @Args({ name: 'label', type: () => String, nullable: true }) label?: string,
    @Args({ name: 'accessType', type: () => MediaMountAccessType, nullable: true }) accessType?: MediaMountAccessType,
  ): Promise<GraphQLCommonResponse> {
    await this.mediaMountsService.add(path, label, accessType);
    return { success: true, message: 'MOUNT_ADDED' };
  }

  @Mutation(() => GraphQLCommonResponse)
  public async removeMediaMount(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<GraphQLCommonResponse> {
    await this.mediaMountsService.remove(id);
    return { success: true, message: 'MOUNT_REMOVED' };
  }

  @Mutation(() => GraphQLCommonResponse)
  public async updateMediaMountLabel(
    @Args('id', { type: () => Int }) id: number,
    @Args('label') label: string,
  ): Promise<GraphQLCommonResponse> {
    await this.mediaMountsService.updateLabel(id, label);
    return { success: true, message: 'MOUNT_LABEL_UPDATED' };
  }

  @Mutation(() => GraphQLCommonResponse)
  public async updateMediaMountAccessType(
    @Args('id', { type: () => Int }) id: number,
    @Args('accessType', { type: () => MediaMountAccessType }) accessType: MediaMountAccessType,
  ): Promise<GraphQLCommonResponse> {
    await this.mediaMountsService.updateAccessType(id, accessType);
    return { success: true, message: 'MOUNT_ACCESS_TYPE_UPDATED' };
  }

  @Mutation(() => GraphQLCommonResponse)
  public async refreshMediaMountState(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<GraphQLCommonResponse> {
    await this.mediaMountsService.refreshState(id);
    return { success: true, message: 'MOUNT_STATE_REFRESHED' };
  }

  @Query(() => [MediaMount])
  public async getWritableMediaMounts(): Promise<MediaMount[]> {
    return this.mediaMountsService.getWritableMounts();
  }
}
