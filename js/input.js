import { state, ui, canvas } from "./state.js";
import { tileSize } from "./config.js";
import { setMessage, inBounds } from "./utils.js";
import { SPELL_BY_ID, castSpell, spendSpellMana } from "./spells/index.js";
import { rangedAttackAt } from "./combat.js";
import { tryMove, enemyTurn, useRelic } from "./turn.js";
import { renderBackpack } from "./backpack.js";
import { resolveBossAction } from "./boss.js";
import { closeShop } from "./shop.js";

const MOVE_KEYS = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0]
};

const HOTKEYS = new Set([
  "arrowup", "arrowdown", "arrowleft", "arrowright",
  "w", "a", "s", "d", " ",
  "z", "x", "c", "v", "f", "n", "b",
  "1", "2", "3", "4", "5", "6", "escape"
]);

function castFromSlot(k, e) {
  const slotId = state.player.spellSlots[k];
  const spell = slotId && state.player.knownSpells.has(slotId) ? SPELL_BY_ID[slotId] : null;
  if (!spell) {
    setMessage(`Slot ${k.toUpperCase()} is empty. Open backpack (B) to assign.`);
    return;
  }
  const charged = e.shiftKey;
  const cost = Math.ceil(spell.cost * (charged ? 1.5 : 1));
  if (spell.targeting === "self" || spell.targeting === "adjacent") {
    if (state.player.mana < cost) { setMessage("Not enough mana."); return; }
    const res = castSpell(spell, state.player.x, state.player.y, { charged });
    if (res.acted) { spendSpellMana(spell, charged); enemyTurn(); }
  } else {
    state.aimMode = { kind: "spell", spell, name: spell.name, charged };
    setMessage(`${charged ? "CHARGED " : ""}Aiming ${spell.name}. Click tile${charged ? "" : " (hold Shift = charged)"}.`);
  }
}

function toggleBackpack() {
  state.backpackOpen = !state.backpackOpen;
  if (state.backpackOpen) {
    renderBackpack();
    ui.backpackOverlay.classList.remove("hidden");
  } else {
    ui.backpackOverlay.classList.add("hidden");
  }
}

function toggleAi() {
  state.aiEnabled = !state.aiEnabled;
  if (state.aiEnabled && !localStorage.getItem("pixelRogueOpenAIKey")) {
    const keyInput = prompt("Enter OpenAI API key for narration (saved in localStorage):");
    if (keyInput) localStorage.setItem("pixelRogueOpenAIKey", keyInput.trim());
  }
  setMessage(`AI narration ${state.aiEnabled ? "enabled" : "disabled"}.`);
}

function onKeyDown(e) {
  if (document.activeElement === ui.bossInput && e.key !== "Escape") return;
  const k = e.key.toLowerCase();
  if (HOTKEYS.has(k)) e.preventDefault();
  if (state.bossBattle && k !== "escape") return;

  if (MOVE_KEYS[k]) { tryMove(...MOVE_KEYS[k]); return; }

  if (["z", "x", "c", "v"].includes(k)) castFromSlot(k, e);

  if (k === "f") {
    if (state.player.weaponType === "bow") {
      state.aimMode = { kind: "ranged", name: "Bow Shot" };
      setMessage("Aiming bow shot. Click a tile.");
    } else {
      setMessage("Equip a bow to fire arrows.");
    }
  }

  if (k === "n") toggleAi();

  if (k === "b" && state.started && !state.bossBattle) toggleBackpack();

  if (k === "escape") {
    state.aimMode = null;
    state.backpackOpen = false;
    ui.backpackOverlay.classList.add("hidden");
  }

  if (["1", "2", "3", "4", "5", "6"].includes(k)) useRelic(Number(k) - 1);

  if (k === " " && state.started && !state.awaitingShop && !state.bossBattle) {
    setMessage("You wait and gather focus.");
    enemyTurn();
  }
}

function onMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const tx = Math.floor(((e.clientX - rect.left) * sx) / tileSize);
  const ty = Math.floor(((e.clientY - rect.top) * sy) / tileSize);
  if (inBounds(tx, ty)) state.mouseTile = { x: tx, y: ty };
}

function onCanvasClick(e) {
  if (!state.aimMode || !state.mouseTile || state.awaitingShop || !state.started || state.over || state.bossBattle) return;
  let acted = false;
  if (state.aimMode.kind === "ranged") {
    acted = rangedAttackAt(state.mouseTile.x, state.mouseTile.y);
  } else if (state.aimMode.kind === "spell") {
    const spell = state.aimMode.spell;
    const charged = state.aimMode.charged || e.shiftKey;
    const cost = Math.ceil(spell.cost * (charged ? 1.5 : 1));
    if (state.player.mana < cost) {
      setMessage("Not enough mana.");
      state.aimMode = null;
      return;
    }
    const dist = Math.abs(state.mouseTile.x - state.player.x) + Math.abs(state.mouseTile.y - state.player.y);
    if (spell.range && dist > spell.range) {
      setMessage(`${spell.name}: target out of range (${spell.range}).`);
      state.aimMode = null;
      return;
    }
    const res = castSpell(spell, state.mouseTile.x, state.mouseTile.y, { charged });
    acted = !!res.acted;
    if (acted) spendSpellMana(spell, charged);
  }
  state.aimMode = null;
  if (acted) enemyTurn();
}

export function attachInput() {
  window.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("click", onCanvasClick);
  ui.leaveShop.addEventListener("click", closeShop);
  ui.bossSubmit.addEventListener("click", () => resolveBossAction(ui.bossInput.value));
  ui.bossInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") resolveBossAction(ui.bossInput.value);
  });
}
