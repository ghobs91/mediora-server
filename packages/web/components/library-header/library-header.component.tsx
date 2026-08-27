import React from 'react';

import { MissingComponent } from '../missing/missing.component';
import { DownloadingComponent } from '../downloading/downloading.component';

export function LibraryHeaderComponent({ types }: { types: string[] }) {
  return (
    <div className="border-b border-border bg-secondary/50 py-6">
      <DownloadingComponent types={types} />
      <MissingComponent />
    </div>
  );
}
