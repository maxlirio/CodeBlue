import { state, ui, canvas, ctx, portraitCtx } from "./state.js";
import {
  tileSize, cols, rows, COLORS, STATUS_DEFS,
  ENEMY_TYPES, BOSS_SPRITE, HERO_SPRITE, PORTRAIT_SPRITE,
  HERO_SPRITES, PORTRAIT_SPRITES,
  COIN_SPRITE, POTION_SPRITE, RELIC_SPRITE,
  BUILDING_SPRITES, DUNGEON_ENTRANCE_SPRITE,
  TREE_SPRITE, FOUNTAIN_SPRITE,
  STAIRS_DOWN_SPRITE, STAIRS_UP_SPRITE,
  CHEST_CLOSED_SPRITE, CHEST_OPEN_SPRITE,
  SHOP_INTERIOR_PALETTES, VENDOR_SPRITES,
  COUNTER_SPRITE, SHELF_SPRITE, BANNER_SPRITE,
  EXIT_DOOR_SPRITE, EXIT_RUG_SPRITE,
  SHOP_DECORATIONS,
  ANVIL_SPRITE, ARMOR_STAND_SPRITE, WALL_SWORD_SPRITE, WALL_SHIELD_SPRITE, FORGE_SPRITE,
  CAULDRON_SPRITE, VIAL_SHELF_SPRITE, HERB_BUNDLE_SPRITE,
  BOOKSHELF_SPRITE, CRYSTAL_BALL_SPRITE, HANGING_SCROLL_SPRITE,
  MASK_SPRITE, DISPLAY_CASE_SPRITE, POTTED_PLANT_SPRITE,
  LANTERN_SPRITE, SIGNPOST_SPRITE, BARREL_SPRITE, CRATE_SPRITE, FLOWER_PATCH_SPRITE
} from "./config.js";

const DECO_SPRITES = {
  anvil: ANVIL_SPRITE,
  armorStand: ARMOR_STAND_SPRITE,
  wallSword: WALL_SWORD_SPRITE,
  wallShield: WALL_SHIELD_SPRITE,
  forge: FORGE_SPRITE,
  cauldron: CAULDRON_SPRITE,
  vialShelf: VIAL_SHELF_SPRITE,
  herbBundle: HERB_BUNDLE_SPRITE,
  bookshelf: BOOKSHELF_SPRITE,
  crystalBall: CRYSTAL_BALL_SPRITE,
  scroll: HANGING_SCROLL_SPRITE,
  mask: MASK_SPRITE,
  displayCase: DISPLAY_CASE_SPRITE,
  pottedPlant: POTTED_PLANT_SPRITE,
  barrel: BARREL_SPRITE,
  crate: CRATE_SPRITE
};

const TOWN_PROP_SPRITES = {
  lantern: LANTERN_SPRITE,
  sign: SIGNPOST_SPRITE,
  barrel: BARREL_SPRITE,
  crate: CRATE_SPRITE,
  flowers: FLOWER_PATCH_SPRITE
};
import { updateUi } from "./ui.js";
import { renderSpellAim, renderAllSpellFx } from "./spells/index.js";
import { tickEnemies } from "./protocols.js";
import { tickRealtime, cullDyingEnemies } from "./combat.js";
import { endRun } from "./turn.js";

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
  const sprite = HERO_SPRITES[state.player.className] || HERO_SPRITE;
  drawSprite(ctx, sprite, x * tileSize, y * tileSize);
}

function drawEnemy(enemy) {
  const sprite = SPRITE_BY_ENEMY[enemy.type] || BOSS_SPRITE;
  if (enemy.hp <= 0 && enemy.dying > 0) {
    ctx.save();
    ctx.globalAlpha = enemy.dying / 18;
    drawSprite(ctx, sprite, enemy.x * tileSize, enemy.y * tileSize);
    ctx.restore();
    return;
  }
  drawSprite(ctx, sprite, enemy.x * tileSize, enemy.y * tileSize);
}

export function drawPortrait() {
  // Backdrop so the hero sprite reads cleanly in the HUD frame.
  portraitCtx.fillStyle = "#101028";
  portraitCtx.fillRect(0, 0, 24, 24);
  const sprite = HERO_SPRITES[state.player.className] || HERO_SPRITE;
  drawSprite(portraitCtx, sprite, 0, 0);
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
    } else if (f.kind === "trap") {
      const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 240 + (f.x + f.y));
      ctx.strokeStyle = `rgba(132,246,166,${pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 2, py + tileSize - 2);
      ctx.lineTo(px + tileSize - 2, py + 2);
      ctx.moveTo(px + 2, py + 2);
      ctx.lineTo(px + tileSize - 2, py + tileSize - 2);
      ctx.stroke();
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

function isCoveredByBuilding(x, y) {
  if (!state.buildings || !state.buildings.length) return false;
  for (const b of state.buildings) {
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
  }
  return false;
}

function isFountainTile(x, y) {
  if (!state.fountains || !state.fountains.length) return false;
  for (const f of state.fountains) {
    if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) return true;
  }
  return false;
}

function isTreeTile(x, y) {
  return state.trees && state.trees.some((t) => t.x === x && t.y === y);
}

function isPathTile(x, y) {
  return state.paths && state.paths.some((p) => p.x === x && p.y === y);
}

function drawMap() {
  if (state.shopInterior) { drawInteriorMap(); return; }
  const inTown = state.floor === 0;
  const floorA = inTown ? COLORS.townFloor : COLORS.floor;
  const floorB = inTown ? COLORS.townFloorShade : COLORS.floorShade;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!state.map.length) continue;
      if (inTown && isCoveredByBuilding(x, y)) { drawTile(x, y, floorA); continue; }
      if (inTown && isFountainTile(x, y)) { drawTile(x, y, floorA); continue; }
      if (inTown && isTreeTile(x, y)) { drawTile(x, y, floorA); continue; }
      if (inTown && isPathTile(x, y)) { drawTile(x, y, (x + y) % 2 ? COLORS.townPathA : COLORS.townPathB); continue; }
      if (state.map[y][x] === 1) drawTile(x, y, COLORS.wall);
      else drawTile(x, y, (x + y) % 2 ? floorA : floorB);
    }
  }
}

function drawInteriorMap() {
  const si = state.shopInterior;
  const pal = SHOP_INTERIOR_PALETTES[si.kind] || SHOP_INTERIOR_PALETTES.weapon;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (state.map[y][x] === 1) {
        // Outside the room — pure black to feel cozy
        drawTile(x, y, "#020204");
      } else {
        // Floor inside
        drawTile(x, y, (x + y) % 2 ? pal.floorA : pal.floorB);
      }
    }
  }
  // Top wall band — drawn over the inside-top row for depth
  const { x0, y0, w } = si.bounds;
  ctx.fillStyle = pal.wall;
  ctx.fillRect(x0 * tileSize, y0 * tileSize, w * tileSize, tileSize);
  ctx.fillStyle = pal.wallTop;
  ctx.fillRect(x0 * tileSize, y0 * tileSize + tileSize - 4, w * tileSize, 4);
}

function drawShopInteriorFurniture() {
  const si = state.shopInterior;
  if (!si) return;
  const pal = SHOP_INTERIOR_PALETTES[si.kind] || SHOP_INTERIOR_PALETTES.weapon;

  // Banner above vendor
  const bx = si.banner.x * tileSize;
  const by = si.banner.y * tileSize;
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(bx + 4, by - 2, 40, 2);
  for (const [color, dx, dy, dw, dh] of BANNER_SPRITE) {
    ctx.fillStyle = color === "#a8323e" ? pal.banner : color;
    ctx.fillRect(bx + dx, by + dy, dw, dh);
  }
  // Accent dot on banner
  ctx.fillStyle = pal.accent;
  ctx.fillRect(bx + 22, by + 8, 4, 4);

  // Shop-specific decorations (anvil, cauldron, bookshelves, etc.)
  const decorations = SHOP_DECORATIONS[si.kind] || [];
  const { x0, y0 } = si.bounds;
  for (const d of decorations) {
    const sprite = DECO_SPRITES[d.sprite];
    if (!sprite) continue;
    drawSprite(ctx, sprite, (x0 + d.rx) * tileSize, (y0 + d.ry) * tileSize);
  }

  // Counter — drawn across the row, on top of any decorations
  for (let cx = si.counterX0; cx <= si.counterX1; cx++) {
    drawSprite(ctx, COUNTER_SPRITE, cx * tileSize, si.counterY * tileSize);
  }

  // Exit rug
  drawSprite(ctx, EXIT_RUG_SPRITE, si.exit.x * tileSize, si.exit.y * tileSize);
  // Exit door visual just behind/over rug for clarity (small)
  const exDoorX = si.exit.x * tileSize;
  const exDoorY = si.exit.y * tileSize - 2;
  ctx.fillStyle = pal.accent;
  ctx.fillRect(exDoorX + 10, exDoorY, 4, 2);

  // Vendor sprite on vendor tile
  const vendor = VENDOR_SPRITES[si.kind];
  if (vendor) drawSprite(ctx, vendor, si.vendor.x * tileSize, si.vendor.y * tileSize);
}

function drawTownFeatures() {
  if (state.shopInterior) return;
  if (state.floor !== 0) return;
  for (const t of state.trees || []) drawSprite(ctx, TREE_SPRITE, t.x * tileSize, t.y * tileSize);
  for (const f of state.fountains || []) drawSprite(ctx, FOUNTAIN_SPRITE, f.x * tileSize, f.y * tileSize);
  for (const b of state.buildings || []) {
    const sprite = b.shop ? BUILDING_SPRITES[b.shop] : DUNGEON_ENTRANCE_SPRITE;
    if (sprite) drawSprite(ctx, sprite, b.x * tileSize, b.y * tileSize);
  }
  for (const p of state.props || []) {
    const sprite = TOWN_PROP_SPRITES[p.kind];
    if (sprite) drawSprite(ctx, sprite, p.x * tileSize, p.y * tileSize);
  }
}

function drawPickups() {
  for (const chest of state.chests || []) {
    const sprite = chest.opened ? CHEST_OPEN_SPRITE : CHEST_CLOSED_SPRITE;
    drawSprite(ctx, sprite, chest.x * tileSize, chest.y * tileSize);
  }
  if (state.stairs) drawSprite(ctx, STAIRS_DOWN_SPRITE, state.stairs.x * tileSize, state.stairs.y * tileSize);
  if (state.stairsUp) drawSprite(ctx, STAIRS_UP_SPRITE, state.stairsUp.x * tileSize, state.stairsUp.y * tileSize);
}


function drawFog() {
  if (state.floor === 0) return;
  if (state.shopInterior) return;
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
  drawTownFeatures();
  if (state.shopInterior) drawShopInteriorFurniture();
  if (!state.shopInterior) drawPickups();

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

function isPaused() {
  if (state.over) return true;
  if (!state.started) return true;
  if (state.awaitingShop) return true;
  if (state.backpackOpen) return true;
  if (state.aimMode) return true;
  if (state.tutorialOpen) return true;
  if (state.chestOpen) return true;
  if (state.discardOpen) return true;
  if (state.applyOpen) return true;
  if (ui.cutsceneOverlay && !ui.cutsceneOverlay.classList.contains("hidden")) return true;
  if (ui.questCompleteOverlay && !ui.questCompleteOverlay.classList.contains("hidden")) return true;
  return false;
}

let lastFrameMs = null;
const STATUS_TICK_MS = 500;
let statusAccum = 0;

function tickWorld(dt) {
  if (state.player.hp <= 0) return;
  if (state.player.moveTimer > 0) state.player.moveTimer = Math.max(0, state.player.moveTimer - dt);

  statusAccum += dt;
  while (statusAccum >= STATUS_TICK_MS) {
    statusAccum -= STATUS_TICK_MS;
    tickRealtime();
    if (state.player.hp <= 0) {
      state.player.hp = 0;
      endRun("Lingering effects overwhelm you.");
      return;
    }
  }

  tickEnemies(dt);
  cullDyingEnemies();

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    const who = state.lastHitBy || "the dungeon";
    endRun(`Slain by ${who} on floor ${state.floor}.`);
  }
}

export function loop() {
  const now = performance.now();
  const dt = lastFrameMs == null ? 0 : Math.min(now - lastFrameMs, 100);
  lastFrameMs = now;
  if (!isPaused()) tickWorld(dt);
  else statusAccum = 0;
  draw();
  requestAnimationFrame(loop);
}
