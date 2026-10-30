// ============================================================================
// ASCENSÃO ARCANA — HD-2D 16-Bit/32-Bit Elemental Bending Pixel-Art Engine (v3.0)
// ============================================================================
// Combines the high-craft pixel-art sheet (/arcana-benders.jpg) with 8-tone
// martial-arts pixel shading, dynamic elemental bending stances, sub-bending
// constructs (Water/Ice/Blood, Air/Spirit/Vacuum, Fire/Lightning/Combustion,
// Earth/Metal/Lava/Crystal), and textured elemental biome tiles.
// ============================================================================

import { ARCANA_CLASSES, ARCANA_ENEMIES } from './data';
import type {
  ActiveBoss,
  ActiveEnemy,
  ActiveSummonOrConstruct,
  ArcanaClassId,
  CampaignId,
  EnemyArchetypeId,
  EntityAnimState,
  MapDecoration,
  MapObstacle,
  MapPoiInstance,
} from './types';

const SPRITE_CACHE = new Map<string, HTMLCanvasElement>();
const MAX_CACHE_ENTRIES = 700;

// ----------------------------------------------------------------------------
// Preload High-Craft Elemental Benders Pixel Art Sheet (/arcana-benders.jpg)
// ----------------------------------------------------------------------------
// Quadrant mapping in /arcana-benders.jpg:
// Top-Left (0,0): Waterbender ('chess')
// Top-Right (1,0): Earthbender ('rune')
// Bottom-Left (0,1): Firebender ('chaos')
// Bottom-Right (1,1): Airbender ('chrono')
// ----------------------------------------------------------------------------

const BENDER_ATLAS_QUADRANTS: Record<ArcanaClassId, [number, number]> = {
  chess: [0, 0],  // Mestre da Água
  rune: [1, 0],   // Mestre da Terra
  chaos: [0, 1],  // Mestre do Fogo
  chrono: [1, 1], // Mestre do Ar
};

const BENDER_CUTOUT_CACHE = new Map<ArcanaClassId, HTMLCanvasElement>();
let benderAtlasLoaded = false;

function initBenderAtlas(): void {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const qw = Math.floor(img.width / 2);
      const qh = Math.floor(img.height / 2);
      if (qw < 16 || qh < 16) return;

      for (const classId of ['chess', 'rune', 'chaos', 'chrono'] as ArcanaClassId[]) {
        const [qx, qy] = BENDER_ATLAS_QUADRANTS[classId];
        const targetSize = 96;
        const c = document.createElement('canvas');
        c.width = targetSize;
        c.height = targetSize;
        const ctx = c.getContext('2d');
        if (!ctx) continue;
        ctx.imageSmoothingEnabled = false;

        // Crop inner 84% of quadrant to avoid border lines
        const padX = Math.floor(qw * 0.08);
        const padY = Math.floor(qh * 0.08);
        ctx.drawImage(
          img,
          qx * qw + padX,
          qy * qh + padY,
          qw - padX * 2,
          qh - padY * 2,
          0,
          0,
          targetSize,
          targetSize
        );

        // Chroma-key dark background removal + radial vignette mask for clean sprite edges
        const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
        const d = imgData.data;
        const cx = targetSize * 0.5;
        const cy = targetSize * 0.52;
        const maxR = targetSize * 0.46;

        for (let py = 0; py < targetSize; py++) {
          for (let px = 0; px < targetSize; px++) {
            const idx = (py * targetSize + px) * 4;
            const r = d[idx];
            const g = d[idx + 1];
            const b = d[idx + 2];
            const dist = Math.hypot(px - cx, py - cy);

            // Remove outer corner pixels and near-black background pixels
            const luma = r * 0.299 + g * 0.587 + b * 0.114;
            const sat = Math.max(r, g, b) - Math.min(r, g, b);
            if (dist > maxR || (luma < 34 && sat < 28) || (dist > maxR * 0.82 && luma < 52 && sat < 38)) {
              d[idx + 3] = 0;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
        BENDER_CUTOUT_CACHE.set(classId, c);
      }
      benderAtlasLoaded = true;
      SPRITE_CACHE.clear();
    } catch {
      // Ignore if canvas taint occurs in restricted environments
    }
  };
  img.src = '/arcana-benders.jpg';
}

initBenderAtlas();

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

function fillRectPx(
  g: PixelGrid,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  ditherColor?: string
): void {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  const x1 = Math.round(x + w);
  const y1 = Math.round(y + h);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (ditherColor && (px + py) % 2 === 0) {
        setPx(g, px, py, ditherColor);
      } else {
        setPx(g, px, py, color);
      }
    }
  }
}

function fillEllipsePx(
  g: PixelGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  highlightColor?: string
): void {
  const x0 = Math.floor(cx - rx);
  const x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry);
  const y1 = Math.ceil(cy + ry);
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = (px - cx) / Math.max(0.5, rx);
      const dy = (py - cy) / Math.max(0.5, ry);
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1.0) {
        if (highlightColor && dx < -0.12 && dy < -0.12 && d2 < 0.58) {
          setPx(g, px, py, highlightColor);
        } else {
          setPx(g, px, py, color);
        }
      }
    }
  }
}

function drawLinePx(
  g: PixelGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  thickness = 1
): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    if (thickness <= 1) {
      setPx(g, px, py, color);
    } else {
      fillRectPx(g, px - thickness * 0.5, py - thickness * 0.5, thickness, thickness, color);
    }
  }
}

function applyPixelOutline(g: PixelGrid, outlineColor = '#080510', innerShadowColor?: string): void {
  const copy = g.pixels.slice();
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const cur = copy[y * g.w + x];
      if (cur !== null) {
        if (innerShadowColor && y + 1 < g.h && copy[(y + 1) * g.w + x] === null) {
          g.pixels[y * g.w + x] = innerShadowColor;
        }
        continue;
      }
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
        ctx.fillStyle = col === '#080510' ? '#4a154b' : '#ffffff';
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
// 0. Pixel-Art Elemental Biome Floor Tiles (96x96 world units, 32x32 grid x3)
// ----------------------------------------------------------------------------

export function getBiomeTileCanvas(campaignId: CampaignId, variant: number): HTMLCanvasElement {
  const key = `tile3_${campaignId}_${variant % 4}`;
  return getCachedSprite(key, () => {
    const g = createGrid(32, 32);
    const palettes: Record<
      CampaignId,
      { base: string; alt: string; mortar: string; highlight: string; rune: string; speck: string }
    > = {
      runes: {
        // Tribo da Água do Polo Sul — Glacial Ice & Deep Ocean Stone
        base: '#12263f',
        alt: '#183252',
        mortar: '#091526',
        highlight: '#295282',
        rune: '#00f5d4',
        speck: '#7df9ff',
      },
      ash: {
        // Cratera Vulcânica da Nação do Fogo — Obsidian & Molten Magma Veins
        base: '#2b1214',
        alt: '#38181b',
        mortar: '#140708',
        highlight: '#592529',
        rune: '#ff6d00',
        speck: '#ffbe0b',
      },
      cloister: {
        // Templo do Ar Ocidental — Sky Marble & Wind Currents
        base: '#1f2342',
        alt: '#292e54',
        mortar: '#111326',
        highlight: '#454d85',
        rune: '#80ffdb',
        speck: '#ffd166',
      },
      hourglasses: {
        // Fortaleza de Metal de Zaofu — Tectonic Stone & Platinum Inlays
        base: '#2e2519',
        alt: '#3b3020',
        mortar: '#1a140d',
        highlight: '#5c4b33',
        rune: '#52b788',
        speck: '#ffd166',
      },
      rift: {
        // Mundo Espiritual & Árvore do Tempo — Harmonic Bioluminescence
        base: '#170a2e',
        alt: '#210f40',
        mortar: '#0a0417',
        highlight: '#3b1c6e',
        rune: '#00f5d4',
        speck: '#ff007f',
      },
      infinite: {
        // Estado Avatar — Convergência dos 4 Elementos
        base: '#190e33',
        alt: '#241447',
        mortar: '#0b0518',
        highlight: '#3c2273',
        rune: '#ffbe0b',
        speck: '#00bbf9',
      },
    };
    const p = palettes[campaignId] || palettes.runes;

    fillRectPx(g, 0, 0, 32, 32, variant % 2 === 0 ? p.base : p.alt);

    // 16-bit carved temple slab joints & bevel highlights
    for (let x = 0; x < 32; x++) {
      setPx(g, x, 0, p.highlight);
      setPx(g, x, 15, p.mortar);
      setPx(g, x, 16, p.highlight);
      setPx(g, x, 31, p.mortar);
    }
    for (let y = 0; y < 16; y++) {
      setPx(g, 0, y, p.highlight);
      setPx(g, 15, y, p.mortar);
      setPx(g, 16, y, p.highlight);
      setPx(g, 31, y, p.mortar);
    }
    for (let y = 16; y < 32; y++) {
      setPx(g, 7, y, p.mortar);
      setPx(g, 8, y, p.highlight);
      setPx(g, 23, y, p.mortar);
      setPx(g, 24, y, p.highlight);
    }

    let seed = (variant + 1) * 9173;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 22; i++) {
      const rx = 2 + Math.floor(rand() * 28);
      const ry = 2 + Math.floor(rand() * 28);
      setPx(g, rx, ry, i % 3 === 0 ? p.speck : p.mortar);
    }

    if (variant % 4 === 3) {
      // Glowing Elemental Crest Inlay
      fillEllipsePx(g, 16, 16, 6, 6, p.mortar);
      fillEllipsePx(g, 16, 16, 4, 4, p.rune, '#ffffff');
    }

    return bakeGridToCanvas(g, 3, false);
  });
}

// ----------------------------------------------------------------------------
// 1. Playable Elemental Masters — Martial-Arts Pixel Art + Atlas Cutout
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
  gaugeValue?: number;
}

function buildClassFrameCanvas(
  classId: ArcanaClassId,
  animState: EntityAnimState,
  frameIdx: number,
  hitFlash: boolean
): HTMLCanvasElement {
  const key = `cls3_${classId}_${animState}_${frameIdx}_${hitFlash ? 1 : 0}`;
  return getCachedSprite(key, () => {
    const g = createGrid(48, 52);
    const pal = ARCANA_CLASSES[classId].palette;

    const isWalk = animState === 'walk';
    const isCast = animState === 'cast' || animState === 'attack';
    const isDash = animState === 'dash';
    const isVictory = animState === 'victory';
    const isDefeat = animState === 'defeat';

    const phaseRad = (frameIdx / 8) * Math.PI * 2;
    const bob = isWalk
      ? Math.round(Math.abs(Math.sin(phaseRad)) * -2.5)
      : Math.round(Math.sin(phaseRad) * -1);
    const strideL = isWalk ? Math.round(Math.sin(phaseRad) * 4) : isCast ? -3 : 0;
    const strideR = isWalk ? -strideL : isCast ? 4 : 0;
    const punchExtend = isCast ? 4 + (frameIdx % 3) * 2 : isDash ? 5 : 0;
    const scarfWave = Math.round(Math.sin(phaseRad) * 3);

    if (isDefeat) {
      fillEllipsePx(g, 24, 43, 14, 5, pal.secondary);
      fillEllipsePx(g, 23, 41, 10, 4, pal.cloth);
      fillRectPx(g, 17, 37, 12, 4, pal.primary);
      fillRectPx(g, 25, 39, 7, 3, pal.accent);
      applyPixelOutline(g, '#080510');
      return bakeGridToCanvas(g, 2, hitFlash);
    }

    // 1. Dynamic Flowing Martial Sash / Elemental Cloak Behind Character
    fillRectPx(g, 11 - scarfWave, 20 + bob, 16, 16, pal.secondary, pal.cloth);
    fillRectPx(g, 8 - scarfWave, 26 + bob, 14, 11, pal.cloth);
    fillRectPx(g, 9 - scarfWave, 35 + bob, 13, 2, pal.accent);

    // 2. Martial Arts Stance Legs, Leg-Wraps & Boots
    const lx = 16 + Math.min(0, strideL);
    const rx = 26 + Math.max(0, strideR);
    // Left leg
    fillRectPx(g, lx, 33 + bob, 5, 8, pal.cloth);
    fillRectPx(g, lx, 39 + bob + Math.max(0, strideL), 5, 6, '#161224');
    fillRectPx(g, lx, 39 + bob + Math.max(0, strideL), 5, 2, pal.accent);
    // Right leg (wide martial arts horse/front stance)
    fillRectPx(g, rx, 33 + bob, 5, 8, pal.cloth);
    fillRectPx(g, rx, 39 + bob + Math.max(0, strideR), 5, 6, '#161224');
    fillRectPx(g, rx, 39 + bob + Math.max(0, strideR), 5, 2, pal.accent);

    // 3. Sculpted Martial Arts Gi / Tunic & Sash Belt
    fillRectPx(g, 16, 20 + bob, 15, 15, pal.cloth, pal.secondary);
    fillRectPx(g, 18, 21 + bob, 11, 13, pal.secondary);
    // Diagonal martial crossover lapel
    drawLinePx(g, 18, 20 + bob, 27, 29 + bob, pal.primary, 2);
    drawLinePx(g, 28, 20 + bob, 21, 27 + bob, pal.accent, 1);
    // Wide elemental sash belt + hanging sash tails
    fillRectPx(g, 15, 29 + bob, 17, 3, pal.accent);
    fillRectPx(g, 22, 29 + bob, 4, 8, pal.primary);
    setPx(g, 23, 30 + bob, '#ffffff');

    // 4. Sculpted Shoulders & Martial Bracers
    fillEllipsePx(g, 15, 21 + bob, 4, 3, pal.primary, pal.accent);
    fillEllipsePx(g, 32, 21 + bob, 4, 3, pal.primary, pal.accent);

    // Rear Guard Hand (Left) with Elemental Chi Aura
    const rearHandY = 23 + bob - (isCast ? 2 : 0);
    fillRectPx(g, 10, rearHandY, 5, 4, '#f1c29b');
    fillRectPx(g, 12, rearHandY, 3, 4, pal.accent); // Bracer
    fillEllipsePx(g, 9, rearHandY + 1, 4, 4, pal.glow, '#ffffff');

    // Front Striking Hand (Right) — Extends forward in Kung-Fu / Bending Strike
    const strikeX = 33 + punchExtend;
    const strikeY = 21 + bob - (isCast ? 2 : 0);
    fillRectPx(g, 31, strikeY + 1, 4 + punchExtend, 4, pal.cloth);
    fillRectPx(g, strikeX - 1, strikeY + 1, 3, 4, pal.accent); // Bracer
    fillRectPx(g, strikeX + 1, strikeY + 1, 4, 4, '#f1c29b'); // Fist/Palm

    // 5. Head, Expressive Martial Face & Glowing Avatar/Bender Eyes
    fillRectPx(g, 18, 10 + bob, 12, 10, '#f1c29b');
    fillRectPx(g, 18, 17 + bob, 12, 3, '#d9a17c'); // Jaw shadow
    // Glowing Elemental Eyes (3px wide with white spark)
    fillRectPx(g, 20, 14 + bob, 3, 2, pal.glow);
    setPx(g, 21, 14 + bob, '#ffffff');
    fillRectPx(g, 26, 14 + bob, 3, 2, pal.glow);
    setPx(g, 27, 14 + bob, '#ffffff');

    // 6. Element-Specific Hair, Headgear, Tattoos & Active Bending Effects
    if (classId === 'chess') {
      // MESTRE DA ÁGUA: Arctic Fur-Trimmed Parka Collar, Hair Loop & Flowing Water Whip
      fillRectPx(g, 15, 18 + bob, 18, 3, '#f8f9fa'); // White arctic fur collar
      fillRectPx(g, 17, 7 + bob, 14, 5, '#1b263b'); // Dark water tribe hair
      fillRectPx(g, 15, 9 + bob, 4, 7, '#1b263b'); // Hair loops
      fillRectPx(g, 17, 11 + bob, 14, 2, '#00bbf9'); // Water Tribe headband
      setPx(g, 24, 11 + bob, '#ffffff'); // Moon crest
      // Flowing S-curve Water Stream Whip around hands
      for (let i = 0; i < 16; i++) {
        const wx = 10 + i * 2.1;
        const wy = strikeY + Math.sin(i * 0.55 + frameIdx * 1.4) * 7;
        fillEllipsePx(g, wx, wy, 2.4, 2.4, '#00bbf9', '#caf0f8');
      }
    } else if (classId === 'chrono') {
      // MESTRE DO AR: Glowing Cyan Air Nomad Arrow Tattoo, Monk Shawl & Swirling Wind Sphere
      fillRectPx(g, 16, 19 + bob, 16, 4, '#ff9f1c'); // Nomad orange monk shawl
      // Iconic Glowing Blue Arrow Tattoo on forehead
      fillRectPx(g, 23, 9 + bob, 2, 4, '#80ffdb');
      fillRectPx(g, 21, 11 + bob, 6, 2, '#00f5d4');
      setPx(g, 24, 12 + bob, '#ffffff');
      // Swirling Wind Vortex around striking hand
      fillEllipsePx(g, strikeX + 5, strikeY + 2, 6, 6, '#80ffdb', '#ffffff');
      fillEllipsePx(g, strikeX + 5, strikeY + 2, 3, 3, '#1a243b');
    } else if (classId === 'chaos') {
      // MESTRE DO FOGO: Spiky Top-Knot with Golden Flame Pin, Third-Eye Mark & Blazing Dragon Fists
      fillRectPx(g, 17, 7 + bob, 14, 5, '#191218'); // Black hair
      fillRectPx(g, 21, 2 + bob, 6, 5, '#191218'); // Royal top-knot
      fillRectPx(g, 20, 5 + bob, 8, 2, '#ffd166'); // Golden Fire Nation crown pin
      setPx(g, 24, 4 + bob, '#ff5400');
      // Third-Eye Combustion Chakra on forehead
      fillRectPx(g, 23, 11 + bob, 3, 2, '#ff0054');
      setPx(g, 24, 11 + bob, '#ffbe0b');
      // Blazing Orange + Blue Dragon Flame on striking fist
      fillEllipsePx(g, strikeX + 6, strikeY + 1, 6, 5, '#ff5400', '#ffbe0b');
      fillEllipsePx(g, strikeX + 8, strikeY + 1, 3.5, 3.5, '#00bbf9', '#ffffff');
    } else {
      // MESTRE DA TERRA: Topknot + Green/Gold Headband, Metal Armor Pauldron & Levitating Boulder
      fillRectPx(g, 17, 6 + bob, 14, 6, '#1b1917');
      fillRectPx(g, 17, 10 + bob, 14, 2, '#52b788'); // Earth Kingdom headband
      fillRectPx(g, 22, 9 + bob, 4, 3, '#ffd166'); // Gold Earth emblem
      // Levitating Craggy Rock & Emerald Crystal Fist
      fillEllipsePx(g, strikeX + 6, strikeY - 1, 5.5, 5.5, '#6c584c', '#a98467');
      fillRectPx(g, strikeX + 5, strikeY - 3, 3, 4, '#52b788');
      setPx(g, strikeX + 6, strikeY - 2, '#ffffff');
    }

    if (isVictory) {
      fillEllipsePx(g, 24, 6 + bob, 8, 3, pal.glow, '#ffffff');
    }

    applyPixelOutline(g, '#080510', '#120b1e');
    return bakeGridToCanvas(g, 2, hitFlash);
  });
}

// Orbiting Sub-Bending Elemental Relics
function getOrbitRelicCanvas(classId: ArcanaClassId, index: number): HTMLCanvasElement {
  const key = `relic3_${classId}_${index}`;
  return getCachedSprite(key, () => {
    const g = createGrid(14, 14);
    if (classId === 'chess') {
      // Water droplet / Ice crystal / Crimson Blood-Moon orb
      const col = index === 0 ? '#00bbf9' : index === 1 ? '#caf0f8' : '#ff0054';
      fillEllipsePx(g, 7, 8, 4, 4, col, '#ffffff');
      fillRectPx(g, 6, 2, 2, 4, col);
    } else if (classId === 'chrono') {
      // Swirling Wind / Spirit / Sound Sphere
      const col = index === 0 ? '#80ffdb' : index === 1 ? '#e0aaff' : '#ffd166';
      fillEllipsePx(g, 7, 7, 4.5, 4.5, col, '#ffffff');
      fillEllipsePx(g, 7, 7, 2, 2, '#101828');
    } else if (classId === 'chaos') {
      // Orange Fire / Blue Dragon Flame / Electric Lightning Spark
      const col = index === 0 ? '#ff5400' : index === 1 ? '#00bbf9' : '#ffbe0b';
      fillEllipsePx(g, 7, 8, 4.5, 4, col, '#ffffff');
      fillRectPx(g, 5, 2, 4, 4, col);
      setPx(g, 7, 3, '#ffffff');
    } else {
      // Craggy Rock / Molten Lava / Emerald Crystal Shard
      const col = index === 0 ? '#a98467' : index === 1 ? '#ff5400' : '#52b788';
      fillRectPx(g, 3, 3, 8, 8, '#4a3b2c');
      fillRectPx(g, 4, 4, 6, 6, col);
      setPx(g, 5, 5, '#ffffff');
    }
    applyPixelOutline(g, '#080510');
    return bakeGridToCanvas(g, 2, false);
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
  const frameIdx = Math.floor(opts.animTime * 15) % 8;
  const sprite = buildClassFrameCanvas(classId, opts.animState, frameIdx, opts.hitFlash);

  const isCast = opts.animState === 'cast' || opts.animState === 'attack';
  const isWalk = opts.animState === 'walk';
  const isDash = opts.animState === 'dash';

  ctx.save();
  ctx.translate(x, y);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;

  // 1. Ground Shadow + Rotating Elemental Bagua Circle under Player
  if (!opts.isDashGhost) {
    ctx.fillStyle = 'rgba(4, 2, 12, 0.68)';
    ctx.beginPath();
    ctx.ellipse(0, 8 * scale, 24 * scale, 11 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, 6 * scale);
    ctx.scale(1, 0.48);
    ctx.rotate(opts.animTime * 2.1);
    ctx.strokeStyle = pal.glow;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = (opts.alpha ?? 1) * 0.68;
    ctx.beginPath();
    ctx.arc(0, 0, 30 * scale, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 16 * scale, Math.sin(a) * 16 * scale);
      ctx.lineTo(Math.cos(a) * 29 * scale, Math.sin(a) * 29 * scale);
      ctx.stroke();
    }
    ctx.restore();

    // 60 FPS Footstep Elemental Rings when walking
    if (isWalk) {
      const stepPhase = (opts.animTime * 3.5) % 1;
      ctx.save();
      ctx.strokeStyle = pal.glow;
      ctx.globalAlpha = (1 - stepPhase) * 0.42;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(
        -opts.facingX * stepPhase * 18 * scale,
        (6 - opts.facingY * stepPhase * 8) * scale,
        (8 + stepPhase * 18) * scale,
        (4 + stepPhase * 9) * scale,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. 60 FPS Flowing Elemental Sash / Ribbon Behind Character
  if (!opts.isDashGhost && opts.animState !== 'defeat') {
    const flipDir = opts.facingX < -0.05 ? 1 : -1;
    ctx.save();
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 5 * scale;
    ctx.lineCap = 'round';
    ctx.globalAlpha = (opts.alpha ?? 1) * 0.85;
    ctx.beginPath();
    ctx.moveTo(0, -24 * scale);
    const wave1 = Math.sin(opts.animTime * 11) * 7 * scale;
    const wave2 = Math.cos(opts.animTime * 11) * 9 * scale;
    ctx.quadraticCurveTo(
      flipDir * 18 * scale,
      -22 * scale + wave1,
      flipDir * 32 * scale,
      -14 * scale + wave2
    );
    ctx.stroke();
    ctx.restore();
  }

  // 3. 60 FPS Smooth Sub-Pixel Body Bob, Lean & Martial Lunge
  const smoothWalkBob = isWalk ? Math.abs(Math.sin(opts.animTime * 13)) * -4.2 * scale : 0;
  const lungeOffset = isCast ? Math.sin(opts.animTime * 22) * 5 * scale : 0;
  const tilt = isCast
    ? 0.14
    : isDash
    ? 0.22
    : isWalk
    ? Math.sin(opts.animTime * 13) * 0.08
    : Math.sin(opts.animTime * 3.5) * 0.02;
  const breathY = 1 + Math.sin(opts.animTime * 6.5) * 0.035;

  const flip = opts.facingX < -0.05 ? -1 : 1;
  ctx.save();
  ctx.translate(flip * lungeOffset, smoothWalkBob);
  ctx.scale(flip * scale, scale * breathY);
  ctx.rotate(tilt);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height + 14);
  ctx.restore();

  // 4. 60 FPS Sweeping Martial-Arts Elemental Slash Arc when Attacking/Casting
  if (isCast && !opts.isDashGhost) {
    const aimAng = Math.atan2(opts.facingY, opts.facingX);
    const swingSweep = Math.sin(opts.animTime * 24) * 0.45;
    ctx.save();
    ctx.translate(0, -22 * scale);
    ctx.rotate(aimAng + swingSweep);
    ctx.strokeStyle = pal.glow;
    ctx.lineWidth = 5.5 * scale;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.arc(0, 0, 38 * scale, -0.75, 0.75);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, 39 * scale, -0.55, 0.55);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Orbiting Elemental Sub-Bending Relics + Flowing Elemental Ribbon
  if (!opts.isDashGhost && opts.animState !== 'defeat') {
    const t = opts.animTime;
    for (let i = 0; i < 3; i++) {
      const ang = t * 2.9 + (i * Math.PI * 2) / 3;
      const ox = Math.cos(ang) * 35 * scale;
      const oy = -24 * scale + Math.sin(ang) * 11 * scale + smoothWalkBob * 0.5;

      ctx.save();
      ctx.strokeStyle = pal.glow;
      ctx.globalAlpha = (opts.alpha ?? 1) * 0.48;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(
        Math.cos(ang - 0.5) * 35 * scale,
        -24 * scale + Math.sin(ang - 0.5) * 11 * scale + smoothWalkBob * 0.5
      );
      ctx.stroke();
      ctx.restore();

      const relic = getOrbitRelicCanvas(classId, i);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(relic, ox - relic.width / 2, oy - relic.height / 2);
      ctx.restore();
    }
  }

  ctx.restore();
}

export function getBenderPortraitCanvas(classId: ArcanaClassId): HTMLCanvasElement | null {
  if (!benderAtlasLoaded) return null;
  return BENDER_CUTOUT_CACHE.get(classId) ?? null;
}

// ----------------------------------------------------------------------------
// 2. Enemy Archetypes — High-Detail 36x38 Pixel Art Monsters
// ----------------------------------------------------------------------------

function buildEnemyFrameCanvas(
  archetypeId: EnemyArchetypeId,
  frameIdx: number,
  hitFlash: boolean,
  isElite: boolean
): HTMLCanvasElement {
  const key = `en3_${archetypeId}_${frameIdx}_${hitFlash ? 1 : 0}_${isElite ? 1 : 0}`;
  return getCachedSprite(key, () => {
    const g = createGrid(36, 38);
    const def = ARCANA_ENEMIES[archetypeId];
    const p1 = def.palette.primary;
    const p2 = def.palette.secondary;
    const eye = def.palette.eyeGlow;
    const bob = frameIdx % 2 === 0 ? -2 : 0;
    const step = frameIdx === 0 ? -2 : frameIdx === 2 ? 2 : 0;

    switch (archetypeId) {
      case 'patroller': {
        fillRectPx(g, 11, 27 + Math.max(0, step), 5, 7, p2);
        fillRectPx(g, 20, 27 + Math.max(0, -step), 5, 7, p2);
        fillRectPx(g, 9, 13 + bob, 18, 15, p1, p2);
        fillRectPx(g, 6, 14 + bob, 4, 11, p1);
        fillRectPx(g, 26, 14 + bob, 4, 11, p1);
        fillRectPx(g, 14, 16 + bob, 8, 8, '#101420');
        fillRectPx(g, 15, 17 + bob, 6, 6, eye);
        fillRectPx(g, 17, 19 + bob, 2, 2, '#ffffff');
        fillRectPx(g, 12, 6 + bob, 12, 7, p1);
        fillRectPx(g, 14, 9 + bob, 3, 2, eye);
        fillRectPx(g, 19, 9 + bob, 3, 2, eye);
        break;
      }
      case 'ranged_caster': {
        fillRectPx(g, 11, 16 + bob, 14, 18, p2, p1);
        fillRectPx(g, 13, 17 + bob, 10, 16, p1);
        fillRectPx(g, 12, 7 + bob, 12, 9, p1);
        fillRectPx(g, 14, 10 + bob, 8, 5, '#070310');
        fillRectPx(g, 15, 11 + bob, 2, 2, eye);
        fillRectPx(g, 19, 11 + bob, 2, 2, eye);
        fillRectPx(g, 27, 9 + bob, 2, 23, '#6b4c8c');
        fillEllipsePx(g, 28, 7 + bob, 4, 4, eye, '#ffffff');
        break;
      }
      case 'charger': {
        fillRectPx(g, 9, 26 + Math.max(0, step), 6, 8, p2);
        fillRectPx(g, 21, 26 + Math.max(0, -step), 6, 8, p2);
        fillRectPx(g, 7, 11 + bob, 22, 16, p1, p2);
        fillRectPx(g, 3, 7 + bob, 6, 7, '#e2dbf0');
        fillRectPx(g, 27, 7 + bob, 6, 7, '#e2dbf0');
        fillRectPx(g, 11, 15 + bob, 5, 3, eye);
        fillRectPx(g, 20, 15 + bob, 5, 3, eye);
        fillRectPx(g, 15, 20 + bob, 6, 2, '#ffffff');
        break;
      }
      case 'area_conjuror': {
        fillRectPx(g, 11, 15 + bob, 14, 19, p2, p1);
        fillRectPx(g, 13, 8 + bob, 10, 8, p1);
        fillRectPx(g, 12, 2 + bob, 12, 6, eye);
        fillRectPx(g, 15, 4 + bob, 6, 3, '#ffffff');
        fillEllipsePx(g, 6, 16 + bob, 4, 4, eye, '#ffffff');
        fillEllipsePx(g, 30, 16 + bob, 4, 4, eye, '#ffffff');
        break;
      }
      case 'summoner': {
        fillRectPx(g, 8, 3 + bob, 20, 4, eye);
        fillRectPx(g, 8, 7 + bob, 3, 14, eye);
        fillRectPx(g, 25, 7 + bob, 3, 14, eye);
        fillRectPx(g, 12, 14 + bob, 12, 19, p2, p1);
        fillRectPx(g, 13, 8 + bob, 10, 6, p1);
        fillRectPx(g, 15, 10 + bob, 2, 2, '#ffffff');
        fillRectPx(g, 19, 10 + bob, 2, 2, '#ffffff');
        break;
      }
      case 'shield_warden': {
        fillRectPx(g, 10, 26 + Math.max(0, step), 6, 8, p2);
        fillRectPx(g, 20, 26 + Math.max(0, -step), 6, 8, p2);
        fillRectPx(g, 8, 12 + bob, 20, 15, p1, p2);
        fillRectPx(g, 12, 5 + bob, 12, 8, p1);
        fillRectPx(g, 13, 8 + bob, 10, 2, eye);
        fillRectPx(g, 16, 2 + bob, 4, 4, eye);
        break;
      }
      case 'sigil_priest': {
        fillRectPx(g, 12, 14 + bob, 12, 20, p1, p2);
        fillRectPx(g, 13, 3 + bob, 10, 11, p1);
        fillRectPx(g, 16, 4 + bob, 4, 9, eye);
        fillEllipsePx(g, 29, 19 + bob, 4, 4, eye, '#ffffff');
        break;
      }
      case 'terrain_weaver': {
        fillRectPx(g, 9, 8 + bob, 18, 7, p1);
        fillRectPx(g, 13, 15 + bob, 10, 7, eye);
        fillRectPx(g, 9, 22 + bob, 18, 9, p1);
        fillRectPx(g, 15, 17 + bob, 6, 3, '#ffffff');
        break;
      }
      case 'rift_stalker': {
        fillRectPx(g, 12, 13 + bob, 12, 16, p2, p1);
        fillRectPx(g, 13, 7 + bob, 10, 7, p1);
        fillRectPx(g, 14, 9 + bob, 3, 2, eye);
        fillRectPx(g, 19, 9 + bob, 3, 2, eye);
        fillRectPx(g, 3, 11 + bob, 8, 3, eye);
        fillRectPx(g, 25, 11 + bob, 8, 3, eye);
        fillRectPx(g, 4, 12 + bob, 6, 1, '#ffffff');
        fillRectPx(g, 26, 12 + bob, 6, 1, '#ffffff');
        break;
      }
      case 'colossus_elite':
      default: {
        fillRectPx(g, 3, 8 + bob, 7, 16, p2);
        fillRectPx(g, 26, 8 + bob, 7, 16, p2);
        fillRectPx(g, 8, 10 + bob, 20, 22, p1, p2);
        fillRectPx(g, 12, 3 + bob, 12, 7, '#ffd166');
        fillRectPx(g, 14, 13 + bob, 8, 6, eye);
        fillRectPx(g, 16, 15 + bob, 4, 3, '#ffffff');
        break;
      }
    }

    if (isElite) {
      fillRectPx(g, 12, 1, 12, 3, '#ffd166');
      setPx(g, 12, 0, '#ffd166');
      setPx(g, 18, 0, '#ff0054');
      setPx(g, 23, 0, '#ffd166');
    }

    applyPixelOutline(g, '#080510');
    return bakeGridToCanvas(g, 2, hitFlash);
  });
}

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  enemy: ActiveEnemy,
  time: number
): void {
  const scale = (enemy.isElite ? 1.32 : 1.05) * (enemy.radius / 18);
  const speedMag = Math.hypot(enemy.vx, enemy.vy);
  const isMoving = speedMag > 8;
  const walkPhase = time * 13 + enemy.x * 0.025 + enemy.y * 0.025;
  const frameIdx = Math.floor((time + enemy.x * 0.01) * 11) % 4;
  const sprite = buildEnemyFrameCanvas(
    enemy.archetypeId,
    frameIdx,
    enemy.hitFlashTimer > 0,
    enemy.isElite
  );

  // 60 FPS continuous sub-pixel bounce, stride tilt & attack lunge
  const bobY = isMoving
    ? Math.abs(Math.sin(walkPhase)) * -4.2
    : Math.sin(time * 4 + enemy.x) * 1.6;
  const tiltRad = isMoving ? Math.sin(walkPhase) * 0.08 : 0;
  const squashX = 1 + (isMoving ? Math.cos(walkPhase * 2) * 0.05 : 0);
  const squashY = 1 - (isMoving ? Math.cos(walkPhase * 2) * 0.05 : 0);

  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  ctx.fillStyle = 'rgba(4, 2, 10, 0.58)';
  ctx.beginPath();
  ctx.ellipse(0, 6 * scale, 18 * scale * squashX, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.isElite) {
    ctx.strokeStyle = '#ffbe0b';
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 6);
    ctx.beginPath();
    ctx.ellipse(0, 6 * scale, 26 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (enemy.archetypeId === 'sigil_priest') {
    ctx.strokeStyle = '#e0b1cb';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const flip = enemy.facingX < -0.05 ? -1 : 1;
  ctx.save();
  ctx.translate(0, bobY);
  ctx.rotate(tiltRad);
  ctx.scale(flip * scale * squashX, scale * squashY);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height + 10);
  ctx.restore();

  if (enemy.archetypeId === 'shield_warden') {
    const ang = enemy.shieldAngle ?? Math.atan2(enemy.facingY, enemy.facingX);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, -8 * scale, enemy.radius + 7, ang - 0.95, ang + 0.95);
    ctx.stroke();
  }

  if (enemy.hp < enemy.maxHp || enemy.isElite) {
    const bw = enemy.isElite ? 48 : 32;
    const bh = enemy.isElite ? 6 : 4;
    const by = -sprite.height * scale + 2;
    ctx.fillStyle = '#090514';
    ctx.fillRect(-bw / 2 - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = enemy.isElite ? '#ffbe0b' : '#ff4d6d';
    ctx.fillRect(-bw / 2, by, bw * Math.max(0, enemy.hp / enemy.maxHp), bh);
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3. Monumental Elemental Bosses (56x56 Pixel Grid x2.2)
// ----------------------------------------------------------------------------

function buildBossFrameCanvas(
  bossId: string,
  phase: number,
  frameIdx: number,
  hitFlash: boolean,
  palette: { body: string; armor: string; glow: string; danger: string }
): HTMLCanvasElement {
  const key = `boss3_${bossId}_p${phase}_f${frameIdx}_${hitFlash ? 1 : 0}`;
  return getCachedSprite(key, () => {
    const g = createGrid(56, 56);
    const bob = frameIdx % 2 === 0 ? -2 : 0;
    const wing = frameIdx === 1 ? -3 : frameIdx === 3 ? 2 : 0;
    const coreCol = phase >= 3 ? palette.danger : palette.glow;

    fillRectPx(g, 3, 10 + wing, 10, 30, palette.armor, palette.body);
    fillRectPx(g, 43, 10 - wing, 10, 30, palette.armor, palette.body);
    fillRectPx(g, 5, 12 + wing, 6, 24, coreCol);
    fillRectPx(g, 45, 12 - wing, 6, 24, coreCol);

    fillRectPx(g, 14, 14 + bob, 28, 32, palette.body);
    fillRectPx(g, 16, 16 + bob, 24, 26, palette.armor, palette.body);

    fillRectPx(g, 18, 5 + bob, 20, 9, palette.armor);
    fillRectPx(g, 21, 2 + bob, 4, 4, coreCol);
    fillRectPx(g, 26, 0 + bob, 4, 6, '#ffffff');
    fillRectPx(g, 31, 2 + bob, 4, 4, coreCol);

    fillRectPx(g, 21, 11 + bob, 4, 2, '#ffffff');
    fillRectPx(g, 31, 11 + bob, 4, 2, '#ffffff');
    fillEllipsePx(g, 28, 27 + bob, 7, 7, coreCol, '#ffffff');

    applyPixelOutline(g, '#080510');
    return bakeGridToCanvas(g, 2, hitFlash);
  });
}

export function drawBossSprite(
  ctx: CanvasRenderingContext2D,
  boss: ActiveBoss,
  time: number
): void {
  const pal = boss.def.palette;
  const frameIdx = Math.floor(time * 6) % 4;
  const sprite = buildBossFrameCanvas(
    boss.def.id,
    boss.currentPhase,
    frameIdx,
    boss.hitFlashTimer > 0,
    pal
  );
  const scale = Math.max(1.25, boss.def.radius / 34);

  ctx.save();
  ctx.translate(boss.x, boss.y);

  ctx.save();
  ctx.translate(0, 12);
  ctx.scale(1, 0.5);
  ctx.rotate(time * 0.9);
  ctx.strokeStyle = boss.currentPhase >= 3 ? pal.danger : pal.glow;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.arc(0, 0, boss.def.radius * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(-boss.def.radius * 0.95, -boss.def.radius * 0.95, boss.def.radius * 1.9, boss.def.radius * 1.9);
  ctx.restore();

  const sealCount = 4 + boss.currentPhase * 2;
  for (let i = 0; i < sealCount; i++) {
    const a = time * 1.8 + (i * Math.PI * 2) / sealCount;
    const sx = Math.cos(a) * (boss.def.radius + 18);
    const sy = -18 + Math.sin(a) * (boss.def.radius * 0.45);
    ctx.fillStyle = i % 2 === 0 ? pal.glow : pal.danger;
    ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.strokeStyle = '#080510';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - 4, sy - 4, 8, 8);
  }

  const flip = boss.facingX < -0.05 ? -1 : 1;
  ctx.save();
  ctx.scale(flip * scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height + 18);
  ctx.restore();

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 4. Pixel-Art 2.5D Obstacles, Props & Shrines
// ----------------------------------------------------------------------------

function getObstacleSprite(kind: MapObstacle['kind'], campaignId: CampaignId): HTMLCanvasElement {
  const key = `obs3_${kind}_${campaignId}`;
  return getCachedSprite(key, () => {
    const g = createGrid(32, 44);
    const stone =
      campaignId === 'ash'
        ? '#422022'
        : campaignId === 'cloister'
        ? '#342258'
        : campaignId === 'hourglasses'
        ? '#634721'
        : campaignId === 'rift'
        ? '#241145'
        : '#1e3f66';
    const shade =
      campaignId === 'ash'
        ? '#261113'
        : campaignId === 'cloister'
        ? '#1d1233'
        : campaignId === 'hourglasses'
        ? '#3b2912'
        : campaignId === 'rift'
        ? '#120726'
        : '#10243d';
    const highlight =
      campaignId === 'ash'
        ? '#6e3538'
        : campaignId === 'cloister'
        ? '#583b91'
        : campaignId === 'hourglasses'
        ? '#8f6832'
        : campaignId === 'rift'
        ? '#42207a'
        : '#386fa4';
    const glow =
      campaignId === 'ash'
        ? '#ff7b00'
        : campaignId === 'cloister'
        ? '#80ffdb'
        : campaignId === 'hourglasses'
        ? '#52b788'
        : campaignId === 'rift'
        ? '#00f5d4'
        : '#7df9ff';

    if (kind === 'crystal_obelisk' || kind === 'hourglass_monolith') {
      fillRectPx(g, 6, 34, 20, 7, shade);
      fillRectPx(g, 8, 31, 16, 4, stone);
      fillRectPx(g, 10, 10, 12, 22, stone, shade);
      fillRectPx(g, 12, 6, 8, 5, highlight);
      fillRectPx(g, 14, 2, 4, 4, glow);
      fillRectPx(g, 15, 12, 2, 16, glow);
      fillRectPx(g, 12, 18, 8, 2, glow);
      setPx(g, 15, 18, '#ffffff');
    } else {
      fillRectPx(g, 4, 35, 24, 6, shade);
      fillRectPx(g, 6, 32, 20, 4, highlight);
      fillRectPx(g, 7, 10, 18, 22, stone, shade);
      for (let x = 9; x <= 21; x += 4) {
        fillRectPx(g, x, 11, 2, 20, highlight);
      }
      fillRectPx(g, 5, 6, 22, 5, highlight);
      fillRectPx(g, 7, 4, 18, 3, stone);
      fillRectPx(g, 14, 17, 4, 7, glow);
      setPx(g, 15, 19, '#ffffff');
    }

    applyPixelOutline(g, '#080510');
    return bakeGridToCanvas(g, 2, false);
  });
}

export function drawObstacle25D(
  ctx: CanvasRenderingContext2D,
  obs: MapObstacle,
  campaignId: CampaignId,
  _time: number
): void {
  ctx.save();
  if (obs.kind === 'chasm') {
    ctx.fillStyle = '#05020a';
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2;
    ctx.fillRect(obs.x - obs.w / 2, obs.y - obs.h / 2, obs.w, obs.h);
    ctx.strokeRect(obs.x - obs.w / 2, obs.y - obs.h / 2, obs.w, obs.h);
    ctx.restore();
    return;
  }

  ctx.fillStyle = 'rgba(4, 2, 10, 0.6)';
  ctx.beginPath();
  ctx.ellipse(obs.x, obs.y + obs.h * 0.35, obs.w * 0.62, obs.h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  const sprite = getObstacleSprite(obs.kind, campaignId);
  ctx.imageSmoothingEnabled = false;
  const drawW = Math.max(obs.w * 1.15, sprite.width);
  const drawH = sprite.height * (drawW / sprite.width);
  ctx.drawImage(sprite, obs.x - drawW / 2, obs.y + obs.h * 0.35 - drawH, drawW, drawH);
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
  const pulse = 0.65 + 0.35 * Math.sin(time * 3 + dec.phaseOffset);

  if (dec.kind === 'rune_tile') {
    const col = campaignId === 'ash' ? '#ff7b00' : campaignId === 'hourglasses' ? '#52b788' : '#00bbf9';
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.45 * pulse;
    ctx.lineWidth = 2;
    ctx.strokeRect(-24 * s, -24 * s, 48 * s, 48 * s);
    ctx.beginPath();
    ctx.arc(0, 0, 16 * s, 0, Math.PI * 2);
    ctx.stroke();
  } else if (dec.kind === 'ash_tree') {
    const treeKey = `dec_ashtree`;
    const treeCanvas = getCachedSprite(treeKey, () => {
      const g = createGrid(28, 36);
      fillRectPx(g, 11, 20, 6, 14, '#2b1618', '#170a0c');
      fillEllipsePx(g, 14, 13, 11, 9, '#9e2a2b', '#ff7b00');
      fillEllipsePx(g, 14, 10, 7, 5, '#ffbe0b', '#ffffff');
      applyPixelOutline(g, '#080510');
      return bakeGridToCanvas(g, 2, false);
    });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(treeCanvas, (-treeCanvas.width * s) / 2, -treeCanvas.height * s + 8, treeCanvas.width * s, treeCanvas.height * s);
  } else if (dec.kind === 'mirror_arch') {
    const archKey = `dec_mirrorarch`;
    const archCanvas = getCachedSprite(archKey, () => {
      const g = createGrid(26, 36);
      fillRectPx(g, 3, 6, 20, 28, '#3b246b');
      fillRectPx(g, 6, 9, 14, 23, '#9d4edd', '#e0aaff');
      fillRectPx(g, 9, 12, 8, 16, '#ffffff');
      applyPixelOutline(g, '#080510');
      return bakeGridToCanvas(g, 2, false);
    });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(archCanvas, (-archCanvas.width * s) / 2, -archCanvas.height * s + 8, archCanvas.width * s, archCanvas.height * s);
  } else if (dec.kind === 'sand_vortex') {
    ctx.strokeStyle = '#ffd166';
    ctx.globalAlpha = 0.5 * pulse;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 30 * s, time * 2, time * 2 + Math.PI * 1.5);
    ctx.stroke();
  } else if (dec.kind === 'void_fissure') {
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-22 * s, -6 * s);
    ctx.lineTo(-4 * s, 5 * s);
    ctx.lineTo(8 * s, -4 * s);
    ctx.lineTo(22 * s, 6 * s);
    ctx.stroke();
  } else {
    const fy = -18 * s + Math.sin(time * 3.5 + dec.phaseOffset) * 5;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-4 * s, fy - 6 * s, 8 * s, 12 * s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2 * s, fy - 3 * s, 4 * s, 6 * s);
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
  const pulse = poi.used ? 0.35 : 0.72 + 0.28 * Math.sin(time * 3.5);

  ctx.save();
  ctx.translate(0, 8);
  ctx.scale(1, 0.55);
  ctx.rotate(poi.used ? 0 : time * 0.8);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = pulse * 0.85;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, poi.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(-poi.radius * 0.7, -poi.radius * 0.7, poi.radius * 1.4, poi.radius * 1.4);
  ctx.restore();

  const shrineSprite = getCachedSprite(`shrine_${poi.type}_${poi.used ? 1 : 0}`, () => {
    const g = createGrid(28, 34);
    fillRectPx(g, 4, 24, 20, 8, '#1a1f33');
    fillRectPx(g, 6, 18, 16, 7, '#2d3554');
    fillRectPx(g, 5, 16, 18, 3, '#465380');
    if (!poi.used) {
      fillEllipsePx(g, 14, 9, 6, 6, accent, '#ffffff');
    }
    applyPixelOutline(g, '#080510');
    return bakeGridToCanvas(g, 2, false);
  });

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(shrineSprite, -shrineSprite.width / 2, -shrineSprite.height + 16);

  if (!poi.used && playerDist < poi.radius + 110) {
    ctx.font = 'bold 13px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#080510';
    ctx.lineWidth = 3;
    ctx.strokeText(poi.name, 0, -58);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(poi.name, 0, -58);

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText('[F] Interagir', 0, -42);
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 5. Elemental Sub-Bending Constructs (Ice Spires, Water Spouts, Blood Totems,
//    Wind Tornadoes, Combustion Braziers, Rock/Crystal/Lava Monoliths)
// ----------------------------------------------------------------------------

function getElementalConstructCanvas(kind: ActiveSummonOrConstruct['kind']): HTMLCanvasElement {
  const key = `elem_construct_px_${kind}`;
  return getCachedSprite(key, () => {
    const g = createGrid(28, 36);

    if (kind === 'chess_queen') {
      // Avatar Blood-Moon / Glacial Sovereign Spire
      fillEllipsePx(g, 14, 30, 10, 4, '#0077b6', '#00bbf9');
      fillRectPx(g, 9, 10, 10, 20, '#00bbf9', '#caf0f8');
      fillRectPx(g, 11, 4, 6, 8, '#ffffff');
      fillEllipsePx(g, 14, 14, 5, 5, '#ff0054', '#ffccd5'); // Crimson Blood Moon Core
    } else if (kind === 'chess_rook') {
      // Towering Glacial Ice Fortress Wall / Geyser Pillar
      fillRectPx(g, 6, 12, 16, 20, '#48cae4', '#0077b6');
      fillRectPx(g, 5, 7, 18, 6, '#caf0f8');
      fillRectPx(g, 8, 4, 3, 4, '#ffffff');
      fillRectPx(g, 13, 3, 3, 5, '#ffffff');
      fillRectPx(g, 18, 4, 3, 4, '#ffffff');
    } else if (kind === 'chess_bishop') {
      // Healing Mist & Swamp-Vine Lotus Spire
      fillEllipsePx(g, 14, 28, 9, 5, '#2d6a4f', '#52b788');
      fillRectPx(g, 10, 11, 8, 17, '#00bbf9', '#80ffdb');
      fillEllipsePx(g, 14, 8, 6, 6, '#80ffdb', '#ffffff');
    } else if (kind === 'chess_knight') {
      // Crashing Tidal Wave Crest / Sea Serpent Construct
      fillEllipsePx(g, 14, 28, 10, 4, '#03045e', '#0077b6');
      fillRectPx(g, 8, 12, 11, 16, '#0096c7', '#48cae4');
      fillRectPx(g, 11, 6, 10, 7, '#90e0ef');
      fillRectPx(g, 15, 4, 7, 3, '#ffffff'); // White foam crest
    } else if (kind === 'chaos_totem') {
      // Dragon-Fire & Blue Lightning Combustion Brazier
      fillRectPx(g, 7, 16, 14, 16, '#370617', '#6a040f');
      fillRectPx(g, 5, 13, 18, 4, '#ffd166');
      fillEllipsePx(g, 14, 8, 7, 6, '#ff5400', '#ffbe0b');
      fillEllipsePx(g, 14, 7, 4, 4, '#00bbf9', '#ffffff'); // Blue Fire Core
    } else {
      // Crystalline Ice / Water Whip Sentinel (`chess_pawn`)
      fillEllipsePx(g, 14, 29, 8, 3, '#0077b6');
      fillRectPx(g, 10, 13, 8, 16, '#48cae4', '#caf0f8');
      fillEllipsePx(g, 14, 9, 5, 5, '#90e0ef', '#ffffff');
    }

    applyPixelOutline(g, '#080510');
    return bakeGridToCanvas(g, 2, false);
  });
}

export function drawConstructSprite(
  ctx: CanvasRenderingContext2D,
  c: ActiveSummonOrConstruct,
  time: number
): void {
  ctx.save();
  ctx.translate(c.x, c.y);

  // TERRA (`rune_*`): Tectonic Monoliths, Molten Lava Fissures & Seismic Crystal Rings
  if (c.kind.startsWith('rune_circle') || c.kind === 'rune_great_inscription') {
    const isLava = c.kind === 'rune_circle_fire';
    const isCrystal = c.kind === 'rune_circle_frost';
    const isMetal = c.kind === 'rune_circle_volt';
    const col = isLava
      ? '#ff5400'
      : isCrystal
      ? '#00f5d4'
      : isMetal
      ? '#e2e8f0'
      : '#52b788';

    // Molten Lava / Seismic Crater Fill
    ctx.fillStyle = isLava
      ? 'rgba(255, 84, 0, 0.24)'
      : isCrystal
      ? 'rgba(0, 245, 212, 0.18)'
      : isMetal
      ? 'rgba(226, 232, 240, 0.18)'
      : 'rgba(82, 183, 136, 0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.fill();

    // Jagged Tectonic Ring
    ctx.strokeStyle = col;
    ctx.lineWidth = c.kind === 'rune_great_inscription' ? 4.5 : 3;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating Seismic Geometric Seal
    ctx.save();
    ctx.rotate(time * 1.6);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const rx = Math.cos(a) * c.radius * 0.78;
      const ry = Math.sin(a) * c.radius * 0.78;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Central 2.5D Rock / Lava / Crystal Monolith Pillar
    ctx.fillStyle = '#3d2c1e';
    ctx.strokeStyle = '#080510';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(-8, -24);
    ctx.lineTo(0, -32);
    ctx.lineTo(9, -22);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Vein inside Monolith
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(-3, -12);
    ctx.lineTo(2, 2);
    ctx.stroke();

    ctx.restore();
    return;
  }

  // AR (`chrono_dome`): Cyclonic Wind Vortex & Vacuum Sphere
  if (c.kind === 'chrono_dome') {
    ctx.fillStyle = 'rgba(128, 255, 219, 0.16)';
    ctx.strokeStyle = '#80ffdb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Swirling Hurricane Wind Streams inside Cyclone
    for (let ring = 1; ring <= 3; ring++) {
      const r = c.radius * (ring * 0.28);
      const startAng = time * (4.5 - ring * 0.8) + ring;
      ctx.strokeStyle = ring === 2 ? '#ffffff' : '#7de2ff';
      ctx.lineWidth = 4 - ring * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, r, startAng, startAng + Math.PI * 1.35);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // AR (`chrono_echo`): Astral Spirit Projection of the Airbender
  if (c.kind === 'chrono_echo') {
    drawClassSprite(ctx, 'chrono', 0, 0, {
      animState: 'cast',
      animTime: time,
      facingX: 1,
      facingY: 0,
      hitFlash: false,
      alpha: 0.72,
      isDashGhost: true,
    });
    ctx.restore();
    return;
  }

  // ÁGUA / FOGO Constructs (Water/Ice/Blood Spires & Dragon-Fire Braziers)
  const floatY = Math.sin(time * 5 + c.x * 0.05) * 4;
  ctx.fillStyle = 'rgba(0, 187, 249, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const pieceCanvas = getElementalConstructCanvas(c.kind);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pieceCanvas, -pieceCanvas.width / 2, -pieceCanvas.height + 10 + floatY);
  ctx.restore();
}
