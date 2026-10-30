// ============================================================================
// ASCENSÃO ARCANA — 2.5D Pixel-Art Sprite Generator & Offscreen Texture Cache
// ============================================================================
// Procedurally synthesizes crisp, layered 2.5D pixel-art sprites with 1px dark
// outlines, directional shading, cloth physics cues, glowing implements, and
// orbiting arcane class relics (GDD Section 4 & Section 15).
// ============================================================================

import { ARCANA_CLASSES, ARCANA_ENEMIES } from './data';
import type {
  ActiveBoss,
  ActiveEnemy,
  ActiveSummonOrConstruct,
  ArcanaClassId,
  CampaignId,
  EntityAnimState,
  EnemyArchetypeId,
  MapDecoration,
  MapObstacle,
  MapPoiInstance,
} from './types';

// ----------------------------------------------------------------------------
// Offscreen Pixel Grid Builder & Cache
// ----------------------------------------------------------------------------

const SPRITE_CACHE = new Map<string, HTMLCanvasElement>();
const MAX_CACHE_ENTRIES = 512;

interface PixelGrid {
  w: number;
  h: number;
  pixels: (string | null)[];
}

function createGrid(w: number, h: number): PixelGrid {
  return { w, h, pixels: new Array<string | null>(w * h).fill(null) };
}

function setPx(g: PixelGrid, x: number, y: number, color: string | null): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= g.w || iy < 0 || iy >= g.h) return;
  g.pixels[iy * g.w + ix] = color;
}

function fillRectPx(g: PixelGrid, x: number, y: number, w: number, h: number, color: string): void {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  const x1 = Math.round(x + w);
  const y1 = Math.round(y + h);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      setPx(g, px, py, color);
    }
  }
}

function fillEllipsePx(g: PixelGrid, cx: number, cy: number, rx: number, ry: number, color: string): void {
  const x0 = Math.floor(cx - rx);
  const x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry);
  const y1 = Math.ceil(cy + ry);
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = (px - cx) / Math.max(0.5, rx);
      const dy = (py - cy) / Math.max(0.5, ry);
      if (dx * dx + dy * dy <= 1.0) {
        setPx(g, px, py, color);
      }
    }
  }
}

function drawLinePx(g: PixelGrid, x0: number, y0: number, x1: number, y1: number, color: string): void {
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const sx = ix0 < ix1 ? 1 : -1;
  const dy = -Math.abs(iy1 - iy0);
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPx(g, ix0, iy0, color);
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      ix0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      iy0 += sy;
    }
  }
}

function applyPixelOutline(g: PixelGrid, outlineColor = '#0a0714'): void {
  const copy = g.pixels.slice();
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (copy[y * g.w + x] !== null) continue;
      for (let d = 0; d < dirs.length; d++) {
        const nx = x + dirs[d][0];
        const ny = y + dirs[d][1];
        if (nx >= 0 && nx < g.w && ny >= 0 && ny < g.h && copy[ny * g.w + nx] !== null) {
          g.pixels[y * g.w + x] = outlineColor;
          break;
        }
      }
    }
  }
}

function bakeGridToCanvas(g: PixelGrid, pixelScale: number, hitFlash = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = g.w * pixelScale;
  canvas.height = g.h * pixelScale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const col = g.pixels[y * g.w + x];
      if (!col) continue;
      if (hitFlash) {
        ctx.fillStyle = col === '#0a0714' ? '#3a2040' : '#ffffff';
      } else {
        ctx.fillStyle = col;
      }
      ctx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
    }
  }
  return canvas;
}

function getCachedSprite(key: string, builder: () => HTMLCanvasElement): HTMLCanvasElement {
  const existing = SPRITE_CACHE.get(key);
  if (existing) return existing;
  if (SPRITE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = SPRITE_CACHE.keys().next().value;
    if (firstKey) SPRITE_CACHE.delete(firstKey);
  }
  const built = builder();
  SPRITE_CACHE.set(key, built);
  return built;
}

export function clearSpriteCache(): void {
  SPRITE_CACHE.clear();
}

// ----------------------------------------------------------------------------
// 1. Playable Classes (Chess, Chrono, Chaos, Rune)
// ----------------------------------------------------------------------------

export interface ClassSpriteDrawOptions {
  animState: EntityAnimState;
  animTime: number;
  facingX: number;
  facingY: number;
  hitFlash: boolean;
  scale?: number;
  alpha?: number;
  isDashGhost?: boolean;
  gaugeValue?: number; // Coordination / Sequence / Instability / Rune count
}

function buildClassFrameCanvas(
  classId: ArcanaClassId,
  animState: EntityAnimState,
  frameIdx: number,
  hitFlash: boolean
): HTMLCanvasElement {
  const key = `cls_${classId}_${animState}_${frameIdx}_${hitFlash ? 1 : 0}`;
  return getCachedSprite(key, () => {
    const g = createGrid(32, 36);
    const pal = ARCANA_CLASSES[classId].palette;

    const isWalk = animState === 'walk';
    const isCast = animState === 'cast' || animState === 'attack';
    const isVictory = animState === 'victory';
    const isDefeat = animState === 'defeat';

    const bob = isWalk ? (frameIdx % 2 === 0 ? -1 : 0) : frameIdx === 1 || frameIdx === 3 ? -1 : 0;
    const legLeft = isWalk ? (frameIdx === 0 ? -2 : frameIdx === 2 ? 2 : 0) : 0;
    const legRight = isWalk ? -legLeft : 0;
    const castArmRaise = isCast || isVictory ? -3 : 0;

    if (isDefeat) {
      // Fallen wizard robe & hat on ground
      fillEllipsePx(g, 16, 29, 9, 4, pal.cloth);
      fillEllipsePx(g, 15, 28, 7, 3, pal.secondary);
      fillRectPx(g, 10, 25, 8, 3, pal.primary);
      fillRectPx(g, 18, 26, 5, 2, pal.accent);
      applyPixelOutline(g, '#0a0714');
      return bakeGridToCanvas(g, 2, hitFlash);
    }

    // Boots / Legs
    fillRectPx(g, 12, 28 + Math.max(0, legLeft), 3, 4, '#1b1528');
    fillRectPx(g, 17, 28 + Math.max(0, legRight), 3, 4, '#1b1528');
    fillRectPx(g, 12, 30 + Math.max(0, legLeft), 3, 2, pal.accent);
    fillRectPx(g, 17, 30 + Math.max(0, legRight), 3, 2, pal.accent);

    // Flowing Cape / Back Robe
    const capeSway = frameIdx === 1 ? 1 : frameIdx === 3 ? -1 : 0;
    fillRectPx(g, 9 + capeSway, 16 + bob, 14, 13, pal.secondary);
    fillRectPx(g, 8 + capeSway, 21 + bob, 16, 8, pal.secondary);

    // Main Tunic / Robes
    fillRectPx(g, 11, 16 + bob, 10, 13, pal.cloth);
    fillRectPx(g, 13, 16 + bob, 6, 12, pal.secondary);
    // Gold/Accent trim down the robe center
    fillRectPx(g, 15, 17 + bob, 2, 11, pal.accent);

    // Shoulders / Mantle
    fillRectPx(g, 9, 15 + bob, 14, 3, pal.cloth);
    fillRectPx(g, 10, 15 + bob, 12, 1, pal.accent);

    // Head & Face
    fillRectPx(g, 12, 10 + bob, 8, 6, '#f3d5b5');
    fillRectPx(g, 12, 14 + bob, 8, 2, pal.secondary); // collar/mask shadow
    // Glowing Arcane Eyes
    setPx(g, 14, 12 + bob, pal.glow);
    setPx(g, 15, 12 + bob, '#ffffff');
    setPx(g, 18, 12 + bob, pal.glow);
    setPx(g, 19, 12 + bob, '#ffffff');

    // Class-Specific Headgear & Silhouette Details
    if (classId === 'chess') {
      // Grandmaster Imperial Crown-Mitre with Chess King Cross
      fillRectPx(g, 11, 6 + bob, 10, 4, pal.primary);
      fillRectPx(g, 12, 5 + bob, 8, 2, pal.accent);
      fillRectPx(g, 15, 2 + bob, 2, 4, pal.accent);
      fillRectPx(g, 14, 3 + bob, 4, 1, pal.accent);
      // Checkerboard trim on robe hem
      for (let cx = 11; cx < 21; cx += 2) {
        setPx(g, cx, 27 + bob, pal.primary);
        setPx(g, cx + 1, 28 + bob, pal.primary);
      }
      // Ivory Scepter in right hand
      const sy = 14 + bob + castArmRaise;
      fillRectPx(g, 24, sy - 4, 2, 14, '#e8e0d5');
      fillRectPx(g, 23, sy - 6, 4, 3, pal.accent);
      fillRectPx(g, 24, sy - 8, 2, 2, pal.glow);
    } else if (classId === 'chrono') {
      // Clockwork Astrolabe Hood & Golden Gear Halo
      fillRectPx(g, 11, 7 + bob, 10, 4, pal.cloth);
      fillRectPx(g, 12, 5 + bob, 8, 3, pal.accent);
      fillRectPx(g, 14, 3 + bob, 4, 2, pal.primary);
      // Glowing cyan scarf tail
      fillRectPx(g, 7 + capeSway, 15 + bob, 3, 8, pal.primary);
      // Hourglass Staff in right hand
      const sy = 14 + bob + castArmRaise;
      fillRectPx(g, 24, sy - 3, 2, 14, pal.accent);
      fillRectPx(g, 23, sy - 7, 4, 4, pal.primary);
      setPx(g, 24, sy - 5, '#ffffff');
    } else if (classId === 'chaos') {
      // Asymmetrical Jester-Witch Twin-Peak Hat with Neon Bells
      fillRectPx(g, 9, 8 + bob, 14, 2, pal.cloth);
      fillRectPx(g, 10, 5 + bob, 5, 3, pal.primary);
      fillRectPx(g, 17, 5 + bob, 5, 3, pal.secondary);
      fillRectPx(g, 8, 4 + bob, 3, 2, pal.accent);
      fillRectPx(g, 21, 4 + bob, 3, 2, pal.glow);
      // Levitating Prismatic Catalyst in hand
      const sy = 13 + bob + castArmRaise;
      fillRectPx(g, 23, sy - 4, 4, 4, pal.primary);
      fillRectPx(g, 24, sy - 3, 2, 2, '#ffffff');
      setPx(g, 22, sy - 2, pal.accent);
      setPx(g, 27, sy - 2, pal.glow);
    } else {
      // Rune Weaver: High Calligrapher Archon Mitre & Floating Scroll Mantle
      fillRectPx(g, 11, 6 + bob, 10, 4, pal.cloth);
      fillRectPx(g, 13, 3 + bob, 6, 4, pal.primary);
      fillRectPx(g, 15, 2 + bob, 2, 6, pal.glow);
      // Glowing runic stole strips down front
      fillRectPx(g, 12, 18 + bob, 2, 9, pal.primary);
      fillRectPx(g, 18, 18 + bob, 2, 9, pal.primary);
      setPx(g, 12, 22 + bob, pal.glow);
      setPx(g, 18, 24 + bob, pal.glow);
      // Great Calligraphy Brush-Staff in right hand
      const sy = 14 + bob + castArmRaise;
      fillRectPx(g, 24, sy - 2, 2, 13, '#5c4033');
      fillRectPx(g, 23, sy - 6, 4, 4, pal.glow);
      fillRectPx(g, 24, sy - 8, 2, 2, '#ffffff');
    }

    // Left hand arcane focus glow when casting
    if (isCast || isVictory) {
      fillRectPx(g, 6, 13 + bob, 3, 3, pal.glow);
      setPx(g, 7, 14 + bob, '#ffffff');
    } else {
      fillRectPx(g, 8, 18 + bob, 2, 3, '#f3d5b5');
    }

    applyPixelOutline(g, '#0a0714');
    return bakeGridToCanvas(g, 2, hitFlash);
  });
}

export function drawClassSprite(
  ctx: CanvasRenderingContext2D,
  classId: ArcanaClassId,
  x: number,
  y: number,
  opts: ClassSpriteDrawOptions
): void {
  const pal = ARCANA_CLASSES[classId].palette;
  const scale = opts.scale ?? 1;
  const frameIdx = Math.floor(opts.animTime * 8) % 4;
  const sprite = buildClassFrameCanvas(classId, opts.animState, frameIdx, opts.hitFlash);

  ctx.save();
  ctx.translate(x, y);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;

  // Ground shadow + class aura ring
  if (!opts.isDashGhost) {
    ctx.fillStyle = 'rgba(4, 3, 12, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 6 * scale, 18 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = pal.glow;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = (opts.alpha ?? 1) * 0.42;
    ctx.beginPath();
    ctx.ellipse(0, 6 * scale, 21 * scale, 9.5 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = opts.alpha ?? 1;
  }

  // Flip horizontally based on facingX
  const flip = opts.facingX < -0.05 ? -1 : 1;
  ctx.save();
  ctx.scale(flip * scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height + 10);
  ctx.restore();

  // Orbiting Class Relics (floating pieces / gears / dice / runes)
  if (!opts.isDashGhost && opts.animState !== 'defeat') {
    const t = opts.animTime;
    const count = 3;
    for (let i = 0; i < count; i++) {
      const ang = t * 2.2 + (i * Math.PI * 2) / count;
      const ox = Math.cos(ang) * 26 * scale;
      const oy = -18 * scale + Math.sin(ang) * 8 * scale;

      ctx.fillStyle = pal.glow;
      ctx.strokeStyle = '#0a0714';
      ctx.lineWidth = 1.5;

      if (classId === 'chess') {
        // Floating ivory chess crown / pawn
        ctx.fillStyle = i === 0 ? pal.accent : pal.primary;
        ctx.beginPath();
        ctx.moveTo(ox, oy - 5 * scale);
        ctx.lineTo(ox + 4 * scale, oy + 3 * scale);
        ctx.lineTo(ox - 4 * scale, oy + 3 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (classId === 'chrono') {
        // Golden spinning clock gear
        ctx.fillStyle = i % 2 === 0 ? pal.accent : pal.primary;
        ctx.beginPath();
        ctx.arc(ox, oy, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (classId === 'chaos') {
        // Rotating neon diamond card / die
        ctx.fillStyle = i === 0 ? '#ff4ecd' : i === 1 ? '#ffbe0b' : '#00f5d4';
        ctx.beginPath();
        ctx.moveTo(ox, oy - 5 * scale);
        ctx.lineTo(ox + 4 * scale, oy);
        ctx.lineTo(ox, oy + 5 * scale);
        ctx.lineTo(ox - 4 * scale, oy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Floating glowing rune tablet
        ctx.fillStyle = pal.glow;
        ctx.fillRect(ox - 3 * scale, oy - 4 * scale, 6 * scale, 8 * scale);
        ctx.strokeRect(ox - 3 * scale, oy - 4 * scale, 6 * scale, 8 * scale);
      }
    }
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 2. Enemy Archetypes (10 Distinct Pixel-Art Silhouettes)
// ----------------------------------------------------------------------------

function buildEnemyFrameCanvas(
  archetypeId: EnemyArchetypeId,
  frameIdx: number,
  hitFlash: boolean,
  isElite: boolean
): HTMLCanvasElement {
  const key = `en_${archetypeId}_${frameIdx}_${hitFlash ? 1 : 0}_${isElite ? 1 : 0}`;
  return getCachedSprite(key, () => {
    const g = createGrid(30, 32);
    const def = ARCANA_ENEMIES[archetypeId];
    const p1 = def.palette.primary;
    const p2 = def.palette.secondary;
    const eye = def.palette.eyeGlow;
    const bob = frameIdx % 2 === 0 ? -1 : 0;

    switch (archetypeId) {
      case 'patroller': {
        // Runic Stone Automaton: Broad golem torso, floating rune head, glowing core
        fillRectPx(g, 10, 23 + bob, 4, 5, p2);
        fillRectPx(g, 16, 23 - bob, 4, 5, p2);
        fillRectPx(g, 9, 12 + bob, 12, 11, p1);
        fillRectPx(g, 11, 14 + bob, 8, 7, p2);
        fillRectPx(g, 13, 15 + bob, 4, 4, eye);
        fillRectPx(g, 11, 6 + bob, 8, 5, p1);
        setPx(g, 13, 8 + bob, eye);
        setPx(g, 16, 8 + bob, eye);
        break;
      }
      case 'ranged_caster': {
        // Void Acolyte: Hooded cultist with floating void orb & staff
        fillRectPx(g, 10, 14 + bob, 10, 14, p2);
        fillRectPx(g, 11, 15 + bob, 8, 12, p1);
        fillRectPx(g, 11, 7 + bob, 8, 7, p1);
        fillRectPx(g, 12, 9 + bob, 6, 4, '#090414');
        setPx(g, 13, 11 + bob, eye);
        setPx(g, 16, 11 + bob, eye);
        // Staff & Void Orb
        fillRectPx(g, 22, 9 + bob, 2, 17, '#5c3c7a');
        fillRectPx(g, 21, 6 + bob, 4, 4, eye);
        break;
      }
      case 'charger': {
        // Obsidian Ram: Horned quadrupedal/hulking juggernaut with molten vents
        fillRectPx(g, 8, 22 + bob, 4, 6, p2);
        fillRectPx(g, 18, 22 - bob, 4, 6, p2);
        fillRectPx(g, 7, 11 + bob, 16, 12, p1);
        fillRectPx(g, 9, 13 + bob, 12, 8, p2);
        // Curved horns
        fillRectPx(g, 5, 8 + bob, 4, 5, '#d9d2e9');
        fillRectPx(g, 21, 8 + bob, 4, 5, '#d9d2e9');
        // Glowing visor eyes
        fillRectPx(g, 11, 15 + bob, 3, 2, eye);
        fillRectPx(g, 16, 15 + bob, 3, 2, eye);
        break;
      }
      case 'area_conjuror': {
        // Living Ash Pyromancer: Flame-crowned robes + burning brazier hands
        fillRectPx(g, 10, 14 + bob, 10, 14, p2);
        fillRectPx(g, 11, 14 + bob, 8, 12, p1);
        fillRectPx(g, 11, 8 + bob, 8, 6, p2);
        fillRectPx(g, 12, 4 + bob, 6, 4, eye);
        setPx(g, 13, 10 + bob, eye);
        setPx(g, 16, 10 + bob, eye);
        // Twin fireballs in hands
        fillRectPx(g, 6, 13 + bob, 3, 3, eye);
        fillRectPx(g, 21, 13 + bob, 3, 3, eye);
        break;
      }
      case 'summoner': {
        // Specter Weaver: Floating necro-weaver with ribcage mantle & portal halo
        fillRectPx(g, 10, 13 + bob, 10, 13, p2);
        fillRectPx(g, 11, 14 + bob, 8, 10, p1);
        fillRectPx(g, 9, 4 + bob, 12, 3, eye);
        fillRectPx(g, 11, 8 + bob, 8, 5, p1);
        setPx(g, 13, 10 + bob, eye);
        setPx(g, 16, 10 + bob, eye);
        break;
      }
      case 'shield_warden': {
        // Astral Aegis Guardian: Heavy plate knight with tower pauldrons
        fillRectPx(g, 10, 23 + bob, 4, 5, p2);
        fillRectPx(g, 16, 23 - bob, 4, 5, p2);
        fillRectPx(g, 7, 11 + bob, 16, 12, p1);
        fillRectPx(g, 10, 12 + bob, 10, 10, p2);
        fillRectPx(g, 11, 6 + bob, 8, 6, p1);
        fillRectPx(g, 12, 9 + bob, 6, 2, eye);
        break;
      }
      case 'sigil_priest': {
        // Inverted Choir Herald: Tall mitre priest with levitating censer
        fillRectPx(g, 11, 13 + bob, 8, 15, p1);
        fillRectPx(g, 12, 14 + bob, 6, 13, p2);
        fillRectPx(g, 12, 4 + bob, 6, 9, p1);
        fillRectPx(g, 14, 5 + bob, 2, 6, eye);
        setPx(g, 13, 11 + bob, eye);
        setPx(g, 16, 11 + bob, eye);
        break;
      }
      case 'terrain_weaver': {
        // Hourglass Sculptor: Desert construct with golden sand core
        fillRectPx(g, 9, 10 + bob, 12, 5, p1);
        fillRectPx(g, 12, 15 + bob, 6, 5, eye);
        fillRectPx(g, 9, 20 + bob, 12, 6, p1);
        fillRectPx(g, 11, 6 + bob, 8, 4, p2);
        setPx(g, 13, 8 + bob, eye);
        setPx(g, 16, 8 + bob, eye);
        break;
      }
      case 'rift_stalker': {
        // Rift Stalker: Sleek void mantis-assassin with dual cyan blades
        fillRectPx(g, 11, 13 + bob, 8, 12, p2);
        fillRectPx(g, 12, 14 + bob, 6, 9, p1);
        fillRectPx(g, 11, 8 + bob, 8, 5, p1);
        setPx(g, 13, 10 + bob, eye);
        setPx(g, 16, 10 + bob, eye);
        // Dual blades
        drawLinePx(g, 8, 15 + bob, 4, 22 + bob, eye);
        drawLinePx(g, 21, 15 + bob, 25, 22 + bob, eye);
        break;
      }
      case 'colossus_elite': {
        // Abyss-Forged Archon: Winged armored titan with golden crown
        fillRectPx(g, 9, 23 + bob, 5, 6, p2);
        fillRectPx(g, 16, 23 - bob, 5, 6, p2);
        fillRectPx(g, 6, 10 + bob, 18, 13, p1);
        fillRectPx(g, 9, 12 + bob, 12, 10, p2);
        fillRectPx(g, 12, 14 + bob, 6, 5, eye);
        fillRectPx(g, 10, 5 + bob, 10, 6, p1);
        fillRectPx(g, 11, 3 + bob, 8, 2, '#ffbe0b');
        setPx(g, 13, 8 + bob, eye);
        setPx(g, 16, 8 + bob, eye);
        break;
      }
    }

    if (isElite) {
      // Golden-violet crown pixels above enemy
      fillRectPx(g, 11, 1, 8, 2, '#ffbe0b');
      setPx(g, 11, 0, '#ffbe0b');
      setPx(g, 14, 0, '#ff4ecd');
      setPx(g, 18, 0, '#ffbe0b');
    }

    applyPixelOutline(g, '#090612');
    return bakeGridToCanvas(g, 2, hitFlash);
  });
}

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  enemy: ActiveEnemy,
  time: number
): void {
  const def = ARCANA_ENEMIES[enemy.archetypeId];
  const frameIdx = Math.floor((enemy.animTime + time) * 6) % 4;
  const hitFlash = enemy.hitFlashTimer > 0;
  const sprite = buildEnemyFrameCanvas(enemy.archetypeId, frameIdx, hitFlash, enemy.isElite);
  const scale = (enemy.radius / 18) * (enemy.isElite ? 1.15 : 1.0);

  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  // Ground shadow
  ctx.fillStyle = 'rgba(4, 3, 12, 0.52)';
  ctx.beginPath();
  ctx.ellipse(0, 6 * scale, enemy.radius * 0.9, enemy.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Elite Golden-Violet Aura Ring
  if (enemy.isElite) {
    ctx.strokeStyle = '#ffbe0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 5 * scale, enemy.radius * 1.15, enemy.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sigil Priest Support Aura
  if (enemy.archetypeId === 'sigil_priest') {
    ctx.strokeStyle = 'rgba(224, 177, 203, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Flip sprite horizontally
  const flip = enemy.facingX < -0.05 ? -1 : 1;
  ctx.save();
  ctx.scale(flip * scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height + 10);
  ctx.restore();

  // Directional Shield for shield_warden
  if (enemy.archetypeId === 'shield_warden') {
    const sAngle = enemy.shieldAngle ?? Math.atan2(enemy.facingY, enemy.facingX);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -4, enemy.radius + 5, sAngle - 0.95, sAngle + 0.95);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -4, enemy.radius + 5, sAngle - 0.85, sAngle + 0.85);
    ctx.stroke();
  }

  // Status indicators (Slow / Burn)
  if (enemy.slowTimer > 0) {
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-enemy.radius * 0.6, -enemy.radius * 0.6, enemy.radius * 1.2, enemy.radius * 1.2);
  }
  if (enemy.burnTimer > 0) {
    ctx.fillStyle = '#ff7b00';
    ctx.beginPath();
    ctx.arc(Math.sin(time * 12) * 8, -enemy.radius - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Compact Enemy HP Bar (only if damaged or Elite)
  if (enemy.hp < enemy.maxHp || enemy.isElite) {
    const bw = enemy.isElite ? 42 : 28;
    const bh = enemy.isElite ? 5 : 3.5;
    const by = -sprite.height * scale + 2;
    ctx.fillStyle = 'rgba(8, 6, 18, 0.85)';
    ctx.fillRect(-bw / 2 - 1, by - 1, bw + 2, bh + 2);
    const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    ctx.fillStyle = enemy.isElite ? '#ffbe0b' : def.palette.eyeGlow;
    ctx.fillRect(-bw / 2, by, bw * ratio, bh);
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3. Monumental Multi-Phase Boss Sprites (5 Campaign Bosses + Infinite Avatar)
// ----------------------------------------------------------------------------

function buildBossFrameCanvas(bossId: string, phase: number, frameIdx: number, hitFlash: boolean): HTMLCanvasElement {
  const key = `boss_${bossId}_p${phase}_f${frameIdx}_${hitFlash ? 1 : 0}`;
  return getCachedSprite(key, () => {
    const g = createGrid(52, 56);
    const bob = frameIdx % 2 === 0 ? -1 : 1;

    if (bossId === 'boss_seven_runes') {
      // Guardião das Sete Runas: Stone colossus with 7 glowing seals
      fillRectPx(g, 15, 38 + bob, 7, 12, '#1d283a');
      fillRectPx(g, 30, 38 - bob, 7, 12, '#1d283a');
      fillRectPx(g, 12, 16 + bob, 28, 23, '#2b3a55');
      fillRectPx(g, 15, 19 + bob, 22, 17, '#64dfdf');
      fillRectPx(g, 18, 21 + bob, 16, 13, '#1d283a');
      // Chest Core Seal
      fillEllipsePx(g, 26, 27 + bob, 5, 5, phase >= 3 ? '#ff4d6d' : '#80ffdb');
      fillRectPx(g, 18, 8 + bob, 16, 9, '#2b3a55');
      fillRectPx(g, 21, 11 + bob, 3, 3, '#80ffdb');
      fillRectPx(g, 28, 11 + bob, 3, 3, '#80ffdb');
      // Giant floating runic pauldrons
      fillRectPx(g, 5, 14 - bob, 6, 14, '#64dfdf');
      fillRectPx(g, 41, 14 - bob, 6, 14, '#64dfdf');
    } else if (bossId === 'boss_ash_matriarch') {
      // Matriarca das Cinzas: Botanical sovereign with ember wings & crown
      fillEllipsePx(g, 12, 24 + bob, 9, 13, '#ff6b35');
      fillEllipsePx(g, 40, 24 + bob, 9, 13, '#ff6b35');
      fillEllipsePx(g, 13, 24 + bob, 6, 9, '#ffbe0b');
      fillEllipsePx(g, 39, 24 + bob, 6, 9, '#ffbe0b');
      fillRectPx(g, 18, 18 + bob, 16, 26, '#4a191c');
      fillRectPx(g, 21, 20 + bob, 10, 22, '#ff6b35');
      fillRectPx(g, 20, 9 + bob, 12, 9, '#4a191c');
      fillRectPx(g, 19, 5 + bob, 14, 4, '#ffbe0b');
      setPx(g, 23, 13 + bob, '#ffbe0b');
      setPx(g, 28, 13 + bob, '#ffbe0b');
    } else if (bossId === 'boss_inverted_bishop') {
      // O Bispo Invertido: Stained-glass pontiff with inverted mitre & floating mirrors
      fillRectPx(g, 16, 16 + bob, 20, 28, '#240046');
      fillRectPx(g, 19, 18 + bob, 14, 24, '#c77dff');
      fillRectPx(g, 22, 20 + bob, 8, 20, '#240046');
      // High Pontiff Mitre
      fillRectPx(g, 19, 5 + bob, 14, 11, '#c77dff');
      fillRectPx(g, 24, 3 + bob, 4, 12, '#e0aaff');
      // Stained glass wings
      fillRectPx(g, 8, 14 - bob, 6, 20, '#e0aaff');
      fillRectPx(g, 38, 14 - bob, 6, 20, '#e0aaff');
      setPx(g, 23, 13 + bob, '#ff007f');
      setPx(g, 28, 13 + bob, '#ff007f');
    } else if (bossId === 'boss_hourglass_leviathan') {
      // Leviatã das Horas: Clockwork sand serpent with golden coils & temporal jaws
      fillEllipsePx(g, 26, 36 + bob, 16, 10, '#5c4018');
      fillEllipsePx(g, 26, 26 - bob, 13, 9, '#ffd166');
      fillEllipsePx(g, 26, 26 - bob, 8, 5, '#06d6a0');
      fillRectPx(g, 18, 8 + bob, 16, 14, '#5c4018');
      fillRectPx(g, 16, 6 + bob, 20, 5, '#ffd166');
      fillRectPx(g, 20, 12 + bob, 4, 3, '#06d6a0');
      fillRectPx(g, 28, 12 + bob, 4, 3, '#06d6a0');
    } else {
      // O Arquiteto da Ruptura / Avatar do Infinito: Cosmic multidimensional entity
      fillEllipsePx(g, 26, 26 + bob, 18, 18, '#10002b');
      fillEllipsePx(g, 26, 26 + bob, 14, 14, '#00f5d4');
      fillEllipsePx(g, 26, 26 + bob, 10, 10, '#10002b');
      fillEllipsePx(g, 26, 26 + bob, 5, 5, '#f15bb5');
      // Floating Crown & Monolith Wings
      fillRectPx(g, 6, 10 - bob, 6, 28, '#00f5d4');
      fillRectPx(g, 40, 10 - bob, 6, 28, '#00f5d4');
      fillRectPx(g, 18, 4 + bob, 16, 6, '#ffbe0b');
    }

    applyPixelOutline(g, '#07040e');
    return bakeGridToCanvas(g, 2, hitFlash);
  });
}

export function drawBossSprite(ctx: CanvasRenderingContext2D, boss: ActiveBoss, time: number): void {
  const frameIdx = Math.floor((boss.animTime + time) * 6) % 4;
  const hitFlash = boss.hitFlashTimer > 0;
  const sprite = buildBossFrameCanvas(boss.def.id, boss.currentPhase, frameIdx, hitFlash);
  const scale = boss.def.radius / 36;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  // Monumental Boss Ground Shadow & Phase Seal Ring
  ctx.fillStyle = 'rgba(4, 2, 12, 0.68)';
  ctx.beginPath();
  ctx.ellipse(0, 12 * scale, boss.def.radius * 1.15, boss.def.radius * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = boss.def.palette.glow;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 10 * scale, boss.def.radius * 1.3, boss.def.radius * 0.62, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Orbiting Seven Seals / Phase Satellites
  const sealCount = boss.def.id === 'boss_seven_runes' ? 7 : 2 + boss.currentPhase * 2;
  for (let i = 0; i < sealCount; i++) {
    const ang = time * (1.2 + boss.currentPhase * 0.35) + (i * Math.PI * 2) / sealCount;
    const sx = Math.cos(ang) * (boss.def.radius * 1.35);
    const sy = -10 * scale + Math.sin(ang) * (boss.def.radius * 0.55);
    ctx.fillStyle = i % 2 === 0 ? boss.def.palette.glow : boss.def.palette.armor;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#07040e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Invulnerability / Phase Transition Barrier
  if (boss.invulnerableTimer > 0 || boss.aiState === 'phase_transition') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, -14 * scale, boss.def.radius * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const flip = boss.facingX < -0.05 ? -1 : 1;
  ctx.save();
  ctx.scale(flip * scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height + 16);
  ctx.restore();

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 4. 2.5D Modular Environment Obstacles, Decorations & Interactive POI Shrines
// ----------------------------------------------------------------------------

export function drawObstacle25D(
  ctx: CanvasRenderingContext2D,
  obs: MapObstacle,
  campaignId: CampaignId,
  time: number
): void {
  ctx.save();
  const x = obs.x;
  const y = obs.y;
  const w = obs.w;
  const h = obs.h;

  if (obs.kind === 'chasm') {
    // Deep abyssal chasm with glowing rim
    ctx.fillStyle = '#05030a';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = campaignId === 'ash' ? '#ff6b35' : '#4ea8de';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 2.5D Extruded Side & Top Depth Block
  const extrusionHeight = obs.kind === 'pillar' || obs.kind === 'hourglass_monolith' ? 34 : 26;
  const baseColor =
    campaignId === 'ash'
      ? '#3a1d1f'
      : campaignId === 'cloister'
      ? '#2d1e4a'
      : campaignId === 'hourglasses'
      ? '#543d1c'
      : campaignId === 'rift'
      ? '#1d0e38'
      : '#243052';
  const topColor =
    campaignId === 'ash'
      ? '#592c2f'
      : campaignId === 'cloister'
      ? '#463070'
      : campaignId === 'hourglasses'
      ? '#7a5929'
      : campaignId === 'rift'
      ? '#321863'
      : '#36497a';
  const runeGlow =
    campaignId === 'ash'
      ? '#ff7b00'
      : campaignId === 'cloister'
      ? '#e0aaff'
      : campaignId === 'hourglasses'
      ? '#ffd166'
      : campaignId === 'rift'
      ? '#00f5d4'
      : '#6fffe9';

  // Ground ambient shadow
  ctx.fillStyle = 'rgba(3, 2, 10, 0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.42, w * 0.62, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front/Side 2.5D Wall Face
  ctx.fillStyle = baseColor;
  ctx.strokeStyle = '#0a0714';
  ctx.lineWidth = 2;
  ctx.fillRect(x - w / 2, y - h / 2 - extrusionHeight, w, h + extrusionHeight);
  ctx.strokeRect(x - w / 2, y - h / 2 - extrusionHeight, w, h + extrusionHeight);

  // Top Cap Roof (2.5D Isometric perspective plane)
  ctx.fillStyle = topColor;
  ctx.fillRect(x - w / 2, y - h / 2 - extrusionHeight, w, h * 0.65);
  ctx.strokeRect(x - w / 2, y - h / 2 - extrusionHeight, w, h * 0.65);

  // Carved Glowing Rune / Crystal Motif on the Front Face
  const pulse = 0.65 + 0.35 * Math.sin(time * 2.5 + x * 0.01);
  ctx.fillStyle = runeGlow;
  ctx.globalAlpha = pulse;
  if (obs.kind === 'crystal_obelisk' || obs.kind === 'hourglass_monolith') {
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2 - extrusionHeight - 12);
    ctx.lineTo(x + 10, y - extrusionHeight * 0.4);
    ctx.lineTo(x, y);
    ctx.lineTo(x - 10, y - extrusionHeight * 0.4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x - 3, y - extrusionHeight * 0.7, 6, extrusionHeight * 0.55);
    ctx.fillRect(x - 8, y - extrusionHeight * 0.5, 16, 3);
  }

  ctx.restore();
}

export function drawDecoration25D(
  ctx: CanvasRenderingContext2D,
  dec: MapDecoration,
  campaignId: CampaignId,
  time: number
): void {
  ctx.save();
  ctx.translate(dec.x, dec.y);
  const s = dec.scale;
  const pulse = 0.6 + 0.4 * Math.sin(time * 2.4 + dec.phaseOffset);

  if (dec.kind === 'rune_tile') {
    ctx.strokeStyle = campaignId === 'ash' ? '#ff7b00' : campaignId === 'hourglasses' ? '#ffd166' : '#5bc0be';
    ctx.globalAlpha = 0.35 * pulse;
    ctx.lineWidth = 2;
    ctx.strokeRect(-22 * s, -22 * s, 44 * s, 44 * s);
    ctx.beginPath();
    ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
    ctx.stroke();
  } else if (dec.kind === 'ash_tree') {
    // Petrified ember tree
    ctx.fillStyle = '#261315';
    ctx.fillRect(-5 * s, -28 * s, 10 * s, 28 * s);
    ctx.fillStyle = `rgba(255, 115, 25, ${0.55 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, -32 * s, 16 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (dec.kind === 'mirror_arch') {
    ctx.strokeStyle = '#c77dff';
    ctx.lineWidth = 3;
    ctx.strokeRect(-16 * s, -36 * s, 32 * s, 36 * s);
    ctx.fillStyle = `rgba(224, 170, 255, ${0.22 * pulse})`;
    ctx.fillRect(-14 * s, -34 * s, 28 * s, 32 * s);
  } else if (dec.kind === 'sand_vortex') {
    ctx.strokeStyle = `rgba(255, 209, 102, ${0.42 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 28 * s, time, time + Math.PI * 1.5);
    ctx.stroke();
  } else if (dec.kind === 'void_fissure') {
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-18 * s, -6 * s);
    ctx.lineTo(0, 4 * s);
    ctx.lineTo(18 * s, -8 * s);
    ctx.stroke();
  } else {
    // Floating shard or torch
    const fy = -14 * s + Math.sin(time * 3 + dec.phaseOffset) * 4;
    ctx.fillStyle = '#7de2ff';
    ctx.beginPath();
    ctx.arc(0, fy, 5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPoiShrine25D(
  ctx: CanvasRenderingContext2D,
  poi: MapPoiInstance,
  time: number,
  playerDist: number
): void {
  ctx.save();
  ctx.translate(poi.x, poi.y);

  const colorMap: Record<MapPoiInstance['type'], string> = {
    forbidden_library: '#7de2ff',
    transmutation_altar: '#ff4d6d',
    mirror_possibilities: '#e0aaff',
    wandering_merchant: '#ffd166',
    unstable_ritual: '#ff7b00',
    arcane_anomaly: '#00f5d4',
    healing_sanctuary: '#52b788',
    early_boss_beacon: '#ff0054',
  };
  const accent = poi.used ? '#555b6e' : colorMap[poi.type] ?? '#7de2ff';
  const pulse = poi.used ? 0.35 : 0.7 + 0.3 * Math.sin(time * 3.2);

  // Outer ritual circle on floor
  ctx.strokeStyle = accent;
  ctx.globalAlpha = pulse * 0.75;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 6, poi.radius, poi.radius * 0.58, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Active Unstable Ritual Survival Ring
  if (poi.type === 'unstable_ritual' && poi.activeTimer && poi.activeTimer > 0) {
    ctx.strokeStyle = '#ffbe0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Pedestal 2.5D Base
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1e2238';
  ctx.strokeStyle = '#090612';
  ctx.lineWidth = 2;
  ctx.fillRect(-18, -14, 36, 22);
  ctx.strokeRect(-18, -14, 36, 22);

  // Floating Relic / Crystal atop Shrine
  const floatY = -28 + (poi.used ? 0 : Math.sin(time * 3.5) * 5);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, floatY - 12);
  ctx.lineTo(10, floatY);
  ctx.lineTo(0, floatY + 12);
  ctx.lineTo(-10, floatY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Floating Label & Interaction Prompt when player approaches
  if (!poi.used && playerDist < poi.radius + 95) {
    ctx.font = 'bold 12px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(poi.name, 0, -52);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText('[F] Interagir', 0, -38);
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 5. Player Constructs & Summons (Chess Pieces, Chrono Echoes, Rune Circles)
// ----------------------------------------------------------------------------

export function drawConstructSprite(
  ctx: CanvasRenderingContext2D,
  c: ActiveSummonOrConstruct,
  time: number
): void {
  ctx.save();
  ctx.translate(c.x, c.y);

  if (c.kind.startsWith('rune_circle') || c.kind === 'rune_great_inscription') {
    const col =
      c.kind === 'rune_circle_fire'
        ? '#ff7b00'
        : c.kind === 'rune_circle_frost'
        ? '#7df9ff'
        : c.kind === 'rune_circle_volt'
        ? '#ffbe0b'
        : '#80ffdb';

    ctx.strokeStyle = col;
    ctx.lineWidth = c.kind === 'rune_great_inscription' ? 3.5 : 2.2;
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating inner geometric triangle/hexagram
    ctx.save();
    ctx.rotate(time * 1.4);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const rx = Math.cos(a) * c.radius * 0.72;
      const ry = Math.sin(a) * c.radius * 0.72;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (c.symbolTag) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.symbolTag, 0, 4);
    }
    ctx.restore();
    return;
  }

  if (c.kind === 'chrono_dome') {
    ctx.fillStyle = 'rgba(0, 245, 212, 0.12)';
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Clock Hands inside the Dome
    ctx.strokeStyle = '#f4c95d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(time * 2) * c.radius * 0.65, Math.sin(time * 2) * c.radius * 0.65);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(time * 0.5) * c.radius * 0.42, Math.sin(time * 0.5) * c.radius * 0.42);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (c.kind === 'chrono_echo') {
    drawClassSprite(ctx, 'chrono', 0, 0, {
      animState: 'cast',
      animTime: time,
      facingX: 1,
      facingY: 0,
      hitFlash: false,
      alpha: 0.55,
      isDashGhost: true,
    });
    ctx.restore();
    return;
  }

  // Chess Pieces & Chaos Totem
  const floatY = Math.sin(time * 5 + c.x * 0.05) * 4;
  ctx.fillStyle = 'rgba(6, 4, 15, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.kind === 'chaos_totem' ? '#ff4ecd' : '#e8e0d5';
  ctx.strokeStyle = '#0a0714';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-10, -24 + floatY, 20, 28, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = c.kind === 'chaos_totem' ? '#ffbe0b' : '#d4af37';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  const icon =
    c.kind === 'chess_queen'
      ? '♛'
      : c.kind === 'chess_rook'
      ? '♜'
      : c.kind === 'chess_bishop'
      ? '♝'
      : c.kind === 'chess_knight'
      ? '♞'
      : c.kind === 'chaos_totem'
      ? '🎭'
      : '♟';
  ctx.fillText(icon, 0, -4 + floatY);

  ctx.restore();
}
