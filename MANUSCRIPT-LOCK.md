# Manuscript Lock — The Cardinal's Promise

**Locked:** 2026-08-31 · **Tag:** `v1-lock-2026-08-31` · **Commit:** `4bc42ea`

| | |
|---|---|
| Chapters | 34 (Prologue, six Parts, three Drives interludes, Epilogue, back matter) |
| Words | 51,585 |
| KDP interior | The_Cardinals_Promise_KDP_Interior.pdf — **188 pages**, 6" × 9", B&W |
| Spine (white paper) | 0.423" — full wrap 12.673" × 9.25" (see KDP-COVER-SPECS.md) |
| Source of record | The_Cardinals_Promise_sheff_pass.md (mirrored in styled-sections/) |

## What "locked" means

Text, chapter order, datelines, and back matter are frozen at this commit. Every
deliverable in the repo (EPUB, DOCX, reading PDF, KDP interior, HTML, Speechify
text) was built from this exact source.

## What is still expected to touch the text

- Scott's edit from "My Brother's Keeper" onward.
- Jocelyn's line edit, then the proofread.
- Permission checks for real names newly added in the back matter ("The Rooms").

Any of those changes reopens the lock: apply the edit to both files, rebuild,
re-run the audits (chapter sequence, datelines, duplicate sweep, marker list,
forward references), re-count the interior pages, update KDP-COVER-SPECS.md if
the count moved, and cut a new tag. Grace needs the page count from the *final*
tag, not this one, if anything changes.
