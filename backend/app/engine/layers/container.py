"""Layer 3: Container-level moov atom manipulation.

Moves the moov atom position and toggles faststart to change the
MP4 container structure without affecting visual content.
"""

import random


def get_ffmpeg_args() -> list[str]:
    """Return FFmpeg output args for container manipulation."""
    args = []

    # Randomly enable/disable faststart (moves moov atom to beginning)
    if random.random() > 0.5:
        args.extend(["-movflags", "+faststart"])
    else:
        # Use default moov at end, or add other movflags
        flags = random.choice([
            "disable_chpl",
            "default_base_moof+omit_tfhd_offset",
            "faststart+disable_chpl",
        ])
        args.extend(["-movflags", flags])

    # Randomize fragment duration for slight structural variation
    if random.random() > 0.7:
        args.extend(["-frag_duration", str(random.randint(1000000, 5000000))])

    return args
