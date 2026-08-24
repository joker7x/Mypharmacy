from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ROOT / "assets/images/icon.png",
    ROOT / "assets/images/splash-icon.png",
    ROOT / "assets/images/favicon.png",
    ROOT / "assets/images/android-icon-foreground.png",
]
MAX_BYTES = 900_000


def optimise_png(path: Path) -> None:
    original = Image.open(path).convert("RGBA")
    for maximum_size in (1024, 768, 512):
        image = original.copy()
        image.thumbnail((maximum_size, maximum_size), Image.Resampling.LANCZOS)
        image.save(path, format="PNG", optimize=True, compress_level=9)
        if path.stat().st_size <= MAX_BYTES:
            print(f"{path.name}: {image.size[0]}×{image.size[1]}, {path.stat().st_size} bytes")
            return
    print(f"{path.name}: {path.stat().st_size} bytes after final compression")


for target in TARGETS:
    optimise_png(target)
