import { promises as fs, constants as fsConstants, Stats } from 'fs';
import path from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';

import { ParameterKey } from 'src/app.dto';
import { env } from 'src/env';

import { ParamsService } from 'src/modules/params/params.service';
import { MediaMountsService } from './media-mounts.service';
import { MediaMount } from 'src/entities/media-mount.entity';

import {
  LibraryFolderState,
  LibraryFolderStatus,
  LibraryFoldersStatus,
} from './library-folders.dto';

export type LibraryFolderType = 'movies' | 'tvshows';

const MOUNT_PARAM_BY_TYPE: Record<LibraryFolderType, ParameterKey> = {
  movies: ParameterKey.LIBRARY_MOVIES_MOUNT_ID,
  tvshows: ParameterKey.LIBRARY_TV_SHOWS_MOUNT_ID,
};

interface FolderAccess {
  exists: boolean;
  isDirectory: boolean;
  canRead: boolean;
  canWrite: boolean;
  canTraverse: boolean;
  canCreate: boolean;
  mode: string | null;
  ownerUid: number | null;
  ownerGid: number | null;
  errorCode?: string;
}

export function validateLibraryFolderName(value: string) {
  const name = value.trim();

  if (
    !name ||
    name.length > 255 ||
    name === '.' ||
    name === '..' ||
    name.includes('\0') ||
    path.basename(name) !== name ||
    name.includes('\\')
  ) {
    throw new BadRequestException(
      'Library folders must be names up to 255 characters inside the mounted library.'
    );
  }

  return name;
}

export function getLibraryFolderState(access: FolderAccess) {
  if (!access.exists && access.errorCode && access.errorCode !== 'ENOENT') {
    return LibraryFolderState.INACCESSIBLE;
  }
  if (!access.exists) return LibraryFolderState.MISSING;
  if (!access.isDirectory) return LibraryFolderState.NOT_DIRECTORY;
  if (!access.canRead || !access.canTraverse) {
    return LibraryFolderState.INACCESSIBLE;
  }
  if (!access.canWrite) return LibraryFolderState.READ_ONLY;
  return LibraryFolderState.READY;
}

@Injectable()
export class LibraryFoldersService {
  public constructor(
    private readonly paramsService: ParamsService,
    private readonly mediaMountsService: MediaMountsService,
  ) {}

  public async getFolderNames() {
    const [movies, tvshows] = await Promise.all([
      this.paramsService.get(ParameterKey.LIBRARY_MOVIES_FOLDER_NAME),
      this.paramsService.get(ParameterKey.LIBRARY_TV_SHOWS_FOLDER_NAME),
    ]);

    return {
      movies: validateLibraryFolderName(
        movies || env.LIBRARY_MOVIES_FOLDER_NAME
      ),
      tvshows: validateLibraryFolderName(
        tvshows || env.LIBRARY_TV_SHOWS_FOLDER_NAME
      ),
    };
  }

  public async getFolderPath(type: LibraryFolderType) {
    const names = await this.getFolderNames();
    const mount = await this.getMountForType(type);
    return path.join(mount.path, names[type]);
  }

  public async getAssignedMountIds(): Promise<{
    movies: number | null;
    tvshows: number | null;
  }> {
    const [movies, tvshows] = await Promise.all([
      this.getAssignedMountId('movies'),
      this.getAssignedMountId('tvshows'),
    ]);
    return { movies, tvshows };
  }

  private async getAssignedMountId(
    type: LibraryFolderType
  ): Promise<number | null> {
    const raw = await this.paramsService.get(MOUNT_PARAM_BY_TYPE[type]);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  public async getMountForType(type: LibraryFolderType): Promise<MediaMount> {
    const mounts = await this.mediaMountsService.getWritableMounts();
    if (mounts.length === 0) {
      throw new Error('No writable media mounts available');
    }
    const assignedId = await this.getAssignedMountId(type);
    if (assignedId !== null) {
      const assigned = mounts.find((mount) => mount.id === assignedId);
      if (!assigned) {
        throw new Error(
          `The configured ${type} library mount is not available or writable.`
        );
      }
      return assigned;
    }
    return mounts[0];
  }

  public async getFolderPathOnMount(type: LibraryFolderType, mountId: number) {
    const names = await this.getFolderNames();
    const mount = await this.mediaMountsService.findOne(mountId);
    if (!mount) {
      throw new Error(`Mount not found: ${mountId}`);
    }
    return path.join(mount.path, names[type]);
  }

  public async getFolderPathForAllMounts(type: LibraryFolderType): Promise<Array<{ mountId: number; path: string }>> {
    const names = await this.getFolderNames();
    const mounts = await this.mediaMountsService.findAll();
    return mounts.map((mount) => ({
      mountId: mount.id,
      path: path.join(mount.path, names[type]),
    }));
  }

  public async updateFolderNames({
    movies,
    tvshows,
    moviesMountId,
    tvShowsMountId,
  }: {
    movies: string;
    tvshows: string;
    moviesMountId?: number | null;
    tvShowsMountId?: number | null;
  }) {
    const moviesName = validateLibraryFolderName(movies);
    const tvshowsName = validateLibraryFolderName(tvshows);

    if (moviesName === tvshowsName) {
      throw new BadRequestException(
        'Movie and TV folders must be different directories.'
      );
    }

    await this.validateMountAssignments(moviesMountId, tvShowsMountId);

    await Promise.all([
      this.paramsService.update(
        ParameterKey.LIBRARY_MOVIES_FOLDER_NAME,
        moviesName
      ),
      this.paramsService.update(
        ParameterKey.LIBRARY_TV_SHOWS_FOLDER_NAME,
        tvshowsName
      ),
      ...(moviesMountId !== undefined
        ? [
            this.paramsService.update(
              ParameterKey.LIBRARY_MOVIES_MOUNT_ID,
              moviesMountId === null ? '' : String(moviesMountId)
            ),
          ]
        : []),
      ...(tvShowsMountId !== undefined
        ? [
            this.paramsService.update(
              ParameterKey.LIBRARY_TV_SHOWS_MOUNT_ID,
              tvShowsMountId === null ? '' : String(tvShowsMountId)
            ),
          ]
        : []),
    ]);

    await this.createMissingFolders();
    return this.inspect();
  }

  private async validateMountAssignments(
    moviesMountId: number | null | undefined,
    tvShowsMountId: number | null | undefined
  ) {
    const assignments: Array<{ type: string; mountId: number }> = [];
    if (moviesMountId !== undefined && moviesMountId !== null) {
      assignments.push({ type: 'movies', mountId: moviesMountId });
    }
    if (tvShowsMountId !== undefined && tvShowsMountId !== null) {
      assignments.push({ type: 'tvshows', mountId: tvShowsMountId });
    }
    const writableMounts = await this.mediaMountsService.getWritableMounts();
    for (const { type, mountId } of assignments) {
      const mount = writableMounts.find((candidate) => candidate.id === mountId);
      if (!mount) {
        throw new BadRequestException(
          `Media mount ${mountId} does not exist or is not writable for the ${type} library.`
        );
      }
    }
  }

  public async inspect(): Promise<LibraryFoldersStatus> {
    const names = await this.getFolderNames();
    const mounts = await this.mediaMountsService.findAll();
    const assigned = await this.getAssignedMountIds();
    const moviesMountId = assigned.movies;
    const tvShowsMountId = assigned.tvshows;

    const mountStatuses: LibraryFolderStatus[] = [];
    for (const mount of mounts) {
      const stats = await this.readStats(mount.path).then((r) => r.stats);
      const state = getLibraryFolderState({
        exists: !!stats,
        isDirectory: stats?.isDirectory() ?? false,
        canRead: await this.hasAccess(mount.path, fsConstants.R_OK),
        canWrite: await this.hasAccess(mount.path, fsConstants.W_OK),
        canTraverse: await this.hasAccess(mount.path, fsConstants.X_OK),
        canCreate: await this.hasAccess(mount.path, fsConstants.W_OK | fsConstants.X_OK),
        mode: stats ? this.formatMode(stats) : null,
        ownerUid: stats?.uid ?? null,
        ownerGid: stats?.gid ?? null,
      });

      const moviesPath = path.join(mount.path, names.movies);
      const tvshowsPath = path.join(mount.path, names.tvshows);

      mountStatuses.push({
        type: 'mount',
        name: mount.label || mount.path,
        path: mount.path,
        state,
        exists: !!stats,
        isDirectory: stats?.isDirectory() ?? false,
        canRead: await this.hasAccess(mount.path, fsConstants.R_OK),
        canWrite: await this.hasAccess(mount.path, fsConstants.W_OK),
        canTraverse: await this.hasAccess(mount.path, fsConstants.X_OK),
        canCreate: await this.hasAccess(mount.path, fsConstants.W_OK | fsConstants.X_OK),
        mode: stats ? this.formatMode(stats) : null,
        ownerUid: stats?.uid ?? null,
        ownerGid: stats?.gid ?? null,
        message: this.getMessage(state, {
          exists: !!stats,
          isDirectory: stats?.isDirectory() ?? false,
          canRead: await this.hasAccess(mount.path, fsConstants.R_OK),
          canWrite: await this.hasAccess(mount.path, fsConstants.W_OK),
          canTraverse: await this.hasAccess(mount.path, fsConstants.X_OK),
          canCreate: await this.hasAccess(mount.path, fsConstants.W_OK | fsConstants.X_OK),
          mode: stats ? this.formatMode(stats) : null,
          ownerUid: stats?.uid ?? null,
          ownerGid: stats?.gid ?? null,
        }, true),
        remedy: this.getRemedy(state, {
          exists: !!stats,
          isDirectory: stats?.isDirectory() ?? false,
          canRead: await this.hasAccess(mount.path, fsConstants.R_OK),
          canWrite: await this.hasAccess(mount.path, fsConstants.W_OK),
          canTraverse: await this.hasAccess(mount.path, fsConstants.X_OK),
          canCreate: await this.hasAccess(mount.path, fsConstants.W_OK | fsConstants.X_OK),
          mode: stats ? this.formatMode(stats) : null,
          ownerUid: stats?.uid ?? null,
          ownerGid: stats?.gid ?? null,
        }, true),
      });

      mountStatuses.push(await this.inspectPath(moviesPath, 'movies', false));
      mountStatuses.push(await this.inspectPath(tvshowsPath, 'tvshows', false));
    }

    return {
      mount: mountStatuses.length > 0 ? mountStatuses[0] : null,
      moviesMountId,
      tvShowsMountId,
      processUid: process.getuid?.() ?? null,
      processGid: process.getgid?.() ?? null,
      processRunsAsRoot: process.getuid?.() === 0,
      folders: mountStatuses,
    };
  }

  private async createMissingFolders() {
    const mounts = await this.mediaMountsService.findAll();
    const assigned = await this.getAssignedMountIds();
    for (const mount of mounts) {
      const { stats } = await this.readStats(mount.path);
      if (!stats || !stats.isDirectory()) continue;
      if (!(await this.hasAccess(mount.path, fsConstants.W_OK | fsConstants.X_OK))) {
        continue;
      }

      const names = await this.getFolderNames();
      const foldersToCreate = [
        ...(assigned.movies === null || assigned.movies === mount.id
          ? [names.movies]
          : []),
        ...(assigned.tvshows === null || assigned.tvshows === mount.id
          ? [names.tvshows]
          : []),
      ];
      await Promise.all(
        foldersToCreate.map(async (name) => {
          try {
            await fs.mkdir(path.join(mount.path, name), { recursive: true });
          } catch (_error) {
            // inspect() reports the actionable permission error to the user.
          }
        })
      );
    }
  }

  private async inspectPath(
    targetPath: string,
    type: string,
    isMount: boolean
  ): Promise<LibraryFolderStatus> {
    const { stats, errorCode } = await this.readStats(targetPath);
    const parentPath = path.dirname(targetPath);
    const canCreate = await this.hasAccess(
      parentPath,
      fsConstants.W_OK | fsConstants.X_OK
    );
    const access: FolderAccess = stats
      ? {
          exists: true,
          isDirectory: stats.isDirectory(),
          canRead: await this.hasAccess(targetPath, fsConstants.R_OK),
          canWrite: await this.hasAccess(targetPath, fsConstants.W_OK),
          canTraverse: await this.hasAccess(targetPath, fsConstants.X_OK),
          canCreate,
          mode: this.formatMode(stats),
          ownerUid: stats.uid,
          ownerGid: stats.gid,
        }
      : {
          exists: false,
          isDirectory: false,
          canRead: false,
          canWrite: false,
          canTraverse: false,
          canCreate,
          mode: null,
          ownerUid: null,
          ownerGid: null,
          errorCode,
        };

    const state = getLibraryFolderState(access);
    const name = isMount ? 'Library mount' : path.basename(targetPath);
    const message = this.getMessage(state, access, isMount);

    return {
      type,
      name,
      path: targetPath,
      state,
      ...access,
      message,
      remedy: this.getRemedy(state, access, isMount),
    };
  }

  private async readStats(targetPath: string) {
    try {
      return { stats: await fs.stat(targetPath) };
    } catch (error) {
      return {
        stats: null,
        errorCode:
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : undefined,
      };
    }
  }

  private async hasAccess(targetPath: string, mode: number) {
    try {
      await fs.access(targetPath, mode);
      return true;
    } catch (_error) {
      return false;
    }
  }

  private formatMode(stats: Stats) {
    return `0${(stats.mode & 0o7777).toString(8).padStart(3, '0')}`;
  }

  private getMessage(
    state: LibraryFolderState,
    access: FolderAccess,
    isMount: boolean
  ) {
    if (isMount && state === LibraryFolderState.MISSING) {
      return 'The library mount is not visible inside the API container.';
    }
    if (isMount && state === LibraryFolderState.READY) {
      return 'The mounted library is readable and writable.';
    }
    if (state === LibraryFolderState.MISSING) {
      return access.canCreate
        ? 'This folder does not exist yet, but Bobarr can create it.'
        : 'This folder does not exist and its parent is not writable.';
    }
    if (state === LibraryFolderState.NOT_DIRECTORY) {
      return 'A file exists here; choose a directory name instead.';
    }
    if (state === LibraryFolderState.INACCESSIBLE) {
      return 'The container user cannot read or traverse this folder.';
    }
    if (state === LibraryFolderState.READ_ONLY) {
      return 'Bobarr can scan this folder but cannot organize new media into it.';
    }
    return 'Ready to scan and organize media.';
  }

  private getRemedy(
    state: LibraryFolderState,
    access: FolderAccess,
    isMount: boolean
  ) {
    if (isMount && state === LibraryFolderState.MISSING) {
      return 'Check MEDIA_MOUNTS and the matching bind mounts in docker-compose.yml.';
    }
    if (state === LibraryFolderState.MISSING && access.canCreate) {
      return 'Save the folder settings and Bobarr will create this directory.';
    }
    if (
      state === LibraryFolderState.INACCESSIBLE ||
      state === LibraryFolderState.READ_ONLY ||
      (isMount && state !== LibraryFolderState.READY)
    ) {
      const ownerHint =
        access.ownerUid !== null && access.ownerGid !== null
          ? ` Usually use PUID=${access.ownerUid} and PGID=${access.ownerGid}.`
          : '';
      return `Set PUID and PGID in .env to the host user that owns the library, then recreate the stack.${ownerHint}`;
    }
    return null;
  }
}
