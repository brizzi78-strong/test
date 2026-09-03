#!/usr/bin/env python3
"""Assemble 'The First 72 Hours' magazine from the book's own material."""
import re, html, base64, pathlib

BOOK = pathlib.Path("/home/user/test/cardinals-promise/book/cardinals-toolkit-book.html")
WB   = pathlib.Path("/home/user/test/cardinals-promise/book/workbook-source.html")
SCR  = pathlib.Path("/tmp/claude-0/-home-user-test/f033ae22-6343-5f45-bb02-1ac0346c5634/scratchpad")
OUT  = SCR / "first72.html"

src = BOOK.read_text(encoding="utf-8")
wb  = WB.read_text(encoding="utf-8")
style = src[src.index("<style>")+7 : src.index("</style>")]
art  = base64.b64encode((SCR/"cardinal-art.png").read_bytes()).decode()
qr   = (SCR/"qr-resources.b64").read_text().strip()
cover = base64.b64encode(pathlib.Path(
    "/home/user/test/cardinals-promise/publishing/front-cover-print.jpeg").read_bytes()).decode()

def div_block(hay, pat, cls='<div'):
    s = hay.index(pat); s = hay.rindex(cls, 0, s+1)
    depth, j = 0, s
    for m in re.finditer(r'<div\b|</div>', hay[s:]):
        depth += 1 if m.group(0)=='<div' else -1
        if depth==0: j=s+m.end(); break
    return hay[s:j]

# --- content pulled verbatim from the book ---
_h = src.index('In the First 24 Hours — Do These')
_h2s = src.rindex('<h2', 0, _h)
_blk = div_block(src, 'Seven Actions, Not Seven Chapters')
_pafter = src.index('<p><strong>In the next 24–72 hours:</strong>', _h)
_pend = src.index('</p>', _pafter) + 4
first24 = src[_h2s:src.index('</h2>', _h)+5] + _blk + src[_pafter:_pend]
first24 = first24.replace(
  '<strong>Then go to the chapter this page pointed you to.</strong> That is your next\n    right step.',
  '<strong>Then turn the page and find your situation.</strong> That is your next right step.')
router    = re.search(r'<table class="facing".*?</table>', src, re.S).group(0)
emergency = div_block(src, '911</strong>. This guide helps you plan.')
robnote   = div_block(src, "Families usually know more than they think")
medsheet  = div_block(wb, 'Worksheet — Medication and Doctor List')
consheet  = div_block(wb, 'Worksheet — Emergency Contacts')

# de-book-ify: the router's chapter column sells the full guide
router = router.replace('<th>Go to</th>', '<th>In the full guide</th>')

page = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<title>The First 72 Hours</title>
<style>
{style}
@page {{ size: 8.5in 11in; margin: 0.55in; }}
body {{ max-width: 7.2in; }}
.mag-cover {{ text-align:center; padding-top:0.5in; page-break-after: always; }}
.mag-kicker {{ font-family:Helvetica,Arial,sans-serif; font-size:10.5pt; letter-spacing:.22em;
  text-transform:uppercase; color:#7d1524; }}
.mag-title {{ font-family:Helvetica,Arial,sans-serif; font-weight:bold; font-size:44pt;
  line-height:1.04; color:#16233f; margin:.25in 0 .1in; }}
.mag-title .r {{ color:#a51c30; }}
.mag-sub {{ font-style:italic; font-size:15pt; color:#7d1f17; max-width:5.6in; margin:0 auto; }}
.mag-art {{ width:58%; margin:.35in auto .25in; display:block; }}
.mag-from {{ font-family:Helvetica,Arial,sans-serif; font-size:10pt; color:#1f3d7a; margin-top:.3in; }}
.mag-free {{ display:inline-block; margin-top:.25in; padding:6px 20px; background:#a51c30; color:#faf1e4;
  font-family:Helvetica,Arial,sans-serif; font-weight:bold; letter-spacing:.1em; font-size:10.5pt;
  border-radius:6px; text-transform:uppercase; }}
.mh {{ font-family:Helvetica,Arial,sans-serif; font-weight:bold; font-size:16pt; color:#16233f;
  border-bottom:3px solid #a51c30; padding-bottom:6px; margin:0 0 12px; }}
.mag-page {{ page-break-before: always; }}
.bookpromo {{ display:flex; gap:.3in; align-items:flex-start; }}
.bookpromo img {{ width:2.6in; border:1px solid #d9cec4; }}
.smallnote {{ font-size:9.5pt; color:#8a8378; font-family:Helvetica,Arial,sans-serif; }}
</style></head><body>

<div class="mag-cover">
  <div class="mag-kicker">When something has just happened to your parent</div>
  <div class="mag-title">THE FIRST<br><span class="r">72 HOURS</span></div>
  <p class="mag-sub">What to do first &mdash; before the system starts making decisions for you.</p>
  <img class="mag-art" src="data:image/png;base64,{art}">
  <div class="mag-free">Free &middot; take this copy home</div>
  <div class="mag-from">From <strong>It&rsquo;s Not Your Fault: Helping Caregivers with Aging Loved Ones</strong>
  &middot; TheCardinalsPromise.com</div>
</div>

<p><strong>Nobody picks the day they become a caregiver.</strong> The phone rings, or a doctor says
a word you weren&rsquo;t ready for, or a discharge planner asks where your parent is going next
&mdash; as if you&rsquo;re supposed to already know. You&rsquo;re not. You are an ordinary person
being handed an extraordinary job: no training, no map, no time. These pages are the first piece
of the map &mdash; what to do in the first three days, the questions that protect you, and the
numbers to call. You don&rsquo;t have to know everything today. You just have to know the next
right step.</p>
{emergency}
{first24}
{robnote}

<div class="mag-page">
<div class="mh">If This Is Happening, Start Here</div>
<p>Find the line that sounds like your family. That is your starting point &mdash; and the chapter
listed is where the full guide takes you deeper.</p>
{router}
</div>

<div class="mag-page">
<div class="mh">The Question That Protects Your Wallet</div>
<div class="fbox savebox">
  <span class="ftag">This Could Save You Thousands</span>
  <p>If your parent is in a hospital bed tonight, ask one question tomorrow morning, and ask it
  exactly like this: <strong>&ldquo;Is my parent admitted as an inpatient, or under
  observation?&rdquo;</strong> The bed looks the same either way &mdash; but observation status can
  quietly change what Medicare pays toward rehab afterward. Ask, write down the answer and who
  gave it, and if the answer is &ldquo;observation,&rdquo; ask the doctor whether inpatient
  admission is appropriate. The full guide walks through this trap &mdash; and the rest of the
  paying-for-care maze &mdash; step by step.</p>
</div>
<div class="fbox insiderbox">
  <span class="ftag">What Nobody Tells You</span>
  <p>Discharge moves fast &mdash; often faster than families expect, and sometimes on a Friday
  afternoon. You are allowed to say: <em>&ldquo;We do not yet have a safe plan at home. What are
  our options?&rdquo;</em> Saying it calmly, early, and to the discharge planner by name is often
  the difference between a safe transition and a preventable readmission.</p>
</div>
<div class="fbox callbox">
  <span class="ftag">Who to Call</span>
  <ul>
    <li><strong>Any aging question, any state</strong> &mdash; Eldercare Locator, 1-800-677-1116</li>
    <li><strong>Medicare questions</strong> &mdash; your state SHIP office (free counseling)</li>
    <li><strong>Medicaid</strong> &mdash; your county Department of Social Services; an elder law attorney for planning</li>
    <li><strong>Veteran or surviving spouse</strong> &mdash; a Veterans Service Officer</li>
    <li><strong>Memory concerns / wandering</strong> &mdash; Alzheimer&rsquo;s Helpline, 1-800-272-3900 (24/7)</li>
    <li><strong>Caregiver in crisis</strong> &mdash; call or text <strong>988</strong>, any hour</li>
    <li><strong>Finding senior living</strong> &mdash; a local placement advisor, or <strong>Cardinal Care
      Bridge</strong> at TheCardinalsPromise.com &mdash; no cost to you</li>
  </ul>
</div>
</div>

<div class="mag-page">
<div class="mh">Two Sheets to Fill In Tonight</div>
<p>These two pages are yours to write on. The medication list is the single most useful document
a family can hand a doctor, a hospital, or a pharmacist &mdash; make it tonight, photograph it,
and keep a copy with you.</p>
{medsheet}
</div>
<div class="mag-page">
{consheet}
</div>

<div class="mag-page">
<div class="mh">Someone Had to Pay Attention. It Turned Out to Be You.</div>
<p style="font-size:12.5pt">Nobody applauds this work. There is no job title, no training day, no
pay &mdash; just an ordinary person at a kitchen table at 2 a.m., trying to learn Medicare,
medicine, and the truth about their own family all at once. You are not failing at this. You were
never given the map. <strong>These pages were the first piece of it. The book is the rest.</strong></p>
<div class="bookpromo">
  <img src="data:image/jpeg;base64,{cover}">
  <div>
    <p><strong>It&rsquo;s Not Your Fault: Helping Caregivers with Aging Loved Ones</strong> picks up
    where this handout stops: every care option compared honestly, how families actually pay
    (Medicare, Medicaid, VA, long-term care insurance), the documents that protect the people you
    love, word-for-word scripts for the hardest conversations, and hospice explained by someone
    who has spent a career beside it &mdash; with a complete fill-in workbook bound into the back.</p>
    <p>Color-coded by urgency &mdash; <strong style="color:#a51c30">RED: Act Today</strong> &middot;
    <strong style="color:#6b21a8">PURPLE: Watch Closely</strong> &middot;
    <strong style="color:#1d4e89">BLUE: Plan Ahead</strong> &mdash; so you can find the right page
    on the worst day.</p>
    <p style="font-size:12.5pt"><strong>Get the book today &mdash; on Amazon, or at
    TheCardinalsPromise.com.</strong> The worst day is easier with the map already on the shelf.</p>
  </div>
</div>
<div class="fbox gobox">
  <img class="goqr" src="data:image/png;base64,{qr}" alt="QR code">
  <div class="gotext">
    <span class="ftag">Keep Going</span>
    <p>Free printable worksheets, current program links &amp; caregiver resources</p>
    <p class="gourl">TheCardinalsPromise.com/resources</p>
  </div>
</div>
<p class="smallnote" style="margin-top:14px">This guide is general education, not medical, legal, or
financial advice. &copy; 2026 Cardinal Promise Press. Professionals: for stacks of this handout for
your families, visit TheCardinalsPromise.com. You are not alone. You are the difference.</p>
</div>

</body></html>"""
OUT.write_text(page, encoding="utf-8")
print(f"wrote {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
