import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { setMessage } from "../utils.js";
import { spawnBurst, applyStatus } from "../fx.js";

export const meta = {
  id: "mend",
  name: "Mend",
  school: "life",
  cost: 5,
  targeting: "self",
  range: 0,
  desc: "Instant heal + short regen."
};

export function effect(ctx) {
  const { rank, pow, chargeMul, critMul } = ctx;
  const heal = Math.floor((8 + pow + rank * 3) * chargeMul * critMul);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
  applyStatus(state.player, "regen", 2 + rank, 2 + Math.floor(pow / 2));
  spawnBurst(state.player.x, state.player.y, SCHOOL_COLORS.life, 14);
  setMessage(`Mend heals ${heal}.`);
  return { acted: true, offensive: false };
}
