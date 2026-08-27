import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Minus, Play, Plus, RefreshCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  TmdbSearchResult,
  useGetParamsQuery,
  EnrichedMovie,
} from '../../utils/graphql';

import { getImageURL } from '../../utils/get-cached-image-url';

import { ManualSearchComponent } from '../manual-search/manual-search.component';

import { useAddLibrary } from './use-add-library.hook';
import { useRemoveLibrary } from './use-remove-library.hook';

import { RatingDetailComponent } from './rating-details.component';
import { MovieFileDetailsComponent } from './movie-file-details.component';

interface MovieDetailsProps {
  movie: TmdbSearchResult | EnrichedMovie;
  visible: boolean;
  inLibrary?: boolean;
  onRequestClose: () => void;
}

export function MovieDetailsComponent(props: MovieDetailsProps) {
  const { inLibrary, movie, visible, onRequestClose } = props;

  const [isSearchModalOpen, setSearchModalOpen] = useState(false);

  const { data } = useGetParamsQuery();
  const { handleClick: handleAdd, confirmDialog: addConfirmDialog } =
    useAddLibrary({ result: movie });
  const { handleClick: handleRemove, confirmDialog: removeConfirmDialog } =
    useRemoveLibrary({ result: movie });

  const youtubeSearchURL = `//youtube.com/results?search_query=trailer+${movie.title}+${data?.params?.language}`;

  return (
    <>
      {/* display replace ssearch modal only if we are in library pages */}
      {isSearchModalOpen && movie.__typename === 'EnrichedMovie' && (
        <ManualSearchComponent
          media={movie}
          onRequestClose={() => setSearchModalOpen(false)}
        />
      )}

      {addConfirmDialog}
      {removeConfirmDialog}

      <Dialog open={visible} onOpenChange={(open) => !open && onRequestClose()}>
        <DialogContent className="w-[80vw] max-w-[1280px] gap-0 overflow-hidden p-0 [&>button]:hidden">
          <DialogTitle className="sr-only">{movie.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {movie.overview}
          </DialogDescription>

          <div className="relative max-h-[80vh] overflow-y-auto">
            <button
              type="button"
              aria-label="Close"
              onClick={onRequestClose}
              className="absolute right-3 top-3 z-10 rounded-md text-white opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative overflow-hidden">
              <div
                className="absolute inset-0 z-[1] bg-cover bg-no-repeat"
                style={{
                  backgroundImage: `url(${getImageURL(
                    `w1920_and_h800_multi_faces${movie.posterPath}`
                  )})`,
                }}
              />
              <div className="absolute inset-0 z-[2] bg-[linear-gradient(to_right,rgba(33,38,58,1)_150px,rgba(52,57,74,0.84)_100%)]" />
              <div className="relative z-[3] flex flex-col gap-6 p-6 sm:flex-row sm:gap-9 sm:p-9">
                <div className="shrink-0">
                  <img
                    src={getImageURL(`w300_and_h450_bestv2${movie.posterPath}`)}
                    alt={movie.title}
                    className="w-[200px] rounded"
                  />
                </div>

                <div className="flex-1 text-white">
                  <div className="flex items-center text-4xl font-bold">
                    {movie.title}
                    {movie.releaseDate && (
                      <span className="ml-1 text-2xl font-light">
                        ({dayjs(movie.releaseDate).format('YYYY')})
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-6">
                    <RatingDetailComponent entertainment={movie} />
                    <Button
                      asChild
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                    >
                      <a
                        href={youtubeSearchURL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Play />
                        Watch trailer on youtube
                      </a>
                    </Button>
                  </div>

                  <p className="mt-2 max-w-[780px] text-lg">{movie.overview}</p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {inLibrary ? (
                      <>
                        {movie.__typename === 'EnrichedMovie' && (
                          <Button
                            variant="outline"
                            className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                            onClick={() => setSearchModalOpen(true)}
                          >
                            <RefreshCw />
                            Replace
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                          onClick={handleRemove}
                        >
                          <Minus />
                          Remove from library
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleAdd}>
                        <Plus />
                        Add to library
                      </Button>
                    )}
                  </div>

                  {inLibrary && (
                    <MovieFileDetailsComponent tmdbId={props.movie.tmdbId} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
