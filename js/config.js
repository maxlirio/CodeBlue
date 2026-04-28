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
  stairsUp: "#7dd3ff",
  townFloor: "#2f4a2a",
  townFloorShade: "#3a5a32",
  townPathA: "#6a5f48",
  townPathB: "#7a6f58",
  shopWeapon: "#ffc46e",
  shopAlchemist: "#7bdff2",
  shopArcanum: "#6be4ff",
  shopCurio: "#fca5ff",
  shadow: "rgba(0,0,0,0.3)",
  fog: "rgba(4,4,10,0.55)"
};

export const CLASS_OPTIONS = [
  { name: "Knight", desc: "Stalwart front-liner. Cleaves through crowds.",
    hp: 36, mana: 10, atk: 6, spellPower: 1,
    weapon: "Iron Longsword", weaponType: "sword",
    startSpells: ["shieldwall", "cleave", "warcry"] },
  { name: "Mage", desc: "Thin-skinned conjurer with elemental reach. Few weapons, many spells.",
    hp: 24, mana: 20, atk: 4, spellPower: 4,
    weapon: "Rune Staff", weaponType: "wand",
    maxWeapons: 1, maxSpellSlots: 6,
    startSpells: ["arcanemissile", "glacialprison", "firewall"] },
  { name: "Ranger", desc: "Woodland stalker. Bow at range, dagger up close.",
    hp: 29, mana: 14, atk: 5, spellPower: 2,
    weapon: "Longbow", weaponType: "bow",
    startArrows: 24,
    extraItems: [{ name: "Hunting Dagger", type: "sword" }],
    startSpells: ["huntersmark", "trapwire", "vault"] },
  { name: "Rogue", desc: "Glass-cannon striker. Blinks in, burns, fades out.",
    hp: 24, mana: 12, atk: 7, spellPower: 2,
    weapon: "Shadow Dagger", weaponType: "sword",
    startSpells: ["blink", "ember", "echo"] },
  { name: "Paladin", desc: "Holy warrior. Buffs allies, smites unholy.",
    hp: 33, mana: 14, atk: 5, spellPower: 2,
    weapon: "Blessed Mace", weaponType: "mace",
    startSpells: ["shieldwall", "warcry", "mend"] },
  { name: "Necromancer", desc: "Drains the living to feed the dark.",
    hp: 22, mana: 22, atk: 3, spellPower: 4,
    weapon: "Bone Staff", weaponType: "wand",
    startSpells: ["drain", "chain", "glacialprison"] },
  { name: "Druid", desc: "Nature's hand. Thorns, frost, and renewal.",
    hp: 28, mana: 16, atk: 4, spellPower: 3,
    weapon: "Thorn Staff", weaponType: "wand",
    startSpells: ["thorn", "mend", "frost"] },
  { name: "Warlock", desc: "Pact-sworn. Unleashes chaos at a cost.",
    hp: 23, mana: 20, atk: 3, spellPower: 4,
    weapon: "Hex Staff", weaponType: "wand",
    startSpells: ["meteor", "arcanemissile", "firewall"] }
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
  { id: "slime",    hp: 8,  atk: 3, vision: 8,  weak: ["fire"],               resist: ["frost"],
    protocol: "slime",    actInterval: 820,
    sprite: [["#4bc35f", 5, 12, 14, 8], ["#8ff59a", 7, 10, 10, 3]] },
  { id: "goblin",   hp: 10, atk: 4, vision: 9,  weak: ["life"],               resist: [],
    protocol: "goblin",   actInterval: 600,
    sprite: [["#5a8f3d", 8, 7, 8, 11], ["#b48a5a", 9, 4, 6, 4]] },
  { id: "bat",      hp: 7,  atk: 3, vision: 11, weak: ["storm"],              resist: [],
    protocol: "bat",      actInterval: 360,
    sprite: [["#7a61cc", 4, 10, 5, 4], ["#7a61cc", 9, 8, 6, 6], ["#7a61cc", 15, 10, 5, 4]] },
  { id: "skeleton", hp: 11, atk: 5, vision: 9,  weak: ["storm", "life"],      resist: ["frost"],
    protocol: "skeleton", actInterval: 640,
    sprite: [["#e7e7e7", 9, 3, 6, 5], ["#e7e7e7", 8, 9, 8, 9]] },
  { id: "imp",      hp: 9,  atk: 5, vision: 10, weak: ["frost"],              resist: ["fire"],
    protocol: "imp",      actInterval: 520,
    sprite: [["#e4734f", 8, 7, 8, 10], ["#ff4c4c", 6, 5, 2, 4], ["#ff4c4c", 16, 5, 2, 4]] },
  { id: "wolf",     hp: 13, atk: 6, vision: 12, weak: ["fire"],               resist: [],
    protocol: "wolf",     actInterval: 380,
    sprite: [["#8d8d99", 5, 10, 14, 6], ["#8d8d99", 14, 7, 5, 4]] },
  { id: "orc",      hp: 17, atk: 7, vision: 9,  weak: ["storm"],              resist: ["fire"],
    protocol: "orc",      actInterval: 760,
    sprite: [["#4f7a32", 7, 6, 10, 12], ["#c89a6d", 9, 3, 6, 4]] },
  { id: "wraith",   hp: 12, atk: 8, vision: 13, weak: ["life", "arcane"],     resist: ["storm", "frost"],
    protocol: "wraith",   actInterval: 540,
    sprite: [["#9bc4ff", 8, 5, 8, 12], ["#e8f2ff", 10, 3, 4, 3]] },
  // New enemies — added with fresh behavior protocols
  { id: "spider",   hp: 9,  atk: 4, vision: 10, weak: ["fire"],               resist: [],
    protocol: "spider",   actInterval: 780,
    sprite: [
      ["#2a1a3a", 8, 9, 8, 6],     // body
      ["#5b3a8e", 10, 7, 4, 4],    // head
      ["#ff5dc1", 10, 8, 1, 1], ["#ff5dc1", 13, 8, 1, 1], // eyes
      ["#1a0a14", 4, 10, 3, 1], ["#1a0a14", 17, 10, 3, 1],
      ["#1a0a14", 4, 13, 3, 1], ["#1a0a14", 17, 13, 3, 1],
      ["#1a0a14", 6, 16, 1, 2], ["#1a0a14", 17, 16, 1, 2]
    ] },
  { id: "ghoul",    hp: 18, atk: 6, vision: 8,  weak: ["life"],               resist: ["frost"],
    protocol: "ghoul",    actInterval: 700,
    sprite: [
      ["#5a7a4d", 8, 4, 8, 5],     // head
      ["#3a5a2d", 8, 4, 8, 1],
      ["#1a0a08", 9, 6, 1, 1], ["#1a0a08", 14, 6, 1, 1], // eyes
      ["#a8323e", 10, 8, 4, 1],    // bloody mouth
      ["#5a7a4d", 7, 9, 10, 8],    // torso
      ["#3a5a2d", 7, 9, 10, 1],
      ["#5a7a4d", 5, 10, 2, 4], ["#5a7a4d", 17, 10, 2, 4],  // arms
      ["#a8323e", 6, 14, 1, 1], ["#a8323e", 17, 14, 1, 1],  // bloodied claws
      ["#5a7a4d", 9, 17, 2, 3], ["#5a7a4d", 13, 17, 2, 3]   // legs
    ] },
  { id: "shaman",   hp: 14, atk: 4, vision: 11, weak: ["arcane"],             resist: ["storm"],
    protocol: "shaman",   actInterval: 700,
    sprite: [
      ["#3e9e9e", 8, 1, 8, 4],     // hood top
      ["#1f4a4a", 8, 4, 8, 1],
      ["#d8a478", 9, 5, 6, 4],     // face
      ["#84f6a6", 10, 7, 1, 1], ["#84f6a6", 13, 7, 1, 1], // glowing eyes
      ["#3e9e9e", 7, 9, 10, 9],    // robe
      ["#1f4a4a", 7, 17, 10, 1],
      ["#5c3a1a", 17, 4, 1, 14],   // staff
      ["#84f6a6", 16, 3, 3, 3],    // staff orb
      ["#cefcdb", 17, 4, 1, 1]
    ] }
];

export const BOSS_SPRITE = [["#8b173f", 6, 5, 12, 14], ["#f2d9d9", 9, 2, 6, 4]];

export const HERO_SPRITES = {
  Knight: [
    ["#b42d2d", 10, 0, 4, 3],
    ["#6e7380", 8, 3, 8, 3],
    ["#3a3a44", 9, 4, 6, 1],
    ["#f1c27d", 9, 6, 6, 4],
    ["#2a2a30", 10, 8, 4, 1],
    ["#b42d2d", 8, 10, 8, 8],
    ["#ffd166", 11, 12, 2, 4],
    ["#4e5260", 4, 10, 3, 8],
    ["#2a2a30", 4, 10, 3, 1],
    ["#4e5260", 7, 13, 2, 6],
    ["#4e5260", 16, 13, 2, 6],
    ["#e8e8ec", 17, 11, 2, 8],
    ["#c0c0c8", 16, 11, 4, 1]
  ],
  Mage: [
    ["#ffd54a", 17, 0, 4, 3],
    ["#5b3a8e", 18, 2, 2, 10],
    ["#5b3a8e", 12, 1, 4, 4],
    ["#4a2a72", 10, 4, 8, 2],
    ["#5b3a8e", 8, 6, 10, 2],
    ["#ffd54a", 13, 3, 2, 2],
    ["#ecd2b2", 10, 8, 6, 4],
    ["#3a56a8", 8, 12, 8, 4],
    ["#2d3a5e", 6, 16, 12, 4],
    ["#1a2a44", 10, 15, 4, 5]
  ],
  Ranger: [
    // Bow (replaces the staff)
    ["#6b4a2c", 5, 4, 1, 14],   // bow shaft
    ["#a87a4d", 5, 9, 1, 4],    // grip highlight
    ["#6b4a2c", 4, 3, 1, 2],    // upper tip
    ["#6b4a2c", 4, 18, 1, 2],   // lower tip
    ["#3a2a1a", 4, 3, 1, 1],    // top knock dark
    ["#3a2a1a", 4, 19, 1, 1],   // bottom knock dark
    ["#e8d8a4", 3, 5, 1, 12],   // bowstring
    // Body
    ["#3e6b3e", 9, 3, 6, 3],
    ["#2a4a2a", 8, 4, 2, 4],
    ["#d8a478", 10, 6, 4, 4],
    ["#6c8f3d", 8, 10, 8, 6],
    ["#4a6b1e", 8, 14, 8, 1],
    ["#6b4a2c", 16, 10, 2, 6],
    ["#c8a878", 16, 8, 1, 3],
    ["#6b4a2c", 9, 16, 2, 4],
    ["#6b4a2c", 13, 16, 2, 4]
  ],
  Rogue: [
    ["#1f1f28", 10, 1, 4, 2],
    ["#1f1f28", 8, 3, 8, 4],
    ["#2a2a35", 7, 5, 2, 3],
    ["#2a2a35", 15, 5, 2, 3],
    ["#6e7380", 10, 7, 4, 3],
    ["#c43232", 10, 8, 1, 1],
    ["#c43232", 13, 8, 1, 1],
    ["#1a1a22", 6, 10, 12, 10],
    ["#0a0a10", 6, 18, 12, 2],
    ["#8b8b95", 4, 8, 2, 5],
    ["#b4b4c0", 3, 8, 4, 1],
    ["#8b8b95", 18, 8, 2, 5],
    ["#b4b4c0", 17, 8, 4, 1]
  ],
  Paladin: [
    ["#ffd166", 9, 0, 6, 1],
    ["#e8d68a", 8, 2, 8, 4],
    ["#e8d68a", 5, 3, 3, 2],
    ["#e8d68a", 16, 3, 3, 2],
    ["#f1c27d", 9, 6, 6, 4],
    ["#e8e8ec", 8, 10, 8, 8],
    ["#ffd166", 11, 12, 2, 4],
    ["#d6a13a", 3, 10, 4, 8],
    ["#a07620", 4, 13, 2, 2],
    ["#d6a13a", 7, 16, 2, 4],
    ["#d6a13a", 16, 16, 2, 4],
    ["#e8e8ec", 19, 8, 2, 10],
    ["#ffd166", 17, 6, 4, 2]
  ],
  Necromancer: [
    ["#c79bff", 16, 0, 4, 3],
    ["#fca5ff", 17, 1, 2, 1],
    ["#2a1a3e", 18, 1, 2, 18],
    ["#2a1a3e", 8, 3, 8, 4],
    ["#e4d8d4", 10, 7, 4, 4],
    ["#0a0a10", 10, 8, 1, 1],
    ["#0a0a10", 13, 8, 1, 1],
    ["#1f1f2e", 7, 10, 10, 9],
    ["#0a0a14", 8, 18, 8, 2],
    ["#1f1f2e", 7, 19, 2, 1],
    ["#1f1f2e", 11, 19, 2, 1],
    ["#1f1f2e", 15, 19, 2, 1]
  ],
  Druid: [
    ["#a08060", 8, 1, 1, 4],
    ["#a08060", 7, 3, 2, 1],
    ["#a08060", 6, 1, 1, 2],
    ["#a08060", 15, 1, 1, 4],
    ["#a08060", 15, 3, 2, 1],
    ["#a08060", 17, 1, 1, 2],
    ["#4a3220", 9, 4, 6, 2],
    ["#d8a478", 10, 6, 4, 4],
    ["#4a6b2a", 8, 10, 8, 7],
    ["#84f6a6", 7, 11, 2, 2],
    ["#84f6a6", 15, 11, 2, 2],
    ["#6b4a2c", 9, 17, 2, 3],
    ["#6b4a2c", 13, 17, 2, 3],
    ["#6b4a2c", 19, 4, 2, 16],
    ["#84f6a6", 17, 2, 4, 3],
    ["#4a6b2a", 18, 5, 2, 1]
  ],
  Warlock: [
    ["#3a1a0a", 7, 0, 2, 4],
    ["#3a1a0a", 15, 0, 2, 4],
    ["#1a0a0a", 8, 3, 8, 3],
    ["#1a0a0a", 7, 5, 10, 1],
    ["#d8a878", 9, 7, 6, 4],
    ["#ff5dc1", 10, 8, 1, 1],
    ["#ff5dc1", 13, 8, 1, 1],
    ["#6e1a1a", 7, 11, 10, 7],
    ["#ff5dc1", 11, 14, 2, 2],
    ["#3a0a0a", 7, 18, 2, 2],
    ["#3a0a0a", 10, 18, 2, 2],
    ["#3a0a0a", 14, 18, 2, 2],
    ["#1a0a0a", 18, 8, 2, 3],
    ["#ff5dc1", 17, 7, 4, 3]
  ]
};

export const PORTRAIT_SPRITES = {
  Knight: [
    ["#101028", 0, 0, 16, 16],
    ["#6e7380", 6, 2, 4, 2],
    ["#f1c27d", 6, 4, 4, 4],
    ["#b42d2d", 5, 8, 6, 6],
    ["#4e5260", 4, 10, 1, 3],
    ["#4e5260", 11, 10, 1, 3]
  ],
  Mage: [
    ["#101028", 0, 0, 16, 16],
    ["#5b3a8e", 5, 1, 6, 3],
    ["#ecd2b2", 6, 4, 4, 4],
    ["#3a56a8", 5, 8, 6, 6],
    ["#2d3a5e", 4, 10, 1, 3],
    ["#2d3a5e", 11, 10, 1, 3]
  ],
  Ranger: [
    ["#101028", 0, 0, 16, 16],
    ["#3e6b3e", 6, 2, 4, 2],
    ["#d8a478", 6, 4, 4, 4],
    ["#6c8f3d", 5, 8, 6, 6],
    ["#6b4a2c", 4, 10, 1, 3],
    ["#6b4a2c", 11, 10, 1, 3]
  ],
  Rogue: [
    ["#101028", 0, 0, 16, 16],
    ["#1f1f28", 5, 2, 6, 3],
    ["#6e7380", 6, 5, 4, 3],
    ["#2a2a35", 5, 8, 6, 6],
    ["#3c2a2a", 4, 10, 1, 3],
    ["#3c2a2a", 11, 10, 1, 3]
  ],
  Paladin: [
    ["#101028", 0, 0, 16, 16],
    ["#e8d68a", 6, 2, 4, 2],
    ["#f1c27d", 6, 4, 4, 4],
    ["#e8e8ec", 5, 8, 6, 6],
    ["#d6a13a", 4, 10, 1, 3],
    ["#d6a13a", 11, 10, 1, 3]
  ],
  Necromancer: [
    ["#101028", 0, 0, 16, 16],
    ["#2a1a3e", 6, 2, 4, 2],
    ["#e4d8d4", 6, 4, 4, 4],
    ["#1f1f2e", 5, 8, 6, 6],
    ["#c79bff", 4, 10, 1, 3],
    ["#c79bff", 11, 10, 1, 3]
  ],
  Druid: [
    ["#101028", 0, 0, 16, 16],
    ["#4a3220", 6, 2, 4, 2],
    ["#d8a478", 6, 4, 4, 4],
    ["#4a6b2a", 5, 8, 6, 6],
    ["#84f6a6", 4, 10, 1, 3],
    ["#84f6a6", 11, 10, 1, 3]
  ],
  Warlock: [
    ["#101028", 0, 0, 16, 16],
    ["#1a0a0a", 5, 1, 6, 3],
    ["#d8a878", 6, 4, 4, 4],
    ["#6e1a1a", 5, 8, 6, 6],
    ["#ff5dc1", 4, 10, 1, 3],
    ["#ff5dc1", 11, 10, 1, 3]
  ]
};

export const HERO_SPRITE = HERO_SPRITES.Knight;
export const PORTRAIT_SPRITE = PORTRAIT_SPRITES.Knight;

export const COIN_SPRITE = [
  ["#a26a0a", 8, 9, 8, 6],
  ["#ffd166", 9, 8, 6, 6],
  ["#fff4c0", 10, 9, 2, 2]
];

export const POTION_SPRITE = [
  ["#b4b4c0", 10, 4, 4, 2],
  ["#8a8a96", 11, 6, 2, 2],
  ["#2d5b68", 7, 8, 10, 10],
  ["#7bdff2", 8, 9, 8, 8],
  ["#a8f3ff", 9, 10, 2, 3],
  ["#4ab4c5", 8, 17, 8, 1]
];

export const RELIC_SPRITE = [
  ["#7a2a8e", 9, 6, 6, 2],
  ["#b560c9", 8, 7, 8, 2],
  ["#fca5ff", 7, 9, 10, 6],
  ["#fff0ff", 9, 10, 2, 2],
  ["#b560c9", 8, 15, 8, 2],
  ["#5a1a6e", 9, 17, 6, 1]
];

function makeShopSprite(c) {
  return [
    // Roof (stepped pyramid, 4 layers)
    [c.roof,       40, 4, 16, 4],
    [c.roof,       32, 8, 32, 4],
    [c.roof,       24, 12, 48, 4],
    [c.roof,       16, 16, 64, 4],
    // Roof tile lines
    [c.roofDark,   34, 10, 28, 1],
    [c.roofDark,   26, 14, 44, 1],
    [c.roofDark,   18, 18, 60, 1],
    // Eave shadow
    [c.roofDark,   16, 20, 64, 3],
    // Main walls
    [c.wall,       14, 23, 68, 61],
    // Right wall shadow
    [c.wallDark,   74, 23, 8, 61],
    // Brick seams
    [c.wallDark,   14, 40, 68, 1],
    [c.wallDark,   14, 62, 68, 1],
    // Foundation
    [c.foundation, 14, 78, 68, 6],
    // Windows (3 across)
    [c.windowFrame, 20, 30, 14, 14],
    [c.windowFrame, 41, 30, 14, 14],
    [c.windowFrame, 62, 30, 14, 14],
    [c.windowGlow,  22, 32, 10, 10],
    [c.windowGlow,  43, 32, 10, 10],
    [c.windowGlow,  64, 32, 10, 10],
    // Window crossbars
    [c.windowFrame, 26, 30, 2, 14],
    [c.windowFrame, 47, 30, 2, 14],
    [c.windowFrame, 68, 30, 2, 14],
    [c.windowFrame, 20, 36, 14, 2],
    [c.windowFrame, 41, 36, 14, 2],
    [c.windowFrame, 62, 36, 14, 2],
    // Sign board above door
    [c.signBoard,   34, 50, 28, 6],
    [c.signBoard,   36, 48, 24, 2],
    [c.roofDark,    34, 55, 28, 1],
    [c.sign,        42, 52, 12, 2],
    // Door
    [c.doorFrame,   40, 58, 16, 26],
    [c.door,        42, 60, 12, 24],
    [c.doorFrame,   42, 70, 12, 1],
    [c.handle,      51, 71, 2, 2]
  ];
}

const SHOP_PALETTES = {
  weapon: {
    roof: "#8a3030", roofDark: "#5a1f1f",
    wall: "#8a8a8a", wallDark: "#5a5a5a",
    foundation: "#3a3a3a",
    door: "#4a2e20", doorFrame: "#2a1a10",
    windowFrame: "#4a2e20", windowGlow: "#ffc46e",
    signBoard: "#5a3020", sign: "#ffd166", handle: "#ffd166"
  },
  alchemist: {
    roof: "#3e9e9e", roofDark: "#1f5a5a",
    wall: "#5a7a9e", wallDark: "#2d4a6a",
    foundation: "#1f2a3a",
    door: "#4a2e20", doorFrame: "#2a1a10",
    windowFrame: "#4a2e20", windowGlow: "#a8f3ff",
    signBoard: "#2d4a6a", sign: "#7bdff2", handle: "#7bdff2"
  },
  arcanum: {
    roof: "#6b3a9e", roofDark: "#3a1a5e",
    wall: "#3a4e82", wallDark: "#1a2a52",
    foundation: "#0a1a3a",
    door: "#2a1a4e", doorFrame: "#1a0a2e",
    windowFrame: "#2a1a4e", windowGlow: "#c79bff",
    signBoard: "#2a1a4e", sign: "#6be4ff", handle: "#6be4ff"
  },
  curio: {
    roof: "#9b3a7e", roofDark: "#5a1a4a",
    wall: "#6a4a58", wallDark: "#3a2a30",
    foundation: "#2a1a20",
    door: "#3a2a30", doorFrame: "#1a0a10",
    windowFrame: "#3a2a30", windowGlow: "#fca5ff",
    signBoard: "#3a2a30", sign: "#fca5ff", handle: "#fca5ff"
  },
  enchanter: {
    roof: "#3a8a8a", roofDark: "#1f4a4a",
    wall: "#4a4a6a", wallDark: "#2a2a3a",
    foundation: "#1a1a2a",
    door: "#2a1a4e", doorFrame: "#1a0a2e",
    windowFrame: "#2a1a4e", windowGlow: "#84f6a6",
    signBoard: "#2a1a4e", sign: "#84f6a6", handle: "#84f6a6"
  }
};

const ENCHANTER_STAND_SPRITE = [
  // Wooden support posts
  ["#5c3a1a", 18, 22, 4, 58],
  ["#5c3a1a", 74, 22, 4, 58],
  // Cross-pole holding the awning
  ["#7a4a2a", 16, 18, 64, 4],
  // Striped canopy (cream base)
  ["#e8d8a4", 14, 8, 68, 14],
  // Red stripes
  ["#a8323e", 18, 8, 6, 14],
  ["#a8323e", 32, 8, 6, 14],
  ["#a8323e", 46, 8, 6, 14],
  ["#a8323e", 60, 8, 6, 14],
  ["#a8323e", 74, 8, 4, 14],
  // Canopy edges
  ["#3a1a14", 14, 6, 68, 2],
  ["#3a1a14", 14, 20, 68, 2],
  // Scalloped fringe under the awning
  ["#a8323e", 18, 22, 6, 3],
  ["#a8323e", 30, 22, 6, 3],
  ["#a8323e", 42, 22, 6, 3],
  ["#a8323e", 54, 22, 6, 3],
  ["#a8323e", 66, 22, 6, 3],
  ["#a8323e", 76, 22, 4, 3],
  // Sign hanging from the canopy
  ["#3a2a1a", 36, 26, 24, 10],
  ["#7a4a2a", 38, 28, 20, 6],
  ["#84f6a6", 44, 30, 2, 2],
  ["#84f6a6", 48, 30, 2, 2],
  ["#84f6a6", 52, 30, 2, 2],
  // Counter (wooden table)
  ["#7a4a2a", 12, 56, 72, 6],
  ["#5c3a1a", 12, 62, 72, 2],
  ["#3a2a1a", 12, 64, 72, 16],
  ["#5c3a1a", 12, 64, 2, 16],
  ["#5c3a1a", 82, 64, 2, 16],
  ["#1a0e08", 12, 80, 72, 2],
  // Glowing enchant orb on the counter (with halo)
  ["#1f4a4a", 38, 38, 20, 18],
  ["#3a8a8a", 40, 40, 16, 14],
  ["#84f6a6", 42, 42, 12, 10],
  ["#cefcdb", 46, 44, 4, 3],
  // Orb stand
  ["#5c3a1a", 44, 54, 8, 4],
  ["#3a2a1a", 44, 58, 8, 1],
  // Magical sparkles around the orb
  ["#84f6a6", 30, 36, 2, 2],
  ["#84f6a6", 64, 40, 2, 2],
  ["#cefcdb", 34, 44, 2, 2],
  ["#cefcdb", 60, 32, 2, 2]
];

export const BUILDING_SPRITES = {
  weapon:    makeShopSprite(SHOP_PALETTES.weapon),
  alchemist: makeShopSprite(SHOP_PALETTES.alchemist),
  arcanum:   makeShopSprite(SHOP_PALETTES.arcanum),
  curio:     makeShopSprite(SHOP_PALETTES.curio),
  enchanter: ENCHANTER_STAND_SPRITE
};

// Interior palettes for shop interior scenes
export const SHOP_INTERIOR_PALETTES = {
  weapon:    { floorA: "#5c3a1a", floorB: "#6a4a28", wall: "#3a2a1a", wallTop: "#7a4a2a", accent: "#ffd166", banner: "#a8323e" },
  alchemist: { floorA: "#2d4a6a", floorB: "#3a5a78", wall: "#1a2a3e", wallTop: "#3a5a78", accent: "#7bdff2", banner: "#3e9e9e" },
  arcanum:   { floorA: "#2a1a4e", floorB: "#3a2a5e", wall: "#1a0a2e", wallTop: "#4a3a6e", accent: "#c79bff", banner: "#6b3a9e" },
  curio:     { floorA: "#3a2a30", floorB: "#4a3a40", wall: "#1a0a10", wallTop: "#5a4a50", accent: "#fca5ff", banner: "#9b3a7e" },
  enchanter: { floorA: "#1f4a4a", floorB: "#2f5a5a", wall: "#0f2a2a", wallTop: "#3a8a8a", accent: "#84f6a6", banner: "#a8323e" }
};

// Vendor sprites — 24x24, drawn at vendor tile
export const VENDOR_SPRITES = {
  weapon: [
    // Burly blacksmith — bald, leather apron, hammer
    ["#c89a6d", 9, 2, 6, 5],     // head
    ["#a87a4d", 9, 2, 6, 1],     // brow
    ["#1a1a1a", 10, 4, 1, 1], ["#1a1a1a", 13, 4, 1, 1], // eyes
    ["#a87a4d", 9, 7, 6, 1],     // beard line
    ["#3a2a1a", 9, 8, 6, 2],     // collar
    ["#5c3a1a", 7, 10, 10, 8],   // apron
    ["#3a2a1a", 7, 10, 10, 1],   // apron strap
    ["#c89a6d", 6, 11, 1, 4], ["#c89a6d", 17, 11, 1, 4], // arms
    ["#7a4a2a", 16, 13, 4, 5],   // hammer head visible
    ["#3a2a1a", 18, 14, 1, 4]    // hammer handle hint
  ],
  alchemist: [
    // Eccentric herbalist — green hood, vial
    ["#3e6b3e", 8, 1, 8, 4],     // hood top
    ["#2a4a2a", 8, 4, 8, 1],     // hood shadow
    ["#d8a478", 9, 5, 6, 4],     // face
    ["#1a1a1a", 10, 7, 1, 1], ["#1a1a1a", 13, 7, 1, 1], // eyes
    ["#3e6b3e", 7, 9, 10, 9],    // robe
    ["#2a4a2a", 7, 17, 10, 1],   // robe hem
    ["#7bdff2", 14, 12, 3, 4],   // glowing vial
    ["#a8f3ff", 15, 13, 1, 2],   // vial highlight
    ["#5a3a20", 14, 11, 3, 1]    // vial cork
  ],
  arcanum: [
    // Robed scholar — pointed hat, glasses
    ["#2a1a4e", 9, 0, 6, 1],     // hat tip
    ["#2a1a4e", 8, 1, 8, 2],     // hat brim base
    ["#4a3a6e", 7, 3, 10, 1],    // hat brim wide
    ["#d8a478", 9, 4, 6, 4],     // face
    ["#1a1a1a", 10, 6, 1, 1], ["#1a1a1a", 13, 6, 1, 1], // eyes
    ["#c79bff", 9, 5, 1, 1], ["#c79bff", 14, 5, 1, 1], // glasses glints
    ["#6b3a9e", 7, 8, 10, 10],   // robe
    ["#4a1a7a", 7, 17, 10, 1],   // robe hem
    ["#fca5ff", 14, 12, 2, 2]    // glowing scroll
  ],
  curio: [
    // Mysterious traveler — wide hat, scarf, gem
    ["#1a0a10", 6, 2, 12, 2],    // wide brim
    ["#3a2a30", 8, 0, 8, 3],     // hat top
    ["#d8a478", 9, 4, 6, 4],     // face
    ["#1a1a1a", 10, 6, 1, 1], ["#1a1a1a", 13, 6, 1, 1], // eyes
    ["#9b3a7e", 8, 8, 8, 2],     // scarf
    ["#fca5ff", 11, 8, 2, 1],    // scarf gem
    ["#5a3a40", 7, 10, 10, 8],   // cloak
    ["#3a2a30", 7, 17, 10, 1]    // cloak hem
  ],
  enchanter: [
    // Silver-haired figure with rings, tunic
    ["#e8e8ec", 8, 2, 8, 4],     // silver hair
    ["#b4b4c0", 8, 5, 8, 1],     // hair shadow
    ["#d8a478", 9, 5, 6, 4],     // face
    ["#1a1a1a", 10, 7, 1, 1], ["#1a1a1a", 13, 7, 1, 1], // eyes
    ["#84f6a6", 9, 6, 1, 1], ["#84f6a6", 14, 6, 1, 1], // glowing eyes accent
    ["#3a8a8a", 7, 9, 10, 9],    // tunic
    ["#1f4a4a", 7, 17, 10, 1],   // tunic hem
    ["#84f6a6", 11, 12, 2, 2],   // glowing rune
    ["#cefcdb", 11, 13, 1, 1]    // rune highlight
  ]
};

export const SHOP_VENDORS = {
  weapon: {
    name: "Borin",
    title: "BLACKSMITH",
    greet: ["Need a weapon. Buy or leave.", "Make it quick.", "Steel doesn't sharpen itself."],
    farewell: ["Don't waste my time.", "Hmf. Go.", "Come back when you're serious."]
  },
  alchemist: {
    name: "Lirien",
    title: "ALCHEMIST",
    greet: ["Ahh, traveler — what ails you today?", "The kettle's warm. What can I brew for you?", "Fresh tonics, just bottled."],
    farewell: ["May the moss favor you.", "Wander gently, friend.", "The wilds remember your name."]
  },
  arcanum: {
    name: "Master Vex",
    title: "ARCANUM",
    greet: ["Knowledge has its price. State your need.", "The scrolls have been waiting.", "Come, examine the work."],
    farewell: ["Study well, apprentice.", "The lattice holds. Until next time.", "Go — and read carefully."]
  },
  curio: {
    name: "Madame Sable",
    title: "CURIOS",
    greet: ["Mmm. What catches your eye, hm?", "Oh, you again. Lucky for you.", "Every piece has a story. Or two."],
    farewell: ["Until our paths cross again...", "The fates owe us a favor now.", "Take care — and keep your secrets."]
  },
  enchanter: {
    name: "The Stranger",
    title: "ENCHANTER",
    greet: ["Iron remembers. Bring it to me.", "Steel sings, when it knows the words.", "Set your blade upon the cloth."],
    farewell: ["Steel sings on.", "May the binding hold true.", "The runes will keep their watch."]
  }
};

// Furniture sprites for shop interiors
export const COUNTER_SPRITE = [
  ["#7a4a2a", 0, 0, 24, 6],     // top
  ["#5c3a1a", 0, 6, 24, 2],     // edge
  ["#3a2a1a", 0, 8, 24, 16],    // front
  ["#1a0e08", 0, 23, 24, 1]     // ground shadow
];

export const SHELF_SPRITE = [
  ["#5c3a1a", 2, 4, 20, 2],
  ["#5c3a1a", 2, 12, 20, 2],
  ["#3a2a1a", 2, 4, 2, 18],
  ["#3a2a1a", 20, 4, 2, 18],
  ["#7a4a2a", 4, 6, 4, 6],
  ["#7a4a2a", 12, 6, 4, 6],
  ["#7a4a2a", 4, 14, 4, 6]
];

export const BANNER_SPRITE = [
  ["#3a2a1a", 4, 0, 16, 2],
  ["#a8323e", 4, 2, 16, 14],
  ["#5c1a20", 4, 14, 16, 2],
  ["#e8d8a4", 8, 6, 8, 4]
];

export const EXIT_DOOR_SPRITE = [
  ["#3a2a1a", 4, 2, 16, 22],
  ["#5c3a1a", 6, 4, 12, 18],
  ["#7a4a2a", 6, 4, 12, 1],
  ["#7a4a2a", 6, 21, 12, 1],
  ["#ffd166", 16, 12, 2, 2]
];

// Town decorative props
export const LANTERN_SPRITE = [
  ["#3a2a1a", 11, 0, 2, 8],   // post
  ["#1a0a08", 8, 8, 8, 2],    // bracket
  ["#5c3a1a", 8, 10, 8, 4],   // lamp body
  ["#1a0a08", 7, 10, 1, 4], ["#1a0a08", 16, 10, 1, 4], // lamp frame
  ["#ffd166", 9, 11, 6, 2],   // glass
  ["#fff4c0", 10, 11, 4, 1],  // light glow
  ["#1a0a08", 11, 14, 2, 1]   // lamp base
];

export const SIGNPOST_SPRITE = [
  ["#5c3a1a", 11, 8, 2, 14],   // post
  ["#3a2a1a", 6, 4, 14, 6],    // sign board
  ["#7a4a2a", 7, 5, 12, 4],    // wood face
  ["#3a2a1a", 7, 5, 12, 1],    // top edge
  ["#1a0a08", 6, 9, 14, 1],    // bottom shadow
  ["#1a0a08", 11, 22, 2, 1]    // post base
];

export const BARREL_SPRITE = [
  ["#5c3a1a", 6, 6, 12, 16],   // body
  ["#3a2a1a", 6, 6, 12, 1],    // top edge
  ["#3a2a1a", 6, 21, 12, 1],   // bottom edge
  ["#3a2a1a", 6, 11, 12, 1],   // band
  ["#3a2a1a", 6, 16, 12, 1],   // band
  ["#7a4a2a", 7, 7, 10, 3],    // top inset
  ["#3a2a1a", 8, 8, 8, 1]      // top dark line
];

export const CRATE_SPRITE = [
  ["#7a4a2a", 5, 8, 14, 14],   // body
  ["#3a2a1a", 5, 8, 14, 1],    // top
  ["#3a2a1a", 5, 21, 14, 1],   // bottom
  ["#3a2a1a", 5, 8, 1, 14], ["#3a2a1a", 18, 8, 1, 14], // sides
  ["#3a2a1a", 5, 14, 14, 1],   // mid band
  ["#3a2a1a", 11, 8, 1, 14]    // vertical
];

export const FLOWER_PATCH_SPRITE = [
  ["#3a5e2a", 4, 16, 16, 5],   // soil/grass mound
  ["#a8323e", 6, 13, 2, 2],   // flower 1
  ["#ff7a3a", 10, 12, 2, 2],  // flower 2
  ["#fca5ff", 14, 13, 2, 2],  // flower 3
  ["#ffd166", 17, 14, 2, 2],  // flower 4
  ["#84f6a6", 7, 15, 1, 2], ["#84f6a6", 11, 14, 1, 2],
  ["#84f6a6", 15, 15, 1, 2], ["#84f6a6", 18, 16, 1, 2]  // stems
];

// Shop interior decorations
export const ANVIL_SPRITE = [
  ["#3a3a44", 4, 14, 16, 6],   // base
  ["#1a1a22", 4, 14, 16, 1],
  ["#5a5a64", 6, 10, 12, 4],   // body
  ["#3a3a44", 6, 10, 12, 1],
  ["#5a5a64", 2, 11, 4, 3],    // horn left
  ["#5a5a64", 18, 11, 4, 3],   // horn right
  ["#1a1a22", 4, 20, 16, 2]    // ground shadow
];

export const ARMOR_STAND_SPRITE = [
  ["#3a2a1a", 11, 20, 2, 4],   // post base
  ["#5c3a1a", 11, 8, 2, 12],   // post
  ["#7a4a2a", 9, 22, 6, 2],    // foot
  ["#5a5a64", 6, 10, 12, 8],   // chestplate
  ["#3a3a44", 6, 10, 12, 1], ["#3a3a44", 6, 17, 12, 1],
  ["#7a7a86", 7, 11, 10, 5],
  ["#ffd166", 11, 12, 2, 3],   // emblem
  ["#5a5a64", 4, 11, 2, 6], ["#5a5a64", 18, 11, 2, 6]  // pauldrons
];

export const WALL_SWORD_SPRITE = [
  ["#7a4a2a", 9, 0, 6, 1],     // wall mount
  ["#c0c0c8", 11, 1, 2, 14],   // blade
  ["#e8e8ec", 11, 1, 1, 14],
  ["#5c3a1a", 9, 14, 6, 2],    // crossguard
  ["#3a2a1a", 11, 16, 2, 4],   // grip
  ["#ffd166", 11, 20, 2, 1]    // pommel
];

export const WALL_SHIELD_SPRITE = [
  ["#7a4a2a", 9, 0, 6, 1],     // wall mount
  ["#a8323e", 7, 2, 10, 12],   // shield body
  ["#5c1a20", 7, 2, 10, 1],
  ["#5c1a20", 7, 13, 10, 1],
  ["#5c1a20", 7, 2, 1, 12], ["#5c1a20", 16, 2, 1, 12],
  ["#ffd166", 11, 6, 2, 4]     // emblem
];

export const FORGE_SPRITE = [
  ["#1a1a22", 2, 4, 20, 18],   // hood
  ["#3a3a44", 2, 4, 20, 2],    // hood top
  ["#1a1a1a", 4, 14, 16, 8],   // forge mouth
  ["#ff7a3a", 6, 16, 12, 5],   // fire glow
  ["#ffd166", 8, 18, 8, 3],    // fire core
  ["#fff4c0", 10, 19, 4, 1],   // fire highlight
  ["#5c3a1a", 2, 20, 20, 2]    // base bricks
];

export const CAULDRON_SPRITE = [
  ["#1a1a22", 4, 18, 16, 4],   // base
  ["#3a3a44", 3, 12, 18, 8],   // body
  ["#1a1a22", 3, 12, 18, 2],   // rim
  ["#5a5a64", 4, 13, 16, 1],   // rim highlight
  ["#84f6a6", 5, 14, 14, 4],   // bubbling potion
  ["#cefcdb", 7, 15, 4, 2], ["#cefcdb", 13, 15, 3, 2],  // bubbles
  ["#ff7a3a", 5, 21, 4, 1], ["#ff7a3a", 15, 21, 4, 1]   // small flames under
];

export const VIAL_SHELF_SPRITE = [
  ["#5c3a1a", 2, 4, 20, 2],    // top shelf
  ["#5c3a1a", 2, 12, 20, 2],   // mid shelf
  ["#5c3a1a", 2, 20, 20, 2],   // bottom shelf
  ["#3a2a1a", 2, 4, 1, 18], ["#3a2a1a", 21, 4, 1, 18],  // sides
  // Top row vials
  ["#7bdff2", 4, 7, 3, 5], ["#a8f3ff", 4, 8, 3, 1],
  ["#fca5ff", 9, 7, 3, 5], ["#ffc4ff", 9, 8, 3, 1],
  ["#84f6a6", 14, 7, 3, 5], ["#cefcdb", 14, 8, 3, 1],
  ["#ffd166", 19, 7, 2, 5], ["#fff4c0", 19, 8, 2, 1],
  // Mid row vials
  ["#ff7a3a", 4, 15, 3, 5], ["#ffb84d", 4, 16, 3, 1],
  ["#c79bff", 9, 15, 3, 5], ["#e0c9ff", 9, 16, 3, 1],
  ["#7bdff2", 14, 15, 2, 5],
  ["#84f6a6", 18, 15, 3, 5]
];

export const HERB_BUNDLE_SPRITE = [
  ["#3a2a1a", 11, 0, 2, 4],    // string
  ["#3e6b3e", 8, 4, 8, 8],     // bundle leaves
  ["#5a8f3d", 9, 5, 6, 6],
  ["#7aaa5d", 10, 6, 4, 4],
  ["#a8323e", 11, 7, 2, 1]     // berry
];

export const BOOKSHELF_SPRITE = [
  ["#3a2a1a", 2, 0, 20, 24],   // back
  ["#5c3a1a", 3, 1, 18, 22],   // wood
  ["#3a2a1a", 3, 6, 18, 1],    // shelves
  ["#3a2a1a", 3, 12, 18, 1],
  ["#3a2a1a", 3, 18, 18, 1],
  // Books — varied colors
  ["#a8323e", 4, 2, 2, 4], ["#3a56a8", 6, 2, 2, 4],
  ["#5b3a8e", 8, 2, 2, 4], ["#3e9e9e", 11, 2, 2, 4],
  ["#ffd166", 13, 2, 2, 4], ["#5a8f3d", 15, 2, 2, 4],
  ["#a8323e", 17, 2, 2, 4], ["#3a56a8", 19, 2, 2, 4],
  ["#5b3a8e", 4, 8, 2, 4], ["#a8323e", 6, 8, 2, 4],
  ["#3e9e9e", 8, 8, 2, 4], ["#ffd166", 11, 8, 2, 4],
  ["#3a56a8", 13, 8, 2, 4], ["#5b3a8e", 15, 8, 2, 4],
  ["#5a8f3d", 17, 8, 2, 4], ["#a8323e", 19, 8, 2, 4],
  ["#3e9e9e", 4, 14, 2, 4], ["#5b3a8e", 6, 14, 2, 4],
  ["#a8323e", 8, 14, 2, 4], ["#3a56a8", 11, 14, 2, 4],
  ["#ffd166", 13, 14, 2, 4], ["#5a8f3d", 15, 14, 2, 4],
  ["#5b3a8e", 17, 14, 2, 4], ["#3a56a8", 19, 14, 2, 4]
];

export const CRYSTAL_BALL_SPRITE = [
  ["#3a2a1a", 7, 18, 10, 4],   // base
  ["#5c3a1a", 8, 17, 8, 2],
  ["#1a1a22", 6, 8, 12, 12],   // dark sphere
  ["#3a56a8", 7, 9, 10, 10],   // glowing
  ["#7bdff2", 9, 11, 6, 6],
  ["#cefcdb", 10, 12, 3, 3]    // highlight
];

export const HANGING_SCROLL_SPRITE = [
  ["#3a2a1a", 9, 0, 6, 1],     // string
  ["#e8d8a4", 8, 1, 8, 14],    // scroll body
  ["#7a4a2a", 8, 1, 8, 1],     // top rod
  ["#7a4a2a", 8, 14, 8, 1],    // bottom rod
  ["#5c3a1a", 10, 4, 1, 6],    // ink line
  ["#5c3a1a", 12, 5, 3, 1],
  ["#5c3a1a", 12, 8, 3, 1],
  ["#a8323e", 11, 10, 2, 2]    // wax seal
];

export const MASK_SPRITE = [
  ["#3a2a1a", 11, 0, 2, 4],    // hanging string
  ["#5c3a1a", 8, 4, 8, 12],    // mask body
  ["#1a0a08", 8, 4, 8, 1],
  ["#fca5ff", 9, 8, 2, 2], ["#fca5ff", 13, 8, 2, 2],  // eye glints
  ["#1a0a08", 9, 8, 2, 2], ["#1a0a08", 13, 8, 2, 2],  // eye holes
  ["#3a2a1a", 10, 12, 4, 2]    // mouth
];

export const DISPLAY_CASE_SPRITE = [
  ["#3a2a1a", 3, 4, 18, 18],   // frame
  ["#1a1a22", 4, 5, 16, 16],   // dark interior
  ["#7bdff2", 6, 8, 4, 6],     // gem 1
  ["#cefcdb", 6, 8, 1, 6],
  ["#fca5ff", 14, 8, 4, 6],    // gem 2
  ["#ffc4ff", 14, 8, 1, 6],
  ["#ffd166", 9, 16, 6, 3],    // gold pile
  ["#fff4c0", 10, 16, 4, 1],
  ["#5a5a64", 3, 4, 18, 1],    // top edge highlight
  ["#3a3a44", 3, 21, 18, 1]    // bottom shadow
];

export const POTTED_PLANT_SPRITE = [
  ["#5c3a1a", 7, 16, 10, 6],   // pot
  ["#3a2a1a", 7, 16, 10, 1],   // rim
  ["#3e6b3e", 4, 6, 16, 12],   // foliage
  ["#5a8f3d", 5, 7, 14, 10],
  ["#7aaa5d", 7, 8, 10, 6],
  ["#84f6a6", 9, 10, 4, 3]     // highlight
];

// Decoration layouts per shop. Coordinates are relative to (x0, y0)
// of the interior room. Renderer translates these during draw.
// "above" decorations are drawn at the back row (y0+1).
// "side" decorations sit on the back floor row (y0+5) on left/right.
// "front" decorations sit near the south of the room (y0+8).
export const SHOP_DECORATIONS = {
  weapon: [
    { sprite: "wallSword",  rx: 3, ry: 1 },
    { sprite: "wallShield", rx: 6, ry: 1 },
    { sprite: "wallSword",  rx: 9, ry: 1 },
    { sprite: "anvil",      rx: 1, ry: 5 },
    { sprite: "forge",      rx: 11, ry: 5 },
    { sprite: "armorStand", rx: 1, ry: 7 },
    { sprite: "barrel",     rx: 11, ry: 7 },
    { sprite: "crate",      rx: 2, ry: 8 },
    { sprite: "crate",      rx: 10, ry: 8 }
  ],
  alchemist: [
    { sprite: "herbBundle", rx: 3, ry: 1 },
    { sprite: "herbBundle", rx: 6, ry: 1 },
    { sprite: "herbBundle", rx: 9, ry: 1 },
    { sprite: "cauldron",   rx: 1, ry: 5 },
    { sprite: "vialShelf",  rx: 11, ry: 5 },
    { sprite: "pottedPlant",rx: 1, ry: 7 },
    { sprite: "barrel",     rx: 11, ry: 7 },
    { sprite: "crate",      rx: 2, ry: 8 },
    { sprite: "pottedPlant",rx: 10, ry: 8 }
  ],
  arcanum: [
    { sprite: "scroll",     rx: 3, ry: 1 },
    { sprite: "scroll",     rx: 6, ry: 1 },
    { sprite: "scroll",     rx: 9, ry: 1 },
    { sprite: "bookshelf",  rx: 1, ry: 5 },
    { sprite: "bookshelf",  rx: 11, ry: 5 },
    { sprite: "crystalBall",rx: 1, ry: 7 },
    { sprite: "crystalBall",rx: 11, ry: 7 },
    { sprite: "pottedPlant",rx: 2, ry: 8 }
  ],
  curio: [
    { sprite: "mask",        rx: 3, ry: 1 },
    { sprite: "mask",        rx: 6, ry: 1 },
    { sprite: "mask",        rx: 9, ry: 1 },
    { sprite: "displayCase", rx: 1, ry: 5 },
    { sprite: "displayCase", rx: 11, ry: 5 },
    { sprite: "pottedPlant", rx: 1, ry: 7 },
    { sprite: "pottedPlant", rx: 11, ry: 7 },
    { sprite: "crate",       rx: 2, ry: 8 },
    { sprite: "barrel",      rx: 10, ry: 8 }
  ]
};

export const EXIT_RUG_SPRITE = [
  ["#7a3a3a", 0, 4, 24, 16],
  ["#5c2a2a", 0, 4, 24, 2],
  ["#5c2a2a", 0, 18, 24, 2],
  ["#a85a5a", 4, 8, 16, 8],
  ["#ffd166", 11, 11, 2, 2]
];

export const DUNGEON_ENTRANCE_SPRITE = [
  // Battlements
  ["#2a2a3a", 10, 2, 76, 6],
  ["#15151e", 12, 2, 4, 6],
  ["#15151e", 28, 2, 4, 6],
  ["#15151e", 44, 2, 4, 6],
  ["#15151e", 60, 2, 4, 6],
  ["#15151e", 76, 2, 4, 6],
  ["#15151e", 10, 7, 76, 1],
  // Tower body
  ["#3a3a4a", 12, 8, 72, 76],
  ["#1f1f2e", 74, 8, 10, 76],
  // Brick courses
  ["#2a2a3a", 12, 24, 72, 1],
  ["#2a2a3a", 12, 40, 72, 1],
  ["#2a2a3a", 12, 56, 72, 1],
  ["#2a2a3a", 12, 72, 72, 1],
  // Arrow-slit windows
  ["#15151e", 22, 18, 4, 14],
  ["#ffcf5c", 22, 22, 4, 6],
  ["#15151e", 46, 18, 4, 14],
  ["#ffcf5c", 46, 22, 4, 6],
  ["#15151e", 70, 18, 4, 14],
  ["#ffcf5c", 70, 22, 4, 6],
  // Archway frame
  ["#5a5a6a", 32, 48, 32, 36],
  ["#5a5a6a", 36, 46, 24, 2],
  ["#5a5a6a", 40, 44, 16, 2],
  // Archway interior
  ["#0a0a14", 34, 50, 28, 34],
  ["#0a0a14", 36, 46, 24, 4],
  ["#0a0a14", 40, 44, 16, 2],
  // Torches on either side
  ["#8a5a3a", 24, 56, 2, 10],
  ["#8a5a3a", 70, 56, 2, 10],
  ["#ff9e4f", 22, 52, 6, 6],
  ["#ff9e4f", 68, 52, 6, 6],
  ["#ffe066", 23, 53, 4, 3],
  ["#ffe066", 69, 53, 4, 3],
  // Foundation
  ["#1a1a2a", 12, 78, 72, 6]
];

export const TREE_SPRITE = [
  ["#3a2a1a", 10, 14, 4, 8],
  ["#2a1a0a", 10, 20, 4, 2],
  ["#1a4a1a", 8, 4, 8, 4],
  ["#2a5a2a", 5, 6, 14, 6],
  ["#3a7a3a", 3, 11, 18, 5],
  ["#6aaa6a", 7, 7, 4, 3],
  ["#6aaa6a", 13, 5, 3, 2]
];

export const STAIRS_DOWN_SPRITE = [
  ["#2a2a2a", 2, 2, 20, 20],
  ["#555555", 2, 2, 20, 4],
  ["#444444", 4, 6, 18, 4],
  ["#333333", 6, 10, 16, 4],
  ["#222222", 8, 14, 14, 4],
  ["#111111", 10, 18, 12, 4],
  ["#ffcf5c", 2, 2, 20, 1]
];

export const STAIRS_UP_SPRITE = [
  ["#2a2a2a", 2, 2, 20, 20],
  ["#555555", 2, 18, 20, 4],
  ["#666666", 4, 14, 18, 4],
  ["#777777", 6, 10, 16, 4],
  ["#888888", 8, 6, 14, 4],
  ["#999999", 10, 2, 12, 4],
  ["#7dd3ff", 10, 2, 12, 1]
];

export const CHEST_CLOSED_SPRITE = [
  ["#4a3220", 4, 18, 16, 3],
  ["#6b4a2c", 4, 10, 16, 10],
  ["#8b5a3c", 4, 6, 16, 6],
  ["#6b4a2c", 4, 10, 16, 1],
  ["#ffd166", 4, 8, 16, 1],
  ["#ffd166", 4, 13, 16, 1],
  ["#ffd166", 4, 18, 16, 1],
  ["#ffd166", 10, 9, 4, 4],
  ["#a26a0a", 11, 11, 2, 2]
];

export const CHEST_OPEN_SPRITE = [
  ["#4a3220", 4, 18, 16, 3],
  ["#6b4a2c", 4, 14, 16, 6],
  ["#8b5a3c", 3, 6, 18, 2],
  ["#6b4a2c", 3, 8, 18, 2],
  ["#ffd166", 4, 17, 16, 1],
  ["#ffd166", 6, 14, 12, 2],
  ["#fff4c0", 8, 14, 4, 2]
];

export const MAX_KNOWN_SPELLS = 6;
export const MAX_WEAPONS = 3;

export const FOUNTAIN_SPRITE = [
  // Outer basin
  ["#4a4a5a", 3, 14, 42, 30],
  ["#8a8a9a", 3, 14, 42, 4],
  ["#2a2a3a", 3, 42, 42, 3],
  // Water
  ["#7bdff2", 7, 18, 34, 22],
  ["#a8f3ff", 9, 20, 10, 3],
  ["#a8f3ff", 27, 32, 8, 2],
  // Center pedestal
  ["#6a6a7a", 18, 8, 12, 14],
  ["#4a4a5a", 28, 8, 2, 14],
  // Pedestal cap
  ["#8a8a9a", 16, 6, 16, 4],
  ["#a8a8b8", 17, 5, 14, 1],
  // Water jet + droplets
  ["#a8f3ff", 22, 1, 4, 6],
  ["#ffffff", 23, 2, 2, 3],
  ["#a8f3ff", 19, 8, 2, 2],
  ["#a8f3ff", 27, 8, 2, 2]
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
  mark:  { tag: "M", color: "#fca5ff" },
  haste: { tag: "H", color: "#ffd166" },
  enchantblade: { tag: "E", color: "#ffd54a" }
};
