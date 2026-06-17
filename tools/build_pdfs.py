#!/usr/bin/env python3
"""
Build branded, downloadable PDF lead magnets for The Cardinal Companion.

Pure-Python (reportlab only — no system libraries), so it runs anywhere:

    python3 -m pip install --user reportlab
    python3 tools/build_pdfs.py

Outputs to assets/pdf/. The content lives in MAGNETS below; edit it there and
re-run to regenerate. These PDFs are the "deepened" canonical version of the
printable web guides under free-guide/.
"""
import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# ---- Brand palette ---------------------------------------------------------
CARDINAL = (0.694, 0.208, 0.184)   # #b1352f
CARDINAL_DK = (0.549, 0.141, 0.122)
SAGE = (0.357, 0.482, 0.478)       # #5b7b7a
INK = (0.176, 0.165, 0.157)        # #2d2a28
INK_SOFT = (0.361, 0.329, 0.302)
GOLD = (0.788, 0.631, 0.290)       # #c9a14a
SAND = (0.953, 0.929, 0.902)       # #f3ede6
CREAM = (0.980, 0.969, 0.957)

SERIF = "Times-Roman"
SERIF_B = "Times-Bold"
SERIF_I = "Times-Italic"
SANS = "Helvetica"
SANS_B = "Helvetica-Bold"

PAGE_W, PAGE_H = LETTER
M = 0.9 * inch                      # content margin
CONTENT_W = PAGE_W - 2 * M
BOTTOM = 1.0 * inch                 # bottom limit before page break


def wrap(c, text, font, size, max_w):
    """Greedy word-wrap using the canvas's real string widths."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def draw_bird(c, cx, cy, s, color):
    """A simple stylized cardinal built from a few shapes."""
    c.saveState()
    c.setFillColor(color)
    c.setStrokeColor(color)
    # body
    c.ellipse(cx - 1.5 * s, cy - 1.7 * s, cx + 1.1 * s, cy + 0.9 * s, fill=1, stroke=0)
    # tail
    p = c.beginPath()
    p.moveTo(cx + 0.7 * s, cy - 0.2 * s)
    p.lineTo(cx + 2.4 * s, cy - 1.1 * s)
    p.lineTo(cx + 0.9 * s, cy - 1.2 * s)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    # head
    c.circle(cx - 0.8 * s, cy + 1.0 * s, 0.85 * s, fill=1, stroke=0)
    # crest
    p = c.beginPath()
    p.moveTo(cx - 1.3 * s, cy + 1.5 * s)
    p.lineTo(cx - 0.5 * s, cy + 2.5 * s)
    p.lineTo(cx - 0.2 * s, cy + 1.6 * s)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    # beak
    p = c.beginPath()
    p.moveTo(cx - 1.6 * s, cy + 1.0 * s)
    p.lineTo(cx - 2.5 * s, cy + 0.8 * s)
    p.lineTo(cx - 1.6 * s, cy + 0.6 * s)
    p.close()
    c.setFillColor(GOLD)
    c.drawPath(p, fill=1, stroke=0)
    # eye
    c.setFillColor(CREAM)
    c.circle(cx - 0.7 * s, cy + 1.1 * s, 0.13 * s, fill=1, stroke=0)
    c.restoreState()


def footer(c, page_num):
    c.saveState()
    c.setStrokeColor(SAND)
    c.setLineWidth(1)
    c.line(M, BOTTOM - 0.18 * inch, PAGE_W - M, BOTTOM - 0.18 * inch)
    c.setFont(SANS, 7.5)
    c.setFillColor(INK_SOFT)
    c.drawString(M, BOTTOM - 0.36 * inch, "The Cardinal Companion  ·  If you are in crisis, call or text 988 (US)")
    c.drawRightString(PAGE_W - M, BOTTOM - 0.36 * inch, "Page %d" % page_num)
    c.restoreState()


class Doc:
    def __init__(self, c):
        self.c = c
        self.y = PAGE_H - M
        self.page = 1  # cover is page 1; content begins on page 2

    def _space(self, h):
        if self.y - h < BOTTOM:
            footer(self.c, self.page)
            self.c.showPage()
            self.page += 1
            self.y = PAGE_H - M

    def heading(self, text):
        self._space(0.6 * inch)
        self.y -= 0.30 * inch
        c = self.c
        c.setStrokeColor(SAND)
        c.setLineWidth(2)
        c.line(M, self.y + 0.16 * inch, PAGE_W - M, self.y + 0.16 * inch)
        c.setFont(SERIF_B, 15)
        c.setFillColor(CARDINAL_DK)
        c.drawString(M, self.y - 0.04 * inch, text)
        self.y -= 0.26 * inch

    def para(self, text, color=INK_SOFT, font=SANS, size=10.5, lead=14.5, gap=0.10):
        for line in wrap(self.c, text, font, size, CONTENT_W):
            self._space(lead)
            self.c.setFont(font, size)
            self.c.setFillColor(color)
            self.c.drawString(M, self.y - size, line)
            self.y -= lead
        self.y -= gap * inch

    def check(self, text):
        size, lead = 10.5, 14.5
        box = 9
        indent = 0.28 * inch
        lines = wrap(self.c, text, SANS, size, CONTENT_W - indent)
        self._space(lead * len(lines) + 4)
        # checkbox aligned to first line
        c = self.c
        top = self.y
        c.setStrokeColor(SAGE)
        c.setLineWidth(1.3)
        c.rect(M, top - size - 1, box, box, fill=0, stroke=1)
        for i, line in enumerate(lines):
            self._space(lead) if i else None
            c.setFont(SANS, size)
            c.setFillColor(INK)
            c.drawString(M + indent, self.y - size, line)
            self.y -= lead
        self.y -= 0.045 * inch
        # subtle separator
        c.setStrokeColor((0.91, 0.87, 0.83))
        c.setLineWidth(0.5)
        c.setDash(1, 2)
        c.line(M + indent, self.y + 0.05 * inch, PAGE_W - M, self.y + 0.05 * inch)
        c.setDash()

    def blanks(self, label, n=1):
        size, lead = 10.5, 20
        for _ in range(n):
            self._space(lead)
            c = self.c
            c.setFont(SANS_B, size)
            c.setFillColor(INK)
            lw = c.stringWidth(label + "  ", SANS_B, size)
            c.drawString(M, self.y - size, label)
            c.setStrokeColor((0.78, 0.74, 0.70))
            c.setLineWidth(0.8)
            c.line(M + lw, self.y - size + 1, PAGE_W - M, self.y - size + 1)
            self.y -= lead
        self.y -= 0.10 * inch

    def callout(self, text, cite, color=CARDINAL):
        self._space(1.1 * inch)
        c = self.c
        pad = 0.22 * inch
        lines = wrap(c, text, SERIF_I, 11.5, CONTENT_W - 2 * pad)
        h = 0.36 * inch + len(lines) * 16 + 18
        top = self.y
        c.setFillColor(SAND)
        c.roundRect(M, top - h, CONTENT_W, h, 6, fill=1, stroke=0)
        c.setFillColor(color)
        c.rect(M, top - h, 4, h, fill=1, stroke=0)
        yy = top - pad
        c.setFont(SERIF_I, 11.5)
        c.setFillColor(INK)
        for line in lines:
            c.drawString(M + pad, yy - 11.5, line)
            yy -= 16
        c.setFont(SANS, 8.5)
        c.setFillColor(INK_SOFT)
        c.drawString(M + pad, yy - 10, cite)
        self.y = top - h - 0.18 * inch

    def cover(self, meta):
        c = self.c
        band_h = 3.5 * inch
        c.setFillColor(CARDINAL)
        c.rect(0, PAGE_H - band_h, PAGE_W, band_h, fill=1, stroke=0)
        # cream medallion + bird
        cx, cy = PAGE_W / 2, PAGE_H - band_h + 0.0 * inch
        c.setFillColor(CREAM)
        c.circle(PAGE_W / 2, PAGE_H - 1.45 * inch, 0.62 * inch, fill=1, stroke=0)
        draw_bird(c, PAGE_W / 2 + 0.06 * inch, PAGE_H - 1.5 * inch, 9, CARDINAL)
        # source eyebrow
        c.setFont(SANS_B, 10)
        c.setFillColor(CREAM)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 2.55 * inch, meta["source"].upper())
        # title
        c.setFillColor((1, 1, 1))
        tsize = 30
        for line in wrap(c, meta["title"], SERIF_B, tsize, CONTENT_W - 0.6 * inch):
            c.setFont(SERIF_B, tsize)
            c.drawCentredString(PAGE_W / 2, PAGE_H - 3.05 * inch, line)
            # (titles are short; single line expected)
        # subtitle below band
        c.setFillColor(INK_SOFT)
        sy = PAGE_H - band_h - 0.7 * inch
        for line in wrap(c, meta["subtitle"], SERIF_I, 13, CONTENT_W - 0.8 * inch):
            c.setFont(SERIF_I, 13)
            c.drawCentredString(PAGE_W / 2, sy, line)
            sy -= 18
        # footer strip on cover
        c.setFillColor(SAGE)
        c.rect(0, 0, PAGE_W, 0.55 * inch, fill=1, stroke=0)
        c.setFont(SANS_B, 10)
        c.setFillColor((1, 1, 1))
        c.drawCentredString(PAGE_W / 2, 0.22 * inch, "A FREE GUIDE  ·  THE CARDINAL COMPANION")
        c.showPage()
        self.page += 1
        self.y = PAGE_H - M


def build(meta, out_path):
    c = canvas.Canvas(out_path, pagesize=LETTER)
    c.setTitle(meta["title"])
    c.setAuthor("The Cardinal Companion")
    c.setSubject(meta["source"])
    d = Doc(c)
    d.cover(meta)
    if meta.get("intro"):
        d.para(meta["intro"], color=INK_SOFT, font=SANS, size=11, lead=15.5)
        d.y -= 0.05 * inch
    for block in meta["sections"]:
        if block[0] == "_blanks":
            d.heading(block[1])
            for lbl in block[2]:
                d.blanks(lbl, 1)
            continue
        d.heading(block[0])
        for item in block[1]:
            d.check(item)
    if meta.get("closing"):
        label, text, cite = meta["closing"]
        d.callout(text, cite, color=CARDINAL)
    if meta.get("promo"):
        d.para(meta["promo"], color=INK_SOFT, font=SANS_B, size=9.5, lead=13)
    footer(c, d.page)
    c.showPage()
    c.save()


# ---- Content (deepened) ----------------------------------------------------
MAGNETS = [
    {
        "out": "caregivers-first-week-checklist.pdf",
        "source": "From The Cardinal's Toolkit",
        "title": "The Caregiver's First-Week Checklist",
        "subtitle": "Just enough to get through the first overwhelming week — without dropping what matters most.",
        "intro": ("When you suddenly become someone's caregiver, the to-do list is endless and "
                  "the fog is real. This is not everything — it is just enough to get through the "
                  "first week. Do what you can today. Cross off the rest with a clear conscience; "
                  "it will still be there tomorrow, and you do not have to carry it all at once."),
        "sections": [
            ("Right away (the first day)", [
                "Write down the diagnosis, the main doctor's name, and one phone number that reaches a real person.",
                "Make a single list of every medication, dose, and time — keep it on the fridge and a photo on your phone.",
                "Find the insurance card and note the member ID somewhere safe.",
                "Ask the care team: \"Who do I call after hours, and what should make me worry?\"",
                "Tell two people what is happening. You should not be the only one who knows.",
            ]),
            ("Within the first 48 hours", [
                "Set up one place for appointments — a paper calendar or your phone, whichever you'll actually check.",
                "Start a notebook: questions for the doctor, symptoms, and what changed today.",
                "Ask whether a home-health visit, social worker, or case manager is available — and request one.",
                "Confirm how prescriptions get refilled, and whether the pharmacy can deliver and sync them.",
                "Put one trusted person in charge of updating everyone else, so you don't have to.",
            ]),
            ("This first week", [
                "Identify one task you can hand to someone else — and actually hand it over.",
                "Stock a few easy meals and snacks so eating is one less decision.",
                "Locate important documents (ID, advance directive, power of attorney), even if you don't act on them yet.",
                "Note any equipment or supplies you keep running out of, and ask who can help obtain them.",
                "Schedule one short break for yourself this week. Put it on the calendar like an appointment.",
            ]),
            ("Money & paperwork (a little at a time)", [
                "Keep one folder (or envelope) for every bill, statement, and form related to care.",
                "Ask the hospital or clinic about financial counseling — most have it, few mention it.",
                "Check eligibility for help with medication, food, and utility costs (a benefits screening can find programs).",
                "Find out if family or medical leave applies to your job, and what paperwork it needs.",
            ]),
            ("Caring for the caregiver — that's you", [
                "Eat something and drink water. You cannot pour from an empty cup, and you know it.",
                "Pick one person to be your \"I'm not okay\" call, and tell them they're the one.",
                "Decide what can wait. Most of it can.",
                "Look up one respite or support option near you, before you're desperate for it.",
                "Save a crisis number now: in the US, call or text 988, any time, day or night.",
            ]),
            ("Questions worth asking the care team", [
                "What is the goal of this treatment, and what should we realistically expect?",
                "What changes mean \"call us now\" versus \"mention it at the next visit\"?",
                "What help exists that we haven't asked about — home care, equipment, financial aid?",
                "If things get harder, who guides us through the next decisions?",
            ]),
            ("_blanks", "Keep these numbers handy", [
                "Main doctor / clinic:", "After-hours line:", "Pharmacy:", "Case manager / social worker:", "My \"I'm not okay\" person:",
            ]),
        ],
        "closing": ("Remember",
                    "You will not do this perfectly, and that is not the same as doing it wrong. Showing up is the work.",
                    "— The Cardinal's Toolkit"),
        "promo": "This is one page from The Cardinal's Toolkit. For more tools, scripts, and rituals, visit the newsletter and the full book.",
    },
    {
        "out": "first-30-days-of-grief.pdf",
        "source": "From The Cardinal's Promise",
        "title": "The First 30 Days of Grief",
        "subtitle": "A gentle companion for the heaviest weeks — not a plan to fix anything, just something to hold onto.",
        "intro": ("There is no right way to grieve, and no schedule you are failing to keep. Grief "
                  "is not a problem to solve. This is a gentle companion for the first month, when "
                  "even small things feel impossibly heavy. Take only what helps, and leave the rest."),
        "sections": [
            ("The first few days", [
                "Let other people carry things. Say yes when someone offers a specific help.",
                "Eat something small and drink water, even when you don't want to.",
                "Keep one notebook for the calls, forms, and names you won't remember later.",
                "Decide what can wait. Almost everything can.",
                "Tell one person, \"I just need you to sit with me\" — and let them.",
            ]),
            ("The first weeks", [
                "Expect grief in waves, not stages. A good hour is not a betrayal.",
                "Lower the bar for yourself everywhere. \"Enough\" is the goal, not \"well.\"",
                "Notice what soothes you — a walk, a song, a window — and return to it.",
                "Set gentle limits on who you update; ask one person to share news for you.",
                "If sleep, eating, or getting up becomes impossible for days, reach for support.",
            ]),
            ("What grief often feels like (and it's normal)", [
                "Numbness, or feeling nothing at all, and then everything at once.",
                "Forgetting words, losing time, walking into rooms for no reason.",
                "Anger, relief, guilt — sometimes in the same minute. None of it means you loved them less.",
                "Looking for them: a face in a crowd, reaching for the phone, listening for the door.",
                "Comfort in signs — a cardinal at the window, a familiar song on the radio.",
            ]),
            ("Gentle ways to remember", [
                "Light a candle at the same time each evening, even briefly.",
                "Write them a letter you never have to send.",
                "Keep one small object where you'll see it.",
                "Say their name out loud. They are allowed to still be part of your days.",
            ]),
            ("When to reach for more support", [
                "If you have thoughts of not wanting to be here, tell someone today. In the US, call or text 988, any time.",
                "If the fog doesn't lift at all after several weeks, a grief counselor can help.",
                "Consider a grief support group; being among people who understand eases the loneliness.",
            ]),
        ],
        "closing": ("A reminder",
                    "Healing is not forgetting, and moving forward is not leaving them behind. You carry them with you. That is allowed.",
                    "— The Cardinal's Promise"),
        "promo": "Want a companion for the longer road? The Cardinal's Promise sits with you in it, and the newsletter sends gentle notes along the way.",
    },
    {
        "out": "helping-children-grieve.pdf",
        "source": "From The Cardinal's Toolkit",
        "title": "Helping a Child Through Grief",
        "subtitle": "Simple, honest words and small ways to help — no perfect words required.",
        "intro": ("Children grieve differently than adults — in bursts, through play, with questions "
                  "that can catch you off guard. You do not need perfect words. Your steady, honest "
                  "presence is what helps most."),
        "sections": [
            ("Use clear, gentle words", [
                "Say \"died\" rather than \"passed away,\" \"lost,\" or \"sleeping\" — soft phrases confuse young children.",
                "Keep it simple and true: \"Grandpa's body stopped working, and it can't start again.\"",
                "Reassure them it isn't their fault, and that they are safe and loved.",
                "It's okay to say \"I don't know.\" You can wonder together.",
            ]),
            ("Expect grief to look different", [
                "Children move in and out of grief — crying one minute, playing the next. That's healthy.",
                "Big feelings may show up as tummy aches, clinginess, anger, or trouble sleeping.",
                "They may ask the same questions again and again. Answer patiently; repetition is how they understand.",
                "Younger children may not grasp that death is permanent. Gently re-explain as needed.",
            ]),
            ("Simple ways to help", [
                "Keep routines steady — meals, bedtime, school. Predictability feels safe.",
                "Let them help remember: draw a picture, pick a photo, plant something, light a candle together.",
                "Offer feelings words: \"You seem sad. Or maybe angry? Both are okay.\"",
                "Name your own feelings out loud, simply: \"I miss her too. It's okay to cry.\"",
                "Read a picture book about loss together — stories give feelings a shape.",
            ]),
            ("Questions children often ask", [
                "\"Will you die too?\" — \"I expect to be here a very long time, and other people love and care for you too.\"",
                "\"Did I cause it?\" — \"No. Nothing you thought, said, or did made this happen.\"",
                "\"Where are they now?\" — Answer from your family's beliefs, simply and honestly.",
                "\"Why are you sad?\" — \"Because I loved them. Missing people is part of love.\"",
            ]),
            ("When to seek extra help", [
                "If a child talks about wanting to die or join the person who died, seek help right away. In the US, call or text 988.",
                "If sleep, eating, school, or withdrawal stays badly disrupted for weeks, ask a pediatrician or child grief counselor.",
                "Look for child-specific grief support in your area; many communities have free programs.",
            ]),
        ],
        "closing": ("Remember",
                    "You don't have to take their pain away to help. Staying close, telling the truth gently, and letting them feel — that is the whole job.",
                    "— The Cardinal's Toolkit"),
        "promo": "For more tools like this, The Cardinal's Toolkit has scripts and rituals for the whole family.",
    },
]


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(here, "assets", "pdf")
    os.makedirs(out_dir, exist_ok=True)
    for m in MAGNETS:
        path = os.path.join(out_dir, m["out"])
        build(m, path)
        print("wrote", os.path.relpath(path, here), "(%d bytes)" % os.path.getsize(path))


if __name__ == "__main__":
    main()
