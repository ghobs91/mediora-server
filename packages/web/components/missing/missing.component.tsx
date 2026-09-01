import React, { useState } from 'react';
import dayjs from 'dayjs';
import { orderBy, uniqBy } from 'lodash';
import { useRouter } from 'next/router';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { formatNumber } from '../../utils/format-number';
import { availableIn } from '../../utils/available-in';

import {
  useGetMissingQuery,
  MissingTvEpisodesFragment,
  MissingMoviesFragment,
  useGetQualityQuery,
  useDownloadMovieWithQualityMutation,
  useDownloadEpisodeWithQualityMutation,
  Entertainment,
  GetLibraryMoviesDocument,
  GetLibraryTvShowsDocument,
  GetDownloadingDocument,
  GetMissingDocument,
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
  const rowType = isMovies
    ? Entertainment.Movie
    : Entertainment.TvShow;

  const { data: qualityData } = useGetQualityQuery({
    variables: { type: rowType },
  });
  const qualities = qualityData?.qualities || [];
  const [quality, setQuality] = useState<string>('');

  const [downloadMovie] = useDownloadMovieWithQualityMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetMissingDocument },
      { query: GetDownloadingDocument },
      { query: GetLibraryMoviesDocument },
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Download movie started'),
  });

  const [downloadEpisode] = useDownloadEpisodeWithQualityMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetMissingDocument },
      { query: GetDownloadingDocument },
      { query: GetLibraryTvShowsDocument },
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Download episode started'),
  });

  const handleDownload = (row: MissingTvEpisodesFragment | MissingMoviesFragment) => {
    if (row.__typename === 'EnrichedMovie') {
      downloadMovie({
        variables: {
          movieId: row.id!,
          quality: quality || undefined,
        },
      });
    } else {
      downloadEpisode({
        variables: {
          episodeId: row.id!,
          quality: quality || undefined,
        },
      });
    }
  };

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
          {qualities.length > 0 && (
            <div className="mb-3 flex items-center gap-3">
              <label className="text-sm text-muted-foreground">
                Quality
              </label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Any quality" />
                </SelectTrigger>
                <SelectContent>
                  {qualities.map((q) => (
                    <SelectItem key={q.id} value={q.name}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                className="mr-2 cursor-pointer"
                onClick={() => setManualSearch(row)}
              >
                <Search className="mr-1 h-3 w-3" />
                Missing
              </Badge>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => handleDownload(row)}
              >
                <Download className="mr-1 h-3 w-3" />
                Download
              </Button>
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
