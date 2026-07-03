#!/usr/bin/env python3
"""
Render branded social-share (Open Graph / Twitter) cards as 1200x630 PNGs.

Pure PIL — no system libraries. Matches the PDF covers and site branding.

    python3 -m pip install --user pillow
    python3 tools/build_og.py

Outputs to assets/og/. Edit CARDS below to change copy, then re-run and commit
the regenerated PNGs.
"""
import os
from PIL import Image, ImageDraw
import brand as B

W, H = 1200, 630
PAD = 72


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def render(out, eyebrow, title, subtitle):
    img = Image.new("RGB", (W, H), B.CREAM)
    d = ImageDraw.Draw(img)

    # Left accent rail
    rail = 18
    d.rectangle([0, 0, rail, H], fill=B.CARDINAL)
    # Top hairline in gold
    d.rectangle([0, 0, W, 6], fill=B.GOLD)

    # Medallion + bird, upper-left of the text column's right side
    mx, my, mr = W - 210, 200, 128
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=B.CARDINAL)
    d.ellipse([mx - mr + 10, my - mr + 10, mx + mr - 10, my + mr - 10],
              outline=B.GOLD, width=3)
    B.draw_bird(d, mx + 14, my + 8, 34, body=B.CREAM, beak=B.GOLD, eye=B.CARDINAL)

    text_w = W - 2 * PAD - 150
    # Eyebrow
    ef = B.font("sans-bold", 26)
    d.text((PAD, PAD + 6), eyebrow.upper(), font=ef, fill=B.SAGE)
    # letter-spacing emulation not needed; keep simple

    # Title (serif, large, wrapped)
    tf = B.font("serif-bold", 76)
    lines = wrap(d, title, tf, text_w)
    if len(lines) > 3:
        tf = B.font("serif-bold", 60)
        lines = wrap(d, title, tf, text_w)
    y = 168
    for ln in lines:
        d.text((PAD, y), ln, font=tf, fill=B.CARDINAL_DK)
        y += tf.size + 8

    # Subtitle (serif italic)
    if subtitle:
        sf = B.font("serif-italic", 32)
        y += 12
        for ln in wrap(d, subtitle, sf, text_w):
            d.text((PAD, y), ln, font=sf, fill=B.INK_SOFT)
            y += sf.size + 8

    # Footer bar
    fh = 78
    d.rectangle([0, H - fh, W, H], fill=B.SAGE)
    ff = B.font("sans-bold", 28)
    d.text((PAD, H - fh + 24), "THE CARDINAL COMPANION", font=ff, fill=B.WHITE)
    uf = B.font("sans", 24)
    tag = "thecardinalcompanion.com"
    d.text((W - PAD - d.textlength(tag, font=uf), H - fh + 26), tag, font=uf, fill=B.CREAM)

    img.save(out, "PNG")
    return out


# name -> (eyebrow, title, subtitle)
CARDS = {
    "default": ("A companion for caregiving, grief & remembrance",
                "The Cardinal Companion",
                "Books, free guides, and a caregiver resource library."),
    "home": ("Books · Free Guides · Resources",
             "The Cardinal Companion",
             "The companion home for The Cardinal's Promise & Toolkit."),
    "promise": ("The Cardinal's Promise",
                "A novel about love, loss & what we carry",
                "Read the story, then find your footing in the guides."),
    "toolkit": ("The Cardinal's Toolkit",
                "Practical comfort for caregivers",
                "Scripts, checklists, and rituals for the hardest days."),
    "checklist": ("Free guide · The Cardinal's Toolkit",
                  "The Caregiver's First-Week Checklist",
                  "Just enough to get through the first overwhelming week."),
    "grief": ("Free guide · The Cardinal's Promise",
              "The First 30 Days of Grief",
              "A gentle companion for the heaviest weeks."),
    "children": ("Free guide · The Cardinal's Toolkit",
                 "Helping a Child Through Grief",
                 "Simple, honest words and small ways to help."),
    "library": ("Free Downloads",
                "The Cardinal's Free Library",
                "Printable guides and real PDFs, always free."),
    "newsletter": ("The Cardinal's Letter",
                   "Gentle notes for the road",
                   "A short, caring email — no noise, unsubscribe anytime."),
}


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(here, "assets", "og")
    os.makedirs(out_dir, exist_ok=True)
    for name, (eb, t, sub) in CARDS.items():
        p = os.path.join(out_dir, name + ".png")
        render(p, eb, t, sub)
        print("wrote", os.path.relpath(p, here), "(%d bytes)" % os.path.getsize(p))
    # Shared vector medallion for on-page heroes (matches the cards)
    img_dir = os.path.join(here, "assets", "img")
    os.makedirs(img_dir, exist_ok=True)
    svg_path = os.path.join(img_dir, "cardinal-medallion.svg")
    with open(svg_path, "w") as f:
        f.write(B.svg_medallion(240))
    print("wrote", os.path.relpath(svg_path, here))


if __name__ == "__main__":
    main()
