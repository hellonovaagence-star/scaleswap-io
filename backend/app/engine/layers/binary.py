"""Layer 1: Binary header randomization.

Injects random bytes into non-critical sections of the file to change
the binary signature (MD5/SHA) without affecting playback.
"""

import os
import random
import struct
from pathlib import Path


def apply(input_path: str, output_path: str) -> str:
    """Randomize binary headers by appending a random UUID comment chunk."""
    data = Path(input_path).read_bytes()

    # Generate random padding (64-256 bytes)
    pad_size = random.randint(64, 256)
    random_pad = os.urandom(pad_size)

    # Create a free atom (MP4 "free" box) with random data
    # free atom: [size(4B)][type "free"(4B)][payload]
    atom_size = 8 + pad_size
    free_atom = struct.pack(">I", atom_size) + b"free" + random_pad

    # Insert after the first ftyp atom
    ftyp_end = _find_atom_end(data, b"ftyp")
    if ftyp_end > 0:
        modified = data[:ftyp_end] + free_atom + data[ftyp_end:]
    else:
        # Fallback: prepend free atom after first 8 bytes
        modified = data[:8] + free_atom + data[8:]

    Path(output_path).write_bytes(modified)
    return output_path


def _find_atom_end(data: bytes, atom_type: bytes) -> int:
    """Find the end position of an MP4 atom by type."""
    pos = 0
    while pos < len(data) - 8:
        size = struct.unpack(">I", data[pos:pos + 4])[0]
        atype = data[pos + 4:pos + 8]
        if size < 8:
            break
        if atype == atom_type:
            return pos + size
        pos += size
    return -1
