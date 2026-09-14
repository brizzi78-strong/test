# Manuscript Lock — The Cardinal's Promise

**Locked:** 2026-09-14 (lock 17, PRINT LOCK: lock 16 plus the chapter-heading render fix) · **Manuscript text at commit** `57128e4` (branch `claude/david-sheff-clone-writing-06i30q`)

*A git tag `v1-lock-2026-08-31` exists in the working clone but could not be pushed to GitHub from this session; on GitHub, use the commit hashes above as the reference.*

| | |
|---|---|
| Chapters | 34 (Foreword, Prologue, six Parts, four Drives interludes, Epilogue, The Rooms, A Note to the One Who Loves an Addict, Lou's Way, apparatus) |
| Words | 51,866 |
| KDP interior | The_Cardinals_Promise_KDP_Interior.pdf — **203 pages**, 6" × 9", B&W, EB Garamond 12pt |
| Spine (white paper) | 0.457" — full wrap 12.707" × 9.25" (see KDP-COVER-SPECS.md) |
| Source of record | The_Cardinals_Promise_sheff_pass.md (mirrored in styled-sections/) |

## Lock 17 notes

- Chapter titles were rendering as literal text ("CHAPTER 31 ## The Days After") with no running head; fixed by a blank line before each title. Page count moved 201 → 203.
- Print lock. The thirteen scenes that were drafted as reconstructions were read and confirmed by Rob on 2026-09-14 with three corrections (calls that week were with Chris, not Donna; Lou was never on oxygen; Rob and Lisa never went through Lou's things together). Highlights and bracket markers are gone from the source and every build.
- The copyright page and Author's Note still disclose that some events have been changed or reconstructed. That stays; it is true.
- Lock 10 (`bd927e6`, 206 pages) remains the last text with none of those scenes in it.
- Reader panels five through ten averaged 8.0, 8.3, 8.5, 8.7, 8.8, 9.0.
- Still to do before upload: Grace's cover at 203 pages (spine 0.457" white, wrap 12.707" × 9.25", 3812 × 2775 px); Scott has not seen the book since his 09.12 batch; Dave should see his trimmed Foreword.

## What "locked" means

Text, chapter order, datelines, and back matter are frozen at this commit. Every
deliverable in the repo (EPUB, DOCX, reading PDF, KDP interior, HTML, Speechify
text) was built from this exact source.

## What is still expected to touch the text

- Scott's edit from "Hope for Rob" onward (his 09.12 batch reached Sobriety Meets Hospice).
- The proofread (the line-edit pass was completed 2026-08-31 — 62 verified fixes; Jocelyn may still review).
- Permission checks for real names newly added in the back matter ("The Rooms").

Any of those changes reopens the lock: apply the edit to both files, rebuild,
re-run the audits (chapter sequence, datelines, duplicate sweep, marker list,
forward references), re-count the interior pages, update KDP-COVER-SPECS.md if
the count moved, and cut a new tag. Grace needs the page count from the *final*
tag, not this one, if anything changes.
