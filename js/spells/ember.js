import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { inBounds, setMessage } from "../utils.js";
import { spawnBurst, addFloorEffect } from "../fx.js";
import { tileCenter, strokeTile, strokeReticle, fillCircle } from "./_draw.js";

export const meta = {
  id: "ember",
  name: "Ember Mine",
  school: "fire",
  cost: 5,
  targeting: "tile",
  range: 4,
  desc: "Place a mine. First foe trips it for a 3x3 burn."
};

export function drawAim({ mx, my, charged }) {
  const valid = inBounds(mx, my) && state.map[my][mx] !== 1;
  strokeTile(mx, my, valid ? SCHOOL_COLORS.fire : "#7a3030", { inset: 4, width: 2, alpha: 0.8 });
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 160);
  const c = tileCenter(mx, my);
  fillCircle(c.x, c.y, 3 + pulse * 2, "#ff9e4f", { alpha: 0.7 });
  strokeReticle(mx, my, charged);
}

const pops = [];

export function renderFx() {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    const t = 1 - p.life / p.max;
    fillCircle(p.cx, p.cy, 4 + t * 10, SCHOOL_COLORS.fire, { alpha: (1 - t) * 0.6 });
    p.life--;
    if (p.life <= 0) pops.splice(i, 1);
  }
}

export function effect(ctx) {
  const { tx, ty } = ctx;
  if (!inBounds(tx, ty) || state.map[ty][tx] === 1) {
    setMessage("Can't plant a mine there.");
    return { acted: false };
  }
  addFloorEffect(tx, ty, "mine", 20, 1);
  spawnBurst(tx, ty, SCHOOL_COLORS.fire, 10);
  const c = tileCenter(tx, ty);
  pops.push({ cx: c.x, cy: c.y, life: 14, max: 14 });
  setMessage("Ember Mine primed.");
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
