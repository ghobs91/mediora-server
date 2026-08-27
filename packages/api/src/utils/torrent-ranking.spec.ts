import fc from 'fast-check';

import {
  formatSearchResult,
  isDownloadable,
  parseQuality,
  parseTag,
  sortByBest,
  RankedResult,
} from './torrent-ranking';

import { JackettResult } from 'src/modules/jackett/jackett.dto';
import { Quality } from 'src/entities/quality.entity';
import { Tag } from 'src/entities/tag.entity';

const makeTag = (name: string, score: number) =>
  ({ name, score } as unknown as Tag);

const makeQuality = (name: string, match: string[], score: number) =>
  ({ name, match, score } as unknown as Quality);

const makeResult = (
  title: string,
  overrides: Partial<JackettResult> = {}
) =>
  ({
    FirstSeen: '2021-01-01',
    Tracker: 'tracker',
    TrackerId: 'id',
    CategoryDesc: 'Movies',
    Title: title,
    Guid: 'guid',
    Link: 'http://example.com/file.torrent',
    Comments: '',
    PublishDate: '2021-01-01',
    Category: [2000],
    Size: 1000,
    Grabs: 0,
    Seeders: 10,
    Peers: 0,
    MinimumRatio: 1,
    MinimumSeedTime: 0,
    DownloadVolumeFactor: 0,
    UploadVolumeFactor: 1,
    ...overrides,
  } as JackettResult);

describe('parseTag', () => {
  it('matches an exact tag word in the title', () => {
    const tags = [makeTag('multi', 3), makeTag('vostfr', 5)];
    expect(parseTag(['movie', '2020', 'multi', '1080p'], tags)).toEqual({
      label: 'multi',
      score: 3,
    });
  });

  it('prefers the first tag in preference order when several match', () => {
    const tags = [makeTag('multi', 10), makeTag('1080p', 1)];
    expect(parseTag(['movie', '1080p', 'multi'], tags)).toEqual({
      label: 'multi',
      score: 10,
    });
  });

  it('returns unknown with score 0 when no tag matches and tags exist', () => {
    const tags = [makeTag('multi', 3)];
    expect(parseTag(['movie', '1080p'], tags)).toEqual({
      label: 'unknown',
      score: 0,
    });
  });

  it('returns unknown with score 1 when no tags are configured', () => {
    expect(parseTag(['movie', '1080p'], [])).toEqual({
      label: 'unknown',
      score: 1,
    });
  });
});

describe('parseQuality', () => {
  it('matches a quality keyword', () => {
    const qualities = [makeQuality('1080p', ['1080p', 'bluray'], 5)];
    expect(parseQuality(['movie', '1080p', 'x264'], qualities)).toEqual({
      label: '1080p',
      score: 5,
    });
  });

  it('matches any keyword of a quality', () => {
    const qualities = [makeQuality('1080p', ['1080p', 'bluray'], 5)];
    expect(parseQuality(['movie', 'bluray'], qualities)).toEqual({
      label: '1080p',
      score: 5,
    });
  });

  it('returns unknown with score 0 when nothing matches', () => {
    const qualities = [makeQuality('1080p', ['1080p'], 5)];
    expect(parseQuality(['movie', '720p'], qualities)).toEqual({
      label: 'unknown',
      score: 0,
    });
  });
});

describe('formatSearchResult', () => {
  it('normalizes the title and extracts parts', () => {
    const result = formatSearchResult({
      result: makeResult('Movie.Title (2020) [Multi]', {
        MagnetUri: 'magnet:?xt=urn:btih:abc',
        Size: 1234,
        Seeders: 8,
        Peers: 2,
      }),
      qualityParams: [makeQuality('1080p', ['1080p'], 5)],
      preferredTags: [makeTag('multi', 3)],
    });

    expect(result.normalizedTitle).toEqual('movie title 2020 multi');
    expect(result.normalizedTitleParts).toEqual([
      'movie',
      'title',
      '2020',
      'multi',
    ]);
    expect(result.downloadLink).toEqual('magnet:?xt=urn:btih:abc');
    expect(result.tag).toEqual({ label: 'multi', score: 3 });
  });
});

describe('sortByBest', () => {
  it('orders by tag score, then quality score, then seeders', () => {
    const results = [
      { tag: { score: 0 }, quality: { score: 0 }, seeders: 99 },
      { tag: { score: 0 }, quality: { score: 5 }, seeders: 1 },
      { tag: { score: 3 }, quality: { score: 0 }, seeders: 1 },
      { tag: { score: 3 }, quality: { score: 5 }, seeders: 1 },
      { tag: { score: 3 }, quality: { score: 5 }, seeders: 50 },
    ].map((r) => ({ ...r } as unknown as RankedResult));

    const sorted = sortByBest(results);

    expect(sorted.map((r) => [r.tag.score, r.quality.score, r.seeders])).toEqual([
      [3, 5, 50],
      [3, 5, 1],
      [3, 0, 1],
      [0, 5, 1],
      [0, 0, 99],
    ]);
  });
});

describe('isDownloadable', () => {
  const downloadable = {
    size: 100,
    seeders: 10,
    peers: 2,
    tag: { label: 'multi', score: 3 },
    normalizedTitleParts: ['movie', '2020'],
  } as unknown as RankedResult;

  it('accepts a result with size, seeders and a tag', () => {
    expect(isDownloadable({ result: downloadable, maxSize: 1000 })).toBe(true);
  });

  it('rejects results bigger than maxSize', () => {
    expect(
      isDownloadable({ result: { ...downloadable, size: 2000 }, maxSize: 1000 })
    ).toBe(false);
  });

  it('rejects results with less than 5 seeders', () => {
    expect(
      isDownloadable({ result: { ...downloadable, seeders: 4 }, maxSize: 1000 })
    ).toBe(false);
  });

  it('rejects results with more peers than seeders', () => {
    expect(
      isDownloadable({
        result: { ...downloadable, seeders: 10, peers: 20 },
        maxSize: 1000,
      })
    ).toBe(false);
  });

  it('rejects results without a known tag', () => {
    expect(
      isDownloadable({
        result: { ...downloadable, tag: { label: 'unknown', score: 0 } },
        maxSize: 1000,
      })
    ).toBe(false);
  });

  it('rejects episode releases when searching a season pack', () => {
    expect(
      isDownloadable({
        result: {
          ...downloadable,
          normalizedTitleParts: ['show', 's01e02', '1080p'],
        },
        maxSize: 1000,
        isSeason: true,
      })
    ).toBe(false);
  });

  it('bypasses all filters when withoutFilter is set', () => {
    expect(
      isDownloadable({
        result: {
          ...downloadable,
          size: 999999,
          seeders: 0,
          tag: { label: 'unknown', score: 0 },
        },
        withoutFilter: true,
      })
    ).toBe(true);
  });
});

describe('torrent-ranking properties', () => {
  const tagArbitrary = fc
    .record({
      name: fc.string({ minLength: 1, maxLength: 10 }),
      score: fc.integer({ min: 1, max: 100 }),
    })
    .map(({ name, score }) => makeTag(name.toLowerCase(), score));

  const tagsArbitrary = fc.array(tagArbitrary, { maxLength: 5 });

  it('parseTag always returns a configured tag or unknown', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
          maxLength: 10,
        }),
        tagsArbitrary,
        (parts, tags) => {
          const result = parseTag(parts, tags);
          const validLabels = tags.map((t) => t.name).concat('unknown');
          expect(validLabels).toContain(result.label);
          expect(result.score).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  it('parseQuality returns a configured quality or unknown', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
          maxLength: 10,
        }),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 10 }),
            match: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
              minLength: 1,
              maxLength: 3,
            }),
            score: fc.integer({ min: 1, max: 100 }),
          }),
          { maxLength: 5 }
        ),
        (parts, qualityInputs) => {
          const qualities = qualityInputs.map((q) =>
            makeQuality(q.name, q.match.map((m) => m.toLowerCase()), q.score)
          );
          const result = parseQuality(parts, qualities);
          const validLabels = qualities.map((q) => q.name).concat('unknown');
          expect(validLabels).toContain(result.label);
          expect(result.score).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  it('sortByBest produces a stable descending ranking', () => {
    const resultArbitrary = fc.record({
      tag: fc.integer({ min: 0, max: 5 }),
      quality: fc.integer({ min: 0, max: 10 }),
      seeders: fc.integer({ min: 0, max: 500 }),
    });

    fc.assert(
      fc.property(fc.array(resultArbitrary), (inputs) => {
        const results = inputs.map(
          (r) =>
            ({
              tag: { score: r.tag },
              quality: { score: r.quality },
              seeders: r.seeders,
            } as unknown as RankedResult)
        );

        const sorted = sortByBest(results);

        for (let i = 1; i < sorted.length; i += 1) {
          const prev = sorted[i - 1];
          const curr = sorted[i];

          if (prev.tag.score < curr.tag.score) {
            throw new Error('tag order violated');
          }
          if (
            prev.tag.score === curr.tag.score &&
            prev.quality.score < curr.quality.score
          ) {
            throw new Error('quality order violated');
          }
          if (
            prev.tag.score === curr.tag.score &&
            prev.quality.score === curr.quality.score &&
            prev.seeders < curr.seeders
          ) {
            throw new Error('seeders order violated');
          }
        }
      })
    );
  });

  it('isDownloadable respects size, seeders and tag filters', () => {
    const resultArbitrary = fc.record({
      size: fc.integer({ min: 0, max: 10000 }),
      seeders: fc.integer({ min: 0, max: 100 }),
      peers: fc.integer({ min: 0, max: 100 }),
      tagScore: fc.integer({ min: 0, max: 10 }),
    });

    fc.assert(
      fc.property(
        resultArbitrary,
        fc.integer({ min: 0, max: 10000 }),
        fc.boolean(),
        (input, maxSize, withoutFilter) => {
          const result = {
            size: input.size,
            seeders: input.seeders,
            peers: input.peers,
            tag: { score: input.tagScore },
            normalizedTitleParts: ['movie'],
          } as unknown as RankedResult;

          const accepted = isDownloadable({
            result,
            maxSize,
            withoutFilter,
          });

          if (withoutFilter) {
            expect(accepted).toBe(true);
          } else {
            if (input.size >= maxSize) expect(accepted).toBe(false);
            if (input.seeders < 5 || input.seeders <= input.peers) {
              expect(accepted).toBe(false);
            }
            if (input.tagScore <= 0) expect(accepted).toBe(false);
          }
        }
      )
    );
  });
});
