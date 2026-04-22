import { state, canvas, ctx, portraitCtx } from "./state.js";
import {
  tileSize, cols, rows, COLORS, STATUS_DEFS,
  ENEMY_TYPES, BOSS_SPRITE, HERO_SPRITE, PORTRAIT_SPRITE
} from "./config.js";
import { updateUi } from "./ui.js";
import { renderSpellAim, renderAllSpellFx } from "./spells/index.js";

const SPRITE_BY_ENEMY = Object.fromEntries(ENEMY_TYPES.map((t) => [t.id, t.sprite]));

export function drawSprite(targetCtx, sprite, px, py) {
  for (const [color, x, y, w, h] of sprite) {
    targetCtx.fillStyle = color;
    targetCtx.fillRect(px + x, py + y, w, h);
  }
}

function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
}

function drawHero(x, y) {
  drawSprite(ctx, HERO_SPRITE, x * tileSize, y * tileSize);
}

function drawEnemy(enemy) {
  const sprite = SPRITE_BY_ENEMY[enemy.type] || BOSS_SPRITE;
  drawSprite(ctx, sprite, enemy.x * tileSize, enemy.y * tileSize);
}

export function drawPortrait() {
  drawSprite(portraitCtx, PORTRAIT_SPRITE, 0, 0);
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 2, 2);
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function drawFloorEffects() {
  for (const f of state.floorEffects) {
    const px = f.x * tileSize;
    const py = f.y * tileSize;
    if (f.kind === "burn") {
      ctx.fillStyle = "rgba(255,120,40,0.28)";
      ctx.fillRect(px, py, tileSize, tileSize);
      ctx.fillStyle = "#ff9e4f";
      for (let i = 0; i < 3; i++) {
        const bx = px + 4 + i * 6 + ((Date.now() / 90 + i * 3) % 4);
        const by = py + tileSize - 6 - ((Date.now() / 70 + i * 4) % 6);
        ctx.fillRect(bx, by, 2, 2);
      }
    } else if (f.kind === "wall") {
      ctx.fillStyle = "#3a5f2a";
      ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
      ctx.fillStyle = "#84f6a6";
      ctx.fillRect(px + 4, py + 6, 2, 6);
      ctx.fillRect(px + tileSize - 7, py + 10, 2, 6);
      ctx.fillRect(px + 10, py + 4, 2, 4);
    } else if (f.kind === "mine") {
      const pulse = Math.floor(Math.sin(Date.now() / 180) * 80 + 140);
      ctx.fillStyle = `rgb(${pulse + 60},${Math.max(0, pulse - 40)},30)`;
      ctx.fillRect(px + tileSize / 2 - 3, py + tileSize / 2 - 3, 6, 6);
    }
  }
}

function drawStatusMarks(t) {
  if (!t.statuses || !t.statuses.length) return;
  const px = t.x * tileSize;
  const py = t.y * tileSize;
  t.statuses.forEach((s, i) => {
    ctx.fillStyle = STATUS_DEFS[s.kind].color;
    ctx.fillRect(px + 2 + i * 4, py + 1, 3, 3);
  });
}

function drawMap() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (state.map.length && state.map[y][x] === 1) drawTile(x, y, COLORS.wall);
      else drawTile(x, y, (x + y) % 2 ? COLORS.floor : COLORS.floorShade);
    }
  }
}

function drawPickups() {
  for (const c of state.coins) drawTile(c.x, c.y, COLORS.coin);
  for (const p of state.potions) drawTile(p.x, p.y, COLORS.potion);
  for (const relic of state.relicDrops) drawTile(relic.x, relic.y, COLORS.relic);
  for (const scroll of state.spellDrops) drawTile(scroll.x, scroll.y, COLORS.spell);
  for (const weapon of state.weaponDrops) drawTile(weapon.x, weapon.y, COLORS.weapon);
  if (state.stairs) drawTile(state.stairs.x, state.stairs.y, COLORS.stairs);
}


function drawFog() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = Math.abs(x - state.player.x) + Math.abs(y - state.player.y);
      if (d > 8) {
        ctx.fillStyle = COLORS.fog;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }
}

export function draw() {
  let sx = 0, sy = 0;
  if (state.screenShake > 0) {
    sx = (Math.random() - 0.5) * state.screenShake;
    sy = (Math.random() - 0.5) * state.screenShake;
    state.screenShake -= 1;
  }
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(sx, sy);

  drawMap();
  drawFloorEffects();
  drawPickups();

  for (const enemy of state.enemies) { drawEnemy(enemy); drawStatusMarks(enemy); }
  drawHero(state.player.x, state.player.y);
  drawStatusMarks(state.player);
  renderAllSpellFx();
  drawParticles();

  renderSpellAim();
  drawFog();

  ctx.restore();
  updateUi();
}

export function loop() { draw(); requestAnimationFrame(loop); }
