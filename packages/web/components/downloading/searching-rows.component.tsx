import React from 'react';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { SearchingMedia, FileType } from '../../utils/graphql';

export function SearchingRowsComponent({ rows }: { rows: SearchingMedia[] }) {
  const searching = rows.reduce((merged: SearchingMedia[], curr) => {
    if (curr.resourceType === FileType.Episode) {
      const match = merged.find((row) =>
        row.title
          .toUpperCase()
          .includes(curr.title.toUpperCase().replace(/ - EPISODE.+/, ''))
      );

      if (match) {
        const [, episode] =
          /EPISODE (\d+)/.exec(curr.title.toUpperCase()) || [];

        return merged.map((row) =>
          row.id === match.id
            ? { ...row, title: `${match.title}, ${episode}` }
            : row
        );
      }
    }
    return [...merged, curr];
  }, []);

  return (
    <>
      {searching.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-3 border-b border-border px-2 py-1.5 text-sm hover:bg-muted/50"
        >
          <div className="shrink-0">
            <Badge variant="outline" className="text-purple-500">
              Searching <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin" />
            </Badge>
          </div>
          <div className="truncate font-semibold uppercase">{row.title}</div>
        </div>
      ))}
    </>
  );
}
