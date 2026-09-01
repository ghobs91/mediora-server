import {
  getLibraryFolderState,
  validateLibraryFolderName,
  LibraryFoldersService,
} from './library-folders.service';
import { ParameterKey } from 'src/app.dto';
import { MediaMountAccessType, MediaMountState } from 'src/entities/media-mount.entity';

const readyAccess = {
  exists: true,
  isDirectory: true,
  canRead: true,
  canWrite: true,
  canTraverse: true,
  canCreate: true,
  mode: '0775',
  ownerUid: 1000,
  ownerGid: 1000,
};

describe('LibraryFoldersService helpers', () => {
  describe('validateLibraryFolderName', () => {
    it('accepts a folder name and trims whitespace', () => {
      expect(validateLibraryFolderName('  films  ')).toBe('films');
    });

    it.each(['', '.', '..', '../films', '/films', 'films/shows', 'films\\shows'])(
      'rejects unsafe folder name %j',
      (name) => {
        expect(() => validateLibraryFolderName(name)).toThrow();
      }
    );
  });

  it('reports a fully accessible directory as ready', () => {
    expect(getLibraryFolderState(readyAccess)).toBe('ready');
  });

  it('distinguishes missing, non-directory, inaccessible, and read-only paths', () => {
    expect(
      getLibraryFolderState({ ...readyAccess, exists: false })
    ).toBe('missing');
    expect(
      getLibraryFolderState({
        ...readyAccess,
        exists: false,
        errorCode: 'EACCES',
      })
    ).toBe('inaccessible');
    expect(
      getLibraryFolderState({ ...readyAccess, isDirectory: false })
    ).toBe('not_directory');
    expect(
      getLibraryFolderState({ ...readyAccess, canRead: false })
    ).toBe('inaccessible');
    expect(
      getLibraryFolderState({ ...readyAccess, canTraverse: false })
    ).toBe('inaccessible');
    expect(
      getLibraryFolderState({ ...readyAccess, canWrite: false })
    ).toBe('read_only');
  });
});

describe('LibraryFoldersService mount selection', () => {
  const mounts = [
    {
      id: 1,
      path: '/usr/drive4tb',
      accessType: MediaMountAccessType.READ_WRITE,
      state: MediaMountState.READY,
    },
    {
      id: 2,
      path: '/usr/drive6tb',
      accessType: MediaMountAccessType.READ_WRITE,
      state: MediaMountState.READY,
    },
  ];

  it('uses the configured mount for each library type', async () => {
    const paramsService = {
      get: jest.fn(async (key: ParameterKey) =>
        key === ParameterKey.LIBRARY_MOVIES_MOUNT_ID ? '1' : '2'
      ),
    };
    const mediaMountsService = {
      getWritableMounts: jest.fn(async () => mounts),
    };
    const service = new LibraryFoldersService(
      paramsService as never,
      mediaMountsService as never
    );

    await expect(service.getMountForType('movies')).resolves.toMatchObject({
      id: 1,
    });
    await expect(service.getMountForType('tvshows')).resolves.toMatchObject({
      id: 2,
    });
  });

  it('does not silently fall back when a configured mount is unavailable', async () => {
    const paramsService = {
      get: jest.fn(async () => '2'),
    };
    const mediaMountsService = {
      getWritableMounts: jest.fn(async () => [mounts[0]]),
    };
    const service = new LibraryFoldersService(
      paramsService as never,
      mediaMountsService as never
    );

    await expect(service.getMountForType('tvshows')).rejects.toThrow(
      'configured tvshows library mount is not available or writable'
    );
  });
});
