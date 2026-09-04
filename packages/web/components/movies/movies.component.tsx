import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { useGetLibraryMoviesQuery, EnrichedMovie } from '../../utils/graphql';

import { TMDBCardComponent } from '../tmdb-card/tmdb-card.component';

import { useSortable } from '../sortable/sortable.component';

const sortAttributes = [
  { label: 'Name', key: 'title' },
  { label: 'Release date', key: 'releaseDate' },
  { label: 'Score', key: 'voteAverage' },
  { label: 'Added at', key: 'createdAt' },
];

export function MoviesComponent() {
  const { data, loading } = useGetLibraryMoviesQuery();
  const { renderSortable, results } = useSortable<EnrichedMovie>({
    sortAttributes,
    searchableAttributes: ['title', 'originalTitle', 'releaseDate'],
    rows: data?.movies,
  });

  return (
    <>
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-8">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[2/3] w-full" />
            ))}
          </div>
        ) : data?.movies?.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Your movie library is empty
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Add movies from the search or discover pages.
            </p>
          </div>
        ) : (
          <>
            {renderSortable()}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
              {results.map((movie) => (
                <TMDBCardComponent
                  key={movie.id}
                  type="movie"
                  result={movie}
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
