# Manuscript Lock — The Cardinal's Promise

**Locked:** 2026-09-02 (lock 4, after Rob's Part 3 revision: Laguna Beach and the surrender scene) · **Manuscript text at commit** `75296ad` (branch `claude/david-sheff-clone-writing-06i30q`)

*A git tag `v1-lock-2026-08-31` exists in the working clone but could not be pushed to GitHub from this session; on GitHub, use the commit hashes above as the reference.*

| | |
|---|---|
| Chapters | 34 (Prologue, six Parts, three Drives interludes, Epilogue, back matter) |
| Words | 52,780 |
| KDP interior | The_Cardinals_Promise_KDP_Interior.pdf — **193 pages**, 6" × 9", B&W |
| Spine (white paper) | 0.435" — full wrap 12.685" × 9.25" (see KDP-COVER-SPECS.md) |
| Source of record | The_Cardinals_Promise_sheff_pass.md (mirrored in styled-sections/) |

## What "locked" means

Text, chapter order, datelines, and back matter are frozen at this commit. Every
deliverable in the repo (EPUB, DOCX, reading PDF, KDP interior, HTML, Speechify
text) was built from this exact source.

## What is still expected to touch the text

- Scott's edit from "My Brother's Keeper" onward.
- The proofread (the line-edit pass was completed 2026-08-31 — 62 verified fixes; Jocelyn may still review).
- Permission checks for real names newly added in the back matter ("The Rooms").

Any of those changes reopens the lock: apply the edit to both files, rebuild,
re-run the audits (chapter sequence, datelines, duplicate sweep, marker list,
forward references), re-count the interior pages, update KDP-COVER-SPECS.md if
the count moved, and cut a new tag. Grace needs the page count from the *final*
tag, not this one, if anything changes.
