# Setup: Connecting to Undetectable AI

This project is code-complete and tested. It cannot reach the Undetectable AI
API yet because of **two environment/account settings that only you can change**.
Follow these once and the humanizer will work.

## Step 1 — Allow the host (fixes the `403 Host not in allowlist` error)

This Claude Code web environment blocks outbound traffic except to an
allowlist. `humanize.undetectable.ai` is not on it by default.

1. Click the **cloud icon** (shows the current environment name) to open the
   environment selector.
2. Hover the environment, click the **settings/gear icon**.
3. Set **Network access** to **Custom**.
4. In **Allowed domains**, add one per line:
   ```
   humanize.undetectable.ai
   *.undetectable.ai
   ```
5. Check **"Also include default list of common package managers"**.
6. **Save.**

> Allowlist changes apply to **new/resumed sessions**, not a session that is
> already running. Start a fresh session after saving.

Docs: https://code.claude.com/docs/en/claude-code-on-the-web#allow-specific-domains

## Step 2 — Add your API key

Get the key from the Undetectable AI dashboard (**Account → API**; requires a
plan with API credits). Then:

```bash
cp .env.example .env
# edit .env:  UNDETECTABLE_API_KEY=your-real-key
```

`.env` is git-ignored, so the key is never committed.

## Step 3 — Verify and run

```bash
python humanize.py --credits          # prints your credit balance if connected

# Humanize the manuscripts (already extracted into ./manuscripts, git-ignored)
python batch.py manuscripts/ -o humanized/ --purpose Story --strength "More Human"
```

Output is written to `humanized/`. For memoir prose, `--purpose Story` (or
`General Writing`) with `--readability Journalist` is a good starting point;
begin at `--strength Balanced` and only raise it on passages that still flag.

## Note on the manuscript

`manuscripts/` holds the extracted book text and is **git-ignored** — your
unpublished work is never pushed to GitHub.
