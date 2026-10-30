// ============================================================================
// ASCENSÃO ARCANA — Real-Time Combat, Class Mechanics, Boss & Phase Simulation
// ============================================================================

import {
  ARCANA_CAMPAIGNS,
  ARCANA_CLASSES,
  ARCANA_ENEMIES,
  ARCANA_UPGRADES,
} from './data';
import { generateCampaignMap } from './map-gen';
import type {
  ActiveBoss,
  ActiveEnemy,
  ActiveProjectile,
  ActiveSummonOrConstruct,
  ArcanaClassId,
  ArcanaInputState,
  ArcanaRunState,
  CampaignDef,
  CampaignId,
  ElementalTag,
  EnemyArchetypeId,
  MapObstacle,
  MapPoiInstance,
  PlayerRuntimeState,
  SavedRunCheckpoint,
  UpgradeCardDef,
} from './types';

let uidCounter = 1;
function nextUid(prefix: string): string {
  uidCounter = (uidCounter + 1) % 1_000_000_000;
  return `${prefix}_${uidCounter}`;
}

export function getCampaignDef(campaignId: CampaignId): CampaignDef {
  return ARCANA_CAMPAIGNS.find((c) => c.id === campaignId) ?? ARCANA_CAMPAIGNS[0];
}

export function recomputePlayerStats(player: PlayerRuntimeState): void {
  const cls = ARCANA_CLASSES[player.classId];
  let damageMult = 1;
  let attackSpeedMult = 1;
  let moveSpeedMult = 1;
  let maxHpBonus = 0;
  let cooldownReduction = 0;
  let critChanceBonus = 0;
  let critDamageBonus = 0;
  let projectileCountBonus = 0;
  let pierceBonus = 0;
  let bounceBonus = 0;
  let areaScaleBonus = 0;
  let pickupRadiusBonus = 0;
  let thorns = 0;
  let vampirism = 0;

  for (const [upId, stacks] of Object.entries(player.upgrades)) {
    if (!stacks || stacks <= 0) continue;
    const def = ARCANA_UPGRADES.find((u) => u.id === upId);
    if (!def) continue;
    const eff = def.effect;
    if (eff.damageMult) damageMult += eff.damageMult * stacks;
    if (eff.attackSpeedMult) attackSpeedMult += eff.attackSpeedMult * stacks;
    if (eff.moveSpeedMult) moveSpeedMult += eff.moveSpeedMult * stacks;
    if (eff.maxHpBonus) maxHpBonus += eff.maxHpBonus * stacks;
    if (eff.cooldownReduction) cooldownReduction += eff.cooldownReduction * stacks;
    if (eff.critChanceBonus) critChanceBonus += eff.critChanceBonus * stacks;
    if (eff.critDamageBonus) critDamageBonus += eff.critDamageBonus * stacks;
    if (eff.projectileCountBonus) projectileCountBonus += eff.projectileCountBonus * stacks;
    if (eff.pierceBonus) pierceBonus += eff.pierceBonus * stacks;
    if (eff.bounceBonus) bounceBonus += eff.bounceBonus * stacks;
    if (eff.areaScaleBonus) areaScaleBonus += eff.areaScaleBonus * stacks;
    if (eff.pickupRadiusBonus) pickupRadiusBonus += eff.pickupRadiusBonus * stacks;
    if (eff.thornsDamage) thorns += eff.thornsDamage * stacks;
    if (eff.vampirismChance) vampirism += eff.vampirismChance * stacks;
  }

  // Level scaling (+3.5% damage and +6 HP per level above 1)
  const lvlBonus = Math.max(0, player.level - 1);
  damageMult += lvlBonus * 0.035;
  maxHpBonus += lvlBonus * 6;

  // Specialization bonuses
  if (player.specializationId === 'chess_grandmaster') {
    critDamageBonus += 0.45;
    damageMult += 0.15;
  } else if (player.specializationId === 'chess_royal_army') {
    projectileCountBonus += 1;
    cooldownReduction += 0.12;
  } else if (player.specializationId === 'chess_cursed_board') {
    vampirism += 0.18;
    areaScaleBonus += 0.25;
  } else if (player.specializationId === 'chrono_echoes') {
    cooldownReduction += 0.18;
    attackSpeedMult += 0.2;
  } else if (player.specializationId === 'chrono_rupture') {
    damageMult += 0.3;
    critChanceBonus += 0.12;
  } else if (player.specializationId === 'chrono_eternal') {
    maxHpBonus += 45;
    areaScaleBonus += 0.25;
  } else if (player.specializationId === 'chaos_loaded_dice') {
    critChanceBonus += 0.22;
    critDamageBonus += 0.5;
  } else if (player.specializationId === 'chaos_pandemonium') {
    areaScaleBonus += 0.32;
    damageMult += 0.22;
  } else if (player.specializationId === 'chaos_abyssal_jester') {
    attackSpeedMult += 0.25;
    cooldownReduction += 0.15;
  } else if (player.specializationId === 'rune_geometer') {
    areaScaleBonus += 0.3;
    maxHpBonus += 30;
  } else if (player.specializationId === 'rune_words_of_power') {
    damageMult += 0.28;
    cooldownReduction += 0.15;
  } else if (player.specializationId === 'rune_monolith') {
    thorns += 65;
    maxHpBonus += 40;
  }

  // Cronomante passive: Energia de Sequência reduces cooldowns up to 40%
  if (player.classId === 'chrono' && player.chronoSequenceStacks > 0) {
    cooldownReduction += player.chronoSequenceStacks * 0.045;
  }

  // Feiticeira do Caos passive: Instability above 70% increases area by +35%
  if (player.classId === 'chaos' && player.chaosInstability >= 70) {
    areaScaleBonus += 0.35;
    damageMult += 0.15;
  }

  const prevMaxHp = player.maxHp;
  const newMaxHp = Math.round(cls.baseStats.maxHp + maxHpBonus);
  player.maxHp = newMaxHp;
  if (newMaxHp > prevMaxHp) {
    player.hp = Math.min(newMaxHp, player.hp + (newMaxHp - prevMaxHp));
  } else {
    player.hp = Math.min(newMaxHp, player.hp);
  }

  const clampedCdr = Math.min(0.68, cooldownReduction);
  player.computed = {
    damage: Math.round(cls.baseStats.baseDamage * damageMult),
    attackInterval: Math.max(0.14, cls.baseStats.attackInterval / attackSpeedMult),
    moveSpeed: cls.baseStats.moveSpeed * moveSpeedMult,
    critChance: Math.min(0.95, cls.baseStats.critChance + critChanceBonus),
    critMultiplier: cls.baseStats.critMultiplier + critDamageBonus,
    projectileCount: 1 + projectileCountBonus,
    pierce: (player.classId === 'rune' ? 2 : 0) + pierceBonus,
    bounce: bounceBonus,
    areaScale: 1 + areaScaleBonus,
    pickupRadius: cls.baseStats.pickupRadius + pickupRadiusBonus,
    cooldownMult: 1 - clampedCdr,
    thorns,
    vampirism: Math.min(0.65, vampirism),
  };

  player.specialMaxCooldown = Math.max(1.0, cls.specialSkill.cooldown * player.computed.cooldownMult);
  player.mobilityMaxCooldown = Math.max(0.9, cls.mobilitySkill.cooldown * player.computed.cooldownMult);
}

export function createInitialRunState(options: {
  classId: ArcanaClassId;
  ascensionLevel?: number;
  isTraining?: boolean;
  isTutorial?: boolean;
  checkpoint?: SavedRunCheckpoint | null;
}): ArcanaRunState {
  const cp = options.checkpoint;
  const classId = cp ? cp.classId : options.classId;
  const cls = ARCANA_CLASSES[classId];
  const campaignIndex = cp ? cp.campaignIndex : 0;
  const campaignDef = ARCANA_CAMPAIGNS[Math.min(campaignIndex, ARCANA_CAMPAIGNS.length - 1)];
  const map = generateCampaignMap(campaignDef.id, Date.now(), {
    isTraining: options.isTraining,
    isTutorial: options.isTutorial,
  });

  const player: PlayerRuntimeState = {
    classId,
    x: map.spawnX,
    y: map.spawnY,
    vx: 0,
    vy: 0,
    facingX: 0,
    facingY: -1,
    aimX: map.spawnX,
    aimY: map.spawnY - 140,
    hp: cp ? cp.playerHp : cls.baseStats.maxHp,
    maxHp: cp ? cp.playerMaxHp : cls.baseStats.maxHp,
    shield: 0,
    level: cp ? cp.playerLevel : 1,
    xp: cp ? cp.playerXp : 0,
    xpToNext: cp ? 60 + (cp.playerLevel - 1) * 35 : 60,
    arcaneFragments: cp ? cp.arcaneFragments : 0,
    primaryTimer: 0,
    specialCooldown: 0,
    specialMaxCooldown: cls.specialSkill.cooldown,
    mobilityCooldown: 0,
    mobilityMaxCooldown: cls.mobilitySkill.cooldown,
    ultimateCharge: options.isTraining ? 100 : 0,
    ultimateMaxCharge: cls.ultimateSkill.chargeRequired,
    iframeTimer: 0,
    dashTimer: 0,
    dashDirX: 0,
    dashDirY: -1,
    animState: 'idle',
    animTime: 0,
    hitFlashTimer: 0,
    chessCoordinationStacks: 0,
    chronoSequenceStacks: 0,
    chaosInstability: 0,
    runeActiveSymbols: [],
    upgrades: cp ? { ...cp.upgrades } : {},
    specializationId: cp ? cp.specializationId : null,
    computed: {
      damage: cls.baseStats.baseDamage,
      attackInterval: cls.baseStats.attackInterval,
      moveSpeed: cls.baseStats.moveSpeed,
      critChance: cls.baseStats.critChance,
      critMultiplier: cls.baseStats.critMultiplier,
      projectileCount: 1,
      pierce: classId === 'rune' ? 2 : 0,
      bounce: 0,
      areaScale: 1,
      pickupRadius: cls.baseStats.pickupRadius,
      cooldownMult: 1,
      thorns: 0,
      vampirism: 0,
    },
  };

  recomputePlayerStats(player);

  const state: ArcanaRunState = {
    runId: nextUid('run'),
    isTrainingArena: Boolean(options.isTraining),
    isTutorial: Boolean(options.isTutorial),
    ascensionLevel: cp ? cp.ascensionLevel : (options.ascensionLevel ?? 0),
    campaignIndex,
    campaignId: campaignDef.id,
    phase: 'A_ARRIVAL',
    elapsedCampaignSec: cp ? cp.elapsedCampaignSec : 0,
    totalRunSec: cp ? cp.totalRunSec : 0,
    kills: cp ? cp.kills : 0,
    elitesDefeated: 0,
    bossesDefeated: cp ? cp.campaignIndex : 0,
    map,
    player,
    coopPartner: null,
    enemies: [],
    boss: null,
    projectiles: [],
    constructs: [],
    telegraphs: [],
    loot: [],
    floatingTexts: [],
    pendingLevelUps: 0,
    currentUpgradeChoices: [],
    activePoiModal: null,
    tutorial: {
      active: Boolean(options.isTutorial),
      stepIndex: 0,
      completedMove: false,
      completedAttack: false,
      completedDodge: false,
      completedTelegraphRead: false,
      completedXpCollect: false,
      completedUpgradePick: false,
      completedPoiInteract: false,
    },
    statusBanner: {
      text: options.isTutorial
        ? 'Santuário de Iniciação Arcana'
        : options.isTraining
          ? 'Arena de Treino Astral'
          : `Campanha ${campaignDef.roman} — ${campaignDef.name}`,
      subtext: options.isTutorial
        ? 'Segue os passos do Grimório para dominar as tuas artes.'
        : campaignDef.subtitle,
      timer: 4.2,
      color: campaignDef.palette.accentRunes,
    },
    screenShake: 0,
    timeScale: 1,
  };

  // Spawn initial wave so the world feels immediately alive
  if (options.isTraining) {
    spawnTrainingDummies(state);
  } else if (options.isTutorial) {
    spawnEnemyNearPlayer(state, 'patroller', false, 290);
    spawnEnemyNearPlayer(state, 'patroller', false, 330);
  } else {
    for (let i = 0; i < 4; i++) {
      spawnEnemyNearPlayer(state, 'patroller', false, 360 + i * 45);
    }
  }

  return state;
}

export function spawnTrainingDummies(state: ArcanaRunState): void {
  const { spawnX, spawnY } = state.map;
  const offsets = [
    { dx: -200, dy: -160, arch: 'patroller' as EnemyArchetypeId },
    { dx: 0, dy: -210, arch: 'shield_warden' as EnemyArchetypeId },
    { dx: 200, dy: -160, arch: 'colossus_elite' as EnemyArchetypeId },
  ];
  for (const o of offsets) {
    const def = ARCANA_ENEMIES[o.arch];
    state.enemies.push({
      id: nextUid('dummy'),
      archetypeId: o.arch,
      name: `Alvo Astral (${def.name})`,
      isElite: o.arch === 'colossus_elite',
      x: spawnX + o.dx,
      y: spawnY + o.dy,
      vx: 0,
      vy: 0,
      facingX: 0,
      facingY: 1,
      hp: 5000,
      maxHp: 5000,
      speed: 0,
      damage: 5,
      radius: def.radius + 4,
      aiState: 'idle' as unknown as ActiveEnemy['aiState'],
      stateTimer: 999,
      attackCooldownTimer: 3.5,
      animState: 'idle',
      animTime: 0,
      hitFlashTimer: 0,
      slowMultiplier: 1,
      slowTimer: 0,
      burnDamage: 0,
      burnTimer: 0,
      shieldAngle: o.arch === 'shield_warden' ? Math.PI * 0.5 : undefined,
    });
  }
}

function addFloatingText(
  state: ArcanaRunState,
  text: string,
  x: number,
  y: number,
  color: string,
  isCrit = false,
  scale = 1,
): void {
  if (state.floatingTexts.length > 55) {
    state.floatingTexts.shift();
  }
  state.floatingTexts.push({
    id: nextUid('fct'),
    text,
    x: x + (Math.random() - 0.5) * 18,
    y: y - 10,
    z: 12,
    vz: isCrit ? 52 : 36,
    color,
    isCrit,
    scale: isCrit ? scale * 1.28 : scale,
    life: isCrit ? 0.95 : 0.72,
    maxLife: isCrit ? 0.95 : 0.72,
  });
}

function hasSpecialFlag(player: PlayerRuntimeState, flag: string): boolean {
  for (const [upId, stacks] of Object.entries(player.upgrades)) {
    if (!stacks || stacks <= 0) continue;
    const def = ARCANA_UPGRADES.find((u) => u.id === upId);
    if (def?.effect.specialMechanicFlag === flag) return true;
  }
  return false;
}

export function draftUpgradeCards(state: ArcanaRunState, count = 3): UpgradeCardDef[] {
  const { player } = state;
  const eligible = ARCANA_UPGRADES.filter((u) => {
    if (u.classRestriction && u.classRestriction !== player.classId) return false;
    const currentStacks = player.upgrades[u.id] ?? 0;
    if (currentStacks >= u.maxStacks) return false;
    // Evolutions & Mythics appear once player is level 3+
    if ((u.category === 'evolution' || u.category === 'mythic') && player.level < 3) return false;
    return true;
  });

  // Weight by rarity + class synergy
  const weighted: Array<{ card: UpgradeCardDef; weight: number }> = eligible.map((card) => {
    let w = 10;
    if (card.rarity === 'common') w = 26;
    else if (card.rarity === 'rare') w = 18;
    else if (card.rarity === 'epic') w = 11;
    else if (card.rarity === 'legendary') w = 6 + player.level;
    else if (card.rarity === 'mythic') w = 4 + Math.floor(player.level * 0.8);

    if (card.classRestriction === player.classId) w *= 1.65;
    return { card, weight: w };
  });

  const picked: UpgradeCardDef[] = [];
  const pool = [...weighted];
  while (picked.length < count && pool.length > 0) {
    const totalW = pool.reduce((acc, item) => acc + item.weight, 0);
    let r = Math.random() * totalW;
    let chosenIdx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }
    picked.push(pool[chosenIdx].card);
    pool.splice(chosenIdx, 1);
  }
  return picked;
}

export function applyUpgradeChoice(state: ArcanaRunState, upgradeId: string): void {
  const card = ARCANA_UPGRADES.find((u) => u.id === upgradeId);
  if (!card) return;
  state.player.upgrades[upgradeId] = (state.player.upgrades[upgradeId] ?? 0) + 1;
  recomputePlayerStats(state.player);

  if (card.effect.maxHpBonus) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + card.effect.maxHpBonus);
  }

  addFloatingText(state, `+ ${card.name}`, state.player.x, state.player.y - 24, '#ffd166', true, 1.1);

  if (state.pendingLevelUps > 0) {
    state.pendingLevelUps--;
  }
  if (state.pendingLevelUps > 0) {
    state.currentUpgradeChoices = draftUpgradeCards(state, 3);
  } else {
    state.currentUpgradeChoices = [];
  }

  if (state.tutorial.active && !state.tutorial.completedUpgradePick) {
    state.tutorial.completedUpgradePick = true;
    if (state.tutorial.stepIndex === 5) state.tutorial.stepIndex = 6;
  }
}

export function selectSpecialization(state: ArcanaRunState, specId: string): void {
  state.player.specializationId = specId;
  recomputePlayerStats(state.player);
  const cls = ARCANA_CLASSES[state.player.classId];
  const spec = cls.specializations.find((s) => s.id === specId);
  if (spec) {
    state.statusBanner = {
      text: `Especialização: ${spec.name}`,
      subtext: spec.subtitle,
      timer: 3.5,
      color: cls.palette.accent,
    };
  }
}

// Smooth Circle-vs-AABB collision with corner sliding so player never gets stuck
function resolveEntityObstacles(
  entity: { x: number; y: number; radius: number },
  obstacles: MapObstacle[],
  mapWidth: number,
  mapHeight: number,
): void {
  const r = entity.radius;
  entity.x = Math.max(60 + r, Math.min(mapWidth - 60 - r, entity.x));
  entity.y = Math.max(60 + r, Math.min(mapHeight - 60 - r, entity.y));

  for (const obs of obstacles) {
    const closestX = Math.max(obs.x, Math.min(entity.x, obs.x + obs.w));
    const closestY = Math.max(obs.y, Math.min(entity.y, obs.y + obs.h));
    const dx = entity.x - closestX;
    const dy = entity.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < r * r) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const push = r - dist;
        entity.x += (dx / dist) * push;
        entity.y += (dy / dist) * push;
      } else {
        // Inside AABB: push out along shortest axis
        const cx = obs.x + obs.w * 0.5;
        const cy = obs.y + obs.h * 0.5;
        const overlapX = obs.w * 0.5 + r - Math.abs(entity.x - cx);
        const overlapY = obs.h * 0.5 + r - Math.abs(entity.y - cy);
        if (overlapX < overlapY) {
          entity.x += entity.x < cx ? -overlapX : overlapX;
        } else {
          entity.y += entity.y < cy ? -overlapY : overlapY;
        }
      }
    }
  }
}

export function spawnEnemyNearPlayer(
  state: ArcanaRunState,
  archetypeId: EnemyArchetypeId,
  isElite = false,
  distance = 440,
): void {
  const def = ARCANA_ENEMIES[archetypeId];
  const angle = Math.random() * Math.PI * 2;
  const rawX = state.player.x + Math.cos(angle) * distance;
  const rawY = state.player.y + Math.sin(angle) * distance;
  const x = Math.max(100, Math.min(state.map.width - 100, rawX));
  const y = Math.max(100, Math.min(state.map.height - 100, rawY));

  const campaignScale = 1 + state.campaignIndex * 0.28 + state.ascensionLevel * 0.16;
  const eliteMult = isElite ? 2.4 : 1;
  const modifiers: ActiveEnemy['eliteModifier'][] = [
    'Vampírico',
    'Tempestuoso',
    'Espelhado',
    'Colossal',
    ' Crono-Acelerado',
  ];

  const hp = Math.round(def.maxHp * campaignScale * eliteMult);
  state.enemies.push({
    id: nextUid('enm'),
    archetypeId,
    name: def.name,
    isElite,
    eliteModifier: isElite ? modifiers[Math.floor(Math.random() * modifiers.length)] : undefined,
    x,
    y,
    vx: 0,
    vy: 0,
    facingX: -Math.cos(angle),
    facingY: -Math.sin(angle),
    hp,
    maxHp: hp,
    speed: def.speed * (1 + state.ascensionLevel * 0.04) * (isElite ? 1.12 : 1),
    damage: Math.round(def.damage * (1 + state.campaignIndex * 0.2 + state.ascensionLevel * 0.12)),
    radius: isElite ? Math.round(def.radius * 1.25) : def.radius,
    aiState: 'chase',
    stateTimer: 0,
    attackCooldownTimer: 0.8 + Math.random() * 0.8,
    animState: 'walk',
    animTime: Math.random() * 5,
    hitFlashTimer: 0,
    slowMultiplier: 1,
    slowTimer: 0,
    burnDamage: 0,
    burnTimer: 0,
    shieldAngle: archetypeId === 'shield_warden' ? Math.atan2(state.player.y - y, state.player.x - x) : undefined,
  });
}

export function spawnCampaignBoss(state: ArcanaRunState, earlyBonus = false): void {
  if (state.boss) return;
  const campaign = getCampaignDef(state.campaignId);
  const bossDef = campaign.boss;
  const ascMult = 1 + state.ascensionLevel * 0.22;
  const maxHp = Math.round(bossDef.maxHp * ascMult);

  const bx = state.map.bossArenaCenter.x;
  const by = state.map.bossArenaCenter.y;

  state.boss = {
    id: nextUid('boss'),
    def: bossDef,
    x: bx,
    y: by,
    vx: 0,
    vy: 0,
    facingX: 0,
    facingY: 1,
    hp: maxHp,
    maxHp,
    currentPhase: 1,
    aiState: 'intro',
    patternIndex: 0,
    stateTimer: 2.2,
    invulnerableTimer: 2.0,
    hitFlashTimer: 0,
    animState: 'cast',
    animTime: 0,
  };

  state.phase = 'E_BOSS';
  state.screenShake = Math.max(state.screenShake, 12);
  state.statusBanner = {
    text: `${bossDef.name}`,
    subtext: earlyBonus
      ? `${bossDef.title} — Desafio Antecipado (+50% Recompensas)`
      : bossDef.title,
    timer: 4.5,
    color: bossDef.palette.danger,
  };
}

function findNearestTarget(
  state: ArcanaRunState,
  fromX: number,
  fromY: number,
  maxRange = 680,
  excludeIds?: Set<string>,
): { x: number; y: number; id: string } | null {
  let best: { x: number; y: number; id: string } | null = null;
  let bestDist = maxRange;

  if (state.boss && state.boss.hp > 0 && !excludeIds?.has(state.boss.id)) {
    const d = Math.hypot(state.boss.x - fromX, state.boss.y - fromY);
    if (d < bestDist) {
      bestDist = d;
      best = { x: state.boss.x, y: state.boss.y, id: state.boss.id };
    }
  }

  for (const enm of state.enemies) {
    if (enm.hp <= 0 || excludeIds?.has(enm.id)) continue;
    const d = Math.hypot(enm.x - fromX, enm.y - fromY);
    if (d < bestDist) {
      bestDist = d;
      best = { x: enm.x, y: enm.y, id: enm.id };
    }
  }

  return best;
}

let primaryShotCounter = 0;
let gambitCycle = 0;

function firePlayerPrimary(state: ArcanaRunState, originX: number, originY: number, baseAngle: number): void {
  const { player } = state;
  const cls = ARCANA_CLASSES[player.classId];
  const count = player.computed.projectileCount;
  const spreadStep = count > 1 ? 0.16 : 0;
  const startAngle = baseAngle - ((count - 1) * spreadStep) / 2;

  primaryShotCounter++;
  const chaosElements: ElementalTag[] = ['fire', 'frost', 'lightning', 'void'];
  const chaosElem = chaosElements[primaryShotCounter % chaosElements.length];

  const isChessQueenEvo = player.classId === 'chess' && hasSpecialFlag(player, 'evo_chess_queen_primary');
  const isChronoBoomerang = player.classId === 'chrono' && hasSpecialFlag(player, 'evo_chrono_boomerang');
  const isChaosOmni = player.classId === 'chaos' && hasSpecialFlag(player, 'evo_chaos_omni_orb');
  const isChaosWildcard =
    player.classId === 'chaos' && hasSpecialFlag(player, 'chaos_fourth_card') && primaryShotCounter % 4 === 0;

  for (let i = 0; i < count; i++) {
    const ang = startAngle + i * spreadStep;
    // Enhanced Long-Range Survivor Speeds & Extended Lifespans (reach 1200 - 1800+ px!)
    const speed = player.classId === 'chrono' ? 780 : player.classId === 'rune' ? 680 : 640;
    let kind: ActiveProjectile['kind'] = 'pawn_lance';
    let element: ElementalTag = cls.primaryAttack.tag;
    let color = cls.palette.glow;
    let radius = 12 * player.computed.areaScale;
    let dmg = player.computed.damage;
    let pierce = player.computed.pierce + 1; // +1 base pierce for survivor horde clearing

    if (player.classId === 'chess') {
      kind = isChessQueenEvo ? 'queen_beam' : 'water_whip';
      color = isChessQueenEvo ? '#ffd166' : '#00f5d4';
      pierce += 2; // Liquid whip slices through crowds
      radius *= 1.3;
      if (isChessQueenEvo) {
        dmg = Math.round(dmg * 1.35);
        radius *= 1.35;
        pierce += 4;
      }
    } else if (player.classId === 'chrono') {
      // Kael's Celestial Fan Gust (Huge sweeping long-range aerodynamic wave)
      kind = 'fan_gale';
      color = '#70e000';
      radius *= 1.6; // Wide sweeping fan arc
      pierce += 4; // Cleaves through entire lines of enemies
      dmg = Math.round(dmg * 1.15);
    } else if (player.classId === 'chaos') {
      // Iskra's Martial Solar Fist (Roaring fiery blast)
      kind = isChaosOmni || isChaosWildcard ? 'chaos_prism' : 'solar_fist';
      element = chaosElem;
      pierce += 2;
      radius *= 1.35;
      color =
        chaosElem === 'fire'
          ? '#ff6b35'
          : chaosElem === 'frost'
            ? '#7df9ff'
            : chaosElem === 'lightning'
              ? '#ffbe0b'
              : '#c77dff';
      if (isChaosWildcard) {
        dmg = Math.round(dmg * 1.75);
        pierce += 6;
        radius *= 1.5;
      }
    } else if (player.classId === 'rune') {
      // Borak's Terracotta Kinetic Rock Block (Heavy crushing block with extreme mass)
      kind = 'terracotta_block';
      color = '#ffd166';
      dmg = Math.round(dmg * 1.45); // Heavy earth impact
      radius *= 1.65;
      pierce += 5; // Crushes through multiple rows of enemies
    }

    state.projectiles.push({
      id: nextUid('prj'),
      owner: 'player',
      kind,
      element,
      x: originX + Math.cos(ang) * 18,
      y: originY + Math.sin(ang) * 18,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      radius,
      damage: dmg,
      pierceLeft: pierce,
      bouncesLeft: player.computed.bounce + (isChronoBoomerang ? 1 : 0),
      life: 2.6, // High range: travels 1600 - 2000px across the entire arena!
      maxLife: 2.6,
      homingStrength: player.classId === 'rune' ? 1.4 : 0.4,
      splitOnHit: hasSpecialFlag(player, 'split_on_hit') || isChessQueenEvo,
      explodeRadius: isChaosOmni || kind === 'solar_fist' ? 75 * player.computed.areaScale : undefined,
      hitEntityIds: new Set(),
      color,
    });
  }

  // Class gauge progression on primary cast
  if (player.classId === 'chaos') {
    player.chaosInstability = Math.min(100, player.chaosInstability + 4.5);
  }
}

function triggerClassSpecial(state: ArcanaRunState, baseAngle: number): void {
  const { player } = state;
  // Survivor Long-Range Reach: from 210 to 450px so skills strike deep into encroaching swarms!
  const targetX = player.x + Math.cos(baseAngle) * 450;
  const targetY = player.y + Math.sin(baseAngle) * 450;

  if (player.classId === 'chess') {
    // Gambito Real: cycles Knight (L-impact), Bishop (X beams), Rook (orthogonal shockwave)
    const pieceIdx = gambitCycle++ % 3;
    const constructKind: ActiveSummonOrConstruct['kind'] =
      pieceIdx === 0 ? 'chess_knight' : pieceIdx === 1 ? 'chess_bishop' : 'chess_rook';

    state.constructs.push({
      id: nextUid('chess'),
      ownerClass: 'chess',
      kind: constructKind,
      x: Math.max(90, Math.min(state.map.width - 90, targetX)),
      y: Math.max(90, Math.min(state.map.height - 90, targetY)),
      vx: 0,
      vy: 0,
      radius: 44 * player.computed.areaScale,
      life: 6.5,
      maxLife: 6.5,
      attackTimer: 0.1,
      attackInterval: 1.15,
      damage: Math.round(player.computed.damage * 1.85),
    });

    // Immediate geometric strike
    if (pieceIdx === 1 || hasSpecialFlag(player, 'chess_double_bishops')) {
      const diagAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
      for (const da of diagAngles) {
        state.projectiles.push({
          id: nextUid('bsh'),
          owner: 'player',
          kind: 'bishop_diagonal',
          element: 'spectral',
          x: targetX,
          y: targetY,
          vx: Math.cos(da) * 740,
          vy: Math.sin(da) * 740,
          radius: 16 * player.computed.areaScale,
          damage: Math.round(player.computed.damage * 1.8),
          pierceLeft: 12,
          bouncesLeft: 1,
          life: 2.2,
          maxLife: 2.2,
          homingStrength: 0,
          hitEntityIds: new Set(),
          color: '#ffd166',
        });
      }
    } else if (pieceIdx === 2) {
      const orthoAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      for (const oa of orthoAngles) {
        state.projectiles.push({
          id: nextUid('rok'),
          owner: 'player',
          kind: 'rook_column',
          element: 'spectral',
          x: targetX,
          y: targetY,
          vx: Math.cos(oa) * 720,
          vy: Math.sin(oa) * 720,
          radius: 20 * player.computed.areaScale,
          damage: Math.round(player.computed.damage * 1.9),
          pierceLeft: 14,
          bouncesLeft: 0,
          life: 2.2,
          maxLife: 2.2,
          homingStrength: 0,
          hitEntityIds: new Set(),
          color: '#7de2ff',
        });
      }
    } else {
      // Knight L-Impact AoE
      dealPlayerAreaDamage(
        state,
        targetX,
        targetY,
        125 * player.computed.areaScale,
        Math.round(player.computed.damage * 2.4),
        'spectral',
      );
    }

    // Passive: Maré Cheia (aos 10 acúmulos, a maré desperta em erupção coordenada)
    if (player.chessCoordinationStacks >= 10) {
      player.chessCoordinationStacks = 0;
      addFloatingText(state, 'MARÉ CHEIA!', player.x, player.y - 36, '#ffd166', true, 1.25);
      for (const c of state.constructs) {
        if (c.ownerClass === 'chess') {
          dealPlayerAreaDamage(
            state,
            c.x,
            c.y,
            135 * player.computed.areaScale,
            Math.round(player.computed.damage * 2.2),
            'spectral',
          );
        }
      }
    }
  } else if (player.classId === 'chrono') {
    // Voo do Bastão Planador & Múltiplos Tornados Devastadores (Limpeza em Massa de Hordas)
    const twin = hasSpecialFlag(player, 'chrono_twin_echoes') || player.specializationId === 'chrono_echoes';
    const tornadoCount = twin ? 6 : 4;
    for (let i = 0; i < tornadoCount; i++) {
      const spread = (i - (tornadoCount - 1) * 0.5) * 0.25;
      const tAng = baseAngle + spread;
      state.projectiles.push({
        id: nextUid('tor'),
        owner: 'player',
        kind: 'fan_gale',
        element: 'temporal',
        x: player.x + Math.cos(tAng) * 35,
        y: player.y + Math.sin(tAng) * 35,
        vx: Math.cos(tAng) * 620,
        vy: Math.sin(tAng) * 620,
        radius: 34 * player.computed.areaScale,
        damage: Math.round(player.computed.damage * 1.85),
        pierceLeft: 25, // Shreds through massive horde swarms!
        bouncesLeft: 1,
        life: 3.4,
        maxLife: 3.4,
        homingStrength: 0.5,
        hitEntityIds: new Set(),
        color: '#80ffdb',
      });
    }

    // Also spawn a gliding wind echo that follows and spams gale slashes
    state.constructs.push({
      id: nextUid('echo'),
      ownerClass: 'chrono',
      kind: 'chrono_echo',
      x: player.x + Math.cos(baseAngle) * 55,
      y: player.y + Math.sin(baseAngle) * 55,
      vx: 0,
      vy: 0,
      radius: 32,
      life: 5.5,
      maxLife: 5.5,
      attackTimer: 0.1,
      attackInterval: player.computed.attackInterval * 0.65,
      damage: player.computed.damage,
    });
    player.chronoSequenceStacks = Math.min(8, player.chronoSequenceStacks + 2);
    recomputePlayerStats(player);
  } else if (player.classId === 'chaos') {
    // Roda dos Quatro Fogos: invoca cataclismos elementais
    const rolls = hasSpecialFlag(player, 'chaos_double_roulette') ? 2 : 1;
    const variants: Array<{ name: string; elem: ElementalTag; color: string }> = [
      { name: 'Chuva de Brasas', elem: 'fire', color: '#ff6b35' },
      { name: 'Nova da Chama Azul', elem: 'frost', color: '#00bbf9' },
      { name: 'Relâmpago em Cadeia', elem: 'lightning', color: '#ffbe0b' },
      { name: 'Vórtice do Sol Negro', elem: 'void', color: '#c77dff' },
    ];
    for (let r = 0; r < rolls; r++) {
      const pick = variants[Math.floor(Math.random() * variants.length)];
      addFloatingText(state, `🔥 ${pick.name}!`, player.x, player.y - 32 - r * 18, pick.color, true, 1.15);
      dealPlayerAreaDamage(
        state,
        targetX,
        targetY,
        165 * player.computed.areaScale,
        Math.round(player.computed.damage * 2.6),
        pick.elem,
      );
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + r * 0.4;
        state.projectiles.push({
          id: nextUid('ch_sp'),
          owner: 'player',
          kind: 'chaos_prism',
          element: pick.elem,
          x: targetX,
          y: targetY,
          vx: Math.cos(a) * 620,
          vy: Math.sin(a) * 620,
          radius: 15 * player.computed.areaScale,
          damage: Math.round(player.computed.damage * 1.65),
          pierceLeft: 6,
          bouncesLeft: 2,
          life: 2.2,
          maxLife: 2.2,
          homingStrength: 1.5,
          hitEntityIds: new Set(),
          color: pick.color,
        });
      }
    }
    player.chaosInstability = Math.min(100, player.chaosInstability + 22);
  } else if (player.classId === 'rune') {
    // Inscrever Runa: places spatial rune(s) that connect with laser beams
    const symbols: Array<'IGNIS' | 'GLACIES' | 'FULGUR'> = ['IGNIS', 'GLACIES', 'FULGUR'];
    const sym = symbols[player.runeActiveSymbols.length % symbols.length];
    const isTriad = hasSpecialFlag(player, 'rune_triad_placement');
    const placements = isTriad
      ? [
          { x: targetX, y: targetY, sym },
          { x: targetX - 95, y: targetY + 75, sym: 'GLACIES' as const },
          { x: targetX + 95, y: targetY + 75, sym: 'FULGUR' as const },
        ]
      : [{ x: targetX, y: targetY, sym }];

    for (const p of placements) {
      const kind: ActiveSummonOrConstruct['kind'] =
        p.sym === 'IGNIS'
          ? 'rune_circle_fire'
          : p.sym === 'GLACIES'
            ? 'rune_circle_frost'
            : 'rune_circle_volt';
      state.constructs.push({
        id: nextUid('rune'),
        ownerClass: 'rune',
        kind,
        x: Math.max(90, Math.min(state.map.width - 90, p.x)),
        y: Math.max(90, Math.min(state.map.height - 90, p.y)),
        vx: 0,
        vy: 0,
        radius: 48 * player.computed.areaScale,
        life: 9.0,
        maxLife: 9.0,
        attackTimer: 0.2,
        attackInterval: 0.75,
        damage: Math.round(player.computed.damage * 1.35),
        symbolTag: p.sym,
      });
    }

    player.runeActiveSymbols.push(sym);
    if (player.runeActiveSymbols.length >= 3) {
      // Ressonância Sísmica dos Três Monólitos
      player.runeActiveSymbols = [];
      addFloatingText(state, '⚡ ABALO SÍSMICO!', player.x, player.y - 36, '#80ffdb', true, 1.25);
      dealPlayerAreaDamage(
        state,
        targetX,
        targetY,
        195 * player.computed.areaScale,
        Math.round(player.computed.damage * 2.9),
        'runic',
      );
    }
  }
}

function triggerClassUltimate(state: ArcanaRunState): void {
  const { player } = state;
  const cls = ARCANA_CLASSES[player.classId];
  player.ultimateCharge = 0;
  player.iframeTimer = Math.max(player.iframeTimer, 1.5);
  state.screenShake = Math.max(state.screenShake, 16);

  state.statusBanner = {
    text: `${cls.ultimateSkill.name}!`,
    subtext: cls.title,
    timer: 3.0,
    color: cls.palette.accent,
  };

  if (player.classId === 'chess') {
    // Xeque-Mate Imperial: spawns Spectral Queen + devastating cross-board shockwave
    state.constructs.push({
      id: nextUid('queen'),
      ownerClass: 'chess',
      kind: 'chess_queen',
      x: player.x,
      y: player.y - 70,
      vx: 0,
      vy: 0,
      radius: 68 * player.computed.areaScale,
      life: 9.0,
      maxLife: 9.0,
      attackTimer: 0.1,
      attackInterval: 0.65,
      damage: Math.round(player.computed.damage * 2.5),
    });
    dealPlayerAreaDamage(state, player.x, player.y, 380, Math.round(player.computed.damage * 5.2), 'spectral');
  } else if (player.classId === 'chrono') {
    // Convergência das Eras: freezes all enemies for 4s + spawns 3 Temporal Echoes
    for (const enm of state.enemies) {
      enm.slowMultiplier = 0.05;
      enm.slowTimer = 4.5;
    }
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      state.constructs.push({
        id: nextUid('echo_ult'),
        ownerClass: 'chrono',
        kind: 'chrono_echo',
        x: player.x + Math.cos(ang) * 95,
        y: player.y + Math.sin(ang) * 95,
        vx: 0,
        vy: 0,
        radius: 32,
        life: 6.0,
        maxLife: 6.0,
        attackTimer: 0.05,
        attackInterval: player.computed.attackInterval * 0.55,
        damage: Math.round(player.computed.damage * 1.4),
      });
    }
    dealPlayerAreaDamage(state, player.x, player.y, 360, Math.round(player.computed.damage * 4.4), 'temporal');
  } else if (player.classId === 'chaos') {
    // Carnaval Arcano: spawns Chaos Totem + 16 prismatic projectiles + massive blast
    state.constructs.push({
      id: nextUid('carnival'),
      ownerClass: 'chaos',
      kind: 'chaos_totem',
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 65,
      life: 6.5,
      maxLife: 6.5,
      attackTimer: 0.1,
      attackInterval: 0.4,
      damage: Math.round(player.computed.damage * 1.9),
    });
    dealPlayerAreaDamage(state, player.x, player.y, 380, Math.round(player.computed.damage * 5.0), 'chaos');
  } else if (player.classId === 'rune') {
    // A Grande Inscrição: arena-wide mandala + connects all runes
    state.constructs.push({
      id: nextUid('mandala'),
      ownerClass: 'rune',
      kind: 'rune_great_inscription',
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: 260 * player.computed.areaScale,
      life: 7.5,
      maxLife: 7.5,
      attackTimer: 0.1,
      attackInterval: 0.55,
      damage: Math.round(player.computed.damage * 2.2),
      symbolTag: 'AETHER',
    });
    dealPlayerAreaDamage(state, player.x, player.y, 400, Math.round(player.computed.damage * 5.0), 'runic');
  }
}

function dealPlayerAreaDamage(
  state: ArcanaRunState,
  cx: number,
  cy: number,
  radius: number,
  baseDamage: number,
  element: ElementalTag,
): void {
  for (const enm of state.enemies) {
    if (enm.hp <= 0) continue;
    const d = Math.hypot(enm.x - cx, enm.y - cy);
    if (d <= radius + enm.radius) {
      applyDamageToEnemy(state, enm, baseDamage, element, cx, cy);
    }
  }
  if (state.boss && state.boss.hp > 0) {
    const d = Math.hypot(state.boss.x - cx, state.boss.y - cy);
    if (d <= radius + state.boss.def.radius) {
      applyDamageToBoss(state, state.boss, baseDamage, element);
    }
  }
}

function applyDamageToEnemy(
  state: ArcanaRunState,
  enm: ActiveEnemy,
  rawDamage: number,
  element: ElementalTag,
  sourceX: number,
  sourceY: number,
): void {
  const { player } = state;
  let dmg = rawDamage;

  // Directional shield reduction for shield_warden
  if (enm.archetypeId === 'shield_warden' && enm.shieldAngle !== undefined) {
    const incomingAngle = Math.atan2(sourceY - enm.y, sourceX - enm.x);
    let diff = Math.abs(incomingAngle - enm.shieldAngle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < Math.PI * 0.42) {
      dmg = Math.max(1, Math.round(dmg * 0.35));
    }
  }

  const isCrit = Math.random() < player.computed.critChance;
  if (isCrit) {
    dmg = Math.round(dmg * player.computed.critMultiplier);
    if (player.computed.vampirism > 0 && Math.random() < player.computed.vampirism) {
      player.hp = Math.min(player.maxHp, player.hp + 3);
    }
    if (hasSpecialFlag(player, 'chrono_cdr_on_crit')) {
      player.specialCooldown = Math.max(0, player.specialCooldown - 0.25);
    }
  }

  enm.hp -= dmg;
  enm.hitFlashTimer = 0.14;

  // Elemental & class status effects
  if (element === 'temporal' || element === 'frost' || hasSpecialFlag(player, 'chill_on_hit')) {
    enm.slowMultiplier = 0.6;
    enm.slowTimer = 2.8;
  }
  if (element === 'fire' || hasSpecialFlag(player, 'burn_on_hit')) {
    enm.burnDamage = Math.max(enm.burnDamage, Math.round(player.computed.damage * 0.35));
    enm.burnTimer = 3.0;
  }
  if (player.classId === 'chess') {
    player.chessCoordinationStacks = Math.min(10, player.chessCoordinationStacks + 1);
  }

  const ultGain = hasSpecialFlag(player, 'fast_ultimate') ? 1.8 : 1.3;
  player.ultimateCharge = Math.min(player.ultimateMaxCharge, player.ultimateCharge + ultGain);

  addFloatingText(
    state,
    `${dmg}${isCrit ? '!' : ''}`,
    enm.x,
    enm.y - enm.radius,
    isCrit ? '#ffd166' : '#ffffff',
    isCrit,
  );

  // Dummy reset in training arena
  if (state.isTrainingArena && enm.hp <= 100) {
    enm.hp = enm.maxHp;
  }
}

function applyDamageToBoss(
  state: ArcanaRunState,
  boss: ActiveBoss,
  rawDamage: number,
  _element: ElementalTag,
): void {
  if (boss.invulnerableTimer > 0 || boss.hp <= 0) return;
  const { player } = state;
  const isCrit = Math.random() < player.computed.critChance;
  const dmg = isCrit ? Math.round(rawDamage * player.computed.critMultiplier) : rawDamage;

  boss.hp = Math.max(0, boss.hp - dmg);
  boss.hitFlashTimer = 0.12;
  player.ultimateCharge = Math.min(player.ultimateMaxCharge, player.ultimateCharge + 1.5);

  addFloatingText(
    state,
    `${dmg}${isCrit ? '!' : ''}`,
    boss.x,
    boss.y - boss.def.radius,
    isCrit ? '#ffd166' : '#ff9ebb',
    isCrit,
  );

  // Check phase transitions
  const hpRatio = boss.hp / boss.maxHp;
  for (const phaseDef of boss.def.phases) {
    if (phaseDef.phaseIndex > boss.currentPhase && hpRatio <= phaseDef.hpThreshold && boss.hp > 0) {
      boss.currentPhase = phaseDef.phaseIndex;
      boss.aiState = 'phase_transition';
      boss.stateTimer = 1.6;
      boss.invulnerableTimer = 1.4;
      state.screenShake = Math.max(state.screenShake, 14);
      state.statusBanner = {
        text: phaseDef.title,
        subtext: phaseDef.description,
        timer: 3.4,
        color: boss.def.palette.glow,
      };
      break;
    }
  }
}

function applyDamageToPlayer(state: ArcanaRunState, rawDamage: number): void {
  const { player } = state;
  if (player.iframeTimer > 0 || player.dashTimer > 0 || player.hp <= 0) return;

  let dmg = rawDamage;
  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, dmg);
    player.shield -= absorbed;
    dmg -= absorbed;
  }

  if (dmg > 0) {
    player.hp = Math.max(0, player.hp - dmg);
    player.iframeTimer = 0.55;
    player.hitFlashTimer = 0.22;
    state.screenShake = Math.max(state.screenShake, 7);
    addFloatingText(state, `-${dmg}`, player.x, player.y - 26, '#ff4d6d', true);
  }

  if (player.computed.thorns > 0) {
    dealPlayerAreaDamage(state, player.x, player.y, 130, player.computed.thorns, 'spectral');
  }
}

export function interactWithPoi(
  state: ArcanaRunState,
  poiId: string,
  _optionIndex = 0,
): string {
  const poi = state.map.pois.find((p) => p.id === poiId);
  if (!poi || poi.used) return 'Já utilizado.';

  const { player } = state;
  poi.used = true;
  state.activePoiModal = null;

  if (state.tutorial.active && !state.tutorial.completedPoiInteract) {
    state.tutorial.completedPoiInteract = true;
    state.tutorial.stepIndex = 7;
  }

  switch (poi.type) {
    case 'healing_sanctuary': {
      const mult = state.ascensionLevel >= 4 ? 0.4 : 0.55;
      const heal = Math.round(player.maxHp * mult);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      addFloatingText(state, `+${heal} VIDA`, player.x, player.y - 30, '#06d6a0', true, 1.2);
      return `Santuário restaurou ${heal} de Vida!`;
    }
    case 'forbidden_library': {
      state.pendingLevelUps++;
      if (state.currentUpgradeChoices.length === 0) {
        state.currentUpgradeChoices = draftUpgradeCards(state, 3);
      }
      return 'O Grimório Proibido revelou 3 novos conhecimentos!';
    }
    case 'transmutation_altar': {
      const sacrifice = Math.max(1, Math.floor(player.hp * 0.22));
      player.hp = Math.max(1, player.hp - sacrifice);
      player.arcaneFragments += 45;
      state.pendingLevelUps++;
      if (state.currentUpgradeChoices.length === 0) {
        state.currentUpgradeChoices = draftUpgradeCards(state, 3);
      }
      return `Sacrificaste ${sacrifice} de Vida por poder ancestral e +45 Fragmentos!`;
    }
    case 'mirror_possibilities': {
      const ownedIds = Object.keys(player.upgrades).filter((id) => player.upgrades[id] > 0);
      if (ownedIds.length > 0) {
        const pickId = ownedIds[Math.floor(Math.random() * ownedIds.length)];
        player.upgrades[pickId]++;
        recomputePlayerStats(player);
        const card = ARCANA_UPGRADES.find((u) => u.id === pickId);
        return `Espelho duplicou: ${card?.name ?? pickId}!`;
      }
      player.arcaneFragments += 40;
      return 'O Espelho concedeu +40 Fragmentos Arcanos!';
    }
    case 'wandering_merchant': {
      const cost = poi.costFragments ?? 35;
      if (player.arcaneFragments >= cost) {
        player.arcaneFragments -= cost;
      }
      const relics = ARCANA_UPGRADES.filter((u) => u.category === 'relic');
      const chosen = relics[Math.floor(Math.random() * relics.length)];
      if (chosen) {
        player.upgrades[chosen.id] = (player.upgrades[chosen.id] ?? 0) + 1;
        recomputePlayerStats(player);
        return `Adquiriste ${chosen.name}!`;
      }
      return 'Negócio concluído com o Mercador!';
    }
    case 'unstable_ritual': {
      poi.used = false;
      poi.activeTimer = 15;
      for (let i = 0; i < 4; i++) {
        spawnEnemyNearPlayer(state, 'charger', i === 0, 280);
      }
      return 'Ritual Instável iniciado! Permanece na zona por 15s!';
    }
    case 'arcane_anomaly': {
      player.arcaneFragments += 60;
      player.ultimateCharge = player.ultimateMaxCharge;
      player.xp += 55;
      return 'Anomalia absorvida: Ultimate 100% carregado e +60 Fragmentos!';
    }
    case 'early_boss_beacon': {
      player.arcaneFragments += 75;
      spawnCampaignBoss(state, true);
      return 'O Guardião foi invocado antecipadamente!';
    }
  }
}

export function advanceToNextCampaign(state: ArcanaRunState): void {
  state.campaignIndex++;
  const nextDef =
    state.campaignIndex < 5
      ? ARCANA_CAMPAIGNS[state.campaignIndex]
      : ARCANA_CAMPAIGNS.find((c) => c.id === 'infinite') ?? ARCANA_CAMPAIGNS[0];

  state.campaignId = nextDef.id;
  state.phase = 'A_ARRIVAL';
  state.elapsedCampaignSec = 0;
  state.boss = null;
  state.enemies = [];
  state.projectiles = [];
  state.constructs = [];
  state.telegraphs = [];
  state.loot = [];
  state.map = generateCampaignMap(nextDef.id, Date.now() + state.campaignIndex * 997);

  state.player.x = state.map.spawnX;
  state.player.y = state.map.spawnY;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + Math.round(state.player.maxHp * 0.35));

  state.statusBanner = {
    text: `Campanha ${nextDef.roman} — ${nextDef.name}`,
    subtext: nextDef.subtitle,
    timer: 4.2,
    color: nextDef.palette.accentRunes,
  };

  for (let i = 0; i < 5; i++) {
    const pool = nextDef.enemyPool;
    const arch = pool[i % pool.length];
    spawnEnemyNearPlayer(state, arch, false, 360 + i * 45);
  }
}

export function stepArcanaSimulation(
  state: ArcanaRunState,
  input: ArcanaInputState,
  rawDt: number,
  callbacks?: {
    onSfx?: (sfx: string) => void;
    onLevelUp?: () => void;
    onBossSpawn?: () => void;
    onCampaignComplete?: (campaignId: CampaignId) => void;
    onRunEnd?: (victory: boolean) => void;
    onDiscovery?: (kind: 'upgrade' | 'enemy' | 'boss' | 'biome', id: string) => void;
  },
): void {
  const dt = Math.min(0.05, rawDt) * state.timeScale;
  if (dt <= 0) return;

  // Pause simulation while choosing level-up cards
  if (state.currentUpgradeChoices.length > 0) return;

  const { player } = state;
  if (player.hp <= 0) return;

  state.elapsedCampaignSec += dt;
  state.totalRunSec += dt;

  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - dt * 28);
  }
  if (state.statusBanner) {
    state.statusBanner.timer -= dt;
    if (state.statusBanner.timer <= 0) state.statusBanner = null;
  }

  // Cooldowns & timers
  player.primaryTimer = Math.max(0, player.primaryTimer - dt);
  player.specialCooldown = Math.max(0, player.specialCooldown - dt);
  player.mobilityCooldown = Math.max(0, player.mobilityCooldown - dt);
  player.iframeTimer = Math.max(0, player.iframeTimer - dt);
  player.hitFlashTimer = Math.max(0, player.hitFlashTimer - dt);
  player.animTime += dt;

  // Chaos instability natural decay & 100% Chaos Surge trigger
  if (player.classId === 'chaos') {
    if (player.chaosInstability >= 100) {
      player.chaosInstability = 35;
      addFloatingText(state, '☀️ DETONAÇÃO SOLAR!', player.x, player.y - 38, '#ff4ecd', true, 1.3);
      dealPlayerAreaDamage(
        state,
        player.x,
        player.y,
        210 * player.computed.areaScale,
        Math.round(player.computed.damage * 3.0),
        'chaos',
      );
      callbacks?.onSfx?.('special');
    } else if (player.chaosInstability > 0) {
      player.chaosInstability = Math.max(0, player.chaosInstability - dt * 2.2);
    }
  }

  // Mythic Heaven Pillar every 6s
  if (hasSpecialFlag(player, 'mythic_heaven_pillar')) {
    const prevTick = Math.floor((state.totalRunSec - dt) / 6);
    const currTick = Math.floor(state.totalRunSec / 6);
    if (currTick > prevTick) {
      const target = findNearestTarget(state, player.x, player.y, 600);
      const px = target ? target.x : player.x;
      const py = target ? target.y : player.y;
      dealPlayerAreaDamage(state, px, py, 160, Math.round(player.computed.damage * 2.8), 'lightning');
      player.hp = Math.min(player.maxHp, player.hp + 8);
    }
  }

  // 1. Mobility / Dash handling with 0.35s Input Buffer
  if (input.mobilityPressed) {
    player.mobilityBufferTimer = 0.35;
  }
  if (player.mobilityBufferTimer && player.mobilityBufferTimer > 0) {
    player.mobilityBufferTimer -= dt;
    if (player.mobilityCooldown <= 0 && player.dashTimer <= 0) {
      player.mobilityBufferTimer = 0;
      player.mobilityCooldown = player.mobilityMaxCooldown;
      player.dashTimer = 0.24;
      player.iframeTimer = 0.34;
      const moveLen = Math.hypot(input.moveX, input.moveY);
      player.dashDirX = moveLen > 0.1 ? input.moveX / moveLen : player.facingX;
      player.dashDirY = moveLen > 0.1 ? input.moveY / moveLen : player.facingY;
      player.animState = 'dash';
      callbacks?.onSfx?.('dash');

      if (state.tutorial.active && !state.tutorial.completedDodge) {
        state.tutorial.completedDodge = true;
        if (state.tutorial.stepIndex === 2) state.tutorial.stepIndex = 3;
      }

    // Class-specific mobility effects
    if (player.classId === 'chess' && hasSpecialFlag(player, 'chess_rook_on_dash')) {
      state.constructs.push({
        id: nextUid('rook_dash'),
        ownerClass: 'chess',
        kind: 'chess_rook',
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 42,
        life: 5.0,
        maxLife: 5.0,
        attackTimer: 0.1,
        attackInterval: 1.2,
        damage: Math.round(player.computed.damage * 1.5),
      });
    } else if (player.classId === 'chrono') {
      state.constructs.push({
        id: nextUid('dome'),
        ownerClass: 'chrono',
        kind: 'chrono_dome',
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 95 * player.computed.areaScale,
        life: 4.0,
        maxLife: 4.0,
        attackTimer: 0.2,
        attackInterval: 0.5,
        damage: Math.round(player.computed.damage * 0.6),
      });
      player.chronoSequenceStacks = Math.min(8, player.chronoSequenceStacks + 1);
    } else if (player.classId === 'chaos') {
      state.constructs.push({
        id: nextUid('decoy'),
        ownerClass: 'chaos',
        kind: 'chaos_totem',
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: 45,
        life: 2.5,
        maxLife: 2.5,
        attackTimer: 0.2,
        attackInterval: 0.8,
        damage: Math.round(player.computed.damage * 1.4),
      });
      player.chaosInstability = Math.min(100, player.chaosInstability + 15);
    } else if (player.classId === 'rune' && hasSpecialFlag(player, 'rune_pulse_on_dash')) {
      for (const c of state.constructs) {
        if (c.ownerClass === 'rune') {
          dealPlayerAreaDamage(state, c.x, c.y, 110, Math.round(player.computed.damage * 1.5), 'runic');
        }
      }
    }
    }
  }

  // 2. Player Movement & Smooth Acceleration / Obstacle Sliding
  const isPerformingCast =
    player.specialCooldown > player.specialMaxCooldown - 0.38 &&
    player.specialMaxCooldown - player.specialCooldown > 0;
  const isPerformingAttack =
    player.primaryTimer > Math.max(0.05, player.computed.attackInterval - 0.26) &&
    player.computed.attackInterval - player.primaryTimer > 0;

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    const dashSpeed = player.computed.moveSpeed * 2.85;
    player.vx = player.dashDirX * dashSpeed;
    player.vy = player.dashDirY * dashSpeed;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.animState = 'dash';
    if (player.dashTimer <= 0 && player.classId === 'chess') {
      // Surf na Onda landing impact
      dealPlayerAreaDamage(
        state,
        player.x,
        player.y,
        95 * player.computed.areaScale,
        Math.round(player.computed.damage * 1.65),
        'spectral',
      );
      if (hasSpecialFlag(player, 'chess_en_passant')) {
        player.chessCoordinationStacks = Math.min(10, player.chessCoordinationStacks + 5);
      }
    }
  } else {
    const moveMag = Math.hypot(input.moveX, input.moveY);
    const accelLerp = Math.min(1, dt * 18);
    if (moveMag > 0.05) {
      const nx = input.moveX / Math.max(1, moveMag);
      const ny = input.moveY / Math.max(1, moveMag);
      const targetVx = nx * player.computed.moveSpeed;
      const targetVy = ny * player.computed.moveSpeed;
      player.vx += (targetVx - player.vx) * accelLerp;
      player.vy += (targetVy - player.vy) * accelLerp;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.facingX += (nx - player.facingX) * Math.min(1, dt * 16);
      player.facingY += (ny - player.facingY) * Math.min(1, dt * 16);
      if (!isPerformingCast && !isPerformingAttack) {
        player.animState = 'walk';
      }

      if (state.tutorial.active && !state.tutorial.completedMove) {
        state.tutorial.completedMove = true;
        if (state.tutorial.stepIndex === 0) state.tutorial.stepIndex = 1;
      }
    } else {
      player.vx *= Math.max(0, 1 - dt * 16);
      player.vy *= Math.max(0, 1 - dt * 16);
      if (Math.hypot(player.vx, player.vy) < 4) {
        player.vx = 0;
        player.vy = 0;
      } else {
        player.x += player.vx * dt;
        player.y += player.vy * dt;
      }
      if (!isPerformingCast && !isPerformingAttack) {
        player.animState = 'idle';
      }
    }
  }

  const playerBody = { x: player.x, y: player.y, radius: 18 };
  resolveEntityObstacles(playerBody, state.map.obstacles, state.map.width, state.map.height);
  player.x = playerBody.x;
  player.y = playerBody.y;

  // Determine aim angle (explicit cursor aim or nearest enemy auto-target)
  let aimAngle = Math.atan2(player.facingY, player.facingX);
  if (input.isAiming) {
    aimAngle = Math.atan2(input.aimY - player.y, input.aimX - player.x);
    player.aimX = input.aimX;
    player.aimY = input.aimY;
  } else {
    const nearest = findNearestTarget(state, player.x, player.y, 640);
    if (nearest) {
      aimAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      player.aimX = nearest.x;
      player.aimY = nearest.y;
    }
  }

  // 3. Primary Attack, Special Skill & Ultimate Skill
  const hasVisibleTargets = state.enemies.length > 0 || state.boss !== null;
  const wantsPrimary = input.primaryHeld || (input.autoAttackEnabled && hasVisibleTargets);
  if (wantsPrimary && player.primaryTimer <= 0) {
    player.primaryTimer = player.computed.attackInterval;
    player.animState = 'attack';
    // Turn smoothly toward aim angle when striking
    player.facingX = Math.cos(aimAngle);
    player.facingY = Math.sin(aimAngle);
    firePlayerPrimary(state, player.x, player.y, aimAngle);
    callbacks?.onSfx?.('attack');

    if (state.tutorial.active && !state.tutorial.completedAttack) {
      state.tutorial.completedAttack = true;
      if (state.tutorial.stepIndex === 1) state.tutorial.stepIndex = 2;
    }
  }

  // Special skill with 0.35s Input Buffer & auto-target
  if (input.specialPressed) {
    player.specialBufferTimer = 0.35;
  }
  if (player.specialBufferTimer && player.specialBufferTimer > 0) {
    player.specialBufferTimer -= dt;
    if (player.specialCooldown <= 0) {
      player.specialBufferTimer = 0;
      player.specialCooldown = player.specialMaxCooldown;
      player.animState = 'cast';

      // Auto-target nearest enemy if not manually aiming with mouse cursor
      if (!input.isAiming) {
        const target = findNearestTarget(state, player.x, player.y, 700);
        if (target) {
          aimAngle = Math.atan2(target.y - player.y, target.x - player.x);
        }
      }

      player.facingX = Math.cos(aimAngle);
      player.facingY = Math.sin(aimAngle);
      triggerClassSpecial(state, aimAngle);
      if (hasSpecialFlag(player, 'mythic_double_special')) {
        triggerClassSpecial(state, aimAngle + 0.22);
      }
      callbacks?.onSfx?.('special');

      if (state.tutorial.active && !state.tutorial.completedAttack) {
        state.tutorial.completedAttack = true;
        if (state.tutorial.stepIndex === 1) state.tutorial.stepIndex = 2;
      }
    }
  }

  // Ultimate skill with 0.35s Input Buffer
  if (input.ultimatePressed) {
    player.ultimateBufferTimer = 0.35;
  }
  if (player.ultimateBufferTimer && player.ultimateBufferTimer > 0) {
    player.ultimateBufferTimer -= dt;
    if (player.ultimateCharge >= player.ultimateMaxCharge) {
      player.ultimateBufferTimer = 0;
      triggerClassUltimate(state);
      callbacks?.onSfx?.('ultimate');
    }
  }

  // 4. Interactive POIs & Secret Areas check
  for (const sec of state.map.secretAreas) {
    if (!sec.discovered && Math.hypot(player.x - sec.x, player.y - sec.y) <= sec.radius) {
      sec.discovered = true;
      player.arcaneFragments += sec.rewardFragments;
      player.xp += 45;
      addFloatingText(state, `SEGREDO DESCOBERTO! +${sec.rewardFragments} Frag`, sec.x, sec.y, '#ffd166', true, 1.25);
      callbacks?.onSfx?.('levelup');
    }
  }

  let closestPoi: MapPoiInstance | null = null;
  for (const poi of state.map.pois) {
    if (poi.activeTimer !== undefined && poi.activeTimer > 0) {
      const inside = Math.hypot(player.x - poi.x, player.y - poi.y) <= poi.radius + 35;
      if (inside) {
        poi.activeTimer -= dt;
        if (poi.activeTimer <= 0) {
          poi.activeTimer = undefined;
          poi.used = true;
          player.arcaneFragments += 65;
          state.pendingLevelUps++;
          if (state.currentUpgradeChoices.length === 0) {
            state.currentUpgradeChoices = draftUpgradeCards(state, 3);
          }
          addFloatingText(state, 'RITUAL CONCLUÍDO!', poi.x, poi.y - 30, '#ffd166', true, 1.3);
        }
      }
    }

    if (!poi.used && poi.activeTimer === undefined) {
      const d = Math.hypot(player.x - poi.x, player.y - poi.y);
      if (d <= poi.radius + 32) {
        closestPoi = poi;
        if (input.interactPressed) {
          interactWithPoi(state, poi.id);
          callbacks?.onSfx?.('interact');
        }
      }
    }
  }
  state.activePoiModal = closestPoi;

  // 5. Update Summons & Constructs (Chess Pieces, Chrono Echoes, Runes, Totems)
  const runeConstructs: ActiveSummonOrConstruct[] = [];
  for (let i = state.constructs.length - 1; i >= 0; i--) {
    const c = state.constructs[i];
    c.life -= dt;
    if (c.life <= 0) {
      if (c.kind === 'chrono_dome' && hasSpecialFlag(player, 'chrono_exploding_dome')) {
        dealPlayerAreaDamage(state, c.x, c.y, c.radius * 1.4, Math.round(player.computed.damage * 2.2), 'temporal');
      }
      state.constructs.splice(i, 1);
      continue;
    }

    // Orbiting rune constellation evolution
    if (c.ownerClass === 'rune' && hasSpecialFlag(player, 'evo_rune_orbiting_network')) {
      const ang = state.totalRunSec * 1.6 + i * ((Math.PI * 2) / 3);
      c.x = player.x + Math.cos(ang) * 115;
      c.y = player.y + Math.sin(ang) * 115;
    }

    if (c.kind.startsWith('rune_circle')) {
      runeConstructs.push(c);
    }

    c.attackTimer -= dt;
    if (c.attackTimer <= 0) {
      c.attackTimer = c.attackInterval;
      if (c.kind === 'chrono_echo') {
        const t = findNearestTarget(state, c.x, c.y, 580);
        const ang = t ? Math.atan2(t.y - c.y, t.x - c.x) : aimAngle;
        state.projectiles.push({
          id: nextUid('ech_p'),
          owner: 'player',
          kind: 'echo_bolt',
          element: 'temporal',
          x: c.x,
          y: c.y,
          vx: Math.cos(ang) * 750,
          vy: Math.sin(ang) * 750,
          radius: 12,
          damage: Math.round(c.damage * 0.9),
          pierceLeft: player.computed.pierce + 2,
          bouncesLeft: 1,
          life: 2.2,
          maxLife: 2.2,
          homingStrength: 0.9,
          hitEntityIds: new Set(),
          color: '#00f5d4',
        });
      } else if (c.kind === 'chrono_dome') {
        for (const enm of state.enemies) {
          if (Math.hypot(enm.x - c.x, enm.y - c.y) <= c.radius) {
            enm.slowMultiplier = 0.4;
            enm.slowTimer = 1.0;
          }
        }
      } else {
        dealPlayerAreaDamage(state, c.x, c.y, c.radius * 1.15, c.damage, 'spectral');
      }
    }
  }

  // Rune network laser line damage between active spatial runes
  if (runeConstructs.length >= 2 && Math.floor((state.totalRunSec - dt) * 3) < Math.floor(state.totalRunSec * 3)) {
    for (let a = 0; a < runeConstructs.length; a++) {
      for (let b = a + 1; b < runeConstructs.length; b++) {
        const r1 = runeConstructs[a];
        const r2 = runeConstructs[b];
        if (Math.hypot(r2.x - r1.x, r2.y - r1.y) <= 460) {
          const midX = (r1.x + r2.x) * 0.5;
          const midY = (r1.y + r2.y) * 0.5;
          dealPlayerAreaDamage(state, midX, midY, 85, Math.round(player.computed.damage * 0.9), 'runic');
        }
      }
    }
  }

  // 6. Update Projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (p.owner === 'player' && p.homingStrength > 0) {
      const target = findNearestTarget(state, p.x, p.y, 380, p.hitEntityIds);
      if (target) {
        const speed = Math.hypot(p.vx, p.vy);
        const desiredAng = Math.atan2(target.y - p.y, target.x - p.x);
        const currentAng = Math.atan2(p.vy, p.vx);
        let diff = desiredAng - currentAng;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const newAng = currentAng + diff * Math.min(1, p.homingStrength * dt * 4);
        p.vx = Math.cos(newAng) * speed;
        p.vy = Math.sin(newAng) * speed;
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.owner === 'player' || p.owner === 'coop_ally') {
      let consumed = false;
      // Check Boss collision
      if (state.boss && state.boss.hp > 0 && !p.hitEntityIds.has(state.boss.id)) {
        if (Math.hypot(state.boss.x - p.x, state.boss.y - p.y) <= state.boss.def.radius + p.radius) {
          p.hitEntityIds.add(state.boss.id);
          applyDamageToBoss(state, state.boss, p.damage, p.element);
          if (p.explodeRadius) {
            dealPlayerAreaDamage(state, p.x, p.y, p.explodeRadius, Math.round(p.damage * 0.6), p.element);
          }
          if (p.pierceLeft > 0) {
            p.pierceLeft--;
          } else {
            consumed = true;
          }
        }
      }

      // Check Enemy collisions
      if (!consumed) {
        for (const enm of state.enemies) {
          if (enm.hp <= 0 || p.hitEntityIds.has(enm.id)) continue;
          if (Math.hypot(enm.x - p.x, enm.y - p.y) <= enm.radius + p.radius) {
            p.hitEntityIds.add(enm.id);
            applyDamageToEnemy(state, enm, p.damage, p.element, p.x, p.y);
            if (p.explodeRadius) {
              dealPlayerAreaDamage(state, p.x, p.y, p.explodeRadius, Math.round(p.damage * 0.6), p.element);
            }
            if (p.splitOnHit) {
              p.splitOnHit = false;
              const baseAng = Math.atan2(p.vy, p.vx);
              for (const offset of [-0.45, 0.45]) {
                state.projectiles.push({
                  ...p,
                  id: nextUid('spl'),
                  vx: Math.cos(baseAng + offset) * 460,
                  vy: Math.sin(baseAng + offset) * 460,
                  damage: Math.round(p.damage * 0.55),
                  radius: p.radius * 0.75,
                  pierceLeft: 1,
                  bouncesLeft: 0,
                  life: 0.55,
                  hitEntityIds: new Set(p.hitEntityIds),
                });
              }
            }
            if (p.bouncesLeft > 0) {
              p.bouncesLeft--;
              const nextT = findNearestTarget(state, p.x, p.y, 340, p.hitEntityIds);
              if (nextT) {
                const spd = Math.hypot(p.vx, p.vy);
                const ang = Math.atan2(nextT.y - p.y, nextT.x - p.x);
                p.vx = Math.cos(ang) * spd;
                p.vy = Math.sin(ang) * spd;
              } else {
                p.vx = -p.vx;
                p.vy = -p.vy;
              }
            } else if (p.pierceLeft > 0) {
              p.pierceLeft--;
            } else {
              consumed = true;
              break;
            }
          }
        }
      }

      if (consumed) {
        state.projectiles.splice(i, 1);
      }
    } else {
      // Enemy / Boss projectile vs Player
      if (Math.hypot(player.x - p.x, player.y - p.y) <= 18 + p.radius) {
        applyDamageToPlayer(state, p.damage);
        state.projectiles.splice(i, 1);
      }
    }
  }

  // 7. Update Telegraph Zones
  for (let i = state.telegraphs.length - 1; i >= 0; i--) {
    const tel = state.telegraphs[i];
    tel.elapsed += dt;
    if (tel.elapsed >= tel.duration) {
      // Detonate telegraph
      if (tel.owner === 'enemy' || tel.owner === 'boss') {
        let hitPlayer = false;
        if (tel.shape === 'circle' || tel.shape === 'ring') {
          const d = Math.hypot(player.x - tel.x, player.y - tel.y);
          hitPlayer = tel.shape === 'ring' ? Math.abs(d - tel.radius) <= 45 : d <= tel.radius + 16;
        } else if (tel.shape === 'line' && tel.targetX !== undefined && tel.targetY !== undefined) {
          const ldx = tel.targetX - tel.x;
          const ldy = tel.targetY - tel.y;
          const lenSq = ldx * ldx + ldy * ldy || 1;
          const t = Math.max(0, Math.min(1, ((player.x - tel.x) * ldx + (player.y - tel.y) * ldy) / lenSq));
          const projX = tel.x + t * ldx;
          const projY = tel.y + t * ldy;
          hitPlayer = Math.hypot(player.x - projX, player.y - projY) <= (tel.width ?? 36) * 0.5 + 16;
        }
        if (hitPlayer) {
          applyDamageToPlayer(state, tel.damage);
        } else if (state.tutorial.active && !state.tutorial.completedTelegraphRead) {
          state.tutorial.completedTelegraphRead = true;
          if (state.tutorial.stepIndex === 3) state.tutorial.stepIndex = 4;
        }
      }
      state.telegraphs.splice(i, 1);
    }
  }

  // 8. Update Enemies & Handle Deaths / Loot Drops
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enm = state.enemies[i];
    if (enm.burnTimer > 0) {
      enm.burnTimer -= dt;
      if (Math.floor((enm.burnTimer + dt) * 2) > Math.floor(enm.burnTimer * 2)) {
        enm.hp -= enm.burnDamage;
      }
    }

    if (enm.hp <= 0) {
      state.kills++;
      if (enm.isElite) state.elitesDefeated++;
      callbacks?.onDiscovery?.('enemy', enm.archetypeId);

      // Active combat advances the Campaign Stage Progress toward the Boss!
      if (
        !state.isTrainingArena &&
        !state.isTutorial &&
        state.phase !== 'E_BOSS' &&
        state.phase !== 'F_CONCLUSION'
      ) {
        state.elapsedCampaignSec += enm.isElite ? 6.0 : 1.5;
      }

      if (hasSpecialFlag(player, 'void_implosion_on_kill')) {
        dealPlayerAreaDamage(state, enm.x, enm.y, 110, Math.round(player.computed.damage * 0.85), 'void');
      }

      const def = ARCANA_ENEMIES[enm.archetypeId];
      state.loot.push({
        id: nextUid('xp'),
        kind: enm.isElite ? 'xp_large' : def.xpReward >= 25 ? 'xp_medium' : 'xp_small',
        x: enm.x,
        y: enm.y,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        value: enm.isElite ? def.xpReward * 2.5 : def.xpReward,
        magnetized: false,
        life: 35,
      });

      if (enm.isElite || Math.random() < 0.28) {
        state.loot.push({
          id: nextUid('frag'),
          kind: 'arcane_fragment',
          x: enm.x + 12,
          y: enm.y - 8,
          vx: 0,
          vy: 0,
          value: enm.isElite ? 18 : 5,
          magnetized: false,
          life: 35,
        });
      }

      if (Math.random() < 0.08) {
        state.loot.push({
          id: nextUid('orb'),
          kind: 'hp_orb',
          x: enm.x - 10,
          y: enm.y + 10,
          vx: 0,
          vy: 0,
          value: 18,
          magnetized: false,
          life: 30,
        });
      }

      state.enemies.splice(i, 1);
      continue;
    }

    if (enm.hitFlashTimer > 0) enm.hitFlashTimer -= dt;
    if (enm.slowTimer > 0) {
      enm.slowTimer -= dt;
      if (enm.slowTimer <= 0) enm.slowMultiplier = 1;
    }

    if (state.isTrainingArena) continue;

    const dx = player.x - enm.x;
    const dy = player.y - enm.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    enm.facingX = nx;
    enm.facingY = ny;
    if (enm.archetypeId === 'shield_warden') {
      enm.shieldAngle = Math.atan2(dy, dx);
    }

    const def = ARCANA_ENEMIES[enm.archetypeId];
    enm.attackCooldownTimer -= dt * enm.slowMultiplier;

    // Archetype AI movement & telegraphed attacks
    if (dist > def.attackRange * 0.85) {
      const spd = enm.speed * enm.slowMultiplier;
      enm.vx = nx * spd;
      enm.vy = ny * spd;
      enm.x += enm.vx * dt;
      enm.y += enm.vy * dt;
    } else if (enm.attackCooldownTimer <= 0) {
      enm.attackCooldownTimer = def.attackCooldown;
      if (enm.archetypeId === 'ranged_caster' || enm.archetypeId === 'sigil_priest') {
        state.projectiles.push({
          id: nextUid('eprj'),
          owner: 'enemy',
          kind: 'enemy_orb',
          element: 'void',
          x: enm.x,
          y: enm.y,
          vx: nx * 270,
          vy: ny * 270,
          radius: 9,
          damage: enm.damage,
          pierceLeft: 0,
          bouncesLeft: 0,
          life: 2.2,
          maxLife: 2.2,
          homingStrength: 0,
          hitEntityIds: new Set(),
          color: def.palette.eyeGlow,
        });
      } else if (enm.archetypeId === 'charger') {
        state.telegraphs.push({
          id: nextUid('tel'),
          sourceId: enm.id,
          owner: 'enemy',
          shape: 'line',
          x: enm.x,
          y: enm.y,
          targetX: enm.x + nx * 260,
          targetY: enm.y + ny * 260,
          radius: 260,
          width: 44,
          elapsed: 0,
          duration: def.telegraphDuration,
          damage: enm.damage,
          element: 'fire',
        });
      } else if (enm.archetypeId === 'area_conjuror' || enm.archetypeId === 'terrain_weaver') {
        state.telegraphs.push({
          id: nextUid('tel'),
          sourceId: enm.id,
          owner: 'enemy',
          shape: 'circle',
          x: player.x,
          y: player.y,
          radius: 78,
          elapsed: 0,
          duration: def.telegraphDuration,
          damage: enm.damage,
          element: 'fire',
        });
      } else if (enm.archetypeId === 'summoner' && state.enemies.length < 28) {
        spawnEnemyNearPlayer(state, 'patroller', false, 200);
      } else if (enm.archetypeId === 'rift_stalker') {
        // Blink closer to player and slash
        enm.x = player.x - nx * 55;
        enm.y = player.y - ny * 55;
        state.telegraphs.push({
          id: nextUid('tel'),
          sourceId: enm.id,
          owner: 'enemy',
          shape: 'circle',
          x: player.x,
          y: player.y,
          radius: 62,
          elapsed: 0,
          duration: 0.45,
          damage: enm.damage,
          element: 'void',
        });
      } else {
        // Melee / Elite strike telegraph
        state.telegraphs.push({
          id: nextUid('tel'),
          sourceId: enm.id,
          owner: 'enemy',
          shape: 'circle',
          x: enm.x + nx * 28,
          y: enm.y + ny * 28,
          radius: enm.radius + 32,
          elapsed: 0,
          duration: Math.max(0.4, def.telegraphDuration),
          damage: enm.damage,
          element: 'spectral',
        });
      }
    }
  }

    // 9. Update Campaign Phases & Enemy Spawner
  const campaignDef = getCampaignDef(state.campaignId);
  if (!state.isTrainingArena && !state.isTutorial && state.phase !== 'E_BOSS' && state.phase !== 'F_CONCLUSION') {
    const progress = state.elapsedCampaignSec / campaignDef.prepDurationSec;
    if (progress < 0.22) {
      state.phase = 'A_ARRIVAL';
    } else if (progress < 0.62) {
      if (state.phase === 'A_ARRIVAL') {
        state.phase = 'B_EXPLORATION';
        state.statusBanner = {
          text: `Etapa 2/4 — Exploração de ${campaignDef.name}`,
          subtext: 'Explora os Santuários Ancestrais e derrota as Cascas para atrair o Guardião Caído.',
          timer: 3.4,
          color: campaignDef.palette.accentRunes,
        };
      } else {
        state.phase = 'B_EXPLORATION';
      }
    } else if (progress < 0.86) {
      if (state.phase !== 'C_ESCALATION') {
        state.phase = 'C_ESCALATION';
        state.statusBanner = {
          text: 'Etapa 3/4 — Invasão das Cascas de Elite!',
          subtext: 'Paladinos Caídos e Comandantes do Oco surgem no campo! Derrota-os por Relíquias.',
          timer: 3.5,
          color: '#ffd166',
        };
      }
    } else if (progress < 1.0) {
      if (state.phase !== 'D_OMEN') {
        state.phase = 'D_OMEN';
        state.statusBanner = {
          text: 'Etapa 4/4 — Presságio do Guardião Caído!',
          subtext: `${campaignDef.boss.name} está prestes a despertar na arena dos selos!`,
          timer: 3.8,
          color: campaignDef.boss.palette.danger,
        };
      }
    } else {
      spawnCampaignBoss(state, false);
      callbacks?.onBossSpawn?.();
      callbacks?.onDiscovery?.('boss', campaignDef.boss.id);
    }

    // Periodic wave spawning — True High-Density Survivor Swarms (30 to 80+ enemies!)
    const desiredEnemies = state.phase === 'A_ARRIVAL' ? 24 : state.phase === 'B_EXPLORATION' ? 50 : 85;
    if (state.enemies.length < desiredEnemies && Math.random() < dt * 4.2) {
      const pool = campaignDef.enemyPool;
      const swarmCount = state.phase === 'C_ESCALATION' ? 3 : 2;
      for (let s = 0; s < swarmCount; s++) {
        if (state.enemies.length >= desiredEnemies) break;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const isElite = pick === 'colossus_elite' || (state.phase === 'C_ESCALATION' && Math.random() < 0.14);
        spawnEnemyNearPlayer(state, pick, isElite, 420 + Math.random() * 160);
      }
    }
  } else if (state.isTutorial && state.enemies.length < 2 && state.tutorial.stepIndex < 6) {
    spawnEnemyNearPlayer(state, 'patroller', false, 300);
  }

  // 10. Boss AI & Multi-Phase Patterns
  if (state.boss) {
    const boss = state.boss;
    boss.animTime += dt;
    if (boss.invulnerableTimer > 0) boss.invulnerableTimer -= dt;
    if (boss.hitFlashTimer > 0) boss.hitFlashTimer -= dt;

    if (boss.hp <= 0) {
      // Boss defeated!
      state.bossesDefeated++;
      callbacks?.onDiscovery?.('boss', boss.def.id);
      for (let k = 0; k < 10; k++) {
        state.loot.push({
          id: nextUid('bxp'),
          kind: 'xp_large',
          x: boss.x + (Math.random() - 0.5) * 110,
          y: boss.y + (Math.random() - 0.5) * 110,
          vx: 0,
          vy: 0,
          value: 45,
          magnetized: true,
          life: 60,
        });
      }
      player.arcaneFragments += 90;
      state.boss = null;
      state.phase = 'F_CONCLUSION';
      callbacks?.onCampaignComplete?.(state.campaignId);

      if (state.campaignIndex >= 4 && state.campaignId !== 'infinite') {
        callbacks?.onRunEnd?.(true);
      }
    } else {
      const hpRatio = boss.hp / Math.max(1, boss.maxHp);
      for (const ph of boss.def.phases) {
        if (hpRatio <= ph.hpThreshold && ph.phaseIndex > boss.currentPhase) {
          boss.currentPhase = ph.phaseIndex;
          boss.aiState = 'phase_transition';
          boss.invulnerableTimer = 1.1;
        }
      }
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const dist = Math.hypot(dx, dy) || 1;
      boss.facingX = dx / dist;
      boss.facingY = dy / dist;

      if (dist > 150) {
        boss.x += boss.facingX * boss.def.speed * 0.75 * dt;
        boss.y += boss.facingY * boss.def.speed * 0.75 * dt;
      }

      boss.stateTimer -= dt * (1 + (boss.currentPhase - 1) * 0.18);
      if (boss.stateTimer <= 0) {
        boss.stateTimer = Math.max(1.6, 2.8 - boss.currentPhase * 0.25);
        boss.patternIndex++;

        // Execute multi-phase boss attack pattern (ring, radial volley, targeted sigils)
        const patMod = boss.patternIndex % 3;
        if (patMod === 0) {
          state.telegraphs.push({
            id: nextUid('btel'),
            sourceId: boss.id,
            owner: 'boss',
            shape: 'ring',
            x: boss.x,
            y: boss.y,
            radius: 170,
            elapsed: 0,
            duration: 1.0,
            damage: boss.def.baseDamage,
            element: 'void',
            label: boss.def.name,
          });
        } else if (patMod === 1) {
          const count = 8 + boss.currentPhase * 2;
          for (let k = 0; k < count; k++) {
            const ang = (k / count) * Math.PI * 2 + boss.patternIndex * 0.3;
            state.projectiles.push({
              id: nextUid('bprj'),
              owner: 'boss',
              kind: 'boss_lance',
              element: 'void',
              x: boss.x,
              y: boss.y,
              vx: Math.cos(ang) * 310,
              vy: Math.sin(ang) * 310,
              radius: 12,
              damage: Math.round(boss.def.baseDamage * 0.8),
              pierceLeft: 0,
              bouncesLeft: 0,
              life: 2.6,
              maxLife: 2.6,
              homingStrength: 0,
              hitEntityIds: new Set(),
              color: boss.def.palette.danger,
            });
          }
        } else {
          for (let s = 0; s < boss.currentPhase + 1; s++) {
            state.telegraphs.push({
              id: nextUid('btel_c'),
              sourceId: boss.id,
              owner: 'boss',
              shape: 'circle',
              x: player.x + (s === 0 ? 0 : (Math.random() - 0.5) * 220),
              y: player.y + (s === 0 ? 0 : (Math.random() - 0.5) * 220),
              radius: 90,
              elapsed: 0,
              duration: 1.05,
              damage: boss.def.baseDamage,
              element: 'chaos',
            });
          }
        }
      }
    }
  }

  // 11. Loot Magnet & Level-Up Progression
  for (let i = state.loot.length - 1; i >= 0; i--) {
    const item = state.loot[i];
    item.life -= dt;
    if (item.life <= 0) {
      state.loot.splice(i, 1);
      continue;
    }

    const d = Math.hypot(player.x - item.x, player.y - item.y);
    if (d <= player.computed.pickupRadius) {
      item.magnetized = true;
    }

    if (item.magnetized) {
      const pullSpeed = 540;
      const nx = (player.x - item.x) / Math.max(1, d);
      const ny = (player.y - item.y) / Math.max(1, d);
      item.x += nx * pullSpeed * dt;
      item.y += ny * pullSpeed * dt;
    }

    if (d <= 24) {
      if (item.kind === 'hp_orb') {
        player.hp = Math.min(player.maxHp, player.hp + item.value);
        addFloatingText(state, `+${item.value}`, player.x, player.y - 20, '#06d6a0');
      } else if (item.kind === 'arcane_fragment') {
        player.arcaneFragments += item.value;
      } else {
        player.xp += item.value;
        if (hasSpecialFlag(player, 'xp_sparks')) {
          const t = findNearestTarget(state, player.x, player.y, 480);
          if (t) {
            const ang = Math.atan2(t.y - player.y, t.x - player.x);
            firePlayerPrimary(state, player.x, player.y, ang);
          }
        }
        if (state.tutorial.active && !state.tutorial.completedXpCollect) {
          state.tutorial.completedXpCollect = true;
          if (state.tutorial.stepIndex === 4) state.tutorial.stepIndex = 5;
        }
      }
      state.loot.splice(i, 1);
    }
  }

  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = Math.round(60 + (player.level - 1) * 38);
    recomputePlayerStats(player);
    state.pendingLevelUps++;
    if (state.currentUpgradeChoices.length === 0) {
      state.currentUpgradeChoices = draftUpgradeCards(state, 3);
    }
    callbacks?.onLevelUp?.();
    callbacks?.onSfx?.('levelup');
  }

  // 12. Floating Combat Texts
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const fct = state.floatingTexts[i];
    fct.life -= dt;
    fct.y -= fct.vz * dt;
    if (fct.life <= 0) {
      state.floatingTexts.splice(i, 1);
    }
  }

  if (player.hp <= 0) {
    callbacks?.onRunEnd?.(false);
  }
}
