import { state, ui } from "./state.js";
import { maxFloor, MAX_KNOWN_SPELLS } from "./config.js";
import { rnd, isWalkable, enemyAt, setMessage, levelManaPool } from "./utils.js";
import { isWallBlocked, spawnBurst } from "./fx.js";
import { playerAttack } from "./combat.js";
import { rankOf } from "./spells/index.js";
import { equipWeapon, recalcAttack, generateAiLoot } from "./items.js";
import { openSpellDiscard } from "./discard.js";
import { buildFloor, buildTown, buildShopInterior, shopAt, dungeonEntranceAt } from "./map.js";
import { SHOP_VENDORS } from "./config.js";
import { openShop } from "./shop.js";
import { SCHOOL_COLORS } from "./config.js";
import { showResult } from "./result.js";
import { showCutscene, recordDescend, recordItemPickup } from "./quests.js";
import { sendPosition, sendFloor, sendHello } from "./multi.js";

const PLAYER_MOVE_COOLDOWN_MS = 110;

export function endRun(cause) {
  state.over = true;
  state.lastKilledBy = cause;
  state.stats.floorLog[state.floor - 1] = "died";
  setMessage(cause);
  showResult();
}

function endRunVictory() {
  state.over = true;
  state.won = true;
  state.stats.floorsCleared = maxFloor;
  state.stats.floorLog[maxFloor - 1] = "boss";
  setMessage("You conquer the dungeon.");
  showResult();
}

function learnOrRankSpell(spell, nx, ny) {
  if (state.player.knownSpells.has(spell.id)) {
    const cur = rankOf(spell.id);
    if (cur >= 3) {
      state.player.gold += 12;
      setMessage(`${spell.name} already at R3. You glean 12 gold from the scroll.`);
    } else {
      state.player.spellRanks[spell.id] = cur + 1;
      setMessage(`${spell.name} ranks up to R${cur + 1}!`);
      spawnBurst(nx, ny, SCHOOL_COLORS[spell.school], 14);
    }
  } else {
    state.player.knownSpells.add(spell.id);
    state.player.spellRanks[spell.id] = 1;
    const slots = state.player.spellSlots;
    const slotKeys = ["z", "x", "c", "v", "q", "e"].slice(0, state.player.maxSpellSlots || 4);
    const emptySlot = slotKeys.find((k) => !slots[k]);
    if (emptySlot) slots[emptySlot] = spell.id;
    setMessage(`Learned ${spell.name}${emptySlot ? ` (slotted to ${emptySlot.toUpperCase()})` : " (open B to slot)"}.`);
    if (state.player.knownSpells.size > MAX_KNOWN_SPELLS) openSpellDiscard();
  }
}

function openChest(chest) {
  chest.opened = true;
  const { loot } = chest;
  const lines = [];
  if (loot.gold) {
    state.player.gold += loot.gold;
    state.stats.goldEarned += loot.gold;
    lines.push(`<span style="color:#ffd166"><strong>${loot.gold} gold</strong></span>`);
  }
  if (loot.potion) {
    const heal = rnd(12, 20);
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
    lines.push(`<span style="color:#84f6a6"><strong>Healing Potion</strong> — restored ${heal} HP</span>`);
  }
  if (loot.relic) {
    if (state.player.inventory.length < 6) {
      state.player.inventory.push(loot.relic);
      lines.push(`<span style="color:#fca5ff"><strong>Relic: ${loot.relic.name}</strong> — ${loot.relic.desc}</span>`);
    } else {
      lines.push(`<span style="color:#b8b5e9">Relic left behind (inventory full).</span>`);
    }
  }
  if (loot.scroll) {
    if (state.player.inventory.length < 6) {
      state.player.inventory.push(loot.scroll);
      lines.push(`<span style="color:#84f6a6"><strong>${loot.scroll.name}</strong> — ${loot.scroll.desc}</span>`);
    } else {
      lines.push(`<span style="color:#b8b5e9">Scroll left behind (inventory full).</span>`);
    }
  }
  if (loot.questItem) {
    lines.push(`<span style="color:#ffd166"><strong>${loot.questItem.name}</strong> — ${loot.questItem.desc}</span>`);
    recordItemPickup(loot.questItem.name);
  }
  if (loot.spell) {
    const known = state.player.knownSpells.has(loot.spell.id);
    const atCap = !known && state.player.knownSpells.size >= 6;
    learnOrRankSpell(loot.spell, chest.x, chest.y);
    if (atCap) lines.push(`<span style="color:#b8b5e9">Scroll of <strong>${loot.spell.name}</strong> pawned for 12g (book full).</span>`);
    else if (known) lines.push(`<span style="color:#6be4ff"><strong>${loot.spell.name}</strong> ranked up.</span>`);
    else lines.push(`<span style="color:#6be4ff"><strong>Learned ${loot.spell.name}</strong></span>`);
  }
  if (loot.weapon) {
    generateAiLoot(loot.weapon.type || "enemy").then((ai) => {
      const merged = { ...loot.weapon, ...ai, type: (ai.type || loot.weapon.type || "sword").toLowerCase() };
      equipWeapon(merged);
    });
    lines.push(`<span style="color:#ffc46e"><strong>Weapon: ${loot.weapon.name}</strong></span>`);
  }
  if (loot.spellPoints) {
    state.player.spellPoints += loot.spellPoints;
    lines.push(`<span style="color:#c79bff"><strong>+${loot.spellPoints} Spell Point${loot.spellPoints > 1 ? "s" : ""}</strong></span>`);
  }
  spawnBurst(chest.x, chest.y, "#ffd166", 14);
  ui.chestLoot.innerHTML = lines.join("<br>");
  ui.chestOverlay.classList.remove("hidden");
  state.chestOpen = true;
}

function snapshotFloor() {
  state.floorCache[state.floor] = {
    map: state.map,
    rooms: state.rooms,
    enemies: state.enemies,
    stairs: state.stairs,
    stairsUp: state.stairsUp,
    floorEffects: state.floorEffects,
    bossAlive: state.bossAlive,
    interactables: state.interactables,
    buildings: state.buildings,
    trees: state.trees,
    paths: state.paths,
    fountains: state.fountains,
    chests: state.chests
  };
}

function restoreFloor(floor) {
  const c = state.floorCache[floor];
  state.map = c.map;
  state.rooms = c.rooms;
  state.enemies = c.enemies;
  state.stairs = c.stairs;
  state.stairsUp = c.stairsUp;
  state.floorEffects = c.floorEffects;
  state.bossAlive = c.bossAlive;
  state.interactables = c.interactables || [];
  state.buildings = c.buildings || [];
  state.trees = c.trees || [];
  state.paths = c.paths || [];
  state.fountains = c.fountains || [];
  state.chests = c.chests || [];
}

function enterFloor(floor, { fromAbove }) {
  state.floor = floor;
  if (state.floorCache[floor]) {
    restoreFloor(floor);
  } else if (floor === 0) {
    buildTown();
    sendFloor(0);
    sendPosition();
    return;
  } else {
    buildFloor();
  }
  if (floor === 0) {
    const entry = state.interactables.find((i) => i.kind === "dungeon");
    if (entry) { state.player.x = entry.x - 1; state.player.y = entry.y; }
  } else if (fromAbove && state.stairsUp) {
    state.player.x = state.stairsUp.x;
    state.player.y = state.stairsUp.y;
  } else if (!fromAbove && state.stairs) {
    state.player.x = state.stairs.x;
    state.player.y = state.stairs.y;
  }
  sendFloor(floor);
  sendPosition();
}

function maybeMarkCurrentFloorCleared() {
  if (state.floor <= 0) return;
  const aliveEnemies = state.enemies.some((e) => e.hp > 0);
  if (aliveEnemies || state.bossAlive) return;
  const hadBoss = state.floor % 5 === 0;
  const prior = state.stats.floorLog[state.floor - 1];
  if (prior !== "boss") {
    state.stats.floorLog[state.floor - 1] = hadBoss ? "boss" : "cleared";
  }
  state.stats.floorsCleared = Math.max(state.stats.floorsCleared, state.floor);
}

export function enterTown() {
  if (state.started) { maybeMarkCurrentFloorCleared(); snapshotFloor(); }
  enterFloor(0, { fromAbove: false });
  setMessage("You return to town. The air is peaceful here.");
}

function floorIsClear() {
  return !state.bossAlive && !state.enemies.some((e) => e.hp > 0);
}

export function returnToTown() {
  if (state.floor === 0 || !state.started || state.over) return;
  if (!floorIsClear()) {
    setMessage("Enemies still roam this floor. Clear them before recalling.");
    return;
  }
  maybeMarkCurrentFloorCleared();
  snapshotFloor();
  enterFloor(0, { fromAbove: false });
  setMessage("A recall rune whisks you back to town.");
}

function descend() {
  if (state.bossAlive) { setMessage("A boss still guards this floor."); return; }
  if (state.awaitingShop) { setMessage("Finish at the shop first."); return; }

  if (state.floor > 0) {
    const hadBoss = state.floor % 5 === 0;
    state.stats.floorLog[state.floor - 1] = hadBoss ? "boss" : "cleared";
    state.stats.floorsCleared = Math.max(state.stats.floorsCleared, state.floor);
  }

  if (state.floor >= maxFloor) { endRunVictory(); return; }

  snapshotFloor();
  const next = state.floor + 1;
  const firstVisit = !state.floorCache[next];
  if (firstVisit) {
    state.player.baseAtk += 1;
    state.player.maxHp += 2;
    state.player.maxMana = levelManaPool(next);
    recalcAttack();
    state.player.mana = state.player.maxMana;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
    state.player.spellPoints += 1;
  }
  enterFloor(next, { fromAbove: true });
  recordDescend(next);
  setMessage(firstVisit ? `You descend to floor ${next}.` : `You return to floor ${next}.`);
}

function ascend() {
  if (state.floor === 0) { setMessage("You are already in town."); return; }
  if (!floorIsClear()) {
    setMessage("Enemies still roam this floor. Clear them before climbing back.");
    return;
  }
  maybeMarkCurrentFloorCleared();
  snapshotFloor();
  const prev = state.floor - 1;
  enterFloor(prev, { fromAbove: false });
  setMessage(prev === 0 ? "You climb back up to town." : `You ascend to floor ${prev}.`);
}

function eligibleFloors() {
  const cleared = [];
  for (let f = 1; f <= maxFloor; f++) {
    const log = state.stats.floorLog[f - 1];
    if (log === "cleared" || log === "boss") cleared.push(f);
  }
  const maxCleared = cleared.length ? Math.max(...cleared) : 0;
  const next = maxCleared + 1;
  const out = [...cleared];
  if (next <= maxFloor && !cleared.includes(next)) out.push(next);
  return { list: out, clearedSet: new Set(cleared) };
}

function travelToFloor(target) {
  if (state.floor !== 0) return;
  if (target < 1 || target > maxFloor) return;
  const firstVisit = !state.floorCache[target];
  if (firstVisit) {
    state.player.baseAtk += 1;
    state.player.maxHp += 2;
    state.player.maxMana = levelManaPool(target);
    recalcAttack();
    state.player.mana = state.player.maxMana;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
    state.player.spellPoints += 1;
  }
  enterFloor(target, { fromAbove: true });
  recordDescend(target);
  setMessage(firstVisit ? `You descend to floor ${target}.` : `You return to floor ${target}.`);
}

function closeFloorSelector() {
  ui.applyOverlay.classList.add("hidden");
  state.applyOpen = false;
}

function openFloorSelector() {
  const { list, clearedSet } = eligibleFloors();
  ui.applyTitle.textContent = "DESCEND";
  ui.applyMessage.textContent = list.length <= 1
    ? "Step into the dungeon. The descent begins."
    : "Where to? Cleared floors are open for fast return.";
  ui.applyChoices.innerHTML = "";
  for (const n of list) {
    const btn = document.createElement("button");
    btn.className = "choice";
    const isCleared = clearedSet.has(n);
    const cached = !!state.floorCache[n];
    const isBoss = n % 5 === 0;
    const tag = isCleared ? "Return · cleared"
              : cached ? "Resume · in progress"
              : "Begin descent · fresh ground";
    btn.innerHTML =
      `<strong>Floor ${n}${isBoss ? " — Boss" : ""}</strong>` +
      `<span>${tag}</span>`;
    btn.addEventListener("click", () => {
      closeFloorSelector();
      travelToFloor(n);
    });
    ui.applyChoices.appendChild(btn);
  }
  ui.applyCancel.onclick = () => {
    closeFloorSelector();
    setMessage("You step away from the dungeon entrance.");
  };
  ui.applyOverlay.classList.remove("hidden");
  state.applyOpen = true;
}

export function enterShopInterior(kind) {
  state.townBackup = {
    map: state.map,
    rooms: state.rooms,
    enemies: state.enemies,
    interactables: state.interactables,
    buildings: state.buildings,
    trees: state.trees,
    paths: state.paths,
    fountains: state.fountains,
    chests: state.chests,
    floorEffects: state.floorEffects,
    returnPos: { x: state.player.x, y: state.player.y }
  };
  buildShopInterior(kind);
  const v = SHOP_VENDORS[kind];
  if (v) setMessage(`${v.name}, ${v.title.toLowerCase()}: "${pickFrom(v.greet)}"`);
  else setMessage("You step inside.");
}

function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function exitShopInterior() {
  if (!state.townBackup) return;
  const b = state.townBackup;
  state.map = b.map;
  state.rooms = b.rooms;
  state.enemies = b.enemies;
  state.interactables = b.interactables;
  state.buildings = b.buildings;
  state.trees = b.trees;
  state.paths = b.paths;
  state.fountains = b.fountains;
  state.chests = b.chests;
  state.floorEffects = b.floorEffects;
  state.player.x = b.returnPos.x;
  state.player.y = b.returnPos.y;
  state.townBackup = null;
  const kind = state.shopInterior?.kind;
  state.shopInterior = null;
  const v = kind && SHOP_VENDORS[kind];
  if (v) setMessage(`"${pickFrom(v.farewell)}"`);
  else setMessage("You step back outside.");
}

function enterInteractable(i) {
  if (i.kind === "shop") {
    if (i.shop === "enchanter") { state.awaitingShop = true; openShop("enchanter"); }
    else enterShopInterior(i.shop);
    return;
  }
  if (i.kind === "vendor") { state.awaitingShop = true; openShop(i.shop); return; }
  if (i.kind === "shop_exit") { exitShopInterior(); return; }
  if (i.kind === "dungeon") { openFloorSelector(); return; }
}

export function tryMove(dx, dy) {
  if (state.over || !state.started || state.awaitingShop) return;
  if (state.player.moveTimer > 0) return;
  const hasted = state.player.statuses && state.player.statuses.some((s) => s.kind === "haste");
  state.player.moveTimer = hasted ? Math.floor(PLAYER_MOVE_COOLDOWN_MS / 2) : PLAYER_MOVE_COOLDOWN_MS;
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  if (!isWalkable(nx, ny)) {
    if (state.floor === 0 && !state.shopInterior) {
      const shopKind = shopAt(nx, ny);
      if (shopKind) {
        if (shopKind === "enchanter") { state.awaitingShop = true; openShop("enchanter"); }
        else enterShopInterior(shopKind);
        return;
      }
      if (dungeonEntranceAt(nx, ny)) { openFloorSelector(); return; }
    }
    setMessage("You bump into rough stone.");
    return;
  }
  if (isWallBlocked(nx, ny)) { setMessage("Thornwall blocks your path."); return; }

  const foe = enemyAt(nx, ny);
  if (foe) { playerAttack(foe); return; }

  state.player.x = nx;
  state.player.y = ny;
  sendPosition();

  const chest = (state.chests || []).find((c) => c.x === nx && c.y === ny && !c.opened);
  if (chest) openChest(chest);

  const interact = state.interactables.find((i) => i.x === nx && i.y === ny);
  if (interact) { enterInteractable(interact); return; }
  if (state.stairs && state.stairs.x === nx && state.stairs.y === ny) { descend(); return; }
  if (state.stairsUp && state.stairsUp.x === nx && state.stairsUp.y === ny) { ascend(); return; }
}

export function useRelic(index) {
  if (state.awaitingShop) return;
  const relic = state.player.inventory[index];
  if (!relic) return;
  relic.use(index);
  if (relic.consumeOnUse !== false) state.player.inventory.splice(index, 1);
}

export function chooseClass(c, opts = {}) {
  const { heroName, seed } = opts;
  if (heroName) state.heroName = heroName;
  if (seed) state.seed = seed;

  state.floor = 0;
  state.floorCache = {};
  state.over = false;
  state.won = false;
  state.lastKilledBy = "";
  state.stats = { kills: 0, bossKills: 0, spellsCast: 0, goldEarned: 0, floorsCleared: 0, floorLog: [] };
  state.player.gold = 0;
  state.player.inventory = [];
  state.player.spellAugments = {};
  state.player.weaponEnchant = null;
  state.player.quest = null;
  const starts = c.startSpells || ["bolt", "nova", "mend"];
  state.player.knownSpells = new Set(starts);
  state.player.spellRanks = Object.fromEntries(starts.map((id) => [id, 1]));
  state.player.spellSlots = { z: starts[0] || null, x: starts[1] || null, c: starts[2] || null, v: starts[3] || null, q: starts[4] || null, e: starts[5] || null };
  state.player.maxSpellSlots = c.maxSpellSlots || 4;
  state.player.maxWeapons = c.maxWeapons || 3;
  state.player.statuses = [];
  state.player.lastOffensive = null;

  state.player.className = c.name;
  state.player.weapon = c.weapon;
  state.player.weaponBonus = 1;
  state.player.weaponType = c.weaponType || (c.weapon.toLowerCase().includes("staff") ? "wand" : "sword");
  state.player.maxHp = c.hp;
  state.player.hp = c.hp;
  state.player.maxMana = levelManaPool(state.floor) + Math.floor(c.mana / 6);
  state.player.mana = state.player.maxMana;
  state.player.baseAtk = c.atk;
  state.player.spellPower = c.spellPower;
  state.player.arrows = c.startArrows ?? 12;
  state.player.backpack = [
    { name: c.weapon, atk: 1, mana: 0, type: state.player.weaponType, effectiveAgainst: "any" },
    ...(c.extraItems || []).map((item) => ({ atk: 1, mana: 0, effectiveAgainst: "any", ...item }))
  ];
  recalcAttack();
  state.started = true;
  ui.classOverlay.classList.add("hidden");
  sendHello();
  setMessage("A figure waits at his desk before you reach town…");
  // Cutscene first — quest-giver picks the player's run-defining errand,
  // then the actual town loads.
  showCutscene().then(() => {
    enterFloor(0, { fromAbove: false });
    setMessage(`${state.heroName || "You"} arrives in town as a ${c.name}.`);
  });
}
