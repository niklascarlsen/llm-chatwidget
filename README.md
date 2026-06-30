# LLM Chat Widget

Support-style chat widget with streaming over WebSocket. Local Ollama runs through a FIFO queue; cloud runs directly.

**Stack:** Bun workspaces · React 19 + Vite + Tailwind · Bun + Hono · WebSocket · `@chatwidget/shared` · Ollama

## Background

I originally ran a local LLM using Ollama and exposed it on my portfolio site through a Cloudflare tunnel. Since my computer could only process one generation at a time, I had to build a queue and timeouts just to stop concurrent requests from piling up and crashing the GPU.

The server now also routes to Gemini on a separate path that runs directly without a queue.

## What it does

- **Streaming chat** over WebSocket with live markdown, a per-word fade reveal (via `streamdown`), and auto-scroll that follows the animation until you scroll up
- **Local vs cloud:** Ollama goes through a FIFO queue (one at a time); cloud APIs like Gemini run directly
- **Queue + timeouts** on the local path: one generation at a time on limited hardware; hung requests abort so the queue keeps moving
- **Per-IP rate limits** on both paths (keys off the real client IP behind the tunnel)
- **Resilient client** with reconnect, parked sends, and ordered timeouts between client and server
- **Mobile UI** with native `<dialog>`, scroll lock, and `visualViewport` so header and input stay aligned when the on-screen keyboard opens

## Structure

Bun monorepo. Protocol types live in `shared/` so client and server stay in sync.

```
├── client/
│   └── components/chat/
│       ├── chatSocket.ts    module-singleton WebSocket layer -> writes to store
│       ├── store/           Zustand store (chatStore.ts)
│       ├── hooks/           scroll + UI/a11y effects
│       └── ui/              presentational; streamed markdown via streamdown
├── shared/                  WebSocket message types
└── server/
    ├── gateway.ts           routes by provider
    ├── local/               Ollama + FIFO queue
    ├── cloud/               Gemini
    └── core/                rate limit, pump, shared helpers
```

All chat state lives in one Zustand store (`store/chatStore.ts`); each component selects just the slice it needs, so a keystroke or token re-renders its own leaf instead of the whole tree like before. The WebSocket sits in `chatSocket.ts` and pushes incoming text into the store.

Clients send an optional `provider` field (`ollama` or `gemini`; defaults to `ollama`).

## Local development

**Prerequisites:** [Bun](https://bun.sh/) ≥ 1.3, [Ollama](https://ollama.ai/) with a model pulled.

```bash
ollama pull llama3.1:8b
ollama serve
bun install
bun run dev
```

**Model / provider:** `SELECTED_MODEL` and `SELECTED_PROVIDER` in `client/src/components/chat/store/chatStore.ts`.

**Gemini (optional):** set `GEMINI_API_KEY` in the server environment. Without it the server still boots; only Gemini requests fail.

**Phone on the same LAN:** open `http://<your-LAN-IP>:5173` (not `localhost`). The widget targets the backend on that host automatically.
