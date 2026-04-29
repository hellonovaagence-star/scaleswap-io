"""SSIM + pHash validation module.

Validates that variants meet quality constraints:
- SSIM >= 0.995 (visually identical)
- pHash Hamming distance >= 10 (technically unique)
"""

import hashlib
import logging
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    ssim: float
    phash_distance: int
    is_valid: bool
    md5: str


def extract_frame(video_path: str, output_path: str, time: float = 1.0) -> bool:
    """Extract a single frame from a video at given timestamp."""
    cmd = [
        settings.ffmpeg_path, "-y",
        "-ss", str(time),
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0


def compute_ssim(source_path: str, variant_path: str) -> float:
    """Compute SSIM between source and variant using FFmpeg."""
    cmd = [
        settings.ffmpeg_path,
        "-i", source_path,
        "-i", variant_path,
        "-lavfi", "ssim=stats_file=-",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)

    # Parse SSIM from stderr (FFmpeg outputs stats to stderr)
    stderr = result.stderr
    ssim_values = []
    for line in stderr.split("\n"):
        if "All:" in line:
            try:
                # Extract "All:X.XXXXXX" pattern
                all_idx = line.index("All:") + 4
                val_str = line[all_idx:].split()[0].strip("()")
                ssim_values.append(float(val_str))
            except (ValueError, IndexError):
                continue

    if ssim_values:
        return ssim_values[-1]  # Return the final SSIM value

    logger.warning("Could not parse SSIM, falling back to frame comparison")
    return _compute_ssim_frames(source_path, variant_path)


def _compute_ssim_frames(source_path: str, variant_path: str) -> float:
    """Fallback: compute SSIM from extracted frames using scikit-image."""
    try:
        from skimage.metrics import structural_similarity as ssim
        from PIL import Image
        import numpy as np

        with tempfile.TemporaryDirectory() as tmpdir:
            src_frame = f"{tmpdir}/src.png"
            var_frame = f"{tmpdir}/var.png"

            extract_frame(source_path, src_frame)
            extract_frame(variant_path, var_frame)

            src_img = np.array(Image.open(src_frame).convert("RGB"))
            var_img = np.array(Image.open(var_frame).convert("RGB"))

            # Resize variant to match source if needed (due to micro-crop)
            if src_img.shape != var_img.shape:
                from PIL import Image as PILImage
                var_pil = PILImage.fromarray(var_img).resize(
                    (src_img.shape[1], src_img.shape[0]),
                    PILImage.LANCZOS,
                )
                var_img = np.array(var_pil)

            score = ssim(src_img, var_img, channel_axis=2)
            return float(score)
    except Exception as e:
        logger.error(f"SSIM frame comparison failed: {e}")
        return 0.0


def compute_phash_distance(source_path: str, variant_path: str) -> int:
    """Compute perceptual hash Hamming distance between source and variant."""
    try:
        import imagehash
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmpdir:
            src_frame = f"{tmpdir}/src.png"
            var_frame = f"{tmpdir}/var.png"

            extract_frame(source_path, src_frame)
            extract_frame(variant_path, var_frame)

            src_hash = imagehash.phash(Image.open(src_frame))
            var_hash = imagehash.phash(Image.open(var_frame))

            distance = src_hash - var_hash
            return distance
    except Exception as e:
        logger.error(f"pHash computation failed: {e}")
        return 0


def compute_md5(file_path: str) -> str:
    """Compute MD5 hash of a file."""
    md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            md5.update(chunk)
    return md5.hexdigest()


def validate_variant(source_path: str, variant_path: str) -> ValidationResult:
    """Run full validation suite on a variant."""
    ssim_score = compute_ssim(source_path, variant_path)
    phash_dist = compute_phash_distance(source_path, variant_path)
    md5 = compute_md5(variant_path)

    is_valid = ssim_score >= 0.995 and phash_dist >= 10

    logger.info(
        f"Validation: SSIM={ssim_score:.6f}, pHash_dist={phash_dist}, "
        f"MD5={md5[:12]}..., valid={is_valid}"
    )

    return ValidationResult(
        ssim=round(ssim_score, 6),
        phash_distance=phash_dist,
        is_valid=is_valid,
        md5=md5,
    )
