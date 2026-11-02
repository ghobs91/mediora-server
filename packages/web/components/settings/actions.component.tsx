import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  useStartScanLibraryMutation,
  useStartFindNewEpisodesMutation,
  useStartDownloadMissingMutation,
  useReorganizeLibraryMutation,
  useResetLibraryMutation,
  useClearCacheMutation,
  useGetParamsQuery,
  useStartReplaceH264JobMutation,
  useStartReplaceForeignAudioJobMutation,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function ActionsComponents() {
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [resetSettings, setResetSettings] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetInfoOpen, setResetInfoOpen] = useState(false);
  const [cacheInfoOpen, setCacheInfoOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [foreignOpen, setForeignOpen] = useState(false);

  const { data: paramsData } = useGetParamsQuery();
  const ignoreH264 = paramsData?.params?.ignore_h264_releases === 'true';
  const requireEnglishAudio =
    paramsData?.params?.require_english_audio === 'true';

  const [findEpisodes, { loading: loading1 }] = useStartFindNewEpisodesMutation(
    {
      onCompleted: () => toast.success('Find new episodes job started'),
    }
  );

  const [scanLibrary, { loading: loading2 }] = useStartScanLibraryMutation({
    onCompleted: () => toast.success('Scan library folder started'),
  });

  const [
    downloadMissing,
    { loading: loading3 },
  ] = useStartDownloadMissingMutation({
    onCompleted: () => toast.success('Download missing files started'),
  });

  const [
    reorganizeLibrary,
    { loading: loading5 },
  ] = useReorganizeLibraryMutation({
    onCompleted: () => toast.success('Library repair started'),
  });

  const [resetLibrary] = useResetLibraryMutation({
    onCompleted: () => setResetInfoOpen(true),
  });

  const [clearCache, { loading: loading4 }] = useClearCacheMutation({
    onCompleted: () => setCacheInfoOpen(true),
  });

  const [
    replaceH264,
    { loading: loading6 },
  ] = useStartReplaceH264JobMutation({
    onCompleted: () => toast.success('Replace h/x264 media job started'),
  });

  const [
    replaceForeignAudio,
    { loading: loading7 },
  ] = useStartReplaceForeignAudioJobMutation({
    onCompleted: () => toast.success('Replace foreign-audio media job started'),
  });

  const jobLoading =
    loading1 || loading2 || loading3 || loading5 || loading6 || loading7;

  function handleResetClick() {
    setDeleteFiles(false);
    setResetSettings(false);
    setConfirmOpen(true);
  }

  function handleResetConfirm() {
    setConfirmOpen(false);
    resetLibrary({ variables: { deleteFiles, resetSettings } });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button size="lg" onClick={() => scanLibrary()} disabled={jobLoading}>
            {jobLoading && <Loader2 className="animate-spin" />}
            Scan library folder
          </Button>
          <Button
            size="lg"
            onClick={() => findEpisodes()}
            disabled={jobLoading}
          >
            {jobLoading && <Loader2 className="animate-spin" />}
            Find new episodes
          </Button>
          <Button
            size="lg"
            onClick={() => downloadMissing()}
            disabled={jobLoading}
          >
            {jobLoading && <Loader2 className="animate-spin" />}
            Download missing files
          </Button>
          {ignoreH264 && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setReplaceOpen(true)}
              disabled={jobLoading}
            >
              {loading6 && <Loader2 className="animate-spin" />}
              Replace h/x264 media
            </Button>
          )}
          {requireEnglishAudio && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setForeignOpen(true)}
              disabled={jobLoading}
            >
              {loading7 && <Loader2 className="animate-spin" />}
              Replace foreign-audio media
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => reorganizeLibrary()}
            disabled={jobLoading}
          >
            {jobLoading && <Loader2 className="animate-spin" />}
            Library repair
          </Button>
          <Button size="lg" onClick={() => clearCache()} disabled={loading4}>
            {loading4 && <Loader2 className="animate-spin" />}
            Clear cache
          </Button>
          <Button size="lg" variant="destructive" onClick={handleResetClick}>
            Reset mediora-server
          </Button>
        </CardContent>
      </Card>

      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace h/x264 media?</DialogTitle>
            <DialogDescription>
              Scans processed movies and episodes for H.264 files. A file is
              only replaced when a smaller x265/HEVC release is available; the
              old file is removed when that replacement download starts. Media
              without a smaller x265 release is left untouched. Up to 25 items
              are processed per run — run it again for the next batch.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setReplaceOpen(false);
                replaceH264();
              }}
            >
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={foreignOpen} onOpenChange={setForeignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace foreign-audio media?</DialogTitle>
            <DialogDescription>
              Scans processed movies and episodes, reading audio stream tags and
              the embedded release title. Only positively foreign-audio files
              are replaced; untagged or unknown audio is left untouched. The old
              file is removed when an English replacement download starts. Up to
              25 items are processed per run.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForeignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setForeignOpen(false);
                replaceForeignAudio();
              }}
            >
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Warning</DialogTitle>
            <DialogDescription>
              This will remove everything from mediora-server database and it will
              re-scan your library folder.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="delete-files"
                checked={deleteFiles}
                onCheckedChange={(checked) => setDeleteFiles(checked === true)}
              />
              <Label htmlFor="delete-files" className="font-normal">
                Delete files downloaded from disk with mediora-server (permanent)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="reset-settings"
                checked={resetSettings}
                onCheckedChange={(checked) =>
                  setResetSettings(checked === true)
                }
              />
              <Label htmlFor="reset-settings" className="font-normal">
                Reset settings
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetConfirm}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReloadInfoDialog
        open={resetInfoOpen}
        onOpenChange={setResetInfoOpen}
        title="Reset succesfull!"
      />
      <ReloadInfoDialog
        open={cacheInfoOpen}
        onOpenChange={setCacheInfoOpen}
        title="Cache cleared correctly!"
      />
    </>
  );
}

function ReloadInfoDialog({
  open,
  onOpenChange,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>The page will now reload</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => window.location.reload()}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
