import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

import { OrganizeLibraryStrategy } from 'src/app.dto';

import { OrganizeProcessor } from './organize.processor';

// placeFile only touches the filesystem, so the injected collaborators are
// unused. The logger must implement child() because the constructor calls it.
function makeProcessor(): OrganizeProcessor {
  const logger: any = { child: () => logger };
  return new OrganizeProcessor(
    logger,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any
  );
}

function place(
  strategy: OrganizeLibraryStrategy,
  src: string,
  dest: string
): Promise<void> {
  return (makeProcessor() as any).placeFile(strategy, src, dest);
}

describe('OrganizeProcessor.placeFile', () => {
  let root: string;
  let src: string;
  let dest: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'organize-'));
    src = path.join(root, 'downloads', 'complete', 'episode.mkv');
    dest = path.join(root, 'library', 'Show', 'Season 06', 'episode.mkv');
    await fs.mkdir(path.dirname(src), { recursive: true });
    await fs.writeFile(src, 'data');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  it('LINK hardlinks the file: real file sharing the source inode', async () => {
    await place(OrganizeLibraryStrategy.LINK, src, dest);

    const srcStat = await fs.stat(src);
    const destStat = await fs.lstat(dest);
    expect(destStat.isSymbolicLink()).toBe(false);
    expect(destStat.isFile()).toBe(true);
    expect(destStat.ino).toEqual(srcStat.ino);
    expect(await fs.readFile(dest, 'utf8')).toEqual('data');
  });

  it('LINK falls back to a copy when hardlinking fails', async () => {
    jest
      .spyOn(fs, 'link')
      .mockRejectedValueOnce(
        Object.assign(new Error('cross-device link'), { code: 'EXDEV' })
      );

    await place(OrganizeLibraryStrategy.LINK, src, dest);

    const srcStat = await fs.stat(src);
    const destStat = await fs.lstat(dest);
    expect(destStat.isFile()).toBe(true);
    expect(destStat.ino).not.toEqual(srcStat.ino);
    expect(await fs.readFile(dest, 'utf8')).toEqual('data');
  });

  it('replaces a legacy/broken symlink with a real file', async () => {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.symlink('/downloads/complete/episode.mkv', dest);

    await place(OrganizeLibraryStrategy.LINK, src, dest);

    const destStat = await fs.lstat(dest);
    expect(destStat.isSymbolicLink()).toBe(false);
    expect(await fs.readFile(dest, 'utf8')).toEqual('data');
  });

  it('COPY stores a real file (distinct inode)', async () => {
    await place(OrganizeLibraryStrategy.COPY, src, dest);

    const srcStat = await fs.stat(src);
    const destStat = await fs.lstat(dest);
    expect(destStat.isFile()).toBe(true);
    expect(destStat.ino).not.toEqual(srcStat.ino);
  });

  it('is idempotent: re-running keeps a single real file', async () => {
    await place(OrganizeLibraryStrategy.LINK, src, dest);
    await place(OrganizeLibraryStrategy.LINK, src, dest);

    const destStat = await fs.lstat(dest);
    expect(destStat.isFile()).toBe(true);
    expect(await fs.readFile(dest, 'utf8')).toEqual('data');
  });
});
