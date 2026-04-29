"""Layer 7: GOP + encoding profile variation.

Varies the Group of Pictures size, H.264 profile, and other encoding
parameters to produce structurally different bitstreams.
"""

import random


def get_ffmpeg_args(base_crf: int = 18) -> list[str]:
    """Return FFmpeg encoding args with varied GOP and profile."""
    # Vary CRF slightly: ±1 from base
    crf = base_crf + random.choice([-1, 0, 0, 1])
    crf = max(15, min(28, crf))

    # Random GOP size (keyframe interval)
    gop = random.choice([24, 30, 48, 60, 72, 90, 120])

    # Random H.264 profile
    profile = random.choice(["main", "high", "high"])

    # Random H.264 level
    level = random.choice(["4.0", "4.1", "4.2", "5.0", "5.1"])

    # Preset
    preset = random.choice(["veryfast", "fast", "medium"])

    args = [
        "-c:v", "libx264",
        "-crf", str(crf),
        "-preset", preset,
        "-profile:v", profile,
        "-level:v", level,
        "-g", str(gop),
        "-bf", str(random.choice([1, 2, 3])),  # B-frames
        "-refs", str(random.choice([1, 2, 3, 4])),  # Reference frames
    ]

    return args
