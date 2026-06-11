import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

/**
 * Each mode pairs a short label with the instruction Claude follows. The
 * instruction is the operative part of the system prompt; the shared preamble
 * below keeps every rewrite faithful and clean of meta-commentary.
 */
const MODES = {
  humanize: {
    label: "Humanize",
    instruction:
      "Rewrite the text so it reads like it was written by a thoughtful human, not an AI. " +
      "Remove robotic phrasing, filler, and hedging. Vary sentence length and rhythm, prefer " +
      "concrete words over abstractions, and let a natural voice come through. Keep the author's " +
      "original meaning, facts, and intent intact.",
  },
  improve: {
    label: "Improve",
    instruction:
      "Improve the writing: sharpen word choice, fix awkward phrasing, and strengthen flow and " +
      "clarity. Do not condense or trim the piece — keep its full length, detail, and the " +
      "author's voice and key points. Edit at the sentence level, not by cutting material.",
  },
  show: {
    label: "Show, don't tell",
    instruction:
      "Rewrite so the piece shows rather than tells. Turn abstract claims, judgments, and " +
      "generalizations into concrete specifics: plain nouns and verbs, examples, evidence, " +
      "numbers, and detail that is already implied by the text. Replace words that assert a " +
      "conclusion (important, powerful, difficult, amazing) with the particulars that let the " +
      "reader reach it themselves. Do not invent facts — where a specific isn't available, make " +
      "the language concrete without fabricating. Keep the author's voice and full length.",
  },
  grammar: {
    label: "Fix grammar",
    instruction:
      "Correct grammar, spelling, and punctuation only. Do not change the wording, tone, or " +
      "structure beyond what is needed for correctness. Keep the author's voice exactly.",
  },
  expand: {
    label: "Expand",
    instruction:
      "Expand the text with relevant detail, examples, and elaboration that develop the existing " +
      "ideas. Do not invent facts or pad with filler. Keep the author's voice and intent.",
  },
  tone: {
    label: "Adjust tone",
    instruction:
      "Rewrite the text in the requested tone while preserving its meaning and key information.",
  },
};

const TONES = [
  "professional",
  "friendly",
  "confident",
  "casual",
  "formal",
  "persuasive",
  "empathetic",
  "playful",
];

function buildSystemPrompt(mode, tone) {
  const config = MODES[mode] ?? MODES.improve;
  let instruction = config.instruction;

  if (mode === "tone" && tone) {
    instruction += ` The requested tone is: ${tone}.`;
  }

  return [
    "You are a skilled editor helping a non-fiction author. They write for real readers, " +
      "and their voice matters more than tidiness.",
    instruction,
    "Avoid the things that make writing read as AI-generated: do not compress or shorten the " +
      "piece, do not strip out specific detail or examples, and do not flatten everything into " +
      "uniform, short, samey sentences. Keep the author's natural rhythm, idiosyncrasies, and " +
      "length. Err on the side of keeping the author's own words.",
    "Return only the rewritten text. Do not add preambles, explanations, quotation marks, " +
      "or notes about what you changed. Match the original formatting (paragraphs, lists) " +
      "unless the task requires otherwise.",
  ].join("\n\n");
}

app.get("/api/options", (_req, res) => {
  res.json({
    modes: Object.entries(MODES).map(([id, m]) => ({ id, label: m.label })),
    tones: TONES,
    model: MODEL,
  });
});

app.post("/api/rewrite", async (req, res) => {
  const { text, mode = "improve", tone = "" } = req.body ?? {};

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Please provide some text to rewrite." });
  }
  if (!MODES[mode]) {
    return res.status(400).json({ error: `Unknown mode: ${mode}` });
  }
  if (text.length > 20000) {
    return res
      .status(413)
      .json({ error: "Text is too long. Please keep it under 20,000 characters." });
  }

  // Server-Sent Events: stream tokens to the browser as they arrive.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      system: buildSystemPrompt(mode, tone),
      messages: [
        {
          role: "user",
          content: `Here is the text to work on:\n\n${text}`,
        },
      ],
    });

    stream.on("text", (delta) => send("delta", { text: delta }));

    const abort = () => stream.abort();
    res.on("close", abort);

    const finalMessage = await stream.finalMessage();
    res.off("close", abort);

    send("done", {
      stop_reason: finalMessage.stop_reason,
      usage: finalMessage.usage,
    });
    res.end();
  } catch (err) {
    console.error("Rewrite failed:", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API error (${err.status ?? "?"}): ${err.message}`
        : "Something went wrong while generating the rewrite.";
    // If headers are already sent we can only push an SSE error event.
    if (res.headersSent) {
      send("error", { error: message });
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Human + AI Writing Tool running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "⚠  ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key."
    );
  }
});
