"""Build KDP-ready files for The Promise: A Name to Grow Into."""
from PIL import Image, ImageDraw, ImageFont
import os

ART = '/home/user/test/childrens-book/the-promise/art/'
OUT = '/home/user/test/childrens-book/the-promise/kdp/'
os.makedirs(OUT, exist_ok=True)

DPI = 300
TRIM = int(8.5 * DPI)                 # 2550
PAGE_W = TRIM + int(0.125 * DPI)      # bleed on outside edge
PAGE_H = TRIM + int(0.25 * DPI)       # bleed top + bottom
CREAM = (246, 239, 226)
INK = (56, 44, 36)
RED = (142, 35, 32)
SOFT = (110, 93, 80)

F = '/usr/share/fonts/truetype/freefont/'
f_title = ImageFont.truetype(F + 'FreeSerifBold.ttf', 110)
f_body = ImageFont.truetype(F + 'FreeSerif.ttf', 88)
f_ital = ImageFont.truetype(F + 'FreeSerifItalic.ttf', 88)
f_big = ImageFont.truetype(F + 'FreeSerifBold.ttf', 220)
f_sub = ImageFont.truetype(F + 'FreeSerifItalic.ttf', 110)
f_small = ImageFont.truetype(F + 'FreeSerif.ttf', 60)
f_tiny = ImageFont.truetype(F + 'FreeSerif.ttf', 48)

PAGES = [
    ('THE DAY YOU PICKED ME', [
        ["Some kids come to their fathers", "the ordinary way."],
        ["I didn't."],
        ["You looked at me,", "and you picked me."],
        ["On purpose."]], 'the-day-you-picked-me.jpeg'),
    ('THE NAME', [
        ["You gave me your name."],
        ["It was too big for me then,", "like your coat."],
        ['"Don\'t worry," you said.', '"It\'s a name to grow into."']], 'the-name-mirror.jpeg'),
    (None, [
        ["You didn't teach me with speeches."],
        ["You taught me by being there."],
        ["Again.", "And again.", "And again."]], 'father-and-boy.jpeg'),
    ('WHAT STAYING LOOKS LIKE', [
        ["Sitting in the bleachers.", "Sitting in the waiting room.", "Sitting on the edge of my bed",
         "on the nights I couldn't say why I was sad."],
        ["You never fixed it from the doorway."],
        ["You always came in", "and sat down."]], 'bleachers.jpeg'),
    ('THE HARD YEARS', [
        ["I got lost for a while.", "Most people would have stopped looking."],
        ["You didn't."],
        ["You came and got me.", "Like the first time."],
        ["On purpose."]], 'the-hard-years-waiting.jpeg'),
    ('GROWN', [
        ["One day the coat fit."],
        ["One day the name fit, too."],
        ["And I understood", "that you hadn't just given me a name."],
        ["You'd shown me what to do with it."]], 'grown-the-coat-fits.jpeg'),
    ('THE WORK I DO NOW', [
        ["Years later,", "I sit beside people", "who are saying goodbye."],
        ["Families.", "Grandfathers.", "Mothers."],
        ["People who are scared."],
        ["I stay."],
        ["Because you taught me how."]], 'the-work-i-do-now.jpeg'),
    ('THE PROMISE', [
        ["You picked me once."],
        ["Now I spend my life", "picking others."],
        ["Sitting down."],
        ["Showing up."],
        ["Staying."],
        ["The promise", "is still being kept."]], 'the-promise.jpeg'),
    ('A NAME TO GROW INTO', [
        ["Someday, somebody small", "might get my name."],
        ["It'll be too big for them at first."],
        ["That's all right."],
        ["I know exactly", "what to tell them."]], 'family-portrait.jpeg'),
    ('THE RED BIRD', [
        ["On the day you drove me home,", "a red bird sat outside the car window."],
        ["You said it meant", "somebody who loved me was near."],
        ["You were right."],
        ["It was you."]], 'the-red-bird.jpeg'),
]


def blank():
    return Image.new('RGB', (PAGE_W, PAGE_H), CREAM)


def center_text(d, y, text, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    d.text(((PAGE_W - (bb[2] - bb[0])) // 2 - bb[0], y), text, font=font, fill=fill)
    return (bb[3] - bb[1])


def text_page(title, stanzas):
    im = blank()
    d = ImageDraw.Draw(im)
    line_h = 128
    para_gap = 70
    n_lines = sum(len(p) for p in stanzas)
    block_h = n_lines * line_h + (len(stanzas) - 1) * para_gap + (190 if title else 0)
    y = (PAGE_H - block_h) // 2
    if title:
        center_text(d, y, title, f_title, RED)
        y += 190
    for para in stanzas:
        for line in para:
            center_text(d, y, line, f_body, INK)
            y += line_h
        y += para_gap
    return im


def art_page(fname):
    im = blank()
    art = Image.open(ART + fname).convert('RGB')
    box = TRIM - 200  # generous mat inside trim
    scale = min(box / art.width, box / art.height)
    art = art.resize((int(art.width * scale), int(art.height * scale)), Image.LANCZOS)
    im.paste(art, ((PAGE_W - art.width) // 2, (PAGE_H - art.height) // 2))
    return im


pages = []

# 1 half title
im = blank(); d = ImageDraw.Draw(im)
center_text(d, PAGE_H // 2 - 100, 'The Promise', f_big, RED)
pages.append(im)

# 2 title page
im = blank(); d = ImageDraw.Draw(im)
y = PAGE_H // 2 - 480
center_text(d, y, 'THE PROMISE', f_big, RED); y += 340
center_text(d, y, 'A Name to Grow Into', f_sub, INK); y += 320
center_text(d, y, 'Rob Brizzi', f_title, INK); y += 260
center_text(d, y, 'BRIZZI HOUSE PUBLISHING', f_small, SOFT)
pages.append(im)

# 3 copyright
im = blank(); d = ImageDraw.Draw(im)
y = PAGE_H - 900
for line in ['The Promise: A Name to Grow Into',
             'Copyright © 2026 Rob Brizzi. All rights reserved.',
             'No part of this book may be reproduced without permission.',
             'Brizzi House Publishing',
             'First edition, 2026']:
    center_text(d, y, line, f_tiny, SOFT); y += 90
pages.append(im)

# 4 dedication
im = blank(); d = ImageDraw.Draw(im)
y = PAGE_H // 2 - 260
for line in ['For the man who picked me —', 'and for everyone still sitting down,',
             'showing up,', 'and staying.']:
    center_text(d, y, line, f_ital, INK); y += 130
pages.append(im)

# 5-24: text/art spreads
for title, stanzas, fname in PAGES:
    pages.append(text_page(title, stanzas))
    pages.append(art_page(fname))

print('interior pages:', len(pages))
pages[0].save(OUT + 'the-promise-interior-8.5x8.5.pdf', save_all=True,
              append_images=pages[1:], resolution=DPI)

# ---------- ebook cover (portrait 1600x2560) ----------
cov = Image.new('RGB', (1600, 2560), CREAM)
d = ImageDraw.Draw(cov)
cf_big = ImageFont.truetype(F + 'FreeSerifBold.ttf', 200)
cf_sub = ImageFont.truetype(F + 'FreeSerifItalic.ttf', 96)
cf_by = ImageFont.truetype(F + 'FreeSerifBold.ttf', 92)
cf_imp = ImageFont.truetype(F + 'FreeSerif.ttf', 44)

def ctr(y, text, font, fill, W=1600):
    bb = d.textbbox((0, 0), text, font=font)
    d.text(((W - (bb[2] - bb[0])) // 2 - bb[0], y), text, font=font, fill=fill)

ctr(170, 'THE PROMISE', cf_big, RED)
ctr(430, 'A Name to Grow Into', cf_sub, INK)
art = Image.open(ART + 'father-and-boy.jpeg').convert('RGB')
scale = 1440 / art.width
art = art.resize((1440, int(art.height * scale)), Image.LANCZOS)
cov.paste(art, ((1600 - art.width) // 2, 640))
ctr(640 + art.height + 130, 'Rob Brizzi', cf_by, INK)
ctr(2560 - 140, 'BRIZZI HOUSE PUBLISHING', cf_imp, SOFT)
cov.save(OUT + 'the-promise-cover-ebook.jpg', quality=95)
print('ebook cover done')

# ---------- paperback wrap: back + spine + front, 24pp premium color ----------
SPINE = int(24 * 0.002347 * DPI)  # ~17 px
WRAP_W = int((0.125 + 8.5) * DPI) * 2 + SPINE
WRAP_H = PAGE_H
wrap = Image.new('RGB', (WRAP_W, WRAP_H), CREAM)
d = ImageDraw.Draw(wrap)
front_x0 = WRAP_W - int(8.625 * DPI)  # front cover left edge

def ctr_in(x0, x1, y, text, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    d.text((x0 + ((x1 - x0) - (bb[2] - bb[0])) // 2 - bb[0], y), text, font=font, fill=fill)

# front
wf_big = ImageFont.truetype(F + 'FreeSerifBold.ttf', 300)
wf_sub = ImageFont.truetype(F + 'FreeSerifItalic.ttf', 130)
wf_by = ImageFont.truetype(F + 'FreeSerifBold.ttf', 120)
ctr_in(front_x0, WRAP_W, 260, 'THE PROMISE', wf_big, RED)
ctr_in(front_x0, WRAP_W, 640, 'A Name to Grow Into', wf_sub, INK)
art = Image.open(ART + 'father-and-boy.jpeg').convert('RGB')
scale = 1700 / art.width
art = art.resize((1700, int(art.height * scale)), Image.LANCZOS)
wrap.paste(art, (front_x0 + (int(8.625 * DPI) - art.width) // 2, 900))
ctr_in(front_x0, WRAP_W, 900 + art.height + 120, 'Rob Brizzi', wf_by, INK)

# back
bx0, bx1 = 0, int(8.625 * DPI)
bf_quote = ImageFont.truetype(F + 'FreeSerifBoldItalic.ttf', 105)
bf_body = ImageFont.truetype(F + 'FreeSerif.ttf', 78)
y = 460
for line in ['"You picked me once.', 'Now I spend my life picking others."']:
    ctr_in(bx0, bx1, y, line, bf_quote, RED); y += 150
y += 180
for line in ['A story about the father who chose a boy,',
             'the name he gave him, and the promise',
             'that is still being kept.',
             '',
             'For every family built on purpose —',
             'and everyone still sitting down,',
             'showing up, and staying.']:
    if line:
        ctr_in(bx0, bx1, y, line, bf_body, INK)
    y += 115
ctr_in(bx0, bx1, WRAP_H - 420, 'BRIZZI HOUSE PUBLISHING', f_small, SOFT)
# white box bottom-right of back cover for the KDP barcode (2" x 1.2")
bw, bh = int(2 * DPI), int(1.2 * DPI)
bx = int(8.625 * DPI) - bw - int(0.375 * DPI)
by = WRAP_H - bh - int(0.375 * DPI)
d.rectangle([bx, by, bx + bw, by + bh], fill=(255, 255, 255))
wrap.save(OUT + 'the-promise-paperback-cover-wrap.pdf', resolution=DPI)
print('wrap done', wrap.size)
