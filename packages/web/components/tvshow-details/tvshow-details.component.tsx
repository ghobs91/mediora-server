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
                <div className="mt-4 overflow-hidden rounded-md border border-border bg-card divide-y divide-border">
                  {seasons.map((season) => (
                    <TVSeasonDetailsComponent
                      key={season.id}
                      season={season}
                      tvShowTMDBId={tvShow.tmdbId}
                      tvShowTitle={tvShow.title}
                      selected={selectedSeasons.includes(season.seasonNumber)}
                      onToggleSelect={handleSeasonClick}
                    />
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
