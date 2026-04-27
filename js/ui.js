import { state, ui } from "./state.js";
import { CLASS_OPTIONS, SCHOOL_COLORS, STATUS_DEFS } from "./config.js";
import { SPELL_BY_ID, rankOf } from "./spells/index.js";
import { drawPortrait } from "./render.js";
import { chooseClass } from "./turn.js";
import { session } from "./net/session.js";

const heroNameInput = document.getElementById("heroName");
const rerollNameBtn = document.getElementById("rerollName");
const heroDisplay = document.getElementById("heroDisplay");

const HERO_FIRST_NAMES = [
  "Edward", "Mira", "Gareth", "Elena", "Finn", "Aurora", "Kael", "Ivy",
  "Arthur", "Lyra", "Cedric", "Nora", "Dorian", "Selene", "Owen", "Freya",
  "Roland", "Isolde", "Alistair", "Mabel", "Percival", "Rowan", "Tristan", "Eira",
  "Bastian", "Saoirse", "Caspian", "Astrid", "Oswin", "Maren", "Leif", "Sigrid",
  "Henry", "Clara", "Thomas", "Rosalind", "Marcus", "Juno", "Bertram", "Lena",
  "Desmond", "Imogen", "Philip", "Cordelia", "Gideon", "Beatrice", "Silas", "Margot"
];

const HERO_SURNAMES = [
  "Ashford", "Blackwood", "Crane", "Dunmore", "Everly", "Falk", "Graves",
  "Hale", "Ironwood", "Jessup", "Kellen", "Locke", "Moore", "Nash",
  "Orrick", "Pike", "Quinn", "Ravenna", "Stone", "Thorne", "Vale",
  "Wyatt", "Hollis", "Briggs", "Clay", "Drake", "Marsh", "Weller",
  "Sinclair", "Holloway", "Fenwick", "Garrow", "Monroe", "Keene"
];

function suggestName() {
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return `${r(HERO_FIRST_NAMES)} ${r(HERO_SURNAMES)}`;
}

function renderSlots() {
  const slots = state.player.spellSlots;
  const maxSlots = state.player.maxSpellSlots || 4;
  const keys = ["z", "x", "c", "v", "q", "e"].slice(0, maxSlots);
  const augs = state.player.spellAugments || {};
  return keys.map((k) => {
    const id = slots[k];
    if (!id) {
      return `<div class="slot-card empty" data-slot-key="${k}">
        <span class="key">${k.toUpperCase()}</span>
        <span class="slot-name">— empty —</span>
        <span class="slot-meta">press B to slot</span>
      </div>`;
    }
    const sp = SPELL_BY_ID[id];
    const r = rankOf(id);
    const col = SCHOOL_COLORS[sp.school];
    const sigils = (augs[id] || []).map((a) => `<span class="sigil">✦ ${a}</span>`).join("");
    return `<div class="slot-card tappable" data-slot-key="${k}">
      <span class="key">${k.toUpperCase()}</span>
      <span class="slot-name" style="color:${col}">${sp.name}</span>
      <span class="slot-meta">R${r} · ${sp.cost} MP${sigils}</span>
    </div>`;
  }).join("");
}

function syncTouchSlotLabels() {
  const slots = state.player.spellSlots;
  const maxSlots = state.player.maxSpellSlots || 4;
  const allKeys = ["z", "x", "c", "v", "q", "e"];
  for (let i = 0; i < allKeys.length; i++) {
    const k = allKeys[i];
    const btn = document.getElementById(`touch${k.toUpperCase()}`);
    if (!btn) continue;
    if (i >= maxSlots) { btn.classList.add("hidden"); continue; }
    btn.classList.remove("hidden");
    const id = slots[k];
    if (!id) { btn.textContent = `${k.toUpperCase()} —`; continue; }
    const sp = SPELL_BY_ID[id];
    btn.textContent = `${k.toUpperCase()} ${sp.name.split(" ")[0]} ${sp.cost}MP`;
  }
  // Toggle bow and ability touch buttons based on loadout.
  const touchBow = document.getElementById("touchBow");
  if (touchBow) touchBow.classList.toggle("hidden", state.player.weaponType !== "bow");
  const touchAbility = document.getElementById("touchAbility");
  if (touchAbility) {
    const a = state.player.weaponEnchant?.ability;
    if (a) {
      touchAbility.classList.remove("hidden");
      touchAbility.textContent = `[J] ${a.name.split(" ").slice(0, 2).join(" ")} ${a.cost}MP`;
    } else {
      touchAbility.classList.add("hidden");
    }
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
  const enchant = state.player.weaponEnchant;
  if (enchant) {
    ui.weapon.innerHTML = `${state.player.weapon || "-"} (${state.player.weaponType || "none"}) <span style="color:${enchant.color}">+ ${enchant.name}</span>`;
  } else {
    ui.weapon.textContent = `${state.player.weapon || "-"} (${state.player.weaponType || "none"})`;
  }
  ui.hp.textContent = `${state.player.hp}/${state.player.maxHp}`;
  ui.mana.textContent = `${state.player.mana}/${state.player.maxMana}`;
  ui.atk.textContent = `${state.player.atk} (+${state.player.spellPower} spell)`;
  ui.floor.textContent = state.floor === 0 ? "Town" : state.floor;
  ui.gold.textContent = state.player.gold;
  ui.enemies.textContent = state.enemies.length;
  ui.bossStatus.textContent = state.bossAlive ? "Alive" : "Cleared";
  // Quest tracker
  const q = state.player.quest;
  if (q && q.status === "active") {
    let progress;
    if (q.type === "slay") progress = `${q.killed || 0} / ${q.count} ${q.enemy}${q.count > 1 ? "s" : ""} slain`;
    else if (q.type === "find") progress = `floor ${q.floor} — recover the relic`;
    else if (q.type === "descend") progress = `reach floor ${q.floor}`;
    else progress = "";
    const giver = q.npcName ? ` <span style="color:var(--ink-dim)">— ${q.npcName}</span>` : "";
    const beforeInventory = `<div class="hud-heading">Quest${giver}</div><div class="quest-line"><strong style="color:var(--amber)">${q.targetName}</strong><span class="quest-progress">${progress}</span></div>`;
    ui.inventory.dataset.questBlock = beforeInventory;
  } else if (q && q.status === "complete") {
    ui.inventory.dataset.questBlock = `<div class="hud-heading">Quest</div><div class="quest-line"><strong style="color:var(--phosphor)">${q.targetName}</strong><span class="quest-progress" style="color:var(--phosphor)">complete · reward claimed</span></div>`;
  } else {
    ui.inventory.dataset.questBlock = "";
  }

  if (state.player.inventory.length) {
    const showGift = session.isMultiplayer();
    const items = state.player.inventory.map((item, i) =>
      `<li class="tappable" data-relic-idx="${i}">
        <span class="num">${i + 1}</span>
        <span class="name-desc"><span class="item-name">${item.name}</span> — <span class="item-desc">${item.desc || ""}</span></span>
        ${showGift ? `<button class="gift-btn" data-gift-idx="${i}" title="Gift to partner">🎁</button>` : ""}
      </li>`
    ).join("");
    ui.inventory.innerHTML = (ui.inventory.dataset.questBlock || "") + `<div class="hud-heading">Items — tap or press 1–6${showGift ? " · 🎁 to gift" : ""}</div><ul class="item-list">${items}</ul>`;
  } else {
    ui.inventory.innerHTML = (ui.inventory.dataset.questBlock || "") + `<div class="hud-heading">Items</div><div class="hud-empty">empty — find relics, scrolls, and potions in chests and shops.</div>`;
  }

  const statuses = renderPlayerStatuses();
  const ability = state.player.weaponEnchant?.ability;
  const abilityColor = state.player.weaponEnchant?.color || "var(--amber)";
  const abilityHtml = ability
    ? `<button class="ability-pill tappable" data-ability style="color:${abilityColor}">[J] ${ability.name} · ${ability.cost} MP</button>`
    : "";
  const isBow = state.player.weaponType === "bow";
  const arrowsHtml = isBow
    ? `<button class="arrow-pill tappable" data-bow>[F] Arrows: <b>${state.player.arrows}</b></button>`
    : `<span class="arrow-pill muted">Arrows: <b>${state.player.arrows}</b></span>`;
  ui.spells.innerHTML = `
    <div class="hud-heading">Spells — tap or press key</div>
    <div class="slot-row">${renderSlots()}</div>
    <div class="hud-row">
      ${arrowsHtml}
      ${abilityHtml}
      ${statuses ? `<span>${statuses}</span>` : ""}
      <span class="charge-hint">Shift / CHARGED = 1.5×</span>
    </div>
  `;
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
    const starts = (c.startSpells || [])
      .map((id) => SPELL_BY_ID[id])
      .filter(Boolean)
      .map((s) => `<li style="color:${SCHOOL_COLORS[s.school]}">${s.name}</li>`)
      .join("");
    const desc = c.desc ? `<span class="class-flavor">${c.desc}</span>` : "";
    btn.innerHTML = `
      <strong>${c.name}</strong>
      ${desc}
      <span class="stat-chips">
        <span class="chip"><b>HP</b>${c.hp}</span>
        <span class="chip"><b>MP</b>${c.mana}</span>
        <span class="chip"><b>ATK</b>${c.atk}</span>
        <span class="chip"><b>SP</b>${c.spellPower}</span>
      </span>
      <span class="class-weapon">${c.weapon}</span>
      ${starts ? `<div class="class-spells-label">Starting spells</div><ul class="class-spells">${starts}</ul>` : ""}
    `;
    btn.addEventListener("click", () => {
      const heroName = heroNameInput.value.trim() || suggestName();
      chooseClass(c, { heroName });
    });
    ui.classChoices.appendChild(btn);
  }
}
