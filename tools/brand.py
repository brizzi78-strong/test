"""Shared brand constants + a stylized cardinal, drawn with PIL.

Used by build_og.py (social cards). Keeps colors and the bird in one place so
the PNGs match the PDF covers and the site.
"""
import os
from PIL import ImageFont

# ---- Palette (RGB 0-255) ---------------------------------------------------
CARDINAL = (177, 53, 47)
CARDINAL_DK = (140, 36, 31)
SAGE = (91, 123, 122)
INK = (45, 42, 40)
INK_SOFT = (92, 84, 77)
GOLD = (201, 161, 74)
SAND = (243, 237, 230)
CREAM = (250, 247, 244)
WHITE = (255, 255, 255)

_FONT_DIRS = [
    "/mnt/skills/examples/canvas-design/canvas-fonts",
    "/usr/share/fonts/truetype/liberation",
]
_FONT_ALIASES = {
    "serif-bold": ["IBMPlexSerif-Bold.ttf", "LiberationSerif-Bold.ttf"],
    "serif": ["IBMPlexSerif-Regular.ttf", "LiberationSerif-Regular.ttf"],
    "serif-italic": ["IBMPlexSerif-Italic.ttf", "LiberationSerif-Italic.ttf"],
    "sans-bold": ["WorkSans-Bold.ttf", "InstrumentSans-Bold.ttf", "LiberationSans-Bold.ttf"],
    "sans": ["WorkSans-Regular.ttf", "InstrumentSans-Regular.ttf", "LiberationSans-Regular.ttf"],
}


def _find(name):
    for d in _FONT_DIRS:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return p
    return None


def font(alias, size):
    for name in _FONT_ALIASES[alias]:
        p = _find(name)
        if p:
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw_bird(draw, cx, cy, s, body=CARDINAL, beak=GOLD, eye=CREAM):
    """A stylized cardinal centered at (cx, cy); s scales it. PIL y grows down."""
    # body
    draw.ellipse([cx - 1.5 * s, cy - 1.2 * s, cx + 1.2 * s, cy + 1.7 * s], fill=body)
    # tail
    draw.polygon([(cx + 0.7 * s, cy + 0.3 * s), (cx + 2.4 * s, cy + 1.3 * s),
                  (cx + 0.9 * s, cy + 1.5 * s)], fill=body)
    # head
    draw.ellipse([cx - 1.75 * s, cy - 2.15 * s, cx + 0.05 * s, cy - 0.35 * s], fill=body)
    # crest
    draw.polygon([(cx - 1.55 * s, cy - 1.95 * s), (cx - 0.65 * s, cy - 3.0 * s),
                  (cx - 0.15 * s, cy - 1.85 * s)], fill=body)
    # beak
    draw.polygon([(cx - 1.7 * s, cy - 1.2 * s), (cx - 2.8 * s, cy - 1.02 * s),
                  (cx - 1.6 * s, cy - 0.72 * s)], fill=beak)
    # face mask (small darker patch around beak) + eye
    draw.ellipse([cx - 1.35 * s, cy - 1.5 * s, cx - 0.95 * s, cy - 1.1 * s], fill=CARDINAL_DK)
    draw.ellipse([cx - 1.22 * s, cy - 1.42 * s, cx - 1.0 * s, cy - 1.2 * s], fill=eye)


def _hex(c):
    return "#%02x%02x%02x" % c


def svg_medallion(size=240, band=False):
    """SVG string of the cream medallion + cardinal, matching draw_bird()."""
    cx, cy, s = size * 0.56, size * 0.53, size * 0.145
    r = size * 0.46
    body, beak, eye = _hex(CARDINAL), _hex(GOLD), _hex(CREAM)

    def ell(x0, y0, x1, y1, fill):
        return ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s"/>'
                % ((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, fill))

    def poly(pts, fill):
        return '<polygon points="%s" fill="%s"/>' % (
            " ".join("%.1f,%.1f" % p for p in pts), fill)

    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" aria-label="A cardinal">' % (size, size),
        '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (size / 2, size / 2, size / 2 - 2, _hex(CREAM)),
        '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="3"/>' % (size / 2, size / 2, size / 2 - 10, _hex(GOLD)),
        ell(cx - 1.5 * s, cy - 1.2 * s, cx + 1.2 * s, cy + 1.7 * s, body),
        poly([(cx + 0.7 * s, cy + 0.3 * s), (cx + 2.4 * s, cy + 1.3 * s), (cx + 0.9 * s, cy + 1.5 * s)], body),
        ell(cx - 1.75 * s, cy - 2.15 * s, cx + 0.05 * s, cy - 0.35 * s, body),
        poly([(cx - 1.55 * s, cy - 1.95 * s), (cx - 0.65 * s, cy - 3.0 * s), (cx - 0.15 * s, cy - 1.85 * s)], body),
        poly([(cx - 1.7 * s, cy - 1.2 * s), (cx - 2.8 * s, cy - 1.02 * s), (cx - 1.6 * s, cy - 0.72 * s)], beak),
        ell(cx - 1.35 * s, cy - 1.5 * s, cx - 0.95 * s, cy - 1.1 * s, _hex(CARDINAL_DK)),
        ell(cx - 1.22 * s, cy - 1.42 * s, cx - 1.0 * s, cy - 1.2 * s, eye),
        '</svg>',
    ]
    return "".join(parts)
