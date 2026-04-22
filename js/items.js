import { state } from "./state.js";
import { rnd, pick, setMessage } from "./utils.js";
import { damageNearestEnemy, damageAdjacentEnemies } from "./combat.js";

function makeRelicName() {
  const { left, mid, right } = state.runSeedWords;
  return `${pick(left)} ${pick(mid)} ${pick(right)}`;
}

function randomRoomTile() {
  const room = pick(state.rooms);
  return {
    x: rnd(room.x + 1, room.x + room.w - 2),
    y: rnd(room.y + 1, room.y + room.h - 2)
  };
}

// apply(floorLevel) mutates state; makeRelic binds the current floor at drop time
const RELIC_EFFECTS = [
  { desc: "Meteor nearest foe", apply(floorLevel) {
      damageNearestEnemy(8 + floorLevel + state.player.spellPower, "#f9a03f");
    } },
  { desc: "+8 max HP and heal", apply() {
      state.player.maxHp += 8;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 8);
      setMessage("Your life force surges.");
    } },
  { desc: "Full mana +2 max mana", apply() {
      state.player.maxMana += 2;
      state.player.mana = state.player.maxMana;
      setMessage("Mana channels open.");
    } },
  { desc: "+2 permanent attack", apply() {
      state.player.baseAtk += 2;
      recalcAttack();
      setMessage("Your strikes grow deadlier.");
    } },
  { desc: "Blink and shock adjacent", apply(floorLevel) {
      const pos = randomRoomTile();
      state.player.x = pos.x;
      state.player.y = pos.y;
      damageAdjacentEnemies(7 + Math.floor(floorLevel / 2), "#b388ff");
      setMessage("You blink through reality.");
    } }
];

export function makeRelic(floorLevel) {
  const effect = pick(RELIC_EFFECTS);
  return {
    name: makeRelicName(),
    desc: effect.desc,
    use: () => effect.apply(floorLevel)
  };
}

export function recalcAttack() {
  const weaponBonus = state.player.weaponBonus || 0;
  state.player.atk = state.player.baseAtk + weaponBonus;
}

export function equipWeapon(weapon) {
  state.player.weapon = weapon.name;
  state.player.weaponBonus = weapon.atk;
  state.player.weaponType = weapon.type;
  state.player.maxMana = Math.max(6, state.player.maxMana + weapon.mana);
  state.player.mana = Math.min(state.player.mana, state.player.maxMana);
  recalcAttack();
  setMessage(`Equipped ${weapon.name}.`);
  if (!state.player.backpack.find((w) => w.name === weapon.name)) state.player.backpack.push(weapon);
}

export function fallbackLoot(theme = "wild") {
  const names = ["Storm", "Rune", "Iron", "Moon", "Grave", "Ember"];
  const bases = ["Bow", "Mace", "Glaive", "Sword", "Axe", "Wand"];
  const base = pick(bases);
  return {
    name: `${pick(names)} ${base}`,
    atk: rnd(2, 6),
    mana: rnd(-1, 3),
    type: base.toLowerCase(),
    effectiveAgainst: pick(["slime", "goblin", "skeleton", "orc", theme]),
    animation: pick(["arc slash", "spark burst", "piercing line", "hammer shock"]),
    damageMode: pick(["bleed", "burst", "pierce"])
  };
}

export async function generateAiLoot(theme = "enemy") {
  const apiKey = localStorage.getItem("pixelRogueOpenAIKey");
  if (!state.aiEnabled || !apiKey) return fallbackLoot(theme);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Return JSON only with keys name,atk,mana,type,effectiveAgainst,animation,damageMode. Make one fantasy weapon good against ${theme}. atk integer 1-7, mana integer -2..4.`,
        max_output_tokens: 140
      })
    });
    if (!response.ok) throw new Error("loot failed");
    const text = (await response.json()).output_text || "";
    const loot = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
    if (!loot.name || typeof loot.atk !== "number") throw new Error("bad loot");
    return loot;
  } catch {
    return fallbackLoot(theme);
  }
}
