import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { inBounds, enemyAt, lineTiles, setMessage } from "../utils.js";
import { spawnBeam, applyStatus, isWallBlocked } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";

export const meta = {
  id: "bolt",
  name: "Arc Bolt",
  school: "storm",
  cost: 4,
  targeting: "line",
  range: 9,
  desc: "Line strike. Shocks. R2 pierces. R3 stuns on crit."
};

export function effect(ctx) {
  const { tx, ty, rank, baseDmg, isCrit, spell } = ctx;
  const line = lineTiles(state.player.x, state.player.y, tx, ty).slice(1);
  const pierces = rank >= 2;
  let hit = false;
  for (const tile of line) {
    if (!inBounds(tile.x, tile.y) || state.map[tile.y][tile.x] === 1 || isWallBlocked(tile.x, tile.y)) break;
    const enemy = enemyAt(tile.x, tile.y);
    spawnBeam(state.player.x, state.player.y, tile.x, tile.y, SCHOOL_COLORS.storm);
    if (enemy) {
      const dealt = damageEnemy(enemy, baseDmg, spell.school);
      applyStatus(enemy, "shock", 2, 1);
      if (isCrit && rank >= 3) applyStatus(enemy, "stun", 1, 1);
      setMessage(`Arc Bolt hits ${enemy.name} for ${dealt}${isCrit ? " (crit!)" : ""}.`);
      hit = true;
      if (!pierces) break;
    }
  }
  clearDeadEnemies();
  if (!hit) { setMessage("Arc Bolt crackles into stone."); return { acted: false }; }
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
