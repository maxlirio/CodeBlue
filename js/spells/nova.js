import { state } from "../state.js";
import { SCHOOL_COLORS, tileSize } from "../config.js";
import { inBounds, enemyAt, setMessage } from "../utils.js";
import { spawnBurst, doScreenShake, applyStatus, addFloorEffect } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";
import {
  tileCenter, strokeTile, strokeReticle, strokeCircle, fillCircle
} from "./_draw.js";

export const meta = {
  id: "nova",
  name: "Flame Nova",
  school: "fire",
  cost: 7,
  targeting: "tile",
  range: 5,
  desc: "AoE blast at a tile. Leaves burn floor."
};

function rankOf() {
  return (state.player.spellRanks && state.player.spellRanks.nova) || 1;
}

export function drawAim({ mx, my, charged }) {
  const r = rankOf() >= 3 ? 2 : 1;
  for (let yy = my - r; yy <= my + r; yy++) {
    for (let xx = mx - r; xx <= mx + r; xx++) {
      if (!inBounds(xx, yy) || state.map[yy][xx] === 1) continue;
      strokeTile(xx, yy, SCHOOL_COLORS.fire, { inset: 4, width: 1, alpha: 0.6 });
    }
  }
  strokeReticle(mx, my, charged);
}

const rings = [];

export function renderFx() {
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    const t = 1 - r.life / r.max;
    const rad = r.maxRadius * t;
    strokeCircle(r.cx, r.cy, rad, r.color, { width: 3, alpha: 1 - t });
    strokeCircle(r.cx, r.cy, rad * 0.7, "#ffffff", { width: 1.5, alpha: (1 - t) * 0.7 });
    if (r.life === r.max) fillCircle(r.cx, r.cy, r.maxRadius * 0.25, "#fff2c2", { alpha: 0.9 });
    r.life--;
    if (r.life <= 0) rings.splice(i, 1);
  }
}

export function effect(ctx) {
  const { tx, ty, rank, pow, baseDmg, spell } = ctx;
  const radius = rank >= 3 ? 2 : 1;
  let hit = 0;
  for (let yy = ty - radius; yy <= ty + radius; yy++) {
    for (let xx = tx - radius; xx <= tx + radius; xx++) {
      if (!inBounds(xx, yy) || state.map[yy][xx] === 1) continue;
      addFloorEffect(xx, yy, "burn", 3, 2 + Math.floor(pow / 3));
      const e = enemyAt(xx, yy);
      if (e) { damageEnemy(e, baseDmg, spell.school); applyStatus(e, "burn", 3, 2); hit++; }
      spawnBurst(xx, yy, SCHOOL_COLORS.fire, 6);
    }
  }
  const c = tileCenter(tx, ty);
  rings.push({
    cx: c.x, cy: c.y, maxRadius: (radius + 0.8) * tileSize,
    color: SCHOOL_COLORS.fire, life: 18, max: 18
  });
  doScreenShake(6);
  clearDeadEnemies();
  setMessage(`Flame Nova scorches ${hit} foes.`);
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
