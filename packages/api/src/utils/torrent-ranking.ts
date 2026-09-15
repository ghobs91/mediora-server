import { orderBy } from 'lodash';

import { JackettResult } from 'src/modules/jackett/jackett.dto';
import { Quality } from 'src/entities/quality.entity';
import { Tag } from 'src/entities/tag.entity';
import { sanitize } from './sanitize';

export interface RankedResult {
  normalizedTitle: string;
  normalizedTitleParts: string[];
  id: string;
  title: string;
  quality: { label: string; score: number; maxSize: number | null };
  size: number;
  seeders: number;
  peers: number;
  link: string;
  downloadLink: string;
  tag: { label: string; score: number };
  publishDate: string;
}

export function parseTag(normalizedTitle: string[], preferredTags: Tag[]) {
  const tagMatch = preferredTags.find((tag) =>
    normalizedTitle.find((part) => part === tag.name.toLowerCase())
  );

  // we set score to 1 when there's not tag set
  // like this all results will be treated as potential result
  const unknownScore = preferredTags.length > 0 ? 0 : 1;

  return tagMatch
    ? { label: tagMatch.name, score: tagMatch.score }
    : { label: 'unknown', score: unknownScore };
}

export function parseQuality(
  normalizedTitle: string[],
  qualityParams: Quality[]
) {
  // Each `match` entry is a space separated AND-group of keywords, and the
  // entries themselves are OR-ed together. This keeps single-keyword profiles
  // working as before while allowing codec aware profiles such as
  // "1080p x265" (match: ['1080p x265', '1080p hevc']).
  const qualityMatch = qualityParams.find((quality) =>
    quality.match.some((keyword) => {
      const tokens = keyword.toLowerCase().split(' ').filter(Boolean);
      return (
        tokens.length > 0 &&
        tokens.every((token) => normalizedTitle.includes(token))
      );
    })
  );

  return qualityMatch
    ? {
        label: qualityMatch.name,
        score: qualityMatch.score,
        maxSize: qualityMatch.maxSize ?? null,
      }
    : { label: 'unknown', score: 0, maxSize: null };
}

export function formatSearchResult({
  result,
  qualityParams,
  preferredTags,
}: {
  result: JackettResult;
  qualityParams: Quality[];
  preferredTags: Tag[];
}): RankedResult {
  const normalizedTitle = sanitize(result.Title);
  const normalizedTitleParts = normalizedTitle
    .split(' ')
    .filter((str) => str && str.trim());

  return {
    normalizedTitle,
    normalizedTitleParts,
    id: result.Guid,
    title: result.Title,
    quality: parseQuality(normalizedTitleParts, qualityParams),
    size: result.Size,
    seeders: result.Seeders,
    peers: result.Peers,
    link: result.Guid,
    // we filter out results without link or magnet uri before
    // there will always be a download link
    downloadLink: (result.MagnetUri || result.Link) as string,
    tag: parseTag(normalizedTitleParts, preferredTags),
    publishDate: result.PublishDate,
  };
}

export function sortByBest(results: RankedResult[]) {
  return orderBy(
    results,
    ['tag.score', 'quality.score', 'seeders'],
    ['desc', 'desc', 'desc']
  );
}

export function pickMostSeeded(
  results: RankedResult[]
): RankedResult | undefined {
  // Manual picks: most seeders wins among the acceptable candidates
  // (already filtered by isDownloadable). Tag/quality scores only break ties
  // so a healthy swarm beats a dead one with a marginally better label.
  return orderBy(
    results,
    ['seeders', 'tag.score', 'quality.score'],
    ['desc', 'desc', 'desc']
  )[0];
}

export function pickBest(
  results: RankedResult[]
): RankedResult | undefined {
  // Automatic downloads honour the configured quality ordering: the best
  // matching quality wins, and seeders only break ties between releases of
  // the same quality. Per-quality size caps are enforced upstream.
  return orderBy(
    results,
    ['quality.score', 'tag.score', 'seeders'],
    ['desc', 'desc', 'desc']
  )[0];
}

export function isDownloadable({
  result,
  maxSize = Infinity,
  episodeCount = 1,
  isSeason = false,
  withoutFilter = false,
}: {
  result: RankedResult;
  maxSize?: number;
  episodeCount?: number;
  isSeason?: boolean;
  withoutFilter?: boolean;
}) {
  if (withoutFilter) return true;

  const baseSizeLimit = result.quality.maxSize ?? maxSize;
  const hasAcceptableSize = result.size < baseSizeLimit * episodeCount;
  const hasSeeders = result.seeders >= 5 && result.seeders > result.peers;
  const hasTag = result.tag.score > 0;

  if (isSeason) {
    const isEpisode = result.normalizedTitleParts.some((titlePart) =>
      titlePart.match(/e\d+|episode|episode\d+|ep|ep\d+/)
    );
    return hasAcceptableSize && hasSeeders && !isEpisode;
  }

  return hasAcceptableSize && hasSeeders && hasTag;
}
