// Looping background music. Starts on first user interaction because
// browsers block autoplay of media with sound. Preference remembered
// in localStorage under "pixelRogueMute".

const bgm = document.getElementById("bgm");
const btn = document.getElementById("muteBtn");
const STORAGE_KEY = "pixelRogueMute";

let muted = localStorage.getItem(STORAGE_KEY) === "1";
if (bgm) {
  bgm.volume = 0.35;
  bgm.muted = muted;
}
syncButton();

function syncButton() {
  if (!btn) return;
  btn.classList.toggle("muted", muted);
  btn.textContent = muted ? "♪" : "♪";
}

function setMuted(v) {
  muted = v;
  if (bgm) bgm.muted = v;
  localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  syncButton();
}

function tryStart() {
  if (!bgm) return;
  if (bgm.paused) bgm.play().catch(() => { /* user hasn't interacted yet, will retry */ });
}

// Browser autoplay gate: the first real user gesture on the page unblocks audio.
function onFirstGesture() {
  tryStart();
  window.removeEventListener("pointerdown", onFirstGesture);
  window.removeEventListener("keydown", onFirstGesture);
  window.removeEventListener("touchstart", onFirstGesture);
}
window.addEventListener("pointerdown", onFirstGesture, { once: false });
window.addEventListener("keydown", onFirstGesture, { once: false });
window.addEventListener("touchstart", onFirstGesture, { once: false });

if (btn) {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setMuted(!muted);
    tryStart();
  });
}

// Global M hotkey (guarded so it doesn't fire while typing hero name)
window.addEventListener("keydown", (e) => {
  if (document.activeElement && document.activeElement.tagName === "INPUT") return;
  if (e.key && e.key.toLowerCase() === "m") { setMuted(!muted); tryStart(); }
});
