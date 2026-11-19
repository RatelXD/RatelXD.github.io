"""Rebuild the journal's subnet plates with Pillow. Each top cell is one address."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "src" / "assets" / "media"
OUT.mkdir(parents=True, exist_ok=True)
SCALE = 2
WIDTH, HEIGHT = 1040, 570
PAPER = "#f3f1ec"


def draw_plate(prefix):
    img = Image.new("RGB", (WIDTH * SCALE, HEIGHT * SCALE), PAPER)
    pen = ImageDraw.Draw(img)

    def points(coords):
        return [(round(x * SCALE), round(y * SCALE)) for x, y in coords]

    def line(coords, color, width=1):
        pen.line(points(coords), fill=color, width=max(1, round(width * SCALE)), joint="curve")

    def polygon(coords, fill):
        pen.polygon(points(coords), fill=fill)

    def iso(x, y, z=0):
        return (528 + 23.1 * (x - y), 145 + 11.1 * (x + y) - z)

    # Project a drafting grid underneath the plates. It carries no data.
    for i in range(-2, 20):
        line([iso(i, -2), iso(i, 19)], "#e0ddd5", .8)
        line([iso(-2, i), iso(19, i)], "#e0ddd5", .8)
    for i in range(0, 18, 4):
        for j in range(0, 18, 4):
            x, y = iso(i, j)
            line([(x - 3, y), (x + 3, y)], "#aea99d")
            line([(x, y - 3), (x, y + 3)], "#aea99d")

    blocks = [(0, 0, 1), (1, 0, 2), (0, 1, 0), (1, 1, 3)]
    size = 2 ** (32 - prefix)
    active_height = 73
    gap = .82
    for bx, by, number in blocks:
        x, y = bx * (8 + gap), by * (8 + gap)
        selected = number * 64 < size
        height = active_height if selected else 23
        top, left, right, grid, edge = (
            ("#c8523a", "#ac442e", "#863424", "#f7b29f", "#883322") if selected
            else ("#e4e2d9", "#cdcabe", "#bdb9ad", "#aca99d", "#868478")
        )
        polygon([iso(x, y, -4), iso(x + 8.26, y, -4), iso(x + 8.26, y + 8.26, -4), iso(x, y + 8.26, -4)], "#dcd9d0")
        low = [iso(x, y), iso(x + 8, y), iso(x + 8, y + 8), iso(x, y + 8)]
        high = [iso(x, y, height), iso(x + 8, y, height), iso(x + 8, y + 8, height), iso(x, y + 8, height)]
        polygon([low[2], low[3], high[3], high[2]], left)
        polygon([low[1], low[2], high[2], high[1]], right)
        for z in range(6, height - 2, 7):
            line([iso(x, y + 8, z), iso(x + 8, y + 8, z), iso(x + 8, y, z)], edge, .75)
        polygon(high, top)
        for i in range(1, 8):
            line([iso(x + i, y, height), iso(x + i, y + 8, height)], grid, 1.15)
            line([iso(x, y + i, height), iso(x + 8, y + i, height)], grid, 1.15)
        line(high + [high[0]], edge, 1.6)
        for i in [1, 2, 3]:
            line([high[i], low[i]], edge)
        line([low[1], low[2], low[3]], edge)

    # The marked corners are the first and last cells of the parent /24.
    def leader(location, elbow, end):
        line([location, elbow, end], "#68685e", 1.25)
        cx, cy = location
        pen.ellipse(points([(cx - 3.5, cy - 3.5), (cx + 3.5, cy + 3.5)]), fill="#35362d")
    leader(iso(.5, 8 + gap + .5, active_height), (255, 115), (94, 115))
    last_height = active_height if prefix == 24 else 23
    leader(iso(15.5 + gap, 15.5 + gap, last_height), (621, 537), (909, 537))
    img.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).save(OUT / f"subnet-{prefix}.png", optimize=True)


if __name__ == "__main__":
    for prefix in (24, 25, 26):
        draw_plate(prefix)
