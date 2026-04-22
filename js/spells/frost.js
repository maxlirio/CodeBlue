import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { inBounds, enemyAt, lineTiles, setMessage } from "../utils.js";
import { spawnBurst, applyStatus, isWallBlocked } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";
import {
  tileCenter, strokeTile, strokeReticle, strokeLinePx, fillCircle
} from "./_draw.js";

export const meta = {
  id: "frost",
  name: "Frost Lance",
  school: "frost",
  cost: 6,
  targeting: "line",
  range: 8,
  desc: "Pierces all in a line. Chills. Shatters chilled."
};

function projectedPath(mx, my) {
  const line = lineTiles(state.player.x, state.player.y, mx, my).slice(1);
  const path = [];
  for (const t of line) {
    if (!inBounds(t.x, t.y) || state.map[t.y][t.x] === 1 || isWallBlocked(t.x, t.y)) break;
    path.push(t);
  }
  return path;
}

export function drawAim({ mx, my, charged }) {
  const path = projectedPath(mx, my);
  const col = SCHOOL_COLORS.frost;
  for (const t of path) {
    strokeTile(t.x, t.y, col, { inset: 5, width: 1, alpha: 0.6 });
    if (enemyAt(t.x, t.y)) strokeTile(t.x, t.y, "#dff6ff", { inset: 2, width: 2, alpha: 0.9 });
  }
  strokeReticle(mx, my, charged);
}

const lances = [];

export function renderFx() {
  for (let i = lances.length - 1; i >= 0; i--) {
    const l = lances[i];
    const t = 1 - l.life / l.max;
    const cx = l.sx + (l.ex - l.sx) * t;
    const cy = l.sy + (l.ey - l.sy) * t;
    const tailT = Math.max(0, t - 0.4);
    const tx = l.sx + (l.ex - l.sx) * tailT;
    const ty = l.sy + (l.ey - l.sy) * tailT;
    strokeLinePx(tx, ty, cx, cy, "#dff6ff", { width: 4, alpha: 1 });
    strokeLinePx(tx, ty, cx, cy, SCHOOL_COLORS.frost, { width: 2, alpha: 0.8 });
    fillCircle(cx, cy, 3, "#ffffff", { alpha: 1 });
    l.life--;
    if (l.life <= 0) lances.splice(i, 1);
  }
}

export function effect(ctx) {
  const { tx, ty, baseDmg, spell } = ctx;
  const line = lineTiles(state.player.x, state.player.y, tx, ty).slice(1);
  let hit = 0;
  let endTile = { x: state.player.x, y: state.player.y };
  for (const tile of line) {
    if (!inBounds(tile.x, tile.y) || state.map[tile.y][tile.x] === 1 || isWallBlocked(tile.x, tile.y)) break;
    endTile = tile;
    const enemy = enemyAt(tile.x, tile.y);
    if (enemy) {
      damageEnemy(enemy, baseDmg, spell.school);
      applyStatus(enemy, "chill", 3, 1);
      spawnBurst(enemy.x, enemy.y, SCHOOL_COLORS.frost, 8);
      hit++;
    }
  }
  const a = tileCenter(state.player.x, state.player.y);
  const b = tileCenter(endTile.x, endTile.y);
  lances.push({ sx: a.x, sy: a.y, ex: b.x, ey: b.y, life: 14, max: 14 });
  clearDeadEnemies();
  if (!hit) { setMessage("Frost Lance glides past."); return { acted: false }; }
  setMessage(`Frost Lance pierces ${hit} foes.`);
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
