import { state, ui } from "./state.js";
import { BOSS_PORTRAIT_SPRITE } from "./config.js";
import { rnd, setMessage } from "./utils.js";
import { spick } from "./rng.js";
import { rollHit } from "./combat.js";
import { openShop } from "./shop.js";
import { drawSprite } from "./render.js";
import { endRun } from "./turn.js";

const BOSS_FIRST = ["Gore", "Night", "Bone", "Murk", "Rot", "Hex", "Dread", "Iron", "Blight", "Ash"];
const BOSS_SECOND = ["maw", "king", "warden", "tyrant", "seer", "fang", "golem", "devourer", "brute", "reaper"];
export function makeBossName() { return `${spick(BOSS_FIRST)}${spick(BOSS_SECOND)}`; }

function drawBossPortrait() {
  drawSprite(ui.bossCanvas.getContext("2d"), BOSS_PORTRAIT_SPRITE, 0, 0);
}

function renderBossState() {
  ui.bossState.textContent =
    `You: HP ${state.player.hp}/${state.player.maxHp} | MP ${state.player.mana}/${state.player.maxMana} | Boss: ${state.bossBattle.hp}/${state.bossBattle.maxHp}`;
}

function parseIntent(text) {
  const silly = /instantly|one shot|auto win|i kill the boss/i.test(text);
  const isSpell = /spell|magic|arc|nova|bolt|burn|frost|ice|fire|lightning|cast/i.test(text);
  const isDefend = /defend|guard|brace|shield|parry|block/i.test(text);
  const isFlee = /flee|run away|retreat|escape/i.test(text);

  let action = "attack";
  if (silly) action = "invalid";
  else if (isDefend) action = "defend";
  else if (isFlee) action = "flee";
  else if (isSpell) action = "spell";

  return { silly, isSpell, isDefend, isFlee, action };
}

function updateIntentPanel({ action, manaSpend, rollType, dealt }) {
  const el = (id) => document.getElementById(id);
  if (el("intentAction")) el("intentAction").textContent = action;
  if (el("intentMana")) el("intentMana").textContent = `-${manaSpend}`;
  if (el("intentRoll")) el("intentRoll").textContent = rollType;
  if (el("intentDmg")) el("intentDmg").textContent = `${dealt}`;
}

export function startBossBattle() {
  state.bossBattle = {
    name: makeBossName(),
    hp: 55 + state.floor * 4,
    maxHp: 55 + state.floor * 4,
    turn: 1
  };
  ui.bossTitle.textContent = `BOSS: ${state.bossBattle.name}`;
  ui.bossOverlay.classList.remove("hidden");
  ui.bossLog.textContent = "Describe your move or tap a chip. The referee enforces mechanics; narration is flavor.";
  updateIntentPanel({ action: "—", manaSpend: 0, rollType: "—", dealt: 0 });
  renderBossState();
  drawBossPortrait();
}

export async function resolveBossAction(inputText) {
  if (!state.bossBattle || !inputText.trim()) return;
  ui.bossInput.value = "";

  const intent = parseIntent(inputText);
  const defendMitigation = intent.isDefend ? 0.5 : 1;
  let base;
  if (intent.silly || intent.isFlee) base = 0;
  else if (intent.isDefend) base = Math.max(1, Math.floor(state.player.atk / 3));
  else base = rnd(6, 13) + Math.floor(state.player.atk / 2);

  const manaSpend = intent.isSpell ? Math.min(state.player.mana, rnd(3, 7)) : 0;
  state.player.mana -= manaSpend;
  if (intent.isSpell) base += Math.floor(state.player.spellPower * 1.5);

  const roll = rollHit(base);
  const dealt = roll.damage;
  state.bossBattle.hp = Math.max(0, state.bossBattle.hp - dealt);
  const bossHitRaw = rnd(5, 10) + Math.floor(state.floor / 3);
  const bossHit = Math.max(1, Math.floor(bossHitRaw * defendMitigation));
  state.player.hp = Math.max(0, state.player.hp - bossHit);

  updateIntentPanel({ action: intent.action, manaSpend, rollType: roll.type, dealt });

  let narration = "";
  const apiKey = localStorage.getItem("pixelRogueOpenAIKey");
  if (state.aiEnabled && apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: `You are a strict RPG referee. Reject silly impossible actions. Player move: "${inputText}". Roll=${roll.type} dealt=${dealt}. Mana spent=${manaSpend}, mana left=${state.player.mana}. Boss HP now ${state.bossBattle.hp}. Boss retaliates ${bossHit}. Reply in 2 short lines.`,
          max_output_tokens: 120
        })
      });
      if (res.ok) narration = ((await res.json()).output_text || "").trim();
    } catch {}
  }
  if (!narration) {
    if (intent.silly) narration = `Referee: That claim is impossible. Your move falters.\nBoss punishes you for ${bossHit}.`;
    else if (intent.isFlee) narration = `You hesitate and cannot find an opening.\nBoss smashes you for ${bossHit}.`;
    else if (intent.isDefend) narration = `You brace and absorb the blow (mitigation ×0.5).\nBoss deals ${bossHit}.`;
    else narration = `You ${roll.type === "crit" ? "land a critical" : roll.type === "miss" ? "miss badly" : "strike true"} for ${dealt}.\nBoss counters for ${bossHit}.`;
  }
  ui.bossLog.textContent = narration;
  renderBossState();

  if (state.player.hp <= 0) {
    const name = state.bossBattle.name;
    ui.bossOverlay.classList.add("hidden");
    endRun(`Slain by ${name} in the arena on floor ${state.floor}.`);
    return;
  }
  if (state.bossBattle.hp <= 0) {
    state.bossAlive = false;
    state.bossBattle = null;
    state.awaitingShop = true;
    state.stats.bossKills += 1;
    ui.bossOverlay.classList.add("hidden");
    setMessage("Boss defeated in the arena!");
    openShop();
  } else {
    state.bossBattle.turn += 1;
  }
}
