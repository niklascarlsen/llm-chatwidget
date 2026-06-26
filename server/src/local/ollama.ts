import type {ProviderRequest, ProviderStreamEvent} from '../core/provider';

const OLLAMA_API_URL =
  process.env.OLLAMA_API_URL ?? 'http://localhost:11434/api/chat';
const OLLAMA_SHOW_URL = OLLAMA_API_URL.replace(/\/api\/chat\/?$/, '/api/show');

interface OllamaChunk {
  message?: {
    content?: string;
    thinking?: string;
  };
  done?: boolean;
  error?: string;
}

interface OllamaShowResponse {
  capabilities?: string[];
}

const thinkCapabilityCache = new Map<string, boolean>();

async function modelSupportsThinking(model: string): Promise<boolean> {
  const cached = thinkCapabilityCache.get(model);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(OLLAMA_SHOW_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({model}),
    });

    if (!res.ok) {
      thinkCapabilityCache.set(model, false);
      return false;
    }

    const data = (await res.json()) as OllamaShowResponse;
    const supports = data.capabilities?.includes('thinking') ?? false;
    thinkCapabilityCache.set(model, supports);
    return supports;
  } catch (err) {
    console.warn('Failed to read Ollama model capabilities:', (err as Error).message);
    thinkCapabilityCache.set(model, false);
    return false;
  }
}

export async function* streamOllamaChat(
  req: ProviderRequest
): AsyncGenerator<ProviderStreamEvent> {
  const think = await modelSupportsThinking(req.model);

  const res = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      stream: true,
      think,
    }),
    signal: req.signal,
  });

  if (!res.ok || !res.body) {
    const errorBody = await res.text().catch(() => '');
    yield {
      kind: 'error',
      code: 'unavailable',
      message: `Ollama API error (${res.status}): ${errorBody}`,
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let started = false;

  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, {stream: true});
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let data: OllamaChunk;
        try {
          data = JSON.parse(trimmed) as OllamaChunk;
        } catch (err) {
          console.warn(
            'Ollama JSON parse error (likely incomplete chunk):',
            (err as Error).message
          );
          continue;
        }

        if (data.error) {
          yield {kind: 'error', code: 'transient', message: data.error};
          return;
        }

        const hasThinking =
          typeof data.message?.thinking === 'string' &&
          data.message.thinking.length > 0;
        const content = data.message?.content;
        const hasContent = typeof content === 'string' && content.length > 0;

        if ((hasThinking || hasContent) && !started) {
          started = true;
          yield {kind: 'started', reasoning: hasThinking && !hasContent};
        }

        if (hasContent) {
          yield {kind: 'content', delta: content};
        }

        if (data.done) {
          yield {kind: 'done'};
          return;
        }
      }
    }

    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer) as OllamaChunk;
        if (data.done) yield {kind: 'done'};
      } catch (err) {
        console.warn(
          'Failed to parse trailing Ollama buffer:',
          (err as Error).message
        );
      }
    }
  } finally {
    reader.releaseLock();
  }
}
