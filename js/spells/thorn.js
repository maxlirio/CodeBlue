import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { isWalkable, enemyAt, setMessage } from "../utils.js";
import { spawnBurst, addFloorEffect } from "../fx.js";

export const meta = {
  id: "thorn",
  name: "Thornwall",
  school: "life",
  cost: 6,
  targeting: "wall",
  range: 4,
  desc: "Three root walls block foes 5+ turns."
};

export function effect(ctx) {
  const { tx, ty, rank } = ctx;
  const dxm = tx - state.player.x;
  const dym = ty - state.player.y;
  const tiles = Math.abs(dxm) >= Math.abs(dym)
    ? [{ x: tx, y: ty - 1 }, { x: tx, y: ty }, { x: tx, y: ty + 1 }]
    : [{ x: tx - 1, y: ty }, { x: tx, y: ty }, { x: tx + 1, y: ty }];
  let placed = 0;
  for (const t of tiles) {
    if (isWalkable(t.x, t.y) && !enemyAt(t.x, t.y) && !(state.player.x === t.x && state.player.y === t.y)) {
      addFloorEffect(t.x, t.y, "wall", 5 + rank, 1);
      spawnBurst(t.x, t.y, SCHOOL_COLORS.life, 6);
      placed++;
    }
  }
  if (!placed) { setMessage("Nothing to root here."); return { acted: false }; }
  setMessage(`Thornwall roots ${placed} tiles.`);
  return { acted: true, offensive: false };
}
