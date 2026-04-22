import { state } from "./state.js";
import { maxFloor } from "./config.js";

const overlay = document.getElementById("resultOverlay");
const verdictEl = document.getElementById("resultVerdict");
const nameEl = document.getElementById("resultName");
const classEl = document.getElementById("resultClass");
const epitaphEl = document.getElementById("resultEpitaph");
const gridEl = document.getElementById("resultGrid");
const statsEl = document.getElementById("resultStats");
const newBtn = document.getElementById("playAgain");

const GLYPH = {
  cleared: "▓",
  boss: "★",
  died: "☠",
  pending: "·"
};

function runName() {
  return state.heroName || "Nameless Wanderer";
}

function epitaph() {
  if (state.won) return `Claimed the depths — all ${maxFloor} floors cleared.`;
  return state.lastKilledBy || `Fell on floor ${state.floor}.`;
}

function buildGrid() {
  const cells = [];
  for (let i = 0; i < maxFloor; i++) {
    const outcome = state.stats.floorLog[i] || "pending";
    cells.push(GLYPH[outcome]);
  }
  return cells.join(" ");
}

export function showResult() {
  verdictEl.textContent = state.won ? "▼ VICTORY ▼" : "▼ RUN ENDED ▼";
  nameEl.textContent = runName();
  classEl.textContent = `the ${state.player.className}`;
  epitaphEl.textContent = epitaph();
  gridEl.textContent = buildGrid();
  statsEl.innerHTML = `
    <span>floor <b>${state.stats.floorsCleared}/${maxFloor}</b></span>
    <span><b>${state.stats.kills}</b> kills</span>
    <span><b>${state.stats.bossKills}</b> bosses</span>
    <span><b>${state.stats.spellsCast}</b> spells cast</span>
    <span><b>${state.stats.goldEarned}g</b> earned</span>
    <span>weapon: <b>${state.player.weapon}</b></span>
  `;
  overlay.classList.remove("hidden");
}

newBtn.addEventListener("click", () => {
  location.hash = "";
  location.reload();
});
