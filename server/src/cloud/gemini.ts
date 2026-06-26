import {GoogleGenAI} from '@google/genai';
import type {OutgoingMessage, ServerErrorCode} from '@chatwidget/shared';
import type {ProviderRequest, ProviderStreamEvent} from '../core/provider';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

// Lazy init so the server boots without a key. Gemini requests fail with a clear error.
let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  client ??= new GoogleGenAI({apiKey: GEMINI_API_KEY});
  return client;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: {text: string}[];
}

// Map our messages to Gemini format. System goes to systemInstruction; assistant becomes model.
function toGemini(messages: OutgoingMessage[]): {
  contents: GeminiContent[];
  systemInstruction?: string;
} {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content);
      continue;
    }
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{text: msg.content}],
    });
  }

  const systemInstruction = systemParts.join('\n\n') || undefined;
  return {contents, systemInstruction};
}

// Map Gemini HTTP errors to wire codes. Aborts are handled in pump.ts.
function geminiErrorCode(err: unknown): ServerErrorCode {
  const status = (err as {status?: number} | null)?.status;
  if (status === 429) return 'rate_limit';
  if (status === 400 || status === 403 || status === 404) return 'unavailable';
  return 'transient';
}

export async function* streamGeminiChat(
  req: ProviderRequest,
): AsyncGenerator<ProviderStreamEvent> {
  // Missing key is misconfiguration, not transient. Check before streaming.
  if (!GEMINI_API_KEY) {
    console.error('Gemini stream error: GEMINI_API_KEY is not set');
    yield {kind: 'error', code: 'unavailable', message: 'GEMINI_API_KEY is not set'};
    return;
  }

  const {contents, systemInstruction} = toGemini(req.messages);

  let started = false;
  try {
    const response = await getClient().models.generateContentStream({
      model: req.model,
      contents,
      config: {
        ...(systemInstruction ? {systemInstruction} : {}),
        abortSignal: req.signal,
      },
    });

    for await (const chunk of response) {
      // Stop on abort. Don't emit done; pump sends timeout instead.
      if (req.signal.aborted) break;

      const text = chunk.text;
      if (typeof text === 'string' && text.length > 0) {
        if (!started) {
          started = true;
          yield {kind: 'started', reasoning: false};
        }
        yield {kind: 'content', delta: text};
      }
    }
  } catch (err) {
    // Our abort, not a Gemini fault. Let pump handle the timeout message.
    if (req.signal.aborted) throw err;

    console.error('Gemini stream error:', (err as Error).message);
    yield {kind: 'error', code: geminiErrorCode(err), message: (err as Error).message};
    return;
  }

  // Skip done after abort; pump turns that into a timeout error.
  if (req.signal.aborted) return;
  yield {kind: 'done'};
}
