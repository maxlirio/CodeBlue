import { state } from "./state.js";
import { STATUS_DEFS } from "./config.js";
import { rnd, distance, inBounds, enemyAt, lineTiles, setMessage } from "./utils.js";
import {
  spawnBurst, spawnBeam, doScreenShake,
  hasStatus, applyStatus, removeStatus, addFloorEffect
} from "./fx.js";
import { recordEnemyKill } from "./quests.js";
import { isGuestActive, syncRemoteDamage, sendQuestKill } from "./multi.js";

export function useWeaponAbility() {
  const enchant = state.player.weaponEnchant;
  if (!enchant || !enchant.ability) {
    setMessage("Your weapon has no enchant ability. Visit the Enchanter.");
    return false;
  }
  const a = enchant.ability;
  if (state.player.mana < a.cost) {
    setMessage(`Not enough mana for ${a.name} (${a.cost} MP).`);
    return false;
  }
  const color = enchant.color || "#ffd166";

  if (a.type === "heal") {
    const before = state.player.hp;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + a.power);
    spawnBurst(state.player.x, state.player.y, color, 14);
    state.player.mana -= a.cost;
    setMessage(`${a.name} restores ${state.player.hp - before} HP.`);
    return true;
  }

  const range = a.range || 5;
  const inRange = state.enemies
    .map((e) => ({ e, d: distance(e, state.player) }))
    .filter(({ d }) => d <= range)
    .sort((x, y) => x.d - y.d);

  if (a.type === "aura") {
    const adjacent = state.enemies.filter((e) => distance(e, state.player) <= 1);
    if (!adjacent.length) { setMessage(`${a.name}: nothing adjacent.`); return false; }
    spawnBurst(state.player.x, state.player.y, color, 16);
    for (const e of adjacent) {
      spawnBurst(e.x, e.y, color, 10);
      damageEnemy(e, a.power, "arcane");
      if (enchant.status) applyStatus(e, enchant.status, enchant.statusTurns || 3, enchant.statusPower || 1);
    }
    state.player.mana -= a.cost;
    setMessage(`${a.name} bursts across ${adjacent.length} foe${adjacent.length > 1 ? "s" : ""}.`);
    clearDeadEnemies();
    return true;
  }

  if (!inRange.length) { setMessage(`${a.name}: no target within ${range} tiles.`); return false; }

  if (a.type === "bolt") {
    const target = inRange[0].e;
    spawnBeam(state.player.x, state.player.y, target.x, target.y, color);
    spawnBurst(target.x, target.y, color, 10);
    damageEnemy(target, a.power, "arcane");
    if (enchant.status) applyStatus(target, enchant.status, enchant.statusTurns || 4, enchant.statusPower || 1);
    state.player.mana -= a.cost;
    setMessage(`${a.name} strikes ${target.name}.`);
    clearDeadEnemies();
    return true;
  }

  if (a.type === "beam") {
    const chain = inRange.slice(0, 3);
    let prev = state.player;
    for (const { e } of chain) {
      spawnBeam(prev.x, prev.y, e.x, e.y, color);
      spawnBurst(e.x, e.y, color, 8);
      damageEnemy(e, Math.max(1, Math.floor(a.power * 0.7)), "arcane");
      if (enchant.status) applyStatus(e, enchant.status, enchant.statusTurns || 3, enchant.statusPower || 1);
      prev = e;
    }
    state.player.mana -= a.cost;
    setMessage(`${a.name} chains through ${chain.length} foe${chain.length > 1 ? "s" : ""}.`);
    clearDeadEnemies();
    return true;
  }

  return false;
}

export function triggerWeaponEnchant(enemy) {
  const enchant = state.player.weaponEnchant;
  if (!enchant) return;
  if (Math.random() > (enchant.procChance || 0.25)) return;
  const color = enchant.color || "#ffd166";
  const primitive = enchant.primitive || "burst";
  if (primitive === "beam") spawnBeam(state.player.x, state.player.y, enemy.x, enemy.y, color);
  else if (primitive === "aura") {
    spawnBurst(state.player.x, state.player.y, color, 8);
    spawnBurst(enemy.x, enemy.y, color, 10);
  }
  else spawnBurst(enemy.x, enemy.y, color, 14);
  if (enchant.status) {
    applyStatus(enemy, enchant.status, enchant.statusTurns || 4, enchant.statusPower || 1);
  }
  if (enchant.bonusDamage) {
    enemy.hp -= enchant.bonusDamage;
    if (isGuestActive() && enemy.id !== undefined) {
      syncRemoteDamage(enemy.id, enchant.bonusDamage, "physical");
    }
  }
}

export function rollHit(baseDamage) {
  const r = Math.random();
  if (r < 0.12) return { type: "miss", damage: 0 };
  if (r > 0.9) return { type: "crit", damage: Math.floor(baseDamage * 1.8) };
  return { type: "hit", damage: baseDamage };
}

export function schoolMultiplier(enemy, school) {
  let m = 1;
  if (enemy.weak && enemy.weak.includes(school)) m *= 1.5;
  if (enemy.resist && enemy.resist.includes(school)) m *= 0.5;
  return m;
}

export function damageEnemy(enemy, amount, school) {
  let m = schoolMultiplier(enemy, school);
  let shatter = false;
  if (hasStatus(enemy, "chill") && (school === "frost" || school === "storm" || school === "fire")) {
    m *= 1.5; removeStatus(enemy, "chill"); shatter = true;
    spawnBurst(enemy.x, enemy.y, "#cdeaff", 14);
  }
  if (school === "storm" && hasStatus(enemy, "burn")) {
    for (const n of state.enemies) if (n !== enemy && distance(n, enemy) <= 1) applyStatus(n, "shock", 2, 1);
    spawnBurst(enemy.x, enemy.y, "#ffffff", 8);
  }
  if (hasStatus(enemy, "mark")) m *= 1.5;
  const dealt = Math.max(0, Math.floor(amount * m));
  enemy.hp -= dealt;
  if (dealt > 0 && hasStatus(enemy, "mark")) {
    state.player.mana = Math.min(state.player.maxMana, state.player.mana + 1);
  }
  if (state.castingDepth > 0) state.castingDamage = (state.castingDamage || 0) + dealt;
  if (shatter) setMessage(`SHATTER! ${enemy.name} takes ${dealt} ${school}.`);
  // Multiplayer: forward the resulting damage to the host so its
  // authoritative state mirrors the mutation.
  if (isGuestActive() && enemy.id !== undefined && dealt > 0) {
    syncRemoteDamage(enemy.id, dealt, school);
  }
  return dealt;
}

export function playerTakeDamage(amount) {
  const ward = state.player.statuses && state.player.statuses.find((s) => s.kind === "ward");
  const reduced = ward ? Math.max(1, Math.floor(amount * (1 - ward.power / 100))) : amount;
  state.player.hp -= reduced;
  return reduced;
}

export function clearDeadEnemies() {
  let killedBoss = false;
  for (const enemy of state.enemies) {
    if (enemy.hp > 0 || enemy.rewardsGranted) continue;
    enemy.rewardsGranted = true;
    enemy.dying = 18;
    if (enemy.boss) { killedBoss = true; state.stats.bossKills += 1; }
    state.stats.kills += 1;
    recordEnemyKill(enemy.type, state.floor);
    sendQuestKill(enemy.type, state.floor);
    const gold = enemy.boss ? rnd(18, 30) : rnd(2, 7);
    state.player.gold += gold;
    state.stats.goldEarned += gold;
    spawnBurst(enemy.x, enemy.y, enemy.boss ? "#ff5dc1" : "#ffd166", 12);
  }
  if (killedBoss) {
    state.bossAlive = false;
    state.player.spellPoints += 2;
    setMessage("The boss falls. +2 Spell Points. Return to town or press on.");
  }
}

export function cullDyingEnemies() {
  // Guest: never decrement; the host's broadcasts manage dying counters
  // and emit explicit enemy_remove messages when an enemy is gone.
  if (isGuestActive()) return;
  state.enemies = state.enemies.filter((e) => {
    if (e.hp > 0) return true;
    if (e.dying > 0) { e.dying -= 1; return true; }
    return false;
  });
}

export function playerAttack(enemy) {
  const enchant = state.player.statuses && state.player.statuses.find((s) => s.kind === "enchantblade");
  const bonusAtk = enchant ? enchant.power : 0;
  const rolled = rollHit(rnd(state.player.atk - 1 + bonusAtk, state.player.atk + 3 + bonusAtk));
  const dmg = rolled.damage;
  enemy.hp -= Math.max(0, dmg);
  if (isGuestActive() && enemy.id !== undefined && dmg > 0) {
    syncRemoteDamage(enemy.id, dmg, "physical");
  }
  spawnBurst(enemy.x, enemy.y, "#ff758f", 9);
  if (rolled.type === "miss") setMessage("You miss!");
  if (rolled.type === "crit") setMessage(`Critical hit! ${dmg} damage.`);
  if (rolled.type !== "miss") triggerWeaponEnchant(enemy);
  if (enemy.hp <= 0) {
    const gold = enemy.boss ? rnd(18, 30) : rnd(3, 8);
    state.player.gold += gold;
    state.stats.goldEarned += gold;
    state.stats.kills += 1;
    recordEnemyKill(enemy.type, state.floor);
    sendQuestKill(enemy.type, state.floor);
    if (enemy.boss) {
      state.stats.bossKills += 1;
      state.player.spellPoints += 2;
      setMessage(`You slay ${enemy.name}, floor boss! +2 Spell Points.`);
      state.bossAlive = false;
      enemy.rewardsGranted = true;
      enemy.dying = 18;
      return;
    }
    enemy.rewardsGranted = true;
    enemy.dying = 18;
    setMessage(`You defeat a ${enemy.type}.`);
  } else {
    if (rolled.type !== "miss") setMessage(`You hit ${enemy.name} for ${dmg}.`);
  }
}

export function rangedAttackAt(tx, ty) {
  if (state.player.arrows <= 0) {
    setMessage("No arrows left.");
    return false;
  }
  const line = lineTiles(state.player.x, state.player.y, tx, ty).slice(1);
  for (const tile of line) {
    if (!inBounds(tile.x, tile.y) || state.map[tile.y][tile.x] === 1) break;
    const enemy = enemyAt(tile.x, tile.y);
    if (enemy) {
      state.player.arrows -= 1;
      const rolled = rollHit(rnd(state.player.atk + 1, state.player.atk + 4));
      const dmg = rolled.damage;
      enemy.hp -= dmg;
      spawnBeam(state.player.x, state.player.y, tile.x, tile.y, "#ffd166");
      setMessage(`Arrow hits ${enemy.name} for ${dmg}.`);
      clearDeadEnemies();
      return true;
    }
  }
  state.player.arrows -= 1;
  setMessage("Your arrow misses and shatters on stone.");
  return true;
}

export function damageNearestEnemy(amount, color) {
  if (!state.enemies.length) {
    setMessage("No enemy for that spell.");
    return false;
  }
  const target = state.enemies
    .map((enemy) => ({ enemy, dist: distance(enemy, state.player) }))
    .sort((a, b) => a.dist - b.dist)[0].enemy;
  target.hp -= amount;
  spawnBeam(state.player.x, state.player.y, target.x, target.y, color);
  setMessage(`${target.name} takes ${amount} magic damage.`);
  clearDeadEnemies();
  return true;
}

export function damageAdjacentEnemies(amount, color) {
  const nearby = state.enemies.filter((enemy) => distance(enemy, state.player) <= 1);
  if (!nearby.length) {
    setMessage("No nearby enemies.");
    return false;
  }
  for (const enemy of nearby) {
    enemy.hp -= amount;
    spawnBurst(enemy.x, enemy.y, color, 8);
  }
  setMessage(`Nova hits ${nearby.length} foes.`);
  clearDeadEnemies();
  return true;
}

export function tickStatuses(t) {
  if (!t.statuses || !t.statuses.length) return;
  for (const s of t.statuses) {
    if (s.kind === "burn") {
      if (t === state.player) playerTakeDamage(s.power);
      else t.hp -= s.power;
      spawnBurst(t.x, t.y, STATUS_DEFS.burn.color, 3);
    }
    if (s.kind === "regen" && t === state.player) {
      t.hp = Math.min(t.maxHp, t.hp + s.power);
      spawnBurst(t.x, t.y, STATUS_DEFS.regen.color, 3);
    }
    s.turns -= 1;
  }
  t.statuses = t.statuses.filter((s) => s.turns > 0);
}

export function tickRealtime() {
  tickFloorEffects();
  tickStatuses(state.player);
  for (const e of state.enemies) tickStatuses(e);
  clearDeadEnemies();
}

export function tickFloorEffects() {
  // Host owns floor effects; guest just renders the host's snapshot.
  if (isGuestActive()) return;
  for (const f of state.floorEffects) {
    if (f.kind === "burn") {
      const e = enemyAt(f.x, f.y);
      if (e) { e.hp -= f.power; applyStatus(e, "burn", 2, f.power); spawnBurst(f.x, f.y, STATUS_DEFS.burn.color, 2); }
      if (state.player.x === f.x && state.player.y === f.y) {
        playerTakeDamage(f.power); spawnBurst(f.x, f.y, STATUS_DEFS.burn.color, 2);
      }
    }
    if (f.kind === "mine") {
      const e = enemyAt(f.x, f.y);
      const onMine = e || (state.player.x === f.x && state.player.y === f.y);
      if (onMine) triggerMine(f);
    }
    if (f.kind === "trap") {
      const e = enemyAt(f.x, f.y);
      if (e) triggerTrap(f, e);
    }
    f.turns -= 1;
  }
  state.floorEffects = state.floorEffects.filter((f) => f.turns > 0);
}

export function triggerTrap(f, enemy) {
  const pow = state.player.spellPower + Math.floor(state.floor / 4);
  damageEnemy(enemy, 5 + pow, "life");
  applyStatus(enemy, "stun", 1, 1);
  spawnBurst(f.x, f.y, "#84f6a6", 12);
  f.turns = 0;
  clearDeadEnemies();
}

export function triggerMine(f) {
  const pow = state.player.spellPower + Math.floor(state.floor / 4);
  spawnBurst(f.x, f.y, "#ff7a3a", 16);
  for (let yy = f.y - 1; yy <= f.y + 1; yy++) {
    for (let xx = f.x - 1; xx <= f.x + 1; xx++) {
      if (!inBounds(xx, yy) || state.map[yy][xx] === 1) continue;
      addFloorEffect(xx, yy, "burn", 3, 2);
      const e = enemyAt(xx, yy);
      if (e) { damageEnemy(e, 6 + pow, "fire"); applyStatus(e, "burn", 3, 2); }
    }
  }
  f.turns = 0;
  clearDeadEnemies();
  doScreenShake(6);
}
