import type {ServerMessage} from '@chatwidget/shared';
import {serverErrorToKind, type ChatErrorKind} from '@/lib/errors';
import {getWebSocketUrl} from '@/lib/wsUrl';
import {useChatStore} from '@/components/chat/store/chatStore';

// Phase 1: connect and get a queue ack, or give up.
const CONNECT_TIMEOUT_MS = 8_000;

// Phase 2: no messages for a while while generating. Reset on every frame.
// Set above the server 40s cap so the server error comes first.
const RESPONSE_TIMEOUT_MS = 50_000;

// Reconnect backoff cap. Keep below CONNECT_TIMEOUT_MS.
const RECONNECT_MAX_DELAY_MS = 5_000;

// One websocket for the page. Writes ingest into the store, doesn't subscribe to it.
// Timeout rules are in docs/connection-lifecycle.md.
function createChatSocket() {
  let ws: WebSocket | null = null;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;
  let responseTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingPayload: string | null = null; // send parked until onopen
  let currentRequestId: string | null = null; // drop frames for other ids
  let userTriedToSend = false;
  let attempts = 0;
  let disposed = false;

  const resetStreamBuffer = () => useChatStore.setState({receivedText: ''});

  const prepareForNewRequest = () =>
    useChatStore.setState({
      hasStarted: false,
      isReasoning: false,
      receivedText: '',
      queuePosition: null,
    });

  const onIdle = () => useChatStore.setState({isGenerating: false, loading: false});

  const clearTimers = () => {
    if (connectTimer !== null) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    if (responseTimer !== null) {
      clearTimeout(responseTimer);
      responseTimer = null;
    }
  };

  const reportError = (kind: ChatErrorKind) => {
    clearTimers();
    resetStreamBuffer();
    useChatStore.setState({isReasoning: false});
    useChatStore.getState().appendError(kind);
    onIdle();
  };

  // Clear request state so a late reconnect can't send old stuff.
  const failRequest = (kind: ChatErrorKind) => {
    pendingPayload = null;
    currentRequestId = null;
    userTriedToSend = false;
    reportError(kind);
  };

  const armConnectTimer = () => {
    clearTimers();
    connectTimer = setTimeout(
      () => failRequest('unavailable'),
      CONNECT_TIMEOUT_MS,
    );
  };

  const armResponseTimer = () => {
    clearTimers();
    responseTimer = setTimeout(() => failRequest('timeout'), RESPONSE_TIMEOUT_MS);
  };

  const handleMessage = (event: MessageEvent<string>) => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(event.data) as ServerMessage;
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
      return;
    }

    // Ignore stale frames. Pre-queue errors have no id.
    if ('id' in msg && msg.id && msg.id !== currentRequestId) {
      return;
    }

    if (msg.type === 'queue') {
      armResponseTimer();
      useChatStore.setState({
        queuePosition: msg.position,
        queueLength: msg.length,
        isSomeoneProcessing: msg.isSomeoneProcessing,
      });
      return;
    }

    // Done from server. Text is complete, so move it straight into the thread.
    if (msg.type === 'done') {
      clearTimers();
      currentRequestId = null;
      userTriedToSend = false;
      const {finalize, receivedText} = useChatStore.getState();
      finalize(receivedText);
      return;
    }

    if (msg.type === 'error') {
      clearTimers();
      if (userTriedToSend) {
        userTriedToSend = false;
        reportError(serverErrorToKind(msg.code));
      }
      return;
    }

    if (msg.type === 'started') {
      armResponseTimer();
      useChatStore.setState({
        hasStarted: true,
        isReasoning: msg.reasoning === true,
        queuePosition: null,
      });
      return;
    }

    if (msg.type === 'content') {
      armResponseTimer();
      useChatStore.setState((state) => ({
        hasStarted: true,
        isReasoning: false,
        queuePosition: null,
        receivedText: state.receivedText + msg.delta,
      }));
      return;
    }
  };

  const openSocket = () => {
    const socket = new WebSocket(getWebSocketUrl());
    ws = socket;

    socket.onopen = () => {
      attempts = 0;
      if (pendingPayload !== null) {
        const pending = pendingPayload;
        pendingPayload = null;
        socket.send(pending);
        armConnectTimer();
      }
    };

    socket.onmessage = handleMessage;

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = (event: CloseEvent) => {
      // Unsent payload survives reconnect. Only fail if we already sent something.
      if (pendingPayload === null) {
        clearTimers();
        if (userTriedToSend) {
          userTriedToSend = false;
          if (event.code === 1006 || event.code === 1001) {
            reportError('interrupted');
          } else {
            reportError('unavailable');
          }
        } else {
          resetStreamBuffer();
          useChatStore.setState({isReasoning: false});
          onIdle();
        }
      }

      if (disposed) return;
      const delay = Math.min(1000 * 2 ** attempts, RECONNECT_MAX_DELAY_MS);
      attempts += 1;
      reconnectTimer = setTimeout(openSocket, delay);
    };
  };

  return {
    // Open on mount, reconnect with backoff. Fine under StrictMode double mount.
    connect() {
      disposed = false;
      if (!ws) openSocket();
    },

    prepareForNewRequest,

    dispose() {
      disposed = true;
      clearTimers();
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
        ws = null;
      }
    },

    sendPayload(payloadStr: string, requestId: string) {
      currentRequestId = requestId;
      userTriedToSend = true;
      armConnectTimer();

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(payloadStr);
      } else {
        pendingPayload = payloadStr;
      }
    },

    cancelRequest() {
      const id = currentRequestId;
      if (id && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({type: 'stop', id}));
      }
      pendingPayload = null;
      currentRequestId = null;
      userTriedToSend = false;
      clearTimers();
      prepareForNewRequest();
      onIdle();
    },
  };
}

export const chatSocket = createChatSocket();
