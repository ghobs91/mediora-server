import React from 'react';
import { cn } from '@/lib/utils';

export function RatingComponent({ rating }: { rating: number }) {
  const isGreen = rating >= 70;

  return (
    <div className="relative h-[38px] w-[38px] text-white">
      <div
        className={cn(
          'h-full w-full rounded-full',
          isGreen ? 'bg-[#21d07a]' : 'bg-[#d2d531]'
        )}
      />
      <div className="absolute left-[2px] top-[2px] h-[34px] w-[34px] rounded-full bg-background" />
      <div className="absolute inset-0 flex items-center justify-center text-[11px]">
        {rating}%
      </div>
    </div>
  );
}
