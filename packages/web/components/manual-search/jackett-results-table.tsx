import React from 'react';
import dayjs from 'dayjs';
import { pick } from 'lodash';
import { PureQueryOptions } from '@apollo/client';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  JackettFormattedResult,
  useDownloadMovieMutation,
  GetLibraryMoviesDocument,
  GetDownloadingDocument,
  GetMissingDocument,
  useDownloadTvEpisodeMutation,
  GetLibraryTvShowsDocument,
  useDownloadSeasonMutation,
} from '../../utils/graphql';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatBytes } from '@/utils/format-bytes';

import { Media } from './manual-search.helpers';

interface JackettResultTableProps {
  refetchQueries?: PureQueryOptions[];
  results: JackettFormattedResult[];
  media: Media;
}

export function JackettResultsTable({
  media,
  refetchQueries,
  results,
}: JackettResultTableProps) {
  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[75px]">Age</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[80px]">Size</TableHead>
            <TableHead className="w-[100px]">Peers</TableHead>
            <TableHead className="w-[80px]">Quality</TableHead>
            <TableHead className="w-[35px]">
              <Download className="h-4 w-4" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                {Math.abs(dayjs(row.publishDate).diff(new Date(), 'day'))} days
              </TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block max-w-md truncate">{row.title}</span>
                  </TooltipTrigger>
                  <TooltipContent>{row.title}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>{formatBytes(row.size)}</TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Badge
                        variant={row.seeders > row.peers ? 'default' : 'outline'}
                        className={
                          row.seeders > row.peers
                            ? 'bg-green-600 text-white'
                            : undefined
                        }
                      >
                        {row.seeders} / {row.peers}
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {row.seeders} seeders, {row.peers} leechers
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{row.quality}</Badge>
              </TableCell>
              <TableCell>
                <ManualDownloadMedia
                  jackettResult={row}
                  media={media}
                  refetchQueries={refetchQueries || []}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

function ManualDownloadMedia({
  media,
  jackettResult,
  refetchQueries,
}: {
  media: Media;
  jackettResult: JackettFormattedResult;
  refetchQueries: PureQueryOptions[];
}) {
  const jackettInput = pick(jackettResult, [
    'title',
    'downloadLink',
    'quality',
    'tag',
  ]);

  const [downloadMovie, { loading: loading1 }] = useDownloadMovieMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetLibraryMoviesDocument },
      { query: GetDownloadingDocument },
      { query: GetMissingDocument },
      ...refetchQueries,
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Download movie started'),
  });

  const [
    downloadTVEpisode,
    { loading: loading2 },
  ] = useDownloadTvEpisodeMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetLibraryTvShowsDocument },
      { query: GetDownloadingDocument },
      { query: GetMissingDocument },
      ...refetchQueries,
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Download episode started'),
  });

  const [downloadTVSeason, { loading: loading3 }] = useDownloadSeasonMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetLibraryTvShowsDocument },
      { query: GetDownloadingDocument },
      { query: GetMissingDocument },
      ...refetchQueries,
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Download episode started'),
  });

  const handleClick = () => {
    if (media.__typename === 'EnrichedMovie') {
      downloadMovie({
        variables: {
          movieId: media.id!,
          jackettResult: jackettInput,
        },
      });
    }

    if (media.__typename === 'EnrichedTVEpisode') {
      downloadTVEpisode({
        variables: {
          episodeId: media.id!,
          jackettResult: jackettInput,
        },
      });
    }

    if (media.__typename === 'TMDBFormattedTVSeason') {
      downloadTVSeason({
        variables: {
          tvShowTMDBId: media.tvShowTMDBId!,
          seasonNumber: media.seasonNumber!,
          jackettResult: jackettInput,
        },
      });
    }
  };

  return loading1 || loading2 || loading3 ? (
    <Loader2 className="animate-spin" />
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleClick}>
          <Download />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{jackettResult.link}</TooltipContent>
    </Tooltip>
  );
}
