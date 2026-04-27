// Outbound sync — helpers that broadcast state from the host to the
// guest, plus a few "send anything" helpers that work in either role.
//
// Everything that puts bytes on the wire from the gameplay side comes
// through here. Inbound messages live in handlers.js.

import { state, ui } from "../state.js";
import { session } from "./session.js";
import { send as netSend } from "./transport.js";
import { M } from "./messages.js";
import { escapeHtml, appendChat } from "./chat.js";

// ---- presence ----

export function sendHello() {
  netSend({
    type: M.HELLO,
    name: state.heroName || "Wanderer",
    className: state.player.className || "?"
  });
}

export function sendReady() {
  session.ready = true;
  netSend({ type: M.READY });
}

export function sendSeed() {
  netSend({ type: M.SEED, seed: session.seed, mode: session.mode });
}

export function sendPosition() {
  if (!session.isMultiplayer()) return;
  netSend({
    type: M.POS,
    x: state.player.x,
    y: state.player.y,
    floor: state.floor,
    hp: state.player.hp,
    maxHp: state.player.maxHp
  });
}

export function sendFloor(floor) {
  if (!session.isMultiplayer()) return;
  netSend({ type: M.FLOOR, floor });
}

export function sendChat(text) {
  if (!session.isMultiplayer()) return;
  if (!text || !text.trim()) return;
  const t = text.trim().slice(0, 200);
  netSend({ type: M.CHAT, text: t });
  appendChat(state.heroName || "you", t, true);
}

// ---- world snapshots (host) ----

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

export function sendEnemyList(floor) {
  if (!session.isHostActive()) return;
  const list = (state.enemies || []).map(serializeEnemy);
  netSend({ type: M.ENEMIES, floor, list });
}

// Per-enemy fingerprint for delta deduplication.
const enemySnap = new Map();
function snapKey(e) {
  return `${e.x},${e.y},${e.hp},${e.dying || 0},${(e.statuses || []).map((s) => `${s.kind}:${s.turns}:${s.power}`).join("|")}`;
}

export function broadcastEnemyDeltas() {
  if (!session.isHostActive()) return;
  const seen = new Set();
  for (const e of state.enemies) {
    seen.add(e.id);
    const key = snapKey(e);
    if (enemySnap.get(e.id) === key) continue;
    enemySnap.set(e.id, key);
    netSend({
      type: M.ENEMY_DELTA,
      id: e.id,
      x: e.x, y: e.y,
      hp: e.hp,
      dying: e.dying || 0,
      statuses: (e.statuses || []).map((s) => ({ ...s }))
    });
  }
  for (const id of [...enemySnap.keys()]) {
    if (!seen.has(id)) {
      enemySnap.delete(id);
      netSend({ type: M.ENEMY_REMOVE, id });
    }
  }
}

export function clearEnemySnap() { enemySnap.clear(); }

export function sendFloorEffects() {
  if (!session.isHostActive()) return;
  netSend({
    type: M.FLOOR_EFFECTS,
    list: (state.floorEffects || []).map((f) => ({ ...f }))
  });
}

// ---- guest -> host mutations ----

export function syncRemoteDamage(enemyId, amount, school) {
  if (!session.isGuestActive()) return;
  netSend({ type: M.REMOTE_DAMAGE, id: enemyId, amount, school });
}

export function syncRemoteApplyStatus(enemyId, kind, turns, power) {
  if (!session.isGuestActive()) return;
  netSend({ type: M.REMOTE_APPLY_STATUS, id: enemyId, kind, turns, power });
}

export function syncRemoteRemoveStatus(enemyId, kind) {
  if (!session.isGuestActive()) return;
  netSend({ type: M.REMOTE_REMOVE_STATUS, id: enemyId, kind });
}

// ---- host -> guest player damage ----

export function deliverPlayerHitToGuest(dmg, byName, status) {
  if (!session.isHostActive()) return;
  netSend({ type: M.PLAYER_HIT, side: "guest", dmg, byName, status });
}

// ---- visual fx ----

export function broadcastFxBurst(x, y, color, count) {
  if (!session.isHostActive()) return;
  netSend({ type: M.FX_BURST, x, y, color, count });
}

export function broadcastFxBeam(x1, y1, x2, y2, color) {
  if (!session.isHostActive()) return;
  netSend({ type: M.FX_BEAM, x1, y1, x2, y2, color });
}

export function broadcastFxShake(amt) {
  if (!session.isHostActive()) return;
  netSend({ type: M.FX_SHAKE, amt });
}

// ---- gifting / shop / quests / partner support / pvp ----

export function sendGiftItem(item) {
  if (!session.isMultiplayer() || !item) return;
  netSend({
    type: M.GIFT_ITEM,
    item: {
      name: String(item.name || "Gift"),
      desc: String(item.desc || ""),
      kind: item.augmentId ? "scroll" : (item.questItem ? "quest" : "relic"),
      augmentId: item.augmentId || null,
      consumeOnUse: item.consumeOnUse !== false
    }
  });
}

export function sendShopVisit(kind, entering) {
  if (!session.isMultiplayer()) return;
  netSend({ type: M.SHOP_VISIT, kind, entering: !!entering });
}

export function sendPartnerSupport(payload) {
  if (!session.isMultiplayer()) return;
  netSend({ type: M.PARTNER_SUPPORT, ...payload });
}

export function sendPvpHit(dmg, byName) {
  if (!session.isMultiplayer() || !session.isPvp()) return;
  netSend({ type: M.PVP_HIT, dmg, byName });
}

export function sendPvpKill(victim, killer) {
  if (!session.isMultiplayer()) return;
  netSend({ type: M.PVP_KILL, victim, killer });
}

export function sendQuestKill(enemyType, floor) {
  if (!session.isMultiplayer() || !session.isCoop()) return;
  netSend({ type: M.QUEST_KILL, enemyType, floor });
}

export function sendQuestPickup(itemName) {
  if (!session.isMultiplayer() || !session.isCoop()) return;
  netSend({ type: M.QUEST_PICKUP, itemName });
}

export function sendQuestDescend(floor) {
  if (!session.isMultiplayer() || !session.isCoop()) return;
  netSend({ type: M.QUEST_DESCEND, floor });
}

// ---- diagnostics ----

export function sendPing() {
  if (!session.connected) return;
  netSend({ type: M.PING, t: performance.now() });
}

export function sendPong(t) { netSend({ type: M.PONG, t }); }

// ---- partner HUD card ----

export function updatePartnerCard() {
  if (!ui.partnerCard) return;
  if (!session.enabled || !session.partner.present) {
    ui.partnerCard.classList.add("hidden");
    return;
  }
  const p = session.partner;
  const sameFloor = p.floor === state.floor;
  const floorLabel = p.floor === 0 ? "Town" : `Floor ${p.floor}`;
  const hpPct = p.maxHp ? Math.max(0, Math.min(1, p.hp / p.maxHp)) : 0;
  const liveColor = session.partnerColor();
  ui.partnerCard.style.borderColor = liveColor;
  ui.partnerCard.classList.remove("hidden");
  const rtt = session.rttMs;
  let rttClass = "ping good", rttLabel = "—";
  if (rtt != null) {
    rttLabel = `${Math.round(rtt)}ms`;
    if (rtt < 100) rttClass = "ping good";
    else if (rtt < 250) rttClass = "ping warn";
    else rttClass = "ping err";
  }
  ui.partnerCard.innerHTML =
    `<div class="partner-name" style="color:${liveColor}">${escapeHtml(p.name)} <span class="partner-class">· ${escapeHtml(p.className)}</span></div>` +
    `<div class="partner-meta">${sameFloor ? "<b>here</b>" : floorLabel}${p.maxHp ? ` · HP ${p.hp}/${p.maxHp}` : ""}</div>` +
    `<div class="partner-hp"><div class="partner-hp-fill" style="width:${Math.round(hpPct * 100)}%; background:${liveColor}"></div></div>` +
    `<div class="partner-mode">${session.isPvp() ? "PvP" : "Co-op"}</div>` +
    `<div class="partner-ping ${rttClass}">${rttLabel}</div>`;
}
