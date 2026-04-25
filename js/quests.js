// Quest system. The pre-town quest-giver offers three procedurally generated
// quests. The LLM owns names + flavor; the engine owns mechanics. Quest types
// the engine understands:
//
//   find    — plant a uniquely-named item in a chest on `floor`. Pickup completes.
//   slay    — kill an enemy of `targetEnemyType` (any floor counts). Counts toward `count`.
//   descend — reach a specific `floor`.
//
// The LLM is asked for one of each so the player always sees a varied trio.

import { state, ui } from "./state.js";
import { setMessage } from "./utils.js";
import { chatGroq, getGroqKey } from "./llm.js";

const VALID_ENEMY_TYPES = ["slime", "goblin", "bat", "skeleton", "imp", "wolf", "orc", "wraith"];

// Three quest templates the engine can deliver, with hand-crafted name/desc
// fallbacks so the system works without an API key.
const FALLBACK_QUESTS = {
  find: [
    { targetName: "Crown of Mire",        description: "Bring me the Crown of Mire — sunk ages ago by a faithless king.",        hook: "It rests on the fourth descent.", floor: 4 },
    { targetName: "Lantern of Vexholm",   description: "Recover the Lantern of Vexholm. Its light remembers names.",            hook: "Six floors down, in the dark.",  floor: 6 },
    { targetName: "Ashen Reliquary",      description: "Find the Ashen Reliquary. The bones inside still warm to a bearer.",    hook: "Seek it on the seventh.",        floor: 7 },
    { targetName: "Tear of the Pale Sea", description: "I want the Tear of the Pale Sea. A pity to leave it lost.",             hook: "Floor five, in a forgotten chest.", floor: 5 }
  ],
  slay: [
    { targetName: "the Wraith Lord Vex",  enemy: "wraith",  description: "The Wraith Lord Vex stalks the deep. End him.",   hook: "He drifts on the seventh floor.", floor: 7,  count: 1 },
    { targetName: "the Bone Choir",       enemy: "skeleton",description: "Silence the Bone Choir — six skulls strong.",      hook: "Their hymn sleeps below.",         floor: 0,  count: 6 },
    { targetName: "Old Tusk",             enemy: "orc",     description: "Old Tusk has feasted on too many travelers.",      hook: "He runs the third floor.",         floor: 3,  count: 1 },
    { targetName: "the Howl of Iron Hill",enemy: "wolf",    description: "Hunt down the Howl of Iron Hill — five wolves.",   hook: "They roam in packs below.",        floor: 0,  count: 5 }
  ],
  descend: [
    { targetName: "the Tenth Seal",   description: "Push to the tenth floor. The seal there must be broken.",    hook: "Many fall before they arrive.",     floor: 10 },
    { targetName: "the Gilded Vault", description: "Reach the eighth floor. The vault keeps no patience.",       hook: "Eight floors. No more.",            floor: 8 },
    { targetName: "the Heart of Soot",description: "Descend to floor twelve. What waits there has waited long.", hook: "Few return from the twelfth.",      floor: 12 }
  ]
};

const FALLBACK_NPCS = [
  { name: "Brackwald the Patient",   title: "Archivist of Lost Things", intro: "Three relics sleep in the depths. Each begs to be claimed. Choose one, and I will see it remembered." },
  { name: "Madame Eyer",             title: "Keeper of Bargains",       intro: "Three errands lie open. None are kind. All are paid. Pick wisely, traveler." },
  { name: "The Hooded Reader",       title: "Cartographer of the Below",intro: "I have traced three paths through the deep. I cannot walk them. You can." },
  { name: "Old Wrenholt",            title: "Quartermaster of the Old Order", intro: "Every soul who descends owes the Order one task. Three remain on my ledger. Take one." }
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function fallbackManifest() {
  const npc = pick(FALLBACK_NPCS);
  // One of each type, randomized per slot
  const find    = pick(FALLBACK_QUESTS.find);
  const slay    = pick(FALLBACK_QUESTS.slay);
  const descend = pick(FALLBACK_QUESTS.descend);
  return {
    npc,
    intro: npc.intro,
    quests: [
      { type: "find",    ...find,    reward: { gold: 80, spellPoints: 1 } },
      { type: "slay",    ...slay,    reward: { gold: 60, spellPoints: 1 } },
      { type: "descend", ...descend, reward: { gold: 100, spellPoints: 2 } }
    ]
  };
}

function clampQuest(q, type) {
  const out = { type };
  out.targetName = (typeof q.targetName === "string" && q.targetName.length < 60) ? q.targetName : "—";
  out.description = (typeof q.description === "string" && q.description.length < 200) ? q.description : "A task awaits.";
  out.hook = (typeof q.hook === "string" && q.hook.length < 120) ? q.hook : "";
  if (type === "find") {
    out.floor = Math.max(1, Math.min(14, Math.floor(Number(q.floor) || 4)));
  } else if (type === "slay") {
    out.enemy = VALID_ENEMY_TYPES.includes(q.enemy) ? q.enemy : "wraith";
    out.count = Math.max(1, Math.min(8, Math.floor(Number(q.count) || 1)));
    out.floor = Math.max(0, Math.min(15, Math.floor(Number(q.floor) || 0)));
    out.killed = 0;
  } else if (type === "descend") {
    out.floor = Math.max(2, Math.min(15, Math.floor(Number(q.floor) || 8)));
  }
  const r = q.reward || {};
  out.reward = {
    gold: Math.max(0, Math.min(300, Math.floor(Number(r.gold) || 60))),
    spellPoints: Math.max(0, Math.min(3, Math.floor(Number(r.spellPoints) || 0)))
  };
  return out;
}

function clampManifest(raw) {
  if (!raw || typeof raw !== "object") return fallbackManifest();
  const npc = raw.npc && typeof raw.npc === "object" ? raw.npc : {};
  const cleanNpc = {
    name:  (typeof npc.name === "string"  && npc.name.length < 50)  ? npc.name  : pick(FALLBACK_NPCS).name,
    title: (typeof npc.title === "string" && npc.title.length < 60) ? npc.title : "Quest-Giver",
    voice: (typeof npc.voice === "string" && npc.voice.length < 30) ? npc.voice : "weary"
  };
  const intro = (typeof raw.intro === "string" && raw.intro.length < 220) ? raw.intro : pick(FALLBACK_NPCS).intro;
  const wants = ["find", "slay", "descend"];
  const got = Array.isArray(raw.quests) ? raw.quests.slice(0, 3) : [];
  const out = [];
  for (let i = 0; i < 3; i++) {
    const want = wants[i];
    const cand = got.find((q) => q && q.type === want) || got[i] || {};
    out.push(clampQuest(cand, want));
  }
  return { npc: cleanNpc, intro, quests: out };
}

export async function generateQuestManifest() {
  if (!state.aiEnabled || !getGroqKey()) return fallbackManifest();
  try {
    const text = await chatGroq({
      prompt:
        `Return JSON only with keys npc and quests for a fantasy roguelike quest-giver.\n` +
        `Schema:\n` +
        `{\n` +
        `  "npc": { "name": str (2-4 words), "title": str (3-5 words), "voice": str (1-3 words) },\n` +
        `  "intro": str (max 32 words, in character),\n` +
        `  "quests": [\n` +
        `    { "type": "find",    "targetName": str (2-5 words, evocative), "description": str (max 22 words), "hook": str (max 12 words), "floor": int 2-9, "reward": { "gold": int 40-160, "spellPoints": int 0-2 } },\n` +
        `    { "type": "slay",    "targetName": str (2-5 words), "enemy": one of "slime"|"goblin"|"bat"|"skeleton"|"imp"|"wolf"|"orc"|"wraith", "count": int 1-6, "description": str (max 22 words), "hook": str (max 12 words), "floor": int 0-9, "reward": { "gold": int 40-140, "spellPoints": int 0-2 } },\n` +
        `    { "type": "descend", "targetName": str (2-5 words), "description": str (max 22 words), "hook": str (max 12 words), "floor": int 5-12, "reward": { "gold": int 60-180, "spellPoints": int 1-3 } }\n` +
        `  ]\n` +
        `}\n` +
        `The NPC should feel mysterious, lived-in, and morally ambiguous. Names must be unique and never reuse common fantasy clichés (no "Aragorn", "Gandalf", etc.). Every run, invent fresh names.`,
      json: true,
      maxTokens: 600
    });
    const raw = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
    return clampManifest(raw);
  } catch {
    return fallbackManifest();
  }
}

// --- Quest acceptance + completion logic ---

export function acceptQuest(quest, npc) {
  state.player.quest = {
    ...quest,
    npcName: npc?.name || "",
    npcTitle: npc?.title || "",
    status: "active",
    plantedFloor: quest.type === "find" ? quest.floor : null
  };
}

export function activeQuest() { return state.player.quest; }

export function isFindQuestForFloor(floor) {
  const q = state.player.quest;
  return !!(q && q.status === "active" && q.type === "find" && q.plantedFloor === floor);
}

// Called from map.js when a chest is rolled; if find-quest is targeting this floor
// and the chest hasn't been claimed yet, it returns the quest item to plant.
export function consumePlantedFindQuestItem(floor) {
  const q = state.player.quest;
  if (!q || q.status !== "active" || q.type !== "find") return null;
  if (q.plantedFloor !== floor) return null;
  if (q.planted) return null;
  q.planted = true;
  return {
    name: q.targetName,
    desc: q.description,
    questItem: true,
    use() { /* purely flavor — claimed when picked up */ }
  };
}

export function recordEnemyKill(enemyType, currentFloor) {
  const q = state.player.quest;
  if (!q || q.status !== "active" || q.type !== "slay") return;
  if (q.enemy !== enemyType) return;
  if (q.floor && q.floor > 0 && q.floor !== currentFloor) return;
  q.killed = (q.killed || 0) + 1;
  if (q.killed >= q.count) markComplete();
}

export function recordDescend(floor) {
  const q = state.player.quest;
  if (!q || q.status !== "active" || q.type !== "descend") return;
  if (floor >= q.floor) markComplete();
}

export function recordItemPickup(itemName) {
  const q = state.player.quest;
  if (!q || q.status !== "active" || q.type !== "find") return;
  if (itemName === q.targetName) markComplete();
}

function markComplete() {
  const q = state.player.quest;
  if (!q || q.status === "complete") return;
  q.status = "complete";
  applyReward(q.reward);
  showQuestComplete(q);
}

function applyReward(r) {
  if (!r) return;
  if (r.gold) {
    state.player.gold += r.gold;
    state.stats.goldEarned = (state.stats.goldEarned || 0) + r.gold;
  }
  if (r.spellPoints) {
    state.player.spellPoints += r.spellPoints;
  }
}

function showQuestComplete(q) {
  ui.questCompleteName.textContent = q.targetName;
  ui.questCompleteFlavor.textContent = q.description;
  const rewards = [];
  if (q.reward.gold) rewards.push(`<span class="chip"><b>gold</b>${q.reward.gold}</span>`);
  if (q.reward.spellPoints) rewards.push(`<span class="chip"><b>SP</b>${q.reward.spellPoints}</span>`);
  ui.questCompleteRewards.className = "result-stats chips";
  ui.questCompleteRewards.innerHTML = rewards.join("");
  ui.questCompleteOverlay.classList.remove("hidden");
  setMessage(`Quest complete: ${q.targetName}.`);
}

export function initQuestUi() {
  if (ui.questCompleteClose) {
    ui.questCompleteClose.addEventListener("click", () => {
      ui.questCompleteOverlay.classList.add("hidden");
    });
  }
}

// --- Cutscene UI ---

let cutsceneResolve = null;
let lastQuestSeed = 0;

function drawNpcScene(canvas, npc) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Floor line
  ctx.fillStyle = "#1a1a26";
  ctx.fillRect(0, 132, canvas.width, 48);
  // Bookshelf back-left
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(20, 36, 60, 96);
  ctx.fillStyle = "#5c3a1a";
  for (let r = 0; r < 4; r++) {
    ctx.fillRect(22, 40 + r * 24, 56, 18);
    for (let i = 0; i < 6; i++) {
      const colors = ["#a8323e", "#3a56a8", "#5b3a8e", "#3e9e9e", "#ffd166", "#5a8f3d"];
      ctx.fillStyle = colors[(i + r) % colors.length];
      ctx.fillRect(24 + i * 9, 42 + r * 24, 6, 14);
    }
  }
  // Window back-right
  ctx.fillStyle = "#1a1a26";
  ctx.fillRect(220, 36, 80, 60);
  ctx.fillStyle = "#3a3a55";
  ctx.fillRect(222, 38, 76, 56);
  ctx.fillStyle = "#7bdff2";
  ctx.fillRect(226, 42, 32, 24);
  ctx.fillRect(264, 42, 30, 24);
  // Window cross
  ctx.fillStyle = "#1a1a26";
  ctx.fillRect(258, 38, 4, 56);
  ctx.fillRect(222, 64, 76, 4);
  // Desk
  ctx.fillStyle = "#5c3a1a";
  ctx.fillRect(80, 110, 160, 30);
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(80, 110, 160, 4);
  ctx.fillRect(80, 136, 160, 4);
  // Desk legs
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(86, 140, 8, 30);
  ctx.fillRect(226, 140, 8, 30);
  // Lamp on desk
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(98, 100, 4, 12);
  ctx.fillStyle = "#5c3a1a";
  ctx.fillRect(94, 90, 12, 12);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(96, 92, 8, 8);
  ctx.fillStyle = "#fff4c0";
  ctx.fillRect(98, 94, 4, 4);
  // Lamp glow
  ctx.fillStyle = "rgba(255,209,102,0.18)";
  ctx.fillRect(70, 70, 80, 60);
  // Open book on desk
  ctx.fillStyle = "#e8d8a4";
  ctx.fillRect(150, 102, 32, 8);
  ctx.fillStyle = "#7a4a2a";
  ctx.fillRect(150, 102, 32, 1);
  ctx.fillStyle = "#5c3a1a";
  ctx.fillRect(155, 105, 10, 1);
  ctx.fillRect(168, 105, 10, 1);
  ctx.fillRect(155, 107, 8, 1);
  // NPC: hooded figure behind desk
  // Hood
  ctx.fillStyle = "#2a1a3e";
  ctx.fillRect(140, 50, 40, 38);
  ctx.fillStyle = "#1a0a2a";
  ctx.fillRect(140, 50, 40, 4);
  ctx.fillRect(140, 84, 40, 4);
  // Hood interior shadow + face
  ctx.fillStyle = "#1a0a14";
  ctx.fillRect(146, 60, 28, 20);
  ctx.fillStyle = "#d8a478";
  ctx.fillRect(150, 64, 20, 14);
  // Eye glints
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(154, 70, 2, 2);
  ctx.fillRect(164, 70, 2, 2);
  // Body / robe
  ctx.fillStyle = "#2a1a3e";
  ctx.fillRect(132, 86, 56, 26);
  ctx.fillStyle = "#1a0a2a";
  ctx.fillRect(132, 86, 56, 2);
  // Hands resting on desk
  ctx.fillStyle = "#d8a478";
  ctx.fillRect(140, 108, 8, 4);
  ctx.fillRect(172, 108, 8, 4);
  // Floating dust motes
  ctx.fillStyle = "rgba(255,209,102,0.5)";
  for (let i = 0; i < 12; i++) {
    const x = (i * 31 + 13) % canvas.width;
    const y = 30 + (i * 17 + 7) % 100;
    ctx.fillRect(x, y, 1, 1);
  }
  // Vignette
  const grad = ctx.createRadialGradient(160, 90, 60, 160, 90, 200);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function describeQuest(q) {
  if (q.type === "find")    return `Find · floor ${q.floor}`;
  if (q.type === "slay")    return q.count > 1 ? `Slay × ${q.count}` : `Slay`;
  if (q.type === "descend") return `Descend to floor ${q.floor}`;
  return q.type;
}

function rewardLine(r) {
  const parts = [];
  if (r.gold) parts.push(`${r.gold}g`);
  if (r.spellPoints) parts.push(`${r.spellPoints} SP`);
  return parts.join(" · ") || "—";
}

export function showCutscene() {
  return new Promise(async (resolve) => {
    cutsceneResolve = resolve;
    ui.cutsceneOverlay.classList.remove("hidden");
    ui.cutsceneStatus.classList.add("hidden");

    // Show a placeholder while we generate
    ui.cutsceneNpcName.textContent = "…";
    ui.cutsceneNpcTitle.textContent = "preparing the ledger";
    ui.cutsceneIntro.textContent = "—";
    ui.cutsceneQuests.innerHTML = "";

    let manifest;
    try {
      manifest = await generateQuestManifest();
    } catch {
      manifest = fallbackManifest();
    }

    drawNpcScene(ui.cutsceneCanvas, manifest.npc);

    ui.cutsceneNpcName.textContent = manifest.npc.name;
    ui.cutsceneNpcTitle.textContent = manifest.npc.title;
    ui.cutsceneIntro.textContent = manifest.intro;

    ui.cutsceneQuests.innerHTML = "";
    for (const q of manifest.quests) {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.innerHTML =
        `<strong>${escapeHtml(q.targetName)}</strong>` +
        `<span style="color:var(--ink-dim);font-style:italic">${escapeHtml(q.description)}</span>` +
        `<span style="color:var(--amber);font-size:11px">${describeQuest(q)} · reward ${rewardLine(q.reward)}</span>` +
        (q.hook ? `<span style="color:var(--ink-dim);font-size:11px">"${escapeHtml(q.hook)}"</span>` : "");
      btn.addEventListener("click", () => acceptAndDismiss(q, manifest.npc));
      ui.cutsceneQuests.appendChild(btn);
    }
  });
}

function acceptAndDismiss(quest, npc) {
  acceptQuest(quest, npc);
  // Loading screen feel
  ui.cutsceneQuests.innerHTML = "";
  ui.cutsceneStatus.classList.remove("hidden");
  ui.cutsceneStatus.textContent = `Preparing your tale… "${quest.targetName}"`;
  setTimeout(() => {
    ui.cutsceneOverlay.classList.add("hidden");
    if (cutsceneResolve) { const r = cutsceneResolve; cutsceneResolve = null; r(); }
  }, 900);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
