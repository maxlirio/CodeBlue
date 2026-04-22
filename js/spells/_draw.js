import { ctx } from "../state.js";
import { tileSize } from "../config.js";

export { ctx, tileSize };

export function tileCenter(x, y) {
  return { x: x * tileSize + tileSize / 2, y: y * tileSize + tileSize / 2 };
}

export function strokeTile(x, y, color, { inset = 2, width = 2, alpha = 1 } = {}) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(x * tileSize + inset, y * tileSize + inset, tileSize - inset * 2, tileSize - inset * 2);
  ctx.globalAlpha = 1;
}

export function fillTile(x, y, color, { inset = 0, alpha = 1 } = {}) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize + inset, y * tileSize + inset, tileSize - inset * 2, tileSize - inset * 2);
  ctx.globalAlpha = 1;
}

export function strokeReticle(x, y, charged = false) {
  strokeTile(x, y, charged ? "#ffd166" : "#ffffff", { inset: 2, width: charged ? 3 : 2 });
}

export function strokeLinePx(x1, y1, x2, y2, color, { width = 2, alpha = 1 } = {}) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function strokePolyline(points, color, { width = 2, alpha = 1 } = {}) {
  if (points.length < 2) return;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function fillCircle(x, y, r, color, { alpha = 1 } = {}) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function strokeCircle(x, y, r, color, { width = 2, alpha = 1 } = {}) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function jaggedPoints(x1, y1, x2, y2, jitter = 4, segs = 8) {
  const pts = [{ x: x1, y: y1 }];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const nx = -dy;
  const ny = dx;
  const nl = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const off = (Math.random() - 0.5) * 2 * jitter;
    pts.push({ x: x1 + dx * t + (nx / nl) * off, y: y1 + dy * t + (ny / nl) * off });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}
