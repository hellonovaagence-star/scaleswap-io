/**
 * pHash (perceptual hash) computation using sharp.
 *
 * Algorithm (matches phash.org spec):
 * 1. Resize to 32x32 grayscale
 * 2. Apply 2D DCT (Type II)
 * 3. Take top-left 8x8 low-frequency coefficients
 * 4. Compute median, threshold to 64-bit hash
 *
 * Hamming distance between two hashes = XOR + popcount.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { FFMPEG_PATH } from "./ffmpeg-path";

const execFileAsync = promisify(execFile);

/**
 * Extract a single frame from a video at the given offset (seconds).
 */
export async function extractFrame(
  videoPath: string,
  outputPath: string,
  offsetSec: number = 0.5,
): Promise<void> {
  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-ss", String(offsetSec),
    "-i", videoPath,
    "-vframes", "1",
    "-q:v", "2",
    outputPath,
  ], { timeout: 15_000 });
}

/**
 * 1D DCT Type-II (unscaled).
 * DCT-II: X[k] = sum_{n=0}^{N-1} x[n] * cos(pi/N * (n + 0.5) * k)
 */
function dct1d(input: Float64Array): Float64Array {
  const N = input.length;
  const output = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos((Math.PI / N) * (n + 0.5) * k);
    }
    output[k] = sum;
  }
  return output;
}

/**
 * Apply 2D DCT by applying 1D DCT to rows then columns.
 */
function dct2d(matrix: Float64Array[], size: number): Float64Array[] {
  // DCT on rows
  const rowDct: Float64Array[] = [];
  for (let r = 0; r < size; r++) {
    rowDct.push(dct1d(matrix[r]));
  }
  // DCT on columns
  const result: Float64Array[] = Array.from({ length: size }, () => new Float64Array(size));
  for (let c = 0; c < size; c++) {
    const col = new Float64Array(size);
    for (let r = 0; r < size; r++) {
      col[r] = rowDct[r][c];
    }
    const dctCol = dct1d(col);
    for (let r = 0; r < size; r++) {
      result[r][c] = dctCol[r];
    }
  }
  return result;
}

/**
 * Compute a 64-bit perceptual hash from an image file.
 * Returns a 16-character hex string (64 bits).
 */
export async function computePhash(imagePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require("sharp") as typeof import("sharp");

  // Resize to 32x32 grayscale
  const { data } = await sharp(imagePath)
    .resize(32, 32, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Build 32x32 matrix from raw pixel data
  const matrix: Float64Array[] = [];
  for (let r = 0; r < 32; r++) {
    const row = new Float64Array(32);
    for (let c = 0; c < 32; c++) {
      row[c] = data[r * 32 + c];
    }
    matrix.push(row);
  }

  // 2D DCT
  const dctResult = dct2d(matrix, 32);

  // Extract top-left 8x8 (excluding DC coefficient at [0][0])
  const lowFreq: number[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r === 0 && c === 0) continue; // skip DC
      lowFreq.push(dctResult[r][c]);
    }
  }

  // Median threshold
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Build 64-bit hash: bit 0 is DC position (always 0), bits 1-63 from low-freq
  let hash = BigInt(0);
  for (let i = 0; i < lowFreq.length; i++) {
    if (lowFreq[i] > median) {
      hash |= BigInt(1) << BigInt(i + 1);
    }
  }

  // Return as 16-char hex
  return hash.toString(16).padStart(16, "0");
}

/**
 * Compute Hamming distance between two hex hash strings.
 * Returns 0-64 (number of differing bits).
 */
export function hammingDistance(hash1: string, hash2: string): number {
  const h1 = BigInt("0x" + hash1);
  const h2 = BigInt("0x" + hash2);
  let xor = h1 ^ h2;
  let count = 0;
  while (xor > BigInt(0)) {
    count += Number(xor & BigInt(1));
    xor >>= BigInt(1);
  }
  return count;
}
