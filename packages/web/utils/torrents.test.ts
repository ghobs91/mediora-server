import { describe, expect, it } from 'vitest';

import { TransmissionTorrent } from './graphql';

import {
  parseTorrentSort,
  serializeTorrentSort,
  sortTorrents,
  torrentState,
} from './torrents';

function torrent(overrides: Partial<TransmissionTorrent>): TransmissionTorrent {
  return {
    __typename: 'TransmissionTorrent',
    addedDate: 0,
    doneDate: 0,
    downloadDir: '/downloads/complete',
    downloadedEver: 0,
    error: 0,
    errorString: null,
    eta: 0,
    hashString: 'hash',
    id: 0,
    isFinished: false,
    leftUntilDone: 0,
    name: 'torrent',
    peersConnected: 0,
    peersGettingFromUs: 0,
    peersSendingToUs: 0,
    percentDone: 0,
    rateDownload: 0,
    rateUpload: 0,
    sizeWhenDone: 0,
    status: 0,
    totalSize: 0,
    uploadRatio: 0,
    uploadedEver: 0,
    ...overrides,
  };
}

describe('torrentState', () => {
  it('maps transmission status codes', () => {
    expect(torrentState(torrent({ status: 0 }))).toBe('stopped');
    expect(torrentState(torrent({ status: 4 }))).toBe('downloading');
    expect(torrentState(torrent({ status: 6 }))).toBe('seeding');
    expect(torrentState(torrent({ status: 42 }))).toBe('unknown');
  });

  it('reports errors before status', () => {
    expect(torrentState(torrent({ status: 4, error: 3 }))).toBe('error');
    expect(torrentState(torrent({ status: 4, error: 0 }))).toBe('downloading');
  });
});

describe('sortTorrents', () => {
  const small = torrent({ hashString: 'a', name: 'Alpha', totalSize: 10, percentDone: 0.1 });
  const large = torrent({ hashString: 'b', name: 'beta', totalSize: 20, percentDone: 0.9 });
  const numbered = torrent({ hashString: 'c', name: 'alpha 10', totalSize: 30, percentDone: 0.5 });
  const all = [small, large, numbered];

  it('keeps the original order when no sort is selected', () => {
    expect(sortTorrents(all, null)).toBe(all);
  });

  it('sorts names case-insensitively with numeric awareness', () => {
    expect(sortTorrents(all, { key: 'name', direction: 'asc' }).map((t) => t.name)).toEqual(
      ['Alpha', 'alpha 10', 'beta']
    );
  });

  it('sorts sizes and progress numerically in both directions', () => {
    const sizes = sortTorrents(all, { key: 'size', direction: 'desc' });
    expect(sizes.map((t) => t.hashString)).toEqual(['c', 'b', 'a']);

    const progress = sortTorrents(all, { key: 'progress', direction: 'asc' });
    expect(progress.map((t) => t.hashString)).toEqual(['a', 'c', 'b']);
  });

  it('sorts statuses by state rank', () => {
    const paused = torrent({ hashString: 'p', status: 0 });
    const downloading = torrent({ hashString: 'd', status: 4 });
    const errored = torrent({ hashString: 'e', status: 4, error: 2 });

    expect(
      sortTorrents([paused, downloading, errored], {
        key: 'status',
        direction: 'asc',
      }).map((t) => t.hashString)
    ).toEqual(['e', 'd', 'p']);
  });

  it('treats a negative ratio as infinite', () => {
    const infinite = torrent({ hashString: 'i', uploadRatio: -1 });
    const finite = torrent({ hashString: 'f', uploadRatio: 2 });
    const none = torrent({ hashString: 'n', uploadRatio: 0 });

    expect(
      sortTorrents([finite, none, infinite], {
        key: 'ratio',
        direction: 'desc',
      }).map((t) => t.hashString)
    ).toEqual(['i', 'f', 'n']);
  });

  it('keeps equal values in their original order', () => {
    const first = torrent({ hashString: 'first', uploadRatio: -1 });
    const second = torrent({ hashString: 'second', uploadRatio: -1 });

    expect(
      sortTorrents([first, second], { key: 'ratio', direction: 'asc' }).map(
        (t) => t.hashString
      )
    ).toEqual(['first', 'second']);
  });

  it('does not mutate the input array', () => {
    const input = [...all];
    sortTorrents(input, { key: 'name', direction: 'desc' });
    expect(input).toEqual(all);
  });
});

describe('torrent sort persistence', () => {
  it('round-trips through its serialized form', () => {
    const sort = { key: 'size' as const, direction: 'desc' as const };
    expect(parseTorrentSort(serializeTorrentSort(sort))).toEqual(sort);
  });

  it('ignores unknown keys, directions and empty values', () => {
    expect(parseTorrentSort(null)).toBeNull();
    expect(parseTorrentSort('')).toBeNull();
    expect(parseTorrentSort('nope:asc')).toBeNull();
    expect(parseTorrentSort('name:sideways')).toBeNull();
    expect(parseTorrentSort('name')).toBeNull();
  });
});
