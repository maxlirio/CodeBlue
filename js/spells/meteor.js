import { state } from "../state.js";
import { SCHOOL_COLORS, tileSize } from "../config.js";
import { inBounds, enemyAt, setMessage } from "../utils.js";
import { spawnBurst, doScreenShake, applyStatus, addFloorEffect } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";
import {
  tileCenter, strokeTile, strokeReticle, strokeCircle, strokeLinePx, fillCircle
} from "./_draw.js";

export const meta = {
  id: "meteor",
  name: "Meteor",
  school: "fire",
  cost: 11,
  targeting: "tile",
  range: 8,
  desc: "Massive crater, heavy burn tiles."
};

function rankOf() {
  return (state.player.spellRanks && state.player.spellRanks.meteor) || 1;
}

export function drawAim({ mx, my, charged }) {
  const r = rankOf() >= 2 ? 2 : 1;
  for (let yy = my - r; yy <= my + r; yy++) {
    for (let xx = mx - r; xx <= mx + r; xx++) {
      if (!inBounds(xx, yy) || state.map[yy][xx] === 1) continue;
      const dist = Math.max(Math.abs(xx - mx), Math.abs(yy - my));
      strokeTile(xx, yy, "#ff4a22", { inset: 4, width: 1, alpha: 0.7 - dist * 0.15 });
    }
  }
  strokeReticle(mx, my, charged);
}

const meteors = [];

export function renderFx() {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    if (m.phase === "fall") {
      const t = 1 - m.life / m.max;
      const cx = m.sx + (m.ex - m.sx) * t;
      const cy = m.sy + (m.ey - m.sy) * t;
      strokeLinePx(m.sx + (m.ex - m.sx) * Math.max(0, t - 0.2), m.sy + (m.ey - m.sy) * Math.max(0, t - 0.2), cx, cy, "#ffb26b", { width: 4, alpha: 0.9 });
      fillCircle(cx, cy, 5 + t * 3, "#ff4a22", { alpha: 1 });
      fillCircle(cx, cy, 3, "#ffee88", { alpha: 1 });
      m.life--;
      if (m.life <= 0) { m.phase = "crater"; m.life = 20; m.max = 20; }
    } else {
      const t = 1 - m.life / m.max;
      strokeCircle(m.ex, m.ey, m.maxRadius * t, "#ff4a22", { width: 4, alpha: 1 - t });
      strokeCircle(m.ex, m.ey, m.maxRadius * t * 0.6, "#ffd166", { width: 2, alpha: (1 - t) * 0.8 });
      m.life--;
      if (m.life <= 0) meteors.splice(i, 1);
    }
  }
}

export function effect(ctx) {
  const { tx, ty, rank, baseDmg, spell } = ctx;
  const radius = rank >= 2 ? 2 : 1;
  const dmg = Math.floor(baseDmg * 1.4);
  let hit = 0;
  for (let yy = ty - radius; yy <= ty + radius; yy++) {
    for (let xx = tx - radius; xx <= tx + radius; xx++) {
      if (!inBounds(xx, yy) || state.map[yy][xx] === 1) continue;
      addFloorEffect(xx, yy, "burn", 4, 3);
      spawnBurst(xx, yy, "#ff4a22", 10);
      const e = enemyAt(xx, yy);
      if (e) { damageEnemy(e, dmg, spell.school); applyStatus(e, "burn", 4, 3); hit++; }
    }
  }
  const c = tileCenter(tx, ty);
  meteors.push({
    phase: "fall",
    sx: c.x + tileSize * 6, sy: c.y - tileSize * 10,
    ex: c.x, ey: c.y,
    maxRadius: (radius + 1) * tileSize,
    life: 14, max: 14
  });
  doScreenShake(12);
  clearDeadEnemies();
  setMessage(`Meteor craters ${hit} foes!`);
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
