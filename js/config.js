export const tileSize = 24;
export const cols = 28;
export const rows = 18;
export const maxFloor = 15;

export const COLORS = {
  wall: "#1f1f3b",
  floor: "#2f2f4f",
  floorShade: "#3a3a61",
  coin: "#ffd166",
  potion: "#7bdff2",
  relic: "#fca5ff",
  spell: "#6be4ff",
  weapon: "#ffc46e",
  stairs: "#ffcf5c",
  shadow: "rgba(0,0,0,0.3)",
  fog: "rgba(4,4,10,0.55)"
};

export const CLASS_OPTIONS = [
  { name: "Knight", hp: 36, mana: 10, atk: 6, spellPower: 1, weapon: "Iron Longsword",
    startSpells: ["shieldwall", "cleave", "warcry"] },
  { name: "Mage",   hp: 24, mana: 20, atk: 4, spellPower: 4, weapon: "Rune Staff",
    startSpells: ["arcanemissile", "glacialprison", "firewall"] },
  { name: "Ranger", hp: 29, mana: 14, atk: 5, spellPower: 2, weapon: "Hunter Spear",
    startSpells: ["huntersmark", "trapwire", "vault"] }
];

export const WEAPON_POOL = [
  { name: "Recurve Bow",     atk: 2, mana:  0, type: "bow" },
  { name: "War Glaive",      atk: 4, mana: -1, type: "glaive" },
  { name: "Knight Sword",    atk: 3, mana:  0, type: "sword" },
  { name: "Spiked Mace",     atk: 4, mana: -1, type: "mace" },
  { name: "Moonlit Rapier",  atk: 2, mana:  2, type: "sword" },
  { name: "Runic Axe",       atk: 5, mana: -2, type: "axe" },
  { name: "Sapphire Wand",   atk: 1, mana:  4, type: "wand" }
];

// sprite: array of [color, dx, dy, w, h] rects drawn within a tile
export const ENEMY_TYPES = [
  { id: "slime",    hp: 7,  atk: 2, vision: 7,  weak: ["fire"],               resist: ["frost"],
    sprite: [["#4bc35f", 5, 12, 14, 8], ["#8ff59a", 7, 10, 10, 3]] },
  { id: "goblin",   hp: 9,  atk: 3, vision: 8,  weak: ["life"],               resist: [],
    sprite: [["#5a8f3d", 8, 7, 8, 11], ["#b48a5a", 9, 4, 6, 4]] },
  { id: "bat",      hp: 6,  atk: 3, vision: 10, weak: ["storm"],              resist: [],
    sprite: [["#7a61cc", 4, 10, 5, 4], ["#7a61cc", 9, 8, 6, 6], ["#7a61cc", 15, 10, 5, 4]] },
  { id: "skeleton", hp: 10, atk: 4, vision: 8,  weak: ["storm", "life"],      resist: ["frost"],
    sprite: [["#e7e7e7", 9, 3, 6, 5], ["#e7e7e7", 8, 9, 8, 9]] },
  { id: "imp",      hp: 8,  atk: 5, vision: 9,  weak: ["frost"],              resist: ["fire"],
    sprite: [["#e4734f", 8, 7, 8, 10], ["#ff4c4c", 6, 5, 2, 4], ["#ff4c4c", 16, 5, 2, 4]] },
  { id: "wolf",     hp: 12, atk: 5, vision: 11, weak: ["fire"],               resist: [],
    sprite: [["#8d8d99", 5, 10, 14, 6], ["#8d8d99", 14, 7, 5, 4]] },
  { id: "orc",      hp: 15, atk: 6, vision: 8,  weak: ["storm"],              resist: ["fire"],
    sprite: [["#4f7a32", 7, 6, 10, 12], ["#c89a6d", 9, 3, 6, 4]] },
  { id: "wraith",   hp: 11, atk: 7, vision: 12, weak: ["life", "arcane"],     resist: ["storm", "frost"],
    sprite: [["#9bc4ff", 8, 5, 8, 12], ["#e8f2ff", 10, 3, 4, 3]] }
];

export const BOSS_SPRITE = [["#8b173f", 6, 5, 12, 14], ["#f2d9d9", 9, 2, 6, 4]];

export const HERO_SPRITE = [
  ["#2b2d42", 8, 3, 8, 3],
  ["#f1c27d", 9, 6, 6, 5],
  ["#c83232", 8, 11, 8, 8],
  ["#6c8f3d", 7, 13, 2, 6],
  ["#6c8f3d", 16, 13, 2, 6],
  ["#c9c9d4", 15, 12, 4, 2]
];

export const PORTRAIT_SPRITE = [
  ["#101028", 0, 0, 16, 16],
  ["#2b2d42", 6, 2, 4, 2],
  ["#f1c27d", 6, 4, 4, 4],
  ["#c83232", 5, 8, 6, 6],
  ["#6c8f3d", 4, 10, 1, 3],
  ["#6c8f3d", 11, 10, 1, 3]
];

export const BOSS_PORTRAIT_SPRITE = [
  ["#101028", 0, 0, 96, 96],
  ["#8b173f", 26, 24, 44, 52],
  ["#f2d9d9", 38, 14, 20, 14],
  ["#ff5dc1", 20, 50, 12, 8],
  ["#ff5dc1", 64, 50, 12, 8]
];

export const SCHOOL_COLORS = {
  fire: "#ff7a3a", frost: "#7dd3ff", storm: "#c79bff",
  life: "#84f6a6", arcane: "#ff9cf0"
};

export const STATUS_DEFS = {
  burn:  { tag: "B", color: "#ff7a3a" },
  chill: { tag: "C", color: "#7dd3ff" },
  shock: { tag: "S", color: "#c79bff" },
  stun:  { tag: "Z", color: "#ffffff" },
  regen: { tag: "+", color: "#84f6a6" },
  ward:  { tag: "W", color: "#7bdff2" },
  mark:  { tag: "M", color: "#fca5ff" }
};
