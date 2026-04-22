import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { inBounds, setMessage } from "../utils.js";
import { spawnBurst, addFloorEffect } from "../fx.js";

export const meta = {
  id: "ember",
  name: "Ember Mine",
  school: "fire",
  cost: 5,
  targeting: "tile",
  range: 4,
  desc: "Place a mine. First foe trips it for a 3x3 burn."
};

export function effect(ctx) {
  const { tx, ty } = ctx;
  if (!inBounds(tx, ty) || state.map[ty][tx] === 1) {
    setMessage("Can't plant a mine there.");
    return { acted: false };
  }
  addFloorEffect(tx, ty, "mine", 20, 1);
  spawnBurst(tx, ty, SCHOOL_COLORS.fire, 10);
  setMessage("Ember Mine primed.");
  ctx.recordLast(tx, ty);
  return { acted: true, offensive: true };
}
