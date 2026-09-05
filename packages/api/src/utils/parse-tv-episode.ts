import path from "path";

export interface ParsedTvFile {
  seasonNumber: number;
  episodeNumbers: number[];
}

const SIDECAR_EXTENSIONS = new Set([
  ".srt",
  ".nfo",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".txt",
  ".sfv",
  ".nzb",
  ".sub",
  ".idx",
  ".ass",
  ".ssa",
  ".md",
  ".db",
  ".ini",
]);

const SKIP_BASENAME = /sample|trailer|extras?|featurette/i;

// Matches pack/range folders like "Show.Complete.S01-S07" or
// "Season 1-3" so we don't mistake them for a single season.
const PACK_RANGE = /s\d+\s*[-~]\s*s?\d+|season\s*\d+\s*[-~]\s*season?\s*\d+/i;

function validSeason(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 99;
}

function validEpisode(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= 999;
}

function expandRange(first: number, second: number): number[] {
  if (!validEpisode(first) || !validEpisode(second)) return [];
  if (first === second) return [first];
  // Guard against matching resolutions like 1080p as episode numbers.
  if (second > 99) return [first];
  const start = Math.min(first, second);
  const end = Math.max(first, second);
  // Sanity cap so a bad parse can't create hundreds of episodes.
  if (end - start > 20) return [first];
  const result: number[] = [];
  for (let episode = start; episode <= end; episode++) {
    result.push(episode);
  }
  return result;
}

/**
 * Finds the season number from the directory chain between the file and the
 * show root (nearest directory wins). Pack/range folders are skipped so
 * `Show.Complete.S01-S07/Season 2/file.mkv` resolves to season 2.
 */
function seasonFromDirectories(
  episodePath: string,
  showRoot?: string,
): number | null {
  const dir = path.dirname(episodePath);
  const relative =
    showRoot && dir.startsWith(showRoot)
      ? path.relative(showRoot, dir)
      : dir;
  const parts = relative.split(path.sep).filter(Boolean).reverse();

  for (const part of parts) {
    if (PACK_RANGE.test(part)) continue;
    const seasonMarker = /season[\s._-]*(\d{1,2})/i.exec(part);
    if (seasonMarker && validSeason(parseInt(seasonMarker[1], 10))) {
      return parseInt(seasonMarker[1], 10);
    }
    const shortMarker = /(?:^|[\s._-])s(\d{1,2})(?:$|[\s._-])/i.exec(part);
    if (shortMarker && validSeason(parseInt(shortMarker[1], 10))) {
      return parseInt(shortMarker[1], 10);
    }
    const bareNumber = /^0?(\d{1,2})$/.exec(part.trim());
    if (bareNumber && validSeason(parseInt(bareNumber[1], 10))) {
      return parseInt(bareNumber[1], 10);
    }
  }

  return null;
}

/**
 * Parses season/episode numbers from a file on disk.
 *
 * Episode matching is basename-only (never the full path) so show titles,
 * mount paths or years (e.g. "Show (2020)") can't poison the result.
 * Understands S01E01, S01E01-E02, S01E01E02, S01E01-02, 1x01 and
 * "Season 1 Episode 2" layouts, plus season-pack subfolders.
 */
export function parseTvFile(
  episodePath: string,
  showRoot?: string,
): ParsedTvFile | null {
  const basename = path.basename(episodePath);
  if (!basename || basename.startsWith(".")) return null;

  const ext = path.extname(basename).toLowerCase();
  if (SIDECAR_EXTENSIONS.has(ext)) return null;
  if (SKIP_BASENAME.test(basename)) return null;

  const stem = ext ? basename.slice(0, -ext.length) : basename;
  const folderSeason = seasonFromDirectories(episodePath, showRoot);

  // S01E01, S01E01-E02, S01E01E02, S01E01-02
  const sxe = /s(\d{1,2})[\s._-]*e(\d{1,3})/i.exec(stem);
  if (sxe) {
    const seasonNumber = parseInt(sxe[1], 10);
    const first = parseInt(sxe[2], 10);
    if (!validSeason(seasonNumber) || !validEpisode(first)) return null;
    const remainder = stem.slice(sxe.index + sxe[0].length);
    const continuation =
      /^[\s._-]*e(\d{1,3})/i.exec(remainder) ||
      /^\s*[-~]\s*e?(\d{1,3})/i.exec(remainder);
    if (continuation) {
      const second = parseInt(continuation[1], 10);
      const episodeNumbers = expandRange(first, second);
      if (episodeNumbers.length > 0) return { seasonNumber, episodeNumbers };
    }
    return { seasonNumber, episodeNumbers: [first] };
  }

  // 1x01, 01x01, 1x01-02
  const xStyle = /(?:^|[\s._-])(\d{1,2})[xX](\d{1,3})/.exec(stem);
  if (xStyle) {
    const seasonNumber = parseInt(xStyle[1], 10);
    const first = parseInt(xStyle[2], 10);
    if (!validSeason(seasonNumber) || !validEpisode(first)) return null;
    const remainder = stem.slice(xStyle.index + xStyle[0].length);
    const continuation = /^\s*[-~x]\s*(\d{1,3})/i.exec(remainder);
    if (continuation) {
      const second = parseInt(continuation[1], 10);
      const episodeNumbers = expandRange(first, second);
      if (episodeNumbers.length > 0) return { seasonNumber, episodeNumbers };
    }
    return { seasonNumber, episodeNumbers: [first] };
  }

  // Season 1 Episode 2 / Season 1 Ep 2 / Season 1 E2
  const longhand =
    /season[\s._-]*(\d{1,2})[\s._-]+(?:episode|ep|e)[\s._-]*(\d{1,3})/i.exec(
      stem,
    );
  if (longhand) {
    const seasonNumber = parseInt(longhand[1], 10);
    const first = parseInt(longhand[2], 10);
    if (!validSeason(seasonNumber) || !validEpisode(first)) return null;
    return { seasonNumber, episodeNumbers: [first] };
  }

  // Episode 5 / Ep 5 / E05 (season comes from Sxx in the name or folders)
  const standalone =
    /(?:^|[\s._-])(?:episode|ep|e)[\s._-]*(\d{1,3})(?:\s*[-~]\s*e?(\d{1,3}))?(?=$|[\s._-])/i.exec(
      stem,
    );
  if (standalone) {
    const first = parseInt(standalone[1], 10);
    if (!validEpisode(first)) return null;
    const shortSeason = /s(\d{1,2})/i.exec(stem);
    const seasonNumber =
      (shortSeason && validSeason(parseInt(shortSeason[1], 10))
        ? parseInt(shortSeason[1], 10)
        : null) ?? folderSeason;
    if (seasonNumber === null || !validSeason(seasonNumber)) return null;
    if (standalone[2]) {
      const second = parseInt(standalone[2], 10);
      const episodeNumbers = expandRange(first, second);
      if (episodeNumbers.length > 0) return { seasonNumber, episodeNumbers };
    }
    return { seasonNumber, episodeNumbers: [first] };
  }

  return null;
}
