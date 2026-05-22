// WebSocket URL for the chat backend.
// Derived from the page host so LAN/mobile testing just works: open the client
// on your phone at http://<your-LAN-IP>:5173 and it targets that same host:3000.
export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3000`;
}
