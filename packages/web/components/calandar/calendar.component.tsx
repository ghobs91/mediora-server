import React, { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useGetCalendarQuery } from '../../utils/graphql';
import { formatNumber } from '../../utils/format-number';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarComponent() {
  const { data, loading, error } = useGetCalendarQuery();
  const [currentMonth, setCurrentMonth] = useState(() =>
    dayjs().startOf('month')
  );

  const startOfMonth = currentMonth.startOf('month');
  const daysInMonth = currentMonth.daysInMonth();
  const startDay = startOfMonth.day(); // 0 = Sunday

  const cells: Array<number | null> = [
    ...Array.from({ length: startDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getMediaForDate = (day: number) => {
    const formattedDate = currentMonth.date(day).format('YYYY-MM-DD');

    const movies =
      data?.calendar?.movies?.filter(
        (movie) => formattedDate === movie.releaseDate
      ) || [];

    const tvEpisodes =
      data?.calendar?.tvEpisodes.filter(
        (tvEpisode) => formattedDate === tvEpisode.releaseDate
      ) || [];

    return [...movies, ...tvEpisodes];
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-10">
      {error && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive-foreground">
          <pre>{JSON.stringify(error, null, 4)}</pre>
        </div>
      )}

      {loading && (
        <div className="mb-4 rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          Don&apos;t worry it might take some time on first load
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="aspect-square bg-card p-2">
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() =>
                setCurrentMonth(currentMonth.subtract(1, 'month'))
              }
            >
              <ChevronLeft />
            </Button>
            <div className="text-lg font-medium">
              {currentMonth.format('MMMM YYYY')}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="grid grid-cols-7">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="border-b border-border p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, index) => (
              <div
                key={index}
                className="min-h-[100px] border-b border-r border-border p-2 text-sm"
              >
                {day && (
                  <>
                    <div className="text-muted-foreground">{day}</div>
                    <div className="mt-1 flex flex-col gap-1">
                      {getMediaForDate(day).map((media) => (
                        <span
                          key={(media.__typename || '') + media.id}
                          className="truncate rounded-md bg-secondary px-1.5 py-0.5 text-[0.75em] text-secondary-foreground"
                        >
                          {media.__typename === 'EnrichedMovie' && media.title}
                          {media.__typename === 'EnrichedTVEpisode' &&
                            `${media.tvShow.title} - S${formatNumber(
                              media.seasonNumber
                            )}E${formatNumber(media.episodeNumber)}`}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
