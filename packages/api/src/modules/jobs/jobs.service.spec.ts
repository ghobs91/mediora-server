import { OrganizeQueueProcessors } from 'src/app.dto';

import { JobsService } from './jobs.service';

function makeService(overrides: {
  seasons?: any[];
  episodes?: any[];
  seasonTorrents?: any[];
  episodeTorrents?: any[];
  libraryTorrents?: any[];
}) {
  const logger: any = {
    child: () => logger,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
  const downloadQueue: any = {
    add: jest.fn(),
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
  };
  const renameAndLinkQueue: any = { add: jest.fn().mockResolvedValue(undefined) };
  const refreshTorrentQueue: any = {
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
  };
  const scanLibraryQueue: any = {
    add: jest.fn(),
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
  };
  const tvSeasonDAO: any = {
    find: jest.fn().mockResolvedValue(overrides.seasons ?? []),
  };
  const tvEpisodeDAO: any = {
    find: jest.fn().mockResolvedValue(overrides.episodes ?? []),
  };
  // Route by the requested resourceType so the per-show (season/episode) and
  // library-wide (In([...])) queries can be driven independently.
  const torrentDAO: any = {
    find: jest.fn((options: any) => {
      const resourceType = options?.where?.resourceType;
      if (resourceType === 'season') {
        return Promise.resolve(overrides.seasonTorrents ?? []);
      }
      if (resourceType === 'episode') {
        return Promise.resolve(overrides.episodeTorrents ?? []);
      }
      return Promise.resolve(overrides.libraryTorrents ?? []);
    }),
  };

  const service = new JobsService(
    logger,
    downloadQueue,
    renameAndLinkQueue,
    refreshTorrentQueue,
    scanLibraryQueue,
    tvSeasonDAO,
    tvEpisodeDAO,
    torrentDAO
  );

  return { service, renameAndLinkQueue, torrentDAO };
}

describe('JobsService.startReorganizeTVShow', () => {
  it('reorganizes seasons with a pack and skips their episodes', async () => {
    const { service, renameAndLinkQueue } = makeService({
      seasons: [{ id: 1, tvShowId: 10 }],
      episodes: [
        { id: 11, seasonId: 1, tvShowId: 10 },
        { id: 12, seasonId: 2, tvShowId: 10 },
      ],
      seasonTorrents: [{ resourceId: 1, resourceType: 'season' }],
      episodeTorrents: [
        { resourceId: 11, resourceType: 'episode' },
        { resourceId: 12, resourceType: 'episode' },
      ],
    });

    const result = await service.startReorganizeTVShow(10);

    expect(result).toEqual({ seasons: 1, episodes: 1 });
    expect(renameAndLinkQueue.add).toHaveBeenCalledTimes(2);
    expect(renameAndLinkQueue.add).toHaveBeenCalledWith(
      OrganizeQueueProcessors.HANDLE_SEASON,
      { seasonId: 1 },
      { deduplication: { id: 'handle-season-1' } }
    );
    // Episode 11 belongs to the packed season 1, so only episode 12 is queued.
    expect(renameAndLinkQueue.add).toHaveBeenCalledWith(
      OrganizeQueueProcessors.HANDLE_EPISODE,
      { episodeId: 12 },
      { deduplication: { id: 'handle-episode-12' } }
    );
  });

  it('queues nothing when the show has no torrents', async () => {
    const { service, renameAndLinkQueue, torrentDAO } = makeService({
      seasons: [{ id: 1, tvShowId: 10 }],
      episodes: [{ id: 11, seasonId: 1, tvShowId: 10 }],
      seasonTorrents: [],
      episodeTorrents: [],
    });

    const result = await service.startReorganizeTVShow(10);

    expect(result).toEqual({ seasons: 0, episodes: 0 });
    expect(renameAndLinkQueue.add).not.toHaveBeenCalled();
    expect(torrentDAO.find).toHaveBeenCalledTimes(2);
  });
});

describe('JobsService.startReorganizeLibrary', () => {
  it('reorganizes every movie/season/episode that still has a torrent', async () => {
    const { service, renameAndLinkQueue } = makeService({
      libraryTorrents: [
        { resourceId: 7, resourceType: 'movie' },
        { resourceId: 1, resourceType: 'season' },
        { resourceId: 11, resourceType: 'episode' },
      ],
    });

    const result = await service.startReorganizeLibrary();

    expect(result).toEqual({ movies: 1, seasons: 1, episodes: 1 });
    expect(renameAndLinkQueue.add).toHaveBeenCalledTimes(3);
    expect(renameAndLinkQueue.add).toHaveBeenCalledWith(
      OrganizeQueueProcessors.HANDLE_MOVIE,
      { movieId: 7 },
      { deduplication: { id: 'handle-movie-7' } }
    );
    expect(renameAndLinkQueue.add).toHaveBeenCalledWith(
      OrganizeQueueProcessors.HANDLE_SEASON,
      { seasonId: 1 },
      { deduplication: { id: 'handle-season-1' } }
    );
    expect(renameAndLinkQueue.add).toHaveBeenCalledWith(
      OrganizeQueueProcessors.HANDLE_EPISODE,
      { episodeId: 11 },
      { deduplication: { id: 'handle-episode-11' } }
    );
  });
});
