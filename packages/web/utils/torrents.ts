import { TransmissionTorrent } from './graphql';

export type TorrentState =
  | 'error'
  | 'stopped'
  | 'checking'
  | 'queued'
  | 'downloading'
  | 'seeding'
  | 'unknown';

export type TorrentSortKey =
  | 'name'
  | 'status'
  | 'progress'
  | 'download'
  | 'upload'
  | 'ratio'
  | 'size'
  | 'eta';

export type SortDirection = 'asc' | 'desc';

export interface TorrentSort {
  key: TorrentSortKey;
  direction: SortDirection;
}

export const TORRENT_SORT_KEYS: TorrentSortKey[] = [
  'name',
  'status',
  'progress',
  'download',
  'upload',
  'ratio',
  'size',
  'eta',
];

export const TORRENT_SORT_STORAGE_KEY = 'mediora-server_downloads_sort';

// Direction applied when a column is selected for the first time.
export const TORRENT_SORT_DEFAULT_DIRECTION: Record<
  TorrentSortKey,
  SortDirection
> = {
  name: 'asc',
  status: 'asc',
  progress: 'desc',
  download: 'desc',
  upload: 'desc',
  ratio: 'desc',
  size: 'desc',
  eta: 'asc',
};

export function torrentState(torrent: TransmissionTorrent): TorrentState {
  if (torrent.error && torrent.error !== 0) return 'error';
  switch (torrent.status) {
    case 0:
      return 'stopped';
    case 1:
    case 2:
      return 'checking';
    case 3:
      return 'queued';
    case 4:
      return 'downloading';
    case 5:
    case 6:
      return 'seeding';
    default:
      return 'unknown';
  }
}

const STATE_RANK: Record<TorrentState, number> = {
  error: 0,
  downloading: 1,
  checking: 2,
  queued: 3,
  seeding: 4,
  stopped: 5,
  unknown: 6,
};

function compareBy(
  key: TorrentSortKey,
  a: TransmissionTorrent,
  b: TransmissionTorrent
) {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    case 'status':
      return STATE_RANK[torrentState(a)] - STATE_RANK[torrentState(b)];
    case 'progress':
      return a.percentDone - b.percentDone;
    case 'download':
      return a.rateDownload - b.rateDownload;
    case 'upload':
      return a.rateUpload - b.rateUpload;
    case 'ratio':
      // Transmission reports -1 for an infinite ratio.
      return compareNumbers(ratioValue(a), ratioValue(b));
    case 'size':
      return Number(a.totalSize) - Number(b.totalSize);
    case 'eta':
      // A negative ETA means "not available"; keep those last when ascending.
      return compareNumbers(etaValue(a), etaValue(b));
  }
}

function compareNumbers(a: number, b: number) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function ratioValue(torrent: TransmissionTorrent) {
  return torrent.uploadRatio < 0 ? Infinity : torrent.uploadRatio;
}

function etaValue(torrent: TransmissionTorrent) {
  return torrent.eta >= 0 && !torrent.isFinished ? torrent.eta : Infinity;
}

export function sortTorrents(
  torrents: TransmissionTorrent[],
  sort: TorrentSort | null
) {
  if (!sort) return torrents;
  const multiplier = sort.direction === 'asc' ? 1 : -1;
  return [...torrents].sort((a, b) => compareBy(sort.key, a, b) * multiplier);
}

export function parseTorrentSort(value: string | null): TorrentSort | null {
  if (!value) return null;
  const [key, direction] = value.split(':');
  if (!TORRENT_SORT_KEYS.includes(key as TorrentSortKey)) return null;
  if (direction !== 'asc' && direction !== 'desc') return null;
  return { key: key as TorrentSortKey, direction };
}

export function serializeTorrentSort(sort: TorrentSort) {
  return `${sort.key}:${sort.direction}`;
}

export function readStoredTorrentSort() {
  if (typeof window === 'undefined') return null;
  return parseTorrentSort(localStorage.getItem(TORRENT_SORT_STORAGE_KEY));
}

export function storeTorrentSort(sort: TorrentSort) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TORRENT_SORT_STORAGE_KEY, serializeTorrentSort(sort));
}
