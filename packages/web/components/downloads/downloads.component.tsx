import React, { useMemo, useState } from 'react';
import { Loader2, Pause, Play, Trash2, CircleCheck, AlertTriangle } from 'lucide-react';

import {
  TransmissionTorrent,
  GetTransmissionTorrentsDocument,
  useGetTransmissionTorrentsQuery,
  usePauseTransmissionTorrentsMutation,
  useResumeTransmissionTorrentsMutation,
  useRemoveTransmissionTorrentsMutation,
  usePauseAllTransmissionTorrentsMutation,
  useResumeAllTransmissionTorrentsMutation,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatBytes } from '@/utils/format-bytes';

type TorrentState =
  | 'error'
  | 'stopped'
  | 'checking'
  | 'queued'
  | 'downloading'
  | 'seeding'
  | 'unknown';

function torrentState(torrent: TransmissionTorrent): TorrentState {
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

function StatusBadge({ torrent }: { torrent: TransmissionTorrent }) {
  const state = torrentState(torrent);
  if (state === 'error') {
    return (
      <Badge variant="outline" className="text-red-500">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Error
      </Badge>
    );
  }
  if (state === 'stopped') {
    return (
      <Badge variant="outline" className="text-amber-500">
        <Pause className="mr-1 h-3 w-3" />
        Paused
      </Badge>
    );
  }
  if (state === 'seeding') {
    return (
      <Badge variant="outline" className="text-green-500">
        <CircleCheck className="mr-1 h-3 w-3" />
        Seeding
      </Badge>
    );
  }
  if (state === 'queued') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Queued
      </Badge>
    );
  }
  if (state === 'checking') {
    return (
      <Badge variant="outline" className="text-blue-500">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Checking
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-blue-500">
      Downloading
      <Loader2 className="ml-1.5 h-3 w-3 animate-spin" />
    </Badge>
  );
}

function formatEta(seconds: number) {
  if (typeof seconds !== 'number' || seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function DownloadsComponent() {
  const { data } = useGetTransmissionTorrentsQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: 2500,
  });

  const torrents = useMemo(() => data?.torrents ?? [], [data]);

  const refetchQueries = [GetTransmissionTorrentsDocument];
  const mutationOptions = {
    awaitRefetchQueries: true,
    refetchQueries,
    onError: ({ message }: { message: string }) => alert(message),
  };

  const [pauseTorrents] = usePauseTransmissionTorrentsMutation(mutationOptions);
  const [resumeTorrents] = useResumeTransmissionTorrentsMutation(mutationOptions);
  const [removeTorrents] = useRemoveTransmissionTorrentsMutation(mutationOptions);
  const [pauseAllTorrents] = usePauseAllTransmissionTorrentsMutation(mutationOptions);
  const [resumeAllTorrents] = useResumeAllTransmissionTorrentsMutation(mutationOptions);

  const [selected, setSelected] = useState<string[]>([]);
  const [removeTargets, setRemoveTargets] = useState<string[] | null>(null);
  const [deleteData, setDeleteData] = useState(false);

  const toggleRow = (hash: string) => {
    setSelected((prev) =>
      prev.includes(hash) ? prev.filter((h) => h !== hash) : [...prev, hash]
    );
  };

  const toggleAll = () => {
    setSelected(
      selected.length === torrents.length
        ? []
        : torrents.map((torrent) => torrent.hashString)
    );
  };

  const openRemove = (hashes: string[]) => {
    setDeleteData(false);
    setRemoveTargets(hashes);
  };

  const confirmRemove = async () => {
    if (!removeTargets) return;
    await removeTorrents({
      variables: { hashes: removeTargets, deleteData },
    });
    setSelected([]);
    setRemoveTargets(null);
  };

  const handleToggleRow = async (torrent: TransmissionTorrent) => {
    const hashes = [torrent.hashString];
    if (torrent.status === 0) {
      await resumeTorrents({ variables: { hashes } });
    } else {
      await pauseTorrents({ variables: { hashes } });
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Downloads
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {torrents.length} torrents
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  pauseTorrents({ variables: { hashes: selected } })
                }
              >
                <Pause className="mr-1.5 h-4 w-4" />
                Pause {selected.length}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  resumeTorrents({ variables: { hashes: selected } })
                }
              >
                <Play className="mr-1.5 h-4 w-4" />
                Resume {selected.length}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => pauseAllTorrents()}>
            <Pause className="mr-1.5 h-4 w-4" />
            Pause all
          </Button>
          <Button variant="outline" size="sm" onClick={() => resumeAllTorrents()}>
            <Play className="mr-1.5 h-4 w-4" />
            Resume all
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-400"
            disabled={selected.length === 0}
            onClick={() => openRemove(selected)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[960px] divide-y divide-border">
          <thead className="bg-muted/30">
            <tr>
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={torrents.length > 0 && selected.length === torrents.length}
                  onCheckedChange={toggleAll}
                  aria-label="Select all torrents"
                />
              </th>
              {['Name', 'Status', 'Progress', 'Download', 'Upload', 'Ratio', 'Size', 'ETA'].map(
                (column) => (
                  <th
                    key={column}
                    className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground"
                  >
                    {column}
                  </th>
                )
              )}
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {torrents.map((torrent) => {
              const percent = Math.round(torrent.percentDone * 10000) / 100;
              const state = torrentState(torrent);
              const isSeeding = state === 'seeding';
              const isPaused = state === 'stopped';

              return (
                <tr key={torrent.hashString} className="group hover:bg-muted/30">
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={selected.includes(torrent.hashString)}
                      onCheckedChange={() => toggleRow(torrent.hashString)}
                      aria-label={`Select ${torrent.name}`}
                    />
                  </td>
                  <td className="max-w-[320px] px-3 py-2.5">
                    <div className="truncate font-medium" title={torrent.name}>
                      {torrent.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {state === 'error' && torrent.errorString
                        ? torrent.errorString
                        : torrent.downloadDir}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge torrent={torrent} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-28">
                        <Progress
                          value={percent}
                          className={isSeeding ? '[&>div]:bg-emerald-500' : undefined}
                        />
                      </div>
                      <span className="w-12 text-xs tabular-nums text-muted-foreground">
                        {percent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {torrent.rateDownload > 0
                      ? `${formatBytes(torrent.rateDownload)}/s`
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {torrent.rateUpload > 0
                      ? `${formatBytes(torrent.rateUpload)}/s`
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {torrent.uploadRatio < 0
                      ? '∞'
                      : torrent.uploadRatio > 0
                        ? torrent.uploadRatio.toFixed(2)
                        : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatBytes(torrent.totalSize)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {isSeeding ? '—' : formatEta(torrent.eta)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleToggleRow(torrent)}
                        title={isPaused ? 'Resume' : 'Pause'}
                      >
                        {isPaused ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-6 w-6 text-red-500 hover:text-red-400"
                        onClick={() => openRemove([torrent.hashString])}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {torrents.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  No torrents in Transmission.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={removeTargets !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTargets(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Remove {removeTargets?.length ?? 0} torrent
              {removeTargets && removeTargets.length > 1 ? 's' : ''}?
            </DialogTitle>
            <DialogDescription>
              The torrent{removeTargets && removeTargets.length > 1 ? 's' : ''} will
              be removed from Transmission. Downloaded files are only deleted if you
              check the box below.
            </DialogDescription>
          </DialogHeader>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={deleteData}
              onCheckedChange={(checked) => setDeleteData(checked === true)}
            />
            Also delete downloaded files from disk
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTargets(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
