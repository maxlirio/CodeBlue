import { state } from "../state.js";
import { SCHOOL_COLORS, tileSize } from "../config.js";
import { setMessage } from "../utils.js";
import { applyStatus } from "../fx.js";
import { tileCenter, strokeCircle, fillCircle } from "./_draw.js";

export const meta = {
  id: "mend",
  name: "Mend",
  school: "life",
  cost: 5,
  targeting: "self",
  range: 0,
  desc: "Instant heal + short regen."
};

const motes = [];
const halos = [];

export function renderFx() {
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.angle += 0.18;
    m.rise += 0.8;
    const c = tileCenter(state.player.x, state.player.y);
    const px = c.x + Math.cos(m.angle) * m.radius;
    const py = c.y + Math.sin(m.angle) * m.radius - m.rise;
    const t = m.life / m.max;
    fillCircle(px, py, 2.5, SCHOOL_COLORS.life, { alpha: t });
    fillCircle(px, py, 1, "#ffffff", { alpha: t });
    m.life--;
    if (m.life <= 0) motes.splice(i, 1);
  }
  for (let i = halos.length - 1; i >= 0; i--) {
    const h = halos[i];
    const t = 1 - h.life / h.max;
    const c = tileCenter(state.player.x, state.player.y);
    strokeCircle(c.x, c.y, tileSize * 0.5 + t * tileSize * 0.4, SCHOOL_COLORS.life, { width: 2, alpha: 1 - t });
    h.life--;
    if (h.life <= 0) halos.splice(i, 1);
  }
}

export function effect(ctx) {
  const { rank, pow, chargeMul, critMul } = ctx;
  const heal = Math.floor((8 + pow + rank * 3) * chargeMul * critMul);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
  applyStatus(state.player, "regen", 2 + rank, 2 + Math.floor(pow / 2));
  halos.push({ life: 22, max: 22 });
  for (let i = 0; i < 14; i++) {
    motes.push({
      angle: Math.random() * Math.PI * 2,
      radius: tileSize * (0.3 + Math.random() * 0.3),
      rise: Math.random() * 4,
      life: 24 + Math.floor(Math.random() * 10),
      max: 30
    });
  }
  setMessage(`Mend heals ${heal}.`);
  return { acted: true, offensive: false };
}
