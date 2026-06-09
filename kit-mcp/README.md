# kit-mcp

An MCP server that lets Claude **draft, edit, and send your Kit (ConvertKit)
email broadcasts** — fully automated, on your terms.

It talks to the [Kit V4 API](https://developers.kit.com/) (`https://api.kit.com/v4`)
using an API key. No browser login, no password sharing.

## What Claude can do once it's connected

| Tool | What it does |
|------|--------------|
| `verify_connection` | Check the API key and show the connected account |
| `list_broadcasts` | List recent broadcasts (drafts + sent) |
| `get_broadcast` | Read one broadcast's full content |
| `draft_broadcast` | Create a **new draft** (never sends) |
| `edit_broadcast` | Edit a draft's subject / content |
| `send_broadcast` | **Send or schedule** to your subscribers *(guarded)* |
| `broadcast_stats` | Open/click stats for a sent broadcast |
| `list_subscribers` | Page through your subscriber list |
| `list_tags` | List tags for targeting |

## The send safety switch

Sending email to your list is irreversible, so it's the one guarded action:

- **`KIT_AUTO_SEND=false` (default)** — `send_broadcast` returns a preview and
  refuses to send unless you call it with `confirm=true`. Drafting and editing
  still work freely.
- **`KIT_AUTO_SEND=true`** — fully unattended. Broadcasts go out with no prompt.

Start with the default. Flip it to `true` once you trust the workflow.

## Setup

1. **Get a Kit API key**
   In Kit: **Settings → Developer → New API Key** (a V4 key). Copy it.

2. **Install**
   ```bash
   cd kit-mcp
   pip install -e .
   ```

3. **Configure**
   ```bash
   cp .env.example .env
   # edit .env and paste your KIT_API_KEY
   ```

4. **Register with Claude** (`claude_desktop_config.json`, or `claude mcp add`):
   ```json
   {
     "mcpServers": {
       "kit": {
         "command": "kit-mcp",
         "env": {
           "KIT_API_KEY": "kit_xxxxxxxxxxxxxxxxxxxxxxxx",
           "KIT_AUTO_SEND": "false"
         }
       }
     }
   }
   ```

   Then ask Claude things like *"Draft a newsletter announcing the new chapter
   and show it to me"* or, once armed, *"Send broadcast 1423 now."*

## Development

```bash
pip install -e ".[dev]"
pytest
```

Tests use an in-memory HTTP transport and an injected fake client — they run
fully offline and never touch a real Kit account.
