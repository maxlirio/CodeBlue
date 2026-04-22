import { cols, rows, ENEMY_TYPES, WEAPON_POOL } from "./config.js";
import { state } from "./state.js";
import { rnd, pick, key } from "./utils.js";
import { makeRelic } from "./items.js";
import { SPELL_LIBRARY, rankOf } from "./spells/index.js";
import { startBossBattle, makeBossName } from "./boss.js";

function carveRoom(room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) state.map[y][x] = 0;
  }
}

function carveCorridor(x1, y1, x2, y2) {
  let x = x1;
  let y = y1;
  while (x !== x2) { state.map[y][x] = 0; x += x < x2 ? 1 : -1; }
  while (y !== y2) { state.map[y][x] = 0; y += y < y2 ? 1 : -1; }
  state.map[y][x] = 0;
}

function intersects(a, b) {
  return !(a.x + a.w + 1 < b.x || b.x + b.w + 1 < a.x || a.y + a.h + 1 < b.y || b.y + b.h + 1 < a.y);
}

function randomFloorTile(room) {
  return { x: rnd(room.x + 1, room.x + room.w - 2), y: rnd(room.y + 1, room.y + room.h - 2) };
}

function placePickup(bucket, occupied, extra = {}) {
  const room = pick(state.rooms);
  let tries = 0;
  while (tries++ < 45) {
    const pos = randomFloorTile(room);
    const k = key(pos.x, pos.y);
    if (occupied.has(k)) continue;
    occupied.add(k);
    bucket.push({ ...pos, ...extra });
    break;
  }
}

function placeEnemy(occupied, isBoss) {
  const room = state.rooms[rnd(1, state.rooms.length - 1)] || state.rooms[0];
  const type = pick(ENEMY_TYPES);
  let tries = 0;
  while (tries++ < 45) {
    const pos = randomFloorTile(room);
    const k = key(pos.x, pos.y);
    if (occupied.has(k)) continue;
    occupied.add(k);
    const scale = 1 + Math.floor(state.floor / 5);
    state.enemies.push({
      x: pos.x,
      y: pos.y,
      type: isBoss ? "boss" : type.id,
      name: isBoss ? makeBossName() : type.id,
      hp: isBoss ? 32 + state.floor * 4 : type.hp + scale * 2,
      maxHp: isBoss ? 32 + state.floor * 4 : type.hp + scale * 2,
      atk: isBoss ? 8 + Math.floor(state.floor / 2) : type.atk + scale,
      baseAtk: isBoss ? 8 + Math.floor(state.floor / 2) : type.atk + scale,
      vision: isBoss ? 12 : type.vision,
      statuses: [],
      weak: isBoss ? [] : (type.weak || []),
      resist: isBoss ? [] : (type.resist || []),
      boss: isBoss
    });
    break;
  }
}

export function buildFloor() {
  state.map = Array.from({ length: rows }, () => Array(cols).fill(1));
  state.rooms = [];
  state.coins = [];
  state.potions = [];
  state.relicDrops = [];
  state.spellDrops = [];
  state.weaponDrops = [];
  state.enemies = [];
  state.stairs = null;
  state.floorEffects = [];
  state.bossAlive = false;

  const roomCount = rnd(9, 13);
  for (let i = 0; i < roomCount; i++) {
    const room = { x: rnd(1, cols - 8), y: rnd(1, rows - 7), w: rnd(4, 8), h: rnd(4, 7) };
    if (room.x + room.w >= cols - 1 || room.y + room.h >= rows - 1) continue;
    if (state.rooms.some((existing) => intersects(room, existing))) continue;

    carveRoom(room);
    if (state.rooms.length > 0) {
      const prev = state.rooms[state.rooms.length - 1];
      carveCorridor(prev.cx, prev.cy, room.x + Math.floor(room.w / 2), room.y + Math.floor(room.h / 2));
    }
    room.cx = room.x + Math.floor(room.w / 2);
    room.cy = room.y + Math.floor(room.h / 2);
    state.rooms.push(room);
  }

  if (!state.rooms.length) return buildFloor();

  const start = randomFloorTile(state.rooms[0]);
  state.player.x = start.x;
  state.player.y = start.y;

  state.stairs = randomFloorTile(state.rooms[state.rooms.length - 1]);
  const occupied = new Set([key(state.player.x, state.player.y), key(state.stairs.x, state.stairs.y)]);

  const enemyCount = 2 + Math.floor(state.floor * 1.1);
  for (let i = 0; i < enemyCount; i++) placeEnemy(occupied, false);

  if (state.floor % 5 === 0) state.bossAlive = true;

  for (let i = 0; i < 7 + Math.floor(state.floor * 1.2); i++) placePickup(state.coins, occupied);
  for (let i = 0; i < Math.max(2, Math.floor(state.floor / 3)); i++) placePickup(state.potions, occupied);
  for (let i = 0; i < 1 + Math.floor(state.floor / 8); i++) placePickup(state.relicDrops, occupied, { relic: makeRelic(state.floor) });
  if (state.floor > 2) placePickup(state.weaponDrops, occupied, { weapon: pick(WEAPON_POOL) });
  if (state.floor % 3 === 0) {
    const unknown = SPELL_LIBRARY.filter((spell) => !state.player.knownSpells.has(spell.id));
    const rankable = SPELL_LIBRARY.filter((sp) => state.player.knownSpells.has(sp.id) && rankOf(sp.id) < 3);
    const pool = unknown.length && Math.random() < 0.65 ? unknown : (rankable.length ? rankable : unknown);
    if (pool.length) placePickup(state.spellDrops, occupied, { spell: pick(pool) });
  }

  if (state.bossAlive) startBossBattle();
}
