import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { distance, setMessage } from "../utils.js";
import { spawnBeam, applyStatus } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";

export const meta = {
  id: "chain",
  name: "Chain Spark",
  school: "storm",
  cost: 8,
  targeting: "self",
  range: 0,
  desc: "Hits 3/4/5 nearest foes, falloff. Shocks all."
};

export function effect(ctx) {
  const { rank, baseDmg, spell } = ctx;
  const n = 3 + (rank - 1);
  const targets = state.enemies
    .map((e) => ({ e, d: distance(e, state.player) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((v) => v.e);
  if (!targets.length) { setMessage("No targets for Chain Spark."); return { acted: false }; }
  let prev = state.player;
  targets.forEach((t, i) => {
    const dmg = Math.floor(baseDmg * Math.pow(0.8, i));
    damageEnemy(t, dmg, spell.school);
    applyStatus(t, "shock", 2, 1);
    spawnBeam(prev.x, prev.y, t.x, t.y, SCHOOL_COLORS.storm);
    prev = t;
  });
  clearDeadEnemies();
  setMessage(`Chain Spark arcs across ${targets.length} foes.`);
  ctx.recordLast(state.player.x, state.player.y);
  return { acted: true, offensive: true };
}
