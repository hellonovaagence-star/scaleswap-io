"""VideoEngine — 10-layer pipeline orchestrator.

Generates unique video variants by applying 10 transformation layers
sequentially via FFmpeg filter_complex + post-processing.
"""

import json
import logging
import os
import subprocess
import uuid
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

from app.config import settings
from app.engine.layers import (
    binary,
    metadata,
    container,
    spatial,
    temporal,
    color,
    codec,
    audio,
    adversarial,
    quantization,
)

logger = logging.getLogger(__name__)


@dataclass
class VariantResult:
    variant_id: str
    output_path: str
    success: bool
    ssim: Optional[float] = None
    phash_distance: Optional[int] = None
    md5: Optional[str] = None
    error: Optional[str] = None


@dataclass
class PipelineConfig:
    count: int = 5
    crf: int = 18
    preset: str = "veryfast"
    enable_audio: bool = True
    enable_metadata_spoof: bool = True
    enable_binary_layer: bool = True


class VideoEngine:
    """Orchestrates the 10-layer uniquification pipeline."""

    def __init__(self, source_path: str, project_id: str, config: Optional[PipelineConfig] = None):
        self.source_path = source_path
        self.project_id = project_id
        self.config = config or PipelineConfig()
        self.output_dir = os.path.join(settings.output_dir, project_id)
        os.makedirs(self.output_dir, exist_ok=True)
        self._probe_data: Optional[dict] = None

    def probe(self) -> dict:
        """Get video metadata via ffprobe."""
        if self._probe_data:
            return self._probe_data

        cmd = [
            settings.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            self.source_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        self._probe_data = json.loads(result.stdout)
        return self._probe_data

    def get_duration(self) -> float:
        """Get video duration in seconds."""
        probe = self.probe()
        fmt = probe.get("format", {})
        return float(fmt.get("duration", 0))

    def generate_variant(self, variant_index: int) -> VariantResult:
        """Generate a single variant through all 10 layers."""
        variant_id = str(uuid.uuid4())[:8]
        temp_path = os.path.join(self.output_dir, f"_temp_{variant_id}.mp4")
        final_path = os.path.join(self.output_dir, f"variant_{variant_index:03d}_{variant_id}.mp4")

        try:
            # === Build FFmpeg command with layers 3-10 ===
            ffmpeg_cmd = self._build_ffmpeg_command(temp_path, variant_id=variant_id)
            logger.info(f"Variant {variant_index}: Running FFmpeg pipeline")
            logger.debug(f"Command: {' '.join(ffmpeg_cmd)}")

            result = subprocess.run(
                ffmpeg_cmd,
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode != 0:
                logger.error(f"FFmpeg failed: {result.stderr[-500:]}")
                return VariantResult(
                    variant_id=variant_id,
                    output_path="",
                    success=False,
                    error=result.stderr[-500:],
                )

            # === Layer 1: Binary manipulation (post-FFmpeg) ===
            if self.config.enable_binary_layer:
                logger.info(f"Variant {variant_index}: Applying binary layer")
                binary.apply(temp_path, final_path)
                os.remove(temp_path)
            else:
                os.rename(temp_path, final_path)

            # === Validate ===
            from app.engine.validation import validate_variant
            validation = validate_variant(self.source_path, final_path)

            return VariantResult(
                variant_id=variant_id,
                output_path=final_path,
                success=True,
                ssim=validation.ssim,
                phash_distance=validation.phash_distance,
                md5=validation.md5,
            )

        except Exception as e:
            logger.exception(f"Variant {variant_index} failed")
            # Clean up temp files
            for p in [temp_path, final_path]:
                if os.path.exists(p):
                    os.remove(p)
            return VariantResult(
                variant_id=variant_id,
                output_path="",
                success=False,
                error=str(e),
            )

    def _build_ffmpeg_command(self, output_path: str, variant_id: Optional[str] = None) -> list[str]:
        """Build the FFmpeg command combining layers 2-10."""
        duration = self.get_duration()

        # Base command
        cmd = [settings.ffmpeg_path, "-y"]

        # Layer 5: Temporal trim (input-level)
        trim_args = temporal.get_trim_args()
        cmd.extend(trim_args)

        # Input
        cmd.extend(["-i", self.source_path])

        # === Build video filter chain (layers 4, 5, 6, 9) ===
        video_filters = []

        # Layer 4: Spatial micro-crop
        video_filters.append(spatial.get_filter())

        # Layer 5: Temporal speed adjustment
        v_temporal, a_temporal = temporal.get_filters()
        video_filters.append(v_temporal)

        # Layer 6: Color micro-adjustment
        video_filters.append(color.get_filter())

        # Layer 9: Adversarial noise
        video_filters.append(adversarial.get_filter())

        # Combine video filters
        vf = ",".join(video_filters)
        cmd.extend(["-vf", vf])

        # === Audio filters (layers 5, 8) ===
        if self.config.enable_audio:
            audio_filters = []
            audio_filters.append(a_temporal)
            noise_filter = audio.get_noise_filter()
            audio_filters.append(noise_filter)
            af = ",".join(audio_filters)
            cmd.extend(["-af", af])

            # Layer 8: Audio encoding args
            cmd.extend(audio.get_audio_args())
        else:
            cmd.extend(["-an"])

        # Layer 2: Metadata spoofing (seeded by variant_id for uniqueness)
        if self.config.enable_metadata_spoof:
            cmd.extend(metadata.get_ffmpeg_metadata_args(variant_id=variant_id))

        # Layer 3: Container manipulation
        cmd.extend(container.get_ffmpeg_args())

        # Layer 7: Codec variation (includes CRF, GOP, profile)
        cmd.extend(codec.get_ffmpeg_args(base_crf=self.config.crf))

        # Layer 10: Quantization zones
        zone_args = quantization.get_zone_args(duration, base_crf=self.config.crf)
        if zone_args:
            # Merge x264-params if already present
            existing_x264 = None
            for i, arg in enumerate(cmd):
                if arg == "-x264-params" and i + 1 < len(cmd):
                    existing_x264 = i + 1
                    break
            if existing_x264:
                cmd[existing_x264] = cmd[existing_x264] + ":" + zone_args[1].split("=", 1)[1] if "=" in zone_args[1] else cmd[existing_x264]
            else:
                cmd.extend(zone_args)

        # Output
        cmd.append(output_path)

        return cmd

    def generate_all(self, on_progress=None) -> list[VariantResult]:
        """Generate all variants sequentially."""
        results = []
        for i in range(self.config.count):
            result = self.generate_variant(i + 1)
            results.append(result)
            if on_progress:
                on_progress(i + 1, self.config.count, result)
        return results
