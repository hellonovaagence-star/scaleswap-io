/**
 * Shared FFmpeg path resolution — used by video-engine.ts and phash.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeFs = require("fs") as typeof import("fs");

let _cachedPath: string | null = null;

export function resolveFfmpegPath(): string {
  if (_cachedPath) return _cachedPath;
  if (process.env.FFMPEG_PATH) {
    _cachedPath = process.env.FFMPEG_PATH;
    return _cachedPath;
  }
  const candidates = [
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
  ];
  for (const p of candidates) {
    if (nodeFs.existsSync(p)) {
      _cachedPath = p;
      return p;
    }
  }
  _cachedPath = "ffmpeg";
  return _cachedPath;
}

/** @deprecated Use resolveFfmpegPath() instead — lazy resolution avoids blocking module load */
export const FFMPEG_PATH = "ffmpeg";
