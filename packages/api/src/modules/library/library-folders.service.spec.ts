import {
  getLibraryFolderState,
  validateLibraryFolderName,
} from './library-folders.service';

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
