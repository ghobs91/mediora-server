import React, { useEffect, useState, useCallback } from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { TMDBCardComponent } from '../tmdb-card/tmdb-card.component';
import { DiscoverFilterFormComponent } from './discover-filter-from.component';

import {
  useGetDiscoverLazyQuery,
  GetDiscoverQueryVariables,
  useGetLibraryMoviesQuery,
  useGetLibraryTvShowsQuery,
  useGetParamsQuery,
  Entertainment,
} from '../../utils/graphql';

const PAGE_SIZE = 20;

export function DiscoverComponent() {
  const [discover, { data, loading }] = useGetDiscoverLazyQuery();
  const { data: defaultUserParams } = useGetParamsQuery();
  const [filterParams, setFilterParams] = useState<GetDiscoverQueryVariables>({
    originLanguage: defaultUserParams?.params.language,
    score: 70,
    entertainment: Entertainment.Movie,
  });
  const [page, setPage] = useState(1);

  const { data: moviesLibrary } = useGetLibraryMoviesQuery();
  const { data: tvShowsLibrary } = useGetLibraryTvShowsQuery();

  const tmdbIds =
    filterParams.entertainment === Entertainment.Movie
      ? moviesLibrary?.movies?.map(({ tmdbId }) => tmdbId) || []
      : tvShowsLibrary?.tvShows?.map(({ tmdbId }) => tmdbId) || [];

  const TMDBResults = data?.TMDBResults;
  const hasNoSearchResults = TMDBResults?.totalResults === 0;
  const totalPages = TMDBResults
    ? Math.ceil(TMDBResults.totalResults / PAGE_SIZE)
    : 0;

  const onFinish = (formParams: GetDiscoverQueryVariables) => {
    setPage(1);
    setFilterParams(formParams);
  };

  useEffect(() => {
    discover({
      variables: filterParams,
    });
  }, [filterParams, discover]);

  const onPagination = useCallback(
    (newPage: number) => {
      setPage(newPage);
      discover({
        variables: { ...filterParams, page: newPage },
      });
    },
    [filterParams, discover]
  );

  return (
    <div>
      <div className="bg-primary py-10 text-primary-foreground">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-3xl font-semibold">What are we watching next?</div>
          <div className="text-2xl font-medium">
            Dive deeper to discover next entertainment
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-4 text-lg font-medium">
            Discover by filter
            {TMDBResults && (
              <Badge variant="secondary">{TMDBResults.totalResults}</Badge>
            )}
          </div>

          <div className="flex gap-6">
            <div className="w-64 shrink-0">
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <DiscoverFilterFormComponent
                    params={filterParams}
                    onFinish={onFinish}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0 flex-1">
              <Card className="max-h-[794px] min-h-[794px] overflow-y-auto">
                <CardContent className="p-6">
                  {!data || loading ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton
                          key={index}
                          className="aspect-[2/3] w-[220px] rounded-xl"
                        />
                      ))}
                    </div>
                  ) : hasNoSearchResults ? (
                    <div className="flex min-h-[600px] items-center justify-center text-center text-muted-foreground">
                      No results... 😔
                    </div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
                      {TMDBResults?.results
                        ?.filter((item) => !tmdbIds.includes(item.tmdbId))
                        ?.map((res) => (
                          <TMDBCardComponent
                            key={res.id}
                            type={
                              filterParams.entertainment ===
                              Entertainment.Movie
                                ? 'movie'
                                : 'tvshow'
                            }
                            result={res}
                          />
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPagination(page - 1)}
                  >
                    Previous
                  </Button>
                  {renderPageNumbers(page, totalPages, onPagination)}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => onPagination(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPageItems(current: number, total: number): Array<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: Array<number | '...'> = [1];
  if (current > 3) items.push('...');
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    items.push(i);
  }
  if (current < total - 2) items.push('...');
  items.push(total);

  return items;
}

function renderPageNumbers(
  current: number,
  total: number,
  onPage: (page: number) => void
) {
  return getPageItems(current, total).map((item, index) =>
    item === '...' ? (
      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
        ...
      </span>
    ) : (
      <Button
        key={item}
        variant={item === current ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPage(item)}
      >
        {item}
      </Button>
    )
  );
}
