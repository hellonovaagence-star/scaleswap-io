"""Layer 2: Metadata EXIF scrub + device spoofing.

Strips all existing metadata and injects fake device profiles to make
each variant appear as if recorded on a different device.
Uses variant_id-based seeding to guarantee unique metadata per variant.
"""

import hashlib
import random
from typing import Optional

# Expanded device profiles (50+) for maximum uniqueness
DEVICE_PROFILES = [
    # Apple
    {"make": "Apple", "model": "iPhone 16 Pro Max", "software": "18.3"},
    {"make": "Apple", "model": "iPhone 16 Pro", "software": "18.2"},
    {"make": "Apple", "model": "iPhone 16", "software": "18.2.1"},
    {"make": "Apple", "model": "iPhone 15 Pro Max", "software": "18.1.1"},
    {"make": "Apple", "model": "iPhone 15 Pro", "software": "17.7"},
    {"make": "Apple", "model": "iPhone 15", "software": "17.6.1"},
    {"make": "Apple", "model": "iPhone 14 Pro Max", "software": "17.6.1"},
    {"make": "Apple", "model": "iPhone 14 Pro", "software": "17.5.1"},
    {"make": "Apple", "model": "iPhone 14", "software": "17.5"},
    {"make": "Apple", "model": "iPhone 13 Pro Max", "software": "17.4.1"},
    {"make": "Apple", "model": "iPhone 13 Pro", "software": "17.4"},
    {"make": "Apple", "model": "iPhone 13", "software": "17.3.1"},
    {"make": "Apple", "model": "iPhone 12 Pro", "software": "17.2"},
    {"make": "Apple", "model": "iPhone SE (3rd generation)", "software": "17.1"},
    # Samsung
    {"make": "Samsung", "model": "SM-S928B", "software": "One UI 6.1.1"},
    {"make": "Samsung", "model": "SM-S926B", "software": "One UI 6.1"},
    {"make": "Samsung", "model": "SM-S921B", "software": "One UI 6.1"},
    {"make": "Samsung", "model": "SM-S918B", "software": "One UI 6.0"},
    {"make": "Samsung", "model": "SM-S916B", "software": "One UI 5.1.1"},
    {"make": "Samsung", "model": "SM-S911B", "software": "One UI 5.1"},
    {"make": "Samsung", "model": "SM-A546B", "software": "One UI 6.0"},
    {"make": "Samsung", "model": "SM-A256B", "software": "One UI 5.1"},
    {"make": "Samsung", "model": "SM-G991B", "software": "One UI 5.0"},
    # Google
    {"make": "Google", "model": "Pixel 9 Pro XL", "software": "Android 15"},
    {"make": "Google", "model": "Pixel 9 Pro", "software": "Android 15"},
    {"make": "Google", "model": "Pixel 9", "software": "Android 15"},
    {"make": "Google", "model": "Pixel 8 Pro", "software": "Android 14"},
    {"make": "Google", "model": "Pixel 8", "software": "Android 14"},
    {"make": "Google", "model": "Pixel 7 Pro", "software": "Android 14"},
    {"make": "Google", "model": "Pixel 7a", "software": "Android 14"},
    {"make": "Google", "model": "Pixel 7", "software": "Android 13"},
    # Xiaomi
    {"make": "Xiaomi", "model": "2311DRK48C", "software": "MIUI 14.0.9"},
    {"make": "Xiaomi", "model": "23113RKC6C", "software": "HyperOS 1.0"},
    {"make": "Xiaomi", "model": "2304FPN6DC", "software": "MIUI 14.0.7"},
    {"make": "Xiaomi", "model": "22101316C", "software": "MIUI 14.0.5"},
    {"make": "Xiaomi", "model": "2210132G", "software": "MIUI 14.0.3"},
    # OnePlus
    {"make": "OnePlus", "model": "CPH2449", "software": "OxygenOS 14.0.2"},
    {"make": "OnePlus", "model": "CPH2451", "software": "OxygenOS 14.0.1"},
    {"make": "OnePlus", "model": "NE2215", "software": "OxygenOS 13.1.0"},
    {"make": "OnePlus", "model": "PHB110", "software": "OxygenOS 14.0"},
    # Huawei
    {"make": "HUAWEI", "model": "NOH-NX9", "software": "HarmonyOS 4.0"},
    {"make": "HUAWEI", "model": "ALN-AL10", "software": "HarmonyOS 4.2"},
    {"make": "HUAWEI", "model": "OCE-AN10", "software": "HarmonyOS 3.1"},
    # Oppo / Realme
    {"make": "OPPO", "model": "CPH2581", "software": "ColorOS 14.0"},
    {"make": "OPPO", "model": "CPH2525", "software": "ColorOS 13.1"},
    {"make": "realme", "model": "RMX3771", "software": "realme UI 5.0"},
    # Sony / Others
    {"make": "Sony", "model": "XQ-DQ72", "software": "Android 14"},
    {"make": "Sony", "model": "XQ-CT72", "software": "Android 13"},
    {"make": "Motorola", "model": "XT2347-2", "software": "Android 14"},
    {"make": "Nothing", "model": "A065", "software": "Nothing OS 2.5"},
]

# 30 cities worldwide for GPS diversity
CITIES = [
    (48.8566, 2.3522),    # Paris
    (40.7128, -74.0060),  # New York
    (35.6762, 139.6503),  # Tokyo
    (51.5074, -0.1278),   # London
    (34.0522, -118.2437), # Los Angeles
    (55.7558, 37.6173),   # Moscow
    (41.9028, 12.4964),   # Rome
    (52.5200, 13.4050),   # Berlin
    (37.5665, 126.9780),  # Seoul
    (39.9042, 116.4074),  # Beijing
    (25.2048, 55.2708),   # Dubai
    (-33.8688, 151.2093), # Sydney
    (19.4326, -99.1332),  # Mexico City
    (43.6532, -79.3832),  # Toronto
    (1.3521, 103.8198),   # Singapore
    (-23.5505, -46.6333), # São Paulo
    (59.3293, 18.0686),   # Stockholm
    (35.6892, 51.3890),   # Tehran
    (31.2304, 121.4737),  # Shanghai
    (41.0082, 28.9784),   # Istanbul
    (33.8938, 35.5018),   # Beirut
    (50.0755, 14.4378),   # Prague
    (47.3769, 8.5417),    # Zurich
    (45.4642, 9.1900),    # Milan
    (-34.6037, -58.3816), # Buenos Aires
    (13.7563, 100.5018),  # Bangkok
    (28.6139, 77.2090),   # New Delhi
    (30.0444, 31.2357),   # Cairo
    (36.1627, -86.7816),  # Nashville
    (6.5244, 3.3792),     # Lagos
]


def get_random_profile(variant_id: Optional[str] = None) -> dict:
    """Return a random device profile, optionally seeded by variant_id for determinism."""
    if variant_id:
        # Deterministic seeding: variant_id drives all random choices
        seed = int(hashlib.sha256(variant_id.encode()).hexdigest(), 16)
        rng = random.Random(seed)
    else:
        rng = random.Random()

    profile = rng.choice(DEVICE_PROFILES).copy()

    # Pick city and add unique GPS jitter (±0.15 degrees = ~16km)
    lat, lon = rng.choice(CITIES)
    lat += rng.uniform(-0.15, 0.15)
    lon += rng.uniform(-0.15, 0.15)
    profile["gps_lat"] = round(lat, 6)
    profile["gps_lon"] = round(lon, 6)
    return profile


def get_ffmpeg_metadata_args(variant_id: Optional[str] = None) -> list[str]:
    """Return FFmpeg args to strip existing metadata and inject fake profile.

    If variant_id is provided, the profile is deterministically derived from it,
    guaranteeing unique metadata per variant.
    """
    profile = get_random_profile(variant_id)

    args = [
        "-map_metadata", "-1",  # Strip all existing metadata
        "-metadata", f"com.apple.quicktime.make={profile['make']}",
        "-metadata", f"com.apple.quicktime.model={profile['model']}",
        "-metadata", f"com.apple.quicktime.software={profile['software']}",
        "-metadata", f"com.apple.quicktime.location.ISO6709="
                      f"+{profile['gps_lat']:09.6f}"
                      f"+{profile['gps_lon']:010.6f}/",
        "-metadata", f"creation_time={_random_creation_time(variant_id)}",
    ]
    return args


def _random_creation_time(variant_id: Optional[str] = None) -> str:
    """Generate a plausible random creation timestamp, unique per variant."""
    import datetime

    if variant_id:
        seed = int(hashlib.sha256(f"time_{variant_id}".encode()).hexdigest(), 16)
        rng = random.Random(seed)
    else:
        rng = random.Random()

    base = datetime.datetime(2024, 1, 1)
    # Random day in 2-year range + random time of day
    offset = rng.randint(0, 365 * 2) * 86400 + rng.randint(0, 86400)
    dt = base + datetime.timedelta(seconds=offset)
    # Add random sub-second precision for extra uniqueness
    microseconds = rng.randint(0, 999999)
    dt = dt.replace(microsecond=microseconds)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
