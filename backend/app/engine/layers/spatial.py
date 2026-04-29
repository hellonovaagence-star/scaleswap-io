"""Layer 4: Sub-pixel shift + micro-crop.

Applies imperceptible spatial transformations: random 1-2 pixel crop
from edges and sub-pixel shifting via padding, preserving SAR.
"""

import random


def get_filter() -> str:
    """Return FFmpeg video filter string for spatial transformation."""
    # Random crop: remove 1-3 pixels from edges
    crop_x = random.randint(0, 2)
    crop_y = random.randint(0, 2)
    crop_w = random.randint(1, 3)
    crop_h = random.randint(1, 3)

    # Ensure we crop at least 2 pixels total
    if crop_w + crop_x < 2:
        crop_w = 2

    filters = [
        f"crop=iw-{crop_w}:ih-{crop_h}:{crop_x}:{crop_y}",
        "setsar=1",  # Force SAR to prevent stretching
    ]

    return ",".join(filters)
