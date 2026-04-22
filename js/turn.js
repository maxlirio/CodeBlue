import { state, ui } from "./state.js";
import { maxFloor } from "./config.js";
import { rnd, distance, isWalkable, enemyAt, setMessage, levelManaPool } from "./utils.js";
import {
  isWallBlocked, spawnBurst,
  hasStatus
} from "./fx.js";
import {
  playerAttack, clearDeadEnemies,
  tickStatuses, tickFloorEffects, triggerMine
} from "./combat.js";
import { rankOf } from "./spells/index.js";
import { equipWeapon, recalcAttack, generateAiLoot } from "./items.js";
import { narrateCombat } from "./ai.js";
import { buildFloor } from "./map.js";
import { SCHOOL_COLORS } from "./config.js";

function pickupAt(list, x, y) {
  const i = list.findIndex((v) => v.x === x && v.y === y);
  return i === -1 ? null : list.splice(i, 1)[0];
}

function handlePickups(nx, ny) {
  const coin = pickupAt(state.coins, nx, ny);
  if (coin) {
    const amount = rnd(1, 5);
    state.player.gold += amount;
    setMessage(`You found ${amount} gold.`);
  }

  const potion = pickupAt(state.potions, nx, ny);
  if (potion) {
    const heal = rnd(6, 12);
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
    spawnBurst(nx, ny, "#84f6a6", 10);
    setMessage(`Potion heals ${heal} HP.`);
  }

  const relicDrop = pickupAt(state.relicDrops, nx, ny);
  if (relicDrop) {
    if (state.player.inventory.length < 6) {
      state.player.inventory.push(relicDrop.relic);
      setMessage(`Found relic: ${relicDrop.relic.name}.`);
    } else {
      setMessage("Inventory full for relics.");
    }
  }

  const scroll = pickupAt(state.spellDrops, nx, ny);
  if (scroll) learnOrRankSpell(scroll.spell, nx, ny);

  const weaponDrop = pickupAt(state.weaponDrops, nx, ny);
  if (weaponDrop) {
    const weapon = weaponDrop.weapon;
    generateAiLoot(weapon.type || "enemy").then((aiWeapon) => {
      const merged = { ...weapon, ...aiWeapon, type: (aiWeapon.type || weapon.type || "sword").toLowerCase() };
      equipWeapon(merged);
      narrateCombat(`You found ${merged.name}, a ${merged.animation || "mystic"} weapon.`);
    });
  }
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
    const emptySlot = ["z", "x", "c", "v"].find((k) => !slots[k]);
    if (emptySlot) slots[emptySlot] = spell.id;
    setMessage(`Learned ${spell.name}${emptySlot ? ` (slotted to ${emptySlot.toUpperCase()})` : " (open B to slot)"}.`);
  }
}

function descend() {
  if (state.bossAlive) { setMessage("A boss still guards this floor."); enemyTurn(); return; }
  if (state.awaitingShop) { setMessage("Visit the shop first."); return; }
  if (state.floor >= maxFloor) {
    state.won = true;
    state.over = true;
    setMessage("You conquer floor 100 and claim the dungeon crown!");
    return;
  }
  state.floor += 1;
  state.player.baseAtk += 1;
  state.player.maxHp += 2;
  state.player.maxMana = levelManaPool(state.floor);
  recalcAttack();
  state.player.mana = state.player.maxMana;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
  setMessage(`You descend to floor ${state.floor}.`);
  buildFloor();
}

export function tryMove(dx, dy) {
  if (state.over || !state.started || state.awaitingShop || state.bossBattle) return;
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  if (!isWalkable(nx, ny)) { setMessage("You bump into rough stone."); enemyTurn(); return; }
  if (isWallBlocked(nx, ny)) { setMessage("Thornwall blocks your path."); enemyTurn(); return; }

  const foe = enemyAt(nx, ny);
  if (foe) { playerAttack(foe); enemyTurn(); return; }

  state.player.x = nx;
  state.player.y = ny;

  handlePickups(nx, ny);

  if (state.stairs.x === nx && state.stairs.y === ny) { descend(); return; }

  enemyTurn();
}

function enemyStepToward(enemy) {
  let dx = 0;
  let dy = 0;
  if (Math.abs(state.player.x - enemy.x) > Math.abs(state.player.y - enemy.y)) {
    dx = state.player.x > enemy.x ? 1 : -1;
  } else {
    dy = state.player.y > enemy.y ? 1 : -1;
  }
  const tx = enemy.x + dx;
  const ty = enemy.y + dy;
  const blocked = !isWalkable(tx, ty) || isWallBlocked(tx, ty) || enemyAt(tx, ty) || (state.player.x === tx && state.player.y === ty);
  if (blocked) return;
  enemy.x = tx;
  enemy.y = ty;
  const mine = state.floorEffects.find((f) => f.kind === "mine" && f.x === enemy.x && f.y === enemy.y && f.turns > 0);
  if (mine) triggerMine(mine);
}

export function enemyTurn() {
  if (state.over || state.awaitingShop || state.bossBattle) return;
  tickFloorEffects();
  tickStatuses(state.player);
  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.over = true;
    setMessage("Lingering spell effects overwhelm you.");
    return;
  }
  for (const enemy of state.enemies) {
    tickStatuses(enemy);
    if (enemy.hp <= 0) continue;

    // Stun: full skip. Chill: skip every other turn.
    if (hasStatus(enemy, "stun")) continue;
    if (hasStatus(enemy, "chill")) {
      enemy.chillSkip = !enemy.chillSkip;
      if (enemy.chillSkip) continue;
    }
    const atkMod = hasStatus(enemy, "shock") ? -2 : 0;

    const dist = distance(enemy, state.player);
    if (dist === 1) {
      const dmg = Math.max(1, rnd(enemy.atk - 1, enemy.atk + 1) + atkMod);
      state.player.hp -= dmg;
      spawnBurst(state.player.x, state.player.y, "#ff758f", 7);
      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.over = true;
        setMessage("You were slain. Refresh to try again.");
        break;
      }
      setMessage(`${enemy.name} hits you for ${dmg}.`);
      continue;
    }
    if (dist > enemy.vision) continue;
    enemyStepToward(enemy);
  }
  clearDeadEnemies();
}

export function useRelic(index) {
  if (state.awaitingShop || state.bossBattle) return;
  const relic = state.player.inventory[index];
  if (!relic) return;
  relic.use();
  state.player.inventory.splice(index, 1);
  enemyTurn();
}

export function chooseClass(c) {
  state.player.className = c.name;
  state.player.weapon = c.weapon;
  state.player.weaponBonus = 1;
  state.player.weaponType = c.weapon.toLowerCase().includes("staff") ? "wand" : "sword";
  state.player.maxHp = c.hp;
  state.player.hp = c.hp;
  state.player.maxMana = levelManaPool(state.floor) + Math.floor(c.mana / 6);
  state.player.mana = state.player.maxMana;
  state.player.baseAtk = c.atk;
  state.player.spellPower = c.spellPower;
  state.player.arrows = 12;
  state.player.backpack = [{ name: c.weapon, atk: 1, mana: 0, type: state.player.weaponType, effectiveAgainst: "any" }];
  recalcAttack();
  state.started = true;
  buildFloor();
  ui.classOverlay.classList.add("hidden");
  setMessage(`You begin as a ${c.name}.`);
}
