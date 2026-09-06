# Manuscript Lock — The Cardinal's Promise

**Locked:** 2026-09-06 (lock 5, after Scott's edits through West Palm Beach) · **Manuscript text at commit** `653aa20` (branch `claude/david-sheff-clone-writing-06i30q`)

*A git tag `v1-lock-2026-08-31` exists in the working clone but could not be pushed to GitHub from this session; on GitHub, use the commit hashes above as the reference.*

| | |
|---|---|
| Chapters | 34 (Prologue, six Parts, three Drives interludes, Epilogue, back matter) |
| Words | 53,414 |
| KDP interior | The_Cardinals_Promise_KDP_Interior.pdf — **195 pages**, 6" × 9", B&W |
| Spine (white paper) | 0.439" — full wrap 12.689" × 9.25" (see KDP-COVER-SPECS.md) |
| Source of record | The_Cardinals_Promise_sheff_pass.md (mirrored in styled-sections/) |

## What "locked" means

Text, chapter order, datelines, and back matter are frozen at this commit. Every
deliverable in the repo (EPUB, DOCX, reading PDF, KDP interior, HTML, Speechify
text) was built from this exact source.

## What is still expected to touch the text

- Scott's edit from "New Orleans" onward (his 09.03 batch covered The Performance Trap through West Palm Beach).
- The proofread (the line-edit pass was completed 2026-08-31 — 62 verified fixes; Jocelyn may still review).
- Permission checks for real names newly added in the back matter ("The Rooms").

Any of those changes reopens the lock: apply the edit to both files, rebuild,
re-run the audits (chapter sequence, datelines, duplicate sweep, marker list,
forward references), re-count the interior pages, update KDP-COVER-SPECS.md if
the count moved, and cut a new tag. Grace needs the page count from the *final*
tag, not this one, if anything changes.
