// Inbound message dispatcher. Every wire message has exactly one
// handler here. Subsystems never read raw messages — they import
// helpers from sync.js (outbound) or just observe session.* (state).
//
// Each handler is small enough to grep for, and the dispatch map at the
// bottom is the canonical "what messages does the protocol carry?"
// cheat-sheet.

import { state } from "../state.js";
import { setMessage } from "../utils.js";
import { setSeed } from "../rng.js";
import { session } from "./session.js";
import { M, isKnownType } from "./messages.js";
import {
  sendEnemyList, clearEnemySnap, sendPong, sendPvpKill,
  sendSnapshotRequest, updatePartnerCard
} from "./sync.js";

// Rate-limit guest's auto-resync so it can't flood the host even if every
// delta in a tick misses. One request per ~600ms is plenty.
let lastSnapshotReqAt = 0;
function maybeRequestSnapshot() {
  const now = performance.now();
  if (now - lastSnapshotReqAt < 600) return;
  lastSnapshotReqAt = now;
  sendSnapshotRequest();
}

// Look up an enemy by id on a specific floor. Used when a guest's
// remote_* mutation arrives — the host may not be on that floor, so we
// have to reach into the floorCache rather than the live state.enemies
// view.
function findEnemyOnFloor(floor, id) {
  const f = Number(floor);
  const ctx = state.floorCache[f];
  const list = ctx ? ctx.enemies : (f === state.floor ? state.enemies : null);
  if (!list) return null;
  return list.find((x) => x.id === id) || null;
}
import { appendChat, escapeHtml } from "./chat.js";

// ---- helpers ----

function applyPlayerHitLocal(amount) {
  const ward = state.player.statuses && state.player.statuses.find((s) => s.kind === "ward");
  const reduced = ward ? Math.max(1, Math.floor(amount * (1 - ward.power / 100))) : amount;
  state.player.hp -= reduced;
  return reduced;
}

// Lazy-imports — fx.js and quests.js have heavy deps; keep handlers cheap.
function fxBurst(x, y, color, count) {
  import("../fx.js").then(({ spawnBurst }) => spawnBurst(x, y, color, count || 8));
}
function fxBeam(x1, y1, x2, y2, color) {
  import("../fx.js").then(({ spawnBeam }) => spawnBeam(x1, y1, x2, y2, color));
}
function fxShake(amt) {
  import("../fx.js").then(({ doScreenShake }) => doScreenShake(Number(amt) || 4));
}

// ---- individual handlers ----

const HANDLERS = {
  [M.HELLO](msg) {
    const p = session.partner;
    if (typeof msg.name === "string")      p.name = msg.name.slice(0, 32);
    if (typeof msg.className === "string") p.className = msg.className.slice(0, 24);
    p.present = true;
    appendChat("system", `${p.name} the ${p.className} joined.`, false);
  },

  [M.SEED](msg) {
    session.seed = String(msg.seed || "");
    session.mode = msg.mode === "pvp" ? "pvp" : "coop";
    if (session.seed) {
      setSeed(session.seed);
      state.seed = session.seed;
    }
    appendChat("system", `Seed shared. Mode: ${session.mode.toUpperCase()}.`, false);
  },

  [M.READY](_msg) {
    session.partnerReady = true;
    appendChat("system", `${session.partner.name || "Partner"} is ready.`, false);
    if (typeof session._onReadyGate === "function") session._onReadyGate();
  },

  [M.POS](msg) {
    const p = session.partner;
    p.x = Number(msg.x) | 0;
    p.y = Number(msg.y) | 0;
    p.floor = Number(msg.floor) | 0;
    p.hp = Number(msg.hp) | 0;
    p.maxHp = Number(msg.maxHp) | 0;
    p.present = true;
  },

  [M.FLOOR](msg) {
    const p = session.partner;
    p.floor = Number(msg.floor) | 0;
    p.present = true;
    appendChat("system", `${p.name} is on floor ${p.floor === 0 ? "Town" : p.floor}.`, false);
    // Host: send the partner the authoritative enemy list for the floor
    // they just landed on. Now that the host simulates every active
    // floor, ctx exists whether or not we're standing on it ourselves.
    if (session.isHost() && p.floor > 0) {
      const ctx = state.floorCache[p.floor];
      if (ctx) {
        clearEnemySnap(p.floor);
        sendEnemyList(p.floor, ctx.enemies);
      }
    }
  },

  [M.CHAT](msg) {
    appendChat(session.partner.name || "Partner", String(msg.text || "").slice(0, 200), false);
  },

  [M.ENEMIES](msg) {
    if (Number(msg.floor) !== state.floor) return;
    // Replace the contents in place so state.enemies remains the same
    // array as state.floorCache[currentFloor].enemies. This keeps the
    // pre-generated cache and the live view consistent.
    state.enemies.length = 0;
    for (const e of (msg.list || [])) {
      state.enemies.push({
        ...e,
        statuses: (e.statuses || []).map((s) => ({ ...s })),
        actTimer: 0
      });
    }
  },

  [M.ENEMY_DELTA](msg) {
    // Drop deltas for floors we aren't on — they were broadcast for the
    // host's current floor, which may not be ours.
    if (msg.floor !== undefined && Number(msg.floor) !== state.floor) return;
    const e = state.enemies.find((x) => x.id === msg.id);
    if (!e) {
      // Delta for an enemy we don't know about, but for our floor — we
      // missed the snapshot. Ask the host to resend.
      if (session.isGuestActive()) maybeRequestSnapshot();
      return;
    }
    if (msg.x !== undefined)     e.x = msg.x;
    if (msg.y !== undefined)     e.y = msg.y;
    if (msg.hp !== undefined)    e.hp = msg.hp;
    if (msg.dying !== undefined) e.dying = msg.dying;
    if (Array.isArray(msg.statuses)) e.statuses = msg.statuses.map((s) => ({ ...s }));
  },

  [M.ENEMY_REMOVE](msg) {
    if (msg.floor !== undefined && Number(msg.floor) !== state.floor) return;
    const idx = state.enemies.findIndex((x) => x.id === msg.id);
    if (idx >= 0) state.enemies.splice(idx, 1);
  },

  [M.FLOOR_EFFECTS](msg) {
    if (!session.isGuest()) return;
    if (msg.floor !== undefined && Number(msg.floor) !== state.floor) return;
    state.floorEffects.length = 0;
    for (const f of (msg.list || [])) state.floorEffects.push({ ...f });
  },

  [M.SNAPSHOT_REQ](msg) {
    if (!session.isHost()) return;
    const reqFloor = Number(msg.floor);
    if (!Number.isFinite(reqFloor) || reqFloor <= 0) return;
    const ctx = state.floorCache[reqFloor];
    if (!ctx) return;
    clearEnemySnap(reqFloor);
    sendEnemyList(reqFloor, ctx.enemies);
  },

  [M.REMOTE_DAMAGE](msg) {
    if (!session.isHost()) return;
    const e = findEnemyOnFloor(msg.floor, msg.id);
    if (!e) return;
    e.hp -= Math.max(0, Number(msg.amount) || 0);
    if (e.hp <= 0 && !e.rewardsGranted) {
      e.rewardsGranted = true;
      e.dying = e.dying || 18;
    }
  },

  [M.REMOTE_APPLY_STATUS](msg) {
    if (!session.isHost()) return;
    const e = findEnemyOnFloor(msg.floor, msg.id);
    if (!e) return;
    const cur = (e.statuses ||= []).find((s) => s.kind === msg.kind);
    if (cur) {
      cur.turns = Math.max(cur.turns, Number(msg.turns) || 0);
      cur.power = Math.max(cur.power, Number(msg.power) || 1);
    } else {
      e.statuses.push({ kind: msg.kind, turns: Number(msg.turns) || 1, power: Number(msg.power) || 1 });
    }
  },

  [M.REMOTE_REMOVE_STATUS](msg) {
    if (!session.isHost()) return;
    const e = findEnemyOnFloor(msg.floor, msg.id);
    if (e && e.statuses) e.statuses = e.statuses.filter((s) => s.kind !== msg.kind);
  },

  [M.PLAYER_HIT](msg) {
    if (!session.isGuest()) return;
    const reduced = applyPlayerHitLocal(Number(msg.dmg) || 0);
    if (msg.byName) state.lastHitBy = String(msg.byName);
    if (msg.status) {
      const cur = state.player.statuses.find((s) => s.kind === msg.status);
      if (cur) cur.turns = Math.max(cur.turns, 4);
      else state.player.statuses.push({ kind: msg.status, turns: 4, power: 1 });
    }
    setMessage(`${msg.byName || "An enemy"} hits you for ${reduced}.`);
  },

  [M.PARTNER_SUPPORT](msg) {
    const partnerName = session.partner.name || "Partner";
    if (msg.kind === "heal") {
      const amt = Math.max(0, Number(msg.amount) || 0);
      const before = state.player.hp;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + amt);
      setMessage(`${partnerName} heals you for ${state.player.hp - before}.`);
    } else if (msg.kind === "status") {
      const kind = String(msg.status || "");
      const turns = Math.max(1, Number(msg.turns) || 4);
      const power = Math.max(1, Number(msg.power) || 1);
      if (!state.player.statuses) state.player.statuses = [];
      const cur = state.player.statuses.find((s) => s.kind === kind);
      if (cur) { cur.turns = Math.max(cur.turns, turns); cur.power = Math.max(cur.power, power); }
      else state.player.statuses.push({ kind, turns, power });
      setMessage(`${partnerName} buffs you with ${kind}.`);
    }
  },

  [M.PVP_HIT](msg) {
    if (!session.isPvp()) return;
    const reduced = applyPlayerHitLocal(Number(msg.dmg) || 0);
    state.lastHitBy = String(msg.byName || (session.partner.name || "Partner"));
    setMessage(`${state.lastHitBy} hits you for ${reduced}.`);
    if (state.player.hp <= 0) {
      state.player.hp = 0;
      sendPvpKill(state.heroName || "you", state.lastHitBy);
    }
  },

  [M.PVP_KILL](msg) {
    const banner = document.createElement("div");
    banner.className = "pvp-kill-banner";
    banner.innerHTML = `<strong>${escapeHtml(msg.victim)}</strong> felled by <strong>${escapeHtml(msg.killer)}</strong>`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);
  },

  [M.PLAYER_DIED](msg) {
    if (state.over) return;
    const partnerName = session.partner.name || "Partner";
    const cause = String(msg.cause || "fallen");
    import("../turn.js").then(({ endRun }) => {
      endRun(`${partnerName} fell — ${cause}`);
    });
  },

  [M.GIFT_ITEM](msg) {
    const inv = state.player.inventory;
    const partnerName = session.partner.name || "Partner";
    if (inv.length >= 6) {
      appendChat("system", `${partnerName} tried to gift you ${msg.item?.name || "an item"}, but your bag is full.`, false);
      return;
    }
    const fallback = {
      name: String(msg.item?.name || "Gift"),
      desc: String(msg.item?.desc || ""),
      consumeOnUse: msg.item?.consumeOnUse !== false,
      use() { setMessage(`${this.name} has no power here. (Gifted from ${partnerName}.)`); }
    };
    if (msg.item?.kind === "scroll" && msg.item.augmentId) {
      import("../augments.js").then(({ makeMagicScroll }) => {
        const rebuilt = makeMagicScroll(msg.item.augmentId) || fallback;
        inv.push(rebuilt);
        appendChat("system", `${partnerName} gifted you ${rebuilt.name}.`, false);
        setMessage(`${partnerName} gifted you ${rebuilt.name}.`);
      }).catch(() => {
        inv.push(fallback);
        appendChat("system", `${partnerName} gifted you ${fallback.name}.`, false);
      });
    } else {
      inv.push(fallback);
      appendChat("system", `${partnerName} gifted you ${fallback.name}.`, false);
      setMessage(`${partnerName} gifted you ${fallback.name}.`);
    }
  },

  [M.SHOP_VISIT](msg) {
    const name = session.partner.name || "Partner";
    const shop = String(msg.kind || "").replace(/^./, (c) => c.toUpperCase());
    appendChat("system", msg.entering ? `${name} entered the ${shop}.` : `${name} left the ${shop}.`, false);
  },

  [M.QUEST_KILL](msg) {
    if (!session.isCoop()) return;
    import("../quests.js").then(({ recordEnemyKill }) => recordEnemyKill(msg.enemyType, msg.floor));
  },

  [M.QUEST_PICKUP](msg) {
    if (!session.isCoop()) return;
    import("../quests.js").then(({ recordItemPickup }) => recordItemPickup(msg.itemName));
  },

  [M.QUEST_DESCEND](msg) {
    if (!session.isCoop()) return;
    import("../quests.js").then(({ recordDescend }) => recordDescend(Number(msg.floor) || 0));
  },

  [M.FX_BURST](msg) {
    if (msg.floor !== undefined && Number(msg.floor) !== state.floor) return;
    fxBurst(msg.x, msg.y, msg.color, msg.count);
  },
  [M.FX_BEAM](msg) {
    if (msg.floor !== undefined && Number(msg.floor) !== state.floor) return;
    fxBeam(msg.x1, msg.y1, msg.x2, msg.y2, msg.color);
  },
  [M.FX_SHAKE](msg) {
    if (msg.floor !== undefined && Number(msg.floor) !== state.floor) return;
    fxShake(msg.amt);
  },

  [M.PING](msg) { sendPong(msg.t); },
  [M.PONG](msg) {
    const sentAt = Number(msg.t) || 0;
    if (sentAt > 0) {
      session.rttMs = Math.max(0, performance.now() - sentAt);
      updatePartnerCard();
    }
  }
};

// Returns true if the partner card should be refreshed after this message
// (i.e., the message changed something the card displays). Pure UI msgs
// (chat, fx, ping) skip the refresh.
const REFRESH_CARD_ON = new Set([M.HELLO, M.SEED, M.READY, M.POS, M.FLOOR]);

export function dispatch(msg) {
  if (!msg || typeof msg !== "object") return;
  const handler = HANDLERS[msg.type];
  if (!handler) {
    if (!isKnownType(msg.type)) console.warn("net: unknown message type", msg.type);
    return;
  }
  handler(msg);
  if (REFRESH_CARD_ON.has(msg.type)) updatePartnerCard();
}
