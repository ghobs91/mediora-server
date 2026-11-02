import { execFile } from 'child_process';
import { promisify } from 'util';

import { isForeignAudioOnly } from './torrent-ranking';

const execFileAsync = promisify(execFile);

/**
 * Reads the first video stream's codec with ffprobe. Returns null when the
 * file cannot be probed (missing file, container without ffmpeg, timeout).
 */
export async function probeVideoCodec(
  filePath: string
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=codec_name',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { timeout: 30_000 }
    );

    const codec = stdout.trim().split('\n')[0]?.toLowerCase();
    return codec || null;
  } catch {
    return null;
  }
}

export function isH264Codec(codec: string | null): boolean {
  return codec === 'h264';
}

export function isH265Codec(codec: string | null): boolean {
  return codec === 'hevc' || codec === 'h265';
}

export interface AudioTrack {
  language?: string;
  title?: string;
}

export interface AudioProbe {
  tracks: AudioTrack[];
  releaseTitle?: string;
}

/**
 * Reads audio stream languages/titles and the container's embedded release
 * title with ffprobe. Returns null when the file cannot be probed, which
 * callers must treat as "unknown" (never as a reason to delete media — a mount
 * outage must not purge the library).
 */
export async function probeAudio(
  filePath: string
): Promise<AudioProbe | null> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_format',
        '-show_streams',
        '-of',
        'json',
        filePath,
      ],
      { timeout: 30_000 }
    );

    const parsed = JSON.parse(stdout);
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const audioStreams = streams.filter(
      (stream: { codec_type?: string }) => stream.codec_type === 'audio'
    );

    const title = parsed.format?.tags?.title ?? parsed.format?.tags?.TITLE;

    return {
      tracks: audioStreams.map(
        (stream: { tags?: Record<string, string> }) => ({
          language: stream.tags?.language?.toLowerCase(),
          title: stream.tags?.title,
        })
      ),
      releaseTitle: typeof title === 'string' ? title : undefined,
    };
  } catch {
    return null;
  }
}

export async function probeAudioTracks(
  filePath: string
): Promise<AudioTrack[] | null> {
  const probe = await probeAudio(filePath);
  return probe ? probe.tracks : null;
}

const ENGLISH_LANGUAGE_CODES = new Set(['eng', 'en']);

const FOREIGN_LANGUAGE_CODES = new Set([
  'ita',
  'rus',
  'fre',
  'fra',
  'ger',
  'deu',
  'spa',
  'por',
  'jpn',
  'kor',
  'hin',
  'tur',
  'pol',
  'dut',
  'nld',
  'swe',
  'nor',
  'dan',
  'fin',
  'cze',
  'ces',
  'hun',
  'rum',
  'ron',
  'ukr',
  'ara',
]);

const ENGLISH_TITLE_WORDS = new Set(['english', 'eng']);

const FOREIGN_TITLE_WORDS = new Set([
  'italian',
  'russian',
  'french',
  'german',
  'spanish',
  'portuguese',
  'japanese',
  'korean',
  'hindi',
  'turkish',
  'polish',
  'dutch',
  'swedish',
  'norwegian',
  'danish',
  'finnish',
  'czech',
  'hungarian',
  'romanian',
  'ukrainian',
  'arabic',
]);

/**
 * Classifies a file's audio tracks. "unknown" means there is no reliable
 * language tag and the caller should not reject the download.
 */
export function assessAudioTracks(
  tracks: AudioTrack[] | null
): 'english' | 'foreign' | 'unknown' {
  if (!tracks || tracks.length === 0) return 'unknown';

  let hasForeign = false;

  for (const track of tracks) {
    const language = track.language?.toLowerCase();
    const titleWords = (track.title ?? '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);

    if (
      (language && ENGLISH_LANGUAGE_CODES.has(language)) ||
      titleWords.some((word) => ENGLISH_TITLE_WORDS.has(word))
    ) {
      return 'english';
    }

    if (
      (language && FOREIGN_LANGUAGE_CODES.has(language)) ||
      titleWords.some((word) => FOREIGN_TITLE_WORDS.has(word))
    ) {
      hasForeign = true;
    }
  }

  return hasForeign ? 'foreign' : 'unknown';
}

/**
 * Combines stream tags with the container's embedded release title. The title
 * fallback matters because many MKV releases carry no per-stream language tag
 * but still include markers such as RUS/ITA/FRENCH in their metadata.
 */
export function assessAudio(
  probe: AudioProbe | null
): 'english' | 'foreign' | 'unknown' {
  if (!probe) return 'unknown';

  const fromTracks = assessAudioTracks(probe.tracks);
  if (fromTracks !== 'unknown') return fromTracks;

  if (probe.releaseTitle) {
    const parts = probe.releaseTitle
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    if (isForeignAudioOnly(parts)) return 'foreign';
  }

  return 'unknown';
}
