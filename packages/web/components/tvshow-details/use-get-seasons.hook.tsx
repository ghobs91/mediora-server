import { orderBy } from 'lodash';
import { toast } from 'sonner';

import {
  useGetTvShowSeasonsQuery,
  useTrackTvShowMutation,
  useRemoveTvShowMutation,
  GetLibraryTvShowsDocument,
  GetTvShowSeasonsDocument,
  GetDownloadingDocument,
  TmdbFormattedTvSeason,
} from '../../utils/graphql';

export function useGetSeasons({ tmdbId }: { tmdbId: number }) {
  const { data, loading } = useGetTvShowSeasonsQuery({
    variables: { tvShowTMDBId: tmdbId },
  });

  const [trackTVShow, { loading: mutationLoading }] = useTrackTvShowMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetDownloadingDocument },
      { query: GetLibraryTvShowsDocument },
      {
        query: GetTvShowSeasonsDocument,
        variables: { tvShowTMDBId: tmdbId },
      },
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Episodes sent to download'),
  });

  const [removeTVShow] = useRemoveTvShowMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: GetDownloadingDocument },
      { query: GetLibraryTvShowsDocument },
      {
        query: GetTvShowSeasonsDocument,
        variables: { tvShowTMDBId: tmdbId },
      },
    ],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('TVShow removed from library'),
  });

  const seasons = (
    orderBy(data?.seasons, ['seasonNumber'], ['desc']) as TmdbFormattedTvSeason[]
  ).filter((season) => season.seasonNumber !== 0);

  return { seasons, loading, trackTVShow, mutationLoading, removeTVShow };
}
