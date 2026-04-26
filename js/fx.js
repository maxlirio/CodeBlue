import { tileSize } from "./config.js";
import { state } from "./state.js";
import { inBounds, rnd } from "./utils.js";
import {
  isHostActive, isGuestActive,
  broadcastFxBurst, broadcastFxBeam, broadcastFxShake,
  syncRemoteApplyStatus, syncRemoteRemoveStatus
} from "./multi.js";

export function spawnBurst(x, y, color, count = 10, opts = {}) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: x * tileSize + tileSize / 2,
      y: y * tileSize + tileSize / 2,
      vx: (Math.random() - 0.5) * 2.6,
      vy: (Math.random() - 0.5) * 2.6,
      life: rnd(14, 22),
      color
    });
  }
  if (!opts.noBroadcast && isHostActive()) broadcastFxBurst(x, y, color, count);
}

export function spawnBeam(x1, y1, x2, y2, color, opts = {}) {
  const sx = x1 * tileSize + tileSize / 2;
  const sy = y1 * tileSize + tileSize / 2;
  const ex = x2 * tileSize + tileSize / 2;
  const ey = y2 * tileSize + tileSize / 2;
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    state.particles.push({
      x: sx + (ex - sx) * t,
      y: sy + (ey - sy) * t,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      life: rnd(6, 12),
      color
    });
  }
  if (!opts.noBroadcast && isHostActive()) broadcastFxBeam(x1, y1, x2, y2, color);
}

export function doScreenShake(n) {
  state.screenShake = Math.max(state.screenShake || 0, n);
  if (isHostActive()) broadcastFxShake(n);
}

export function hasStatus(t, kind) { return t.statuses && t.statuses.some((s) => s.kind === kind); }

export function applyStatus(t, kind, turns, power = 1) {
  if (!t.statuses) t.statuses = [];
  const cur = t.statuses.find((s) => s.kind === kind);
  if (cur) { cur.turns = Math.max(cur.turns, turns); cur.power = Math.max(cur.power, power); }
  else t.statuses.push({ kind, turns, power });
  // Forward enemy-status mutations to host so its authoritative copy
  // matches. Player statuses don't sync — each player owns their own.
  if (isGuestActive() && t.id !== undefined) syncRemoteApplyStatus(t.id, kind, turns, power);
}

export function removeStatus(t, kind) {
  if (t.statuses) t.statuses = t.statuses.filter((s) => s.kind !== kind);
  if (isGuestActive() && t.id !== undefined) syncRemoteRemoveStatus(t.id, kind);
}

export function addFloorEffect(x, y, kind, turns, power = 1) {
  if (!inBounds(x, y)) return;
  if (kind !== "wall" && state.map[y][x] === 1) return;
  const same = state.floorEffects.find((f) => f.x === x && f.y === y && f.kind === kind);
  if (same) { same.turns = Math.max(same.turns, turns); same.power = Math.max(same.power, power); return; }
  state.floorEffects.push({ x, y, kind, turns, power });
}

export function floorHas(x, y, kind) {
  return state.floorEffects.some((f) => f.x === x && f.y === y && f.kind === kind && f.turns > 0);
}

export function isWallBlocked(x, y) { return floorHas(x, y, "wall"); }
