import React, { useState, useEffect } from 'react';
import { orderBy, last } from 'lodash';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { createSearchFunction } from '../../utils/create-search-function';

interface UseSortableProps<TEntity> {
  searchableAttributes: string[];
  sortAttributes: Array<{ label: string; key: string }>;
  rows?: TEntity[];
}

export function useSortable<TEntity>(props: UseSortableProps<TEntity>) {
  const { searchableAttributes, sortAttributes, rows } = props;

  const [results, setResults] = useState(rows || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderByAttribute, setOrderByAttribute] = useState(
    `${last(sortAttributes)!.key}:desc`
  );

  const [key, order] = orderByAttribute.split(':') as [string, 'desc' | 'asc'];
  const handleSort = (newSort: { label: string; key: string }) => {
    if (newSort.key === key) {
      return setOrderByAttribute(
        order === 'asc' ? `${newSort.key}:desc` : `${newSort.key}:asc`
      );
    }
    return setOrderByAttribute(`${newSort.key}:desc`);
  };

  useEffect(() => {
    const searchFn = createSearchFunction(searchableAttributes, searchQuery);
    const filteredAndOrdered = orderBy(rows, [key], [order]).filter((row) =>
      searchQuery.trim() && searchQuery.trim().length >= 3
        ? searchFn(row)
        : true
    );
    setResults(filteredAndOrdered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchQuery, orderByAttribute]);

  const renderSortable = () => (
    <>
      <div className="mb-6 flex items-center">
        <div className="flex items-center gap-2">
          {sortAttributes.map((sortAttr) => (
            <Button
              key={sortAttr.key}
              variant={sortAttr.key === key ? 'default' : 'outline'}
              onClick={() => handleSort(sortAttr)}
            >
              {getSortIcon({
                forKey: sortAttr.key,
                activeKey: key,
                activeOrder: order,
              })}
              {sortAttr.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto w-[300px]">
          <Input
            value={searchQuery}
            placeholder="Search..."
            onChange={({ target }) => setSearchQuery(target.value)}
          />
        </div>
      </div>
      {searchQuery && results.length === 0 && (
        <div className="mt-16 text-center text-muted-foreground">
          No search results for &quot;{searchQuery}&quot;
        </div>
      )}
    </>
  );

  return { renderSortable, results };
}

function getSortIcon({
  forKey,
  activeKey,
  activeOrder,
}: {
  forKey: string;
  activeKey: string;
  activeOrder: string;
}) {
  if (activeKey === forKey) {
    return activeOrder === 'asc' ? <ArrowDown /> : <ArrowUp />;
  }

  return undefined;
}
