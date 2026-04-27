// CodeBlue multiplayer — facade.
//
// All real logic lives under /js/net/:
//   transport.js — PeerJS data channel
//   messages.js  — wire types
//   session.js   — role/mode/partner authority + helpers
//   sync.js      — outbound broadcasts
//   handlers.js  — inbound dispatch
//   chat.js      — chat UI helpers
//
// This file binds those pieces into a connection lifecycle and re-exports
// the classic API (`multi`, `startHost`, `joinAsGuest`, `sendPosition`,
// etc.) so existing call sites keep working while we migrate them to
// `session` directly.

import {
  hostRoom, joinRoom, onPacket, onOpen, onClose, onError,
  closeConnection
} from "./net/transport.js";
import { session } from "./net/session.js";
import { dispatch } from "./net/handlers.js";
import { appendChat } from "./net/chat.js";
import {
  sendHello, sendPing, updatePartnerCard
} from "./net/sync.js";

// Re-exports — keep the legacy import shape so the rest of the codebase
// keeps working unchanged.
export { session as multi } from "./net/session.js";
export {
  sendHello, sendReady, sendPosition, sendFloor, sendChat,
  sendEnemyList, clearEnemySnap,
  syncRemoteDamage, syncRemoteApplyStatus, syncRemoteRemoveStatus,
  deliverPlayerHitToGuest,
  broadcastFxBurst, broadcastFxBeam, broadcastFxShake,
  sendFloorEffects, broadcastEnemyDeltas,
  sendGiftItem, sendShopVisit,
  sendPartnerSupport, sendPvpHit,
  sendQuestKill, sendQuestPickup, sendQuestDescend,
  sendSeed
} from "./net/sync.js";

// Convenience checks — already methods on session, but kept as functions
// for back-compat. New code should call session.isMultiplayer() etc.
export function isMultiplayer() { return session.isMultiplayer(); }
export function isHost()        { return session.isHost(); }
export function isGuest()       { return session.isGuest(); }
export function isHostActive()  { return session.isHostActive(); }
export function isGuestActive() { return session.isGuestActive(); }
export function partnerOnSameFloor() { return session.partnerHere(); }

// ---- ping loop ----

let pingTimer = null;
function startPingLoop() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = setInterval(sendPing, 4000);
}
function stopPingLoop() {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  session.rttMs = null;
}

// ---- host start gate ----
//
// When both clients have sent "ready" the host fires the chosen-mode
// callback so the run can begin (the gate is wired by main.js).

export function setHostStartCallback(fn) {
  session._onReadyGate = () => {
    if (!session.isHost()) return;
    if (!session.ready || !session.partnerReady) return;
    if (typeof fn === "function") {
      session._onReadyGate = null;
      fn();
    }
  };
}

// ---- partner-disconnect callback ----

let disconnectHandler = null;
export function setDisconnectHandler(fn) { disconnectHandler = fn; }

// ---- standard handlers wiring ----

function attachStdHandlers() {
  onPacket(dispatch);
  onOpen(() => {
    session.connected = true;
    appendChat("system", "Connection open. Greeting partner…", false);
    sendHello();
    startPingLoop();
    updatePartnerCard();
  });
  onClose(() => {
    session.connected = false;
    stopPingLoop();
    if (disconnectHandler) disconnectHandler();
    appendChat("system", "Partner disconnected.", false);
    updatePartnerCard();
  });
  onError((err) => {
    console.warn("net error", err);
    appendChat("system", `net error: ${err.type || err.message || err}`, false);
  });
}

// ---- lifecycle ----

export function startHost() {
  session.startHost();
  attachStdHandlers();
  return new Promise((resolve, reject) => {
    hostRoom({
      onRoomCode: (code) => resolve(code),
      onGuestJoined: () => appendChat("system", "Guest joined.", false),
      onError: (err) => reject(err)
    });
  });
}

export function joinAsGuest(code) {
  session.startGuest();
  attachStdHandlers();
  return new Promise((resolve, reject) => {
    joinRoom(code, {
      onConnected: () => resolve(),
      onError: (err) => reject(err)
    });
  });
}

export function leaveMatch() {
  closeConnection();
  session.end();
}

// `reset()` used to be a stronger sledgehammer that wiped session.mode.
// Subsystems that *truly* want to end multiplayer should call leaveMatch().
// We keep `reset()` exported so existing `multi.reset()` callers don't
// break; it routes to leaveMatch().
export function reset() { leaveMatch(); }

// Chest helpers — chests are per-player; keep stubs so old callers compile.
export function syncOpenChest() {}
export function broadcastChestOpened() {}
