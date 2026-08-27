import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Folder, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import {
  GetLibraryFoldersDocument,
  LibraryFolderState,
  LibraryFolderStatus,
  useGetLibraryFoldersQuery,
  useUpdateLibraryFoldersMutation,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LibraryFoldersComponent() {
  const { data, loading, error, refetch } = useGetLibraryFoldersQuery();
  const [moviesFolderName, setMoviesFolderName] = useState('movies');
  const [tvShowsFolderName, setTvShowsFolderName] = useState('tvshows');
  const [updateFolders, { loading: saving }] = useUpdateLibraryFoldersMutation({
    awaitRefetchQueries: true,
    refetchQueries: [{ query: GetLibraryFoldersDocument }],
    onCompleted: () => toast.success('Library folders updated'),
    onError: ({ message }) => toast.error(message.replace('GraphQL error: ', '')),
  });

  useEffect(() => {
    const folders = data?.libraryFolders.folders || [];
    const movies = folders.find((folder) => folder.type === 'movies');
    const tvShows = folders.find((folder) => folder.type === 'tvshows');
    if (movies) setMoviesFolderName(movies.name);
    if (tvShows) setTvShowsFolderName(tvShows.name);
  }, [data]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const movies = moviesFolderName.trim();
    const tvShows = tvShowsFolderName.trim();

    if (!isFolderName(movies) || !isFolderName(tvShows)) {
      toast.error('Use folder names inside the mounted library, not full paths.');
      return;
    }
    if (movies === tvShows) {
      toast.error('Movies and TV shows must use different folders.');
      return;
    }

    await updateFolders({
      variables: { moviesFolderName: movies, tvShowsFolderName: tvShows },
    });
  };

  const folders = data?.libraryFolders.folders || [];
  const movies = folders.find((folder) => folder.type === 'movies');
  const tvShows = folders.find((folder) => folder.type === 'tvshows');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Library folders
            </CardTitle>
            <CardDescription className="mt-2 max-w-lg">
              Pick folders inside the Docker library mount. Bobarr checks the
              actual container user, so permission problems are explained here
              instead of appearing later as failed scans.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={loading}
            aria-label="Refresh library permissions"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-movies-folder">Movies folder</Label>
              <Input
                id="settings-movies-folder"
                value={moviesFolderName}
                onChange={({ target }) => setMoviesFolderName(target.value)}
                placeholder="movies"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-tvshows-folder">TV shows folder</Label>
              <Input
                id="settings-tvshows-folder"
                value={tvShowsFolderName}
                onChange={({ target }) => setTvShowsFolderName(target.value)}
                placeholder="tvshows"
              />
            </div>
          </div>
          <Button type="submit" disabled={saving || loading}>
            {saving && <Loader2 className="animate-spin" />}
            Save folders
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {data && (
          <div className="space-y-2">
            <FolderStatus label="Docker library mount" folder={data.libraryFolders.mount} />
            {movies && <FolderStatus label="Movies" folder={movies} />}
            {tvShows && <FolderStatus label="TV shows" folder={tvShows} />}
          </div>
        )}

        {data && (
          <p className="text-xs leading-5 text-muted-foreground">
            API identity: UID {data.libraryFolders.processUid ?? 'unknown'}, GID{' '}
            {data.libraryFolders.processGid ?? 'unknown'}
            {data.libraryFolders.processRunsAsRoot &&
              ' (root; set PUID and PGID to avoid mismatched shared-file ownership)'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function isFolderName(value: string) {
  return Boolean(
    value &&
      value.length <= 255 &&
      value !== '.' &&
      value !== '..' &&
      !value.includes('/') &&
      !value.includes('\\')
  );
}

function FolderStatus({
  label,
  folder,
}: {
  label: string;
  folder: LibraryFolderStatus;
}) {
  const ready = folder.state === LibraryFolderState.Ready;

  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        ready
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-primary/30 bg-primary/10'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {ready ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        ) : (
          <AlertCircle className="h-4 w-4 text-primary" />
        )}
        <span>{label}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {ready ? 'Ready' : 'Needs attention'}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <code>{folder.path}</code> - {folder.message}
      </p>
      {folder.mode && (
        <p className="mt-1 text-xs text-muted-foreground">
          Mode {folder.mode}, owner UID {folder.ownerUid ?? 'unknown'} / GID{' '}
          {folder.ownerGid ?? 'unknown'}
        </p>
      )}
      {folder.remedy && <p className="mt-1 text-xs text-primary">{folder.remedy}</p>}
    </div>
  );
}
