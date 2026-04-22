import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { inBounds, enemyAt, setMessage } from "../utils.js";
import { spawnBurst, doScreenShake, isWallBlocked } from "../fx.js";

export const meta = {
  id: "blink",
  name: "Blink",
  school: "arcane",
  cost: 4,
  targeting: "teleport",
  range: 6,
  desc: "Teleport to a visible tile."
};

export function effect(ctx) {
  const { tx, ty } = ctx;
  if (!inBounds(tx, ty) || state.map[ty][tx] === 1 || enemyAt(tx, ty) || isWallBlocked(tx, ty)) {
    setMessage("Can't blink there.");
    return { acted: false };
  }
  spawnBurst(state.player.x, state.player.y, SCHOOL_COLORS.arcane, 12);
  state.player.x = tx;
  state.player.y = ty;
  spawnBurst(tx, ty, SCHOOL_COLORS.arcane, 14);
  doScreenShake(3);
  setMessage("You blink.");
  return { acted: true, offensive: false };
}
