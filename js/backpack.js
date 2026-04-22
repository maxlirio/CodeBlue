import { state, ui } from "./state.js";
import { SCHOOL_COLORS } from "./config.js";
import { equipWeapon, fallbackLoot } from "./items.js";
import { SPELL_LIBRARY, rankOf } from "./spells/index.js";

function sectionHeader(text, marginTop = "") {
  const h = document.createElement("div");
  h.style.gridColumn = "1/-1";
  h.style.color = "#b8b5e9";
  if (marginTop) h.style.marginTop = marginTop;
  h.textContent = text;
  return h;
}

function renderWeapons() {
  const items = state.player.backpack.length ? state.player.backpack : [fallbackLoot("starter")];
  for (const item of items) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.innerHTML = `<strong>${item.name}</strong><span>${item.type} · ATK +${item.atk} · Mana ${item.mana} · Good vs ${item.effectiveAgainst || "any"}</span>`;
    btn.addEventListener("click", () => {
      equipWeapon(item);
      ui.backpackOverlay.classList.add("hidden");
      state.backpackOpen = false;
    });
    ui.backpackChoices.appendChild(btn);
  }
}

function unbindSpell(spellId) {
  const slots = state.player.spellSlots;
  for (const kk of Object.keys(slots)) if (slots[kk] === spellId) slots[kk] = null;
}

function renderSpellRow(sp) {
  const row = document.createElement("div");
  row.className = "choice";
  row.style.cursor = "default";
  const rank = rankOf(sp.id);
  const slots = state.player.spellSlots;
  const boundKey = Object.keys(slots).find((k) => slots[k] === sp.id);
  row.innerHTML = `<strong style="color:${SCHOOL_COLORS[sp.school]}">${sp.name} R${rank} <span style="color:#b8b5e9">(${sp.school}, ${sp.cost} MP)</span></strong><span>${sp.desc}</span>`;

  const btnRow = document.createElement("div");
  btnRow.style.marginTop = "4px";
  btnRow.style.display = "flex";
  btnRow.style.gap = "4px";

  for (const k of ["z", "x", "c", "v"]) {
    const b = document.createElement("button");
    b.className = "choice";
    b.style.padding = "4px 8px";
    b.style.fontSize = "11px";
    const isBound = boundKey === k;
    b.textContent = isBound ? `[${k.toUpperCase()}]*` : k.toUpperCase();
    if (isBound) b.style.borderColor = SCHOOL_COLORS[sp.school];
    b.addEventListener("click", (ev) => {
      ev.stopPropagation();
      unbindSpell(sp.id);
      state.player.spellSlots[k] = sp.id;
      renderBackpack();
    });
    btnRow.appendChild(b);
  }

  const clear = document.createElement("button");
  clear.className = "choice";
  clear.style.padding = "4px 8px";
  clear.style.fontSize = "11px";
  clear.textContent = "—";
  clear.title = "Unassign";
  clear.addEventListener("click", (ev) => {
    ev.stopPropagation();
    unbindSpell(sp.id);
    renderBackpack();
  });
  btnRow.appendChild(clear);

  row.appendChild(btnRow);
  return row;
}

export function renderBackpack() {
  ui.backpackChoices.innerHTML = "";
  ui.backpackChoices.appendChild(sectionHeader("— Weapons —"));
  renderWeapons();
  ui.backpackChoices.appendChild(sectionHeader("— Spell Slots (click a key to assign) —", "6px"));

  const known = SPELL_LIBRARY.filter((sp) => state.player.knownSpells.has(sp.id));
  for (const sp of known) ui.backpackChoices.appendChild(renderSpellRow(sp));
}
