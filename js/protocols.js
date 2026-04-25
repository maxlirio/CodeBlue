import { state } from "./state.js";
import { distance, inBounds, isWalkable, enemyAt, lineTiles, setMessage } from "./utils.js";
import {
  spawnBurst, spawnBeam, doScreenShake,
  hasStatus, applyStatus, isWallBlocked
} from "./fx.js";
import { playerTakeDamage, clearDeadEnemies } from "./combat.js";

function stepTo(enemy, tx, ty, { ethereal = false } = {}) {
  if (!inBounds(tx, ty)) return false;
  if (!ethereal && !isWalkable(tx, ty)) return false;
  if (!ethereal && isWallBlocked(tx, ty)) return false;
  const other = enemyAt(tx, ty);
  if (other && other !== enemy) return false;
  if (state.player.x === tx && state.player.y === ty) return false;
  enemy.x = tx;
  enemy.y = ty;
  return true;
}

function stepToward(enemy, target, opts) {
  const dx = Math.sign(target.x - enemy.x);
  const dy = Math.sign(target.y - enemy.y);
  if (Math.abs(target.x - enemy.x) >= Math.abs(target.y - enemy.y)) {
    if (dx && stepTo(enemy, enemy.x + dx, enemy.y, opts)) return true;
    if (dy && stepTo(enemy, enemy.x, enemy.y + dy, opts)) return true;
  } else {
    if (dy && stepTo(enemy, enemy.x, enemy.y + dy, opts)) return true;
    if (dx && stepTo(enemy, enemy.x + dx, enemy.y, opts)) return true;
  }
  return false;
}

function stepAway(enemy, target) {
  const dx = enemy.x === target.x ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(target.x - enemy.x);
  const dy = enemy.y === target.y ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(target.y - enemy.y);
  if (stepTo(enemy, enemy.x + dx, enemy.y)) return true;
  if (stepTo(enemy, enemy.x, enemy.y + dy)) return true;
  return false;
}

function randomStep(enemy) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
  stepTo(enemy, enemy.x + dx, enemy.y + dy);
}

function meleePlayer(enemy, mult = 1, label = null) {
  const raw = Math.max(1, Math.floor((enemy.atk + Math.floor(state.floor / 3)) * mult));
  const dmg = playerTakeDamage(raw);
  spawnBurst(state.player.x, state.player.y, "#ff758f", 7);
  state.lastHitBy = enemy.name;
  setMessage(label || `${enemy.name} hits you for ${dmg}.`);
  return dmg;
}

function hasLineOfSight(x1, y1, x2, y2) {
  const tiles = lineTiles(x1, y1, x2, y2);
  for (let i = 1; i < tiles.length - 1; i++) {
    const t = tiles[i];
    if (!inBounds(t.x, t.y) || state.map[t.y][t.x] === 1) return false;
  }
  return true;
}

function advanceAndStrike(e, mult = 1) {
  stepToward(e, state.player);
  if (distance(e, state.player) === 1) meleePlayer(e, mult);
}

function pSlime(e) {
  const d = distance(e, state.player);
  if (d === 1) return meleePlayer(e);
  if (d <= e.vision) { advanceAndStrike(e); return; }
  if (Math.random() < 0.35) randomStep(e);
}

function pGoblin(e) {
  const d = distance(e, state.player);
  if (d === 1) return meleePlayer(e);
  if (d <= e.vision) advanceAndStrike(e);
}

function pBat(e) {
  const d = distance(e, state.player);
  if (d === 1) { meleePlayer(e); stepAway(e, state.player); return; }
  if (d <= e.vision) {
    stepToward(e, state.player);
    if (distance(e, state.player) === 1) { meleePlayer(e); stepAway(e, state.player); return; }
    if (distance(e, state.player) > 3) stepToward(e, state.player);
    if (distance(e, state.player) === 1) { meleePlayer(e); stepAway(e, state.player); }
  }
}

function pSkeleton(e) {
  const d = distance(e, state.player);
  if (d === 1) return meleePlayer(e);
  if (d <= e.vision) advanceAndStrike(e);
}

function pImp(e) {
  e.protoState ??= { shotTimer: 800 };
  const d = distance(e, state.player);
  if (d === 1) return meleePlayer(e);
  if (d < 3) { stepAway(e, state.player); return; }
  if (d <= 5 && hasLineOfSight(e.x, e.y, state.player.x, state.player.y)) {
    if (e.protoState.shotTimer <= 0) {
      spawnBeam(e.x, e.y, state.player.x, state.player.y, "#ff7a3a");
      const dmg = playerTakeDamage(Math.max(2, Math.floor(e.atk / 2) + 1));
      applyStatus(state.player, "burn", 3, 2);
      state.lastHitBy = e.name;
      setMessage(`${e.name} spits fire: ${dmg} + burn.`);
      e.protoState.shotTimer = 1500;
      return;
    }
  }
  if (d > 6) stepToward(e, state.player);
}

function pWolf(e) {
  const d = distance(e, state.player);
  if (d === 1) return meleePlayer(e, 1.15);
  if (d <= e.vision) advanceAndStrike(e, 1.15);
}

function pOrc(e) {
  e.protoState ??= { telegraphed: false };
  const d = distance(e, state.player);
  if (e.protoState.telegraphed) {
    e.protoState.telegraphed = false;
    if (d === 1) { meleePlayer(e, 1.7, `${e.name} SLAMS you!`); doScreenShake(5); }
    else setMessage(`${e.name}'s slam whiffs.`);
    return;
  }
  if (d === 1 || d === 2) {
    e.protoState.telegraphed = true;
    spawnBurst(e.x, e.y, "#ffd166", 6);
    setMessage(`${e.name} winds up a slam!`);
    return;
  }
  if (d <= e.vision) stepToward(e, state.player);
}

function wraithStrike(e) {
  const dmg = meleePlayer(e);
  const heal = Math.ceil(dmg / 2);
  e.hp = Math.min(e.maxHp, e.hp + heal);
  spawnBurst(e.x, e.y, "#9bc4ff", 6);
}

function pWraith(e) {
  const d = distance(e, state.player);
  if (d === 1) return wraithStrike(e);
  if (d <= e.vision) {
    stepToward(e, state.player, { ethereal: true });
    if (distance(e, state.player) === 1) wraithStrike(e);
  }
}

// Spider — bursts in, bites and applies poison, then strafes.
function pSpider(e) {
  e.protoState ??= { lunged: 0 };
  const d = distance(e, state.player);
  if (d === 1) {
    meleePlayer(e);
    applyStatus(state.player, "burn", 4, 2);   // venom = small burn-like DOT
    setMessage(`${e.name} bites — venom courses through you.`);
    spawnBurst(state.player.x, state.player.y, "#5b3a8e", 6);
    if (Math.random() < 0.6) stepAway(e, state.player);
    return;
  }
  if (d <= e.vision) {
    // Two-step burst: cover ground fast
    stepToward(e, state.player);
    if (distance(e, state.player) > 1) stepToward(e, state.player);
    if (distance(e, state.player) === 1) {
      meleePlayer(e);
      applyStatus(state.player, "burn", 4, 2);
      spawnBurst(state.player.x, state.player.y, "#5b3a8e", 6);
    }
  }
}

// Ghoul — slow, tough, leeches HP on hit. Resists chill but is hurt by life.
function pGhoul(e) {
  const d = distance(e, state.player);
  if (d === 1) {
    const dmg = meleePlayer(e, 1.1, `${e.name} rends you, claws drinking blood.`);
    const heal = Math.min(e.maxHp - e.hp, Math.ceil(dmg * 0.6));
    if (heal > 0) {
      e.hp += heal;
      spawnBurst(e.x, e.y, "#a8323e", 8);
    }
    return;
  }
  if (d <= e.vision) advanceAndStrike(e, 1.1);
}

// Shaman — caster. Stays at range, throws hex bolts that curse, occasionally
// buffs nearby allies' speed (reduces their actInterval).
function pShaman(e) {
  e.protoState ??= { castTimer: 1200, buffTimer: 4500 };
  const d = distance(e, state.player);
  if (d === 1) { stepAway(e, state.player); return; }
  if (d < 3) { stepAway(e, state.player); return; }

  // Periodic ally speed-up
  if (e.protoState.buffTimer <= 0) {
    let buffed = 0;
    for (const ally of state.enemies) {
      if (ally === e || ally.hp <= 0) continue;
      if (distance(ally, e) > 4) continue;
      ally.actInterval = Math.max(220, Math.floor(ally.actInterval * 0.75));
      spawnBurst(ally.x, ally.y, "#84f6a6", 6);
      buffed++;
    }
    if (buffed) {
      setMessage(`${e.name} chants — nearby foes quicken.`);
      e.protoState.buffTimer = 6000;
    }
  }

  // Hex bolt
  if (d <= e.vision && hasLineOfSight(e.x, e.y, state.player.x, state.player.y)) {
    if (e.protoState.castTimer <= 0) {
      spawnBeam(e.x, e.y, state.player.x, state.player.y, "#84f6a6");
      const dmg = playerTakeDamage(Math.max(2, Math.floor(e.atk * 0.9)));
      applyStatus(state.player, "mark", 6, 1);  // mark = takes more damage
      state.lastHitBy = e.name;
      setMessage(`${e.name} hex-bolts you for ${dmg} and marks your soul.`);
      e.protoState.castTimer = 1700;
      return;
    }
  }
  // Reposition for line of sight
  if (d > e.vision) stepToward(e, state.player);
  else if (!hasLineOfSight(e.x, e.y, state.player.x, state.player.y)) stepToward(e, state.player);
}

function spawnBossAdd(e) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for (const [dx, dy] of dirs) {
    const nx = e.x + dx;
    const ny = e.y + dy;
    if (!inBounds(nx, ny) || state.map[ny][nx] === 1) continue;
    if (enemyAt(nx, ny)) continue;
    if (state.player.x === nx && state.player.y === ny) continue;
    state.enemies.push({
      x: nx, y: ny, type: "slime", name: "slimeling",
      hp: 6, maxHp: 6, atk: 2, baseAtk: 2, vision: 7,
      statuses: [], weak: ["fire"], resist: ["frost"], boss: false,
      protocol: "slime", actInterval: 850, actTimer: 400, protoState: {}
    });
    spawnBurst(nx, ny, "#4bc35f", 10);
    setMessage(`${e.name} summons a slimeling!`);
    return true;
  }
  return false;
}

function fireBossNova(e) {
  const arms = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of arms) {
    for (let s = 1; s <= 6; s++) {
      const tx = e.x + dx * s;
      const ty = e.y + dy * s;
      if (!inBounds(tx, ty) || state.map[ty][tx] === 1) break;
      spawnBurst(tx, ty, "#ff5dc1", 7);
      if (state.player.x === tx && state.player.y === ty) {
        const raw = Math.max(3, e.atk);
        const dmg = playerTakeDamage(raw);
        state.lastHitBy = e.name;
        setMessage(`${e.name} nova scorches you for ${dmg}.`);
      }
    }
  }
  doScreenShake(8);
}

function bossCharge(e) {
  // Lunge up to 3 tiles toward the player, then strike if adjacent.
  for (let i = 0; i < 3 && distance(e, state.player) > 1; i++) {
    if (!stepToward(e, state.player)) break;
  }
  spawnBurst(e.x, e.y, "#ff5dc1", 8);
  setMessage(`${e.name} charges!`);
  doScreenShake(4);
  if (distance(e, state.player) === 1) meleePlayer(e, 1.4, `${e.name} crashes into you.`);
}

function bossSlamTelegraph(e) {
  e.protoState.telegraph = "slam";
  spawnBurst(e.x, e.y, "#ffd166", 6);
  setMessage(`${e.name} winds up — earth cracking.`);
}

function bossSlamRelease(e) {
  e.protoState.telegraph = null;
  if (distance(e, state.player) <= 1) {
    meleePlayer(e, 1.7, `${e.name} SLAMS you!`);
    doScreenShake(7);
  } else {
    setMessage(`${e.name}'s slam misses — your ground splits.`);
    doScreenShake(3);
  }
}

function bossMarkAndSmite(e) {
  if (!e.protoState.markedThisCombo) {
    applyStatus(state.player, "mark", 6, 1);
    spawnBeam(e.x, e.y, state.player.x, state.player.y, "#fca5ff");
    setMessage(`${e.name} marks you. Something is coming.`);
    e.protoState.markedThisCombo = true;
    return;
  }
  // Second beat — smite
  e.protoState.markedThisCombo = false;
  if (hasLineOfSight(e.x, e.y, state.player.x, state.player.y)) {
    const raw = Math.max(4, e.atk + 3);
    const dmg = playerTakeDamage(raw);
    spawnBeam(e.x, e.y, state.player.x, state.player.y, "#ff5dc1");
    spawnBurst(state.player.x, state.player.y, "#ff5dc1", 14);
    state.lastHitBy = e.name;
    setMessage(`${e.name} SMITES — ${dmg} damage!`);
    doScreenShake(6);
  }
}

function bossEnrage(e) {
  applyStatus(e, "haste", 8, 1);
  e.actInterval = Math.max(360, Math.floor(e.actInterval * 0.7));
  spawnBurst(e.x, e.y, "#ff5566", 16);
  setMessage(`${e.name} ROARS — eyes burning.`);
  doScreenShake(6);
  e.protoState.enraged = true;
}

function pBoss(e) {
  e.protoState ??= {
    addTimer: 3000,
    enraged: false,
    telegraph: null,
    cooldowns: { charge: 0, slam: 0, nova: 0, mark: 0 },
    markedThisCombo: false
  };
  const cd = e.protoState.cooldowns;
  for (const k of Object.keys(cd)) cd[k] = Math.max(0, cd[k] - 1);

  const frac = e.hp / e.maxHp;
  const d = distance(e, state.player);

  // Resolve any pending telegraph first.
  if (e.protoState.telegraph === "slam") { bossSlamRelease(e); return; }

  // Phase 3: one-time enrage
  if (frac <= 0.33 && !e.protoState.enraged) { bossEnrage(e); return; }

  // Phase 2: adds
  if (frac <= 0.66 && e.protoState.addTimer <= 0) {
    if (spawnBossAdd(e)) { e.protoState.addTimer = 3800; return; }
  }

  // Mark + smite combo (any phase, but more in phase 2/3)
  if (frac <= 0.85 && e.protoState.markedThisCombo) {
    bossMarkAndSmite(e);
    return;
  }

  // Build a weighted ability pool based on phase, distance, cooldowns.
  const options = [];
  if (d === 1) {
    options.push({ kind: "melee", weight: 4 });
    if (cd.slam <= 0) options.push({ kind: "slam", weight: 3 });
  } else if (d <= 3) {
    options.push({ kind: "advance", weight: 3 });
    if (cd.slam <= 0) options.push({ kind: "slam", weight: 2 });
    if (frac <= 0.66 && cd.mark <= 0 && hasLineOfSight(e.x, e.y, state.player.x, state.player.y)) {
      options.push({ kind: "mark", weight: 3 });
    }
  } else if (d <= 7) {
    if (cd.charge <= 0) options.push({ kind: "charge", weight: 5 });
    options.push({ kind: "advance", weight: 2 });
    if (frac <= 0.5 && cd.nova <= 0) options.push({ kind: "nova", weight: 4 });
    if (frac <= 0.66 && cd.mark <= 0 && hasLineOfSight(e.x, e.y, state.player.x, state.player.y)) {
      options.push({ kind: "mark", weight: 2 });
    }
  } else {
    // Far away
    if (cd.charge <= 0) options.push({ kind: "charge", weight: 6 });
    options.push({ kind: "advance", weight: 2 });
    if (cd.nova <= 0 && frac <= 0.5) options.push({ kind: "nova", weight: 2 });
  }

  // Phase 3 buffs
  if (frac <= 0.33) {
    options.push({ kind: "advance", weight: 2 });
    if (cd.nova <= 0) options.push({ kind: "nova", weight: 3 });
  }

  // Pick weighted
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  let pick = options[0];
  for (const o of options) { r -= o.weight; if (r <= 0) { pick = o; break; } }

  switch (pick.kind) {
    case "melee":
      meleePlayer(e, frac <= 0.33 ? 1.3 : 1.1);
      break;
    case "advance":
      advanceAndStrike(e, frac <= 0.33 ? 1.3 : 1);
      break;
    case "slam":
      bossSlamTelegraph(e);
      cd.slam = 4;
      break;
    case "charge":
      bossCharge(e);
      cd.charge = 5;
      break;
    case "nova":
      fireBossNova(e);
      cd.nova = 5;
      break;
    case "mark":
      bossMarkAndSmite(e);
      cd.mark = 6;
      break;
  }
}

const HANDLERS = {
  slime: pSlime, goblin: pGoblin, bat: pBat, skeleton: pSkeleton,
  imp: pImp, wolf: pWolf, orc: pOrc, wraith: pWraith,
  spider: pSpider, ghoul: pGhoul, shaman: pShaman,
  boss: pBoss
};

export function tickEnemies(dt) {
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (e.protoState) {
      for (const k of Object.keys(e.protoState)) {
        if (typeof e.protoState[k] === "number") e.protoState[k] -= dt;
      }
    }
    if (hasStatus(e, "stun")) { e.actTimer = Math.max(e.actTimer, 300); continue; }
    let slowFactor = 1;
    if (hasStatus(e, "chill")) slowFactor = 1.6;
    e.actTimer -= dt / slowFactor;
    if (e.actTimer <= 0) {
      const handler = HANDLERS[e.protocol] || pGoblin;
      handler(e);
      const jitter = (Math.random() - 0.5) * 120;
      e.actTimer = e.actInterval + jitter;
    }
  }
  clearDeadEnemies();
}
