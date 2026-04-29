"""Layer 9: High-frequency noise injection (adversarial).

Injects imperceptible high-frequency noise designed to break
perceptual hash (pHash) calculations while keeping SSIM > 0.995.
"""

import random


def get_filter() -> str:
    """Return FFmpeg filter for adversarial noise injection."""
    # Noise strength: 1-3 (very subtle)
    strength = random.randint(1, 3)

    # Noise flags: temporal + uniform for natural-looking grain
    flags = random.choice(["t+u", "t", "a+t+u"])

    return f"noise=alls={strength}:allf={flags}"
