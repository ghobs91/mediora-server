import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  useGetQualityQuery,
  Quality,
  useSaveQualityMutation,
  Entertainment,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { reorder } from './settings.helpers';

function SortableQuality({ quality }: { quality: Quality }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quality.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'mb-1 cursor-grab rounded-md border border-dashed border-border px-3 py-1.5 text-sm',
        isDragging && 'opacity-50'
      )}
    >
      {quality.name}
    </div>
  );
}

export function QualityParamsComponent() {
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [type, setType] = useState<Entertainment>(Entertainment.Movie);
  const { data, loading } = useGetQualityQuery({
    variables: { type },
  });
  const [saveQuality, { loading: saveLoading }] = useSaveQualityMutation({
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Quality params saved'),
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = qualities.findIndex((q) => q.id === active.id);
      const newIndex = qualities.findIndex((q) => q.id === over.id);
      setQualities(
        reorder<Quality>({
          list: qualities,
          startIndex: oldIndex,
          endIndex: newIndex,
        })
      );
    }
  };

  const handleSave = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    saveQuality({
      variables: {
        qualities: qualities.map((q) => ({ id: q.id, score: q.score })),
      },
    });
  };

  useEffect(() => {
    if (data?.qualities) setQualities(data.qualities);
  }, [data]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Quality preference
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 cursor-pointer text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Drag and drop to re-order the list</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !qualities?.length ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <Select
              value={type}
              onValueChange={(value) => setType(value as Entertainment)}
            >
              <SelectTrigger className="mb-5 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Entertainment.Movie}>
                  {Entertainment.Movie}
                </SelectItem>
                <SelectItem value={Entertainment.TvShow}>TV Show</SelectItem>
              </SelectContent>
            </Select>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={qualities.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {qualities.map((quality) => (
                  <SortableQuality key={quality.id} quality={quality} />
                ))}
              </SortableContext>
            </DndContext>
            <Button
              className="mt-3 w-full"
              onClick={handleSave}
              disabled={saveLoading}
            >
              Save
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
