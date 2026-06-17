# ghostwriter

An AI ghost writer for your terminal, powered by [Claude](https://www.anthropic.com/claude).
Hand it a brief and it drafts. Hand it your draft and it rewrites, expands, or
continues — in the voice *you* ask for, not its own.

## Install

```bash
pip install -e .
```

Requires Python 3.10+ and an Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at <https://console.anthropic.com>.

## Usage

```
ghostwriter TASK [text] [options]
```

The input can come from an argument, a file (`--file`), or stdin (piped).

### Tasks

| Task       | What it does                                          |
| ---------- | ----------------------------------------------------- |
| `draft`    | Write a complete first draft from a brief.            |
| `rewrite`  | Rewrite existing text for clarity, flow, and impact.  |
| `expand`   | Expand existing text with more detail and depth.      |
| `continue` | Continue existing text seamlessly from where it ends. |
| `outline`  | Produce a structured outline from a brief.            |

### Examples

```bash
# Draft a blog post from a one-line brief
ghostwriter draft "A short post on why small teams ship faster" \
  --tone "punchy and confident" --words 400

# Rewrite a file, saving the result
ghostwriter rewrite --file rough.md --output polished.md

# Continue a story piped in from stdin
cat chapter1.txt | ghostwriter continue --tone "tense, literary"

# Outline a talk
ghostwriter outline "A 20-minute talk introducing vector databases"
```

### Options

| Option         | Description                                             |
| -------------- | ------------------------------------------------------- |
| `--tone`       | Desired tone, e.g. `"warm and conversational"`.         |
| `--audience`   | Intended audience.                                      |
| `--words`      | Approximate target length in words.                     |
| `--file, -f`   | Read input from a file.                                 |
| `--output, -o` | Write the result to a file instead of stdout.           |
| `--model`      | Claude model to use (default: `claude-opus-4-8`).       |
| `--max-tokens` | Max output tokens (default: 8000).                      |
| `--quiet`      | Don't stream live; print only the final result.         |

By default the draft streams live to your terminal as it's written. Token usage
is reported on stderr when it finishes, so you can redirect stdout cleanly:

```bash
ghostwriter draft "..." > post.md     # only the prose lands in post.md
```

## Library use

```python
from ghostwriter import GhostWriter

writer = GhostWriter()
draft = writer.write("draft", "A haiku about deploying on a Friday")
print(draft.text)
```

## How it works

`ghostwriter` sends a task-specific system prompt plus your input to the Claude
Messages API, streaming the response back. It uses adaptive thinking so the
model can reason about voice and structure when a task calls for it, and
defaults to the most capable Claude model.

## License

MIT
