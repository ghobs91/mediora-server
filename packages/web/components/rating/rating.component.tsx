import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RatingComponent({ rating }: { rating: number }) {
  const rounded = Math.round(rating);

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white'
      )}
    >
      <Star size={12} className="fill-yellow-400 text-yellow-400" />
      <span>{rounded}%</span>
    </div>
  );
}
