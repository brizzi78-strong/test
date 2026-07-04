#!/usr/bin/env python3
"""Build the KDP print interior for The Little Cardinal's Promise.

Matches the companion book's conventions: 8.5x8.5" trim with bleed
(8.625x8.75" page = 621x630 pt), every page rasterized at 300 DPI on
the same cream, Times-metric serif text, art centered on cream mats.

Pages whose artwork is still pending render as clearly-marked
placeholder pages. Drop the finished art at the path listed in PENDING
below and re-run:

    python3 book/tools/build_kdp_interior.py

Output: book/print/the-little-cardinals-promise-interior-8.5x8.5.pdf
(suffixed -DRAFT while any placeholder remains).

Requires: Pillow, img2pdf  (pip install Pillow img2pdf)
"""
from PIL import Image, ImageDraw, ImageFont
import img2pdf
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent      # book/
ILL = ROOT / "illustrations"
OUT_DIR = ROOT / "print"
PAGES_DIR = OUT_DIR / "pages"

# ---- geometry (300 DPI) ----------------------------------------------
W, H = 2588, 2625            # 8.625 x 8.75 in with bleed
PT_W, PT_H = 621.0, 630.0    # exact KDP page size in points
SAFE = 260                   # keep text/art this far from page edge

# ---- palette / type ---------------------------------------------------
CREAM = (247, 239, 226)      # sampled from the companion interior
INK = (74, 62, 50)
RED = (154, 40, 32)
WINTER = (125, 143, 163)

FONT_DIR = pathlib.Path("/usr/share/fonts/truetype/liberation")
def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)

F_TITLE = lambda s=150: font("LiberationSerif-Bold.ttf", s)
F_HEAD = font("LiberationSerif-Bold.ttf", 96)
F_BODY = font("LiberationSerif-Regular.ttf", 64)
F_ITAL = font("LiberationSerif-Italic.ttf", 64)
F_SMALL = font("LiberationSerif-Regular.ttf", 48)
F_LABEL = font("LiberationSerif-Bold.ttf", 54)

LINE = 1.55                  # line spacing multiple
STANZA = 1.1                 # extra gap between stanzas, in lines


def blank():
    return Image.new("RGB", (W, H), CREAM)


def text_block_height(stanzas, body_font, head=None):
    lh = int(body_font.size * LINE)
    n_lines = sum(len(s) for s in stanzas)
    n_gaps = max(0, len(stanzas) - 1)
    h = n_lines * lh + int(n_gaps * STANZA * lh)
    if head:
        h += int(F_HEAD.size * 1.9)
    return h


def draw_stanzas(img, stanzas, head=None, body_font=None, color=INK,
                 y=None):
    body_font = body_font or F_BODY
    d = ImageDraw.Draw(img)
    total = text_block_height(stanzas, body_font, head)
    y = y if y is not None else (H - total) // 2
    if head:
        d.text((W // 2, y), head, font=F_HEAD, fill=RED, anchor="ma")
        y += int(F_HEAD.size * 1.9)
    lh = int(body_font.size * LINE)
    for stanza in stanzas:
        for line in stanza:
            d.text((W // 2, y), line, font=body_font, fill=color, anchor="ma")
            y += lh
        y += int(STANZA * lh)
    return y


def art_page(path, inset=None):
    """Art centered on cream. Optional inset image pasted lower-right."""
    img = blank()
    art = Image.open(path).convert("RGB")
    box = (W - 2 * SAFE + 120, H - 2 * SAFE + 120)   # a touch roomier than text
    scale = min(box[0] / art.width, box[1] / art.height)
    art = art.resize((int(art.width * scale), int(art.height * scale)),
                     Image.LANCZOS)
    img.paste(art, ((W - art.width) // 2, (H - art.height) // 2))
    if inset:
        ins = Image.open(inset).convert("RGB")
        iw = int(W * 0.24)
        ins = ins.resize((iw, int(ins.height * iw / ins.width)), Image.LANCZOS)
        bordered = Image.new("RGB", (ins.width + 24, ins.height + 24), CREAM)
        bordered.paste(ins, (12, 12))
        img.paste(bordered, (W - bordered.width - SAFE + 40,
                             H - bordered.height - SAFE + 40))
    return img


def placeholder_page(scene):
    img = blank()
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = SAFE, SAFE, W - SAFE, H - SAFE
    dash, gap = 42, 30
    x = x0
    while x < x1:
        d.line([(x, y0), (min(x + dash, x1), y0)], fill=WINTER, width=6)
        d.line([(x, y1), (min(x + dash, x1), y1)], fill=WINTER, width=6)
        x += dash + gap
    y = y0
    while y < y1:
        d.line([(x0, y), (x0, min(y + dash, y1))], fill=WINTER, width=6)
        d.line([(x1, y), (x1, min(y + dash, y1))], fill=WINTER, width=6)
        y += dash + gap
    d.text((W // 2, H // 2 - 70), "ARTWORK TO COME", font=F_LABEL,
           fill=WINTER, anchor="mm")
    d.text((W // 2, H // 2 + 40), scene, font=F_ITAL, fill=INK, anchor="mm")
    return img


# ---- expected paths for the eight pending illustrations ---------------
PENDING = {
    "snowy-truck": "Snowy street — the red truck parked outside a quiet house",
    "empty-bleachers": "Empty bleachers under fresh snow, a faint cardinal above",
    "boy-at-table": "Rob at the kitchen table, turning toward the window",
    "cardinal-windowsill": "The bright red cardinal on the snowy windowsill",
    "hand-on-glass": "Rob's hand on the cold glass, the cardinal outside",
    "three-panel-cardinals": "Three panels — table, bleachers, windowsill",
    "cardinal-tree-branch": "Rob looking up at the cardinal on a bare branch",
    "cardinal-sunset": "The cardinal flying across a pink-and-gold sunset",
}

def art_or_placeholder(key):
    p = ILL / "pending" / f"{key}.jpeg"
    if p.exists():
        return art_page(p)
    return placeholder_page(PENDING[key])


def build_pages():
    pages = []
    add = pages.append

    # 1 half title
    img = blank()
    ImageDraw.Draw(img).text((W // 2, H // 2), "The Little Cardinal's Promise",
                             font=F_TITLE(120), fill=RED, anchor="mm")
    add(img)

    # 2 title page
    img = blank()
    d = ImageDraw.Draw(img)
    d.text((W // 2, int(H * 0.36)), "THE LITTLE", font=F_TITLE(170), fill=RED, anchor="mm")
    d.text((W // 2, int(H * 0.44)), "CARDINAL'S PROMISE", font=F_TITLE(170), fill=RED, anchor="mm")
    d.text((W // 2, int(H * 0.56)), "Rob Brizzi", font=font("LiberationSerif-Bold.ttf", 84), fill=INK, anchor="mm")
    d.text((W // 2, int(H * 0.64)), "CARDINAL PRESS", font=F_SMALL, fill=(124, 106, 85), anchor="mm")
    add(img)

    # 3 copyright (bottom third, like the companion)
    img = blank()
    draw_stanzas(img, [[
        "The Little Cardinal's Promise",
        "Copyright © 2026 Rob Brizzi. All rights reserved.",
        "No part of this book may be reproduced without permission.",
        "Cardinal Press",
        "First edition, 2026",
    ]], body_font=F_SMALL, y=int(H * 0.62))
    add(img)

    # 4 dedication + wedding memory
    img = blank()
    draw_stanzas(img, [["For the ones watching the windows."]],
                 body_font=F_ITAL, y=int(H * 0.16))
    wed = Image.open(ILL / "wedding-day.jpeg").convert("RGB")
    box_h = int(H * 0.52)
    scale = min((W - 2 * SAFE) / wed.width, box_h / wed.height)
    wed = wed.resize((int(wed.width * scale), int(wed.height * scale)), Image.LANCZOS)
    img.paste(wed, ((W - wed.width) // 2, int(H * 0.30)))
    add(img)

    story = [
        (None, [["Rob's dad was the kind of dad", "who showed up —",
                 "in his blue shirt, arms open,", "every single time."]],
         ("art", ILL / "print" / "lap-hug.jpeg", None)),
        (None, [["He came to the games Rob won,", "and the games Rob lost."],
                ["Always in the third row."],
                ["Blue shirt. Arms crossed. Watching. Proud."]],
         ("art", ILL / "print" / "bleachers-brizzi.jpeg", None)),
        (None, [["Saturdays were for fly balls.", "A hundred of them, then a hundred more."],
                ["“One more,” Dad always said,", "kneeling in the grass with that proud smile."]],
         ("art", ILL / "print" / "doorway-talk.jpeg", ILL / "print" / "dad-yankees-cap.jpeg")),
        (None, [["Dad made one promise, and only one."],
                ["“No matter what,” he said, kneeling with the ball,",
                 "“I will always show up for you.”"]],
         ("art", ILL / "print" / "mirror-hug.jpeg", None)),
        (None, [["Dad's old blue shirt was too big…", "but Rob wore it anyway."],
                ["It still smelled like Saturday mornings."]],
         ("art", ILL / "torn-jacket.jpeg", None)),
        (None, [["One winter, Dad got sick.", "His naps got longer. His voice got softer."],
                ["But when Rob sat beside him,", "Dad still smiled the smile that meant:",
                 "you're mine, and I'm glad."]],
         ("art", ILL / "hospital-bedside.jpeg", None)),
        (None, [["“Then who will show up for me?” Rob asked.",
                 "Dad heard him. He held out his hand."],
                ["“Watch for me,” Dad whispered.", "“I keep my promises.”"]],
         ("art", ILL / "print" / "car-window-cardinal.jpeg", None)),
        (None, [["Dad died on a snowy day.", "The house got quiet. The truck stayed parked."],
                ["Rob didn't want breakfast.", "He didn't want fly balls.",
                 "He didn't want anything at all."]],
         ("pending", "snowy-truck")),
        (None, [["The quiet stayed a long time."]],
         ("pending", "empty-bleachers")),
        (None, [["One cold morning, Rob heard a tap."], ["Tap. Tap-tap."]],
         ("pending", "boy-at-table")),
        (None, [["On the window sat a bird.", "Not a brown bird. Not a gray bird.",
                 "A bright red bird. Red as Dad's truck."],
                ["It looked right at Rob.", "And it stayed."]],
         ("pending", "cardinal-windowsill")),
        (None, [["“Mama!” Rob whispered.", "“It's not flying away!”"],
                ["Mama knelt beside him,", "and her eyes went shiny."],
                ["“You know what some people say about red birds,” she said.",
                 "“They say a cardinal is how love shows up… after.”"]],
         ("art", ILL / "mama-and-young-rob.jpeg", None)),
        (None, [["Rob put his hand against the cold glass.",
                 "“You came,” he said, eyes shining.", "“You kept your promise.”"],
                ["The cardinal tipped its head —", "the exact way Dad did",
                 "when he was proud and didn't say so."]],
         ("pending", "hand-on-glass")),
        (None, [["The cardinal didn't come every day.", "But it came."],
                ["On the first day of school.", "At the last game of the season."],
                ["On days when Rob missed Dad", "so much his chest hurt —", "tap. Tap-tap."]],
         ("pending", "three-panel-cardinals")),
        (None, [["Now, when the world feels too quiet…", "watch the windows."],
                ["Red keeps its promises."]],
         ("art", ILL / "print" / "family-group-freedom.jpeg", None)),
        (None, [["And when the cardinal came,", "Rob always said the same thing."],
                ["“I see you. I love you too.”"],
                ["Because love that shows up", "never stops showing up.",
                 "It just changes where it sits."]],
         ("pending", "cardinal-tree-branch")),
        (None, [["Now, when the world feels too quiet…", "watch the windows.",
                 "Watch the fences and the branches and the snow."],
                ["Red keeps its promises."]],
         ("pending", "cardinal-sunset")),
    ]

    pending_count = 0
    for head, stanzas, art in story:
        img = blank()
        draw_stanzas(img, stanzas, head=head)
        add(img)
        if art[0] == "art":
            add(art_page(art[1], inset=art[2]))
        else:
            page = art_or_placeholder(art[1])
            if not (ILL / "pending" / f"{art[1]}.jpeg").exists():
                pending_count += 1
            add(page)

    # author note
    img = blank()
    draw_stanzas(img, [
        ["When you talk with a child about death,", "use the real words.",
         "Say died, not went to sleep."],
        ["Let them see that you miss the person too;",
         "grief shared is grief halved,", "even for the smallest hearts."],
        ["And when a red bird lands, let it be a comfort",
         "without being a test.", "The point was never the bird."],
        ["The point is that love that showed up", "keeps showing up.",
         "It just changes where it sits."],
    ], head="A NOTE FOR GROWN-UPS", body_font=font("LiberationSerif-Regular.ttf", 56))
    add(img)

    # closing page
    img = blank()
    d = ImageDraw.Draw(img)
    d.text((W // 2, int(H * 0.46)), "Rob Brizzi", font=font("LiberationSerif-Bold.ttf", 72), fill=INK, anchor="mm")
    d.text((W // 2, int(H * 0.53)), "Brizzi House Publishing  ·  2026", font=F_SMALL, fill=(124, 106, 85), anchor="mm")
    add(img)

    return pages, pending_count


def main():
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    pages, pending_count = build_pages()
    jpegs = []
    for i, page in enumerate(pages, 1):
        p = PAGES_DIR / f"page-{i:02d}.jpg"
        page.save(p, "JPEG", quality=92, dpi=(300, 300))
        jpegs.append(str(p))

    suffix = "-DRAFT" if pending_count else ""
    out = OUT_DIR / f"the-little-cardinals-promise-interior-8.5x8.5{suffix}.pdf"
    layout = img2pdf.get_fixed_dpi_layout_fun((300, 300))
    with open(out, "wb") as fh:
        fh.write(img2pdf.convert(jpegs, layout_fun=layout))
    size_mb = out.stat().st_size / 1e6
    print(f"{len(pages)} pages -> {out}  ({size_mb:.1f} MB)")
    if pending_count:
        print(f"{pending_count} placeholder page(s) remain; drop art into "
              f"{ILL / 'pending'} and re-run.")
    else:
        print("All artwork present - interior is placeholder-free.")


if __name__ == "__main__":
    sys.exit(main())
