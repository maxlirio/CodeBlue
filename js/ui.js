import { state, ui } from "./state.js";
import { CLASS_OPTIONS, SCHOOL_COLORS, STATUS_DEFS } from "./config.js";
import { SPELL_BY_ID, rankOf } from "./spells/index.js";
import { drawPortrait } from "./render.js";
import { chooseClass } from "./turn.js";

const heroNameInput = document.getElementById("heroName");
const rerollNameBtn = document.getElementById("rerollName");
const heroDisplay = document.getElementById("heroDisplay");

function suggestName() {
  const { left, mid, right } = state.runSeedWords;
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return `${r(left)} ${r(mid)} ${r(right)}`;
}

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

function syncTouchSlotLabels() {
  const slots = state.player.spellSlots;
  for (const k of ["z", "x", "c", "v"]) {
    const btn = document.getElementById(`touch${k.toUpperCase()}`);
    if (!btn) continue;
    const id = slots[k];
    if (!id) { btn.textContent = `${k.toUpperCase()} —`; continue; }
    const sp = SPELL_BY_ID[id];
    btn.textContent = `${k.toUpperCase()} ${sp.name.split(" ")[0]} ${sp.cost}MP`;
  }
}

function renderPlayerStatuses() {
  return (state.player.statuses || [])
    .map((s) => `<span style="color:${STATUS_DEFS[s.kind].color}">${STATUS_DEFS[s.kind].tag}${s.turns}</span>`)
    .join(" ");
}

export function updateUi() {
  if (heroDisplay) heroDisplay.textContent = state.heroName || "-";
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
  syncTouchSlotLabels();

  if (state.aimMode && state.mouseTile) {
    ui.narration.textContent = `Aim: ${state.aimMode.name}${state.aimMode.charged ? " (CHARGED)" : ""} — click tile ${state.mouseTile.x},${state.mouseTile.y}.`;
  }
  drawPortrait();
}

export function renderClassChoices() {
  heroNameInput.value = suggestName();
  rerollNameBtn.addEventListener("click", () => { heroNameInput.value = suggestName(); });

  ui.classChoices.innerHTML = "";
  for (const c of CLASS_OPTIONS) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.innerHTML = `<strong>${c.name}</strong><span>HP ${c.hp}, MP ${c.mana}, ATK ${c.atk}, Weapon ${c.weapon}</span>`;
    btn.addEventListener("click", () => {
      const heroName = heroNameInput.value.trim() || suggestName();
      chooseClass(c, { heroName });
    });
    ui.classChoices.appendChild(btn);
  }
}
