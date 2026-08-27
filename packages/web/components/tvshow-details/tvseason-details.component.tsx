import React, { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

import {
  useGetTvSeasonDetailsQuery,
  TmdbFormattedTvSeason,
  EnrichedTvEpisode,
  DownloadableMediaState,
  GetTvSeasonDetailsDocument,
} from '../../utils/graphql';

import { availableIn } from '../../utils/available-in';
import { ManualSearchComponent } from '../manual-search/manual-search.component';
import { Media } from '../manual-search/manual-search.helpers';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TVSeasonDetailsProps {
  tvShowTMDBId: number;
  season: TmdbFormattedTvSeason;
  tvShowTitle: string;
}

function EpisodeStatus({ episode }: { episode: EnrichedTvEpisode }) {
  if (
    episode.state === DownloadableMediaState.Processed ||
    episode.state === DownloadableMediaState.Downloaded
  ) {
    return <Badge variant="secondary">Downloaded</Badge>;
  }

  if (
    episode.state === DownloadableMediaState.Searching ||
    episode.state === DownloadableMediaState.Downloading
  ) {
    return <Badge variant="default">Downloading</Badge>;
  }

  return <Badge variant="outline">Missing</Badge>;
}

export function TVSeasonDetailsComponent({
  tvShowTMDBId,
  season,
  tvShowTitle,
}: TVSeasonDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState<Media | null>(null);

  const { data, loading } = useGetTvSeasonDetailsQuery({
    pollInterval: 5000,
    fetchPolicy: 'cache-and-network',
    variables: { tvShowTMDBId, seasonNumber: season.seasonNumber },
  });

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {manualSearch && (
        <ManualSearchComponent
          media={manualSearch}
          onRequestClose={() => setManualSearch(null)}
          refetchQueries={[
            {
              query: GetTvSeasonDetailsDocument,
              variables: {
                tvShowTMDBId,
                seasonNumber: season.seasonNumber,
              },
            },
          ]}
        />
      )}

      <div
        className={cn(
          'rounded-md border border-border bg-card',
          isOpen && season.seasonNumber !== 1 && 'mb-3'
        )}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <button
            type="button"
            onClick={toggle}
            className="flex items-center text-left"
          >
            <span className="mr-3 mt-1">
              {isOpen ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </span>
            <span className="mr-2 text-xl font-semibold">
              Season {season.seasonNumber}
            </span>
            {season.airDate && (
              <span className="font-light">
                ({dayjs(season.airDate).format('YYYY')})
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setManualSearch({ ...season, tvShowTitle, tvShowTMDBId })
            }
          >
            {season.inLibrary ? 'Replace' : 'Search'} season
            <Search className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {isOpen &&
          (loading && !data ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <Table>
              <TableBody>
                {(data?.episodes || []).map((episode) => (
                  <TableRow key={episode.id}>
                    <TableCell className="w-[100px]">
                      Episode {episode.episodeNumber}
                    </TableCell>
                    <TableCell>
                      {availableIn(dayjs(episode.releaseDate))}
                    </TableCell>
                    <TableCell className="w-[120px] text-right">
                      <EpisodeStatus episode={episode} />
                    </TableCell>
                    <TableCell className="w-[160px] text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManualSearch(episode)}
                      >
                        <Search className="h-4 w-4" />
                        {episode.state !== DownloadableMediaState.Missing
                          ? 'Replace'
                          : 'Search'}{' '}
                        episode
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
      </div>
    </>
  );
}
