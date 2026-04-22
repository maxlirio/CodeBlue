import { state, ui } from "./state.js";
import { BOSS_PORTRAIT_SPRITE } from "./config.js";
import { rnd, pick, setMessage } from "./utils.js";
import { rollHit } from "./combat.js";
import { openShop } from "./shop.js";
import { drawSprite } from "./render.js";

export function makeBossName() {
  const first = ["Gore", "Night", "Bone", "Murk", "Rot", "Hex", "Dread", "Iron", "Blight", "Ash"];
  const second = ["maw", "king", "warden", "tyrant", "seer", "fang", "golem", "devourer", "brute", "reaper"];
  return `${pick(first)}${pick(second)}`;
}

function drawBossPortrait() {
  drawSprite(ui.bossCanvas.getContext("2d"), BOSS_PORTRAIT_SPRITE, 0, 0);
}

function renderBossState() {
  ui.bossState.textContent =
    `You: HP ${state.player.hp}/${state.player.maxHp} | MP ${state.player.mana}/${state.player.maxMana} | Boss: ${state.bossBattle.hp}/${state.bossBattle.maxHp}`;
}

export function startBossBattle() {
  state.bossBattle = {
    name: makeBossName(),
    hp: 55 + state.floor * 4,
    maxHp: 55 + state.floor * 4,
    turn: 1
  };
  ui.bossTitle.textContent = `Boss Battle: ${state.bossBattle.name}`;
  ui.bossOverlay.classList.remove("hidden");
  ui.bossLog.textContent = "Describe your move. Wild claims like 'I instantly win' will fail.";
  renderBossState();
  drawBossPortrait();
}

export async function resolveBossAction(inputText) {
  if (!state.bossBattle || !inputText.trim()) return;
  ui.bossInput.value = "";
  const silly = /instantly|one shot|auto win|i kill the boss/i.test(inputText);
  const base = silly ? 0 : rnd(6, 13) + Math.floor(state.player.atk / 2);
  const manaSpend = Math.min(state.player.mana, /spell|magic|arc|nova|bolt/i.test(inputText) ? rnd(3, 7) : 0);
  state.player.mana -= manaSpend;
  const roll = rollHit(base);
  const dealt = roll.damage;
  state.bossBattle.hp = Math.max(0, state.bossBattle.hp - dealt);
  const bossHit = rnd(5, 10) + Math.floor(state.floor / 3);
  state.player.hp = Math.max(0, state.player.hp - bossHit);

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
    narration = silly
      ? `Referee: That claim is impossible. Your move falters.\nBoss punishes you for ${bossHit}.`
      : `You ${roll.type === "crit" ? "land a critical" : roll.type === "miss" ? "miss badly" : "strike true"} for ${dealt}.\nBoss counters for ${bossHit}.`;
  }
  ui.bossLog.textContent = narration;
  renderBossState();

  if (state.player.hp <= 0) {
    state.over = true;
    ui.bossOverlay.classList.add("hidden");
    setMessage("You were defeated in the boss arena.");
    return;
  }
  if (state.bossBattle.hp <= 0) {
    state.bossAlive = false;
    state.bossBattle = null;
    state.awaitingShop = true;
    ui.bossOverlay.classList.add("hidden");
    setMessage("Boss defeated in the arena!");
    openShop();
  } else {
    state.bossBattle.turn += 1;
  }
}
