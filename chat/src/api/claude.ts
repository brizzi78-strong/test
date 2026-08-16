/**
 * Claude API wrapper: one streaming entry point used by the HTTP layer.
 *
 * Runs on `claude-opus-5` with the server-side refusal fallback enabled
 * (beta `server-side-fallback-2026-06-01`): if the model's safety
 * classifiers decline a benign request, the API re-runs it on
 * `claude-opus-4-8` inside the same call instead of surfacing an error.
 */

import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5';
export const FALLBACK_MODEL = 'claude-opus-4-8';

/** Cap on conversation turns sent to the API; the UI trims client-side too. */
export const MAX_TURNS = 80;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamResult {
  stopReason: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export function createClaudeClient(env: NodeJS.ProcessEnv = process.env): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/**
 * Stream one assistant reply for the given conversation. `onText` receives
 * text deltas as they arrive; the resolved value carries the stop reason and
 * usage for the completed message.
 */
export async function streamReply(
  client: Anthropic,
  opts: { messages: ChatTurn[]; system?: string },
  onText: (delta: string) => void,
): Promise<StreamResult> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-06-01'],
    fallbacks: [{ model: FALLBACK_MODEL }],
    ...(opts.system ? { system: opts.system } : {}),
    messages: opts.messages.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onText(event.delta.text);
    }
  }

  const final = await stream.finalMessage();
  return {
    stopReason: final.stop_reason,
    model: final.model,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  };
}
