import { hasPathTraversal } from './path-safety';

describe('hasPathTraversal', () => {
  it('flags parent-directory segments', () => {
    expect(hasPathTraversal('/downloads/../../etc/passwd')).toBe(true);
    expect(hasPathTraversal('../secret')).toBe(true);
    expect(hasPathTraversal('C:\\downloads\\..\\secret')).toBe(true);
  });

  it('allows filenames that merely contain consecutive dots', () => {
    expect(
      hasPathTraversal('/downloads/Hey Arnold! S05E02 Beaned & Old Iron Man..mp4')
    ).toBe(false);
    expect(hasPathTraversal('/downloads/complete/Show...S01E01.mkv')).toBe(false);
    expect(hasPathTraversal('/usr/drive6tb/tv/Hey Arnold!/Season 01')).toBe(false);
  });
});
