import { state, ui } from "./state.js";
import { WEAPON_POOL } from "./config.js";
import { pick, setMessage } from "./utils.js";
import { equipWeapon, makeRelic, recalcAttack } from "./items.js";
import { SPELL_LIBRARY, rankOf } from "./spells/index.js";

export function openShop() {
  ui.shopOverlay.classList.remove("hidden");
  renderShop();
}

export function closeShop() {
  state.awaitingShop = false;
  ui.shopOverlay.classList.add("hidden");
  setMessage("You leave the shop and continue onward.");
}

function buySpellScroll() {
  const unknown = SPELL_LIBRARY.filter((sp) => !state.player.knownSpells.has(sp.id));
  const rankable = SPELL_LIBRARY.filter((sp) => state.player.knownSpells.has(sp.id) && rankOf(sp.id) < 3);
  const pool = unknown.length ? unknown : rankable;
  if (!pool.length) { setMessage("No scrolls could be found."); return; }
  const picked = pick(pool);
  if (state.player.knownSpells.has(picked.id)) {
    state.player.spellRanks[picked.id] = rankOf(picked.id) + 1;
    setMessage(`${picked.name} ranks up to R${rankOf(picked.id)}!`);
  } else {
    state.player.knownSpells.add(picked.id);
    state.player.spellRanks[picked.id] = 1;
    const slots = state.player.spellSlots;
    const empty = ["z", "x", "c", "v"].find((k) => !slots[k]);
    if (empty) slots[empty] = picked.id;
    setMessage(`Learned ${picked.name}.`);
  }
}

const SHOP_OFFERS = [
  { name: "+8 Max HP (25g)", cost: 25, buy() {
      state.player.maxHp += 8;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 8);
    } },
  { name: "+3 Max MP (22g)", cost: 22, buy() {
      state.player.maxMana += 3;
      state.player.mana = state.player.maxMana;
    } },
  { name: "Weapon Crate (30g)", cost: 30, buy() { equipWeapon(pick(WEAPON_POOL)); } },
  { name: "Random Relic (28g)", cost: 28, buy() {
      if (state.player.inventory.length < 6) state.player.inventory.push(makeRelic(state.floor));
    } },
  { name: "Spell Scroll (26g)", cost: 26, buy: buySpellScroll }
];

export function renderShop() {
  ui.shopGold.textContent = `Gold: ${state.player.gold}`;
  ui.shopChoices.innerHTML = "";
  for (const offer of SHOP_OFFERS) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.innerHTML = `<strong>${offer.name}</strong><span>Spend gold for upgrades.</span>`;
    btn.addEventListener("click", () => {
      if (state.player.gold < offer.cost) { setMessage("Not enough gold."); return; }
      state.player.gold -= offer.cost;
      offer.buy();
      recalcAttack();
      renderShop();
      setMessage(`Purchased ${offer.name}.`);
    });
    ui.shopChoices.appendChild(btn);
  }
}
