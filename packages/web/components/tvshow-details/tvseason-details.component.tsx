import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
} from 'lucide-react';

import {
  useGetTvSeasonDetailsQuery,
  TmdbFormattedTvSeason,
  EnrichedTvEpisode,
  DownloadableMediaState,
  GetTvSeasonDetailsDocument,
} from '../../utils/graphql';

import { availableIn } from '../../utils/available-in';
import { formatNumber } from '../../utils/format-number';
import { ManualSearchComponent } from '../manual-search/manual-search.component';
import { Media } from '../manual-search/manual-search.helpers';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
  selected: boolean;
  onToggleSelect: (seasonNumber: number) => void;
}

function isDownloaded(episode: EnrichedTvEpisode) {
  return (
    episode.state === DownloadableMediaState.Processed ||
    episode.state === DownloadableMediaState.Downloaded
  );
}

function isDownloading(episode: EnrichedTvEpisode) {
  return (
    episode.state === DownloadableMediaState.Searching ||
    episode.state === DownloadableMediaState.Downloading
  );
}

export function TVSeasonDetailsComponent({
  tvShowTMDBId,
  season,
  tvShowTitle,
  selected,
  onToggleSelect,
}: TVSeasonDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState<Media | null>(null);

  const { data, loading } = useGetTvSeasonDetailsQuery({
    pollInterval: 5000,
    fetchPolicy: 'cache-and-network',
    skip: !season.inLibrary || !isOpen,
    variables: { tvShowTMDBId, seasonNumber: season.seasonNumber },
  });

  const total = season.episodeCount ?? 0;
  const downloaded = season.episodesDownloaded;
  const progress = total > 0 ? (downloaded / total) * 100 : 0;
  const isComplete = season.inLibrary && total > 0 && downloaded >= total;

  const openManualSearch = () =>
    setManualSearch({ ...season, tvShowTitle, tvShowTMDBId });

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
          'group transition-colors',
          !season.inLibrary && 'cursor-pointer hover:bg-muted/40',
          selected && 'bg-primary/10'
        )}
        onClick={() => {
          if (!season.inLibrary) onToggleSelect(season.seasonNumber);
        }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <button
            type="button"
            onClick={(event) => {
              if (!season.inLibrary) return;
              event.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="flex w-5 shrink-0 justify-center text-muted-foreground">
              {season.inLibrary &&
                (isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                ))}
            </span>
            <span className="truncate text-base font-semibold">
              Season {season.seasonNumber}
            </span>
            {season.airDate && (
              <span className="shrink-0 text-sm font-light text-muted-foreground">
                ({dayjs(season.airDate).format('YYYY')})
              </span>
            )}
          </button>

          <div className="flex shrink-0 items-center justify-end gap-2 sm:w-[200px]">
            {season.inLibrary ? (
              <>
                <Progress
                  value={progress}
                  className={cn(
                    'h-1.5 w-[70px] sm:w-[110px]',
                    isComplete && '[&>div]:bg-emerald-500'
                  )}
                />
                <span
                  className={cn(
                    'w-[52px] text-right text-xs tabular-nums',
                    isComplete
                      ? 'font-medium text-emerald-500'
                      : 'text-muted-foreground'
                  )}
                >
                  {downloaded}/{total}
                </span>
                {isComplete && <Check className="h-4 w-4 text-emerald-500" />}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                {total} episodes
              </span>
            )}
          </div>

          <div className="flex shrink-0 justify-end sm:w-[110px]">
            {season.inLibrary ? (
              <Button
                variant="ghost"
                size="sm"
                className="opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  openManualSearch();
                }}
              >
                <Search className="h-4 w-4" />
                Replace
              </Button>
            ) : (
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(season.seasonNumber)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select season ${season.seasonNumber}`}
              />
            )}
          </div>
        </div>

        {isOpen &&
          (loading && !data ? (
            <div className="space-y-2 px-4 pb-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <Table className="border-t border-border">
              <TableBody>
                {(data?.episodes || []).map((episode) => {
                  const downloaded = isDownloaded(episode);
                  const downloading = isDownloading(episode);

                  return (
                    <TableRow
                      key={episode.id}
                      className="group/episode hover:bg-muted/40"
                    >
                      <TableCell className="w-[80px] font-medium tabular-nums text-muted-foreground">
                        E{formatNumber(episode.episodeNumber)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {availableIn(dayjs(episode.releaseDate))}
                      </TableCell>
                      <TableCell className="text-right">
                        {downloaded ? (
                          <span
                            className="inline-flex items-center text-emerald-500"
                            title="Downloaded"
                          >
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Downloaded</span>
                          </span>
                        ) : downloading ? (
                          <span
                            className="inline-flex items-center text-primary"
                            title="Downloading"
                          >
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="sr-only">Downloading</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Missing
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-[120px] text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            downloaded &&
                              'opacity-0 focus-visible:opacity-100 group-hover/episode:opacity-100'
                          )}
                          onClick={() => setManualSearch(episode)}
                        >
                          <Search className="h-4 w-4" />
                          {downloaded ? 'Replace' : 'Search'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ))}
      </div>
    </>
  );
}
