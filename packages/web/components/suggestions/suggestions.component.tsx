import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { CarouselComponent } from '../search/carousel.component';

import { useGetRecommendedQuery } from '../../utils/graphql';

export function SuggestionsComponent() {
  const { data, loading } = useGetRecommendedQuery({
    fetchPolicy: 'cache-and-network',
  });

  const hasRecommendations = Boolean(
    data?.movies?.length || data?.tvShows?.length
  );

  const isLoading = !hasRecommendations && loading;

  return (
    <div>
      <div className="bg-primary py-10 text-primary-foreground">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-3xl font-semibold">What are we watching next?</div>
          <div className="text-2xl font-medium">
            Recommendations based on your library...
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mt-12">
          {isLoading && (
            <>
              <CategorySkeleton />
              <CategorySkeleton />
            </>
          )}
          {!hasRecommendations && !isLoading && (
            <div className="py-16 text-center text-muted-foreground">
              No recommendations yet...
            </div>
          )}
          {hasRecommendations && !isLoading && (
            <>
              {Boolean(data?.movies?.length) && (
                <>
                  <div className="mb-4 text-lg font-medium">
                    Recommended Movies
                  </div>
                  <CarouselComponent
                    type="movie"
                    results={data?.movies || []}
                  />
                </>
              )}
              {Boolean(data?.tvShows?.length) && (
                <>
                  <div className="mb-4 text-lg font-medium">
                    Recommended TV Shows
                  </div>
                  <CarouselComponent
                    type="tvshow"
                    results={data?.tvShows || []}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[2/3] w-[220px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
