"""Layer 8: Audio resample + white noise injection.

Resamples audio between 44.1kHz/48kHz and mixes in inaudible
white noise to change the audio fingerprint.
"""

import random


def get_audio_args() -> list[str]:
    """Return FFmpeg args for audio manipulation."""
    # Random sample rate
    sample_rate = random.choice([44100, 48000, 44100, 48000, 32000])

    # Audio codec with actual variety
    acodec = random.choice(["aac", "libfdk_aac", "aac", "aac"])

    # Audio bitrate variation
    abitrate = random.choice(["96k", "128k", "160k", "192k", "224k", "256k", "320k"])

    # Random audio channel layout
    channels = random.choice(["2", "2", "2", "1"])  # Mostly stereo, occasional mono

    args = [
        "-c:a", acodec,
        "-ar", str(sample_rate),
        "-b:a", abitrate,
        "-ac", channels,
    ]

    # Randomly add AAC profile variation
    if acodec == "aac":
        aac_profile = random.choice(["aac_low", "aac_low", "aac_he"])
        args.extend(["-profile:a", aac_profile])

    return args


def get_noise_filter() -> str:
    """Return FFmpeg audio filter to mix in imperceptible white noise."""
    # Very low volume noise: -60dB to -50dB below original
    noise_volume = round(random.uniform(0.0003, 0.003), 5)
    # Use aeval to generate noise and mix it
    return (
        f"aeval='val(0)+random(0)*{noise_volume}':c=same"
    )
