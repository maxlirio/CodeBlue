import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { inBounds, enemyAt, lineTiles, setMessage } from "../utils.js";
import { spawnBurst, spawnBeam, applyStatus, isWallBlocked } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";

export const meta = {
  id: "frost",
  name: "Frost Lance",
  school: "frost",
  cost: 6,
  targeting: "line",
  range: 8,
  desc: "Pierces all in a line. Chills. Shatters chilled."
};

export function effect(ctx) {
  const { tx, ty, baseDmg, spell } = ctx;
  const line = lineTiles(state.player.x, state.player.y, tx, ty).slice(1);
  let hit = 0;
  for (const tile of line) {
    if (!inBounds(tile.x, tile.y) || state.map[tile.y][tile.x] === 1 || isWallBlocked(tile.x, tile.y)) break;
    const enemy = enemyAt(tile.x, tile.y);
    if (enemy) {
      damageEnemy(enemy, baseDmg, spell.school);
      applyStatus(enemy, "chill", 3, 1);
      spawnBurst(enemy.x, enemy.y, SCHOOL_COLORS.frost, 8);
      hit++;
    }
  }
  spawnBeam(state.player.x, state.player.y, tx, ty, SCHOOL_COLORS.frost);
  clearDeadEnemies();
  if (!hit) { setMessage("Frost Lance glides past."); return { acted: false }; }
  setMessage(`Frost Lance pierces ${hit} foes.`);
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
