// Session — the authority model for multiplayer.
//
// Every gameplay subsystem (enemy AI, combat, render, spells, input, turn)
// asks the session three kinds of questions:
//
//   "Who is playing?"        session.players()
//   "Can I harm this thing?" session.canHarm(target)
//   "Should I simulate?"     session.simulationPaused() / session.isHostActive()
//
// The session is the only place that reads role/mode/partner directly.
// Everything else routes through the methods below. This is the layer
// that used to leak as `if (multi.enabled && multi.connected && ...)`
// across 30+ callsites.

import { state, ui } from "../state.js";

const PARTNER_COLORS = { coop: "#7bdff2", pvp: "#ff7a82" };

// Always have a partner object, even before connection. Subsystems can
// safely read partner.x / partner.floor without null checks; they get
// nonsense values until partner.present flips true. Combined with
// session.partnerHere() / session.alivePartner() this kills the
// `if (multi.partner && multi.partner.floor === state.floor)` ritual.
function makeBlankPartner() {
  return {
    name: "Partner",
    className: "Knight",
    x: -1, y: -1, floor: -1,
    hp: 0, maxHp: 0,
    alive: true,
    present: false
  };
}

export const session = {
  // ---- raw state (read-only outside this file) ----
  enabled: false,
  connected: false,
  role: "solo",      // "solo" | "host" | "guest"
  mode: "coop",      // "coop" | "pvp"
  seed: null,
  ready: false,
  partnerReady: false,
  partner: makeBlankPartner(),
  rttMs: null,

  // ---- queries about "who is playing" ----

  isMultiplayer() { return this.enabled && this.connected; },
  isSolo()        { return !this.enabled; },
  isHost()        { return this.role === "host"; },
  isGuest()       { return this.role === "guest"; },
  // Active = "this client should run authoritative simulation work".
  isHostActive()  { return this.enabled && this.connected && this.role === "host"; },
  isGuestActive() { return this.enabled && this.connected && this.role === "guest"; },

  isCoop() { return this.mode === "coop"; },
  isPvp()  { return this.mode === "pvp"; },

  // ---- queries about the partner ----

  // Partner exists, is connected, and is on the same floor as the local player.
  partnerHere() {
    return this.isMultiplayer()
        && this.partner.present
        && this.partner.floor === state.floor;
  },

  // Partner present + on same floor + alive. Anywhere code does
  // "treat partner as a target" should go through this.
  alivePartner() {
    return this.partnerHere() && this.partner.alive ? this.partner : null;
  },

  partnerAt(x, y) {
    return this.partnerHere()
        && this.partner.x === x
        && this.partner.y === y;
  },

  // The list of friendly avatars on this floor. Enemy AI iterates this
  // instead of hard-coding [state.player, partner] with conditional
  // checks. In solo, returns just the local player.
  players() {
    const out = [state.player];
    const p = this.alivePartner();
    if (p) out.push(p);
    return out;
  },

  // Pick the closest player to a given position. Replaces pickTarget()
  // in protocols.js — no more inline `multi.partner ?` checks.
  closestPlayer(from) {
    const ps = this.players();
    let best = ps[0];
    let bestDist = Infinity;
    for (const p of ps) {
      const d = Math.abs(p.x - from.x) + Math.abs(p.y - from.y);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  },

  // Is the given target the (remote) partner? Used by enemy AI to route
  // damage through the network instead of applying locally.
  isPartner(target) {
    return target === this.partner && this.partner.present;
  },

  // ---- authority ----

  // Can this client legally damage `target`? In solo, anything goes.
  // In coop, never the partner. In pvp, anyone but yourself.
  canHarm(target) {
    if (target === state.player) return false;
    if (this.isPartner(target)) return this.isPvp();
    return true; // enemies
  },

  // Should the world tick advance? Hard pauses (death / cutscene / not
  // started / awaiting shop) always pause. Local UI overlays only pause
  // for solo and guest — the host must keep simulating so the guest's
  // world stays alive.
  simulationPaused() {
    if (state.over) return true;
    if (!state.started) return true;
    if (state.awaitingShop) return true;
    if (ui.cutsceneOverlay && !ui.cutsceneOverlay.classList.contains("hidden")) return true;
    if (this.isHostActive()) return false;
    if (state.backpackOpen) return true;
    if (state.aimMode) return true;
    if (state.tutorialOpen) return true;
    if (state.chestOpen) return true;
    if (state.discardOpen) return true;
    if (state.applyOpen) return true;
    if (ui.questCompleteOverlay && !ui.questCompleteOverlay.classList.contains("hidden")) return true;
    return false;
  },

  // ---- presentation ----

  partnerColor() { return PARTNER_COLORS[this.mode] || PARTNER_COLORS.coop; },

  // ---- lifecycle (only callers: handlers.js + multi.js shim) ----

  startHost() {
    this._reset();
    this.enabled = true;
    this.role = "host";
  },

  startGuest() {
    this._reset();
    this.enabled = true;
    this.role = "guest";
  },

  end() {
    this._reset();
  },

  _reset() {
    this.enabled = false;
    this.connected = false;
    this.role = "solo";
    this.mode = "coop";
    this.seed = null;
    this.ready = false;
    this.partnerReady = false;
    this.partner = makeBlankPartner();
    this.rttMs = null;
  }
};

// Back-compat alias. Old call sites import `multi` from multi.js. The
// shim re-exports this object as `multi`, so reading multi.partner.x
// keeps working — but new code should reach for session.* methods.
export { session as multi };
