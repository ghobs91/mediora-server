import React from 'react';

import { useGetLibraryTvShowsQuery, EnrichedTvShow } from '../../utils/graphql';

import { TMDBCardComponent } from '../tmdb-card/tmdb-card.component';

import { useSortable } from '../sortable/sortable.component';

import { Skeleton } from '@/components/ui/skeleton';

const sortAttributes = [
  { label: 'Name', key: 'title' },
  { label: 'First aired', key: 'releaseDate' },
  { label: 'Score', key: 'voteAverage' },
  { label: 'Added at', key: 'createdAt' },
];

export function TVShowsComponent() {
  const { data, loading } = useGetLibraryTvShowsQuery();
  const { renderSortable, results } = useSortable<EnrichedTvShow>({
    sortAttributes,
    searchableAttributes: ['title', 'originalTitle', 'releaseDate'],
    rows: data?.tvShows,
  });

  return (
    <>
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-8">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[2/3] rounded-xl" />
            ))}
          </div>
        ) : data?.tvShows.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            No TV shows in your library
          </div>
        ) : (
          <>
            {renderSortable()}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
              {results.map((tvShow) => (
                <TMDBCardComponent
                  key={tvShow.id}
                  type="tvshow"
                  result={tvShow}
                  inLibrary={true}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
