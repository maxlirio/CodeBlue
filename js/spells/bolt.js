import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { inBounds, enemyAt, lineTiles, setMessage } from "../utils.js";
import { spawnBeam, applyStatus, isWallBlocked } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";
import {
  tileCenter, strokeTile, strokeReticle, strokePolyline, fillCircle, jaggedPoints
} from "./_draw.js";

export const meta = {
  id: "bolt",
  name: "Arc Bolt",
  school: "storm",
  cost: 4,
  targeting: "line",
  range: 9,
  desc: "Line strike. Shocks. R2 pierces. R3 stuns on crit."
};

function rankOf() {
  return (state.player.spellRanks && state.player.spellRanks.bolt) || 1;
}

function projectedPath(mx, my) {
  const line = lineTiles(state.player.x, state.player.y, mx, my).slice(1);
  const pierces = rankOf() >= 2;
  const path = [];
  for (const t of line) {
    if (!inBounds(t.x, t.y) || state.map[t.y][t.x] === 1 || isWallBlocked(t.x, t.y)) break;
    path.push(t);
    const e = enemyAt(t.x, t.y);
    if (e && !pierces) break;
  }
  return path;
}

export function drawAim({ mx, my, charged }) {
  const path = projectedPath(mx, my);
  const col = SCHOOL_COLORS.storm;
  for (const t of path) {
    const hasEnemy = !!enemyAt(t.x, t.y);
    strokeTile(t.x, t.y, col, { inset: 6, width: 1, alpha: 0.7 });
    if (hasEnemy) strokeTile(t.x, t.y, col, { inset: 2, width: 2, alpha: 0.9 });
  }
  strokeReticle(mx, my, charged);
}

const strikes = [];

export function renderFx() {
  for (let i = strikes.length - 1; i >= 0; i--) {
    const s = strikes[i];
    const t = s.life / s.max;
    if (s.life % 3 === 0) {
      s.points = jaggedPoints(s.x1, s.y1, s.x2, s.y2, 5, 10);
    }
    strokePolyline(s.points, "#ffffff", { width: 3, alpha: t });
    strokePolyline(s.points, SCHOOL_COLORS.storm, { width: 1.5, alpha: t * 0.9 });
    if (s.flash) fillCircle(s.x2, s.y2, 10 * t, "#ffffff", { alpha: t * 0.6 });
    s.life--;
    if (s.life <= 0) strikes.splice(i, 1);
  }
}

function addStrike(fromTile, toTile, flash = true) {
  const a = tileCenter(fromTile.x, fromTile.y);
  const b = tileCenter(toTile.x, toTile.y);
  strikes.push({
    x1: a.x, y1: a.y, x2: b.x, y2: b.y,
    points: jaggedPoints(a.x, a.y, b.x, b.y, 5, 10),
    life: 12, max: 12, flash
  });
}

export function effect(ctx) {
  const { tx, ty, rank, baseDmg, isCrit, spell } = ctx;
  const line = lineTiles(state.player.x, state.player.y, tx, ty).slice(1);
  const pierces = rank >= 2;
  let hit = false;
  let prev = state.player;
  for (const tile of line) {
    if (!inBounds(tile.x, tile.y) || state.map[tile.y][tile.x] === 1 || isWallBlocked(tile.x, tile.y)) break;
    const enemy = enemyAt(tile.x, tile.y);
    spawnBeam(prev.x, prev.y, tile.x, tile.y, SCHOOL_COLORS.storm);
    if (enemy) {
      addStrike(prev, tile, true);
      const dealt = damageEnemy(enemy, baseDmg, spell.school);
      applyStatus(enemy, "shock", 2, 1);
      if (isCrit && rank >= 3) applyStatus(enemy, "stun", 1, 1);
      setMessage(`Arc Bolt hits ${enemy.name} for ${dealt}${isCrit ? " (crit!)" : ""}.`);
      hit = true;
      prev = tile;
      if (!pierces) break;
    }
  }
  clearDeadEnemies();
  if (!hit) { setMessage("Arc Bolt crackles into stone."); return { acted: false }; }
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
