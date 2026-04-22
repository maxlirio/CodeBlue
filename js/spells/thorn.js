import { state } from "../state.js";
import { SCHOOL_COLORS, tileSize } from "../config.js";
import { isWalkable, enemyAt, setMessage } from "../utils.js";
import { spawnBurst, addFloorEffect } from "../fx.js";
import { tileCenter, strokeTile, strokeReticle, strokeLinePx } from "./_draw.js";

export const meta = {
  id: "thorn",
  name: "Thornwall",
  school: "life",
  cost: 6,
  targeting: "wall",
  range: 4,
  desc: "Three root walls block foes 5+ turns."
};

function wallTilesFor(tx, ty) {
  const dxm = tx - state.player.x;
  const dym = ty - state.player.y;
  return Math.abs(dxm) >= Math.abs(dym)
    ? [{ x: tx, y: ty - 1 }, { x: tx, y: ty }, { x: tx, y: ty + 1 }]
    : [{ x: tx - 1, y: ty }, { x: tx, y: ty }, { x: tx + 1, y: ty }];
}

export function drawAim({ mx, my, charged }) {
  const tiles = wallTilesFor(mx, my);
  for (const t of tiles) {
    const valid = isWalkable(t.x, t.y) && !enemyAt(t.x, t.y) && !(state.player.x === t.x && state.player.y === t.y);
    strokeTile(t.x, t.y, valid ? SCHOOL_COLORS.life : "#5a2a2a", { inset: 4, width: 2, alpha: 0.8 });
  }
  strokeReticle(mx, my, charged);
}

const sprouts = [];

export function renderFx() {
  for (let i = sprouts.length - 1; i >= 0; i--) {
    const s = sprouts[i];
    const t = 1 - s.life / s.max;
    const base = s.cy + tileSize * 0.4;
    const tip = s.cy - tileSize * 0.4 * t;
    strokeLinePx(s.cx - 4, base, s.cx, tip, SCHOOL_COLORS.life, { width: 2, alpha: 1 - t * 0.5 });
    strokeLinePx(s.cx + 4, base, s.cx, tip, SCHOOL_COLORS.life, { width: 2, alpha: 1 - t * 0.5 });
    strokeLinePx(s.cx, base, s.cx, tip, "#84f6a6", { width: 3, alpha: 1 });
    s.life--;
    if (s.life <= 0) sprouts.splice(i, 1);
  }
}

export function effect(ctx) {
  const { tx, ty, rank } = ctx;
  const tiles = wallTilesFor(tx, ty);
  let placed = 0;
  for (const t of tiles) {
    if (isWalkable(t.x, t.y) && !enemyAt(t.x, t.y) && !(state.player.x === t.x && state.player.y === t.y)) {
      addFloorEffect(t.x, t.y, "wall", 5 + rank, 1);
      spawnBurst(t.x, t.y, SCHOOL_COLORS.life, 6);
      const c = tileCenter(t.x, t.y);
      sprouts.push({ cx: c.x, cy: c.y, life: 18, max: 18 });
      placed++;
    }
  }
  if (!placed) { setMessage("Nothing to root here."); return { acted: false }; }
  setMessage(`Thornwall roots ${placed} tiles.`);
  return { acted: true, offensive: false };
}
