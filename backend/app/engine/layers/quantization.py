"""Layer 10: CRF variation per segment.

Applies variable quantization by encoding different segments
with slightly different CRF values, creating unique encoding patterns.
"""

import random


def get_zone_args(duration: float, base_crf: int = 18) -> list[str]:
    """Return FFmpeg args for per-segment CRF variation using x264 zones."""
    if duration <= 0:
        return []

    # Create 3-5 zones with slightly varied quantizer offsets
    num_zones = random.randint(3, 5)
    total_frames_approx = int(duration * 30)  # Assume ~30fps

    zones = []
    for i in range(num_zones):
        start = int((i / num_zones) * total_frames_approx)
        end = int(((i + 1) / num_zones) * total_frames_approx) - 1

        # Quantizer offset: -1.0 to +1.0 from base
        q_offset = round(random.uniform(-1.0, 1.0), 2)
        zones.append(f"{start},{end},q={q_offset}")

    zones_str = "/".join(zones)
    return ["-x264-params", f"zones={zones_str}"]
