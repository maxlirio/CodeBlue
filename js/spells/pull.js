import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { isWalkable, enemyAt, setMessage } from "../utils.js";
import { spawnBeam, applyStatus, isWallBlocked } from "../fx.js";

export const meta = {
  id: "pull",
  name: "Tide Pull",
  school: "frost",
  cost: 5,
  targeting: "aim",
  range: 8,
  desc: "Yank a foe 3 tiles toward you. Chills."
};

export function effect(ctx) {
  const { tx, ty } = ctx;
  const enemy = enemyAt(tx, ty);
  if (!enemy) { setMessage("No target to pull."); return { acted: false }; }
  for (let i = 0; i < 3; i++) {
    const dxm = Math.abs(state.player.x - enemy.x);
    const dym = Math.abs(state.player.y - enemy.y);
    let nx = enemy.x, ny = enemy.y;
    if (dxm >= dym) nx += Math.sign(state.player.x - enemy.x);
    else ny += Math.sign(state.player.y - enemy.y);
    if ((nx === state.player.x && ny === state.player.y) || !isWalkable(nx, ny) || enemyAt(nx, ny) || isWallBlocked(nx, ny)) break;
    enemy.x = nx; enemy.y = ny;
  }
  applyStatus(enemy, "chill", 2, 1);
  spawnBeam(state.player.x, state.player.y, enemy.x, enemy.y, SCHOOL_COLORS.frost);
  setMessage(`Tide Pull drags ${enemy.name} in.`);
  ctx.recordLast(enemy.x, enemy.y);
  return { acted: true, offensive: true };
}
