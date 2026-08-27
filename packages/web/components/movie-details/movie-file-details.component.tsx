import React from 'react';

import { formatBytes } from '@/utils/format-bytes';

import { useGetMovieFileDetailsQuery } from '../../utils/graphql';

export function MovieFileDetailsComponent({ tmdbId }: { tmdbId: number }) {
  const { data } = useGetMovieFileDetailsQuery({
    pollInterval: 5000,
    variables: { tmdbId },
  });

  return (
    <ul className="mt-3">
      <li className="max-w-[570px] overflow-hidden text-ellipsis whitespace-nowrap">
        <strong className="font-bold">Library path:</strong>
        <em className="ml-2 font-mono">{data?.details?.libraryPath}</em>
      </li>
      {data?.details?.torrentFileName && (
        <>
          <li className="max-w-[570px] overflow-hidden text-ellipsis whitespace-nowrap">
            <strong className="font-bold">Torrent name:</strong>
            <em className="ml-2 font-mono">{data?.details?.torrentFileName}</em>
          </li>
          <li className="max-w-[570px] overflow-hidden text-ellipsis whitespace-nowrap">
            <strong className="font-bold">Torrent size:</strong>
            <em className="ml-2 font-mono">
              {formatBytes(data?.details?.libraryFileSize)}
            </em>
          </li>
        </>
      )}
    </ul>
  );
}
