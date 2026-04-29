"""Layer 6: Gamma/luma micro-adjustment.

Applies imperceptible color corrections: tiny gamma shift, contrast
tweak, brightness and saturation micro-adjustments.
"""

import random


def get_filter() -> str:
    """Return FFmpeg eq filter for micro color adjustment."""
    # Gamma: 0.99 to 1.01 (imperceptible)
    gamma = round(random.uniform(0.99, 1.01), 4)

    # Contrast: 0.999 to 1.001
    contrast = round(random.uniform(0.999, 1.001), 4)

    # Brightness: -0.005 to 0.005
    brightness = round(random.uniform(-0.005, 0.005), 4)

    # Saturation: 0.995 to 1.005
    saturation = round(random.uniform(0.995, 1.005), 4)

    return f"eq=gamma={gamma}:contrast={contrast}:brightness={brightness}:saturation={saturation}"
