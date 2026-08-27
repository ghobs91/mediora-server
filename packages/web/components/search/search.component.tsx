import React, { useState, useEffect, useRef } from 'react';
import { debounce, throttle } from 'throttle-debounce';
import { Loader2, Search } from 'lucide-react';

import { useGetPopularQuery, useSearchLazyQuery } from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { CarouselComponent } from './carousel.component';

export function SearchComponent() {
  const [searchQuery, setSearchQuery] = useState('');

  const popularQuery = useGetPopularQuery();
  const [search, { data, loading }] = useSearchLazyQuery();

  const { current: debouncedSearch } = useRef(debounce(500, search));
  const { current: throttledSearch } = useRef(throttle(500, search));

  const displaySearchResults = searchQuery && searchQuery.trim();
  const moviesSearchResults = data?.results?.movies || [];
  const tvShowSearchResults = data?.results?.tvShows || [];
  const hasNoSearchResults =
    moviesSearchResults.length === 0 && tvShowSearchResults.length === 0;

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    search({ variables: { query: searchQuery } });
  };

  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      if (searchQuery.length < 5) {
        throttledSearch({ variables: { query: searchQuery } });
      } else {
        debouncedSearch({ variables: { query: searchQuery } });
      }
    }
  }, [debouncedSearch, searchQuery, throttledSearch]);

  const isLoading = popularQuery.loading || (hasNoSearchResults && loading);

  return (
    <div>
      <div className="bg-primary py-10 text-primary-foreground">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-3xl font-semibold">What are we watching next?</div>
          <div className="mb-12 text-2xl font-medium">Search anything...</div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              value={searchQuery}
              onChange={({ target }) => setSearchQuery(target.value)}
              placeholder="Search movies and TV shows..."
              className="h-10 rounded-full border-transparent bg-white text-neutral-900 placeholder:text-neutral-500"
            />
            <Button
              type="submit"
              className="h-10 shrink-0 rounded-full bg-background text-foreground hover:bg-background/90"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
              Search
            </Button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mt-12">
          {isLoading ? (
            <>
              <CategorySkeleton />
              <CategorySkeleton />
            </>
          ) : displaySearchResults && hasNoSearchResults ? (
            <div className="py-16 text-center text-muted-foreground">
              No results... 😔
            </div>
          ) : (
            <>
              {(displaySearchResults
                ? moviesSearchResults.length > 0
                : true) && (
                <>
                  <div className="mb-4 text-lg font-medium">
                    {displaySearchResults ? 'Found Movies' : 'Popular Movies'}
                  </div>
                  <CarouselComponent
                    type="movie"
                    results={
                      displaySearchResults
                        ? moviesSearchResults
                        : popularQuery.data?.results?.movies || []
                    }
                  />
                </>
              )}
              {(displaySearchResults
                ? tvShowSearchResults.length > 0
                : true) && (
                <>
                  <div className="mb-4 text-lg font-medium">
                    {displaySearchResults
                      ? 'Found TV Shows'
                      : 'Popular TV Shows'}
                  </div>
                  <CarouselComponent
                    type="tvshow"
                    results={
                      displaySearchResults
                        ? tvShowSearchResults
                        : popularQuery.data?.results?.tvShows || []
                    }
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
