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
  infoHash?: string;
  codecScore?: number;
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
  // Jackett titles sometimes omit the codec/language while the magnet display
  // name carries the full release name (e.g. "... DD 2.0 H 264-playWEB").
  // Include it in the normalized text used for codec/audio filtering.
  const magnetName = getMagnetDisplayName(result.MagnetUri);
  const normalizedTitle = sanitize(`${result.Title} ${magnetName}`.trim());
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
    infoHash:
      getMagnetInfoHash(result.MagnetUri) ??
      getMagnetInfoHash(result.Link) ??
      undefined,
    codecScore: isH265Release(normalizedTitleParts)
      ? 2
      : isH264Release(normalizedTitleParts)
        ? 0
        : 1,
  };
}

export function sortByBest(results: RankedResult[]) {
  return orderBy(
    results,
    [
      (result: RankedResult) => result.tag.score,
      (result: RankedResult) => result.quality.score,
      (result: RankedResult) => result.codecScore ?? 1,
      'seeders',
    ],
    ['desc', 'desc', 'desc', 'desc']
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
    ['seeders', 'tag.score', 'quality.score', (result: RankedResult) => result.codecScore ?? 1],
    ['desc', 'desc', 'desc', 'desc']
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
    [
      (result: RankedResult) => result.quality.score,
      (result: RankedResult) => result.tag.score,
      (result: RankedResult) => result.codecScore ?? 1,
      'seeders',
    ],
    ['desc', 'desc', 'desc', 'desc']
  )[0];
}

/**
 * Codec detection for release titles. `sanitize` splits punctuation, so
 * "H.264" becomes the tokens ["h", "264"] while "x264"/"HEVC" stay whole.
 */
export function isH264Release(normalizedTitleParts: string[]): boolean {
  const has = (token: string) => normalizedTitleParts.includes(token);
  return (
    has('x264') ||
    has('h264') ||
    has('avc') ||
    has('avc1') ||
    (has('x') && has('264')) ||
    (has('h') && has('264'))
  );
}

export function isH265Release(normalizedTitleParts: string[]): boolean {
  const has = (token: string) => normalizedTitleParts.includes(token);
  return (
    has('x265') ||
    has('h265') ||
    has('hevc') ||
    (has('x') && has('265')) ||
    (has('h') && has('265'))
  );
}

/**
 * Picks the smallest acceptable HEVC/x265 release that is strictly smaller
 * than the media it would replace. Returns undefined when no release saves
 * space, so a replacement never grows the library.
 */
export function pickSmallestH265Upgrade(
  results: RankedResult[],
  existingSize: number
): RankedResult | undefined {
  return orderBy(
    results.filter(
      (result) =>
        isH265Release(result.normalizedTitleParts) &&
        result.size > 0 &&
        result.size < existingSize &&
        result.seeders >= 5 &&
        result.seeders > result.peers
    ),
    ['size'],
    ['asc']
  )[0];
}

const VIDEO_EXTENSION = /\.(mkv|mp4|avi|m4v|mov|ts)$/i;

/**
 * Normalizes a release title for comparisons. Video file extensions are
 * stripped so a torrent named "Show.S01E01.mkv" matches the Jackett title
 * "Show.S01E01".
 */
export function normalizeReleaseTitle(title: string) {
  return sanitize(title.replace(VIDEO_EXTENSION, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function getMagnetDisplayName(uri?: string): string {
  if (!uri) return '';
  const match = /[?&]dn=([^&]+)/i.exec(uri);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' '));
  } catch {
    return match[1];
  }
}

export function getMagnetInfoHash(uri?: string): string | undefined {
  if (!uri) return undefined;
  const match = /urn:btih:([a-z0-9]+)/i.exec(uri);
  return match ? match[1].toLowerCase() : undefined;
}

const FOREIGN_AUDIO_TOKENS = new Set([
  'ita',
  'italian',
  'rus',
  'russian',
  'fre',
  'fra',
  'french',
  'truefrench',
  'vff',
  'ger',
  'deu',
  'german',
  'spa',
  'spanish',
  'por',
  'portuguese',
  'jpn',
  'japanese',
  'kor',
  'korean',
  'hin',
  'hindi',
  'tur',
  'turkish',
  'pol',
  'polish',
  'dut',
  'nld',
  'dutch',
  'swe',
  'swedish',
  'nor',
  'norwegian',
  'dan',
  'danish',
  'fin',
  'finnish',
  'cze',
  'ces',
  'czech',
  'hun',
  'hungarian',
  'rum',
  'ron',
  'romanian',
  'ukr',
  'ukrainian',
  'ara',
  'arabic',
]);

const MULTI_AUDIO_TOKENS = new Set([
  'eng',
  'english',
  'multi',
  'dual',
  'vostfr',
]);

/**
 * True when a release advertises a foreign audio track and no English/multi
 * marker. Releases without any language marker are not judged here: their
 * audio is verified after download.
 */
export function isForeignAudioOnly(
  normalizedTitleParts: string[]
): boolean {
  const hasForeign = normalizedTitleParts.some((part) =>
    FOREIGN_AUDIO_TOKENS.has(part)
  );
  if (!hasForeign) return false;

  return !normalizedTitleParts.some((part) =>
    MULTI_AUDIO_TOKENS.has(part)
  );
}

/**
 * Returns true when the release title contains any of the configured blocked
 * keywords. Keywords are matched as whole token sequences so "ai upscaled"
 * matches "Movie.AI-Upscaled.2020" but a lone "ai" does not match "air" or
 * "trailer". Keywords are sanitized the same way titles are, so punctuation
 * and casing in the settings do not matter.
 */
export function matchesBlockedKeyword(
  normalizedTitleParts: string[],
  blockedKeywords: string[]
): boolean {
  return blockedKeywords.some((keyword) => {
    const tokens = sanitize(keyword).split(' ').filter(Boolean);
    if (tokens.length === 0) return false;

    return normalizedTitleParts.some((_, index) =>
      tokens.every(
        (token, offset) => normalizedTitleParts[index + offset] === token
      )
    );
  });
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
