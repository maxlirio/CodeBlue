import { cols, rows } from "./config.js";
import { state, ui } from "./state.js";

export function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
export function key(x, y) { return `${x},${y}`; }
export function distance(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

export function inBounds(x, y) { return x >= 0 && y >= 0 && x < cols && y < rows; }
export function isWalkable(x, y) { return inBounds(x, y) && state.map[y][x] === 0; }
export function enemyAt(x, y) { return state.enemies.find((e) => e.x === x && e.y === y && e.hp > 0); }

export function lineTiles(x1, y1, x2, y2) {
  const tiles = [];
  let x = x1;
  let y = y1;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    tiles.push({ x, y });
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return tiles;
}

export function setMessage(msg) {
  // When the host is simulating a remote floor (state.floor swapped to
  // partner's floor via withFloorContext), suppress UI updates — the
  // host's screen shouldn't be cluttered with messages about events on
  // a floor they aren't on. Partner gets their own messages via the
  // network handlers (PLAYER_HIT etc).
  if (state.player.floor !== state.floor) return;
  state.message = msg;
  ui.log.textContent = msg;
}

export function levelManaPool(level) { return 10 + Math.floor(level * 1.5); }
