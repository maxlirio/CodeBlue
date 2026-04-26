import { state, ui } from "./state.js";
import { setMessage } from "./utils.js";
import { renderClassChoices } from "./ui.js";
import { loop } from "./render.js";
import { attachInput, initTouch } from "./input.js";
import { setSeed, randomSeedString } from "./rng.js";
import { initApplyOverlay } from "./augments.js";
import { initQuestUi } from "./quests.js";
import { openMultiOverlay, initChat, showChatBox } from "./multiUi.js";
import { multi } from "./multi.js";
import "./audio.js";

// Read a one-shot "play this dungeon" seed from the URL, then clear the URL.
// After this point, refresh always lands on a clean class screen.
const params = new URLSearchParams(location.hash.replace(/^#/, ""));
const seed = params.get("seed") || randomSeedString();
state.seed = seed;
setSeed(seed);
history.replaceState(null, "", location.pathname);

renderClassChoices();
attachInput();
initTouch();
initApplyOverlay();
initQuestUi();
initChat();
loop();
setMessage("Choose your class to start the run.");

if (ui.playWithFriendsBtn) {
  ui.playWithFriendsBtn.addEventListener("click", async () => {
    const result = await openMultiOverlay();
    if (!result) return; // cancelled
    // Connection is set up; partner is connected. Show a banner on the
    // class screen so both players know they're in a multiplayer run.
    if (ui.multiBanner) {
      ui.multiBanner.classList.remove("hidden");
      const partnerName = multi.partner?.name || "Partner";
      ui.multiBanner.innerHTML =
        `<strong>Multiplayer · ${result.mode.toUpperCase()}</strong>` +
        `<span>Connected to ${partnerName}. Pick your class — your partner is doing the same.</span>`;
    }
    showChatBox();
  });
}
