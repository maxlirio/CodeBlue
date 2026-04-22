import { state } from "../state.js";
import { inBounds, enemyAt, setMessage } from "../utils.js";
import { spawnBurst, doScreenShake, applyStatus, addFloorEffect } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";

export const meta = {
  id: "meteor",
  name: "Meteor",
  school: "fire",
  cost: 11,
  targeting: "tile",
  range: 8,
  desc: "Massive crater, heavy burn tiles."
};

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
  doScreenShake(12);
  clearDeadEnemies();
  setMessage(`Meteor craters ${hit} foes!`);
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
