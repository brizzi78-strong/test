# Undetectable AI Humanizer — Python Connector

A small Python client for the [Undetectable AI](https://undetectable.ai)
**Humanizer** API. It submits AI-generated text and returns a humanized
rewrite.

## How it works

The Humanizer API is asynchronous:

1. `POST /submit` queues your text and returns a document `id`.
2. `POST /document` returns the document; its `output` field is filled in
   once processing finishes.

`UndetectableAIClient.humanize()` handles both steps, polling until the
result is ready.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env       # then paste your real key into .env
```

Your API key comes from the Undetectable AI dashboard (**Account → API**).
It is read from the `UNDETECTABLE_API_KEY` environment variable, or from a
local `.env` file (which is git-ignored).

## Usage

### Command line

```bash
# Humanize a string (must be at least 50 characters)
python humanize.py "Paste at least fifty characters of AI generated text here..."

# Humanize a file via stdin
cat draft.txt | python humanize.py --strength "More Human" --purpose Essay

# Check remaining credits
python humanize.py --credits
```

### As a library

```python
from undetectable_ai import UndetectableAIClient, Readability, Strength

client = UndetectableAIClient()  # reads UNDETECTABLE_API_KEY
result = client.humanize(
    "Some AI generated text that is at least fifty characters long...",
    readability=Readability.UNIVERSITY,
    strength=Strength.MORE_HUMAN,
)
print(result.output)
```

## Options

| Parameter     | Choices                                                                                                           |
|---------------|------------------------------------------------------------------------------------------------------------------|
| `readability` | High School, University, Doctorate, Journalist, Marketing                                                         |
| `purpose`     | General Writing, Essay, Article, Marketing Material, Story, Cover Letter, Report, Business Material, Legal Material |
| `strength`    | Quality, Balanced, More Human                                                                                     |

## Notes

- Submitted content must be **at least 50 characters**.
- Never commit your real API key. Keep it in `.env` (already git-ignored).
