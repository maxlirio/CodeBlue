import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { spawnBurst, doScreenShake } from "../fx.js";
import { setMessage } from "../utils.js";
import { strokeReticle } from "./_draw.js";

import * as bolt from "./bolt.js";
import * as chain from "./chain.js";
import * as nova from "./nova.js";
import * as ember from "./ember.js";
import * as meteor from "./meteor.js";
import * as frost from "./frost.js";
import * as pull from "./pull.js";
import * as mend from "./mend.js";
import * as drain from "./drain.js";
import * as thorn from "./thorn.js";
import * as blink from "./blink.js";
import * as echo from "./echo.js";

const MODULES = [bolt, chain, nova, ember, meteor, frost, pull, mend, drain, thorn, blink, echo];

export const SPELL_LIBRARY = MODULES.map((m) => m.meta);
export const SPELL_BY_ID = Object.fromEntries(SPELL_LIBRARY.map((s) => [s.id, s]));
const EFFECTS = Object.fromEntries(MODULES.map((m) => [m.meta.id, m.effect]));
const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.meta.id, m]));

export function renderSpellAim() {
  if (!state.aimMode || !state.mouseTile) return;
  const spell = state.aimMode.spell;
  const mod = spell && MODULE_BY_ID[spell.id];
  const { x: mx, y: my } = state.mouseTile;
  if (mod && typeof mod.drawAim === "function") {
    mod.drawAim({ mx, my, charged: state.aimMode.charged });
  } else {
    strokeReticle(mx, my, state.aimMode.charged);
  }
}

export function renderAllSpellFx() {
  for (const m of MODULES) if (typeof m.renderFx === "function") m.renderFx();
}

export function rankOf(id) {
  return (state.player.spellRanks && state.player.spellRanks[id]) || 1;
}

export function spellPowerNow() {
  return state.player.spellPower + Math.floor(state.floor / 4);
}

export function spellRoll() {
  const r = Math.random();
  if (r < 0.08) return { kind: "fizzle", mult: 0 };
  if (r > 0.88) return { kind: "crit",   mult: 1.7 };
  return             { kind: "hit",    mult: 1 };
}

export function spendSpellMana(spell, charged) {
  const cost = Math.ceil(spell.cost * (charged ? 1.5 : 1));
  state.player.mana -= cost;
  return cost;
}

export function castSpell(spell, tx, ty, { charged = false } = {}) {
  const chargeMul = charged ? 1.5 : 1;
  const rank = rankOf(spell.id);
  const pow = spellPowerNow();

  const roll = spellRoll();
  if (roll.kind === "fizzle") {
    setMessage(`${spell.name} fizzles. Half mana refunded.`);
    spawnBurst(state.player.x, state.player.y, "#666", 8);
    state.player.mana += Math.ceil(spell.cost * chargeMul * 0.5);
    return { acted: true, offensive: false };
  }

  const isCrit = roll.kind === "crit";
  const critMul = isCrit ? 1.7 : 1;
  const baseDmg = Math.floor((7 + pow + rank * 2) * chargeMul * critMul);

  spawnBurst(state.player.x, state.player.y, SCHOOL_COLORS[spell.school], 6 + (charged ? 8 : 0));
  if (charged) doScreenShake(4);
  if (isCrit) doScreenShake(3);

  const effect = EFFECTS[spell.id];
  if (!effect) return { acted: false };

  const ctx = {
    tx, ty, charged, chargeMul, rank, pow, isCrit, critMul, baseDmg, spell,
    recordLast: (x, y) => { state.player.lastOffensive = { id: spell.id, tx: x, ty: y }; },
    cast: castSpell,
    spellsById: SPELL_BY_ID
  };
  const result = effect(ctx) || { acted: false };
  if (result.acted) state.stats.spellsCast += 1;
  return result;
}
