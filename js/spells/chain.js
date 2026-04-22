import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { distance, setMessage } from "../utils.js";
import { applyStatus } from "../fx.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";
import { tileCenter, strokePolyline, fillCircle, jaggedPoints } from "./_draw.js";

export const meta = {
  id: "chain",
  name: "Chain Spark",
  school: "storm",
  cost: 8,
  targeting: "self",
  range: 0,
  desc: "Hits 3/4/5 nearest foes, falloff. Shocks all."
};

const hops = [];

function addHop(from, to, delay) {
  const a = tileCenter(from.x, from.y);
  const b = tileCenter(to.x, to.y);
  hops.push({
    x1: a.x, y1: a.y, x2: b.x, y2: b.y,
    points: jaggedPoints(a.x, a.y, b.x, b.y, 3, 8),
    delay, life: 10, max: 10
  });
}

export function renderFx() {
  for (let i = hops.length - 1; i >= 0; i--) {
    const h = hops[i];
    if (h.delay > 0) { h.delay--; continue; }
    const t = h.life / h.max;
    if (h.life % 2 === 0) h.points = jaggedPoints(h.x1, h.y1, h.x2, h.y2, 3, 8);
    strokePolyline(h.points, "#ffffff", { width: 2.5, alpha: t });
    strokePolyline(h.points, SCHOOL_COLORS.storm, { width: 1, alpha: t });
    fillCircle(h.x2, h.y2, 6 * t, SCHOOL_COLORS.storm, { alpha: t * 0.7 });
    h.life--;
    if (h.life <= 0) hops.splice(i, 1);
  }
}

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
    addHop(prev, t, i * 4);
    prev = t;
  });
  clearDeadEnemies();
  setMessage(`Chain Spark arcs across ${targets.length} foes.`);
  ctx.recordLast(state.player.x, state.player.y);
  return { acted: true, offensive: true };
}
