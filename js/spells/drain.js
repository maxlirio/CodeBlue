import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { distance, setMessage } from "../utils.js";
import { spawnBurst } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";

export const meta = {
  id: "drain",
  name: "Vampire Touch",
  school: "life",
  cost: 4,
  targeting: "adjacent",
  range: 1,
  desc: "Strike adjacent foes, heal for 60% dealt."
};

export function effect(ctx) {
  const { baseDmg, spell } = ctx;
  const near = state.enemies.filter((e) => distance(e, state.player) <= 1);
  if (!near.length) { setMessage("No adjacent foes to drain."); return { acted: false }; }
  let total = 0;
  for (const e of near) {
    total += damageEnemy(e, baseDmg, spell.school);
    spawnBurst(e.x, e.y, SCHOOL_COLORS.life, 8);
  }
  const heal = Math.floor(total * 0.6);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
  clearDeadEnemies();
  setMessage(`Vampire Touch: ${total} dmg, heal ${heal}.`);
  ctx.recordLast(state.player.x, state.player.y);
  return { acted: true, offensive: true };
}
