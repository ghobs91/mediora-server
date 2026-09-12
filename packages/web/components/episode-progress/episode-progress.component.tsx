import React from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EpisodeProgressComponent({
  downloaded,
  total,
}: {
  downloaded: number;
  total: number;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white',
      )}
    >
      <Download size={12} />
      <span>
        {downloaded}/{total}
      </span>
    </div>
  );
}
