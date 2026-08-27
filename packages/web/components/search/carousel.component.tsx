import React, { useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  TmdbSearchResult,
  useGetLibraryMoviesQuery,
  useGetLibraryTvShowsQuery,
} from '../../utils/graphql';

import { TMDBCardComponent } from '../tmdb-card/tmdb-card.component';

export function CarouselComponent({
  results,
  type,
}: {
  results: TmdbSearchResult[];
  type: 'movie' | 'tvshow';
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start' });
  const { data: moviesLibrary } = useGetLibraryMoviesQuery();
  const { data: tvShowsLibrary } = useGetLibraryTvShowsQuery();

  const tmdbIds = [
    ...(moviesLibrary?.movies?.map(({ tmdbId }) => tmdbId) || []),
    ...(tvShowsLibrary?.tvShows?.map(({ tmdbId }) => tmdbId) || []),
  ];

  useEffect(() => {
    emblaApi?.scrollTo(0);
  }, [results, emblaApi]);

  return (
    <div className="relative px-10">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {results.map((result) => (
            <div key={result.id} className="min-w-0 flex-[0_0_220px]">
              <TMDBCardComponent
                type={type}
                result={result}
                inLibrary={tmdbIds.includes(result.tmdbId)}
              />
            </div>
          ))}
        </div>
      </div>

      {results.length > 5 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-0 top-[175px] rounded-full border border-border bg-background/80 p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-0 top-[175px] rounded-full border border-border bg-background/80 p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
