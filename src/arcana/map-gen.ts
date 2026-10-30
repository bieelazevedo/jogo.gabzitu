// ============================================================================
// ASCENSÃO ARCANA — Procedural Modular Map Generator (GDD Section 5 & 9)
// ============================================================================

import type {
  CampaignId,
  GeneratedCampaignMap,
  MapDecoration,
  MapObstacle,
  MapPoiInstance,
  MapPoiType,
} from './types';

function createRng(seed: number): () => number {
  let s = seed | 0 || 1337;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POI_CATALOG: Record<
  MapPoiType,
  { name: string; description: string; radius: number; costFragments?: number }
> = {
  forbidden_library: {
    name: 'Biblioteca Proibida',
    description: 'Decifra um tomo ancestral para escolher 1 de 3 aprimoramentos raros.',
    radius: 56,
  },
  transmutation_altar: {
    name: 'Altar de Transmutação',
    description: 'Sacrifica 25% da Vida atual em troca de um aprimoramento Épico ou Lendário.',
    radius: 54,
  },
  mirror_possibilities: {
    name: 'Espelho de Possibilidades',
    description: 'Reflete a tua alma para duplicar um aprimoramento já adquirido.',
    radius: 54,
  },
  wandering_merchant: {
    name: 'Mercador do Crepúsculo',
    description: 'Troca Fragmentos Arcanos por Relíquias e bênçãos raras.',
    radius: 58,
    costFragments: 35,
  },
  unstable_ritual: {
    name: 'Círculo de Ritual Instável',
    description: 'Permanece dentro do selo por 18s contra ondas intensas para ganhar uma Relíquia.',
    radius: 95,
  },
  arcane_anomaly: {
    name: 'Anomalia Convergente',
    description: 'Liberta energia instável que concede +60 Fragmentos, XP massivo e sobrecarga.',
    radius: 52,
  },
  healing_sanctuary: {
    name: 'Santuário de Restauração',
    description: 'Fonte cristalina que restaura 55% da Vida Máxima e purifica lentidões.',
    radius: 56,
  },
  early_boss_beacon: {
    name: 'Marco do Desafio Antecipado',
    description: 'Toca o sino astral para invocar o Guardião da Campanha imediatamente com recompensa extra!',
    radius: 60,
  },
};

const BIOME_OBSTACLE_KINDS: Record<CampaignId, MapObstacle['kind'][]> = {
  runes: ['pillar', 'statue', 'ruin_wall', 'crystal_obelisk'],
  ash: ['pillar', 'ruin_wall', 'chasm', 'statue'],
  cloister: ['statue', 'crystal_obelisk', 'pillar', 'ruin_wall'],
  hourglasses: ['hourglass_monolith', 'pillar', 'ruin_wall', 'chasm'],
  rift: ['crystal_obelisk', 'chasm', 'hourglass_monolith', 'statue'],
  infinite: ['crystal_obelisk', 'hourglass_monolith', 'statue', 'pillar'],
};

const BIOME_DECORATIONS: Record<CampaignId, MapDecoration['kind'][]> = {
  runes: ['rune_tile', 'floating_shard', 'torch'],
  ash: ['ash_tree', 'torch', 'rune_tile'],
  cloister: ['mirror_arch', 'floating_shard', 'rune_tile'],
  hourglasses: ['sand_vortex', 'rune_tile', 'hourglass_monolith' as unknown as MapDecoration['kind']].filter(
    (k): k is MapDecoration['kind'] =>
      k === 'sand_vortex' || k === 'rune_tile' || k === 'torch' || k === 'floating_shard',
  ),
  rift: ['void_fissure', 'floating_shard', 'rune_tile'],
  infinite: ['void_fissure', 'floating_shard', 'mirror_arch', 'sand_vortex', 'rune_tile'],
};

function overlapsKeepout(
  x: number,
  y: number,
  w: number,
  h: number,
  keepouts: Array<{ x: number; y: number; r: number }>,
): boolean {
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const halfDiag = Math.hypot(w, h) * 0.5;
  for (const k of keepouts) {
    if (Math.hypot(cx - k.x, cy - k.y) < k.r + halfDiag) {
      return true;
    }
  }
  return false;
}

export function generateCampaignMap(
  campaignId: CampaignId,
  seed = Date.now(),
  options?: { isTraining?: boolean; isTutorial?: boolean },
): GeneratedCampaignMap {
  const rng = createRng(seed);
  const isCompact = Boolean(options?.isTraining || options?.isTutorial);
  const width = isCompact ? 1400 : 2600;
  const height = isCompact ? 1100 : 2600;

  const spawnX = width * 0.5;
  const spawnY = isCompact ? height * 0.62 : height * 0.55;

  const bossArenaCenter = {
    x: width * 0.5,
    y: isCompact ? height * 0.32 : height * 0.24,
    radius: isCompact ? 340 : 480,
  };

  const keepouts: Array<{ x: number; y: number; r: number }> = [
    { x: spawnX, y: spawnY, r: 210 },
    { x: bossArenaCenter.x, y: bossArenaCenter.y, r: bossArenaCenter.radius * 0.68 },
  ];

  const pois: MapPoiInstance[] = [];

  if (options?.isTutorial) {
    // Tutorial has a dedicated Sanctuary + Forbidden Library for the final step
    const tutPois: Array<{ type: MapPoiType; x: number; y: number }> = [
      { type: 'forbidden_library', x: spawnX, y: spawnY - 260 },
      { type: 'healing_sanctuary', x: spawnX + 260, y: spawnY - 120 },
    ];
    tutPois.forEach((tp, idx) => {
      const meta = POI_CATALOG[tp.type];
      pois.push({
        id: `poi_tut_${idx}`,
        type: tp.type,
        name: meta.name,
        description: meta.description,
        x: tp.x,
        y: tp.y,
        radius: meta.radius,
        used: false,
        costFragments: meta.costFragments,
      });
      keepouts.push({ x: tp.x, y: tp.y, r: meta.radius + 70 });
    });
  } else if (options?.isTraining) {
    const trainPois: Array<{ type: MapPoiType; x: number; y: number }> = [
      { type: 'forbidden_library', x: spawnX - 320, y: spawnY - 180 },
      { type: 'mirror_possibilities', x: spawnX + 320, y: spawnY - 180 },
      { type: 'healing_sanctuary', x: spawnX, y: spawnY + 230 },
    ];
    trainPois.forEach((tp, idx) => {
      const meta = POI_CATALOG[tp.type];
      pois.push({
        id: `poi_train_${idx}`,
        type: tp.type,
        name: meta.name,
        description: meta.description,
        x: tp.x,
        y: tp.y,
        radius: meta.radius,
        used: false,
        costFragments: meta.costFragments,
      });
      keepouts.push({ x: tp.x, y: tp.y, r: meta.radius + 70 });
    });
  } else {
    // Full campaign map: 8 POIs across exploration wings + early boss beacon near arena entrance
    const wingPositions: Array<{ x: number; y: number; fixedType?: MapPoiType }> = [
      // Early Boss Beacon at the threshold of the Northern Grand Arena
      { x: bossArenaCenter.x, y: bossArenaCenter.y + bossArenaCenter.radius + 60, fixedType: 'early_boss_beacon' },
      // West Wing (Sanctuary / Library)
      { x: width * 0.20, y: height * 0.52 },
      // East Wing (Altar / Merchant)
      { x: width * 0.80, y: height * 0.52 },
      // North-West Wing
      { x: width * 0.22, y: height * 0.25 },
      // North-East Wing
      { x: width * 0.78, y: height * 0.25 },
      // South-West Wing
      { x: width * 0.26, y: height * 0.78 },
      // South-East Wing
      { x: width * 0.74, y: height * 0.78 },
      // Southern Sanctum
      { x: width * 0.50, y: height * 0.84, fixedType: 'healing_sanctuary' },
    ];

    const pool: MapPoiType[] = [
      'forbidden_library',
      'transmutation_altar',
      'mirror_possibilities',
      'wandering_merchant',
      'unstable_ritual',
      'arcane_anomaly',
    ];

    // Shuffle pool deterministically
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }

    let poolIdx = 0;
    wingPositions.forEach((wp, idx) => {
      const type = wp.fixedType ?? pool[poolIdx++ % pool.length];
      const meta = POI_CATALOG[type];
      const jitterX = wp.fixedType ? 0 : (rng() - 0.5) * 120;
      const jitterY = wp.fixedType ? 0 : (rng() - 0.5) * 120;
      const px = Math.max(180, Math.min(width - 180, wp.x + jitterX));
      const py = Math.max(180, Math.min(height - 180, wp.y + jitterY));
      pois.push({
        id: `poi_${campaignId}_${idx}`,
        type,
        name: meta.name,
        description: meta.description,
        x: px,
        y: py,
        radius: meta.radius,
        used: false,
        costFragments: meta.costFragments,
      });
      keepouts.push({ x: px, y: py, r: meta.radius + 95 });
    });
  }

  // Generate architectural obstacles with guaranteed navigation corridors
  const obstacles: MapObstacle[] = [];
  const kindPool = BIOME_OBSTACLE_KINDS[campaignId] ?? BIOME_OBSTACLE_KINDS.runes;

  // Ring of 6 grand pillars framing the Boss Arena (with wide gaps so player never gets trapped)
  const ringCount = isCompact ? 4 : 6;
  for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI * 2 + Math.PI / 6;
    const dist = bossArenaCenter.radius;
    const ox = bossArenaCenter.x + Math.cos(angle) * dist - 28;
    const oy = bossArenaCenter.y + Math.sin(angle) * dist - 28;
    obstacles.push({
      id: `obs_arena_pillar_${i}`,
      x: ox,
      y: oy,
      w: 56,
      h: 56,
      kind: i % 2 === 0 ? 'pillar' : 'crystal_obelisk',
      destructible: false,
    });
    keepouts.push({ x: ox + 28, y: oy + 28, r: 95 });
  }

  // Scattered tactical cover & biome structures outside keepouts
  const targetObstacles = isCompact ? 10 : 32;
  let attempts = 0;
  while (obstacles.length < targetObstacles + ringCount && attempts < 220) {
    attempts++;
    const kind = kindPool[Math.floor(rng() * kindPool.length)];
    const isWall = kind === 'ruin_wall';
    const w = isWall ? (rng() > 0.5 ? 130 : 48) : 54;
    const h = isWall ? (w > 80 ? 48 : 130) : 54;
    const x = 150 + rng() * (width - 300 - w);
    const y = 150 + rng() * (height - 300 - h);

    if (overlapsKeepout(x, y, w, h, keepouts)) continue;

    obstacles.push({
      id: `obs_${campaignId}_${obstacles.length}`,
      x,
      y,
      w,
      h,
      kind,
      destructible: kind === 'crystal_obelisk' || kind === 'hourglass_monolith',
      hp: kind === 'crystal_obelisk' || kind === 'hourglass_monolith' ? 140 : undefined,
    });
    keepouts.push({ x: x + w * 0.5, y: y + h * 0.5, r: Math.max(w, h) * 0.75 + 65 });
  }

  // Decorations (non-blocking visual landmarks, rune tiles, torches, trees, vortices)
  const decorations: MapDecoration[] = [];
  const decoPool = BIOME_DECORATIONS[campaignId] ?? BIOME_DECORATIONS.runes;
  const decoCount = isCompact ? 36 : 85;
  for (let i = 0; i < decoCount; i++) {
    const kind = decoPool[i % decoPool.length];
    decorations.push({
      x: 90 + rng() * (width - 180),
      y: 90 + rng() * (height - 180),
      kind,
      scale: 0.75 + rng() * 0.65,
      phaseOffset: rng() * Math.PI * 2,
    });
  }

  // Secret Areas tucked near map corners
  const secretAreas = isCompact
    ? []
    : [
        {
          x: 170 + rng() * 120,
          y: height - 220 - rng() * 90,
          radius: 75,
          discovered: false,
          rewardFragments: 45,
        },
        {
          x: width - 190 - rng() * 120,
          y: 190 + rng() * 110,
          radius: 75,
          discovered: false,
          rewardFragments: 50,
        },
      ];

  return {
    campaignId,
    seed,
    width,
    height,
    spawnX,
    spawnY,
    bossArenaCenter,
    obstacles,
    pois,
    decorations,
    secretAreas,
  };
}
