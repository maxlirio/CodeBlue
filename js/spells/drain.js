import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { distance, setMessage } from "../utils.js";
import { damageEnemy, clearDeadEnemies } from "../combat.js";
import { tileCenter, strokeLinePx, fillCircle } from "./_draw.js";

export const meta = {
  id: "drain",
  name: "Vampire Touch",
  school: "life",
  cost: 4,
  targeting: "adjacent",
  range: 1,
  desc: "Strike adjacent foes, heal for 60% dealt."
};

const tethers = [];

export function renderFx() {
  for (let i = tethers.length - 1; i >= 0; i--) {
    const t = tethers[i];
    const p = tileCenter(state.player.x, state.player.y);
    const k = 1 - t.life / t.max;
    const cx = t.sx + (p.x - t.sx) * k;
    const cy = t.sy + (p.y - t.sy) * k;
    strokeLinePx(t.sx, t.sy, cx, cy, "#c4255b", { width: 3, alpha: 1 - k });
    strokeLinePx(t.sx, t.sy, cx, cy, SCHOOL_COLORS.life, { width: 1, alpha: (1 - k) * 0.8 });
    fillCircle(cx, cy, 3 + k * 2, SCHOOL_COLORS.life, { alpha: 1 - k });
    t.life--;
    if (t.life <= 0) tethers.splice(i, 1);
  }
}

export function effect(ctx) {
  const { baseDmg, spell } = ctx;
  const near = state.enemies.filter((e) => distance(e, state.player) <= 1);
  if (!near.length) { setMessage("No adjacent foes to drain."); return { acted: false }; }
  let total = 0;
  for (const e of near) {
    total += damageEnemy(e, baseDmg, spell.school);
    const c = tileCenter(e.x, e.y);
    tethers.push({ sx: c.x, sy: c.y, life: 14, max: 14 });
  }
  const heal = Math.floor(total * 0.6);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
  clearDeadEnemies();
  setMessage(`Vampire Touch: ${total} dmg, heal ${heal}.`);
  ctx.recordLast(state.player.x, state.player.y);
  return { acted: true, offensive: true };
}
