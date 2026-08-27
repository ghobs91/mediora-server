import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { orderBy } from 'lodash';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
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
  useGetTagsQuery,
  useSaveTagsMutation,
  GetTagsDocument,
} from '../../utils/graphql';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { reorder } from './settings.helpers';

interface PartialTag {
  id?: number;
  name: string;
  score: number;
}

function SortableTag({ tag }: { tag: PartialTag }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: tag.name });

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
        'mb-1 flex cursor-grab items-center rounded-md border border-dashed border-border px-3 py-1.5 text-sm',
        isDragging && 'opacity-50'
      )}
    >
      {isDragging && !isOver && (
        <Trash2 className="mr-3 h-4 w-4 text-destructive" />
      )}
      {tag.name}
    </div>
  );
}

export function TagsComponent() {
  const [tags, setTags] = useState<PartialTag[]>([]);
  const [addValue, setAddValue] = useState('');

  const { data, loading } = useGetTagsQuery();
  const [saveTags, { loading: saveLoading }] = useSaveTagsMutation({
    awaitRefetchQueries: true,
    refetchQueries: [{ query: GetTagsDocument }],
    onError: ({ message }) =>
      toast.error(message.replace('GraphQL error: ', '')),
    onCompleted: () => toast.success('Tags saved'),
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      // dropped outside the list → delete tag
      setTags(tags.filter((tag) => tag.name !== active.id));
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = tags.findIndex((tag) => tag.name === active.id);
      const newIndex = tags.findIndex((tag) => tag.name === over.id);
      setTags(
        reorder<PartialTag>({
          list: tags,
          startIndex: oldIndex,
          endIndex: newIndex,
        })
      );
    }
  };

  const handleAddSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addValue && addValue.trim() && addValue.length > 1) {
      const nextTags = [
        ...tags,
        { name: addValue, score: 0 },
      ].map((tag, index) => ({ ...tag, score: tags.length + 1 - index }));

      setTags(orderBy(nextTags, ['score'], ['desc']));
      setAddValue('');
    }
  };

  const handleSave = async () => {
    await saveTags({
      variables: {
        tags: tags.map((tag) => ({ name: tag.name, score: tag.score })),
      },
    });
  };

  useEffect(() => {
    if (data?.tags) setTags(data.tags);
  }, [data]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Tags whitelist
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 cursor-pointer text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Only search results with one of those tags will be downloaded.
                <br />
                You can re-order tags in order of preference.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tags.map((tag) => tag.name)}
                strategy={verticalListSortingStrategy}
              >
                {tags.map((tag) => (
                  <SortableTag key={tag.name} tag={tag} />
                ))}
              </SortableContext>
            </DndContext>
            <form onSubmit={handleAddSubmit} className="mt-2 flex gap-2">
              <Input
                type="text"
                value={addValue}
                onChange={({ target }) => setAddValue(target.value)}
              />
              <Button type="submit" className="w-20 shrink-0">
                <Plus />
              </Button>
            </form>
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
