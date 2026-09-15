import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { GripVertical, HelpCircle, Plus, Trash2 } from 'lucide-react';
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
  useSaveQualityMutation,
  GetQualityDocument,
  Entertainment,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

interface QualityRow {
  uid: string;
  id?: number;
  name: string;
  match: string;
  maxSizeGb: string;
}

const GIGABYTE = 1e9;

let rowCounter = 0;
const nextUid = () => `quality-${(rowCounter += 1)}`;

function parseMatch(match: string[]) {
  return match.join(', ');
}

function toRow(quality: {
  id: number;
  name: string;
  match: string[];
  maxSize?: number | null;
}): QualityRow {
  return {
    uid: `quality-${quality.id}`,
    id: quality.id,
    name: quality.name,
    match: parseMatch(quality.match),
    maxSizeGb: quality.maxSize ? String(quality.maxSize / GIGABYTE) : '',
  };
}

function SortableQuality({
  quality,
  onChange,
  onRemove,
}: {
  quality: QualityRow;
  onChange: (uid: string, patch: Partial<QualityRow>) => void;
  onRemove: (uid: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quality.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'mb-2 rounded-md border border-dashed border-border p-2',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground"
          aria-label="Reorder quality"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Input
          value={quality.name}
          placeholder="Name (e.g. 1080p x265)"
          onChange={({ target }) =>
            onChange(quality.uid, { name: target.value })
          }
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-destructive"
          onClick={() => onRemove(quality.uid)}
          aria-label="Remove quality"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Input
        className="mt-2"
        value={quality.match}
        placeholder="Keywords (e.g. 1080p x265, 1080p hevc)"
        onChange={({ target }) =>
          onChange(quality.uid, { match: target.value })
        }
      />
      <div className="mt-2 flex items-center gap-2">
        <Input
          className="w-28"
          value={quality.maxSizeGb}
          inputMode="decimal"
          placeholder="No cap"
          onChange={({ target }) =>
            onChange(quality.uid, { maxSizeGb: target.value })
          }
        />
        <span className="text-xs text-muted-foreground">
          GB max size for this quality
        </span>
      </div>
    </div>
  );
}

export function QualityParamsComponent() {
  const [qualities, setQualities] = useState<QualityRow[]>([]);
  const [type, setType] = useState<Entertainment>(Entertainment.Movie);
  const { data, loading } = useGetQualityQuery({
    variables: { type },
  });
  const [saveQuality, { loading: saveLoading }] = useSaveQualityMutation({
    awaitRefetchQueries: true,
    refetchQueries: [{ query: GetQualityDocument, variables: { type } }],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Quality params saved'),
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = qualities.findIndex((q) => q.uid === active.id);
      const newIndex = qualities.findIndex((q) => q.uid === over.id);
      setQualities(
        reorder<QualityRow>({
          list: qualities,
          startIndex: oldIndex,
          endIndex: newIndex,
        })
      );
    }
  };

  const handleChange = (uid: string, patch: Partial<QualityRow>) => {
    setQualities((prev) =>
      prev.map((quality) =>
        quality.uid === uid ? { ...quality, ...patch } : quality
      )
    );
  };

  const handleRemove = (uid: string) => {
    setQualities((prev) => prev.filter((quality) => quality.uid !== uid));
  };

  const handleAdd = () => {
    setQualities((prev) => [
      ...prev,
      { uid: nextUid(), name: '', match: '', maxSizeGb: '' },
    ]);
  };

  const handleSave = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const payload = qualities
      .map((quality) => ({
        id: quality.id,
        name: quality.name.trim(),
        match: quality.match
          .split(',')
          .map((group) => group.trim())
          .filter(Boolean),
        maxSize: quality.maxSizeGb
          ? Number(quality.maxSizeGb) * GIGABYTE
          : undefined,
      }))
      .filter((quality) => quality.name.length > 0 && quality.match.length > 0);

    if (payload.length !== qualities.length) {
      toast.error('Every quality needs a name and at least one keyword');
      return;
    }

    saveQuality({
      variables: {
        type,
        qualities: payload.map((quality, index) => ({
          ...quality,
          score: payload.length - index,
        })),
      },
    });
  };

  useEffect(() => {
    if (data?.qualities) setQualities(data.qualities.map(toRow));
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
              <TooltipContent className="max-w-xs">
                Drag to set priority: the top match wins automatic downloads,
                seeders only break ties. Keywords are comma separated groups and
                match when every word appears, so
                <br />
                <code>1080p x265, 1080p hevc</code>
                <br />
                prefers x265/HEVC 1080p releases over x264 ones.
              </TooltipContent>
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
                items={qualities.map((q) => q.uid)}
                strategy={verticalListSortingStrategy}
              >
                {qualities.map((quality) => (
                  <SortableQuality
                    key={quality.uid}
                    quality={quality}
                    onChange={handleChange}
                    onRemove={handleRemove}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4" />
                Add quality
              </Button>
            </div>
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
