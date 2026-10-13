# Draws the HomeBase app icon (same shapes as public/icon.svg) as PNGs for iPhone home screens and the web manifest.
# Run: python scripts/make-icons.py
from PIL import Image, ImageDraw

OLIVE, CREAM, CLAY = (78, 122, 58), (246, 242, 234), (192, 112, 63)
S = 2048  # draw large, then shrink for smooth edges

def draw():
    img = Image.new('RGB', (S, S), OLIVE)  # full square: iOS rounds the corners itself
    d = ImageDraw.Draw(img)
    u = S / 100
    for x in (28, 58):  # the H's two posts
        d.rounded_rectangle([x * u, 24 * u, (x + 14) * u, 76 * u], radius=3 * u, fill=CREAM)
    d.rectangle([42 * u, 44 * u, 58 * u, 56 * u], fill=CLAY)  # crossbar
    return img

big = draw()
for name, size in [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)]:
    big.resize((size, size), Image.LANCZOS).save(f'public/{name}')
