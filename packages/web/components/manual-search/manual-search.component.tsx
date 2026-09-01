import React, { useState, useEffect, useRef } from 'react';
import { PureQueryOptions } from '@apollo/client';
import { FolderOpen, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import {
  useSearchTorrentLazyQuery,
  useDownloadOwnTorrentMutation,
  useGetQualityQuery,
  FileType,
  Entertainment,
  GetLibraryTvShowsDocument,
  GetDownloadingDocument,
  GetMissingDocument,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { toBase64 } from '../../utils/to-base64';

import { Media, getDefaultSearchQuery } from './manual-search.helpers';
import { JackettResultsTable } from './jackett-results-table';

function mediaToEntertainment(media: Media): Entertainment {
  return media.__typename === 'EnrichedMovie'
    ? Entertainment.Movie
    : Entertainment.TvShow;
}

interface ManualSearchProps {
  media: Media;
  refetchQueries?: PureQueryOptions[];
  onRequestClose: () => void;
}

export function ManualSearchComponent(props: ManualSearchProps) {
  const [isUploadTorrentLoading, setUploadTorrentLoading] = useState(false);
  const $fileInput = useRef<HTMLInputElement>(null);

  const defaultSearchQuery = getDefaultSearchQuery(props.media);
  const [searchQuery, setSearchQuery] = useState(
    defaultSearchQuery.toLowerCase()
  );

  const handleClose = () => {
    props.onRequestClose();
  };

  const { data: qualityData } = useGetQualityQuery({
    variables: { type: mediaToEntertainment(props.media) },
  });
  const qualities = qualityData?.qualities || [];
  const [quality, setQuality] = useState<string>('');

  const [search, { data, loading }] = useSearchTorrentLazyQuery({
    variables: { query: searchQuery },
  });

  const [downloadOwnTorrent] = useDownloadOwnTorrentMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetLibraryTvShowsDocument },
      { query: GetDownloadingDocument },
      { query: GetMissingDocument },
      ...(props.refetchQueries || []),
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => {
      handleClose();
      toast.success('Download episode started');
    },
  });

  const handleUploadTorrent = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUploadTorrentLoading(true);
    const file = event.currentTarget.files?.item(0);

    if (file && props.media.id) {
      const base64 = await toBase64(file);
      await downloadOwnTorrent({
        variables: {
          mediaId: props.media.id,
          mediaType:
            props.media.__typename === 'EnrichedTVEpisode'
              ? FileType.Episode
              : FileType.Movie,
          torrent: base64,
        },
      });
    }

    setUploadTorrentLoading(false);
  };

  const handlePasteMagnetLink = async () => {
    setUploadTorrentLoading(true);

    const magnetLink = await navigator.clipboard.readText();

    if (typeof magnetLink !== 'string' || !magnetLink.startsWith('magnet:')) {
      setUploadTorrentLoading(false);
      return toast.error('You dont have a magnet link in your clipboard to paste');
    }

    if (props.media.id) {
      await downloadOwnTorrent({
        variables: {
          mediaId: props.media.id,
          mediaType:
            props.media.__typename === 'EnrichedTVEpisode'
              ? FileType.Episode
              : FileType.Movie,
          torrent: magnetLink,
        },
      });
    }

    return setUploadTorrentLoading(false);
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    search({
      variables: {
        query: searchQuery,
        quality: quality || undefined,
      },
    });
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-4xl">
        <input
          ref={$fileInput}
          type="file"
          accept=".torrent"
          className="hidden"
          onChange={handleUploadTorrent}
        />
        <DialogHeader>
          <DialogTitle>{defaultSearchQuery}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <Input
              value={searchQuery}
              onChange={({ target }) => setSearchQuery(target.value)}
            />
            <Button type="submit" variant="outline" className="shrink-0">
              <Search />
            </Button>
          </form>
          {qualities.length > 0 && (
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="w-[180px] shrink-0">
                <SelectValue placeholder="Any quality" />
              </SelectTrigger>
              <SelectContent>
                {qualities.map((q) => (
                  <SelectItem key={q.id} value={q.name}>
                    {q.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={() => $fileInput.current?.click()}
            disabled={isUploadTorrentLoading}
            className="shrink-0"
          >
            {isUploadTorrentLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FolderOpen />
            )}
            Select own .torrent
          </Button>
          <Button onClick={handlePasteMagnetLink} className="shrink-0">
            Paste magnet link
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <JackettResultsTable
            media={props.media}
            results={data?.results || []}
            refetchQueries={props.refetchQueries}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
