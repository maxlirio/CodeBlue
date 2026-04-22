import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { inBounds, enemyAt, setMessage } from "../utils.js";
import { spawnBurst, doScreenShake, applyStatus, addFloorEffect } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";

export const meta = {
  id: "nova",
  name: "Flame Nova",
  school: "fire",
  cost: 7,
  targeting: "tile",
  range: 5,
  desc: "AoE blast at a tile. Leaves burn floor."
};

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
  doScreenShake(6);
  clearDeadEnemies();
  setMessage(`Flame Nova scorches ${hit} foes.`);
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
