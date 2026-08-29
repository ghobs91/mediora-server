import React, { useMemo, useState } from 'react';
import { reduce, map, add } from 'lodash';
import {
  Loader2,
  Pause,
  Play,
  Trash2,
  CircleCheck,
} from 'lucide-react';

import {
  DownloadingMedia,
  TorrentStatus,
  FileType,
  GetDownloadingDocument,
  useGetDownloadingQuery,
  useGetTorrentStatusQuery,
  usePauseTorrentsMutation,
  useResumeTorrentsMutation,
  useRemoveTorrentsMutation,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatBytes } from '@/utils/format-bytes';

interface DownloadRow extends DownloadingMedia {
  torrentStatus: TorrentStatus[];
}

interface AggregatedRow extends DownloadingMedia {
  isPaused: boolean;
  isComplete: boolean;
  percent: number;
  downloadSpeed: number;
  uploadSpeed: number;
  ratio: number;
  totalSize: number;
}

function statusBadge(status: number) {
  if (status === 0) {
    return (
      <Badge variant="outline" className="text-amber-500">
        <Pause className="mr-1 h-3 w-3" />
        Paused
      </Badge>
    );
  }
  if (status === 3 || status === 4) {
    return (
      <Badge variant="outline" className="text-green-500">
        <CircleCheck className="mr-1 h-3 w-3" />
        Seeding
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

export function DownloadsComponent() {
  const { data } = useGetDownloadingQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: 2500,
  });

  const downloading = data?.downloading ?? [];

  const { data: statusData } = useGetTorrentStatusQuery({
    pollInterval: 2000,
    variables: {
      torrents: downloading.map(({ resourceId, resourceType }) => ({
        resourceId,
        resourceType,
      })),
    },
  });

  const [pauseTorrents] = usePauseTorrentsMutation({
    awaitRefetchQueries: true,
    refetchQueries: [{ query: GetDownloadingDocument }],
    onError: ({ message }) => alert(message),
  });

  const [resumeTorrents] = useResumeTorrentsMutation({
    awaitRefetchQueries: true,
    refetchQueries: [{ query: GetDownloadingDocument }],
    onError: ({ message }) => alert(message),
  });

  const [removeTorrents] = useRemoveTorrentsMutation({
    awaitRefetchQueries: true,
    refetchQueries: [{ query: GetDownloadingDocument }],
    onError: ({ message }) => alert(message),
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const aggregated = useMemo(() => {
    return downloading
      .map((row) => {
        const match = statusData?.torrents.find(
          ({ resourceId }) => row.resourceId === resourceId,
        );
        return { ...row, torrentStatus: match ? [match] : [] };
      })
      .reduce((results: DownloadRow[], curr) => {
        const isStopped =
          typeof curr.torrentStatus[0]?.status === 'number' &&
          curr.torrentStatus[0]?.status === 0;

        if (curr.resourceType === FileType.Episode && !isStopped) {
          const match = results.find((row) =>
            row.title
              .toUpperCase()
              .includes(curr.title.toUpperCase().replace(/ - EPISODE.+/, '')),
          );

          if (match) {
            const [, episode] =
              /EPISODE (\d+)/.exec(curr.title.toUpperCase()) || [];

            return results.map((row) =>
              row.id === match.id
                ? {
                    ...row,
                    torrentStatus: [
                      ...row.torrentStatus,
                      ...curr.torrentStatus,
                    ],
                    title: `${match.title}, ${episode}`,
                  }
                : row,
            );
          }
        }
        return [...results, curr];
      }, [])
      .map((row) => {
        const totalPercent =
          reduce(map(row.torrentStatus, 'percentDone'), add, 0) /
          row.torrentStatus.length;

        const percent = Math.round(totalPercent * 10000) / 100;
        const downloadSpeed = reduce(map(row.torrentStatus, 'rateDownload'), add, 0);
        const uploadSpeed = reduce(map(row.torrentStatus, 'rateUpload'), add, 0);
        const ratio =
          reduce(map(row.torrentStatus, 'uploadRatio'), add, 0) /
          row.torrentStatus.length;
        const totalSize = reduce(map(row.torrentStatus, 'totalSize'), add, 0);

        const isPaused =
          typeof row.torrentStatus[0]?.status === 'number' &&
          row.torrentStatus[0]?.status === 0;
        const isComplete =
          typeof row.torrentStatus[0]?.status === 'number' &&
          (row.torrentStatus[0]?.status === 3 ||
            row.torrentStatus[0]?.status === 4);

        return {
          ...row,
          percent,
          downloadSpeed,
          uploadSpeed,
          ratio,
          totalSize,
          isPaused,
          isComplete,
        } as unknown as AggregatedRow;
      });
  }, [downloading, statusData]);

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((rowId) => rowId !== id)
        : [...prev, id],
    );
  };

  const toggleAll = () => {
    setSelectedIds(
      selectedIds.length === aggregated.length ? [] : aggregated.map((row) => row.id),
    );
  };

  const handlePauseAll = async () => {
    await pauseTorrents({
      variables: {
        torrents: aggregated.map(({ resourceId, resourceType }) => ({
          resourceId,
          resourceType,
        })),
      },
    });
  };

  const handleResumeAll = async () => {
    await resumeTorrents({
      variables: {
        torrents: aggregated.map(({ resourceId, resourceType }) => ({
          resourceId,
          resourceType,
        })),
      },
    });
  };

  const handleRemoveAll = async () => {
    await removeTorrents({
      variables: {
        torrents: aggregated.map(({ resourceId, resourceType }) => ({
          resourceId,
          resourceType,
        })),
      },
    });
    setSelectedIds([]);
    setRemoveConfirmOpen(false);
  };

  const handleRemoveRow = async (row: AggregatedRow) => {
    await removeTorrents({
      variables: {
        torrents: [
          { resourceId: row.resourceId, resourceType: row.resourceType },
        ],
      },
    });
  };

  const handleToggleRow = async (row: AggregatedRow) => {
    if (row.isPaused) {
      await resumeTorrents({
        variables: {
          torrents: [
            { resourceId: row.resourceId, resourceType: row.resourceType },
          ],
        },
      });
    } else {
      await pauseTorrents({
        variables: {
          torrents: [
            { resourceId: row.resourceId, resourceType: row.resourceType },
          ],
        },
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Downloads</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePauseAll}
            disabled={aggregated.length === 0}
          >
            <Pause className="mr-1.5 h-4 w-4" />
            Pause all
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResumeAll}
            disabled={aggregated.length === 0}
          >
            <Play className="mr-1.5 h-4 w-4" />
            Resume all
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-400"
            onClick={() => setRemoveConfirmOpen(true)}
            disabled={aggregated.length === 0}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                <button onClick={toggleAll}>
                  {selectedIds.length === aggregated.length && aggregated.length > 0
                    ? '✓'
                    : ''}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Progress
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Download
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Upload
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Ratio
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Size
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {aggregated.map((row) => (
              <tr
                key={row.id}
                className="group hover:bg-muted/30"
              >
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => toggleRow(row.id)}
                    className="h-4 w-4"
                  >
                    {selectedIds.includes(row.id) ? '✓' : ''}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <div className="truncate font-medium">{row.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.torrent}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {statusBadge(row.isPaused ? 0 : row.isComplete ? 3 : 2)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-32">
                      <Progress value={row.percent} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(row.percent)}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {row.downloadSpeed > 0
                    ? `${formatBytes(row.downloadSpeed)}/s`
                    : '—'}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {row.uploadSpeed > 0
                    ? `${formatBytes(row.uploadSpeed)}/s`
                    : '—'}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {row.ratio > 0 ? row.ratio.toFixed(2) : '—'}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {formatBytes(row.totalSize)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleToggleRow(row)}
                      title={row.isPaused ? 'Resume' : 'Pause'}
                    >
                      {row.isPaused ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-6 w-6 text-red-500 hover:text-red-400"
                      onClick={() => handleRemoveRow(row)}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        title="Remove all downloads?"
        description="This will remove all torrents and their associated files."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleRemoveAll}
      />
    </div>
  );
}
