// Wires the multiplayer overlay (host / join / mode / start) and the
// in-game floating chat box to the multi.js state machine.

import { state, ui } from "./state.js";
import { setMessage } from "./utils.js";
import {
  startHost, joinAsGuest, leaveMatch,
  sendHello, sendReady, sendChat, setHostStartCallback,
  sendSeed
} from "./multi.js";
import { session } from "./net/session.js";
import { setSeed, randomSeedString } from "./rng.js";

let resolveOpen = null; // promise resolver for the overlay flow

const stage = () => ui.multiStage;

export function openMultiOverlay() {
  return new Promise((resolve) => {
    resolveOpen = resolve;
    ui.multiOverlay.classList.remove("hidden");
    ui.multiPlayBtn.style.display = "none";
    renderMenu();
  });
}

function close(result) {
  ui.multiOverlay.classList.add("hidden");
  if (resolveOpen) { const r = resolveOpen; resolveOpen = null; r(result); }
}

function renderMenu() {
  stage().innerHTML = `
    <div class="multi-menu">
      <button class="choice" id="multiHostBtn"><strong>Host a room</strong><span>Pick the mode and share a 5-letter code.</span></button>
      <button class="choice" id="multiJoinBtn"><strong>Join a room</strong><span>Enter your friend's code.</span></button>
      <button class="choice" id="multiCancelBtn"><strong>Cancel</strong><span>Back to solo.</span></button>
    </div>
  `;
  document.getElementById("multiHostBtn").onclick = () => renderHostSetup();
  document.getElementById("multiJoinBtn").onclick = () => renderJoinSetup();
  document.getElementById("multiCancelBtn").onclick = () => { leaveMatch(); close(null); };
}

function renderHostSetup() {
  stage().innerHTML = `
    <div class="multi-form">
      <div class="multi-row">
        <span class="multi-label">Mode</span>
        <div class="mode-toggle">
          <button class="mode-pill active" data-mode="coop">Co-op</button>
          <button class="mode-pill" data-mode="pvp">PvP</button>
        </div>
      </div>
      <p class="multi-hint">Both players land in the same dungeon. In Phase 1, you can see each other but enemies and chests are still independent.</p>
      <div class="actions"><button class="choice" id="multiOpenRoomBtn"><strong>Open room</strong></button>
      <button class="choice" id="multiBackBtn"><strong>Back</strong></button></div>
    </div>
  `;
  let chosenMode = "coop";
  for (const btn of stage().querySelectorAll(".mode-pill")) {
    btn.onclick = () => {
      chosenMode = btn.dataset.mode;
      stage().querySelectorAll(".mode-pill").forEach((b) => b.classList.toggle("active", b === btn));
    };
  }
  document.getElementById("multiBackBtn").onclick = renderMenu;
  document.getElementById("multiOpenRoomBtn").onclick = async () => {
    renderHostWaiting("opening room…");
    try {
      const code = await startHost();
      session.mode = chosenMode;
      const seed = randomSeedString();
      session.seed = seed;
      setSeed(seed);
      state.seed = seed;
      renderHostWaiting(code);
      pollForGuestThenAdvance();
    } catch (err) {
      stage().innerHTML = `<p class="multi-err">Could not open room: ${err.type || err.message || err}</p><button class="choice" id="multiBackBtn"><strong>Back</strong></button>`;
      document.getElementById("multiBackBtn").onclick = renderMenu;
    }
  };
}

function renderHostWaiting(codeOrText) {
  const isCode = typeof codeOrText === "string" && /^[A-Z0-9]{5}$/.test(codeOrText);
  stage().innerHTML = `
    <div class="multi-form">
      <div class="multi-row">
        <span class="multi-label">Room code</span>
        <div class="room-code" id="roomCodeBox">${isCode ? codeOrText : codeOrText}</div>
      </div>
      <p class="multi-hint">${isCode ? "Share this code with your friend. They click <b>Join a room</b> and type it in." : "Contacting the signaling server…"}</p>
      <div id="multiPartnerStatus" class="multi-status warn">Waiting for partner…</div>
      <div class="actions"><button class="choice" id="multiCancelHostBtn"><strong>Cancel</strong></button></div>
    </div>
  `;
  if (isCode) {
    const box = document.getElementById("roomCodeBox");
    box.style.cursor = "pointer";
    box.title = "click to copy";
    box.onclick = () => navigator.clipboard?.writeText(codeOrText);
  }
  document.getElementById("multiCancelHostBtn").onclick = () => { leaveMatch(); renderMenu(); };
}

function pollForGuestThenAdvance() {
  const tick = () => {
    if (session.connected) {
      sendSeed();
      renderHostBegin();
      return;
    }
    setTimeout(tick, 200);
  };
  tick();
}

function renderHostBegin() {
  const partnerName = session.partner.name || "Partner";
  stage().innerHTML = `
    <div class="multi-form">
      <div class="multi-status good">Connected to <b>${escapeHtml(partnerName)}</b>.</div>
      <p class="multi-hint">Both players will pick their classes on the next screen, then drop into the same dungeon.</p>
      <div class="actions"><button class="choice" id="multiBeginBtn"><strong>Continue to class select</strong></button>
      <button class="choice" id="multiCancelBtn2"><strong>Cancel</strong></button></div>
    </div>
  `;
  document.getElementById("multiCancelBtn2").onclick = () => { leaveMatch(); renderMenu(); };
  document.getElementById("multiBeginBtn").onclick = () => {
    // Both players close the overlay and pick a class. Hosts arrange the
    // run start gate so we wait until the guest is ready too before the
    // dungeon actually begins.
    setHostStartCallback(() => { /* set later by main.js */ });
    close({ role: "host", mode: session.mode, seed: session.seed });
  };
}

function renderJoinSetup() {
  stage().innerHTML = `
    <div class="multi-form">
      <div class="multi-row">
        <span class="multi-label">Room code</span>
        <input id="joinCodeInput" type="text" maxlength="6" autocomplete="off" spellcheck="false" placeholder="ABCDE" />
      </div>
      <div id="multiPartnerStatus" class="multi-status">Ask the host for their 5-letter code.</div>
      <div class="actions">
        <button class="choice" id="multiDoJoinBtn"><strong>Connect</strong></button>
        <button class="choice" id="multiBackBtn"><strong>Back</strong></button>
      </div>
    </div>
  `;
  document.getElementById("multiBackBtn").onclick = renderMenu;
  document.getElementById("multiDoJoinBtn").onclick = async () => {
    const code = (document.getElementById("joinCodeInput").value || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) {
      document.getElementById("multiPartnerStatus").className = "multi-status err";
      document.getElementById("multiPartnerStatus").textContent = "Code should be 5 letters/numbers.";
      return;
    }
    document.getElementById("multiPartnerStatus").className = "multi-status warn";
    document.getElementById("multiPartnerStatus").textContent = "Dialing the room…";
    try {
      await joinAsGuest(code);
      // After connect, host will send "seed" message; we wait briefly for
      // it via polling, then advance.
      pollForSeedThenAdvance();
    } catch (err) {
      document.getElementById("multiPartnerStatus").className = "multi-status err";
      document.getElementById("multiPartnerStatus").textContent = `Join failed: ${err.type || err.message || err}`;
    }
  };
}

function pollForSeedThenAdvance() {
  let attempts = 0;
  const tick = () => {
    attempts++;
    if (session.seed) {
      stage().innerHTML = `
        <div class="multi-form">
          <div class="multi-status good">Seed received. Mode: <b>${session.mode.toUpperCase()}</b>.</div>
          <p class="multi-hint">Pick your class on the next screen — your friend will do the same.</p>
          <div class="actions"><button class="choice" id="multiContinueBtn"><strong>Continue to class select</strong></button></div>
        </div>
      `;
      document.getElementById("multiContinueBtn").onclick = () => close({ role: "guest", mode: session.mode, seed: session.seed });
      return;
    }
    if (attempts > 80) { // ~16s
      const el = document.getElementById("multiPartnerStatus");
      if (el) { el.className = "multi-status err"; el.textContent = "Host did not send a seed in time."; }
      return;
    }
    setTimeout(tick, 200);
  };
  tick();
}

// ---- Chat input wiring ----

export function initChat() {
  if (!ui.chatInput) return;
  ui.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const text = ui.chatInput.value;
      ui.chatInput.value = "";
      if (text) sendChat(text);
      ui.chatInput.blur();
      e.preventDefault();
    } else if (e.key === "Escape") {
      ui.chatInput.value = "";
      ui.chatInput.blur();
    }
  });
  // Global "T" to focus chat (when in multiplayer)
  window.addEventListener("keydown", (e) => {
    if (!session.isMultiplayer()) return;
    if (document.activeElement === ui.chatInput) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key && e.key.toLowerCase() === "t") {
      e.preventDefault();
      ui.chatBox.classList.remove("hidden");
      ui.chatInput.focus();
    }
  });
}

export function showChatBox() {
  if (ui.chatBox) ui.chatBox.classList.remove("hidden");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
