import { state } from "../state.js";
import { SCHOOL_COLORS } from "../config.js";
import { spawnBurst, doScreenShake } from "../fx.js";
import { setMessage } from "../utils.js";
import { strokeReticle } from "./_draw.js";
import { AUGMENT_BY_ID } from "../augments.js";
import { multi, sendPvpHit, sendPartnerSupport } from "../multi.js";

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
import * as shieldwall from "./shieldwall.js";
import * as cleave from "./cleave.js";
import * as warcry from "./warcry.js";
import * as arcanemissile from "./arcanemissile.js";
import * as glacialprison from "./glacialprison.js";
import * as firewall from "./firewall.js";
import * as huntersmark from "./huntersmark.js";
import * as trapwire from "./trapwire.js";
import * as vault from "./vault.js";
import * as venom from "./venom.js";
import * as haste from "./haste.js";
import * as stoneskin from "./stoneskin.js";
import * as regrow from "./regrow.js";
import * as icenova from "./icenova.js";
import * as lightningstorm from "./lightningstorm.js";
import * as phaseshift from "./phaseshift.js";
import * as ravenflight from "./ravenflight.js";
import * as sunbolt from "./sunbolt.js";
import * as curse from "./curse.js";
import * as rallystrike from "./rallystrike.js";
import * as smite from "./smite.js";
import * as deathcoil from "./deathcoil.js";
import * as hellfire from "./hellfire.js";
import * as shadowstrike from "./shadowstrike.js";
import * as volley from "./volley.js";
import * as entangle from "./entangle.js";
import * as enchantblade from "./enchantblade.js";

const MODULES = [
  bolt, chain, nova, ember, meteor, frost, pull, mend, drain, thorn, blink, echo,
  shieldwall, cleave, warcry,
  arcanemissile, glacialprison, firewall,
  huntersmark, trapwire, vault,
  venom, haste, stoneskin, regrow, icenova, lightningstorm,
  phaseshift, ravenflight, sunbolt, curse,
  rallystrike, smite, deathcoil, hellfire, shadowstrike, volley, entangle, enchantblade
];

const CLASS_THEMES = {
  // existing
  arcanemissile: ["Mage", "Warlock", "Necromancer"],
  blink:         ["Rogue", "Mage", "Warlock", "Ranger"],
  bolt:          ["Mage", "Warlock"],
  chain:         ["Mage", "Warlock", "Necromancer"],
  cleave:        ["Knight", "Paladin", "Ranger"],
  drain:         ["Necromancer", "Warlock"],
  echo:          ["Mage", "Warlock", "Rogue"],
  ember:         ["Mage", "Warlock"],
  firewall:      ["Mage", "Warlock"],
  frost:         ["Mage", "Druid"],
  glacialprison: ["Mage", "Druid"],
  huntersmark:   ["Ranger", "Rogue"],
  mend:          ["Paladin", "Druid", "Mage", "Necromancer"],
  meteor:        ["Mage", "Warlock"],
  nova:          ["Mage", "Warlock"],
  pull:          ["Mage", "Warlock", "Rogue"],
  shieldwall:    ["Knight", "Paladin"],
  thorn:         ["Druid", "Ranger"],
  trapwire:      ["Ranger", "Rogue"],
  vault:         ["Ranger", "Rogue"],
  warcry:        ["Knight", "Paladin"],
  // new batch 1
  venom:         ["Rogue", "Druid", "Necromancer", "Warlock"],
  haste:         ["Rogue", "Mage", "Druid", "Ranger"],
  stoneskin:     ["Knight", "Paladin", "Druid"],
  regrow:        ["Druid", "Paladin", "Mage"],
  icenova:       ["Mage", "Druid", "Warlock"],
  lightningstorm:["Mage", "Warlock"],
  phaseshift:    ["Mage", "Rogue", "Warlock"],
  ravenflight:   ["Mage", "Rogue", "Druid"],
  sunbolt:       ["Paladin", "Mage", "Warlock"],
  curse:         ["Warlock", "Necromancer", "Rogue"],
  // new batch 2 (class-specific)
  rallystrike:   ["Knight", "Paladin"],
  smite:         ["Paladin", "Knight"],
  deathcoil:     ["Necromancer", "Warlock"],
  hellfire:      ["Warlock", "Mage"],
  shadowstrike:  ["Rogue", "Ranger"],
  volley:        ["Ranger"],
  entangle:      ["Druid", "Ranger"],
  enchantblade:  ["Knight", "Paladin", "Warlock"]
};

export const SPELL_LIBRARY = MODULES.map((m) => ({ ...m.meta, themes: CLASS_THEMES[m.meta.id] || [] }));
export const SPELL_BY_ID = Object.fromEntries(SPELL_LIBRARY.map((s) => [s.id, s]));

export function isSpellForPlayer(spell) {
  if (!spell || !spell.themes || !spell.themes.length) return true;
  return spell.themes.includes(state.player.className);
}
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

function runEffectWithAugments(spell, ctx) {
  const effect = EFFECTS[spell.id];
  if (!effect) return { acted: false };
  const augs = (state.player.spellAugments && state.player.spellAugments[spell.id]) || [];

  // pre-effect flags
  const prevPiercing = state.castingPiercing;
  if (augs.includes("phase")) state.castingPiercing = true;

  // damage tracker for siphon
  const damageBefore = state.castingDamage || 0;
  state.castingDamage = damageBefore;

  const result = effect(ctx) || { acted: false };

  // post-effect augments (only on actual casts that did something)
  if (result.acted) {
    for (const augId of augs) {
      const aug = AUGMENT_BY_ID[augId];
      if (aug && typeof aug.apply === "function") aug.apply(spell, ctx);
    }
  }

  state.castingPiercing = prevPiercing;
  return result;
}

// Spells that, when aimed at the partner in MP, should benefit the partner
// instead of damaging anything. Each entry maps to a partner_support payload.
const SUPPORT_SPELLS = {
  mend:        { kind: "heal" },
  regrow:      { kind: "status", status: "regen", turns: 8, power: 2 },
  shieldwall:  { kind: "status", status: "ward",  turns: 6, power: 50 },
  warcry:      { kind: "status", status: "atk_buff", turns: 6, power: 3 }, // best-effort
  haste:       { kind: "status", status: "haste", turns: 6, power: 1 },
  stoneskin:   { kind: "status", status: "ward",  turns: 8, power: 30 },
  enchantblade:{ kind: "status", status: "enchantblade", turns: 8, power: 3 }
};

export function castSpell(spell, tx, ty, { charged = false, _echoLevel = 0 } = {}) {
  const chargeMul = charged ? 1.5 : 1;
  const rank = rankOf(spell.id);
  const pow = spellPowerNow();

  const aimedAtPartner =
    multi.enabled && multi.connected &&
    multi.partner && multi.partner.floor === state.floor &&
    multi.partner.x === tx && multi.partner.y === ty &&
    _echoLevel === 0;

  // Co-op: aiming a support spell at the partner heals/buffs them.
  if (aimedAtPartner && multi.mode === "coop" && SUPPORT_SPELLS[spell.id]) {
    const tmpl = SUPPORT_SPELLS[spell.id];
    spawnBurst(state.player.x, state.player.y, SCHOOL_COLORS[spell.school] || "#84f6a6", 6);
    spawnBurst(tx, ty, SCHOOL_COLORS[spell.school] || "#84f6a6", 14);
    if (tmpl.kind === "heal") {
      const amount = Math.floor((10 + pow + rank * 3) * chargeMul);
      sendPartnerSupport({ kind: "heal", amount });
      setMessage(`You channel ${spell.name} into ${multi.partner.name} (+${amount} HP).`);
    } else {
      sendPartnerSupport({ kind: "status", status: tmpl.status, turns: tmpl.turns, power: tmpl.power });
      setMessage(`You bless ${multi.partner.name} with ${spell.name}.`);
    }
    state.stats.spellsCast += 1;
    return { acted: true, offensive: false };
  }

  // PvP: aimed-target damage spells striking the partner deal pvp damage.
  if (aimedAtPartner && multi.mode === "pvp") {
    const isHealOrBuff = !!SUPPORT_SPELLS[spell.id];
    if (!isHealOrBuff) {
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
      spawnBurst(tx, ty, SCHOOL_COLORS[spell.school], 14);
      if (charged) doScreenShake(4);
      if (isCrit) doScreenShake(3);
      sendPvpHit(baseDmg, state.heroName || "your rival");
      setMessage(`${spell.name} ${isCrit ? "CRITS " : "strikes "}${multi.partner.name} for ${baseDmg}.`);
      state.stats.spellsCast += 1;
      return { acted: true, offensive: true };
    }
  }

  const roll = spellRoll();
  if (roll.kind === "fizzle") {
    setMessage(`${spell.name} fizzles. Half mana refunded.`);
    spawnBurst(state.player.x, state.player.y, "#666", 8);
    state.player.mana += Math.ceil(spell.cost * chargeMul * 0.5);
    return { acted: true, offensive: false };
  }

  const isCrit = roll.kind === "crit";
  const critMul = isCrit ? 1.7 : 1;
  const echoMul = _echoLevel > 0 ? 0.35 : 1;
  const baseDmg = Math.floor((7 + pow + rank * 2) * chargeMul * critMul * echoMul);

  spawnBurst(state.player.x, state.player.y, SCHOOL_COLORS[spell.school], 6 + (charged ? 8 : 0));
  if (charged) doScreenShake(4);
  if (isCrit) doScreenShake(3);

  if (_echoLevel === 0) state.castingDamage = 0;
  state.castingDepth = (state.castingDepth || 0) + 1;

  const ctx = {
    tx, ty, charged, chargeMul, rank, pow, isCrit, critMul, baseDmg, spell,
    recordLast: (x, y) => { state.player.lastOffensive = { id: spell.id, tx: x, ty: y }; },
    cast: castSpell,
    spellsById: SPELL_BY_ID
  };
  const result = runEffectWithAugments(spell, ctx);
  state.castingDepth -= 1;

  if (result.acted) state.stats.spellsCast += 1;

  // Echo augment: cast again at half power, but only at top level
  if (
    result.acted &&
    _echoLevel === 0 &&
    state.player.spellAugments &&
    (state.player.spellAugments[spell.id] || []).includes("echo")
  ) {
    castSpell(spell, tx, ty, { charged: false, _echoLevel: 1 });
  }
  return result;
}
