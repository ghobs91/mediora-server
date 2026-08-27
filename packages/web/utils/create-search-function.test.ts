import { describe, expect, it } from 'vitest';
import { createSearchFunction } from './create-search-function';

const movies = [
  { title: 'Alien', year: 1979 },
  { title: 'Aliens', year: 1986 },
  { title: 'Interstellar', year: 2014 },
];

describe('createSearchFunction', () => {
  it('matches a single field case-insensitively', () => {
    const search = createSearchFunction(['title'], 'alien');
    expect(movies.filter(search)).toEqual([movies[0], movies[1]]);
  });

  it('matches nested paths', () => {
    const rows = [{ user: { name: 'John Doe' } }, { user: { name: 'Jane' } }];
    const search = createSearchFunction(['user.name'], 'jane');
    expect(rows.filter(search)).toEqual([rows[1]]);
  });

  it('is accent-insensitive', () => {
    const rows = [{ title: 'Armée des ombres' }];
    const search = createSearchFunction(['title'], 'armee');
    expect(rows.filter(search)).toEqual(rows);
  });

  it('matches any of the given fields', () => {
    const search = createSearchFunction(['title', 'year'], '1986');
    expect(movies.filter(search)).toEqual([movies[1]]);
  });

  it('matches partial values', () => {
    const search = createSearchFunction(['title'], 'inter');
    expect(movies.filter(search)).toEqual([movies[2]]);
  });

  it('tolerates missing paths', () => {
    const rows = [{ title: 'Alien' }];
    const search = createSearchFunction(['user.name'], 'alien');
    expect(rows.filter(search)).toEqual([]);
  });
});
