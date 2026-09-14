# Manuscript Lock — The Cardinal's Promise

**Locked:** 2026-09-14 (lock 12: lock 11 plus nine proofreader seam fixes after the tightened-draft merge; text otherwise identical) · **Manuscript text at commit** `310c123``892f6d6` (branch `claude/david-sheff-clone-writing-06i30q`)

*A git tag `v1-lock-2026-08-31` exists in the working clone but could not be pushed to GitHub from this session; on GitHub, use the commit hashes above as the reference.*

| | |
|---|---|
| Chapters | 34 (Foreword, Prologue, six Parts, four Drives interludes, Epilogue, The Rooms, A Note to the One Who Loves an Addict, Lou's Way, apparatus) |
| Words | 52,051 |
| KDP interior | The_Cardinals_Promise_KDP_Interior.pdf — **201 pages**, 6" × 9", B&W, EB Garamond 12pt |
| Spine (white paper) | 0.453" — full wrap 12.703" × 9.25" (see KDP-COVER-SPECS.md) |
| Source of record | The_Cardinals_Promise_sheff_pass.md (mirrored in styled-sections/) |

## Lock 12 notes

- The locked text includes thirteen reconstructed passages (chapters 3, 4, 15, 25, 27, 29, 30, 31, 33), disclosed on the copyright page and in the Author's Note. They remain yellow-highlighted in every build. **Strip the highlight before KDP upload** (remove the `{.mark}` spans and the bracketed markers; one command) — the interior cannot print with them.
- Lock 10 (`bd927e6`, 206 pages) is the last text with no reconstructions.
- Reader panels five through ten averaged 8.0, 8.3, 8.5, 8.7, 8.8, 9.0.
- Confirmed by Rob 2026-09-14: Caroline (ch. 21) and Brenda Jahn (ch. 29) are two different people; his mother did say "Oh, Louie."
- Still open: "Rob, don't worry about me. We're good" sits inside the breakfast reconstruction and the Epilogue rests on it.

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
