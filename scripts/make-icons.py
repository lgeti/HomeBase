# Draws the HomeBase app icon (same shapes as public/icon.svg) as PNGs for iPhone home screens and the web manifest.
# Run: python scripts/make-icons.py
from PIL import Image, ImageDraw

SAGE, CREAM, CLAY = (47, 93, 80), (246, 242, 234), (192, 112, 63)
S = 2048  # draw large, then shrink for smooth edges

def draw():
    img = Image.new('RGB', (S, S), SAGE)  # full square: iOS rounds the corners itself
    d = ImageDraw.Draw(img)
    u = S / 100
    house = [(50, 22), (80, 47), (74, 47), (74, 78), (26, 78), (26, 47), (20, 47)]
    pts = [(x * u, y * u) for x, y in house]
    d.polygon(pts, fill=CREAM)
    r = 2 * u  # rounded corners, like the SVG's round stroke
    d.line(pts + [pts[0]], fill=CREAM, width=int(4 * u), joint='curve')
    for x, y in pts:
        d.ellipse([x - r, y - r, x + r, y + r], fill=CREAM)
    d.rectangle([43 * u, 58 * u, 57 * u, 78 * u], fill=CLAY)
    d.pieslice([43 * u, 51 * u, 57 * u, 65 * u], 180, 360, fill=CLAY)
    return img

big = draw()
for name, size in [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)]:
    big.resize((size, size), Image.LANCZOS).save(f'public/{name}')
