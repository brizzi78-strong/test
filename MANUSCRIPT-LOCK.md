# Manuscript Lock — The Cardinal's Promise

> **Working copy warning:** the manuscript currently carries thirteen bracketed, highlighted PLACEHOLDER scenes (chapters 3, 4, 15, 25, 27, 29, 30, 31, 33), drafted rather than remembered, plus a few single highlighted paragraphs. The copyright page and Author's Note disclose that some events have been changed or reconstructed. Lock 10 (commit bd927e6) is the last text without reconstructions; the current working text is commit 0fe6bb4 at 204 KDP pages. Reader panels five through ten: 8.0, 8.3, 8.5, 8.7, 8.8, and 9.0 (five of seven readers in). Loop stopped at Rob's request 2026-09-14.

**Locked:** 2026-09-13 (lock 10: reader-panel five moves — Part Six in chronological order, Foreword moved to the front, back matter ends on Lou's Way, no-speech/truth-oath pass, the promise named in the Epilogue) · **Manuscript text at commit** `bd927e6` (branch `claude/david-sheff-clone-writing-06i30q`)

*A git tag `v1-lock-2026-08-31` exists in the working clone but could not be pushed to GitHub from this session; on GitHub, use the commit hashes above as the reference.*

| | |
|---|---|
| Chapters | 34 (Foreword, Prologue, six Parts, three Drives interludes, Epilogue, The Rooms, A Note to the One Who Loves an Addict, Lou's Way, apparatus) |
| Words | 53,510 |
| KDP interior | The_Cardinals_Promise_KDP_Interior.pdf — **206 pages**, 6" × 9", B&W, EB Garamond 12pt |
| Spine (white paper) | 0.464" — full wrap 12.714" × 9.25" (see KDP-COVER-SPECS.md) |
| Source of record | The_Cardinals_Promise_sheff_pass.md (mirrored in styled-sections/) |

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
