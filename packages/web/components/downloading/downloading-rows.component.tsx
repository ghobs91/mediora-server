import React from 'react';
import { add, reduce, map } from 'lodash';
import { Loader2 } from 'lucide-react';

import {
  DownloadingMedia,
  useGetTorrentStatusQuery,
  FileType,
  TorrentStatus,
} from '../../utils/graphql';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/utils/format-bytes';

interface DownloadingRow extends DownloadingMedia {
  torrentStatus: TorrentStatus[];
}

export function DownloadingRowsComponent({
  rows,
}: {
  rows: DownloadingMedia[];
}) {
  const { data } = useGetTorrentStatusQuery({
    pollInterval: 2000,
    variables: {
      torrents: rows.map(({ resourceId, resourceType }) => ({
        resourceId,
        resourceType,
      })),
    },
  });

  const displayedRows = rows
    // add torrent status to rows
    .map((row) => {
      const match = data?.torrents.find(
        ({ resourceId }) => row.resourceId === resourceId
      );
      return { ...row, torrentStatus: match ? [match] : [] };
    })
    // regroup episodes of same tv episodes
    // and merge their status in an array
    .reduce((results: DownloadingRow[], curr) => {
      const isStopped =
        typeof curr.torrentStatus[0]?.status === 'number' &&
        curr.torrentStatus[0]?.status === 0;

      if (curr.resourceType === FileType.Episode && !isStopped) {
        const match = results.find((row) =>
          row.title
            .toUpperCase()
            .includes(curr.title.toUpperCase().replace(/ - EPISODE.+/, ''))
        );

        if (match) {
          const [, episode] =
            /EPISODE (\d+)/.exec(curr.title.toUpperCase()) || [];

          return results.map((row) =>
            row.id === match.id
              ? {
                  ...row,
                  torrentStatus: [...row.torrentStatus, ...curr.torrentStatus],
                  title: `${match.title}, ${episode}`,
                }
              : row
          );
        }
      }
      return [...results, curr];
    }, [])
    // compute displayed data on the component
    // from multiple torrent statuses
    .map((row) => {
      const totalPercent =
        reduce(map(row.torrentStatus, 'percentDone'), add, 0) /
        row.torrentStatus.length;

      const percent = Math.round(totalPercent * 10000) / 100;
      const downloadSpeed = reduce(
        map(row.torrentStatus, 'rateDownload'),
        add,
        0
      );

      const isStopped =
        typeof row.torrentStatus[0]?.status === 'number' &&
        row.torrentStatus[0]?.status === 0;

      return {
        ...row,
        torrentStatus: { percent, downloadSpeed, isStopped },
      };
    });

  return (
    <>
      {displayedRows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-3 border-b border-border px-2 py-1.5 text-sm hover:bg-muted/50"
        >
          <div className="shrink-0">
            {row.torrentStatus.isStopped ? (
              <Badge variant="outline" className="text-amber-500">
                Download paused
              </Badge>
            ) : (
              <Badge variant="outline" className="text-blue-500">
                Downloading{' '}
                <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin" />
              </Badge>
            )}
          </div>
          <div className="truncate font-semibold uppercase">{row.title}</div>
          <div className="shrink-0 truncate text-xs uppercase text-muted-foreground">
            ({row.torrent})
          </div>
          <div className="ml-auto shrink-0 text-xs text-muted-foreground">
            ({row.torrentStatus.percent}%
            {row.torrentStatus.downloadSpeed ? (
              <> - {formatBytes(row.torrentStatus.downloadSpeed)}/s</>
            ) : null}
            )
          </div>
          <div className="w-[250px] shrink-0">
            <Progress value={row.torrentStatus.percent} />
          </div>
        </div>
      ))}
    </>
  );
}
