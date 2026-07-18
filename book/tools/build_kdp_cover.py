#!/usr/bin/env python3
"""Build the KDP full-wrap paperback cover for The Little Cardinal's Promise.

8.5 x 8.5" trim, 40 interior pages on premium color paper:
  spine  = 40 * 0.002347"           = 0.0939"
  width  = 0.125 + 8.5 + spine + 8.5 + 0.125 = 17.3439"
  height = 8.5 + 2 * 0.125          = 8.75"
Rendered at 300 DPI. KDP stamps its barcode on the lower-right of the
back cover; a white keep-clear zone is reserved there.

Output: book/print/the-little-cardinals-promise-cover-8.5x8.5.pdf
"""
from PIL import Image, ImageDraw, ImageFont
import img2pdf
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ILL = ROOT / "illustrations"
OUT_DIR = ROOT / "print"

DPI = 300
BLEED = int(0.125 * DPI)
TRIM = int(8.5 * DPI)
SPINE = int(round(40 * 0.002347 * DPI))       # 28 px
W = BLEED + TRIM + SPINE + TRIM + BLEED
H = int(8.75 * DPI)

CREAM = (247, 239, 226)
INK = (74, 62, 50)
RED = (154, 40, 32)
BROWN = (124, 106, 85)

FONT_DIR = pathlib.Path("/usr/share/fonts/truetype/liberation")
def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)


def main():
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)

    back_x0 = 0
    spine_x0 = BLEED + TRIM
    front_x0 = spine_x0 + SPINE
    front_cx = front_x0 + (TRIM + BLEED) // 2
    back_cx = (BLEED + TRIM) // 2

    # spine: quiet cardinal-red band
    d.rectangle([spine_x0, 0, spine_x0 + SPINE, H], fill=RED)

    # ---- front ----
    d.text((front_cx, int(H * 0.115)), "THE LITTLE", font=font("LiberationSerif-Bold.ttf", 150),
           fill=RED, anchor="mm")
    d.text((front_cx, int(H * 0.185)), "CARDINAL'S PROMISE", font=font("LiberationSerif-Bold.ttf", 150),
           fill=RED, anchor="mm")
    art = Image.open(ILL / "print" / "lap-hug.jpeg").convert("RGB")
    box = (TRIM - 2 * int(0.55 * DPI), int(H * 0.56))
    sc = min(box[0] / art.width, box[1] / art.height)
    art = art.resize((int(art.width * sc), int(art.height * sc)), Image.LANCZOS)
    img.paste(art, (front_cx - art.width // 2, int(H * 0.25)))
    d.text((front_cx, int(H * 0.90)), "Rob Brizzi", font=font("LiberationSerif-Bold.ttf", 96),
           fill=INK, anchor="mm")

    # ---- back ----
    blurb_font = font("LiberationSerif-Regular.ttf", 60)
    ital_font = font("LiberationSerif-Italic.ttf", 60)
    lines = [
        ("Dad made one promise, and only one.", blurb_font),
        ("", blurb_font),
        ("“No matter what,” he said,", ital_font),
        ("“I will always show up for you.”", ital_font),
        ("", blurb_font),
        ("A story about love that keeps showing up —", blurb_font),
        ("and where it sits when it does.", blurb_font),
    ]
    y = int(H * 0.24)
    for text, f in lines:
        if text:
            d.text((back_cx, y), text, font=f, fill=INK, anchor="mm")
        y += int(60 * 1.6)
    # small painted cardinal below the blurb
    from paint_pending_art import cardinal
    cardinal(d, back_cx, int(H * 0.62), 70, facing=1)
    d.text((back_cx, int(H * 0.72)), "BRIZZI HOUSE PUBLISHING",
           font=font("LiberationSerif-Regular.ttf", 48), fill=BROWN, anchor="mm")
    # barcode keep-clear zone: 2 x 1.2 in, 0.25 in from trim edges
    bz_w, bz_h = int(2.0 * DPI), int(1.2 * DPI)
    bz_x1 = BLEED + TRIM - int(0.25 * DPI)
    bz_y1 = H - BLEED - int(0.25 * DPI)
    d.rectangle([bz_x1 - bz_w, bz_y1 - bz_h, bz_x1, bz_y1], fill=(255, 255, 255))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    jpg = OUT_DIR / "pages" / "cover.jpg"
    jpg.parent.mkdir(exist_ok=True)
    img.save(jpg, "JPEG", quality=92, dpi=(DPI, DPI))
    out = OUT_DIR / "the-little-cardinals-promise-cover-8.5x8.5.pdf"
    layout = img2pdf.get_fixed_dpi_layout_fun((DPI, DPI))
    with open(out, "wb") as fh:
        fh.write(img2pdf.convert([str(jpg)], layout_fun=layout))
    print(f"cover {W}x{H}px ({W/DPI:.4f} x {H/DPI:.2f} in) -> {out}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).parent))
    main()
