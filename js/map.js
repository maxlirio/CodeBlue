import { cols, rows, ENEMY_TYPES, WEAPON_POOL } from "./config.js";
import { state } from "./state.js";
import { key } from "./utils.js";
import { srnd as rnd, spick as pick, srand, setSeed } from "./rng.js";
import { makeRelic } from "./items.js";
import { makeMagicScroll } from "./augments.js";
import { isFindQuestForFloor, consumePlantedFindQuestItem } from "./quests.js";
import { session } from "./net/session.js";
const isGuestActive = () => session.isGuestActive();
import { SPELL_LIBRARY, rankOf, isSpellForPlayer } from "./spells/index.js";
import { makeBossName } from "./boss.js";

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

function placeEnemy(occupied, isBoss) {
  const room = state.rooms[rnd(1, state.rooms.length - 1)] || state.rooms[0];
  const type = pick(ENEMY_TYPES);
  let tries = 0;
  while (tries++ < 45) {
    const pos = randomFloorTile(room);
    const k = key(pos.x, pos.y);
    if (occupied.has(k)) continue;
    occupied.add(k);
    const scale = 1 + Math.floor(state.floor / 4);
    const protocol = isBoss ? "boss" : type.protocol;
    const actInterval = isBoss ? 660 : type.actInterval;
    state.enemies.push({
      id: state.nextEnemyId++,
      x: pos.x,
      y: pos.y,
      type: isBoss ? "boss" : type.id,
      name: isBoss ? makeBossName() : type.id,
      hp: isBoss ? 48 + state.floor * 5 : type.hp + scale * 3,
      maxHp: isBoss ? 48 + state.floor * 5 : type.hp + scale * 3,
      atk: isBoss ? 10 + Math.floor(state.floor / 2) : type.atk + Math.ceil(scale * 1.3),
      baseAtk: isBoss ? 10 + Math.floor(state.floor / 2) : type.atk + Math.ceil(scale * 1.3),
      vision: isBoss ? 12 : type.vision,
      statuses: [],
      weak: isBoss ? [] : (type.weak || []),
      resist: isBoss ? [] : (type.resist || []),
      boss: isBoss,
      protocol,
      actInterval,
      actTimer: actInterval + Math.random() * 400
    });
    break;
  }
}

export function buildFloor() {
  state.map = Array.from({ length: rows }, () => Array(cols).fill(1));
  state.rooms = [];
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
  state.stairsUp = { x: start.x, y: start.y };
  state.interactables = [];
  state.buildings = [];
  state.trees = [];
  state.paths = [];
  state.fountains = [];
  state.props = [];
  state.chests = [];
  const occupied = new Set([key(state.player.x, state.player.y), key(state.stairs.x, state.stairs.y)]);

  // Enemies are still host-authoritative (guest mirrors via broadcast),
  // so guests skip enemy placement. Chests are now per-player — both
  // sides build their own with the same seeded RNG, so contents match,
  // but each player opens their own copy and gets their own loot.
  if (!isGuestActive()) {
    const enemyCount = 2 + Math.floor(state.floor * 1.1);
    for (let i = 0; i < enemyCount; i++) placeEnemy(occupied, false);

    if (state.floor % 5 === 0) {
      state.bossAlive = true;
      placeEnemy(occupied, true);
    }
  } else {
    state.bossAlive = state.floor % 5 === 0;
  }

  // Re-seed JUST for chest placement using a deterministic key. Host and
  // guest end up with identical chest positions and loot, even though
  // the host's RNG was advanced by enemy placement and the guest's
  // wasn't. Both clients open their own copies independently.
  setSeed(`${state.seed || "noseed"}:chests:${state.floor}`);
  const chestCount = 2 + Math.floor(state.floor / 3);
  for (let i = 0; i < chestCount; i++) placeChest(occupied);
}

function placeChest(occupied) {
  const room = pick(state.rooms);
  let tries = 0;
  while (tries++ < 45) {
    const pos = randomFloorTile(room);
    const k = key(pos.x, pos.y);
    if (occupied.has(k)) continue;
    occupied.add(k);
    state.chests.push({ id: `c${state.floor}-${state.chests.length + 1}`, x: pos.x, y: pos.y, opened: false, loot: rollChestLoot() });
    break;
  }
}

function rollChestLoot() {
  const loot = { gold: 15 + Math.floor(srand() * 20) + state.floor * 2 };
  // If a find-quest is targeting this floor, the first eligible chest carries
  // its prize.
  if (isFindQuestForFloor(state.floor)) {
    const item = consumePlantedFindQuestItem(state.floor);
    if (item) loot.questItem = item;
  }
  const r = srand();
  if (r < 0.32) loot.potion = true;
  else if (r < 0.56) loot.relic = makeRelic(state.floor);
  else if (r < 0.78) {
    const atCap = state.player.knownSpells.size >= 6;
    const eligible = SPELL_LIBRARY.filter(isSpellForPlayer);
    const unknown = atCap ? [] : eligible.filter((s) => !state.player.knownSpells.has(s.id));
    const rankable = eligible.filter((s) => state.player.knownSpells.has(s.id) && rankOf(s.id) < 3);
    const pool = unknown.length ? unknown : rankable;
    if (pool.length) loot.spell = pick(pool);
  }
  else if (r < 0.84) loot.scroll = makeMagicScroll();
  else if (r < 0.90) loot.weapon = pick(WEAPON_POOL);
  else if (r < 0.99) loot.spellPoints = 1 + Math.floor(state.floor / 5);
  return loot;
}

function placeBuilding(name, ox, oy, w, h, doorDx, doorDy, shopKind) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) state.map[oy + dy][ox + dx] = 1;
  }
  state.map[oy + doorDy][ox + doorDx] = 0;
  state.buildings.push({ x: ox, y: oy, w, h, shop: shopKind });
  state.interactables.push({
    x: ox + doorDx, y: oy + doorDy,
    kind: shopKind ? "shop" : "dungeon",
    shop: shopKind,
    name
  });
}

function placeFountain(x, y) {
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) state.map[y + dy][x + dx] = 1;
  }
  state.fountains.push({ x, y, w: 2, h: 2 });
}

function placeTree(x, y) {
  state.map[y][x] = 1;
  state.trees.push({ x, y });
}

function placePath(x, y) {
  if (state.map[y][x] === 0) state.paths.push({ x, y });
}

export function shopAt(x, y) {
  if (!state.buildings) return null;
  for (const b of state.buildings) {
    if (b.shop && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
      return b.shop;
    }
  }
  return null;
}

export function dungeonEntranceAt(x, y) {
  if (!state.buildings) return null;
  for (const b of state.buildings) {
    if (!b.shop && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
  }
  return false;
}

// Builds a small interior scene inside the canvas. Mutates state.map and friends.
// Player spawns near the south side; vendor sits center-back; exit rug at south center.
export function buildShopInterior(kind) {
  state.map = Array.from({ length: rows }, () => Array(cols).fill(1));
  state.rooms = [];
  state.enemies = [];
  state.interactables = [];
  state.buildings = [];
  state.trees = [];
  state.paths = [];
  state.fountains = [];
  state.props = [];
  state.chests = [];
  state.floorEffects = [];

  const w = 14, h = 10;
  const x0 = Math.floor((cols - w) / 2);
  const y0 = Math.floor((rows - h) / 2);
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) state.map[y][x] = 0;
  }
  state.rooms = [{ x: x0, y: y0, w, h, cx: x0 + Math.floor(w / 2), cy: y0 + Math.floor(h / 2) }];

  const cx = x0 + Math.floor(w / 2);
  const vendorPos = { x: cx, y: y0 + 2 };
  const exitPos = { x: cx, y: y0 + h - 1 };
  const counterY = y0 + 3;

  state.interactables.push({ x: vendorPos.x, y: vendorPos.y, kind: "vendor", shop: kind, name: "Vendor" });
  state.interactables.push({ x: exitPos.x, y: exitPos.y, kind: "shop_exit", name: "Exit" });

  state.shopInterior = {
    kind,
    bounds: { x0, y0, w, h },
    vendor: vendorPos,
    exit: exitPos,
    counterY,
    counterX0: x0 + 2,
    counterX1: x0 + w - 3,
    shelves: [
      { x: x0 + 1, y: y0 + 2 },
      { x: x0 + w - 2, y: y0 + 2 }
    ],
    banner: { x: cx - 1, y: y0 + 1 }
  };

  state.player.x = cx;
  state.player.y = y0 + h - 2;
}

export function buildTown() {
  state.map = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let y = 0; y < rows; y++) { state.map[y][0] = 1; state.map[y][cols - 1] = 1; }
  for (let x = 0; x < cols; x++) { state.map[0][x] = 1; state.map[rows - 1][x] = 1; }

  state.rooms = [{ x: 1, y: 1, w: cols - 2, h: rows - 2, cx: Math.floor(cols / 2), cy: Math.floor(rows / 2) }];
  state.enemies = [];
  state.floorEffects = [];
  state.bossAlive = false;
  state.stairs = null;
  state.stairsUp = null;
  state.interactables = [];
  state.buildings = [];
  state.trees = [];
  state.paths = [];
  state.fountains = [];
  state.props = [];
  state.chests = [];

  // Town layout: a north-south main street with a central plaza,
  // shops clustered along it instead of dropped in the four corners.
  // Cols: 0..27, Rows: 0..17.

  // North row of shops (top of map)
  placeBuilding("Blacksmith", 4,  1, 4, 4, 1, 3, "weapon");
  placeBuilding("Alchemist", 20, 1, 4, 4, 1, 3, "alchemist");
  // Enchanter — small roadside stand (south-facing), tucked beside the plaza
  placeBuilding("Enchanter", 12, 2, 4, 4, 1, 3, "enchanter");

  // South row of shops + dungeon
  placeBuilding("Arcanum",   4, 12, 4, 4, 1, 0, "arcanum");
  placeBuilding("Curios",   20, 12, 4, 4, 1, 0, "curio");
  placeBuilding("Dungeon Entrance", 12, 12, 4, 4, 1, 0, null);

  // Central plaza features
  placeFountain(13, 8);

  // Trees and decoration scattered like a real square
  placeTree(2, 5);  placeTree(9,  6);  placeTree(18, 6);  placeTree(25, 5);
  placeTree(2, 11); placeTree(9, 10);  placeTree(18, 10); placeTree(25, 11);
  placeTree(2, 9);  placeTree(25, 9);

  // Decorative props (lanterns, market stalls, signs, barrels)
  state.props = [
    // Lanterns flank the dungeon entrance and the main paths
    { kind: "lantern", x: 11, y: 11 },
    { kind: "lantern", x: 16, y: 11 },
    { kind: "lantern", x: 8,  y: 1  },
    { kind: "lantern", x: 19, y: 1  },
    { kind: "lantern", x: 8,  y: 16 },
    { kind: "lantern", x: 19, y: 16 },

    // Signposts near the shops
    { kind: "sign", x: 4, y: 6, label: "weapon"   },
    { kind: "sign", x: 20, y: 6, label: "alchemist" },
    { kind: "sign", x: 4, y: 11, label: "arcanum" },
    { kind: "sign", x: 20, y: 11, label: "curio"   },

    // Market clutter — barrels, crates around the plaza
    { kind: "barrel", x: 6, y: 8 },
    { kind: "crate",  x: 22, y: 8 },
    { kind: "crate",  x: 5, y: 7 },
    { kind: "barrel", x: 21, y: 7 },

    // Flower patches on the plaza
    { kind: "flowers", x: 11, y: 7 },
    { kind: "flowers", x: 16, y: 7 },
    { kind: "flowers", x: 11, y: 10 },
    { kind: "flowers", x: 16, y: 10 }
  ];

  // Roads
  // North-south main street
  for (let y = 1; y < rows - 1; y++) { placePath(13, y); placePath(14, y); }
  // East-west cross street through plaza row
  for (let x = 1; x < cols - 1; x++) { placePath(x, 8); placePath(x, 9); }

  // Door stubs from each building's door tile to the nearest road
  // North shops: door is at building.y + 3 (one tile south of building)
  // Blacksmith door (5, 4); Enchanter door (13, 5); Alchemist door (21, 4)
  for (let y = 5; y <= 7; y++) { placePath(5, y); placePath(21, y); }
  for (let y = 6; y <= 7; y++) { placePath(13, y); placePath(14, y); }
  // South shops: door is at building.y (top row of building)
  for (let y = 10; y <= 11; y++) { placePath(5, y); placePath(21, y); }
  for (let y = 10; y <= 11; y++) { placePath(13, y); placePath(14, y); }

  state.player.x = 14;
  state.player.y = 10;
}
