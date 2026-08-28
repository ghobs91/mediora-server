import { promises as fs, constants as fsConstants, Stats } from 'fs';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MediaMount, MediaMountAccessType, MediaMountState } from 'src/entities/media-mount.entity';
import { getInitialMediaMountPaths } from 'src/config';

function getMountState(stats: Stats | null): MediaMountState {
  if (!stats) return MediaMountState.MISSING;
  if (!stats.isDirectory()) return MediaMountState.NOT_DIRECTORY;
  if (!(stats.mode & fsConstants.S_IRUSR)) return MediaMountState.INACCESSIBLE;
  if (stats.mode & fsConstants.S_IWUSR) return MediaMountState.READY;
  return MediaMountState.READ_ONLY;
}

function getLabelFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

@Injectable()
export class MediaMountsService implements OnModuleInit {
  public constructor(
    @InjectRepository(MediaMount)
    private readonly mediaMountRepository: Repository<MediaMount>,
  ) {}

  async onModuleInit() {
    await this.syncInitialMounts();
  }

  async syncInitialMounts() {
    const paths = getInitialMediaMountPaths();
    for (const path of paths) {
      let mount = await this.mediaMountRepository.findOne({ where: { path } });
      if (!mount) {
        const stats = await this.getStats(path);
        const state = getMountState(stats);
        mount = this.mediaMountRepository.create({
          path,
          label: getLabelFromPath(path),
          accessType: state === MediaMountState.READ_ONLY
            ? MediaMountAccessType.READ_ONLY
            : MediaMountAccessType.READ_WRITE,
          state,
          errorMessage: state === MediaMountState.MISSING
            ? 'Mount path does not exist inside the container'
            : state === MediaMountState.INACCESSIBLE
              ? 'Mount path is not readable by the container user'
              : null,
        });
        await this.mediaMountRepository.save(mount);
      }
    }

    const allMounts = await this.mediaMountRepository.find();
    const knownPaths = new Set(paths);
    for (const mount of allMounts) {
      if (!knownPaths.has(mount.path)) {
        await this.mediaMountRepository.remove(mount);
      }
    }
  }

  async findAll(): Promise<MediaMount[]> {
    return this.mediaMountRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<MediaMount | null> {
    return this.mediaMountRepository.findOne({ where: { id } });
  }

  async findByPath(path: string): Promise<MediaMount | null> {
    return this.mediaMountRepository.findOne({ where: { path } });
  }

  async add(path: string, label?: string, accessType?: MediaMountAccessType): Promise<MediaMount> {
    const existing = await this.findByPath(path);
    if (existing) {
      throw new Error(`Mount already exists at ${path}`);
    }

    const stats = await this.getStats(path);
    const state = getMountState(stats);

    const mount = this.mediaMountRepository.create({
      path,
      label: label || getLabelFromPath(path),
      accessType: accessType || (state === MediaMountState.READ_ONLY ? MediaMountAccessType.READ_ONLY : MediaMountAccessType.READ_WRITE),
      state,
      errorMessage: state === MediaMountState.MISSING
        ? 'Mount path does not exist inside the container'
        : state === MediaMountState.INACCESSIBLE
          ? 'Mount path is not readable by the container user'
          : null,
    });

    return this.mediaMountRepository.save(mount);
  }

  async remove(id: number): Promise<void> {
    const mount = await this.findOne(id);
    if (!mount) {
      throw new Error(`Mount not found: ${id}`);
    }
    await this.mediaMountRepository.remove(mount);
  }

  async updateLabel(id: number, label: string): Promise<MediaMount> {
    const mount = await this.findOne(id);
    if (!mount) {
      throw new Error(`Mount not found: ${id}`);
    }
    mount.label = label;
    return this.mediaMountRepository.save(mount);
  }

  async updateAccessType(id: number, accessType: MediaMountAccessType): Promise<MediaMount> {
    const mount = await this.findOne(id);
    if (!mount) {
      throw new Error(`Mount not found: ${id}`);
    }
    mount.accessType = accessType;
    return this.mediaMountRepository.save(mount);
  }

  async refreshState(id: number): Promise<MediaMount> {
    const mount = await this.findOne(id);
    if (!mount) {
      throw new Error(`Mount not found: ${id}`);
    }
    const stats = await this.getStats(mount.path);
    const state = getMountState(stats);
    mount.state = state;
    mount.accessType = state === MediaMountState.READ_ONLY
      ? MediaMountAccessType.READ_ONLY
      : mount.accessType;
    mount.errorMessage = state === MediaMountState.MISSING
      ? 'Mount path does not exist inside the container'
      : state === MediaMountState.INACCESSIBLE
        ? 'Mount path is not readable by the container user'
        : null;
    return this.mediaMountRepository.save(mount);
  }

  async getWritableMounts(): Promise<MediaMount[]> {
    return this.mediaMountRepository.find({
      where: { accessType: MediaMountAccessType.READ_WRITE },
    });
  }

  private async getStats(path: string): Promise<Stats | null> {
    try {
      return await fs.stat(path);
    } catch {
      return null;
    }
  }
}
