"""Layer 5: Frame trim + micro speed adjustment.

Trims 1-2 frames from the start/end and applies an imperceptible
speed change (~0.1%) to alter the temporal structure.
"""

import random


def get_filters() -> tuple[str, str]:
    """Return (video_filter, audio_filter) for temporal manipulation."""
    # Micro speed adjustment: 0.999x to 1.001x
    speed_factor = 1.0 + random.uniform(-0.001, 0.001)

    # PTS adjustment for video speed
    pts_factor = 1.0 / speed_factor
    video_filter = f"setpts={pts_factor:.6f}*PTS"

    # Corresponding audio tempo adjustment
    audio_filter = f"atempo={speed_factor:.6f}"

    return video_filter, audio_filter


def get_trim_args() -> list[str]:
    """Return FFmpeg args to trim 1-2 frames from start."""
    # Trim a tiny amount from start (1-3 frames at 30fps = 0.033-0.1s)
    trim_start = random.uniform(0.02, 0.08)
    return ["-ss", f"{trim_start:.4f}"]
