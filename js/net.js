// PeerJS wrapper for CodeBlue. One open data-channel between two browsers.
// Used for co-op / pvp dungeon sessions.

const ROOM_PREFIX = "code-blue-";

let peer = null;
let conn = null;
const handlers = { message: null, open: null, close: null, error: null };

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function peerIdFor(code) { return ROOM_PREFIX + code.toUpperCase(); }

function attachConn(c) {
  conn = c;
  c.on("open", () => handlers.open && handlers.open());
  c.on("data", (data) => handlers.message && handlers.message(data));
  c.on("close", () => handlers.close && handlers.close());
  c.on("error", (err) => handlers.error && handlers.error(err));
}

export function onMessage(fn) { handlers.message = fn; }
export function onOpen(fn)    { handlers.open = fn; }
export function onClose(fn)   { handlers.close = fn; }
export function onError(fn)   { handlers.error = fn; }

export function send(obj) {
  if (conn && conn.open) conn.send(obj);
}

export function isConnected() { return !!(conn && conn.open); }

export function closeConnection() {
  try { conn && conn.close(); } catch {}
  try { peer && peer.destroy(); } catch {}
  conn = null; peer = null;
}

export function hostRoom({ onRoomCode, onGuestJoined, onError: errCb } = {}) {
  closeConnection();
  const code = randomRoomCode();
  const id = peerIdFor(code);
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
  peer = new Peer(undefined, { debug: 1 });
  peer.on("open", () => {
    const c = peer.connect(peerIdFor(code), { reliable: true });
    attachConn(c);
    c.on("open", () => onConnected && onConnected());
  });
  peer.on("error", (err) => errCb && errCb(err));
}
