import { state } from "../state.js";
import { setMessage } from "../utils.js";

export const meta = {
  id: "echo",
  name: "Echo",
  school: "arcane",
  cost: 3,
  targeting: "self",
  range: 0,
  desc: "Recast your last offensive spell at half cost."
};

export function effect(ctx) {
  const last = state.player.lastOffensive;
  const prev = last && ctx.spellsById[last.id];
  if (!prev) { setMessage("No spell to echo."); return { acted: false }; }
  setMessage(`Echo: ${prev.name}.`);
  return ctx.cast(prev, last.tx, last.ty, { charged: ctx.charged });
}
