# CLAUDE.md

## Claude vision: image resolution limits

Max image input dimensions are model-dependent. When computing the largest API-fitting
resolution (see `compute_max_api_fit`), select the constants by model:

| Models | Max long edge | Max pixels |
| --- | --- | --- |
| Opus 4.6 and earlier, Sonnet 4.6, Haiku 4.5 | 1568 px | ~1.15 MP (1_150_000) |
| Opus 4.7, Opus 4.8, Fable 5 | 2576 px | 3.75 MP (3_750_000) |

Opus 4.7 introduced high-resolution vision (returned coordinates map 1:1 to image pixels);
Opus 4.8 and Fable 5 inherit the same surface. Full-res images on the high-res tier use up
to ~3x more image tokens (~4784 vs ~1600), so downsample client-side only when the extra
fidelity isn't needed.
