import { state } from "../state.js";
import { SCHOOL_COLORS, tileSize } from "../config.js";
import { setMessage } from "../utils.js";
import { tileCenter, strokeCircle } from "./_draw.js";

export const meta = {
  id: "echo",
  name: "Echo",
  school: "arcane",
  cost: 3,
  targeting: "self",
  range: 0,
  desc: "Recast your last offensive spell at half cost."
};

const ripples = [];

export function renderFx() {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const t = 1 - r.life / r.max;
    const c = tileCenter(state.player.x, state.player.y);
    strokeCircle(c.x, c.y, tileSize * 0.3 + t * tileSize * 1.2, SCHOOL_COLORS.arcane, { width: 2, alpha: 1 - t });
    r.life--;
    if (r.life <= 0) ripples.splice(i, 1);
  }
}

export function effect(ctx) {
  const last = state.player.lastOffensive;
  const prev = last && ctx.spellsById[last.id];
  if (!prev) { setMessage("No spell to echo."); return { acted: false }; }
  ripples.push({ life: 18, max: 18 });
  ripples.push({ life: 22, max: 22 });
  setMessage(`Echo: ${prev.name}.`);
  return ctx.cast(prev, last.tx, last.ty, { charged: ctx.charged });
}
