import type {
  ClientRequest,
  OutgoingMessage,
  Provider,
} from '@chatwidget/shared';
import {createRateLimiter, type RateLimiter} from '../core/rateLimit';
import {streamToSocket} from '../core/pump';
import {streamGeminiChat} from './gemini';
import type {ProviderStreamFn} from '../core/provider';
import {sendError, type ChatSocket} from '../core/socket';

// Cloud APIs (Gemini, etc). No queue; many can run at once. Each provider sets
// rate limits, allowed models, and its own timeout. Add new ones in CLOUD_PROVIDERS.

interface CloudProvider {
  stream: ProviderStreamFn;
  // Per-IP throttle. Required for every cloud provider.
  rateLimit: {max: number; windowMs: number};
  // Per-request cap. Stay under client RESPONSE_TIMEOUT_MS (50s). See connection-lifecycle.md.
  timeoutMs: number;
  // Block arbitrary model names from the public client.
  allowedModels: Set<string>;
}

// Every provider except ollama. Adding one to the union forces config here.
type CloudProviderName = Exclude<Provider, 'ollama'>;

const CLOUD_PROVIDERS: Record<CloudProviderName, CloudProvider> = {
  gemini: {
    stream: streamGeminiChat,
    rateLimit: {max: 20, windowMs: 60_000},
    timeoutMs: 45_000,
    allowedModels: new Set(['gemini-2.5-flash']),
  },
};

export function createCloudRunner() {
  // One limiter per provider.
  const limiters = new Map<CloudProviderName, RateLimiter>();
  for (const [name, cfg] of Object.entries(CLOUD_PROVIDERS) as [
    CloudProviderName,
    CloudProvider,
  ][]) {
    limiters.set(
      name,
      createRateLimiter(cfg.rateLimit.max, cfg.rateLimit.windowMs),
    );
  }

  // Track active gens per socket so disconnect can abort them.
  const active = new Map<ChatSocket, Set<AbortController>>();

  const addActive = (ws: ChatSocket, controller: AbortController) => {
    let set = active.get(ws);
    if (!set) {
      set = new Set();
      active.set(ws, set);
    }
    set.add(controller);
  };

  const removeActive = (ws: ChatSocket, controller: AbortController) => {
    const set = active.get(ws);
    if (!set) return;
    set.delete(controller);
    if (set.size === 0) active.delete(ws);
  };

  const run = async (
    ws: ChatSocket,
    request: ClientRequest,
    messages: OutgoingMessage[],
    provider: CloudProvider,
  ) => {
    const controller = new AbortController();
    addActive(ws, controller);
    const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);

    try {
      const events = provider.stream({
        model: request.model,
        messages,
        signal: controller.signal,
      });
      await streamToSocket(ws, request.id, events, controller.signal);
    } finally {
      clearTimeout(timeout);
      controller.abort();
      removeActive(ws, controller);
    }
  };

  // True if this is a cloud provider we handle.
  const serves = (provider: string): provider is CloudProviderName =>
    Object.prototype.hasOwnProperty.call(CLOUD_PROVIDERS, provider);

  const handle = (
    ws: ChatSocket,
    request: ClientRequest,
    messages: OutgoingMessage[],
  ) => {
    // serves() narrows the type so lookups below need no casts.
    const name = request.provider;
    if (!name || !serves(name)) {
      sendError(
        ws,
        request.id,
        'unavailable',
        `Provider '${name}' is not available.`,
      );
      return;
    }

    const config = CLOUD_PROVIDERS[name];
    if (!config.allowedModels.has(request.model)) {
      sendError(
        ws,
        request.id,
        'unavailable',
        `Model '${request.model}' is not available.`,
      );
      return;
    }

    if (!limiters.get(name)!.take(ws.data.clientIp)) {
      sendError(ws, request.id, 'rate_limit', 'Rate limit exceeded.');
      return;
    }

    void run(ws, request, messages, config);
  };

  const closeSocket = (ws: ChatSocket) => {
    const set = active.get(ws);
    if (!set) return;
    for (const controller of set) controller.abort();
    active.delete(ws);
  };

  return {serves, handle, closeSocket};
}

export type CloudRunner = ReturnType<typeof createCloudRunner>;
