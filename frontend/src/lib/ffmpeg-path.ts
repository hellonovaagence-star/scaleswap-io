/**
 * Shared FFmpeg path resolution — used by video-engine.ts and phash.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeFs = require("fs") as typeof import("fs");

export function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const candidates = [
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
  ];
  for (const p of candidates) {
    if (nodeFs.existsSync(p)) return p;
  }
  return "ffmpeg";
}

export const FFMPEG_PATH = resolveFfmpegPath();
