// Back-compat shim. The PeerJS wrapper now lives at js/net/transport.js.
// This file re-exports its surface so anything that imported "./net.js"
// keeps working unchanged.

export {
  send, isConnected, closeConnection,
  hostRoom, joinRoom,
  onOpen, onClose, onError
} from "./net/transport.js";

import { onPacket } from "./net/transport.js";

// Old name. The transport now wraps every payload with a sequence number,
// but the unwrapped payload still passes through the handler unchanged
// (extra `_seq` field is ignored by old handlers).
export function onMessage(fn) { onPacket(fn); }
