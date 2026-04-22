import { state, ui } from "./state.js";
import { CLASS_OPTIONS, SCHOOL_COLORS, STATUS_DEFS } from "./config.js";
import { SPELL_BY_ID, rankOf } from "./spells/index.js";
import { drawPortrait } from "./render.js";
import { chooseClass } from "./turn.js";

function renderSlots() {
  const slots = state.player.spellSlots;
  return ["z", "x", "c", "v"].map((k) => {
    const id = slots[k];
    if (!id) return `<span style="color:#6b6b8f">[${k.toUpperCase()}] -</span>`;
    const sp = SPELL_BY_ID[id];
    const r = rankOf(id);
    const col = SCHOOL_COLORS[sp.school];
    return `<span style="color:${col}">[${k.toUpperCase()}] ${sp.name} R${r} (${sp.cost}MP)</span>`;
  }).join(" · ");
}

function renderPlayerStatuses() {
  return (state.player.statuses || [])
    .map((s) => `<span style="color:${STATUS_DEFS[s.kind].color}">${STATUS_DEFS[s.kind].tag}${s.turns}</span>`)
    .join(" ");
}

export function updateUi() {
  ui.className.textContent = state.player.className || "-";
  ui.weapon.textContent = `${state.player.weapon || "-"} (${state.player.weaponType || "none"})`;
  ui.hp.textContent = `${state.player.hp}/${state.player.maxHp}`;
  ui.mana.textContent = `${state.player.mana}/${state.player.maxMana}`;
  ui.atk.textContent = `${state.player.atk} (+${state.player.spellPower} spell)`;
  ui.floor.textContent = state.floor;
  ui.gold.textContent = state.player.gold;
  ui.enemies.textContent = state.enemies.length;
  ui.bossStatus.textContent = state.bossAlive ? "Alive" : "Cleared";
  ui.inventory.innerHTML = state.player.inventory.length
    ? `Relics: ${state.player.inventory.map((item, i) => `[${i + 1}] ${item.name} — ${item.desc}`).join("<br>")}`
    : "Relics: empty. Find magenta drops.";

  const statuses = renderPlayerStatuses();
  ui.spells.innerHTML = `Slots: ${renderSlots()} · Arrows: ${state.player.arrows}${statuses ? ` · ${statuses}` : ""} · Shift+click = CHARGED`;

  if (state.aimMode && state.mouseTile) {
    ui.narration.textContent = `Aim: ${state.aimMode.name}${state.aimMode.charged ? " (CHARGED)" : ""} — click tile ${state.mouseTile.x},${state.mouseTile.y}.`;
  }
  drawPortrait();
}

export function renderClassChoices() {
  ui.classChoices.innerHTML = "";
  for (const c of CLASS_OPTIONS) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.innerHTML = `<strong>${c.name}</strong><span>HP ${c.hp}, MP ${c.mana}, ATK ${c.atk}, Weapon ${c.weapon}</span>`;
    btn.addEventListener("click", () => chooseClass(c));
    ui.classChoices.appendChild(btn);
  }
}
