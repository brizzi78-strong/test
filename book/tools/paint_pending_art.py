#!/usr/bin/env python3
"""Paint the eight pending illustrations as quiet, stylized scenes.

These are original vector-style paintings (soft gradients, silhouettes,
no cartoon faces) meant to sit respectfully beside the character art in
the snowy middle of the book. Each writes to book/illustrations/pending/
under the exact filename the KDP builder expects, so re-running
build_kdp_interior.py picks them up. Replace any of them later by
overwriting the same file with generated painterly art.
"""
from PIL import Image, ImageDraw, ImageFilter
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "illustrations" / "pending"
OUT.mkdir(parents=True, exist_ok=True)

SS = 2            # supersample factor
SIZE = 2400       # final square size
S = SIZE * SS

RED = (198, 62, 47)
RED_DK = (158, 42, 33)
GLOW = (255, 176, 120)
INK = (66, 55, 46)
SNOW = (242, 246, 250)
CREAM = (247, 239, 226)


def canvas():
    return Image.new("RGB", (S, S), CREAM)


def vgrad(img, top, bottom, y0=0, y1=None):
    y1 = y1 if y1 is not None else img.height
    d = ImageDraw.Draw(img)
    h = max(1, y1 - y0)
    for i in range(h):
        t = i / h
        c = tuple(int(top[j] + (bottom[j] - top[j]) * t) for j in range(3))
        d.line([(0, y0 + i), (img.width, y0 + i)], fill=c)


def glow(img, cx, cy, r, color=GLOW, strength=140):
    layer = Image.new("RGB", img.size, (0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r],
              fill=tuple(int(c * strength / 255) for c in color))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.55))
    from PIL import ImageChops
    img.paste(ImageChops.screen(img, layer), (0, 0))


def snowfall(img, n=90, seed=7, rmin=6, rmax=14, color=(255, 255, 255)):
    d = ImageDraw.Draw(img)
    x, y = seed * 997 % 4093, seed * 641 % 3089
    for i in range(n):
        x = (x * 1103515245 + 12345) % (2 ** 31)
        y = (y * 69069 + 1) % (2 ** 31)
        px, py = x % img.width, y % img.height
        r = rmin + (x >> 8) % (rmax - rmin)
        d.ellipse([px - r, py - r, px + r, py + r], fill=color)


def cardinal(d, cx, cy, s, facing=1, flying=False, body=RED):
    """Stylized cardinal. s ~ body radius. facing: 1 right, -1 left."""
    f = facing
    if flying:
        d.polygon([(cx - 1.9 * s * f, cy - 1.7 * s), (cx - 0.2 * s * f, cy - 0.3 * s),
                   (cx - 1.4 * s * f, cy + 0.15 * s)], fill=RED_DK)
        d.polygon([(cx + 0.4 * s * f, cy - 2.1 * s), (cx + 0.55 * s * f, cy - 0.2 * s),
                   (cx - 0.5 * s * f, cy - 0.5 * s)], fill=body)
    # tail
    d.polygon([(cx - 1.05 * s * f, cy + 0.1 * s), (cx - 2.2 * s * f, cy + 1.15 * s),
               (cx - 1.55 * s * f, cy + 1.45 * s), (cx - 0.55 * s * f, cy + 0.75 * s)],
              fill=RED_DK)
    # body
    d.ellipse([cx - 1.15 * s, cy - 0.85 * s, cx + 1.15 * s, cy + 1.05 * s], fill=body)
    # head
    hx, hy = cx + 0.62 * s * f, cy - 1.05 * s
    d.ellipse([hx - 0.72 * s, hy - 0.72 * s, hx + 0.72 * s, hy + 0.72 * s], fill=body)
    # crest
    d.polygon([(hx - 0.25 * s * f, hy - 0.62 * s), (hx + 0.18 * s * f, hy - 1.42 * s),
               (hx + 0.5 * s * f, hy - 0.5 * s)], fill=body)
    d.polygon([(hx - 0.05 * s * f, hy - 0.6 * s), (hx + 0.55 * s * f, hy - 1.15 * s),
               (hx + 0.62 * s * f, hy - 0.35 * s)], fill=RED_DK)
    # black mask
    d.polygon([(hx + 0.7 * s * f, hy - 0.1 * s), (hx + 0.1 * s * f, hy - 0.42 * s),
               (hx - 0.05 * s * f, hy + 0.1 * s), (hx + 0.35 * s * f, hy + 0.45 * s)],
              fill=(40, 30, 28))
    # beak
    d.polygon([(hx + 0.62 * s * f, hy - 0.18 * s), (hx + 1.15 * s * f, hy + 0.02 * s),
               (hx + 0.6 * s * f, hy + 0.22 * s)], fill=(224, 148, 58))
    # eye
    r = 0.09 * s
    d.ellipse([hx + 0.22 * s * f - r, hy - 0.18 * s - r,
               hx + 0.22 * s * f + r, hy - 0.18 * s + r], fill=(20, 16, 15))
    # wing hint
    if not flying:
        d.ellipse([cx - 0.75 * s, cy - 0.35 * s, cx + 0.45 * s, cy + 0.75 * s],
                  fill=RED_DK)
    # legs
    if not flying:
        d.line([(cx + 0.1 * s, cy + 1.0 * s), (cx + 0.1 * s, cy + 1.35 * s)],
               fill=(92, 62, 40), width=int(0.09 * s))
        d.line([(cx - 0.25 * s, cy + 1.0 * s), (cx - 0.25 * s, cy + 1.35 * s)],
               fill=(92, 62, 40), width=int(0.09 * s))


def save(img, name):
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    p = OUT / f"{name}.jpeg"
    img.save(p, "JPEG", quality=92, dpi=(300, 300))
    print("painted", p.name)


# ---------------------------------------------------------------- scenes
def snowy_truck():
    img = canvas()
    vgrad(img, (147, 165, 186), (223, 230, 238), 0, int(S * 0.62))
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(S * 0.62), S, S], fill=(238, 243, 248))
    d.ellipse([-S * 0.3, S * 0.56, S * 0.9, S * 0.75], fill=(244, 248, 251))
    # house
    hx0, hx1 = int(S * 0.52), int(S * 0.92)
    hy0, hy1 = int(S * 0.33), int(S * 0.63)
    d.rectangle([hx0, hy0, hx1, hy1], fill=(104, 92, 78))
    d.polygon([(hx0 - 60, hy0), ((hx0 + hx1) // 2, int(S * 0.20)), (hx1 + 60, hy0)],
              fill=(80, 68, 56))
    d.polygon([(hx0 - 60, hy0), ((hx0 + hx1) // 2, int(S * 0.20)), (hx1 + 60, hy0),
               (hx1 + 60, hy0 - 26), ((hx0 + hx1) // 2, int(S * 0.20) - 26),
               (hx0 - 60, hy0 - 26)], fill=SNOW)
    # dark windows, one warm
    for wx in (hx0 + 90, hx1 - 210):
        d.rectangle([wx, hy0 + 110, wx + 120, hy0 + 260], fill=(62, 71, 83))
    wx = (hx0 + hx1) // 2 - 40
    glow(img, wx + 55, hy0 + 185, int(S * 0.09))
    d = ImageDraw.Draw(img)
    d.rectangle([wx, hy0 + 110, wx + 110, hy0 + 260], fill=(244, 200, 120))
    d.rectangle([hx1 - 320, hy1 - 200, hx1 - 200, hy1], fill=(70, 58, 48))
    # bare tree
    for pts, w in [([(int(S*0.1), int(S*0.66)), (int(S*0.09), int(S*0.42))], 26),
                   ([(int(S*0.093), int(S*0.5)), (int(S*0.03), int(S*0.4))], 16),
                   ([(int(S*0.094), int(S*0.46)), (int(S*0.16), int(S*0.36))], 16)]:
        d.line(pts, fill=(96, 82, 66), width=w)
    # truck: compact pickup, bed left, cab and hood nosing toward the house
    ty = int(S * 0.76)
    body = (183, 58, 46)
    dark = (150, 44, 35)
    d.ellipse([int(S*0.10), ty - 60, int(S*0.60), ty + 100], fill=(222, 230, 238))
    d.rectangle([int(S*0.14), ty - 480, int(S*0.30), ty - 120], fill=body)
    d.rectangle([int(S*0.14), ty - 480, int(S*0.165), ty - 120], fill=dark)
    d.rounded_rectangle([int(S*0.30), ty - 700, int(S*0.42), ty - 120], 60, fill=body)
    d.rounded_rectangle([int(S*0.315), ty - 640, int(S*0.405), ty - 470], 30,
                        fill=(174, 191, 205))
    d.rounded_rectangle([int(S*0.41), ty - 470, int(S*0.54), ty - 120], 50, fill=body)
    d.rectangle([int(S*0.135), ty - 200, int(S*0.545), ty - 120], fill=dark)
    d.ellipse([int(S*0.525), ty - 400, int(S*0.545), ty - 340], fill=(244, 216, 150))
    # snow resting on bed rail, roof, and hood
    d.rounded_rectangle([int(S*0.13), ty - 510, int(S*0.30), ty - 464], 22, fill=SNOW)
    d.rounded_rectangle([int(S*0.30), ty - 728, int(S*0.42), ty - 682], 22, fill=SNOW)
    d.rounded_rectangle([int(S*0.41), ty - 496, int(S*0.548), ty - 450], 22, fill=SNOW)
    for wx in (int(S*0.215), int(S*0.47)):
        d.ellipse([wx - 175, ty - 260, wx + 175, ty + 90], fill=(52, 56, 62))
        d.ellipse([wx - 76, ty - 160, wx + 76, ty - 8], fill=(140, 150, 158))
    snowfall(img, 110, seed=3, rmin=5, rmax=13)
    save(img, "snowy-truck")


def empty_bleachers():
    img = canvas()
    vgrad(img, (176, 189, 204), (233, 238, 244), 0, int(S * 0.7))
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(S * 0.7), S, S], fill=(240, 245, 249))
    rows = [(int(S * 0.62), int(S * 0.13)), (int(S * 0.47), int(S * 0.20)),
            (int(S * 0.32), int(S * 0.27))]
    for y, inset in rows:
        d.rectangle([inset, y, S - inset, y + 150], fill=(160, 139, 110))
        d.rectangle([inset, y - 44, S - inset, y + 10], fill=SNOW)
        for lx in (inset + 100, S - inset - 170):
            d.rectangle([lx, y + 150, lx + 70, y + 420], fill=(128, 110, 88))
    # faint cardinal, top bench
    cx, cy = int(S * 0.5), int(S * 0.32) - 95
    glow(img, cx, cy, int(S * 0.07), strength=110)
    d = ImageDraw.Draw(img)
    cardinal(d, cx, cy, int(S * 0.028), facing=-1, body=(212, 96, 82))
    snowfall(img, 100, seed=11, rmin=5, rmax=12)
    save(img, "empty-bleachers")


def boy_at_table():
    img = canvas()
    vgrad(img, (240, 228, 205), (226, 209, 179), 0, int(S * 0.72))
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(S * 0.72), S, S], fill=(196, 154, 106))
    d.line([(0, int(S * 0.72)), (S, int(S * 0.72))], fill=(168, 128, 84), width=10)
    # window
    wx0, wy0, wx1, wy1 = int(S*0.58), int(S*0.14), int(S*0.9), int(S*0.56)
    d.rectangle([wx0 - 22, wy0 - 22, wx1 + 22, wy1 + 22], fill=(141, 123, 99))
    vgrad(img, (205, 216, 228), (232, 238, 244), wy0, wy1)
    d = ImageDraw.Draw(img)
    d.rectangle([wx0, wy0, wx1, wy1], outline=None)
    win = Image.new("RGB", (wx1 - wx0, wy1 - wy0), (215, 224, 233))
    vgrad(win, (200, 212, 225), (235, 240, 246))
    wd = ImageDraw.Draw(win)
    wd.ellipse([-80, int((wy1-wy0)*0.75), (wx1-wx0)+80, (wy1-wy0)+120], fill=SNOW)
    snowfall(win, 26, seed=5, rmin=4, rmax=9)
    img.paste(win, (wx0, wy0))
    d.line([( (wx0+wx1)//2, wy0), ((wx0+wx1)//2, wy1)], fill=(141, 123, 99), width=18)
    d.line([(wx0, (wy0+wy1)//2), (wx1, (wy0+wy1)//2)], fill=(141, 123, 99), width=18)
    d.rectangle([wx0 - 30, wy1 + 10, wx1 + 30, wy1 + 44], fill=SNOW)
    # table
    ty = int(S * 0.68)
    d.rounded_rectangle([int(S*0.06), ty, int(S*0.54), ty + 90], 28, fill=(169, 126, 79))
    d.rectangle([int(S*0.10), ty + 90, int(S*0.15), int(S*0.92)], fill=(141, 105, 63))
    d.rectangle([int(S*0.45), ty + 90, int(S*0.50), int(S*0.92)], fill=(141, 105, 63))
    d.ellipse([int(S*0.11), ty - 80, int(S*0.23), ty + 8], fill=(233, 238, 243))
    d.ellipse([int(S*0.135), ty - 58, int(S*0.205), ty - 6], fill=(210, 220, 229))
    # boy, back view at the table, turned toward the window
    bx, by = int(S * 0.37), int(S * 0.40)
    d.rounded_rectangle([bx - 290, by, bx + 290, ty + 20], 150, fill=(181, 68, 58))
    d.ellipse([bx - 230, by - 430, bx + 230, by + 30], fill=(240, 194, 154))
    d.ellipse([bx - 245, by - 465, bx + 245, by - 135], fill=(46, 38, 32))
    d.ellipse([bx - 60, by - 330, bx + 290, by - 90], fill=(46, 38, 32))
    save(img, "boy-at-table")


def cardinal_windowsill():
    img = canvas()
    vgrad(img, (183, 196, 211), (226, 233, 240), 0, int(S * 0.74))
    d = ImageDraw.Draw(img)
    # window frame edges
    d.rectangle([0, 0, 90, S], fill=(110, 95, 76))
    d.rectangle([S - 90, 0, S, S], fill=(110, 95, 76))
    d.rectangle([0, 0, S, 70], fill=(110, 95, 76))
    # snowy sill
    d.rectangle([0, int(S * 0.74), S, S], fill=(226, 218, 202))
    d.ellipse([-S * 0.2, int(S * 0.66), S * 1.2, int(S * 0.86)], fill=SNOW)
    d.rectangle([0, int(S * 0.8), S, S], fill=SNOW)
    # the bird, large, looking at the viewer
    cx, cy = int(S * 0.5), int(S * 0.52)
    glow(img, cx, cy, int(S * 0.24), strength=120)
    d = ImageDraw.Draw(img)
    cardinal(d, cx, cy, int(S * 0.115), facing=-1)
    snowfall(img, 70, seed=13, rmin=6, rmax=13)
    save(img, "cardinal-windowsill")


def hand_on_glass():
    img = canvas()
    vgrad(img, (172, 186, 202), (219, 227, 236), 0, S)
    d = ImageDraw.Draw(img)
    # outer snowy sill with the cardinal standing on it
    sill = int(S * 0.76)
    d.rectangle([0, sill, S, S], fill=SNOW)
    d.ellipse([-S * 0.2, sill - 60, S * 1.2, sill + 90], fill=SNOW)
    cx, cy = int(S * 0.67), sill - int(S * 0.075 * 1.35) - 10
    glow(img, cx, cy, int(S * 0.16), strength=125)
    d = ImageDraw.Draw(img)
    cardinal(d, cx, cy, int(S * 0.075), facing=-1)
    snowfall(img, 70, seed=17, rmin=5, rmax=12)
    # glass shine diagonals: in front of the outside world...
    for off in (-int(S * 0.25), int(S * 0.22)):
        d.line([(int(S * 0.3) + off, 0), (int(S * 0.85) + off, S)],
               fill=(255, 255, 255), width=22)
    # ...then the breath-fog and the hand pressed from inside, over the glass
    fog = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fog)
    fd.ellipse([int(S*0.13), int(S*0.30), int(S*0.55), int(S*0.72)],
               fill=(240, 243, 246, 120))
    fog = fog.filter(ImageFilter.GaussianBlur(80))
    img.paste(fog, (0, 0), fog)
    d = ImageDraw.Draw(img)
    hx, hy = int(S * 0.34), int(S * 0.52)
    skin = (223, 172, 132)
    edge = (198, 146, 108)
    fw = 108
    fingers = [(-215, -140, 300), (-95, -215, 380), (25, -230, 400),
               (140, -195, 350), (235, -55, 210)]
    for dx, dy, ln in fingers:
        x = hx + dx
        d.rounded_rectangle([x - fw//2 - 8, hy + dy - ln - 8, x + fw//2 + 8, hy + dy + 80],
                            (fw + 16)//2, fill=edge)
    d.ellipse([hx - 260, hy - 190, hx + 260, hy + 300], fill=edge)
    for dx, dy, ln in fingers:
        x = hx + dx
        d.rounded_rectangle([x - fw//2, hy + dy - ln, x + fw//2, hy + dy + 80],
                            fw//2, fill=skin)
    d.ellipse([hx - 250, hy - 180, hx + 250, hy + 290], fill=skin)
    # wrist and sleeve running off the bottom of the page
    d.rounded_rectangle([hx - 190, hy + 240, hx + 190, S + 80], 90, fill=(90, 108, 160))
    # window frame on top of everything
    for box in ([0, 0, S, 80], [0, S - 80, S, S], [0, 0, 80, S], [S - 80, 0, S, S]):
        d.rectangle(box, fill=(110, 95, 76))
    save(img, "hand-on-glass")


def three_panel():
    img = canvas()
    pw = (S - 4 * 60) // 3
    scenes = []
    # panel 1: kitchen table, warm
    p1 = Image.new("RGB", (pw, S - 120), (240, 228, 205))
    vgrad(p1, (243, 232, 210), (228, 212, 183))
    d1 = ImageDraw.Draw(p1)
    d1.rectangle([0, int(p1.height * 0.62), pw, p1.height], fill=(169, 126, 79))
    d1.rectangle([0, int(p1.height * 0.62), pw, int(p1.height * 0.62) + 26],
                 fill=(146, 106, 63))
    cardinal(d1, pw // 2, int(p1.height * 0.52), int(pw * 0.14), facing=1)
    scenes.append(p1)
    # panel 2: snowy bench
    p2 = Image.new("RGB", (pw, S - 120), (220, 228, 237))
    vgrad(p2, (196, 208, 221), (235, 240, 246))
    d2 = ImageDraw.Draw(p2)
    d2.rectangle([0, int(p2.height * 0.60), pw, int(p2.height * 0.60) + 70],
                 fill=(160, 139, 110))
    d2.rectangle([0, int(p2.height * 0.60) - 22, pw, int(p2.height * 0.60) + 8],
                 fill=SNOW)
    cardinal(d2, pw // 2, int(p2.height * 0.5), int(pw * 0.14), facing=-1)
    snowfall(p2, 26, seed=23, rmin=4, rmax=10)
    scenes.append(p2)
    # panel 3: rainy sill
    p3 = Image.new("RGB", (pw, S - 120), (200, 206, 214))
    vgrad(p3, (178, 186, 196), (216, 222, 229))
    d3 = ImageDraw.Draw(p3)
    for i in range(14):
        x = (i * 173) % pw
        y = (i * 331) % int(p3.height * 0.5)
        d3.line([(x, y), (x - 40, y + 160)], fill=(232, 236, 241), width=10)
    d3.rectangle([0, int(p3.height * 0.62), pw, int(p3.height * 0.62) + 60],
                 fill=(126, 108, 86))
    cardinal(d3, pw // 2, int(p3.height * 0.52), int(pw * 0.14), facing=1)
    scenes.append(p3)
    x = 60
    for p in scenes:
        img.paste(p, (x, 60))
        x += pw + 60
    save(img, "three-panel-cardinals")


def tree_branch():
    img = canvas()
    vgrad(img, (238, 240, 226), (222, 231, 205), 0, int(S * 0.55))
    d = ImageDraw.Draw(img)
    vgrad(img, (196, 210, 162), (217, 228, 194), int(S * 0.55), S)
    glow(img, int(S * 0.15), int(S * 0.12), int(S * 0.2), color=(255, 236, 180),
         strength=110)
    d = ImageDraw.Draw(img)
    # branch from top right
    d.line([(S, int(S * 0.10)), (int(S * 0.50), int(S * 0.27))],
           fill=(107, 86, 64), width=110)
    d.line([(int(S * 0.75), int(S * 0.17)), (int(S * 0.63), int(S * 0.05))],
           fill=(107, 86, 64), width=60)
    d.line([(int(S * 0.62), int(S * 0.24)), (int(S * 0.49), int(S * 0.165))],
           fill=(107, 86, 64), width=48)
    # cardinal on branch, looking down-left
    cx, cy = int(S * 0.56), int(S * 0.175)
    glow(img, cx, cy, int(S * 0.11), strength=110)
    d = ImageDraw.Draw(img)
    cardinal(d, cx, cy, int(S * 0.05), facing=-1)
    # boy, back view, looking up toward the bird
    bx, by = int(S * 0.28), int(S * 0.66)
    d.rounded_rectangle([bx - 270, by - 80, bx + 270, S + 100], 150,
                        fill=(72, 92, 150))
    d.ellipse([bx - 210, by - 500, bx + 210, by - 80], fill=(240, 194, 154))
    d.ellipse([bx - 225, by - 535, bx + 225, by - 230], fill=(46, 38, 32))
    d.ellipse([bx - 120, by - 545, bx + 240, by - 300], fill=(46, 38, 32))
    save(img, "cardinal-tree-branch")


def sunset():
    img = canvas()
    vgrad(img, (246, 227, 194), (242, 181, 133), 0, int(S * 0.5))
    vgrad(img, (242, 181, 133), (217, 122, 106), int(S * 0.5), int(S * 0.85))
    glow(img, int(S * 0.5), int(S * 0.7), int(S * 0.3), color=(255, 214, 150),
         strength=150)
    d = ImageDraw.Draw(img)
    # house silhouettes
    base = int(S * 0.85)
    d.rectangle([0, base, S, S], fill=(74, 60, 58))
    for x0, w, h, roof in [(int(S*0.02), 300, 260, 140), (int(S*0.2), 380, 380, 170),
                           (int(S*0.47), 320, 300, 150), (int(S*0.66), 420, 430, 190),
                           (int(S*0.9), 260, 240, 120)]:
        d.rectangle([x0, base - h, x0 + w, base], fill=(74, 60, 58))
        d.polygon([(x0 - 30, base - h), (x0 + w // 2, base - h - roof),
                   (x0 + w + 30, base - h)], fill=(74, 60, 58))
    for wx, wy in [(int(S*0.26), base - 260), (int(S*0.72), base - 300),
                   (int(S*0.52), base - 200)]:
        d.rectangle([wx, wy, wx + 60, wy + 84], fill=(244, 200, 120))
    # flying cardinal
    cx, cy = int(S * 0.48), int(S * 0.34)
    glow(img, cx, cy, int(S * 0.14), strength=130)
    d = ImageDraw.Draw(img)
    cardinal(d, cx, cy, int(S * 0.06), facing=1, flying=True)
    save(img, "cardinal-sunset")


if __name__ == "__main__":
    snowy_truck()
    empty_bleachers()
    boy_at_table()
    cardinal_windowsill()
    hand_on_glass()
    three_panel()
    tree_branch()
    sunset()
    print("done")
