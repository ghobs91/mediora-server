import React, { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import {
  useTrackMovieMutation,
  TmdbSearchResult,
  GetLibraryMoviesDocument,
  GetDownloadingDocument,
  GetMissingDocument,
  EnrichedMovie,
} from '../../utils/graphql';

export function useAddLibrary({
  result,
}: {
  result: TmdbSearchResult | EnrichedMovie;
}) {
  const [open, setOpen] = useState(false);

  const [trackMovie] = useTrackMovieMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetLibraryMoviesDocument },
      { query: GetDownloadingDocument },
      { query: GetMissingDocument },
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Movie sent to download'),
  });

  const handleClick = () => setOpen(true);

  const confirmDialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={result.title}
      description="Search torrent and start download ?"
      confirmLabel="Yes"
      cancelLabel="No"
      onConfirm={() =>
        trackMovie({
          variables: { title: result.title, tmdbId: result.tmdbId },
        })
      }
    />
  );

  return { handleClick, confirmDialog };
}
