#!/usr/bin/env python3
"""Paint the eight stand-in illustrations as warm storybook scenes.

Version 3: feathered cardinal (wing scallops, tail lines, eye ring),
dusk moon and stars, fences, wood grain, curtain folds, berry sprig,
raindrops, sun rays, layered sunset — richer scenes throughout, still
in the quiet flat-storybook dialect. Writes to
book/illustrations/pending/ under the filenames the KDP builder
expects; overwrite any file with generated painterly art later and
re-run the builder.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "illustrations" / "pending"
OUT.mkdir(parents=True, exist_ok=True)

SS = 2
SIZE = 2400
S = SIZE * SS
U = S / 2400.0          # unit: multiply "design pixels" by U

RED = (198, 62, 47)
RED_DK = (158, 42, 33)
RED_MD = (178, 52, 40)
RED_LT = (219, 96, 74)
GLOW = (255, 186, 130)
SNOW = (243, 247, 251)
CREAM = (247, 239, 226)
WOOD = (163, 141, 112)
WOOD_DK = (139, 118, 92)


def u(x):
    return int(x * U)


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


def overlay(img, draw_fn, blur=0, alpha=255):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    if alpha < 255:
        a = layer.getchannel("A").point(lambda v: v * alpha // 255)
        layer.putalpha(a)
    img.paste(layer, (0, 0), layer)


def glow(img, cx, cy, r, color=GLOW, alpha=110):
    overlay(img, lambda d: d.ellipse([cx - r, cy - r, cx + r, cy + r],
                                     fill=color + (alpha,)), blur=r * 0.6)


def shadow(img, box, blur=40, alpha=60):
    overlay(img, lambda d: d.ellipse(box, fill=(40, 34, 30, alpha)), blur=blur)


def snowfall(img, n=90, seed=7, rmin=5, rmax=13, soft=False):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = seed * 997 % 4093, seed * 641 % 3089
    for i in range(n):
        x = (x * 1103515245 + 12345) % (2 ** 31)
        y = (y * 69069 + 1) % (2 ** 31)
        px, py = x % img.width, y % img.height
        r = u(rmin + (x >> 8) % (rmax - rmin))
        d.ellipse([px - r, py - r, px + r, py + r], fill=(255, 255, 255, 235))
    if soft:
        layer = layer.filter(ImageFilter.GaussianBlur(u(3)))
    img.paste(layer, (0, 0), layer)


def stars(img, pts, r=7):
    d = ImageDraw.Draw(img)
    for x, y in pts:
        d.ellipse([u(x - r), u(y - r), u(x + r), u(y + r)], fill=(246, 244, 232))
        d.line([(u(x - r * 2.6), u(y)), (u(x + r * 2.6), u(y))],
               fill=(246, 244, 232), width=u(3))
        d.line([(u(x), u(y - r * 2.6)), (u(x), u(y + r * 2.6))],
               fill=(246, 244, 232), width=u(3))


def wood_grain(d, x0, y0, x1, y1, n=3, color=None):
    color = color or WOOD_DK
    step = (y1 - y0) / (n + 1)
    for i in range(1, n + 1):
        y = int(y0 + step * i)
        d.line([(x0 + u(20), y), (x1 - u(20), y + u(6))], fill=color, width=u(5))


def finish(img, name, vignette=0.10):
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([-S * 0.25, -S * 0.25, S * 1.25, S * 1.25], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(S * 0.12))
    dark = ImageEnhance.Brightness(img).enhance(1.0 - vignette)
    img = Image.composite(img, dark, mask)
    noise = Image.effect_noise((S, S), 14).convert("L")
    grain = Image.merge("RGB", (noise, noise, noise))
    img = Image.blend(img, grain, 0.035)
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    img.save(OUT / f"{name}.jpeg", "JPEG", quality=92, dpi=(300, 300))
    print("painted", name)


def cardinal(img, cx, cy, s, facing=1, flying=False, faint=False,
             ground=None):
    """Storybook cardinal: round body, feathered wing, big bright eye."""
    f = facing
    body = tuple(int(c * 0.92 + 255 * 0.08) for c in RED) if faint else RED
    dark = RED_DK
    lt = RED_LT
    d = ImageDraw.Draw(img)
    if ground is not None and not flying:
        shadow(img, [cx - 1.3 * s, ground - 0.25 * s, cx + 1.3 * s,
                     ground + 0.3 * s], blur=s * 0.35, alpha=50)
        d = ImageDraw.Draw(img)
    if flying:
        d.polygon([(cx - 0.1 * s * f, cy - 0.9 * s), (cx - 1.3 * s * f, cy - 2.4 * s),
                   (cx - 2.0 * s * f, cy - 1.7 * s), (cx - 0.7 * s * f, cy - 0.4 * s)],
                  fill=dark)
        # feather notches on the raised wing
        for i in range(3):
            t = 0.25 + i * 0.25
            wx = cx + (-1.3 - 0.5) * 0.5 * s * f * t * 2
            d.line([(cx - (0.4 + 0.9 * t) * s * f, cy - (0.8 + 1.4 * t) * s),
                    (cx - (0.75 + 0.95 * t) * s * f, cy - (0.55 + 1.25 * t) * s)],
                   fill=RED_MD, width=max(3, int(0.07 * s)))
    # tail with feather lines
    d.polygon([(cx - 0.8 * s * f, cy + 0.3 * s), (cx - 2.15 * s * f, cy + 1.25 * s),
               (cx - 1.6 * s * f, cy + 1.72 * s), (cx - 0.35 * s * f, cy + 0.95 * s)],
              fill=dark)
    for t in (0.4, 0.7):
        d.line([(cx - (0.6 + 0.1 * t) * s * f, cy + (0.45 + 0.35 * t) * s),
                (cx - (1.75 + 0.2 * t) * s * f, cy + (1.15 + 0.45 * t) * s)],
               fill=RED_MD, width=max(3, int(0.06 * s)))
    # crest with rounded tips
    d.polygon([(cx + 0.02 * s * f, cy - 1.35 * s), (cx + 0.34 * s * f, cy - 2.25 * s),
               (cx + 0.72 * s * f, cy - 1.28 * s)], fill=body)
    d.ellipse([cx + 0.34 * s * f - 0.11 * s, cy - 2.3 * s - 0.11 * s,
               cx + 0.34 * s * f + 0.11 * s, cy - 2.3 * s + 0.11 * s], fill=body)
    d.polygon([(cx - 0.25 * s * f, cy - 1.35 * s), (cx - 0.02 * s * f, cy - 2.0 * s),
               (cx + 0.3 * s * f, cy - 1.3 * s)], fill=dark)
    d.ellipse([cx - 0.02 * s * f - 0.1 * s, cy - 2.04 * s - 0.1 * s,
               cx - 0.02 * s * f + 0.1 * s, cy - 2.04 * s + 0.1 * s], fill=dark)
    # single egg silhouette: head + body
    d.ellipse([cx - 1.15 * s, cy - 1.55 * s, cx + 1.15 * s, cy + 1.15 * s], fill=body)
    # belly light
    d.ellipse([cx - 0.55 * s, cy - 0.1 * s, cx + 0.75 * s, cy + 1.0 * s], fill=lt)
    # wing with scalloped feather edge
    d.ellipse([cx - 0.95 * s, cy - 0.45 * s, cx + 0.15 * s, cy + 0.8 * s], fill=dark)
    for i, (ax, ay) in enumerate([(-0.72, 0.52), (-0.42, 0.66), (-0.12, 0.7)]):
        r = 0.17 * s
        d.ellipse([cx + ax * s - r, cy + ay * s - r, cx + ax * s + r,
                   cy + ay * s + r], fill=RED_MD)
    if flying:
        d.polygon([(cx + 0.2 * s * f, cy + 0.1 * s), (cx - 0.4 * s * f, cy + 1.9 * s),
                   (cx - 1.1 * s * f, cy + 1.2 * s), (cx - 0.5 * s * f, cy + 0.1 * s)],
                  fill=body)
    # black mask + bib
    d.polygon([(cx + 1.05 * s * f, cy - 0.72 * s), (cx + 0.35 * s * f, cy - 1.1 * s),
               (cx + 0.02 * s * f, cy - 0.6 * s), (cx + 0.4 * s * f, cy - 0.18 * s),
               (cx + 0.75 * s * f, cy - 0.3 * s)], fill=(42, 32, 30))
    # eye: warm ring, big and bright
    ex, ey = cx + 0.34 * s * f, cy - 0.82 * s
    rr = 0.25 * s
    d.ellipse([ex - rr, ey - rr, ex + rr, ey + rr], fill=(150, 104, 74))
    r = 0.21 * s
    d.ellipse([ex - r, ey - r, ex + r, ey + r], fill=(252, 250, 246))
    r2 = 0.13 * s
    d.ellipse([ex - r2 + 0.02 * s * f, ey - r2, ex + r2 + 0.02 * s * f, ey + r2],
              fill=(38, 28, 26))
    r3 = 0.05 * s
    d.ellipse([ex - r3 + 0.06 * s * f, ey - r3 - 0.05 * s,
               ex + r3 + 0.06 * s * f, ey + r3 - 0.05 * s], fill=(255, 255, 255))
    # cheek blush
    d.ellipse([cx + 0.5 * s * f - 0.14 * s, cy - 0.42 * s - 0.09 * s,
               cx + 0.5 * s * f + 0.14 * s, cy - 0.42 * s + 0.09 * s],
              fill=(214, 106, 84))
    # beak
    d.polygon([(cx + 0.95 * s * f, cy - 0.78 * s), (cx + 1.38 * s * f, cy - 0.55 * s),
               (cx + 0.92 * s * f, cy - 0.35 * s)], fill=(233, 160, 64))
    d.line([(cx + 0.95 * s * f, cy - 0.57 * s), (cx + 1.3 * s * f, cy - 0.55 * s)],
           fill=(196, 128, 48), width=max(2, int(0.04 * s)))
    # legs
    if not flying and ground is not None:
        w = max(3, int(0.08 * s))
        for lx in (cx - 0.28 * s, cx + 0.14 * s):
            d.line([(lx, cy + 1.05 * s), (lx, ground)], fill=(96, 66, 44), width=w)


# ---------------------------------------------------------------- scenes
def snowy_truck():
    img = canvas()
    vgrad(img, (96, 116, 148), (214, 222, 233), 0, u(1500))
    # moon and early stars
    glow(img, u(330), u(310), u(260), color=(240, 240, 224), alpha=90)
    d = ImageDraw.Draw(img)
    d.ellipse([u(240), u(220), u(420), u(400)], fill=(238, 238, 226))
    d.ellipse([u(292), u(252), u(352), u(312)], fill=(222, 224, 214))
    d.ellipse([u(330), u(330), u(372), u(372)], fill=(224, 226, 216))
    stars(img, [(720, 220), (960, 130), (1180, 320), (170, 640), (560, 470)])
    # distant treeline
    overlay(img, lambda d: [d.ellipse([u(x - 140), u(y), u(x + 140), u(y + 260)],
            fill=(140, 154, 174, 255)) for x, y in
            [(60, 1280), (240, 1240), (430, 1290), (1980, 1250), (2200, 1290),
             (2330, 1240)]], blur=u(18))
    d = ImageDraw.Draw(img)
    # ground
    d.rectangle([0, u(1500), S, S], fill=(236, 242, 248))
    d.ellipse([-u(600), u(1400), u(1900), u(1750)], fill=(243, 248, 252))
    d.ellipse([u(900), u(1460), S + u(400), u(1780)], fill=(240, 245, 250))
    # fence along the left
    for i in range(4):
        px = u(60 + i * 165)
        d.rectangle([px, u(1560), px + u(46), u(1760)], fill=(129, 111, 89))
        d.rounded_rectangle([px - u(8), u(1544), px + u(54), u(1568)], u(10),
                            fill=SNOW)
    for ry in (1610, 1700):
        d.rectangle([u(40), u(ry), u(620), u(ry + 34)], fill=(139, 121, 97))
    # house
    hx0, hx1, hy0, hy1 = u(1270), u(2210), u(820), u(1520)
    shadow(img, [hx0 - u(60), hy1 - u(40), hx1 + u(60), hy1 + u(70)], blur=u(30))
    d = ImageDraw.Draw(img)
    d.rectangle([hx0, hy0, hx1, hy1], fill=(106, 93, 79))
    d.rectangle([hx0, hy0, hx1, hy0 + u(340)], fill=(97, 85, 72))
    d.polygon([(hx0 - u(70), hy0), ((hx0 + hx1) // 2, u(500)), (hx1 + u(70), hy0)],
              fill=(78, 66, 55))
    # shingle lines on the roof
    for t in (0.35, 0.6, 0.85):
        xa = int(hx0 - u(70) + ((hx0 + hx1) // 2 - hx0 + u(70)) * t)
        ya = int(hy0 - (hy0 - u(500)) * t)
        xb = int(hx1 + u(70) - (hx1 + u(70) - (hx0 + hx1) // 2) * t)
        d.line([(xa, ya), (xb, ya)], fill=(66, 56, 46), width=u(7))
    d.polygon([(hx0 - u(70), hy0), ((hx0 + hx1) // 2, u(500)), (hx1 + u(70), hy0),
               (hx1 + u(70), hy0 - u(34)), ((hx0 + hx1) // 2, u(500) - u(34)),
               (hx0 - u(70), hy0 - u(34))], fill=SNOW)
    # chimney
    d.rectangle([hx1 - u(220), u(560), hx1 - u(120), u(760)], fill=(88, 74, 62))
    d.rectangle([hx1 - u(232), u(540), hx1 - u(108), u(572)], fill=SNOW)
    # windows: two dark with frames, one warm (Rob's)
    for wx in (hx0 + u(110), hx1 - u(250)):
        d.rectangle([wx - u(12), hy0 + u(128), wx + u(152), hy0 + u(332)],
                    fill=(80, 68, 56))
        d.rectangle([wx, hy0 + u(140), wx + u(140), hy0 + u(320)], fill=(58, 66, 78))
        d.rectangle([wx - u(10), hy0 + u(320), wx + u(150), hy0 + u(338)], fill=SNOW)
    wx = (hx0 + hx1) // 2 - u(60)
    glow(img, wx + u(65), hy0 + u(230), u(240), alpha=95)
    d = ImageDraw.Draw(img)
    d.rectangle([wx - u(12), hy0 + u(128), wx + u(142), hy0 + u(332)],
                fill=(80, 68, 56))
    d.rectangle([wx, hy0 + u(140), wx + u(130), hy0 + u(320)], fill=(246, 202, 120))
    d.line([(wx + u(65), hy0 + u(140)), (wx + u(65), hy0 + u(320))],
           fill=(216, 172, 96), width=u(10))
    d.line([(wx, hy0 + u(230)), (wx + u(130), hy0 + u(230))],
           fill=(216, 172, 96), width=u(10))
    # small boy silhouette at the warm window
    d.ellipse([wx + u(22), hy0 + u(232), wx + u(62), hy0 + u(272)], fill=(90, 62, 48))
    d.rectangle([wx + u(18), hy0 + u(268), wx + u(66), hy0 + u(320)], fill=(90, 62, 48))
    # door
    d.rectangle([hx1 - u(330), hy1 - u(230), hx1 - u(210), hy1], fill=(70, 58, 48))
    d.ellipse([hx1 - u(240), hy1 - u(130), hx1 - u(224), hy1 - u(114)],
              fill=(196, 168, 120))
    # light spill on snow under the warm window
    overlay(img, lambda d: d.polygon([(wx - u(40), hy1), (wx + u(170), hy1),
            (wx + u(320), hy1 + u(330)), (wx - u(190), hy1 + u(330))],
            fill=(246, 210, 140, 70)), blur=u(40))
    d = ImageDraw.Draw(img)
    # drifts at the house base
    d.ellipse([hx0 - u(120), hy1 - u(50), hx0 + u(300), hy1 + u(60)], fill=SNOW)
    d.ellipse([hx1 - u(360), hy1 - u(40), hx1 + u(120), hy1 + u(70)], fill=SNOW)
    # bare tree with snow lines
    for pts, w in [([(u(230), u(1560)), (u(215), u(1000))], 34),
                   ([(u(219), u(1180)), (u(80), u(950))], 20),
                   ([(u(221), u(1100)), (u(370), u(880))], 20),
                   ([(u(367), u(884)), (u(430), u(770))], 13),
                   ([(u(84), u(954)), (u(40), u(840))], 12)]:
        d.line(pts, fill=(92, 78, 63), width=u(w))
    for pts in [[(u(206), u(1178)), (u(90), u(956))],
                [(u(212), u(1096)), (u(362), u(878))]]:
        d.line(pts, fill=(243, 247, 251), width=u(7))
    d.ellipse([u(130), u(1530), u(330), u(1610)], fill=SNOW)
    # the truck
    ty = u(1830)
    body, dark2 = (186, 60, 47), (152, 45, 36)
    shadow(img, [u(300), ty - u(30), u(1360), ty + u(80)], blur=u(30), alpha=70)
    d = ImageDraw.Draw(img)
    d.rectangle([u(340), ty - u(480), u(730), ty - u(120)], fill=body)
    d.rectangle([u(340), ty - u(480), u(392), ty - u(120)], fill=dark2)
    for gx in (500, 610):
        d.line([(u(gx), ty - u(470)), (u(gx), ty - u(210))], fill=dark2, width=u(9))
    d.rounded_rectangle([u(730), ty - u(700), u(1020), ty - u(120)], u(60), fill=body)
    d.rounded_rectangle([u(766), ty - u(640), u(984), ty - u(470)], u(30),
                        fill=(178, 196, 210))
    d.line([(u(766), ty - u(505)), (u(984), ty - u(560))], fill=(226, 236, 244),
           width=u(16))
    d.rounded_rectangle([u(1000), ty - u(470), u(1310), ty - u(120)], u(50), fill=body)
    d.rectangle([u(330), ty - u(200), u(1320), ty - u(120)], fill=dark2)
    d.ellipse([u(1268), ty - u(400), u(1310), ty - u(336)], fill=(246, 216, 150))
    d.rounded_rectangle([u(322), ty - u(512), u(730), ty - u(464)], u(22), fill=SNOW)
    d.rounded_rectangle([u(730), ty - u(728), u(1020), ty - u(682)], u(22), fill=SNOW)
    d.rounded_rectangle([u(1000), ty - u(498), u(1322), ty - u(452)], u(22), fill=SNOW)
    for wx2 in (u(520), u(1130)):
        d.ellipse([wx2 - u(175), ty - u(260), wx2 + u(175), ty + u(90)],
                  fill=(50, 54, 60))
        d.ellipse([wx2 - u(78), ty - u(163), wx2 + u(78), ty - u(7)],
                  fill=(146, 156, 164))
        d.ellipse([wx2 - u(30), ty - u(115), wx2 + u(30), ty - u(55)],
                  fill=(190, 198, 206))
    snowfall(img, 130, seed=3)
    snowfall(img, 40, seed=9, rmin=9, rmax=16, soft=True)
    finish(img, "snowy-truck")


def empty_bleachers():
    img = canvas()
    vgrad(img, (168, 182, 199), (230, 236, 243), 0, u(1700))
    overlay(img, lambda d: d.rectangle([0, u(1300), S, u(1700)],
            fill=(238, 224, 198, 45)), blur=u(60))
    d = ImageDraw.Draw(img)
    overlay(img, lambda d: [d.ellipse([u(x - 160), u(y), u(x + 160), u(y + 240)],
            fill=(146, 160, 178, 255)) for x, y in
            [(100, 1500), (300, 1470), (2100, 1480), (2320, 1450)]], blur=u(20))
    # faded backstop fence behind everything
    overlay(img, lambda d: ([d.line([(0, u(y)), (S, u(y))], fill=(158, 170, 184, 140),
            width=u(10)) for y in (420, 560)] +
            [d.line([(u(x), u(360)), (u(x), u(640))], fill=(158, 170, 184, 140),
             width=u(12)) for x in (200, 800, 1400, 2000)]))
    d = ImageDraw.Draw(img)
    d.rectangle([0, u(1700), S, S], fill=(239, 244, 249))
    d.ellipse([-u(400), u(1620), u(1700), u(1900)], fill=(245, 249, 252))
    rows = [(u(1500), u(260)), (u(1130), u(330)), (u(760), u(400))]
    for y, inset in rows:
        shadow(img, [inset, y + u(320), S - inset, y + u(420)], blur=u(26), alpha=45)
        d = ImageDraw.Draw(img)
        for lx in (inset + u(240), S - inset - u(400)):
            d.rectangle([lx, y + u(150), lx + u(160), y + u(420)], fill=(122, 104, 84))
            d.ellipse([lx - u(40), y + u(390), lx + u(200), y + u(460)], fill=SNOW)
        d.rectangle([inset, y, S - inset, y + u(150)], fill=WOOD)
        wood_grain(d, inset, y + u(20), S - inset, y + u(130), n=2)
        d.rectangle([inset, y + u(120), S - inset, y + u(150)], fill=WOOD_DK)
        d.rounded_rectangle([inset - u(14), y - u(44), S - inset + u(14), y + u(12)],
                            u(20), fill=SNOW)
    # the faint cardinal on the top bench
    cx, cy = u(1200), u(760) - u(44) - u(66)
    glow(img, cx, cy, u(180), alpha=90)
    cardinal(img, cx, cy, u(48), facing=-1, faint=True, ground=u(760) - u(44))
    snowfall(img, 110, seed=11)
    snowfall(img, 30, seed=21, rmin=9, rmax=15, soft=True)
    finish(img, "empty-bleachers")


def boy_at_table():
    img = canvas()
    vgrad(img, (242, 230, 208), (227, 210, 181), 0, u(1730))
    d = ImageDraw.Draw(img)
    d.rectangle([0, u(1730), S, S], fill=(197, 155, 107))
    for i in range(4):
        d.line([(0, u(1730 + 160 * i + 90)), (S, u(1730 + 160 * i + 60))],
               fill=(178, 138, 92), width=u(6))
    d.line([(0, u(1730)), (S, u(1730))], fill=(168, 128, 84), width=u(12))
    glow(img, u(300), u(200), u(500), color=(255, 226, 170), alpha=70)
    d = ImageDraw.Draw(img)
    # framed family photo and a small clock on the wall
    d.rectangle([u(240), u(360), u(560), u(640)], fill=(151, 122, 84))
    d.rectangle([u(272), u(392), u(528), u(608)], fill=(157, 178, 196))
    d.ellipse([u(330), u(470), u(400), u(560)], fill=(226, 202, 168))
    d.ellipse([u(410), u(450), u(490), u(560)], fill=(226, 202, 168))
    d.ellipse([u(760), u(300), u(950), u(490)], fill=(238, 232, 218))
    d.ellipse([u(778), u(318), u(932), u(472)], fill=(249, 246, 238))
    d.line([(u(855), u(395)), (u(855), u(340))], fill=(74, 62, 50), width=u(9))
    d.line([(u(855), u(395)), (u(895), u(415))], fill=(74, 62, 50), width=u(9))
    # window
    wx0, wy0, wx1, wy1 = u(1420), u(330), u(2160), u(1350)
    d.rectangle([wx0 - u(56), wy0 - u(56), wx1 + u(56), wy1 + u(56)],
                fill=(139, 121, 97))
    d.rectangle([wx0 - u(30), wy0 - u(30), wx1 + u(30), wy1 + u(30)],
                fill=(120, 103, 82))
    win = Image.new("RGB", (wx1 - wx0, wy1 - wy0), (212, 222, 232))
    vgrad(win, (198, 210, 224), (234, 240, 246))
    wd = ImageDraw.Draw(win)
    wd.ellipse([-u(150), (wy1 - wy0) - u(240), (wx1 - wx0) + u(150),
                (wy1 - wy0) + u(200)], fill=SNOW)
    snowfall(win, 34, seed=5, rmin=4, rmax=9)
    img.paste(win, (wx0, wy0))
    d.line([((wx0 + wx1) // 2, wy0), ((wx0 + wx1) // 2, wy1)],
           fill=(120, 103, 82), width=u(26))
    d.line([(wx0, (wy0 + wy1) // 2), (wx1, (wy0 + wy1) // 2)],
           fill=(120, 103, 82), width=u(26))
    d.rectangle([wx0 - u(66), wy1 + u(26), wx1 + u(66), wy1 + u(74)], fill=SNOW)
    # curtains with folds and tiebacks
    for cx0, flip in ((wx0 - u(120), 1), (wx1 + u(20), -1)):
        d.rounded_rectangle([cx0, wy0 - u(80), cx0 + u(100), wy1 + u(90)], u(40),
                            fill=(196, 120, 94))
        for fx in (u(28), u(62)):
            d.arc([cx0 + fx - u(30), wy0 + u(40), cx0 + fx + u(30), wy1 - u(60)],
                  260, 280, fill=(172, 100, 78), width=u(8))
        d.ellipse([cx0 + u(18), wy1 - u(180), cx0 + u(82), wy1 - u(116)],
                  fill=(160, 92, 70))
    # rug under the table
    overlay(img, lambda d: d.ellipse([u(60), u(2020), u(1500), u(2360)],
            fill=(176, 118, 88, 120)), blur=u(20))
    d = ImageDraw.Draw(img)
    # table with grain
    ty = u(1640)
    shadow(img, [u(120), ty + u(180), u(1330), ty + u(280)], blur=u(30), alpha=45)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([u(150), ty, u(1300), ty + u(90)], u(28), fill=(171, 128, 81))
    wood_grain(d, u(150), ty + u(10), u(1300), ty + u(70), n=2, color=(148, 108, 66))
    d.rectangle([u(150), ty + u(60), u(1300), ty + u(90)], fill=(148, 108, 66))
    d.rectangle([u(240), ty + u(90), u(300), u(2210)], fill=(141, 105, 63))
    d.rectangle([u(1130), ty + u(90), u(1190), u(2210)], fill=(141, 105, 63))
    # untouched bowl, spoon
    d.ellipse([u(300), ty - u(90), u(560), ty + u(10)], fill=(233, 238, 243))
    d.ellipse([u(330), ty - u(66), u(530), ty - u(6)], fill=(207, 217, 227))
    d.line([(u(590), ty - u(20)), (u(680), ty - u(60))], fill=(180, 186, 194),
           width=u(14))
    # boy at the table, back view, turned toward the window
    bx, by = u(880), u(1000)
    shadow(img, [bx - u(320), ty - u(30), bx + u(320), ty + u(60)], blur=u(26))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([bx - u(300), by, bx + u(300), ty + u(20)], u(150),
                        fill=(182, 69, 58))
    d.arc([bx - u(240), by + u(120), bx + u(240), ty + u(10)], 20, 160,
          fill=(160, 58, 48), width=u(10))
    d.rounded_rectangle([bx - u(300), by + u(180), bx - u(190), ty - u(60)],
                        u(60), fill=(170, 60, 50))
    d.ellipse([bx - u(230), by - u(430), bx + u(230), by + u(30)],
              fill=(240, 194, 154))
    d.ellipse([bx - u(245), by - u(465), bx + u(245), by - u(130)],
              fill=(48, 40, 34))
    d.ellipse([bx - u(60), by - u(330), bx + u(290), by - u(85)], fill=(48, 40, 34))
    d.ellipse([bx + u(180), by - u(230), bx + u(255), by - u(120)],
              fill=(240, 194, 154))
    finish(img, "boy-at-table")


def cardinal_windowsill():
    img = canvas()
    vgrad(img, (172, 187, 204), (224, 232, 240), 0, u(1780))
    d = ImageDraw.Draw(img)
    # window frame
    for box in ([0, 0, S, u(120)], [0, 0, u(120), S], [S - u(120), 0, S, S]):
        d.rectangle(box, fill=(112, 96, 77))
    d.rectangle([u(120), u(120), u(150), S], fill=(96, 82, 65))
    d.rectangle([S - u(150), u(120), S - u(120), S], fill=(96, 82, 65))
    # glass shine
    overlay(img, lambda d: [d.line([(u(500) + off, 0), (u(1500) + off, S)],
            fill=(255, 255, 255, 90), width=u(w)) for off, w in
            ((-u(160), 22), (u(90), 14))])
    # frost corners on the glass
    for cx2, cy2 in [(u(160), u(170)), (S - u(160), u(170))]:
        overlay(img, lambda d, a=cx2, b=cy2: d.ellipse(
            [a - u(300), b - u(300), a + u(300), b + u(300)],
            fill=(255, 255, 255, 70)), blur=u(120))
    d = ImageDraw.Draw(img)
    # sill: wood edge under deep snow
    d.rectangle([0, u(2100), S, S], fill=(126, 108, 86))
    wood_grain(d, 0, u(2160), S, u(2360), n=2, color=(108, 92, 72))
    d.ellipse([-u(500), u(1640), S + u(500), u(2160)], fill=SNOW)
    d.ellipse([u(300), u(1740), u(1000), u(1920)], fill=(252, 253, 255))
    d.ellipse([u(1500), u(1760), u(2200), u(1940)], fill=(252, 253, 255))
    # berry sprig in the corner of the sill
    d.line([(u(360), u(1900)), (u(660), u(1760))], fill=(122, 96, 66), width=u(16))
    d.line([(u(520), u(1826)), (u(560), u(1700))], fill=(122, 96, 66), width=u(12))
    for bx2, by2 in [(660, 1750), (600, 1680), (540, 1710)]:
        d.ellipse([u(bx2 - 34), u(by2 - 34), u(bx2 + 34), u(by2 + 34)],
                  fill=(184, 52, 44))
        d.ellipse([u(bx2 - 12), u(by2 - 22), u(bx2 + 2), u(by2 - 8)],
                  fill=(226, 120, 104))
    d.ellipse([u(400), u(1820), u(500), u(1880)], fill=(118, 142, 96))
    # the bird, large, looking at the viewer
    cx, cy = u(1200), u(1290)
    glow(img, cx, cy, u(620), alpha=95)
    cardinal(img, cx, cy, u(285), facing=-1, ground=u(1790))
    snowfall(img, 80, seed=13)
    snowfall(img, 26, seed=29, rmin=9, rmax=15, soft=True)
    finish(img, "cardinal-windowsill")


def hand_on_glass():
    img = canvas()
    vgrad(img, (166, 181, 198), (218, 226, 235), 0, S)
    d = ImageDraw.Draw(img)
    overlay(img, lambda d: [d.ellipse([u(x - 180), u(y), u(x + 180), u(y + 260)],
            fill=(148, 162, 180, 255)) for x, y in [(2200, 1220), (140, 1260)]],
            blur=u(24))
    # outer snowy sill, cardinal standing on it, leaning toward the hand
    sill = u(1810)
    d = ImageDraw.Draw(img)
    d.ellipse([-u(400), sill - u(90), S + u(400), sill + u(240)], fill=SNOW)
    d.rectangle([0, sill + u(60), S, S], fill=SNOW)
    cs = u(190)
    cx, cy = u(1560), sill - int(cs * 1.05) - u(12)
    glow(img, cx, cy, u(470), alpha=105)
    cardinal(img, cx, cy, cs, facing=-1, ground=sill)
    snowfall(img, 80, seed=17)
    # glass shines over the outside world
    for off, w in ((-u(500), 26), (u(430), 18)):
        d.line([(u(700) + off, 0), (u(2050) + off, S)], fill=(255, 255, 255),
               width=u(w))
    # breath fog where Rob stands
    overlay(img, lambda d: d.ellipse([u(180), u(700), u(1330), u(1800)],
            fill=(242, 245, 248, 130)), blur=u(150))
    # condensation drips at the fog's lower edge
    overlay(img, lambda d: [d.line([(u(x), u(1560)), (u(x), u(1560 + ln))],
            fill=(252, 253, 255, 120), width=u(10)) for x, ln in
            [(480, 140), (640, 220), (830, 170), (1050, 120)]], blur=u(6))
    # the hand pressed from inside
    d = ImageDraw.Draw(img)
    hx, hy = u(760), u(1300)
    skin = (233, 184, 144)
    edge = (204, 152, 112)
    fw = u(180)
    fingers = [(-370, -240, 520), (-165, -370, 650), (45, -395, 690),
               (240, -335, 600), (405, -95, 360)]
    for dx, dy, ln in fingers:
        x = hx + u(dx)
        d.rounded_rectangle([x - fw // 2 - u(14), hy + u(dy) - u(ln) - u(14),
                             x + fw // 2 + u(14), hy + u(dy) + u(160)],
                            (fw + u(28)) // 2, fill=edge)
    d.ellipse([hx - u(450), hy - u(330), hx + u(450), hy + u(520)], fill=edge)
    for dx, dy, ln in fingers:
        x = hx + u(dx)
        d.rounded_rectangle([x - fw // 2, hy + u(dy) - u(ln), x + fw // 2,
                             hy + u(dy) + u(160)], fw // 2, fill=skin)
    d.ellipse([hx - u(432), hy - u(312), hx + u(432), hy + u(502)], fill=skin)
    # sleeve with cuff folds
    d.rounded_rectangle([hx - u(380), hy + u(430), hx + u(380), S + u(200)],
                        u(180), fill=(92, 110, 162))
    d.rounded_rectangle([hx - u(380), hy + u(430), hx + u(380), hy + u(550)],
                        u(60), fill=(80, 96, 146))
    for fx in (-200, 0, 200):
        d.arc([hx + u(fx - 70), hy + u(560), hx + u(fx + 70), hy + u(900)],
              250, 290, fill=(78, 94, 142), width=u(10))
    # darkness of the room hinted at the frame edges
    overlay(img, lambda d: [d.rectangle(b, fill=(52, 44, 38, 90)) for b in
            ([0, 0, S, u(240)], [0, S - u(240), S, S], [0, 0, u(240), S],
             [S - u(240), 0, S, S])], blur=u(80))
    d = ImageDraw.Draw(img)
    for box in ([0, 0, S, u(160)], [0, S - u(160), S, S], [0, 0, u(160), S],
                [S - u(160), 0, S, S]):
        d.rectangle(box, fill=(112, 96, 77))
    finish(img, "hand-on-glass")


def three_panel():
    img = canvas()
    gap = u(120)
    pw = (S - 4 * gap) // 3
    ph = S - 2 * gap
    panels = []
    # 1: warm kitchen table
    p1 = Image.new("RGB", (pw, ph), (241, 229, 207))
    vgrad(p1, (244, 233, 212), (228, 212, 183))
    d1 = ImageDraw.Draw(p1)
    d1.rectangle([0, int(ph * 0.60), pw, ph], fill=(171, 128, 81))
    wood_grain(d1, 0, int(ph * 0.62), pw, int(ph * 0.75), n=2, color=(148, 108, 66))
    d1.rectangle([0, int(ph * 0.60), pw, int(ph * 0.60) + u(30)], fill=(148, 108, 66))
    d1.ellipse([pw - u(300), int(ph * 0.60) - u(60), pw - u(80),
                int(ph * 0.60) + u(20)], fill=(233, 238, 243))
    glow(p1, pw // 2, int(ph * 0.42), u(300), color=(255, 226, 170), alpha=70)
    cardinal(p1, pw // 2, int(ph * 0.44), u(120), facing=1, ground=int(ph * 0.60))
    panels.append(p1)
    # 2: snowy bench
    p2 = Image.new("RGB", (pw, ph), (219, 227, 236))
    vgrad(p2, (194, 206, 220), (236, 241, 246))
    d2 = ImageDraw.Draw(p2)
    for y in (int(ph * 0.18), int(ph * 0.24)):
        d2.line([(0, y), (pw, y)], fill=(172, 184, 198), width=u(8))
    d2.rectangle([0, int(ph * 0.58), pw, int(ph * 0.58) + u(110)], fill=WOOD)
    d2.rounded_rectangle([-u(20), int(ph * 0.58) - u(40), pw + u(20),
                          int(ph * 0.58) + u(10)], u(18), fill=SNOW)
    cardinal(p2, pw // 2, int(ph * 0.42), u(120), facing=-1,
             ground=int(ph * 0.58) - u(20))
    snowfall(p2, 30, seed=23, rmin=4, rmax=10)
    panels.append(p2)
    # 3: rainy sill with drops on the glass
    p3 = Image.new("RGB", (pw, ph), (198, 204, 212))
    vgrad(p3, (176, 184, 194), (216, 222, 229))
    d3 = ImageDraw.Draw(p3)
    for i in range(16):
        x = (i * 197) % pw
        y = (i * 373) % int(ph * 0.45)
        d3.line([(x, y), (x - u(60), y + u(280))], fill=(230, 234, 240), width=u(10))
    for i, (dx, dy) in enumerate([(0.2, 0.15), (0.7, 0.08), (0.5, 0.3),
                                  (0.85, 0.4), (0.3, 0.5)]):
        x, y = int(pw * dx), int(ph * dy)
        r = u(26 + 8 * (i % 3))
        d3.ellipse([x - r, y - r, x + r, y + int(r * 1.4)], fill=(214, 222, 230))
        d3.ellipse([x - r // 3, y - r // 2, x, y], fill=(240, 244, 248))
    d3.rectangle([0, int(ph * 0.60), pw, int(ph * 0.60) + u(90)], fill=(126, 108, 86))
    d3.ellipse([u(60), int(ph * 0.60) + u(20), pw - u(60), int(ph * 0.60) + u(70)],
               fill=(168, 178, 190))
    cardinal(p3, pw // 2, int(ph * 0.44), u(120), facing=1, ground=int(ph * 0.60))
    panels.append(p3)
    x = gap
    d = ImageDraw.Draw(img)
    for p in panels:
        shadow(img, [x + u(10), gap + ph - u(30), x + pw - u(10), gap + ph + u(60)],
               blur=u(24), alpha=45)
        img.paste(p, (x, gap))
        d.rectangle([x - u(6), gap - u(6), x + pw + u(6), gap + ph + u(6)],
                    outline=(139, 121, 97), width=u(10))
        x += pw + gap
    finish(img, "three-panel-cardinals", vignette=0.06)


def tree_branch():
    img = canvas()
    vgrad(img, (240, 241, 226), (223, 232, 206), 0, u(1320))
    vgrad(img, (191, 207, 158), (216, 227, 192), u(1320), S)
    glow(img, u(360), u(280), u(560), color=(255, 240, 190), alpha=95)
    # sun rays
    overlay(img, lambda d: [d.polygon([(u(360), u(280)), (u(360 + dx1), S),
            (u(360 + dx2), S)], fill=(255, 240, 190, 40)) for dx1, dx2 in
            [(-500, -200), (200, 600), (900, 1400)]], blur=u(60))
    # soft clouds
    overlay(img, lambda d: [d.ellipse([u(x - 300), u(y), u(x + 300), u(y + 110)],
            fill=(252, 250, 240, 150)) for x, y in [(1800, 240), (900, 130)]],
            blur=u(40))
    d = ImageDraw.Draw(img)
    # field texture: sparse grass ticks and tiny flowers
    for i in range(40):
        x = (i * 587) % 2400
        y = 1400 + (i * 311) % 900
        d.line([(u(x), u(y)), (u(x + 14), u(y - 34))], fill=(166, 186, 132),
               width=u(8))
    for corner_x in (140, 2160):
        for j, (dx, dy) in enumerate([(-40, 0), (0, -20), (40, 0)]):
            d.line([(u(corner_x + dx), u(2330)), (u(corner_x + dx + 10),
                    u(2330 + dy - 130))], fill=(142, 166, 108), width=u(12))
    for x, y in [(300, 1650), (700, 1980), (1500, 2200), (2050, 1750), (1150, 1600)]:
        d.ellipse([u(x - 16), u(y - 16), u(x + 16), u(y + 16)], fill=(246, 240, 224))
        d.ellipse([u(x - 6), u(y - 6), u(x + 6), u(y + 6)], fill=(226, 184, 92))
    # branch from top right, with bark lines and buds
    d.line([(S, u(190)), (u(1140), u(600))], fill=(105, 84, 62), width=u(115))
    d.line([(S, u(170)), (u(1400), u(500))], fill=(88, 70, 52), width=u(14))
    d.line([(u(1770), u(400)), (u(1560), u(160))], fill=(105, 84, 62), width=u(62))
    d.line([(u(1470), u(505)), (u(1200), u(360))], fill=(105, 84, 62), width=u(48))
    for x, y in [(1560, 170), (1210, 370), (1300, 585)]:
        d.ellipse([u(x - 26), u(y - 26), u(x + 26), u(y + 26)], fill=(150, 172, 118))
    # cardinal on the branch, looking down at Rob
    cx, cy = u(1330), u(505)
    glow(img, cx, cy, u(300), alpha=95)
    cardinal(img, cx, cy, u(130), facing=-1, ground=u(660))
    # Rob, back view, looking up
    bx, by = u(680), u(1580)
    shadow(img, [bx - u(300), S - u(240), bx + u(300), S - u(120)], blur=u(40),
           alpha=55)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([bx - u(280), by - u(80), bx + u(280), S + u(200)], u(150),
                        fill=(74, 94, 152))
    d.rounded_rectangle([bx + u(120), by + u(60), bx + u(330), by + u(600)], u(90),
                        fill=(66, 84, 138))
    d.ellipse([bx - u(215), by - u(520), bx + u(215), by - u(70)],
              fill=(240, 194, 154))
    d.ellipse([bx - u(230), by - u(560), bx + u(230), by - u(240)], fill=(48, 40, 34))
    d.ellipse([bx - u(130), by - u(575), bx + u(240), by - u(320)], fill=(48, 40, 34))
    d.ellipse([bx + u(150), by - u(300), bx + u(230), by - u(180)],
              fill=(240, 194, 154))
    finish(img, "cardinal-tree-branch")


def sunset():
    img = canvas()
    vgrad(img, (247, 227, 191), (243, 180, 130), 0, u(1180))
    vgrad(img, (243, 180, 130), (216, 120, 104), u(1180), u(2040))
    # sun low behind the houses
    glow(img, u(1200), u(1720), u(760), color=(255, 216, 150), alpha=150)
    d = ImageDraw.Draw(img)
    d.ellipse([u(970), u(1560), u(1430), u(2020)], fill=(255, 226, 158))
    # cloud bands with lit rims
    overlay(img, lambda d: [d.ellipse([u(x - 420), u(y), u(x + 420), u(y + 90)],
            fill=(255, 236, 206, 55)) for x, y in
            [(500, 420), (1500, 300), (2000, 560), (900, 700)]], blur=u(40))
    overlay(img, lambda d: [d.ellipse([u(x - 380), u(y - 14), u(x + 380), u(y + 20)],
            fill=(255, 246, 224, 80)) for x, y in
            [(500, 420), (1500, 300), (2000, 560), (900, 700)]], blur=u(24))
    # one early star
    stars(img, [(2130, 190)], r=8)
    d = ImageDraw.Draw(img)
    # house silhouettes
    base = u(2040)
    d.rectangle([0, base, S, S], fill=(72, 58, 56))
    for x0, w, h, roof in [(50, 300, 260, 140), (480, 380, 380, 170),
                           (1130, 320, 300, 150), (1590, 420, 430, 190),
                           (2160, 260, 240, 120)]:
        d.rectangle([u(x0), base - u(h), u(x0 + w), base], fill=(72, 58, 56))
        d.polygon([(u(x0 - 30), base - u(h)), (u(x0 + w // 2), base - u(h + roof)),
                   (u(x0 + w + 30), base - u(h))], fill=(72, 58, 56))
    for x in (640, 1740):
        d.rectangle([u(x), base - u(560), u(x + 70), base - u(380)], fill=(72, 58, 56))
    for wx, wy in [(620, 1720), (1730, 1660), (1250, 1830), (170, 1870)]:
        d.rectangle([u(wx), u(wy), u(wx + 60), u(wy + 84)], fill=(246, 202, 120))
    # the cardinal, flying home, with a soft trail of light
    cx, cy = u(1180), u(820)
    overlay(img, lambda d: [d.ellipse([cx - u(400 + i * 260) - r, cy + u(120 + i * 90)
            - r, cx - u(400 + i * 260) + r, cy + u(120 + i * 90) + r],
            fill=(255, 216, 150, 90 - i * 25)) for i, r in
            enumerate((u(60), u(44), u(30)))], blur=u(30))
    glow(img, cx, cy, u(400), alpha=130)
    cardinal(img, cx, cy, u(150), facing=1, flying=True)
    finish(img, "cardinal-sunset", vignette=0.08)


def mama_at_window():
    """Mama kneeling beside Rob at the window, the cardinal outside."""
    img = canvas()
    vgrad(img, (242, 230, 208), (227, 210, 181), 0, u(1980))
    d = ImageDraw.Draw(img)
    d.rectangle([0, u(1980), S, S], fill=(197, 155, 107))
    d.line([(0, u(1980)), (S, u(1980))], fill=(168, 128, 84), width=u(12))
    glow(img, u(2140), u(220), u(420), color=(255, 226, 170), alpha=60)
    d = ImageDraw.Draw(img)
    # window
    wx0, wy0, wx1, wy1 = u(520), u(300), u(1880), u(1380)
    d.rectangle([wx0 - u(56), wy0 - u(56), wx1 + u(56), wy1 + u(56)],
                fill=(139, 121, 97))
    d.rectangle([wx0 - u(30), wy0 - u(30), wx1 + u(30), wy1 + u(30)],
                fill=(120, 103, 82))
    win = Image.new("RGB", (wx1 - wx0, wy1 - wy0), (212, 222, 232))
    vgrad(win, (198, 210, 224), (234, 240, 246))
    wd = ImageDraw.Draw(win)
    wd.ellipse([-u(150), (wy1 - wy0) - u(280), (wx1 - wx0) + u(150),
                (wy1 - wy0) + u(200)], fill=SNOW)
    snowfall(win, 30, seed=31, rmin=4, rmax=9)
    img.paste(win, (wx0, wy0))
    # the cardinal on the outer sill, left pane, in clear view
    csx = wx0 + int((wx1 - wx0) * 0.15)
    glow(img, csx, wy1 - u(240), u(280), alpha=105)
    cardinal(img, csx, wy1 - u(240), u(110), facing=1, ground=wy1 - u(40))
    d = ImageDraw.Draw(img)
    d.line([((wx0 + wx1) // 2, wy0), ((wx0 + wx1) // 2, wy1)],
           fill=(120, 103, 82), width=u(26))
    d.rectangle([wx0 - u(66), wy1 + u(26), wx1 + u(66), wy1 + u(74)], fill=SNOW)
    # curtains
    for cx0 in (wx0 - u(140), wx1 + u(40)):
        d.rounded_rectangle([cx0, wy0 - u(80), cx0 + u(100), wy1 + u(90)], u(40),
                            fill=(196, 120, 94))
        d.ellipse([cx0 + u(18), wy1 - u(180), cx0 + u(82), wy1 - u(116)],
                  fill=(160, 92, 70))
    # Rob, back view at the left, pointing up at the bird
    bx, by = u(1150), u(1720)
    shadow(img, [bx - u(230), u(2290), bx + u(230), u(2380)], blur=u(30), alpha=50)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([bx - u(190), by - u(160), bx + u(190), u(2330)], u(110),
                        fill=(182, 69, 58))
    # pointing arm toward the cardinal
    d.line([(bx - u(80), by - u(60)), (bx - u(330), by - u(400))],
           fill=(182, 69, 58), width=u(90))
    d.ellipse([bx - u(385), by - u(475), bx - u(290), by - u(380)],
              fill=(240, 194, 154))
    d.ellipse([bx - u(140), by - u(440), bx + u(140), by - u(140)],
              fill=(240, 194, 154))
    d.ellipse([bx - u(150), by - u(465), bx + u(150), by - u(255)], fill=(48, 40, 34))
    d.ellipse([bx - u(55), by - u(470), bx + u(165), by - u(310)], fill=(48, 40, 34))
    # Mama kneeling close beside him, back view, arm around his shoulders
    mx, my = u(1680), u(1430)
    shadow(img, [mx - u(330), u(2290), mx + u(330), u(2390)], blur=u(30), alpha=50)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([mx - u(300), my + u(560), mx + u(300), u(2340)], u(120),
                        fill=(112, 128, 168))
    d.rounded_rectangle([mx - u(280), my - u(60), mx + u(280), u(2160)], u(160),
                        fill=(236, 232, 224))
    # arm reaching around Rob's shoulders
    d.line([(mx - u(180), my + u(160)), (bx + u(60), by - u(310))],
           fill=(236, 232, 224), width=u(110))
    d.ellipse([bx - u(20), by - u(380), bx + u(120), by - u(240)],
              fill=(238, 190, 150))
    # head fully wrapped in soft blonde waves (back view)
    d.ellipse([mx - u(200), my - u(500), mx + u(200), my - u(40)],
              fill=(224, 186, 122))
    d.ellipse([mx - u(240), my - u(330), mx - u(80), my + u(60)],
              fill=(224, 186, 122))
    d.ellipse([mx + u(80), my - u(330), mx + u(240), my + u(60)],
              fill=(224, 186, 122))
    d.ellipse([mx - u(130), my - u(560), mx + u(130), my - u(380)],
              fill=(212, 172, 108))
    finish(img, "mama-at-window")


if __name__ == "__main__":
    snowy_truck()
    empty_bleachers()
    boy_at_table()
    cardinal_windowsill()
    hand_on_glass()
    three_panel()
    tree_branch()
    sunset()
    mama_at_window()
    print("done")
