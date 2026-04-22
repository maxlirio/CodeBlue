import { state } from "./state.js";
import { setMessage } from "./utils.js";
import { renderClassChoices } from "./ui.js";
import { loop } from "./render.js";
import { attachInput, initTouch } from "./input.js";
import { setSeed, randomSeedString } from "./rng.js";

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
loop();
setMessage("Choose your class to start the run.");
