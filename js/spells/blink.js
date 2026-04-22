import { state } from "../state.js";
import { SCHOOL_COLORS, tileSize, HERO_SPRITE } from "../config.js";
import { inBounds, enemyAt, distance, setMessage } from "../utils.js";
import { spawnBurst, doScreenShake, isWallBlocked } from "../fx.js";
import { drawSprite } from "../render.js";
import {
  ctx as canvasCtx, tileCenter, strokeTile, strokeReticle, strokeCircle, fillCircle
} from "./_draw.js";

export const meta = {
  id: "blink",
  name: "Blink",
  school: "arcane",
  cost: 4,
  targeting: "teleport",
  range: 6,
  desc: "Teleport to a visible tile."
};

function isValidDest(x, y) {
  return inBounds(x, y) && state.map[y][x] !== 1 && !enemyAt(x, y) && !isWallBlocked(x, y);
}

export function drawAim({ mx, my, charged }) {
  const c = tileCenter(state.player.x, state.player.y);
  const r = meta.range * tileSize * 0.9;
  strokeCircle(c.x, c.y, r, SCHOOL_COLORS.arcane, { width: 1.5, alpha: 0.35 });
  const inRange = distance({ x: mx, y: my }, state.player) <= meta.range;
  const valid = isValidDest(mx, my) && inRange;
  strokeTile(mx, my, valid ? SCHOOL_COLORS.arcane : "#7a3030", { inset: 3, width: 2, alpha: 0.9 });
  if (valid) {
    const m = tileCenter(mx, my);
    fillCircle(m.x, m.y, 6 + Math.sin(Date.now() / 120) * 2, SCHOOL_COLORS.arcane, { alpha: 0.4 });
  }
  strokeReticle(mx, my, charged);
}

const trails = [];

export function renderFx() {
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    const a = t.life / t.max;
    canvasCtx.globalAlpha = a * 0.6;
    drawSprite(canvasCtx, HERO_SPRITE, t.px, t.py);
    canvasCtx.globalAlpha = 1;
    const c = { x: t.px + tileSize / 2, y: t.py + tileSize / 2 };
    fillCircle(c.x, c.y, 4 + (1 - a) * 6, SCHOOL_COLORS.arcane, { alpha: a * 0.4 });
    t.life--;
    if (t.life <= 0) trails.splice(i, 1);
  }
}

export function effect(ctx) {
  const { tx, ty } = ctx;
  if (!isValidDest(tx, ty)) {
    setMessage("Can't blink there.");
    return { acted: false };
  }
  const fromX = state.player.x;
  const fromY = state.player.y;
  spawnBurst(fromX, fromY, SCHOOL_COLORS.arcane, 12);
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const k = i / (steps - 1);
    const px = (fromX + (tx - fromX) * k) * tileSize;
    const py = (fromY + (ty - fromY) * k) * tileSize;
    trails.push({ px, py, life: 16 - i * 2, max: 16 });
  }
  state.player.x = tx;
  state.player.y = ty;
  spawnBurst(tx, ty, SCHOOL_COLORS.arcane, 14);
  doScreenShake(3);
  setMessage("You blink.");
  return { acted: true, offensive: false };
}
