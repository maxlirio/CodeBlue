// CodeBlue multiplayer (Phase 1: presence + same-seed dungeon + chat).
//
// Wire protocol over PeerJS data channel:
//   { type: "hello",  name, className, color }
//   { type: "seed",   seed, mode }   // host -> guest, mode = "coop" | "pvp"
//   { type: "ready" }                // signal that local player has chosen class
//   { type: "pos",    x, y, floor }
//   { type: "floor",  floor }        // when local descends/ascends
//   { type: "chat",   text }
//
// Phase 1 only syncs presence — enemies and chests are still per-client.

import {
  hostRoom, joinRoom, send as netSend, onMessage, onOpen, onClose, onError,
  closeConnection, isConnected
} from "./net.js";
import { state, ui } from "./state.js";
import { setSeed } from "./rng.js";
import { setMessage } from "./utils.js";

export const multi = {
  enabled: false,
  role: null,             // "host" | "guest"
  mode: "coop",           // "coop" | "pvp"
  seed: null,
  ready: false,           // local player has picked a class
  partnerReady: false,
  connected: false,
  partner: null,          // { name, className, color, x, y, floor, alive }
  pendingHostStartCallback: null
};

const PARTNER_COLORS = { coop: "#7bdff2", pvp: "#ff7a82" };

function partnerColorForMode(mode) {
  return PARTNER_COLORS[mode] || PARTNER_COLORS.coop;
}

export function reset() {
  multi.enabled = false;
  multi.role = null;
  multi.mode = "coop";
  multi.seed = null;
  multi.ready = false;
  multi.partnerReady = false;
  multi.connected = false;
  multi.partner = null;
}

// ---- Outbound helpers ----

export function sendHello() {
  netSend({
    type: "hello",
    name: state.heroName || "Wanderer",
    className: state.player.className || "?",
    color: partnerColorForMode(multi.mode)
  });
}

export function sendReady() {
  multi.ready = true;
  netSend({ type: "ready" });
}

export function sendPosition() {
  if (!multi.enabled || !multi.connected) return;
  netSend({
    type: "pos",
    x: state.player.x,
    y: state.player.y,
    floor: state.floor,
    hp: state.player.hp,
    maxHp: state.player.maxHp
  });
}

export function sendFloor(floor) {
  if (!multi.enabled || !multi.connected) return;
  netSend({ type: "floor", floor });
}

export function sendChat(text) {
  if (!multi.enabled || !multi.connected) return;
  if (!text || !text.trim()) return;
  const t = text.trim().slice(0, 200);
  netSend({ type: "chat", text: t });
  appendChat(state.heroName || "you", t, true);
}

// ---- Inbound dispatcher ----

function ensurePartner() {
  if (!multi.partner) {
    multi.partner = { name: "Partner", className: "Knight", color: PARTNER_COLORS.coop, x: 0, y: 0, floor: 0, hp: 0, maxHp: 0, alive: true };
  }
  return multi.partner;
}

function updatePartnerCard() {
  if (!ui.partnerCard) return;
  if (!multi.enabled || !multi.partner) {
    ui.partnerCard.classList.add("hidden");
    return;
  }
  const p = multi.partner;
  const sameFloor = p.floor === state.floor;
  const floorLabel = p.floor === 0 ? "Town" : `Floor ${p.floor}`;
  const hpPct = p.maxHp ? Math.max(0, Math.min(1, p.hp / p.maxHp)) : 0;
  ui.partnerCard.style.borderColor = p.color;
  ui.partnerCard.classList.remove("hidden");
  ui.partnerCard.innerHTML =
    `<div class="partner-name" style="color:${p.color}">${escapeHtml(p.name)} <span class="partner-class">· ${escapeHtml(p.className)}</span></div>` +
    `<div class="partner-meta">${sameFloor ? "<b>here</b>" : floorLabel}${p.maxHp ? ` · HP ${p.hp}/${p.maxHp}` : ""}</div>` +
    `<div class="partner-hp"><div class="partner-hp-fill" style="width:${Math.round(hpPct * 100)}%; background:${p.color}"></div></div>` +
    `<div class="partner-mode">${multi.mode === "pvp" ? "PvP" : "Co-op"}</div>`;
}

function handleMessage(msg) {
  if (!msg || typeof msg !== "object") return;
  let updated = true;
  switch (msg.type) {
    case "hello": {
      const p = ensurePartner();
      if (typeof msg.name === "string")      p.name = msg.name.slice(0, 32);
      if (typeof msg.className === "string") p.className = msg.className.slice(0, 24);
      // Always color the partner based on this side's mode for consistency.
      p.color = partnerColorForMode(multi.mode);
      appendChat("system", `${p.name} the ${p.className} joined.`, false);
      break;
    }
    case "seed": {
      // Guest receives the host's seed and the chosen mode.
      multi.seed = String(msg.seed || "");
      multi.mode = msg.mode === "pvp" ? "pvp" : "coop";
      if (multi.seed) {
        setSeed(multi.seed);
        state.seed = multi.seed;
      }
      const p = ensurePartner();
      p.color = partnerColorForMode(multi.mode);
      appendChat("system", `Seed shared. Mode: ${multi.mode.toUpperCase()}.`, false);
      break;
    }
    case "ready": {
      multi.partnerReady = true;
      appendChat("system", `${multi.partner?.name || "Partner"} is ready.`, false);
      maybeStartHostMatch();
      break;
    }
    case "pos": {
      const p = ensurePartner();
      p.x = Number(msg.x) | 0;
      p.y = Number(msg.y) | 0;
      p.floor = Number(msg.floor) | 0;
      p.hp = Number(msg.hp) | 0;
      p.maxHp = Number(msg.maxHp) | 0;
      break;
    }
    case "floor": {
      const p = ensurePartner();
      p.floor = Number(msg.floor) | 0;
      appendChat("system", `${p.name} is on floor ${p.floor === 0 ? "Town" : p.floor}.`, false);
      break;
    }
    case "chat": {
      const name = multi.partner?.name || "Partner";
      appendChat(name, String(msg.text || "").slice(0, 200), false);
      updated = false;
      break;
    }
  }
  if (updated) updatePartnerCard();
}

// ---- Host start gate ----

// When both clients have sent "ready" the host triggers the chosen-mode
// callback so the actual run begins (the start callback is wired by main.js
// when the player presses "Begin").
export function setHostStartCallback(fn) { multi.pendingHostStartCallback = fn; }

function maybeStartHostMatch() {
  if (multi.role !== "host") return;
  if (!multi.ready || !multi.partnerReady) return;
  if (typeof multi.pendingHostStartCallback === "function") {
    const fn = multi.pendingHostStartCallback;
    multi.pendingHostStartCallback = null;
    fn();
  }
}

// ---- Connection lifecycle ----

function attachStdHandlers() {
  onMessage(handleMessage);
  onOpen(() => {
    multi.connected = true;
    appendChat("system", "Connection open. Greeting partner…", false);
    sendHello();
  });
  onClose(() => {
    multi.connected = false;
    appendChat("system", "Partner disconnected.", false);
  });
  onError((err) => {
    console.warn("net error", err);
    appendChat("system", `net error: ${err.type || err.message || err}`, false);
  });
}

export function startHost() {
  reset();
  multi.enabled = true;
  multi.role = "host";
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
  reset();
  multi.enabled = true;
  multi.role = "guest";
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
  reset();
}

// ---- Chat UI helpers ----

function appendChat(name, text, isMe) {
  if (!ui.chatLog) return;
  const row = document.createElement("div");
  row.className = "chat-line" + (isMe ? " me" : (name === "system" ? " system" : ""));
  if (name === "system") {
    row.innerHTML = `<em>${escapeHtml(text)}</em>`;
  } else {
    row.innerHTML = `<strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}`;
  }
  ui.chatLog.appendChild(row);
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
  // Auto-show chat when a message arrives if the user has opted in
  if (ui.chatBox && multi.connected) ui.chatBox.classList.remove("hidden");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}

export function isMultiplayer() { return multi.enabled && multi.connected; }
export function partnerOnSameFloor() {
  return !!(multi.partner && multi.partner.floor === state.floor);
}
