/**
 * Video Engine — 24-layer FFmpeg transformation pipeline.
 *
 * Designed to defeat perceptual hashing (pHash) used by Instagram/TikTok.
 * pHash: downscale 32x32 → grayscale → 2D DCT → 8x8 low-freq coefficients → 64-bit hash.
 * Key insight: we need LOW-FREQUENCY changes (not pixel noise) to shift DCT coefficients.
 *
 * Each variant gets deterministic, unique params seeded by variant_index (mulberry32 PRNG).
 *
 * Layers:
 *  1. Metadata      — Strip + spoof device/GPS/date
 *  2. Spatial       — Random crop from edges (2-6px) — shifts content at 32x32 scale
 *  3. Temporal      — Trim start + end, micro speed change (±0.15%)
 *  4. Color         — Gamma ±0.01, contrast ±0.005, brightness ±0.008 — shifts grayscale DCT
 *  5. Noise         — Temporal-only grain (strength 1-2, flag "t") — invisible on static areas
 *  6. Codec         — CRF, GOP, profile, level, preset, B-frames, refs
 *  7. Audio         — Sample rate, bitrate, channels, micro-noise
 *  8. Binary        — Random MP4 "free" atom padding (post-FFmpeg)
 *  9. Vignette      — Edge darkening (low-freq spatial change → DCT impact)
 * 10. Zoom          — Scale-up + crop-back (1-2.5%) — resamples pixel grid
 * 11. Rotation      — Micro-rotation (0.1-0.3°) — shifts spatial content
 * 12. Random Res    — Resolution variation (±2-4px)
 * 13. Pixel Shift   — Hue micro-rotation (0.2-0.8°)
 * 14. Volume        — Audio volume micro-adjustment (±2%)
 * 15. Waveform Shift— Audio phase delay (1-5ms)
 * 16. Lens Correct  — Barrel/pincushion micro-distortion
 * 17. Flip          — Horizontal flip (~40% chance) — completely changes pHash
 * 18. Gaussian Blur — Subtle blur (σ 0.1-0.2) — shifts DCT low-freq coefficients
 * 19. DCT Adversarial— Low-freq luminance pattern via geq — targets pHash DCT basis
 * 20. Unsharp Mask  — Micro-sharpen (0.05-0.15) to counter blur
 * 21. Audio EQ      — Subtle 3-band EQ (±0.5dB) — micro spectrogram shift
 * 22. Audio Pitch   — Micro pitch shift ±0.2% via asetrate
 * 23. Perspective   — Trapezoidal warp (1-3px corners) — remaps pixel grid
 * 24. Color Mixer   — Inter-channel bleed (±1.5%) — shifts grayscale luma
 * (+) Framerate     — Micro FPS variation (29.95-30.03) — shifts frame sampling alignment
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { createReadStream } from "fs";
import { extractFrame, computePhash, hammingDistance } from "./phash";
import { FFMPEG_PATH } from "./ffmpeg-path";

const execFileAsync = promisify(execFile);

// ─── Mulberry32 PRNG ────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromIndex(variantIndex: number, salt: string = ""): number {
  const hash = crypto
    .createHash("sha256")
    .update(`${variantIndex}_${salt}`)
    .digest();
  return hash.readUInt32BE(0);
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function uniform(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(uniform(rng, min, max + 1));
}

// ─── Caption overlay (HTML → PNG via Puppeteer, then FFmpeg overlay) ─────────

import type { Browser } from "puppeteer-core";

let _browser: Browser | null = null;
let _browserLaunchPromise: Promise<Browser> | null = null;

/** Close the shared Puppeteer browser instance (call on shutdown). */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
    _browserLaunchPromise = null;
  }
}

// Cleanup Chrome on process exit
process.on("SIGTERM", () => { _browser?.close().catch(() => {}); });
process.on("SIGINT", () => { _browser?.close().catch(() => {}); });

function resolveChromePath(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFs = require("fs") as typeof import("fs");
  const candidates = [
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // Linux
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const p of candidates) {
    if (nodeFs.existsSync(p)) return p;
  }
  return candidates[0]; // fallback to macOS default
}

async function getCaptionBrowser(): Promise<Browser> {
  // Reuse healthy existing browser
  if (_browser && _browser.connected) return _browser;
  // Clean up dead browser reference
  if (_browser) {
    _browser.close().catch(() => {});
    _browser = null;
  }
  // Prevent race: multiple concurrent calls must share the same launch promise
  if (_browserLaunchPromise) return _browserLaunchPromise;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const puppeteer = require("puppeteer-core") as typeof import("puppeteer-core");
  console.log("[caption] Launching headless Chrome...");
  _browserLaunchPromise = puppeteer.launch({
    executablePath: resolveChromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  try {
    _browser = await _browserLaunchPromise;
    console.log("[caption] Chrome launched OK");
  } catch (err) {
    console.error("[caption] Chrome launch failed:", err);
    _browserLaunchPromise = null;
    throw err;
  }
  _browserLaunchPromise = null;
  return _browser;
}

export interface CaptionOverlay {
  text: string;
  position: "top" | "center" | "bottom";
  fontSize: number;
  fontColor: string;
  strokeColor: string;
  fontFamily?: string;
}

/**
 * Generate a transparent PNG with the caption text using Puppeteer (Chrome).
 * Supports color emoji (Apple Color Emoji) and all system fonts.
 * Returns the path to the generated PNG, sized to match the video dimensions.
 */
async function generateCaptionPng(
  caption: CaptionOverlay,
  videoWidth: number,
  videoHeight: number,
  outputPath: string,
): Promise<void> {
  // ── Scale from preview coordinates to video coordinates ──
  // CaptionEditor.tsx preview: 200px wide (grid "1fr 200px"), font rendered at fontSize*0.35,
  // textScale applied via CSS transform, saved as font_size = Math.round(fontSize * textScale).
  // We must invert the 0.35 factor and scale to video width.
  // ── Scale from preview coordinates to video coordinates ──
  // Preview: 200px container, text rendered at fontSize*0.35, then scaled by textScale
  // via CSS transform. Saved font_size = Math.round(fontSize * textScale).
  // maxWidth in preview is 170px at the UN-SCALED level, but CSS transform: scale(textScale)
  // stretches it visually to 170 * textScale pixels in preview space.
  // We need to reproduce the same ratio at video resolution.
  const PREVIEW_WIDTH = 200;
  const PREVIEW_FONT_SCALE = 0.35;

  const rawSize = caption.fontSize || 48;
  const scaleFactor = (videoWidth / PREVIEW_WIDTH) * PREVIEW_FONT_SCALE;
  const size = Math.round(rawSize * scaleFactor);

  const color = caption.fontColor || "white";
  const stroke = caption.strokeColor || "black";
  const text = caption.text || "";
  const strokeWidth = Math.max(2, Math.round(size / 12));
  // Use 90% of video width as max text width — matches the visual behavior in the preview
  // where 170/200 = 85% base ratio is further stretched by textScale.
  // Using a generous width prevents premature line breaks while still wrapping very long text.
  const maxTextWidth = Math.round(videoWidth * 0.90);

  // Build @font-face + font-family based on caption.fontFamily
  let fontFaceBlock = "";
  let fontFamilyCss = "'Helvetica Neue', Helvetica, Arial, sans-serif";

  if (caption.fontFamily === "tiktok") {
    try {
      const fontPath = path.join(process.cwd(), "public", "fonts", "TikTokSans-Bold.ttf");
      const fontBuffer = await fs.readFile(fontPath);
      const fontBase64 = fontBuffer.toString("base64");
      fontFaceBlock = `
        @font-face {
          font-family: 'TikTokSans';
          src: url('data:font/truetype;base64,${fontBase64}') format('truetype');
          font-weight: 700;
          font-style: normal;
        }`;
      fontFamilyCss = "'TikTokSans', sans-serif";
    } catch {
      // Fallback if font file not found
    }
  }

  // Position: match CaptionEditor PRESET_Y values (top=8%, center=50%, bottom=88%)
  let yPercent: number;
  if (caption.position === "top") yPercent = 8;
  else if (caption.position === "bottom") yPercent = 88;
  else yPercent = 50;

  // Escape HTML
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const html = `<!DOCTYPE html>
<html><head><style>
  ${fontFaceBlock}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${videoWidth}px;
    height: ${videoHeight}px;
    background: transparent;
    overflow: hidden;
    position: relative;
  }
  .caption {
    position: absolute;
    top: ${yPercent}%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: ${maxTextWidth}px;
    font-family: ${fontFamilyCss};
    font-size: ${size}px;
    font-weight: 700;
    color: ${color};
    text-align: center;
    line-height: 1.25;
    paint-order: stroke fill;
    -webkit-text-stroke: ${strokeWidth}px ${stroke};
    text-shadow: none;
    word-break: break-word;
    white-space: pre-wrap;
  }
</style></head><body>
  <div class="caption">${escaped}</div>
</body></html>`;

  const browser = await getCaptionBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: videoWidth, height: videoHeight, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({ path: outputPath, omitBackground: true, type: "png" });
  } finally {
    await page.close();
  }
}

// ─── Layer 1: Metadata strip + GPS injection ────────────────────────────────

import { GPS_CITIES } from "./gps-cities";

function getMetadataArgs(rng: () => number, gpsCity?: string): string[] {
  // Find the selected city, or pick random
  let lat: number;
  let lon: number;
  if (gpsCity) {
    const city = GPS_CITIES.find((c) => c.id === gpsCity);
    if (city) {
      lat = city.lat;
      lon = city.lon;
    } else {
      const fallback = pick(rng, GPS_CITIES);
      lat = fallback.lat;
      lon = fallback.lon;
    }
  } else {
    const city = pick(rng, GPS_CITIES);
    lat = city.lat;
    lon = city.lon;
  }

  // Add jitter ±0.15° (~16km) so each variant has unique GPS
  const gpsLat = lat + uniform(rng, -0.15, 0.15);
  const gpsLon = lon + uniform(rng, -0.15, 0.15);

  // Random creation timestamp (2-year range from 2024)
  const baseMs = new Date("2024-01-01T00:00:00Z").getTime();
  const offsetMs = Math.floor(uniform(rng, 0, 365 * 2 * 86400) * 1000 + uniform(rng, 0, 86400000));
  const dt = new Date(baseMs + offsetMs);
  const creationTime = dt.toISOString().replace("Z", "") + "Z";

  const fmtLat = gpsLat >= 0 ? `+${gpsLat.toFixed(6)}` : gpsLat.toFixed(6);
  const fmtLon = gpsLon >= 0 ? `+${gpsLon.toFixed(6)}` : gpsLon.toFixed(6);

  return [
    "-map_metadata", "-1",
    "-metadata", `com.apple.quicktime.location.ISO6709=${fmtLat}${fmtLon}/`,
    "-metadata", `creation_time=${creationTime}`,
  ];
}

// ─── Layer 2: Spatial crop (pHash-aware: needs to shift content at 32x32 scale) ─

function getSpatialFilter(rng: () => number): string {
  // 2-6px crop — enough to shift DCT bin boundaries at 32x32 downscale
  const cropX = randInt(rng, 1, 3);
  const cropY = randInt(rng, 1, 3);
  const cropW = randInt(rng, 2, 6);
  const cropH = randInt(rng, 2, 6);
  return `crop=iw-${cropW}:ih-${cropH}:${cropX}:${cropY},setsar=1`;
}

// ─── Layer 3: Temporal trim + micro speed ───────────────────────────────────

function getTemporalTrimStart(rng: () => number): string[] {
  const trimStart = uniform(rng, 0.02, 0.1);
  return ["-ss", trimStart.toFixed(4)];
}

function getTemporalTrimEnd(rng: () => number): string[] {
  // Trim 0.05-0.15s from the end by shortening total duration
  const trimEnd = uniform(rng, 0.05, 0.15);
  return [trimEnd.toFixed(4)];
}

function getTemporalFilters(rng: () => number): { video: string; audio: string } {
  // ±0.15% speed change — subtle enough to keep music sounding identical
  const speedFactor = 1.0 + uniform(rng, -0.0015, 0.0015);
  const ptsFactor = 1.0 / speedFactor;
  return {
    video: `setpts=${ptsFactor.toFixed(6)}*PTS`,
    audio: `atempo=${speedFactor.toFixed(6)}`,
  };
}

// ─── Layer 4: Color adjustment (pHash-aware: shifts grayscale → DCT coefficients) ─

function getColorFilter(rng: () => number): string {
  // Tight ranges — imperceptible but still shifts DCT coefficients
  const gamma = uniform(rng, 0.99, 1.01).toFixed(4);
  const contrast = uniform(rng, 0.995, 1.005).toFixed(4);
  const brightness = uniform(rng, -0.008, 0.008).toFixed(4);
  const saturation = uniform(rng, 0.995, 1.005).toFixed(4);
  return `eq=gamma=${gamma}:contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`;
}

// ─── Layer 5: Adversarial noise ─────────────────────────────────────────────

function getNoiseFilter(rng: () => number): string {
  const strength = randInt(rng, 1, 2); // vary per variant
  const flags = "t"; // temporal-only — no grain on static areas (walls, skin)
  return `noise=alls=${strength}:allf=${flags}`;
}

// ─── Layer 6: Codec variation + framerate shift ─────────────────────────────

function getCodecArgs(rng: () => number, baseCrf: number = 18): string[] {
  const crf = Math.max(16, Math.min(20, baseCrf + pick(rng, [0, 0, 0, 1])));
  const gop = pick(rng, [24, 30, 48, 60, 72, 90, 120]);
  const profile = pick(rng, ["main", "high", "high"]);
  const level = pick(rng, ["4.0", "4.1", "4.2", "5.0", "5.1"]);
  const preset = pick(rng, ["veryfast", "veryfast", "fast"]);
  const bf = pick(rng, [1, 2, 3]);
  const refs = pick(rng, [1, 2, 3, 4]);
  // Micro framerate variation — shifts which frames align with platform sampling points
  const fps = pick(rng, ["29.97", "30", "30", "30.03", "29.95"]);

  return [
    "-c:v", "libx264",
    "-crf", String(crf),
    "-preset", preset,
    "-profile:v", profile,
    "-level:v", level,
    "-g", String(gop),
    "-bf", String(bf),
    "-refs", String(refs),
    "-r", fps,
  ];
}

// ─── Layer 7: Audio codec variation ──────────────────────────────────────────

function getAudioArgs(rng: () => number): { args: string[]; sampleRate: number } {
  const sampleRate = pick(rng, [44100, 48000, 44100, 48000]);
  const bitrate = pick(rng, ["128k", "160k", "192k", "224k", "256k"]);
  return {
    args: ["-c:a", "aac", "-ar", String(sampleRate), "-b:a", bitrate, "-ac", "2"],
    sampleRate,
  };
}

// ─── Layer 7b: Audio noise injection ─────────────────────────────────────────

function getAudioNoiseFilter(rng: () => number): string {
  // Very faint noise — 0.0003-0.001, inaudible on music
  // Use val(ch)+random(ch) to preserve stereo (val(0)+c=same would collapse L/R to mono)
  const noiseVol = uniform(rng, 0.0003, 0.001).toFixed(5);
  return `aeval='val(ch)+random(ch)*${noiseVol}'`;
}

// ─── Layer 21: Audio EQ randomisation (anti-Shazam) ──────────────────────────

function getAudioEqFilters(rng: () => number): string[] {
  // Very subtle EQ — ±0.5dB max so music sounds identical
  const filters: string[] = [];

  const bassFreq = randInt(rng, 60, 250);
  const bassGain = uniform(rng, -0.5, 0.5);
  filters.push(`equalizer=f=${bassFreq}:t=h:w=200:g=${bassGain.toFixed(2)}`);

  const midFreq = randInt(rng, 800, 3000);
  const midGain = uniform(rng, -0.5, 0.5);
  filters.push(`equalizer=f=${midFreq}:t=h:w=500:g=${midGain.toFixed(2)}`);

  const trebleFreq = randInt(rng, 4000, 12000);
  const trebleGain = uniform(rng, -0.5, 0.5);
  filters.push(`equalizer=f=${trebleFreq}:t=h:w=2000:g=${trebleGain.toFixed(2)}`);

  return filters;
}

// ─── Layer 22: Audio pitch micro-shift (anti-AudioID) ────────────────────────

function getAudioPitchFilter(rng: () => number, targetSampleRate: number = 48000): string {
  // ±0.2% pitch shift — imperceptible on music, still shifts frequency peaks
  const pitchShift = uniform(rng, -0.002, 0.002);
  const rate = Math.round(targetSampleRate * (1 + pitchShift));
  return `asetrate=${rate},aresample=${targetSampleRate}`;
}

// ─── Layer 8: Binary padding (post-FFmpeg) ──────────────────────────────────

async function applyBinaryPadding(filePath: string, variantIndex: number): Promise<void> {
  const rng = mulberry32(seedFromIndex(variantIndex, "binary"));
  const padSize = 64 + Math.floor(rng() * 193);
  const randomPad = crypto.randomBytes(padSize);

  // Build a valid MP4 "free" atom and append at end of file.
  // Appending (not inserting) avoids corrupting moov chunk offsets.
  const atomSize = 8 + padSize;
  const sizeBuffer = Buffer.alloc(4);
  sizeBuffer.writeUInt32BE(atomSize, 0);
  const freeAtom = Buffer.concat([sizeBuffer, Buffer.from("free"), randomPad]);

  await fs.appendFile(filePath, freeAtom);
}

// ─── Layer 9: Vignette (pHash-aware: low-freq spatial change → DCT impact) ───

function getVignetteFilter(rng: () => number): string {
  // Subtle vignette — low-frequency spatial change for pHash disruption
  const angle = uniform(rng, 0.06, 0.14); // radians — capped to avoid visible darkening on bright backgrounds
  return `vignette=a=${angle.toFixed(3)}`;
}

// ─── Layer 10: Zoom (pHash-aware: resamples pixel grid → shifts DCT bins) ────

function getZoomFilter(rng: () => number): string {
  // 1-2.5% zoom — shifts pixel grid mapping with minimal resampling artifacts
  const zoomFactor = uniform(rng, 1.01, 1.025);
  const z = zoomFactor.toFixed(4);
  return `scale=iw*${z}:ih*${z}:flags=lanczos,crop=iw/${z}:ih/${z}`;
}

// ─── Layer 11: Rotation (pHash-aware: shifts spatial content → DCT change) ───

function getRotationFilter(rng: () => number): string {
  // 0.1-0.3 degrees — shifts pixel positions at 32x32 scale without visible softening
  // Use ow=iw:oh=ih to crop to original size (avoids black corner artifacts from fillcolor)
  const degrees = uniform(rng, 0.1, 0.3);
  const sign = rng() > 0.5 ? 1 : -1;
  const radians = (sign * degrees * Math.PI) / 180;
  return `rotate=${radians.toFixed(6)}:ow=iw:oh=ih:fillcolor=black@0`;
}

// ─── Layer 12: Random resolution ─────────────────────────────────────────────

function getRandomResolutionFilter(rng: () => number): string {
  // ±2-4px — forces different resampling kernel when pHash downscales to 32x32
  const dw = randInt(rng, 1, 2) * 2; // 2 or 4 pixels
  const dh = randInt(rng, 1, 2) * 2;
  const wExpr = rng() > 0.5 ? `iw+${dw}` : `iw-${dw}`;
  const hExpr = rng() > 0.5 ? `ih+${dh}` : `ih-${dh}`;
  return `scale=${wExpr}:${hExpr}:flags=lanczos`;
}

// ─── Layer 14: Pixel shift (hue micro-rotation) ────────────────────────────

function getPixelShiftFilter(rng: () => number): string {
  // Micro hue rotation: 0.2-0.8 degrees (imperceptible color shift)
  const degrees = uniform(rng, 0.2, 0.8);
  const sign = rng() > 0.5 ? 1 : -1;
  return `hue=h=${(sign * degrees).toFixed(2)}`;
}

// ─── Layer 15: Volume micro-adjustment ──────────────────────────────────────

function getVolumeFilter(rng: () => number): string {
  // Adjust volume by ±2% (imperceptible)
  const vol = uniform(rng, 0.98, 1.02);
  return `volume=${vol.toFixed(4)}`;
}

// ─── Layer 16: Waveform shift (audio delay) ─────────────────────────────────

function getWaveformShiftFilter(rng: () => number): string {
  // Shift audio waveform by 1-5ms (imperceptible phase shift)
  const delayMs = uniform(rng, 1, 5);
  // adelay: delay in milliseconds for all channels
  return `adelay=${delayMs.toFixed(1)}|${delayMs.toFixed(1)}`;
}

// ─── Layer 17: Lens correction ──────────────────────────────────────────────

function getLensCorrectionFilter(rng: () => number): string {
  // Barrel/pincushion micro-distortion (k1 and k2 coefficients)
  // Very small values = imperceptible
  const k1 = uniform(rng, -0.01, 0.01);
  const k2 = uniform(rng, -0.005, 0.005);
  return `lenscorrection=k1=${k1.toFixed(5)}:k2=${k2.toFixed(5)}`;
}

// ─── Layer 23: Perspective distortion (trapezoid warp → spatial shift) ───────

function getPerspectiveFilter(rng: () => number): string {
  // Very subtle trapezoidal distortion — shifts corner positions by 1-3px.
  // Remaps source pixels at 32x32 downscale without visible distortion.
  const x0 = randInt(rng, 1, 3);
  const y0 = randInt(rng, 1, 3);
  const x1 = randInt(rng, 1, 3);
  const y1 = randInt(rng, 1, 3);
  const x2 = randInt(rng, 1, 3);
  const y2 = randInt(rng, 1, 3);
  const x3 = randInt(rng, 1, 3);
  const y3 = randInt(rng, 1, 3);
  return `perspective=${x0}:${y0}:W-${x1}:${y1}:${x2}:H-${y2}:W-${x3}:H-${y3}:interpolation=linear`;
}

// ─── Layer 24: Color channel mixer (inter-channel bleed → unique color fingerprint) ─

function getColorMixerFilter(rng: () => number): string {
  // Mix small amounts of each color channel into the others (1.5-3.5%).
  // This creates a unique color fingerprint per variant that survives pHash's
  // grayscale conversion (because grayscale = 0.299R + 0.587G + 0.114B,
  // so channel mixing shifts the final luma values).
  const rg = uniform(rng, -0.015, 0.015);
  const rb = uniform(rng, -0.015, 0.015);
  const gr = uniform(rng, -0.015, 0.015);
  const gb = uniform(rng, -0.015, 0.015);
  const br = uniform(rng, -0.015, 0.015);
  const bg = uniform(rng, -0.015, 0.015);
  return `colorchannelmixer=rr=1:rg=${rg.toFixed(4)}:rb=${rb.toFixed(4)}:gr=${gr.toFixed(4)}:gg=1:gb=${gb.toFixed(4)}:br=${br.toFixed(4)}:bg=${bg.toFixed(4)}:bb=1`;
}

// ─── Layer 17: Flip (pHash killer — completely inverts DCT coefficients) ─────

function getFlipFilter(rng: () => number): string | null {
  // ~40% chance — horizontal flip completely changes all DCT coefficients
  // This is the single most effective pHash breaker
  if (rng() < 0.40) {
    return "hflip";
  }
  return null;
}

// ─── Layer 18: Gaussian blur (pHash-aware: directly shifts low-freq DCT) ─────

function getGaussianBlurFilter(rng: () => number): string {
  // Imperceptible blur σ 0.1-0.2 — shifts DCT coefficients, invisible to the eye
  const sigma = uniform(rng, 0.1, 0.2);
  return `gblur=sigma=${sigma.toFixed(2)}`;
}

// ─── Layer 19: DCT adversarial (low-freq luminance pattern via geq) ──────────

function getDctAdversarialFilter(rng: () => number): string {
  // Add a smooth sinusoidal luminance pattern — pure low-frequency energy.
  // At 32x32 downscale, this maps directly onto the DCT basis functions pHash uses.
  // Amplitude 2-4 out of 255 = imperceptible but shifts DCT coefficients.
  const amp = uniform(rng, 1.5, 3).toFixed(1);
  // Random frequency multiplier (1-3) to target different DCT basis vectors
  const freqX = randInt(rng, 1, 3);
  const freqY = randInt(rng, 1, 3);
  // Random phase offset so each variant has unique pattern
  const phaseX = uniform(rng, 0, 6.28).toFixed(2);
  const phaseY = uniform(rng, 0, 6.28).toFixed(2);
  // Use full range [0,255] — clamping to [16,235] would crush blacks/whites on full-range content
  return `geq=lum='clip(lum(X,Y)+${amp}*sin(${freqX}*X*PI/W+${phaseX})*sin(${freqY}*Y*PI/H+${phaseY}),0,255)':cb='cb(X,Y)':cr='cr(X,Y)'`;
}

// ─── Layer 20: Unsharp mask (counter blur + add frequency variation) ─────────

function getUnsharpFilter(rng: () => number): string {
  // Micro sharpen — just enough to counter the blur, no visible halos
  const amount = uniform(rng, 0.05, 0.15);
  return `unsharp=5:5:${amount.toFixed(2)}:5:5:0`;
}

// ─── Image FFmpeg command builder ───────────────────────────────────────────

/**
 * Image-specific FFmpeg command builder.
 *
 * KEY DIFFERENCE vs video: no temporal masking on static images, so every
 * pixel-level change is directly visible. All ranges are 3-5x tighter than
 * the video pipeline. We rely primarily on:
 *   - Spatial transforms (crop, zoom, rotation) → shift pHash DCT bins
 *   - Horizontal flip → completely inverts pHash
 *   - Micro color (very tight) → shift grayscale luma just enough
 *   - DCT adversarial at amplitude ≤1 → below perception threshold on stills
 *
 * Removed/reduced for images:
 *   - No uniform noise (very visible on flat areas like skin/sky)
 *   - No perspective warp (introduces visible straight-line distortion)
 *   - No vignette (noticeable darkening on photos)
 *   - Color channel mixer reduced to ≤0.3% (was 1.5%)
 *   - Hue shift reduced to ≤0.15° (was 0.2-0.8°)
 *   - DCT adversarial amplitude ≤0.8 (was 1.5-3)
 *   - Blur σ ≤0.12 (was 0.1-0.2)
 */
export function buildImageFfmpegCommand(
  sourcePath: string,
  outputPath: string,
  variantIndex: number,
  gpsCity?: string,
  captionPngPath?: string,
): string[] {
  const rng = mulberry32(seedFromIndex(variantIndex));

  const cmd: string[] = [FFMPEG_PATH, "-y"];

  // Input 0: source image
  cmd.push("-i", sourcePath);

  // Track caption overlay input index
  let captionInputIdx: number | null = null;
  if (captionPngPath) {
    cmd.push("-i", captionPngPath);
    captionInputIdx = 1;
  }

  // === Build image filter chain ===
  // Tuned for pHash distance ≥ 10 while maintaining SSIM ≥ 0.995.
  // pHash = 32x32 grayscale → 2D DCT → 8x8 low-freq → 64-bit hash.
  // Key insight: we need spatial shifts + low-freq luminance changes.
  const filters: string[] = [];

  // Spatial crop: 4-10px — most effective pHash lever (shifts content at 32x32 grid)
  // On a 4000px image, 10px = 0.25% — invisible to viewers
  const cropX = randInt(rng, 1, 4);
  const cropY = randInt(rng, 1, 4);
  const cropW = randInt(rng, 4, 10);
  const cropH = randInt(rng, 4, 10);
  filters.push(`crop=iw-${cropW}:ih-${cropH}:${cropX}:${cropY},setsar=1`);

  // Zoom: 1-2.5% — resamples pixel grid (shifts all spatial frequencies)
  const zoomFactor = uniform(rng, 1.01, 1.025);
  const z = zoomFactor.toFixed(4);
  filters.push(`scale=iw*${z}:ih*${z}:flags=lanczos,crop=iw/${z}:ih/${z}`);

  // Resolution: ±2-4px
  const dw = randInt(rng, 2, 4);
  const dh = randInt(rng, 2, 4);
  const wExpr = rng() > 0.5 ? `iw+${dw}` : `iw-${dw}`;
  const hExpr = rng() > 0.5 ? `ih+${dh}` : `ih-${dh}`;
  filters.push(`scale=${wExpr}:${hExpr}:flags=lanczos`);

  // Rotation: 0.1-0.3° — shifts spatial content within 32x32 grid
  const rotDeg = uniform(rng, 0.1, 0.3);
  const rotSign = rng() > 0.5 ? 1 : -1;
  const rotRad = (rotSign * rotDeg * Math.PI) / 180;
  filters.push(`rotate=${rotRad.toFixed(6)}:ow=iw:oh=ih:fillcolor=black@0`);

  // Color: gamma ±0.008, contrast ±0.004 — shifts grayscale that feeds DCT
  // Visually imperceptible but shifts the 32x32 grayscale values
  const gamma = uniform(rng, 0.992, 1.008).toFixed(4);
  const contrast = uniform(rng, 0.996, 1.004).toFixed(4);
  const brightness = uniform(rng, -0.004, 0.004).toFixed(4);
  const saturation = uniform(rng, 0.997, 1.003).toFixed(4);
  filters.push(`eq=gamma=${gamma}:contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`);

  // Hue: 0.1-0.4° — subtle color rotation
  const hueDeg = uniform(rng, 0.1, 0.4);
  const hueSign = rng() > 0.5 ? 1 : -1;
  filters.push(`hue=h=${(hueSign * hueDeg).toFixed(3)}`);

  // Color channel mixer: ≤0.5% bleed
  const cmRg = uniform(rng, -0.005, 0.005);
  const cmRb = uniform(rng, -0.005, 0.005);
  const cmGr = uniform(rng, -0.005, 0.005);
  const cmGb = uniform(rng, -0.005, 0.005);
  const cmBr = uniform(rng, -0.005, 0.005);
  const cmBg = uniform(rng, -0.005, 0.005);
  filters.push(`colorchannelmixer=rr=1:rg=${cmRg.toFixed(4)}:rb=${cmRb.toFixed(4)}:gr=${cmGr.toFixed(4)}:gg=1:gb=${cmGb.toFixed(4)}:br=${cmBr.toFixed(4)}:bg=${cmBg.toFixed(4)}:bb=1`);

  // Lens correction: subtle barrel/pincushion (redistributes spatial content)
  const k1 = uniform(rng, -0.008, 0.008);
  const k2 = uniform(rng, -0.003, 0.003);
  filters.push(`lenscorrection=k1=${k1.toFixed(5)}:k2=${k2.toFixed(5)}`);

  // No horizontal flip for images — mirror effect is obvious on photos
  rng(); // consume the RNG slot to keep seed alignment consistent

  // Blur: σ 0.08-0.18 — gentle smoothing (shifts high-freq → affects DCT)
  const sigma = uniform(rng, 0.08, 0.18);
  filters.push(`gblur=sigma=${sigma.toFixed(3)}`);

  // DCT adversarial: amplitude 1.5-3.5 — directly targets pHash DCT basis
  // Adds low-freq sinusoidal luminance pattern. On a photo this is invisible
  // because natural image content masks the pattern, but it shifts DCT coefficients.
  const dctAmp = uniform(rng, 1.5, 3.5).toFixed(2);
  const freqX = randInt(rng, 1, 3);
  const freqY = randInt(rng, 1, 3);
  const phaseX = uniform(rng, 0, 6.28).toFixed(2);
  const phaseY = uniform(rng, 0, 6.28).toFixed(2);
  filters.push(`geq=lum='clip(lum(X,Y)+${dctAmp}*sin(${freqX}*X*PI/W+${phaseX})*sin(${freqY}*Y*PI/H+${phaseY}),0,255)':cb='cb(X,Y)':cr='cr(X,Y)'`);

  // Unsharp: gentle counter to blur
  const unsharpAmt = uniform(rng, 0.05, 0.12);
  filters.push(`unsharp=5:5:${unsharpAmt.toFixed(3)}:5:5:0`);

  // Force even dimensions for codec compatibility
  filters.push("crop=trunc(iw/2)*2:trunc(ih/2)*2");

  if (captionInputIdx !== null) {
    const vfChain = filters.join(",");
    const fc = `[0:v]${vfChain}[processed];[processed][${captionInputIdx}:v]overlay=0:0[captioned]`;
    cmd.push("-filter_complex", fc, "-map", "[captioned]");
  } else {
    cmd.push("-vf", filters.join(","));
  }

  // No audio for images
  cmd.push("-an");

  // Ensure single-frame output
  cmd.push("-frames:v", "1", "-update", "1");

  // Layer 1: Metadata spoofing
  cmd.push(...getMetadataArgs(rng, gpsCity));

  // JPEG quality: 1-2 (maximum quality — preserve source fidelity)
  const jpegQuality = randInt(rng, 1, 2);
  cmd.push("-q:v", String(jpegQuality));

  // Output
  cmd.push(outputPath);

  return cmd;
}

// ─── Image dimensions via sharp ─────────────────────────────────────────────

async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require("sharp") as typeof import("sharp");
    const metadata = await Promise.race([
      sharp(imagePath).metadata(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("sharp metadata timeout")), 15_000)),
    ]);
    return { width: metadata.width || 1080, height: metadata.height || 1920 };
  } catch (err) {
    console.warn(`[getImageDimensions] Failed for ${imagePath}:`, err);
    return { width: 1080, height: 1920 };
  }
}

// ─── Image thumbnail generation ─────────────────────────────────────────────

async function generateImageThumbnail(imagePath: string, outputPath: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require("sharp") as typeof import("sharp");
  await sharp(imagePath)
    .resize(320, undefined, { fit: "inside" })
    .jpeg({ quality: 80 })
    .toFile(outputPath);
}

// ─── Image variant generation ───────────────────────────────────────────────

async function generateImageVariant(
  sourcePath: string,
  outputDir: string,
  variantIndex: number,
  gpsCity?: string,
  caption?: CaptionOverlay,
  imageDimensions?: { width: number; height: number },
  sourcePhash?: string,
): Promise<VariantResult> {
  const outputPath = path.join(outputDir, `variant_${String(variantIndex).padStart(3, "0")}.jpg`);
  let captionPngPath: string | undefined;
  const thumbPath = path.join(outputDir, `thumb_${String(variantIndex).padStart(3, "0")}.jpg`);

  try {
    console.log(`[img-variant ${variantIndex}] Starting image variant generation`);

    // Generate caption overlay PNG if caption is provided
    if (caption && caption.text.trim()) {
      console.log(`[img-variant ${variantIndex}] Generating caption PNG...`);
      const dims = imageDimensions || await getImageDimensions(sourcePath);
      captionPngPath = path.join(outputDir, `caption_${variantIndex}.png`);
      await generateCaptionPng(caption, dims.width, dims.height, captionPngPath);
      console.log(`[img-variant ${variantIndex}] Caption PNG generated`);
    }

    // Retry loop for pHash distance
    let phash: string | null = null;
    let phashDistance: number | null = null;

    for (let attempt = 0; attempt <= PHASH_MAX_RETRIES; attempt++) {
      const effectiveIndex = attempt === 0 ? variantIndex : variantIndex + 1000 * attempt;

      const cmd = buildImageFfmpegCommand(sourcePath, outputPath, effectiveIndex, gpsCity, captionPngPath);
      const [binary, ...args] = cmd;

      console.log(`[img-variant ${variantIndex}] FFmpeg attempt ${attempt}, running...`);
      const t0 = Date.now();
      try {
        const { stderr } = await execFileAsync(binary, args, { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
        console.log(`[img-variant ${variantIndex}] FFmpeg done in ${Date.now() - t0}ms`);
        if (stderr && stderr.includes("Error")) {
          console.warn(`[img-variant ${variantIndex}] FFmpeg stderr warnings:`, stderr.slice(0, 500));
        }
      } catch (ffErr: unknown) {
        const ffMsg = ffErr instanceof Error ? ffErr.message : String(ffErr);
        const ffStderr = (ffErr as { stderr?: string })?.stderr?.slice(0, 1000) || "";
        console.error(`[img-variant ${variantIndex}] FFmpeg FAILED:`, ffMsg, ffStderr);
        throw new Error(`FFmpeg failed: ${ffMsg}${ffStderr ? ` | ${ffStderr}` : ""}`);
      }

      // Verify output exists
      try {
        const stat = await fs.stat(outputPath);
        console.log(`[img-variant ${variantIndex}] Output file: ${stat.size} bytes`);
        if (stat.size === 0) throw new Error("FFmpeg produced empty output");
      } catch (statErr) {
        console.error(`[img-variant ${variantIndex}] Output file missing or empty`);
        throw statErr;
      }

      // Compute pHash directly on output image (no frame extraction needed)
      if (sourcePhash) {
        try {
          phash = await computePhash(outputPath);
          phashDistance = hammingDistance(sourcePhash, phash);
          console.log(`[img-variant ${variantIndex}] pHash distance: ${phashDistance}`);

          if (phashDistance >= PHASH_MIN_DISTANCE) break;
        } catch {
          break;
        }
      } else {
        break;
      }
    }

    const hash = await computeFileHash(outputPath);

    // Generate thumbnail using sharp
    let thumbnailPath: string | null = null;
    try {
      await generateImageThumbnail(outputPath, thumbPath);
      thumbnailPath = thumbPath;
    } catch {
      // Non-fatal
    }

    console.log(`[img-variant ${variantIndex}] Complete: hash=${hash?.slice(0, 12)}, phashDist=${phashDistance}`);
    return { variantIndex, outputPath, success: true, hash, phash, phashDistance, thumbnailPath, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[img-variant ${variantIndex}] FAILED:`, msg);
    return { variantIndex, outputPath: "", success: false, hash: null, phash: null, phashDistance: null, thumbnailPath: null, error: msg };
  } finally {
    if (captionPngPath) {
      await fs.unlink(captionPngPath).catch(() => {});
    }
  }
}

// ─── Video FFmpeg command builder ───────────────────────────────────────────

export function buildFfmpegCommand(
  sourcePath: string,
  outputPath: string,
  variantIndex: number,
  sourceDuration?: number,
  gpsCity?: string,
  captionPngPath?: string,
  hasAudio: boolean = true,
): string[] {
  const rng = mulberry32(seedFromIndex(variantIndex));

  const cmd: string[] = [FFMPEG_PATH, "-y"];

  // Layer 3: Temporal trim from start (input-level)
  cmd.push(...getTemporalTrimStart(rng));

  // Input 0: source video
  cmd.push("-i", sourcePath);

  // Track caption overlay input index
  let captionInputIdx: number | null = null;

  // Input for caption overlay PNG
  if (captionPngPath) {
    cmd.push("-i", captionPngPath);
    captionInputIdx = 1;
  }

  // Layer 3: Temporal trim from end — limit duration
  const trimEnd = getTemporalTrimEnd(rng);
  if (sourceDuration && sourceDuration > 1) {
    const maxDur = sourceDuration - parseFloat(trimEnd[0]);
    if (maxDur > 0.5) {
      cmd.push("-t", maxDur.toFixed(4));
    }
  }

  // === Build video filter chain ===
  const temporal = getTemporalFilters(rng);
  const videoFilters: string[] = [];

  // Layer 2: Spatial micro-crop
  videoFilters.push(getSpatialFilter(rng));

  // Layer 11: Zoom (scale up + crop back)
  videoFilters.push(getZoomFilter(rng));

  // Layer 13: Random resolution (slight dimension variation)
  videoFilters.push(getRandomResolutionFilter(rng));

  // Layer 12: Micro-rotation
  videoFilters.push(getRotationFilter(rng));

  // Layer 23: Perspective distortion (trapezoidal warp)
  videoFilters.push(getPerspectiveFilter(rng));

  // Layer 3: Temporal speed adjustment
  videoFilters.push(temporal.video);

  // Layer 4: Color micro-adjustment
  videoFilters.push(getColorFilter(rng));

  // Layer 14: Pixel shift (hue micro-rotation)
  videoFilters.push(getPixelShiftFilter(rng));

  // Layer 24: Color channel mixer (inter-channel bleed)
  videoFilters.push(getColorMixerFilter(rng));

  // Layer 10: Vignette
  videoFilters.push(getVignetteFilter(rng));

  // Layer 5: Micro noise (temporal-only — invisible on still surfaces)
  videoFilters.push(getNoiseFilter(rng));

  // Layer 16: Lens correction
  videoFilters.push(getLensCorrectionFilter(rng));

  // Layer 17: Horizontal flip (~40% chance — pHash killer)
  const flipFilter = getFlipFilter(rng);
  if (flipFilter) videoFilters.push(flipFilter);

  // Layer 18: Micro blur (imperceptible)
  videoFilters.push(getGaussianBlurFilter(rng));

  // Layer 19: DCT adversarial pattern (targets pHash DCT basis functions)
  videoFilters.push(getDctAdversarialFilter(rng));

  // Layer 20: Micro sharpen (counters blur)
  videoFilters.push(getUnsharpFilter(rng));

  // Force even dimensions for h264 (after all spatial transforms)
  videoFilters.push("crop=trunc(iw/2)*2:trunc(ih/2)*2");

  // === Build audio filter chain ===
  const audioFilters: string[] = [];

  // Resolve audio encoding args early so we can pass sampleRate to pitch filter
  const audioEncoding = getAudioArgs(rng);

  // Layer 22: Pitch micro-shift (anti-AudioID — shifts all frequency peaks)
  audioFilters.push(getAudioPitchFilter(rng, audioEncoding.sampleRate));

  // Layer 3: Audio tempo (matches video speed — ±0.8% now)
  audioFilters.push(temporal.audio);

  // Layer 21: EQ randomisation (anti-Shazam — shifts spectrogram constellation)
  audioFilters.push(...getAudioEqFilters(rng));

  // Layer 15: Volume micro-adjustment
  audioFilters.push(getVolumeFilter(rng));

  // Layer 16: Waveform shift (phase delay)
  audioFilters.push(getWaveformShiftFilter(rng));

  // Layer 7b: Audio noise injection (stronger)
  audioFilters.push(getAudioNoiseFilter(rng));

  if (captionInputIdx !== null) {
    // Use filter_complex for caption overlay
    const vfChain = videoFilters.join(",");
    let fc = `[0:v]${vfChain}[processed]`;
    fc += `;[processed][${captionInputIdx}:v]overlay=0:0[captioned]`;

    if (hasAudio) {
      const afChain = audioFilters.join(",");
      fc += `;[0:a]${afChain}[aout]`;
      cmd.push("-filter_complex", fc, "-map", "[captioned]", "-map", "[aout]");
    } else {
      cmd.push("-filter_complex", fc, "-map", "[captioned]", "-an");
    }
  } else {
    // Simple mode: -vf and -af
    cmd.push("-vf", videoFilters.join(","));
    if (hasAudio) {
      cmd.push("-af", audioFilters.join(","));
    } else {
      cmd.push("-an");
    }
  }

  // Layer 7: Audio encoding args
  if (hasAudio) {
    cmd.push(...audioEncoding.args);
  }

  // Layer 1: Metadata spoofing (GPS city)
  cmd.push(...getMetadataArgs(rng, gpsCity));

  // Container flags
  cmd.push("-movflags", "+faststart");

  // Layer 6: Codec variation
  cmd.push(...getCodecArgs(rng));

  // Output
  cmd.push(outputPath);

  return cmd;
}

// ─── Probe source info ───────────────────────────────────────────────────────

async function getVideoDuration(sourcePath: string): Promise<number> {
  const ffprobePath = FFMPEG_PATH.replace("ffmpeg", "ffprobe");
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      sourcePath,
    ], { timeout: 10_000 });
    const dur = parseFloat(stdout.trim());
    return isNaN(dur) ? 0 : dur;
  } catch {
    return 0;
  }
}

async function getHasAudio(sourcePath: string): Promise<boolean> {
  const ffprobePath = FFMPEG_PATH.replace("ffmpeg", "ffprobe");
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "quiet",
      "-select_streams", "a",
      "-show_entries", "stream=codec_type",
      "-of", "csv=p=0",
      sourcePath,
    ], { timeout: 10_000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function getVideoDimensions(sourcePath: string): Promise<{ width: number; height: number }> {
  const ffprobePath = FFMPEG_PATH.replace("ffmpeg", "ffprobe");
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "quiet",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x",
      sourcePath,
    ], { timeout: 10_000 });
    const [w, h] = stdout.trim().split("x").map(Number);
    return { width: w || 1080, height: h || 1920 };
  } catch {
    return { width: 1080, height: 1920 };
  }
}

// ─── Thumbnail generation ────────────────────────────────────────────────────

async function generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-ss", "0.5",
    "-i", videoPath,
    "-vframes", "1",
    "-vf", "scale=320:-1",
    "-q:v", "3",
    outputPath,
  ], { timeout: 15_000 });
}

// ─── Main generation function ───────────────────────────────────────────────

export interface VariantResult {
  variantIndex: number;
  outputPath: string;
  success: boolean;
  hash: string | null;
  phash: string | null;
  phashDistance: number | null;
  thumbnailPath: string | null;
  error: string | null;
}

async function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = createReadStream(filePath);
    stream.on("data", (d) => hash.update(d));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

const PHASH_MIN_DISTANCE = 10;
const PHASH_MAX_RETRIES = 2;

export async function generateVariant(
  sourcePath: string,
  outputDir: string,
  variantIndex: number,
  sourceDuration?: number,
  gpsCity?: string,
  caption?: CaptionOverlay,
  videoDimensions?: { width: number; height: number },
  sourcePhash?: string,
  hasAudio: boolean = true,
): Promise<VariantResult> {
  const outputPath = path.join(outputDir, `variant_${String(variantIndex).padStart(3, "0")}.mp4`);
  let captionPngPath: string | undefined;
  const thumbPath = path.join(outputDir, `thumb_${String(variantIndex).padStart(3, "0")}.jpg`);
  const variantFramePath = path.join(outputDir, `frame_${variantIndex}.png`);

  try {
    // Generate caption overlay PNG if caption is provided
    if (caption && caption.text.trim()) {
      const dims = videoDimensions || await getVideoDimensions(sourcePath);
      captionPngPath = path.join(outputDir, `caption_${variantIndex}.png`);
      await generateCaptionPng(caption, dims.width, dims.height, captionPngPath);
    }

    // Retry loop: if pHash distance is too low, regenerate with a shifted seed
    let phash: string | null = null;
    let phashDistance: number | null = null;
    let attempt = 0;

    for (attempt = 0; attempt <= PHASH_MAX_RETRIES; attempt++) {
      // Use shifted variant index on retries to get different PRNG params
      const effectiveIndex = attempt === 0 ? variantIndex : variantIndex + 1000 * attempt;

      const cmd = buildFfmpegCommand(sourcePath, outputPath, effectiveIndex, sourceDuration, gpsCity, captionPngPath, hasAudio);
      const [binary, ...args] = cmd;

      await execFileAsync(binary, args, { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });

      // Layer 8: Binary padding (post-FFmpeg)
      await applyBinaryPadding(outputPath, effectiveIndex);

      // Compute pHash + distance
      if (sourcePhash) {
        try {
          await extractFrame(outputPath, variantFramePath);
          phash = await computePhash(variantFramePath);
          phashDistance = hammingDistance(sourcePhash, phash);
          await fs.unlink(variantFramePath).catch(() => {});

          if (phashDistance >= PHASH_MIN_DISTANCE) break; // Good enough
          // Too similar — retry with different seed
        } catch {
          await fs.unlink(variantFramePath).catch(() => {});
          break; // Can't compute pHash, accept the variant as-is
        }
      } else {
        break; // No source pHash to compare against
      }
    }

    const hash = await computeFileHash(outputPath);

    // Generate thumbnail
    let thumbnailPath: string | null = null;
    try {
      await generateThumbnail(outputPath, thumbPath);
      thumbnailPath = thumbPath;
    } catch {
      // Non-fatal
    }

    return { variantIndex, outputPath, success: true, hash, phash, phashDistance, thumbnailPath, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { variantIndex, outputPath: "", success: false, hash: null, phash: null, phashDistance: null, thumbnailPath: null, error: msg };
  } finally {
    if (captionPngPath) {
      await fs.unlink(captionPngPath).catch(() => {});
    }
  }
}

export async function generateAllVariants(
  sourcePath: string,
  outputDir: string,
  variantCount: number,
  gpsCity?: string,
  captions?: CaptionOverlay[],
  onProgress?: (completed: number, total: number, result: VariantResult) => void | Promise<void>,
  startIndex: number = 1,
  isImage: boolean = false,
): Promise<VariantResult[]> {
  await fs.mkdir(outputDir, { recursive: true });

  const hasCaptions = captions && captions.length > 0;

  let duration = 0;
  let hasAudio = false;
  let dims: { width: number; height: number };
  let sourcePhash: string | undefined;

  if (isImage) {
    // Image: get dimensions via sharp, compute pHash directly on source
    console.log(`[generateAll] Image mode — getting dimensions for: ${sourcePath}`);
    dims = await getImageDimensions(sourcePath);
    console.log(`[generateAll] Dimensions: ${dims.width}x${dims.height}`);
    try {
      console.log(`[generateAll] Computing source pHash...`);
      sourcePhash = await Promise.race([
        computePhash(sourcePath),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("pHash timeout")), 15_000)),
      ]);
      console.log(`[generateAll] Source pHash: ${sourcePhash}`);
    } catch (phashErr) {
      console.warn(`[generateAll] Source pHash failed (non-fatal):`, phashErr);
    }
  } else {
    // Video: probe duration, dimensions, and audio
    const [d, a, dm] = await Promise.all([
      getVideoDuration(sourcePath),
      getHasAudio(sourcePath),
      getVideoDimensions(sourcePath),
    ]);
    duration = d;
    hasAudio = a;
    dims = dm;

    // Extract source frame once for pHash comparison
    const sourceFramePath = path.join(outputDir, "source_frame.png");
    try {
      await extractFrame(sourcePath, sourceFramePath);
      sourcePhash = await computePhash(sourceFramePath);
    } catch {
      // Non-fatal
    }
  }

  // Parallel execution — run multiple FFmpeg processes concurrently
  // Use half of CPU cores (FFmpeg itself is multi-threaded) with min 2, max 6
  const concurrency = Math.max(2, Math.min(6, Math.floor(os.cpus().length / 2)));
  const results: VariantResult[] = [];
  let completed = 0;

  // Build all variant tasks
  const indices = Array.from({ length: variantCount }, (_, k) => startIndex + k);

  // Process in batches of `concurrency`
  for (let batch = 0; batch < indices.length; batch += concurrency) {
    const batchIndices = indices.slice(batch, batch + concurrency);

    const batchResults = await Promise.all(
      batchIndices.map((i) => {
        const caption = hasCaptions
          ? (captions.length === 1 ? captions[0] : captions[(i - 1) % captions.length])
          : undefined;

        if (isImage) {
          return generateImageVariant(
            sourcePath, outputDir, i, gpsCity, caption, dims, sourcePhash,
          );
        }

        return generateVariant(
          sourcePath, outputDir, i, duration, gpsCity, caption, dims,
          sourcePhash, hasAudio,
        );
      }),
    );

    for (const result of batchResults) {
      results.push(result);
      completed++;
      if (onProgress) await onProgress(completed, variantCount, result);
    }
  }

  // Clean up temp files
  if (!isImage) {
    const sourceFramePath = path.join(outputDir, "source_frame.png");
    await fs.unlink(sourceFramePath).catch(() => {});
  }

  return results;
}
