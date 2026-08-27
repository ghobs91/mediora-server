import React, { useState } from 'react';
import dayjs from 'dayjs';
import { orderBy, uniqBy } from 'lodash';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { formatNumber } from '../../utils/format-number';
import { availableIn } from '../../utils/available-in';

import {
  useGetMissingQuery,
  MissingTvEpisodesFragment,
  MissingMoviesFragment,
} from '../../utils/graphql';

import { ManualSearchComponent } from '../manual-search/manual-search.component';

export function MissingComponent() {
  const { pathname } = useRouter();
  const { data } = useGetMissingQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
  });

  const [manualSearch, setManualSearch] = useState<
    MissingTvEpisodesFragment | MissingMoviesFragment | null
  >(null);

  const isMovies = pathname.includes('movies');
  const rows: Array<MissingTvEpisodesFragment | MissingMoviesFragment> =
    (isMovies ? data?.movies : data?.tvEpisodes) || [];

  if (rows.length > 0) {
    const withDate = orderBy(
      rows.map((row) => ({ ...row, date: dayjs(row.releaseDate) })),
      ['date'],
      ['asc']
    );

    const missing = withDate.filter((row) => row.date.isBefore(new Date()));
    const notAired = uniqBy(
      withDate.filter((row) => row.date.isAfter(new Date())),
      'tvShow.id'
    );

    return (
      <>
        {manualSearch && (
          <ManualSearchComponent
            media={manualSearch}
            onRequestClose={() => setManualSearch(null)}
          />
        )}

        <div className="mx-auto w-full max-w-[1200px] px-6">
          {missing.map((row) => (
            <div
              key={row.id}
              className="mb-2 flex w-full items-center rounded-md border border-border bg-card px-2 py-1.5 text-sm"
            >
              {/* missing movie */}
              {row.__typename === 'EnrichedMovie' && (
                <div>
                  <span className="mr-1 font-bold">{row.title}</span>
                  <span className="text-muted-foreground">
                    ({row.date.format('YYYY')})
                  </span>
                </div>
              )}

              {/* missing tv episode */}
              {row.__typename === 'EnrichedTVEpisode' && (
                <div>
                  <span className="mr-1 font-bold">{row.tvShow?.title}</span>
                  <span className="text-muted-foreground">
                    S{formatNumber(row.seasonNumber!)}E
                    {formatNumber(row.episodeNumber!)}
                  </span>
                </div>
              )}

              <Badge
                variant="secondary"
                className="ml-auto cursor-pointer"
                onClick={() => setManualSearch(row)}
              >
                <Search className="mr-1 h-3 w-3" />
                Missing
              </Badge>
            </div>
          ))}

          {notAired.map((row) => (
            <div
              key={row.id}
              className="mb-2 flex w-full items-center rounded-md border border-border bg-card px-2 py-1.5 text-sm"
            >
              {/* not released movie */}
              {row.__typename === 'EnrichedMovie' && (
                <div>
                  <span className="mr-1 font-bold">{row.title}</span>
                  <span className="text-muted-foreground">
                    ({row.date.format('YYYY')})
                  </span>
                </div>
              )}

              {/* not aired tv episode */}
              {row.__typename === 'EnrichedTVEpisode' && (
                <div>
                  <span className="mr-1 font-bold">{row.tvShow?.title}</span>
                  <span className="text-muted-foreground">
                    S{formatNumber(row.seasonNumber!)}E
                    {formatNumber(row.episodeNumber!)}
                  </span>
                </div>
              )}

              <Badge variant="outline" className="ml-auto">
                {availableIn(row.date)}
              </Badge>
            </div>
          ))}
        </div>
      </>
    );
  }

  return <noscript />;
}
