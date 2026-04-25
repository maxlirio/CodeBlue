import { state, ui } from "./state.js";
import { WEAPON_POOL, SHOP_VENDORS } from "./config.js";
import { pick, setMessage } from "./utils.js";
import {
  equipWeapon, makeRelic, makePotion, recalcAttack,
  generateAiEnchant, applyEnchantToEquippedWeapon, getEnchantTiers
} from "./items.js";
import { SPELL_LIBRARY, rankOf, isSpellForPlayer } from "./spells/index.js";
import { makeMagicScroll } from "./augments.js";

function addPotion(kind) {
  if (state.player.inventory.length >= 6) { setMessage("Relic slots full — drop one first."); return false; }
  const potion = makePotion(kind);
  if (potion) state.player.inventory.push(potion);
  return true;
}

function buySpellScroll() {
  const atCap = state.player.knownSpells.size >= 6;
  const eligible = SPELL_LIBRARY.filter(isSpellForPlayer);
  const unknown = atCap ? [] : eligible.filter((sp) => !state.player.knownSpells.has(sp.id));
  const rankable = eligible.filter((sp) => state.player.knownSpells.has(sp.id) && rankOf(sp.id) < 3);
  const pool = unknown.length ? unknown : rankable;
  if (!pool.length) { setMessage("Spellbook full and all spells mastered."); return; }
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

const SHOPS = {
  weapon: {
    title: "BLACKSMITH",
    offers: [
      { name: "Weapon Crate (30g)", cost: 30, buy() { equipWeapon(pick(WEAPON_POOL)); } },
      { name: "Arrow Bundle (15g, +10)", cost: 15, buy() { state.player.arrows += 10; } },
      { name: "Sharpen Blade (20g, +1 ATK)", cost: 20, buy() { state.player.baseAtk += 1; } }
    ]
  },
  alchemist: {
    title: "ALCHEMIST",
    offers: [
      { name: "Healing Potion (12g)", cost: 12, buy() { addPotion("heal"); } },
      { name: "Mana Draught (14g)", cost: 14, buy() { addPotion("mana"); } },
      { name: "Swiftness Elixir (20g)", cost: 20, buy() { addPotion("swiftness"); } },
      { name: "Aegis Flask (22g)", cost: 22, buy() { addPotion("aegis"); } },
      { name: "Growth Tonic (28g)", cost: 28, buy() { addPotion("growth"); } },
      { name: "Focus Draught (24g)", cost: 24, buy() { addPotion("focus"); } }
    ]
  },
  arcanum: {
    title: "ARCANUM",
    offers: [
      { name: "Spell Scroll (26g)", cost: 26, buy: buySpellScroll },
      { name: "+1 Spell Power (30g)", cost: 30, buy() { state.player.spellPower += 1; } },
      { name: "Sigil Scroll (40g)", cost: 40, buy() {
          if (state.player.inventory.length >= 6) { setMessage("Inventory full — drop a relic first."); return false; }
          state.player.inventory.push(makeMagicScroll());
        } }
    ]
  },
  curio: {
    title: "CURIOS",
    offers: [
      { name: "Random Relic (28g)", cost: 28, buy() {
          if (state.player.inventory.length < 6) state.player.inventory.push(makeRelic(state.floor));
          else setMessage("Relic inventory full.");
        } }
    ]
  },
  enchanter: {
    title: "ENCHANTER",
    custom: true
  }
};

let enchanterPending = false;
let enchanterPreview = null;

function statusLabel(s) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function describeEnchant(e) {
  const parts = [];
  if (e.atkBonus) parts.push(`+${e.atkBonus} ATK`);
  if (e.bonusDamage) parts.push(`+${e.bonusDamage} on-hit`);
  if (e.status) parts.push(`${Math.round(e.procChance * 100)}% ${statusLabel(e.status)} (${e.statusTurns}t)`);
  else parts.push(`${Math.round(e.procChance * 100)}% proc`);
  if (e.ability) parts.push(`[J] ${e.ability.name} (${e.ability.cost}MP)`);
  return parts.join(" · ");
}

function renderEnchanter() {
  const tiers = getEnchantTiers();
  const w = state.player.backpack.find((x) => x.name === state.player.weapon);
  const v = SHOP_VENDORS.enchanter;
  if (ui.shopTitle) ui.shopTitle.textContent = v ? `${v.title} — ${v.name}` : "ENCHANTER";
  ui.shopGold.innerHTML =
    `<div class="shop-header-line"><span class="shop-gold"><b>${state.player.gold}g</b> in pouch</span></div>` +
    `<div>Equipped: <strong>${state.player.weapon || "(none)"}</strong>` +
    (w?.enchant ? ` · <span style="color:${w.enchant.color}">${w.enchant.name}</span> — ${describeEnchant(w.enchant)}` : ` · No enchant.`) +
    `</div>`;

  ui.shopChoices.innerHTML = "";

  if (enchanterPending) {
    const wait = document.createElement("p");
    wait.style.color = "#7bdff2";
    wait.textContent = "The enchanter weaves runes into your steel...";
    ui.shopChoices.appendChild(wait);
    return;
  }

  if (enchanterPreview) {
    const e = enchanterPreview;
    const card = document.createElement("div");
    card.className = "choice";
    card.style.cursor = "default";
    card.innerHTML =
      `<strong style="color:${e.color}">${e.name}</strong>` +
      `<span style="font-style:italic;color:var(--ink-dim)">${e.flavor || ""}</span>` +
      `<span>${describeEnchant(e)}</span>`;
    ui.shopChoices.appendChild(card);

    const accept = document.createElement("button");
    accept.className = "choice";
    accept.innerHTML = `<strong>Bind to weapon</strong><span>Replaces any existing enchant.</span>`;
    accept.addEventListener("click", () => {
      const ok = applyEnchantToEquippedWeapon(e);
      if (!ok) setMessage("No equipped weapon to enchant.");
      else setMessage(`${e.name} binds to ${state.player.weapon}.`);
      enchanterPreview = null;
      recalcAttack();
      renderEnchanter();
    });
    ui.shopChoices.appendChild(accept);

    const reject = document.createElement("button");
    reject.className = "choice";
    reject.innerHTML = `<strong>Discard</strong><span>Back to enchant menu.</span>`;
    reject.addEventListener("click", () => {
      enchanterPreview = null;
      renderEnchanter();
    });
    ui.shopChoices.appendChild(reject);
    return;
  }

  for (const [tierKey, t] of Object.entries(tiers)) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.innerHTML =
      `<strong>${t.label} Enchant (${t.cost}g)</strong>` +
      `<span>+0 to +${t.atkMax} ATK · proc up to ${Math.round(t.procMax * 100)}% · ${tierKey === "legendary" ? "rare" : tierKey}</span>`;
    btn.addEventListener("click", async () => {
      if (state.player.gold < t.cost) { setMessage("Not enough gold."); return; }
      const equipped = state.player.backpack.find((x) => x.name === state.player.weapon);
      if (!equipped) { setMessage("No equipped weapon to enchant."); return; }
      state.player.gold -= t.cost;
      enchanterPending = true;
      renderEnchanter();
      try {
        const enchant = await generateAiEnchant({
          weaponName: equipped.name,
          weaponType: equipped.type || "sword",
          tier: tierKey
        });
        enchanterPreview = enchant;
      } finally {
        enchanterPending = false;
        renderEnchanter();
      }
    });
    ui.shopChoices.appendChild(btn);
  }
}

let activeShopKind = null;

export function openShop(kind = "weapon") {
  activeShopKind = SHOPS[kind] ? kind : "weapon";
  enchanterPreview = null;
  enchanterPending = false;
  activeGreeting = null;
  ui.shopOverlay.classList.remove("hidden");
  renderShop();
}

export function closeShop() {
  state.awaitingShop = false;
  const kind = activeShopKind;
  activeShopKind = null;
  enchanterPreview = null;
  enchanterPending = false;
  activeGreeting = null;
  ui.shopOverlay.classList.add("hidden");
  const v = SHOP_VENDORS[kind];
  if (v) setMessage(`"${pickFrom(v.farewell)}"`);
  else setMessage("You step away from the counter.");
}

function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let activeGreeting = null;

export function renderShop() {
  const shop = SHOPS[activeShopKind] || SHOPS.weapon;
  if (shop.custom && activeShopKind === "enchanter") { renderEnchanter(); return; }

  const v = SHOP_VENDORS[activeShopKind];
  const title = v ? `${v.title} — ${v.name}` : shop.title;
  const dialogue = activeGreeting || (v ? pickFrom(v.greet) : "");
  activeGreeting = dialogue;
  if (ui.shopTitle) ui.shopTitle.textContent = title;
  ui.shopGold.innerHTML =
    `<div class="shop-header-line"><span class="shop-gold"><b>${state.player.gold}g</b> in pouch</span></div>` +
    (dialogue ? `<div class="shop-dialogue">"${dialogue}"</div>` : "");

  ui.shopChoices.innerHTML = "";
  for (const offer of shop.offers) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.innerHTML = `<strong>${offer.name}</strong>`;
    btn.addEventListener("click", () => {
      if (state.player.gold < offer.cost) { setMessage("Not enough gold."); return; }
      state.player.gold -= offer.cost;
      const result = offer.buy();
      if (result === false) {
        state.player.gold += offer.cost;
      } else {
        setMessage(`Purchased ${offer.name}.`);
      }
      recalcAttack();
      renderShop();
    });
    ui.shopChoices.appendChild(btn);
  }
}
