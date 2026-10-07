"""Import the supplied CLIP archives without trusting archive paths.

Usage: python scripts/import-sequences.py --source "C:/Users/gnano/Downloads"
Original JPEG bytes are preserved. Mobile derivatives retain original frame
numbers and include frames 1, 3, ... 239, 240 for the 240-frame sequences.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

from PIL import Image


SEQUENCES = (
    ("CLIP 1.zip", "01-desk"),
    ("CLIP 2.zip", "02-blueprint"),
    ("CLIP 3.zip", "03-prototype"),
    ("CLIP 4.zip", "04-community"),
)
FRAME_PATTERN = re.compile(r"ezgif-frame-(\d{3})\.jpg", re.IGNORECASE)
EXPECTED_FRAMES = 240


def import_sequence(source: Path, destination: Path, name: str) -> dict:
    target = destination / name
    target.mkdir(parents=True, exist_ok=True)
    mobile = target / "mobile"
    mobile.mkdir(exist_ok=True)
    dimensions: set[tuple[int, int]] = set()
    original_bytes = 0
    mobile_bytes = 0
    mobile_frames: list[int] = []
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()

    with zipfile.ZipFile(source) as archive:
        frames = {}
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            # Reject every path-bearing member instead of using extractall.
            if "/" in entry.filename or "\\" in entry.filename:
                raise ValueError(f"Archive member must be a basename: {entry.filename!r}")
            match = FRAME_PATTERN.fullmatch(entry.filename)
            if not match:
                raise ValueError(f"Unexpected archive member: {entry.filename!r}")
            index = int(match.group(1))
            if index in frames:
                raise ValueError(f"Duplicate frame index: {index}")
            frames[index] = entry
        if set(frames) != set(range(1, EXPECTED_FRAMES + 1)):
            raise ValueError(f"Expected frames 1 through {EXPECTED_FRAMES} in {source}")

        for index, entry in sorted(frames.items()):
            filename = f"frame_{index:04d}.jpg"
            frame_path = target / filename
            payload = archive.read(entry)  # Reading also validates the ZIP CRC.
            frame_path.write_bytes(payload)
            original_bytes += len(payload)
            with Image.open(frame_path) as frame:
                frame.load()
                if frame.format != "JPEG":
                    raise ValueError(f"Frame is not JPEG: {entry.filename}")
                dimensions.add(frame.size)
                if index % 2 == 1 or index == EXPECTED_FRAMES:
                    width = min(768, frame.width)
                    height = round(frame.height * width / frame.width)
                    reduced = frame.convert("RGB").resize(
                        (width, height), Image.Resampling.LANCZOS
                    )
                    mobile_path = mobile / filename
                    reduced.save(mobile_path, "JPEG", quality=82, optimize=True, progressive=True)
                    mobile_bytes += mobile_path.stat().st_size
                    mobile_frames.append(index)

    result = {
        "name": name,
        "source": source.name,
        "source_sha256": source_hash,
        "frame_count": EXPECTED_FRAMES,
        "dimensions": sorted(dimensions),
        "original_bytes": original_bytes,
        "mobile_bytes": mobile_bytes,
        "mobile_width": 768,
        "mobile_frames": mobile_frames,
    }
    print(json.dumps(result), flush=True)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("C:/Users/gnano/Downloads"))
    parser.add_argument(
        "--destination", type=Path,
        default=Path(__file__).resolve().parents[1] / "public" / "sequences",
    )
    args = parser.parse_args()
    results = [
        import_sequence(args.source / archive, args.destination, name)
        for archive, name in SEQUENCES
    ]
    (args.destination / "manifest.json").write_text(
        json.dumps({"sequences": results}, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
