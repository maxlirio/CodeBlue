import { state, ui, canvas } from "./state.js";
import { tileSize } from "./config.js";
import { setMessage, inBounds } from "./utils.js";
import { SPELL_BY_ID, castSpell, spendSpellMana } from "./spells/index.js";
import { rangedAttackAt, useWeaponAbility } from "./combat.js";
import { tryMove, useRelic, returnToTown } from "./turn.js";
import { renderBackpack } from "./backpack.js";
import { closeShop } from "./shop.js";
import { session } from "./net/session.js";
import { sendGiftItem } from "./net/sync.js";

const MOVE_KEYS = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0]
};

const HOTKEYS = new Set([
  "arrowup", "arrowdown", "arrowleft", "arrowright",
  "w", "a", "s", "d", " ",
  "z", "x", "c", "v", "q", "e", "f", "j", "n", "b", "?", "+", "=",
  "1", "2", "3", "4", "5", "6", "escape"
]);

// touch-only "charged" toggle. On desktop we use physical Shift; on mobile the
// user taps the charged button to arm before selecting a slot.
let touchCharged = false;

const tutorialOverlay = document.getElementById("tutorialOverlay");
const touchChargedBtn = document.getElementById("touchCharged");

function castFromSlot(k, { charged = false } = {}) {
  const slotId = state.player.spellSlots[k];
  const spell = slotId && state.player.knownSpells.has(slotId) ? SPELL_BY_ID[slotId] : null;
  if (!spell) {
    setMessage(`Slot ${k.toUpperCase()} is empty. Open backpack (B) to assign.`);
    return;
  }
  const cost = Math.ceil(spell.cost * (charged ? 1.5 : 1));
  // In multiplayer, "self" and "adjacent" targeting force aim mode so the
  // player can choose to support themselves OR their partner (or land
  // spells like venom on a foe). The cast resolver routes to a partner
  // hit / heal / buff if the chosen tile is the partner's.
  const isMP = session.isMultiplayer();
  const selfTarget = spell.targeting === "self" || spell.targeting === "adjacent";
  if (selfTarget && !isMP) {
    if (state.player.mana < cost) { setMessage("Not enough mana."); return; }
    const res = castSpell(spell, state.player.x, state.player.y, { charged });
    if (res.acted) spendSpellMana(spell, charged);
    if (charged) setTouchCharged(false);
  } else {
    state.aimMode = { kind: "spell", spell, name: spell.name, charged };
    setMessage(`${charged ? "CHARGED " : ""}Aiming ${spell.name}. ${selfTarget ? "Click yourself or your partner." : (charged ? "" : "Hold Shift / tap CHARGED for 1.5×.")} Click/tap tile.`);
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
  if (state.aiEnabled && !localStorage.getItem("pixelRogueGroqKey")) {
    const keyInput = prompt("Enter Groq API key (free at console.groq.com — saved in localStorage). Used by the Enchanter to generate weapon enchants:");
    if (keyInput) localStorage.setItem("pixelRogueGroqKey", keyInput.trim());
  }
  setMessage(`AI enchants ${state.aiEnabled ? "enabled" : "disabled"}.`);
}

function toggleFullscreen() {
  state.fullscreen = !state.fullscreen;
  document.body.classList.toggle("fullscreen", state.fullscreen);
  setMessage(state.fullscreen ? "Stats hidden. Press + to show." : "Stats restored.");
}

function toggleTutorial(force) {
  const open = typeof force === "boolean" ? force : tutorialOverlay.classList.contains("hidden");
  tutorialOverlay.classList.toggle("hidden", !open);
  state.tutorialOpen = open;
}

function setTouchCharged(v) {
  touchCharged = v;
  if (touchChargedBtn) {
    touchChargedBtn.textContent = `charged ${v ? "ON" : "OFF"}`;
    touchChargedBtn.classList.toggle("lit", v);
  }
}

function onKeyDown(e) {
  // allow typing in any input field without stealing keys
  if (document.activeElement && document.activeElement.tagName === "INPUT" && e.key !== "Escape") return;

  const k = e.key.toLowerCase();
  if (HOTKEYS.has(k)) e.preventDefault();

  if (k === "?") { toggleTutorial(); return; }

  if (e.ctrlKey && k === "r") { e.preventDefault(); returnToTown(); return; }

  if (MOVE_KEYS[k]) { tryMove(...MOVE_KEYS[k]); return; }

  const maxSlots = state.player.maxSpellSlots || 4;
  const slotKeys = ["z", "x", "c", "v", "q", "e"].slice(0, maxSlots);
  if (slotKeys.includes(k)) castFromSlot(k, { charged: e.shiftKey });

  if (k === "f") {
    if (state.player.weaponType === "bow") {
      state.aimMode = { kind: "ranged", name: "Bow Shot" };
      setMessage("Aiming bow shot. Click a tile.");
    } else {
      setMessage("Equip a bow to fire arrows.");
    }
  }

  if (k === "j") useWeaponAbility();

  if (k === "+" || k === "=") toggleFullscreen();

  if (k === "n") toggleAi();

  if (k === "b" && state.started) toggleBackpack();

  if (k === "escape") {
    state.aimMode = null;
    state.backpackOpen = false;
    ui.backpackOverlay.classList.add("hidden");
    if (!tutorialOverlay.classList.contains("hidden")) toggleTutorial(false);
  }

  if (["1", "2", "3", "4", "5", "6"].includes(k)) useRelic(Number(k) - 1);

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
  if (!state.aimMode || !state.mouseTile || state.awaitingShop || !state.started || state.over) return;
  let acted = false;
  if (state.aimMode.kind === "ranged") {
    acted = rangedAttackAt(state.mouseTile.x, state.mouseTile.y);
  } else if (state.aimMode.kind === "spell") {
    const spell = state.aimMode.spell;
    const charged = state.aimMode.charged || e.shiftKey || touchCharged;
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
    if (acted) { spendSpellMana(spell, charged); if (charged) setTouchCharged(false); }
  }
  state.aimMode = null;
}

// Canvas touch support: map touch → the same tile under the finger so aiming works.
function onCanvasTouchEnd(e) {
  if (!e.changedTouches || !e.changedTouches[0]) return;
  const t = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const tx = Math.floor(((t.clientX - rect.left) * sx) / tileSize);
  const ty = Math.floor(((t.clientY - rect.top) * sy) / tileSize);
  if (!inBounds(tx, ty)) return;
  state.mouseTile = { x: tx, y: ty };
  onCanvasClick({ shiftKey: false });
  e.preventDefault();
}

function killDefault(ev) { ev.preventDefault(); }

export function attachInput() {
  window.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("click", onCanvasClick);

  // Mobile touch-hygiene: swallow gestures on the canvas surface
  canvas.addEventListener("touchstart", killDefault, { passive: false });
  canvas.addEventListener("touchmove", killDefault, { passive: false });
  canvas.addEventListener("touchend", onCanvasTouchEnd, { passive: false });
  canvas.addEventListener("gesturestart", killDefault);
  canvas.addEventListener("gesturechange", killDefault);
  canvas.addEventListener("gestureend", killDefault);
  canvas.addEventListener("contextmenu", killDefault);

  // Document-level: suppress iOS double-tap zoom
  let lastTap = 0;
  document.addEventListener("touchend", (ev) => {
    const now = Date.now();
    if (now - lastTap < 350) ev.preventDefault();
    lastTap = now;
  }, { passive: false });

  ui.leaveShop.addEventListener("click", closeShop);

  ui.closeChest.addEventListener("click", () => {
    ui.chestOverlay.classList.add("hidden");
    state.chestOpen = false;
  });

  // Tutorial open/close
  document.getElementById("helpBtn").addEventListener("click", () => toggleTutorial(true));
  document.getElementById("closeTutorial").addEventListener("click", () => toggleTutorial(false));

  // First-visit tutorial
  if (!localStorage.getItem("pixelRogueSeenTutorial")) {
    toggleTutorial(true);
    localStorage.setItem("pixelRogueSeenTutorial", "1");
  }
}

function onEscapeLike() {
  state.aimMode = null;
  state.backpackOpen = false;
  ui.backpackOverlay.classList.add("hidden");
  if (!tutorialOverlay.classList.contains("hidden")) toggleTutorial(false);
  setMessage("Cancelled.");
}

// D-pad + action buttons for touch devices. Safe to wire on desktop too.
export function initTouch() {
  // D-pad
  document.querySelectorAll(".dpad button[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [dx, dy] = btn.getAttribute("data-move").split(",").map(Number);
      if (dx !== 0 || dy !== 0) tryMove(dx, dy);
    });
  });

  // Cast slot buttons (all six possible slots)
  for (const slot of ["z", "x", "c", "v", "q", "e"]) {
    const btn = document.getElementById(`touch${slot.toUpperCase()}`);
    if (btn) btn.addEventListener("click", () => castFromSlot(slot, { charged: touchCharged }));
  }

  // Charged toggle (mobile replacement for Shift)
  if (touchChargedBtn) {
    touchChargedBtn.addEventListener("click", () => setTouchCharged(!touchCharged));
  }

  // Bag
  document.querySelector('.action-buttons button[data-action="bag"]')?.addEventListener("click", () => {
    if (state.started) toggleBackpack();
  });

  // Bow shot (if equipped)
  document.querySelector('.action-buttons button[data-action="bow"]')?.addEventListener("click", () => {
    if (state.player.weaponType === "bow") {
      state.aimMode = { kind: "ranged", name: "Bow Shot" };
      setMessage("Aiming bow shot. Tap a tile.");
    } else {
      setMessage("Equip a bow to fire arrows.");
    }
  });

  // Weapon enchant ability
  document.querySelector('.action-buttons button[data-action="ability"]')?.addEventListener("click", () => {
    useWeaponAbility();
  });

  // Cancel / Esc replacement
  document.querySelector('.action-buttons button[data-action="cancel"]')?.addEventListener("click", onEscapeLike);

  // HUD tap-to-use
  if (ui.spells) {
    ui.spells.addEventListener("click", (e) => {
      const slotEl = e.target.closest("[data-slot-key]");
      if (slotEl && !slotEl.classList.contains("empty")) {
        castFromSlot(slotEl.dataset.slotKey, { charged: touchCharged });
        return;
      }
      if (e.target.closest("[data-ability]")) { useWeaponAbility(); return; }
      if (e.target.closest("[data-bow]")) {
        if (state.player.weaponType === "bow") {
          state.aimMode = { kind: "ranged", name: "Bow Shot" };
          setMessage("Aiming bow shot. Tap a tile.");
        }
      }
    });
  }

  if (ui.inventory) {
    ui.inventory.addEventListener("click", (e) => {
      // Gift button has priority — don't fall through to "use relic"
      const giftBtn = e.target.closest("[data-gift-idx]");
      if (giftBtn) {
        e.stopPropagation();
        const idx = parseInt(giftBtn.dataset.giftIdx, 10);
        const item = state.player.inventory[idx];
        if (item && session.isMultiplayer()) {
          sendGiftItem(item);
          state.player.inventory.splice(idx, 1);
          setMessage(`Gifted ${item.name} to ${session.partner.name || "your partner"}.`);
        }
        return;
      }
      const row = e.target.closest("[data-relic-idx]");
      if (!row) return;
      useRelic(parseInt(row.dataset.relicIdx, 10));
    });
  }
}
