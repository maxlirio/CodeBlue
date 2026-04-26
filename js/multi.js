// CodeBlue multiplayer.
//
// Architecture (Phase 2):
//   * The HOST owns shared world state — enemy list, enemy AI ticks,
//     chest open/loot, floor effects. The host runs the authoritative
//     simulation and broadcasts the resulting deltas.
//   * The GUEST does not run enemy AI; it mirrors the host's broadcasts
//     and renders. Player input that affects shared state (attacks, casts,
//     chest opens, descend) is sent to the host as input messages; the
//     host applies them and broadcasts the result.
//   * Each client owns its own player state (HP, MP, inventory). Damage
//     to a player is computed by the host but delivered as a "playerHit"
//     event to the targeted side, which applies it locally.
//
// Wire protocol over the PeerJS data channel:
//   --- handshake / presence (Phase 1) ---
//   { type: "hello",  name, className, color }
//   { type: "seed",   seed, mode }    // host -> guest, mode = "coop" | "pvp"
//   { type: "ready" }                 // local player has chosen a class
//   { type: "pos",    x, y, floor, hp, maxHp }
//   { type: "floor",  floor }
//   { type: "chat",   text }
//
//   --- world state, host -> guest (Phase 2) ---
//   { type: "enemies", floor, list }              // sent on floor entry
//   { type: "enemy_delta", id, x?, y?, hp?, statuses?, dying? }
//   { type: "enemy_remove", id }
//   { type: "chests",  list }                     // sent on floor entry
//   { type: "chest_state", id, opened }
//
//   --- inputs, guest -> host (Phase 2) ---
//   { type: "input_attack", id }                  // guest melee'd enemy id
//   { type: "input_cast", spellId, tx, ty, charged }
//   { type: "input_ability", tx, ty }
//   { type: "input_open_chest", id }
//
//   --- damage / fx, host -> guest (Phase 2) ---
//   { type: "playerHit", side, dmg, byName?, status? }
//   { type: "spell_fx", origin, target, color, kind }
//
// Phase 1 ships above the dotted line (handshake / presence / chat).
// Phase 2 ships everything below it. Each task in Phase 2 grows this file
// with new handlers and new outbound helpers.

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
  pendingHostStartCallback: null,
  rttMs: null,
  lastPingAt: 0,
  pingTimer: null
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
  const rtt = multi.rttMs;
  let rttClass = "ping good", rttLabel = "—";
  if (rtt != null) {
    rttLabel = `${Math.round(rtt)}ms`;
    if (rtt < 100) rttClass = "ping good";
    else if (rtt < 250) rttClass = "ping warn";
    else rttClass = "ping err";
  }
  ui.partnerCard.innerHTML =
    `<div class="partner-name" style="color:${p.color}">${escapeHtml(p.name)} <span class="partner-class">· ${escapeHtml(p.className)}</span></div>` +
    `<div class="partner-meta">${sameFloor ? "<b>here</b>" : floorLabel}${p.maxHp ? ` · HP ${p.hp}/${p.maxHp}` : ""}</div>` +
    `<div class="partner-hp"><div class="partner-hp-fill" style="width:${Math.round(hpPct * 100)}%; background:${p.color}"></div></div>` +
    `<div class="partner-mode">${multi.mode === "pvp" ? "PvP" : "Co-op"}</div>` +
    `<div class="partner-ping ${rttClass}">${rttLabel}</div>`;
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
    case "enemies": {
      // Guest receives the host's full enemy list for the current floor.
      // Replace local enemies with the broadcast list.
      if (Number(msg.floor) !== state.floor) { updated = false; break; }
      state.enemies = (msg.list || []).map((e) => ({
        ...e,
        statuses: (e.statuses || []).map((s) => ({ ...s })),
        // Guest never runs AI for these; protoState/actTimer are unused.
        protoState: {},
        actTimer: 0
      }));
      updated = false;
      break;
    }
    case "enemy_delta": {
      const e = state.enemies.find((x) => x.id === msg.id);
      if (e) {
        if (msg.x !== undefined) e.x = msg.x;
        if (msg.y !== undefined) e.y = msg.y;
        if (msg.hp !== undefined) e.hp = msg.hp;
        if (msg.dying !== undefined) e.dying = msg.dying;
        if (Array.isArray(msg.statuses)) e.statuses = msg.statuses.map((s) => ({ ...s }));
      }
      updated = false;
      break;
    }
    case "enemy_remove": {
      state.enemies = state.enemies.filter((x) => x.id !== msg.id);
      updated = false;
      break;
    }
    case "chests": {
      if (Number(msg.floor) !== state.floor) { updated = false; break; }
      // Preserve any local loot fields the guest's chests already have
      // (so opening on the guest still works for now). We'll route opens
      // through the host in a later task.
      const incomingById = new Map((msg.list || []).map((c) => [c.id, c]));
      state.chests = (state.chests || []).map((c) => {
        const inc = incomingById.get(c.id);
        if (!inc) return c;
        return { ...c, opened: !!inc.opened };
      });
      // Add any host-known chest the guest somehow lacks (shouldn't happen
      // with a synced seed, but safe).
      for (const inc of (msg.list || [])) {
        if (!state.chests.find((c) => c.id === inc.id)) state.chests.push({ ...inc });
      }
      updated = false;
      break;
    }
    case "chest_state": {
      const c = (state.chests || []).find((x) => x.id === msg.id);
      if (c) c.opened = !!msg.opened;
      updated = false;
      break;
    }
    // ---- Host receives guest combat mutations ----
    case "remote_damage": {
      // Apply damage to host's authoritative enemy. Skip multipliers — guest
      // already applied them. Mark rewardsGranted so host doesn't double-credit.
      if (multi.role !== "host") { updated = false; break; }
      const e = state.enemies.find((x) => x.id === msg.id);
      if (e) {
        e.hp -= Math.max(0, Number(msg.amount) || 0);
        if (e.hp <= 0 && !e.rewardsGranted) {
          e.rewardsGranted = true;
          e.dying = e.dying || 18;
        }
      }
      updated = false;
      break;
    }
    case "remote_apply_status": {
      if (multi.role !== "host") { updated = false; break; }
      const e = state.enemies.find((x) => x.id === msg.id);
      if (e) {
        const cur = (e.statuses ||= []).find((s) => s.kind === msg.kind);
        if (cur) {
          cur.turns = Math.max(cur.turns, Number(msg.turns) || 0);
          cur.power = Math.max(cur.power, Number(msg.power) || 1);
        } else {
          e.statuses.push({ kind: msg.kind, turns: Number(msg.turns) || 1, power: Number(msg.power) || 1 });
        }
      }
      updated = false;
      break;
    }
    case "remote_remove_status": {
      if (multi.role !== "host") { updated = false; break; }
      const e = state.enemies.find((x) => x.id === msg.id);
      if (e && e.statuses) e.statuses = e.statuses.filter((s) => s.kind !== msg.kind);
      updated = false;
      break;
    }
    case "input_open_chest": {
      if (multi.role !== "host") { updated = false; break; }
      const c = (state.chests || []).find((x) => x.id === msg.id);
      if (c && !c.opened) {
        c.opened = true;
        netSend({ type: "chest_state", id: c.id, opened: true });
      }
      updated = false;
      break;
    }
    case "shop_visit": {
      const name = multi.partner?.name || "Partner";
      const shop = String(msg.kind || "").replace(/^./, (c) => c.toUpperCase());
      appendChat("system", msg.entering ? `${name} entered the ${shop}.` : `${name} left the ${shop}.`, false);
      updated = false;
      break;
    }
    case "quest_kill": {
      // Partner killed an enemy — credit our quest if it's a co-op slay quest.
      if (multi.mode !== "coop") { updated = false; break; }
      import("./quests.js").then(({ recordEnemyKill }) => recordEnemyKill(msg.enemyType, msg.floor));
      updated = false;
      break;
    }
    case "quest_pickup": {
      if (multi.mode !== "coop") { updated = false; break; }
      import("./quests.js").then(({ recordItemPickup }) => recordItemPickup(msg.itemName));
      updated = false;
      break;
    }
    case "quest_descend": {
      if (multi.mode !== "coop") { updated = false; break; }
      import("./quests.js").then(({ recordDescend }) => recordDescend(Number(msg.floor) || 0));
      updated = false;
      break;
    }
    case "pvp_hit": {
      if (multi.mode !== "pvp") { updated = false; break; }
      const reduced = applyPlayerHitLocal(Number(msg.dmg) || 0);
      state.lastHitBy = String(msg.byName || (multi.partner?.name || "Partner"));
      setMessage(`${state.lastHitBy} hits you for ${reduced}.`);
      // Check for death / pvp kill
      if (state.player.hp <= 0) {
        state.player.hp = 0;
        netSend({ type: "pvp_kill", victim: state.heroName || "you", killer: state.lastHitBy });
      }
      updated = false;
      break;
    }
    case "follow_floor": {
      // Partner is going to a new floor — auto-follow.
      const target = Math.max(0, Math.min(15, Number(msg.floor) | 0));
      if (target === state.floor) { updated = false; break; }
      import("./turn.js").then(({ followToFloor }) => followToFloor(target));
      updated = false;
      break;
    }
    case "pvp_kill": {
      // Show kill banner
      const banner = document.createElement("div");
      banner.className = "pvp-kill-banner";
      banner.innerHTML = `<strong>${escapeHtml(msg.victim)}</strong> felled by <strong>${escapeHtml(msg.killer)}</strong>`;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 4000);
      updated = false;
      break;
    }
    // ---- Guest receives host damage events + visuals ----
    case "playerHit": {
      if (multi.role !== "guest") { updated = false; break; }
      const reduced = applyPlayerHitLocal(Number(msg.dmg) || 0);
      if (msg.byName) state.lastHitBy = String(msg.byName);
      if (msg.status) {
        // Apply status to local player
        const cur = state.player.statuses.find((s) => s.kind === msg.status);
        if (cur) cur.turns = Math.max(cur.turns, 4);
        else state.player.statuses.push({ kind: msg.status, turns: 4, power: 1 });
      }
      // setMessage so the player sees what hit them
      setMessage(`${msg.byName || "An enemy"} hits you for ${reduced}.`);
      updated = false;
      break;
    }
    case "fx_burst": {
      const t = ensureBurst(msg.x, msg.y, msg.color, msg.count);
      updated = false;
      break;
    }
    case "fx_beam": {
      ensureBeam(msg.x1, msg.y1, msg.x2, msg.y2, msg.color);
      updated = false;
      break;
    }
    case "fx_shake": {
      // Imported lazily to avoid pulling fx.js into this module top.
      import("./fx.js").then(({ doScreenShake }) => doScreenShake(Number(msg.amt) || 4));
      updated = false;
      break;
    }
    case "ping": {
      // Echo back as pong so the requester can measure RTT.
      netSend({ type: "pong", t: msg.t });
      updated = false;
      break;
    }
    case "floor_effects": {
      if (multi.role !== "guest") { updated = false; break; }
      state.floorEffects = (msg.list || []).map((f) => ({ ...f }));
      updated = false;
      break;
    }
    case "pong": {
      const sentAt = Number(msg.t) || 0;
      if (sentAt > 0) {
        multi.rttMs = Math.max(0, performance.now() - sentAt);
        updatePartnerCard();
      }
      updated = false;
      break;
    }
  }
  if (updated) updatePartnerCard();
}

function startPingLoop() {
  if (multi.pingTimer) clearInterval(multi.pingTimer);
  multi.pingTimer = setInterval(() => {
    if (!multi.connected) return;
    const t = performance.now();
    multi.lastPingAt = t;
    netSend({ type: "ping", t });
  }, 4000);
}
function stopPingLoop() {
  if (multi.pingTimer) { clearInterval(multi.pingTimer); multi.pingTimer = null; }
  multi.rttMs = null;
}

let disconnectHandler = null;
export function setDisconnectHandler(fn) { disconnectHandler = fn; }
function onPartnerDisconnect() {
  if (disconnectHandler) disconnectHandler();
}

function applyPlayerHitLocal(amount) {
  const ward = state.player.statuses && state.player.statuses.find((s) => s.kind === "ward");
  const reduced = ward ? Math.max(1, Math.floor(amount * (1 - ward.power / 100))) : amount;
  state.player.hp -= reduced;
  return reduced;
}

// Lazy-import fx so we can call from the message handler without forcing
// fx.js to be eager-imported by this module.
function ensureBurst(x, y, color, count) {
  import("./fx.js").then(({ spawnBurst }) => spawnBurst(x, y, color, count || 8));
}
function ensureBeam(x1, y1, x2, y2, color) {
  import("./fx.js").then(({ spawnBeam }) => spawnBeam(x1, y1, x2, y2, color));
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
    startPingLoop();
  });
  onClose(() => {
    multi.connected = false;
    stopPingLoop();
    onPartnerDisconnect();
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
export function isHost() { return multi.role === "host"; }
export function isGuest() { return multi.role === "guest"; }
// Is this client supposed to skip authoritative simulation work (enemy AI,
// chest mutations, floor effects)? Only when we're a connected guest.
export function isGuestActive() { return multi.enabled && multi.connected && multi.role === "guest"; }
// Should this client broadcast world state to its peer?
export function isHostActive() { return multi.enabled && multi.connected && multi.role === "host"; }

export function partnerOnSameFloor() {
  return !!(multi.partner && multi.partner.floor === state.floor);
}

// ---- Phase 2: world state broadcasts (host only) ----

function serializeEnemy(e) {
  return {
    id: e.id, type: e.type, name: e.name,
    x: e.x, y: e.y,
    hp: e.hp, maxHp: e.maxHp,
    atk: e.atk, baseAtk: e.baseAtk,
    vision: e.vision,
    weak: e.weak || [], resist: e.resist || [],
    boss: !!e.boss,
    statuses: (e.statuses || []).map((s) => ({ ...s })),
    actInterval: e.actInterval,
    protocol: e.protocol,
    dying: e.dying || 0
  };
}

function serializeChest(c) {
  // Exclude loot — only the opener's client needs it.
  return { id: c.id, x: c.x, y: c.y, opened: !!c.opened };
}

export function sendEnemyList(floor) {
  if (!isHostActive()) return;
  const list = (state.enemies || []).map(serializeEnemy);
  netSend({ type: "enemies", floor, list });
}

export function sendChestList(floor) {
  if (!isHostActive()) return;
  const list = (state.chests || []).map(serializeChest);
  netSend({ type: "chests", floor, list });
}

// Track which enemies changed since last broadcast so deltas stay small.
const enemySnap = new Map(); // id -> last sent snapshot

function snapKey(e) {
  // Build a small fingerprint of fields that get rendered.
  return `${e.x},${e.y},${e.hp},${e.dying || 0},${(e.statuses || []).map((s) => `${s.kind}:${s.turns}:${s.power}`).join("|")}`;
}

export function broadcastEnemyDeltas() {
  if (!isHostActive()) return;
  const seen = new Set();
  for (const e of state.enemies) {
    seen.add(e.id);
    const key = snapKey(e);
    if (enemySnap.get(e.id) === key) continue;
    enemySnap.set(e.id, key);
    netSend({
      type: "enemy_delta",
      id: e.id,
      x: e.x, y: e.y,
      hp: e.hp,
      dying: e.dying || 0,
      statuses: (e.statuses || []).map((s) => ({ ...s }))
    });
  }
  // Removals — enemies that were in snap but not in current list anymore.
  for (const id of [...enemySnap.keys()]) {
    if (!seen.has(id)) {
      enemySnap.delete(id);
      netSend({ type: "enemy_remove", id });
    }
  }
}

export function clearEnemySnap() { enemySnap.clear(); }

// ---- Phase 2 combat: guest -> host mutation forwarding ----

// Guests forward raw mutations to the host so the host's authoritative
// state stays in sync after a guest action. The host's broadcastEnemyDeltas
// then replays the result to both clients.

export function syncRemoteDamage(enemyId, amount, school) {
  if (!isGuestActive()) return;
  netSend({ type: "remote_damage", id: enemyId, amount, school });
}
export function syncRemoteApplyStatus(enemyId, kind, turns, power) {
  if (!isGuestActive()) return;
  netSend({ type: "remote_apply_status", id: enemyId, kind, turns, power });
}
export function syncRemoteRemoveStatus(enemyId, kind) {
  if (!isGuestActive()) return;
  netSend({ type: "remote_remove_status", id: enemyId, kind });
}

// ---- Phase 2 combat: host -> guest damage delivery ----

export function deliverPlayerHitToGuest(dmg, byName, status) {
  if (!isHostActive()) return;
  netSend({ type: "playerHit", side: "guest", dmg, byName, status });
}

// ---- Phase 2 visual fx broadcast (host -> guest) ----

export function broadcastFxBurst(x, y, color, count) {
  if (!isHostActive()) return;
  netSend({ type: "fx_burst", x, y, color, count });
}
export function broadcastFxBeam(x1, y1, x2, y2, color) {
  if (!isHostActive()) return;
  netSend({ type: "fx_beam", x1, y1, x2, y2, color });
}
export function broadcastFxShake(amt) {
  if (!isHostActive()) return;
  netSend({ type: "fx_shake", amt });
}

// ---- Floor effects (host owns) ----
export function sendFloorEffects() {
  if (!isHostActive()) return;
  netSend({
    type: "floor_effects",
    list: (state.floorEffects || []).map((f) => ({ ...f }))
  });
}

// ---- Chest opening ----
// Guest tells host "I want to open chest X". Host marks it opened in its
// authoritative state and broadcasts chest_state. Loot still resolves
// locally on the opener (each player has their own inventory anyway).
export function syncOpenChest(chestId) {
  if (!isGuestActive()) return;
  netSend({ type: "input_open_chest", id: chestId });
}
export function broadcastChestOpened(chestId) {
  if (!isHostActive()) return;
  netSend({ type: "chest_state", id: chestId, opened: true });
}

// ---- Shop / town interactions ----
export function sendShopVisit(kind, entering) {
  if (!isMultiplayer()) return;
  netSend({ type: "shop_visit", kind, entering: !!entering });
}

// ---- Floor follow (co-op makes partner descend with you) ----
export function sendFollowFloor(floor) {
  if (!isMultiplayer()) return;
  netSend({ type: "follow_floor", floor });
}

// ---- PvP friendly fire ----
// Either side can melee the partner directly. Receiver applies the damage
// to its local player.
export function sendPvpHit(dmg, byName) {
  if (!isMultiplayer() || multi.mode !== "pvp") return;
  netSend({ type: "pvp_hit", dmg, byName });
}

// ---- Quest progress sharing (co-op only) ----
export function sendQuestKill(enemyType, floor) {
  if (!isMultiplayer() || multi.mode !== "coop") return;
  netSend({ type: "quest_kill", enemyType, floor });
}
export function sendQuestPickup(itemName) {
  if (!isMultiplayer() || multi.mode !== "coop") return;
  netSend({ type: "quest_pickup", itemName });
}
export function sendQuestDescend(floor) {
  if (!isMultiplayer() || multi.mode !== "coop") return;
  netSend({ type: "quest_descend", floor });
}
