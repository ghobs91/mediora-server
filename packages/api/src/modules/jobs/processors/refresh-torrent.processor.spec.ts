import {
  DownloadableMediaState,
  FileType,
  OrganizeQueueProcessors,
} from 'src/app.dto';

import { RefreshTorrentProcessor } from './refresh-torrent.processor';
import { probeAudio } from 'src/utils/media-codec';

jest.mock('src/utils/media-codec', () => ({
  ...jest.requireActual('src/utils/media-codec'),
  probeAudio: jest.fn(),
}));

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function makeProcessor(opts: { torrent?: any; transmission?: any }) {
  const logger: any = {
    child: () => logger,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
  const renameAndLinkQueue: any = {
    add: jest.fn().mockResolvedValue(undefined),
  };
  const downloadQueue: any = {
    add: jest.fn().mockResolvedValue(undefined),
  };
  const paramsService: any = {
    get: jest.fn().mockResolvedValue('false'),
  };
  const redisService: any = {
    addRejectedTitle: jest.fn().mockResolvedValue(undefined),
    getRejectedTitles: jest.fn().mockResolvedValue([]),
    addRejectedHash: jest.fn().mockResolvedValue(undefined),
    getRejectedHashes: jest.fn().mockResolvedValue([]),
  };
  const movieDAO: any = {
    save: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };
  const torrentDAO: any = {
    findOne: jest.fn().mockResolvedValue(opts.torrent ?? null),
    find: jest.fn().mockResolvedValue(opts.torrent ? [opts.torrent] : []),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const transmissionService: any = {
    getTorrent: jest.fn().mockResolvedValue(opts.transmission ?? null),
    removeTorrentAndFiles: jest.fn().mockResolvedValue(undefined),
    pauseTorrentsByHash: jest.fn().mockResolvedValue(undefined),
  };
  const tvSeasonDAO: any = {
    save: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };
  const tvEpisodeDAO: any = {
    save: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };

  const processor = new RefreshTorrentProcessor(
    logger,
    renameAndLinkQueue,
    downloadQueue,
    movieDAO,
    torrentDAO,
    transmissionService,
    tvSeasonDAO,
    tvEpisodeDAO,
    paramsService,
    redisService
  );

  return {
    processor: processor as any,
    movieDAO,
    torrentDAO,
    transmissionService,
    renameAndLinkQueue,
    downloadQueue,
    paramsService,
    redisService,
  };
}

// Real shape captured from Transmission for "The Nanny Diaries": stalled one
// piece short of completion with no peers.
const MOVIE_TORRENT = {
  id: 955,
  torrentHash: '597aa56b12f5f39f2fef03dda4878ef075d94476',
  resourceId: 5,
  resourceType: FileType.MOVIE,
};

function stalledTransmission(overrides: Record<string, unknown> = {}) {
  return {
    status: 4, // TR_STATUS_DOWNLOAD
    rateDownload: 0,
    leftUntilDone: 2_053_999,
    activityDate: (NOW - 2 * HOUR) / 1000,
    addedDate: (NOW - 3 * HOUR) / 1000,
    percentDone: 0.999,
    ...overrides,
  };
}

describe('RefreshTorrentProcessor.checkTorrent', () => {
  it('pauses a stalled download instead of replacing it', async () => {
    const { processor, movieDAO, torrentDAO, transmissionService } =
      makeProcessor({ torrent: MOVIE_TORRENT, transmission: stalledTransmission() });

    await processor.checkTorrent({
      resourceId: MOVIE_TORRENT.resourceId,
      resourceType: FileType.MOVIE,
    });

    expect(transmissionService.pauseTorrentsByHash).toHaveBeenCalledWith([
      MOVIE_TORRENT.torrentHash,
    ]);
    expect(transmissionService.removeTorrentAndFiles).not.toHaveBeenCalled();
    expect(torrentDAO.remove).not.toHaveBeenCalled();
    expect(movieDAO.save).not.toHaveBeenCalled();
  });

  it('leaves a torrent that is still actively downloading alone', async () => {
    const { processor, movieDAO, transmissionService } = makeProcessor({
      torrent: MOVIE_TORRENT,
      transmission: stalledTransmission({ rateDownload: 102_400, percentDone: 0.5 }),
    });

    await processor.checkTorrent({
      resourceId: MOVIE_TORRENT.resourceId,
      resourceType: FileType.MOVIE,
    });

    expect(transmissionService.removeTorrentAndFiles).not.toHaveBeenCalled();
    expect(movieDAO.save).not.toHaveBeenCalled();
  });

  it('does not reset a torrent whose activity is recent', async () => {
    const { processor, movieDAO, transmissionService } = makeProcessor({
      torrent: MOVIE_TORRENT,
      transmission: stalledTransmission({ activityDate: (NOW - MINUTE) / 1000 }),
    });

    await processor.checkTorrent({
      resourceId: MOVIE_TORRENT.resourceId,
      resourceType: FileType.MOVIE,
    });

    expect(transmissionService.removeTorrentAndFiles).not.toHaveBeenCalled();
    expect(movieDAO.save).not.toHaveBeenCalled();
  });

  it('ignores a stopped (paused) torrent', async () => {
    const { processor, movieDAO, transmissionService } = makeProcessor({
      torrent: MOVIE_TORRENT,
      transmission: stalledTransmission({
        status: 0, // TR_STATUS_STOPPED
        activityDate: (NOW - 10 * HOUR) / 1000,
      }),
    });

    await processor.checkTorrent({
      resourceId: MOVIE_TORRENT.resourceId,
      resourceType: FileType.MOVIE,
    });

    expect(transmissionService.removeTorrentAndFiles).not.toHaveBeenCalled();
    expect(movieDAO.save).not.toHaveBeenCalled();
  });

  it('marks a finished torrent DOWNLOADED and organizes it', async () => {
    const { processor, movieDAO, renameAndLinkQueue } = makeProcessor({
      torrent: MOVIE_TORRENT,
      transmission: stalledTransmission({
        status: 6, // TR_STATUS_SEED
        leftUntilDone: 0,
        percentDone: 1,
      }),
    });

    await processor.checkTorrent({
      resourceId: MOVIE_TORRENT.resourceId,
      resourceType: FileType.MOVIE,
    });

    expect(movieDAO.save).toHaveBeenCalledWith({
      id: MOVIE_TORRENT.resourceId,
      state: DownloadableMediaState.DOWNLOADED,
    });
    expect(renameAndLinkQueue.add).toHaveBeenCalledWith(
      OrganizeQueueProcessors.HANDLE_MOVIE,
      { movieId: MOVIE_TORRENT.resourceId },
      { deduplication: { id: `handle-movie-${MOVIE_TORRENT.resourceId}` } }
    );
  });
});

describe('RefreshTorrentProcessor codec guard', () => {
  it('rejects an h264 torrent without immediately re-downloading it', async () => {
    const torrent = {
      ...MOVIE_TORRENT,
      name: 'Film.2020.1080p.H.264-GRP',
    };

    const {
      processor,
      movieDAO,
      transmissionService,
      downloadQueue,
      paramsService,
      redisService,
    } = makeProcessor({
      torrent,
      transmission: stalledTransmission({
        status: 6, // TR_STATUS_SEED
        leftUntilDone: 0,
        percentDone: 1,
        name: 'Film.2020.1080p.H.264-GRP',
        files: [{ name: 'Film.2020.1080p.H.264-GRP.mkv' }],
      }),
    });

    paramsService.get.mockImplementation((key: string) =>
      Promise.resolve(key === 'ignore_h264_releases' ? 'true' : 'false')
    );

    await processor.checkTorrent({
      resourceId: MOVIE_TORRENT.resourceId,
      resourceType: FileType.MOVIE,
    });

    expect(transmissionService.removeTorrentAndFiles).toHaveBeenCalledWith(
      MOVIE_TORRENT.torrentHash
    );
    expect(movieDAO.save).toHaveBeenCalledWith({
      id: MOVIE_TORRENT.resourceId,
      state: DownloadableMediaState.MISSING,
    });
    expect(redisService.addRejectedHash).toHaveBeenCalledWith(
      MOVIE_TORRENT.torrentHash
    );
    // The 30-minute missing sweep retries; an instant retry would loop on the
    // same release when the search result cannot be blocklisted.
    expect(downloadQueue.add).not.toHaveBeenCalled();
  });
});

describe('RefreshTorrentProcessor audio language guard', () => {
  it('rejects a completed torrent with no English audio and tries another', async () => {
    (probeAudio as jest.Mock).mockResolvedValue({
      tracks: [{ language: 'rus' }],
    });

    const torrent = {
      ...MOVIE_TORRENT,
      name: 'Ozark.S04.ITA.1080p',
    };

    const {
      processor,
      movieDAO,
      transmissionService,
      downloadQueue,
      paramsService,
      redisService,
    } = makeProcessor({
      torrent,
      transmission: stalledTransmission({
        status: 6,
        leftUntilDone: 0,
        percentDone: 1,
        name: 'Ozark.S04.ITA.1080p',
        files: [{ name: 'Ozark.S04E01.mkv' }],
      }),
    });

    paramsService.get.mockImplementation((key: string) =>
      Promise.resolve(key === 'require_english_audio' ? 'true' : 'false')
    );

    await processor.checkTorrent({
      resourceId: MOVIE_TORRENT.resourceId,
      resourceType: FileType.MOVIE,
    });

    expect(transmissionService.removeTorrentAndFiles).toHaveBeenCalledWith(
      MOVIE_TORRENT.torrentHash
    );
    expect(movieDAO.save).toHaveBeenCalledWith({
      id: MOVIE_TORRENT.resourceId,
      state: DownloadableMediaState.MISSING,
    });
    expect(redisService.addRejectedTitle).toHaveBeenCalledWith(
      'ozark s04 ita 1080p'
    );
    expect(downloadQueue.add).toHaveBeenCalled();
  });
});
