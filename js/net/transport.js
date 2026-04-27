// Transport layer. Owns the PeerJS data channel and nothing else.
// Knows nothing about messages, gameplay, or session state — those
// concerns live in messages.js, session.js, and handlers.js.
//
// Adds:
//   * Outgoing sequence number on every send.
//   * onPacket(handler) — receives the raw object plus its seq.
//   * Reconnect-friendly close/open handlers.

const ROOM_PREFIX = "code-blue-";

let peer = null;
let conn = null;
let outSeq = 0;
const handlers = { packet: null, open: null, close: null, error: null };

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function peerIdFor(code) { return ROOM_PREFIX + code.toUpperCase(); }

function attachConn(c) {
  conn = c;
  c.on("open",  () => handlers.open  && handlers.open());
  c.on("data",  (data) => handlers.packet && handlers.packet(data));
  c.on("close", () => handlers.close && handlers.close());
  c.on("error", (err) => handlers.error && handlers.error(err));
}

// Public API

export function onPacket(fn) { handlers.packet = fn; }
export function onOpen(fn)   { handlers.open = fn; }
export function onClose(fn)  { handlers.close = fn; }
export function onError(fn)  { handlers.error = fn; }

export function send(obj) {
  if (!conn || !conn.open) return;
  const wrapped = { ...obj, _seq: ++outSeq };
  conn.send(wrapped);
}

export function isConnected() { return !!(conn && conn.open); }

export function closeConnection() {
  try { conn && conn.close(); } catch {}
  try { peer && peer.destroy(); } catch {}
  conn = null;
  peer = null;
  outSeq = 0;
}

export function hostRoom({ onRoomCode, onGuestJoined, onError: errCb } = {}) {
  closeConnection();
  const code = randomRoomCode();
  const id = peerIdFor(code);
  // eslint-disable-next-line no-undef
  peer = new Peer(id, { debug: 1 });
  peer.on("open", () => onRoomCode && onRoomCode(code));
  peer.on("connection", (c) => {
    attachConn(c);
    if (onGuestJoined) onGuestJoined();
  });
  peer.on("error", (err) => errCb && errCb(err));
  return { code };
}

export function joinRoom(code, { onConnected, onError: errCb } = {}) {
  closeConnection();
  // eslint-disable-next-line no-undef
  peer = new Peer(undefined, { debug: 1 });
  peer.on("open", () => {
    const c = peer.connect(peerIdFor(code), { reliable: true });
    attachConn(c);
    c.on("open", () => onConnected && onConnected());
  });
  peer.on("error", (err) => errCb && errCb(err));
}
