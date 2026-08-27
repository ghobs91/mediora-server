import React, { useState } from 'react';
import dayjs from 'dayjs';
import { CloudDownload, Loader2, Play, Trash2 } from 'lucide-react';

import { TmdbSearchResult, useGetParamsQuery } from '../../utils/graphql';
import { getImageURL } from '../../utils/get-cached-image-url';

import { useGetSeasons } from './use-get-seasons.hook';
import { RatingDetailComponent } from '../movie-details/rating-details.component';
import { TVSeasonDetailsComponent } from './tvseason-details.component';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TVShowSeasonsModalComponentProps {
  visible: boolean;
  tvShow: TmdbSearchResult;
  inLibrary?: boolean;
  onRequestClose: () => void;
}

export function TVShowSeasonsModalComponent(
  props: TVShowSeasonsModalComponentProps
) {
  const { tvShow, visible, inLibrary, onRequestClose } = props;
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const { data } = useGetParamsQuery();

  const {
    seasons,
    loading,
    trackTVShow,
    mutationLoading,
    removeTVShow,
  } = useGetSeasons({
    tmdbId: tvShow.tmdbId,
  });

  const handleClose = () => {
    setSelectedSeasons([]);
    onRequestClose();
  };

  const handleSeasonClick = (seasonNumber: number) => {
    setSelectedSeasons(
      selectedSeasons.includes(seasonNumber)
        ? selectedSeasons.filter((_) => _ !== seasonNumber)
        : [...selectedSeasons, seasonNumber]
    );
  };

  const handleTrack = async () => {
    await trackTVShow({
      variables: {
        tmdbId: tvShow.tmdbId,
        seasonNumbers: selectedSeasons,
      },
    });
    setSelectedSeasons([]);
  };

  const youtubeSearchURL = `//youtube.com/results?search_query=trailer+season+1+${tvShow.title}+${data?.params?.language}`;

  const isDownloadButtonDisabled =
    selectedSeasons.length === 0 || loading || mutationLoading;
  const isDeleteButtonDisabled = !inLibrary || loading || mutationLoading;

  return (
    <>
      <Dialog
        open={visible}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="max-h-[80vh] w-[80vw] max-w-[1280px] overflow-y-auto p-[3px]">
          <div className="relative isolate overflow-hidden rounded-md">
            <div
              className="absolute inset-0 z-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${getImageURL(
                  `w1920_and_h800_multi_faces${tvShow.posterPath}`
                )})`,
              }}
            />
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#21263a] to-[#343a4a]/85" />
            <div className="relative z-20 flex px-9 py-6">
              <div className="w-[200px] shrink-0">
                <img
                  src={getImageURL(`w300_and_h450_bestv2${tvShow.posterPath}`)}
                  className="w-[200px] rounded"
                  alt={tvShow.title}
                />
              </div>
              <div className="ml-9 flex-1">
                <div className="flex items-center text-[2.2em] font-bold">
                  {tvShow.title}
                  {tvShow.releaseDate && (
                    <span className="ml-1 text-[0.8em] font-light">
                      ({dayjs(tvShow.releaseDate).format('YYYY')})
                    </span>
                  )}
                </div>
                <div className="my-2 flex items-center">
                  <RatingDetailComponent entertainment={tvShow} />
                  <Button asChild variant="ghost" className="ml-6">
                    <a href={youtubeSearchURL} target="_default">
                      <Play className="h-4 w-4" />
                      Watch trailer on youtube
                    </a>
                  </Button>
                </div>
                <div className="max-w-[780px] text-[1.2em]">
                  {tvShow.overview}
                </div>
                <div className="flex flex-col gap-1 pt-3">
                  {seasons
                    .filter((season) => season.inLibrary)
                    .map((season) => (
                      <TVSeasonDetailsComponent
                        key={season.id}
                        season={season}
                        tvShowTMDBId={tvShow.tmdbId}
                        tvShowTitle={tvShow.title}
                      />
                    ))}
                </div>
                <div className="mt-6 flex flex-wrap">
                  {seasons.map((season) => (
                    <button
                      key={season.id}
                      type="button"
                      disabled={season.inLibrary}
                      onClick={() => handleSeasonClick(season.seasonNumber)}
                      className={cn(
                        'mb-2 mr-1 ml-1 flex max-w-[145px] items-center rounded border px-2.5 py-2 text-left transition',
                        season.inLibrary
                          ? 'cursor-not-allowed border-border text-muted-foreground opacity-60'
                          : selectedSeasons.includes(season.seasonNumber)
                            ? 'border-primary'
                            : 'border-white/30 hover:border-white'
                      )}
                    >
                      <div>
                        <div className="text-[1.1em] font-semibold">
                          Season {season.seasonNumber}
                        </div>
                        <div className="text-[0.9em]">
                          {season.airDate && (
                            <>{dayjs(season.airDate).format('YYYY')} | </>
                          )}
                          {season.episodeCount} Episodes
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex gap-3">
                  {inLibrary && (
                    <Button
                      variant="outline"
                      disabled={isDeleteButtonDisabled}
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete TV Show
                    </Button>
                  )}
                  <Button
                    variant="default"
                    disabled={isDownloadButtonDisabled}
                    onClick={handleTrack}
                  >
                    {mutationLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CloudDownload className="h-4 w-4" />
                    )}
                    {selectedSeasons.length > 0
                      ? `Download ${selectedSeasons.length} seasons`
                      : 'Download'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={tvShow.title}
        description="Remove from library and delete files?"
        destructive
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={() =>
          removeTVShow({
            variables: { tmdbId: tvShow.tmdbId },
          })
        }
      />
    </>
  );
}
