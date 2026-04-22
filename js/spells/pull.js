import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { isWalkable, enemyAt, setMessage } from "../utils.js";
import { applyStatus, isWallBlocked } from "../fx.js";
import {
  tileCenter, strokeTile, strokeReticle, strokeLinePx, fillCircle
} from "./_draw.js";

export const meta = {
  id: "pull",
  name: "Tide Pull",
  school: "frost",
  cost: 5,
  targeting: "aim",
  range: 8,
  desc: "Yank a foe 3 tiles toward you. Chills."
};

function projectedLanding(enemy) {
  let ex = enemy.x, ey = enemy.y;
  for (let i = 0; i < 3; i++) {
    const dxm = Math.abs(state.player.x - ex);
    const dym = Math.abs(state.player.y - ey);
    let nx = ex, ny = ey;
    if (dxm >= dym) nx += Math.sign(state.player.x - ex);
    else ny += Math.sign(state.player.y - ey);
    if ((nx === state.player.x && ny === state.player.y) || !isWalkable(nx, ny) || enemyAt(nx, ny) || isWallBlocked(nx, ny)) break;
    ex = nx; ey = ny;
  }
  return { x: ex, y: ey };
}

export function drawAim({ mx, my, charged }) {
  const enemy = enemyAt(mx, my);
  if (enemy) {
    const land = projectedLanding(enemy);
    strokeTile(enemy.x, enemy.y, "#dff6ff", { inset: 2, width: 2, alpha: 0.9 });
    if (land.x !== enemy.x || land.y !== enemy.y) {
      strokeTile(land.x, land.y, SCHOOL_COLORS.frost, { inset: 4, width: 2, alpha: 0.7 });
      const a = tileCenter(enemy.x, enemy.y);
      const b = tileCenter(land.x, land.y);
      strokeLinePx(a.x, a.y, b.x, b.y, SCHOOL_COLORS.frost, { width: 1.5, alpha: 0.5 });
    }
  }
  const p = tileCenter(state.player.x, state.player.y);
  const m = tileCenter(mx, my);
  strokeLinePx(p.x, p.y, m.x, m.y, SCHOOL_COLORS.frost, { width: 1, alpha: 0.35 });
  strokeReticle(mx, my, charged);
}

const whips = [];

export function renderFx() {
  for (let i = whips.length - 1; i >= 0; i--) {
    const w = whips[i];
    const t = 1 - w.life / w.max;
    const cx = w.sx + (w.ex - w.sx) * (1 - t);
    const cy = w.sy + (w.ey - w.sy) * (1 - t);
    const p = tileCenter(state.player.x, state.player.y);
    strokeLinePx(p.x, p.y, cx, cy, "#dff6ff", { width: 3, alpha: 1 - t });
    strokeLinePx(p.x, p.y, cx, cy, SCHOOL_COLORS.frost, { width: 1.5, alpha: (1 - t) * 0.9 });
    fillCircle(cx, cy, 4, "#ffffff", { alpha: 1 - t });
    w.life--;
    if (w.life <= 0) whips.splice(i, 1);
  }
}

export function effect(ctx) {
  const { tx, ty } = ctx;
  const enemy = enemyAt(tx, ty);
  if (!enemy) { setMessage("No target to pull."); return { acted: false }; }
  const start = tileCenter(enemy.x, enemy.y);
  for (let i = 0; i < 3; i++) {
    const dxm = Math.abs(state.player.x - enemy.x);
    const dym = Math.abs(state.player.y - enemy.y);
    let nx = enemy.x, ny = enemy.y;
    if (dxm >= dym) nx += Math.sign(state.player.x - enemy.x);
    else ny += Math.sign(state.player.y - enemy.y);
    if ((nx === state.player.x && ny === state.player.y) || !isWalkable(nx, ny) || enemyAt(nx, ny) || isWallBlocked(nx, ny)) break;
    enemy.x = nx; enemy.y = ny;
  }
  applyStatus(enemy, "chill", 2, 1);
  const end = tileCenter(enemy.x, enemy.y);
  whips.push({ sx: start.x, sy: start.y, ex: end.x, ey: end.y, life: 12, max: 12 });
  setMessage(`Tide Pull drags ${enemy.name} in.`);
  ctx.recordLast(enemy.x, enemy.y);
  return { acted: true, offensive: true };
}
