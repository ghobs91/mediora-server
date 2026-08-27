import React, { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import {
  TmdbSearchResult,
  GetLibraryMoviesDocument,
  useRemoveMovieMutation,
  GetDownloadingDocument,
  GetMissingDocument,
  EnrichedMovie,
} from '../../utils/graphql';

export function useRemoveLibrary({
  result,
}: {
  result: TmdbSearchResult | EnrichedMovie;
}) {
  const [open, setOpen] = useState(false);

  const [removeMovie] = useRemoveMovieMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetLibraryMoviesDocument },
      { query: GetDownloadingDocument },
      { query: GetMissingDocument },
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Movie removed from library'),
  });

  const handleClick = () => setOpen(true);

  const confirmDialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={result.title}
      description="Remove from library and delete files?"
      confirmLabel="Yes"
      cancelLabel="No"
      destructive
      onConfirm={() => removeMovie({ variables: { tmdbId: result.tmdbId } })}
    />
  );

  return { handleClick, confirmDialog };
}
