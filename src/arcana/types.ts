// ============================================================================
// ASCENSÃO ARCANA — Core Types & Data Contracts (GDD v1.0)
// ============================================================================

export type ArcanaClassId = 'chess' | 'chrono' | 'chaos' | 'rune';

export type CampaignId = 'runes' | 'ash' | 'cloister' | 'hourglasses' | 'rift' | 'infinite';

export type CampaignPhase =
  | 'A_ARRIVAL'       // Fase A — Chegada (orientação curta e primeiros inimigos)
  | 'B_EXPLORATION'   // Fase B — Exploração (eventos, relíquias, elites, altares)
  | 'C_ESCALATION'    // Fase C — Escalada (aumento de pressão e ondas coordenadas)
  | 'D_OMEN'          // Fase D — Presságio (ambiente muda, anúncio do boss)
  | 'E_BOSS'          // Fase E — Confronto (arena do boss em 3+ fases)
  | 'F_CONCLUSION';   // Fase F — Conclusão (recompensas, portal para próxima campanha)

export type UpgradeCategory =
  | 'fundamental'
  | 'modifier'
  | 'elemental'
  | 'class'
  | 'relic'
  | 'evolution'
  | 'mythic';

export type UpgradeRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type ElementalTag =
  | 'spectral'
  | 'temporal'
  | 'chaos'
  | 'runic'
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'void';

export type QualityProfile = 'economico' | 'equilibrado' | 'alto';

export type EnemyArchetypeId =
  | 'patroller'        // Inimigo básico de pressão
  | 'ranged_caster'    // Atirador à distância
  | 'charger'          // Inimigo de investida com linha de aviso
  | 'area_conjuror'    // Conjurador de área com círculo de perigo
  | 'summoner'         // Invocador de lacaios menores
  | 'shield_warden'    // Defensor com escudo frontal
  | 'sigil_priest'     // Suporte que fortalece aliados próximos
  | 'terrain_weaver'   // Criador de obstáculos temporários
  | 'rift_stalker'     // Assassino arcano rápido
  | 'colossus_elite';  // Elite com modificadores especiais

export type MapPoiType =
  | 'forbidden_library'    // Biblioteca Proibida (escolhe 1 de 3 magias raras)
  | 'transmutation_altar'  // Altar de Transmutação (sacrifica vida ou aprimoramento por poder superior)
  | 'mirror_possibilities' // Espelho de Possibilidades (duplica um aprimoramento existente)
  | 'wandering_merchant'   // Mercador Errante (troca fragmentos arcanos por relíquias)
  | 'unstable_ritual'      // Ritual Instável (sobrevive 25s em círculo para recompensa lendária)
  | 'arcane_anomaly'       // Anomalia Arcana (altera regras do mapa + bónus de XP/fragmentos)
  | 'healing_sanctuary'    // Santuário de Restauração
  | 'early_boss_beacon';   // Marco de Desafio Antecipado (invoca o boss antes do tempo com bónus)

export interface SpecializationPathDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  keyNodes: string[];
}

export interface AbilityDef {
  name: string;
  description: string;
  cooldown: number; // segundos
  icon: string;
  tag: ElementalTag;
}

export interface ArcanaClassDef {
  id: ArcanaClassId;
  name: string;
  title: string;
  concept: string;
  combatStyle: string;
  difficulty: 1 | 2 | 3;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    cloth: string;
  };
  baseStats: {
    maxHp: number;
    moveSpeed: number;
    baseDamage: number;
    attackInterval: number;
    critChance: number;
    critMultiplier: number;
    pickupRadius: number;
  };
  primaryAttack: AbilityDef;
  specialSkill: AbilityDef;
  mobilitySkill: AbilityDef;
  passive: {
    name: string;
    description: string;
    icon: string;
  };
  ultimateSkill: AbilityDef & { chargeRequired: number };
  specializations: [SpecializationPathDef, SpecializationPathDef, SpecializationPathDef];
  evolutionsPreview: string[];
}

export interface BossPhaseDef {
  phaseIndex: 1 | 2 | 3 | 4;
  hpThreshold: number; // 1.0, 0.68, 0.35, etc.
  title: string;
  description: string;
  attackPatterns: string[];
  arenaHazard: string;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  campaignId: CampaignId;
  maxHp: number;
  baseDamage: number;
  speed: number;
  radius: number;
  palette: {
    body: string;
    armor: string;
    glow: string;
    danger: string;
  };
  phases: BossPhaseDef[];
  lore: string;
}

export interface CampaignDef {
  id: CampaignId;
  order: number;
  roman: string;
  name: string;
  subtitle: string;
  themeDescription: string;
  prepDurationSec: number; // Tempo até o boss surgir naturalmente
  palette: {
    bgDeep: string;
    floorPrimary: string;
    floorSecondary: string;
    accentRunes: string;
    fogColor: string;
    ambientLight: string;
  };
  environmentalMechanic: {
    name: string;
    description: string;
  };
  enemyPool: EnemyArchetypeId[];
  boss: BossDef;
}

export interface UpgradeStatEffect {
  damageMult?: number;
  attackSpeedMult?: number;
  moveSpeedMult?: number;
  maxHpBonus?: number;
  cooldownReduction?: number;
  critChanceBonus?: number;
  critDamageBonus?: number;
  projectileCountBonus?: number;
  pierceBonus?: number;
  bounceBonus?: number;
  areaScaleBonus?: number;
  pickupRadiusBonus?: number;
  thornsDamage?: number;
  vampirismChance?: number;
  specialMechanicFlag?: string;
}

export interface UpgradeCardDef {
  id: string;
  name: string;
  category: UpgradeCategory;
  rarity: UpgradeRarity;
  classRestriction?: ArcanaClassId;
  requiresIds?: string[]; // Para Evoluções ou Míticos
  tags: ElementalTag[];
  icon: string;
  shortDesc: string;
  behaviorTransformation: string;
  maxStacks: number;
  effect: UpgradeStatEffect;
}

export interface EnemyArchetypeDef {
  id: EnemyArchetypeId;
  name: string;
  role: string;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  telegraphDuration: number;
  xpReward: number;
  radius: number;
  palette: {
    primary: string;
    secondary: string;
    eyeGlow: string;
  };
  description: string;
}

export interface MapPoiInstance {
  id: string;
  type: MapPoiType;
  name: string;
  description: string;
  x: number;
  y: number;
  radius: number;
  used: boolean;
  activeTimer?: number; // Para Ritual Instável
  costFragments?: number;
}

export interface MapObstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'pillar' | 'statue' | 'ruin_wall' | 'chasm' | 'crystal_obelisk' | 'hourglass_monolith';
  destructible?: boolean;
  hp?: number;
}

export interface MapDecoration {
  x: number;
  y: number;
  kind: 'rune_tile' | 'floating_shard' | 'torch' | 'ash_tree' | 'mirror_arch' | 'sand_vortex' | 'void_fissure';
  scale: number;
  phaseOffset: number;
}

export interface GeneratedCampaignMap {
  campaignId: CampaignId;
  seed: number;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  bossArenaCenter: { x: number; y: number; radius: number };
  obstacles: MapObstacle[];
  pois: MapPoiInstance[];
  decorations: MapDecoration[];
  secretAreas: { x: number; y: number; radius: number; discovered: boolean; rewardFragments: number }[];
}

// ============================================================================
// Runtime Simulation Entities
// ============================================================================

export type EntityAnimState = 'idle' | 'walk' | 'attack' | 'cast' | 'dash' | 'hit' | 'defeat' | 'victory';

export interface ActiveProjectile {
  id: string;
  owner: 'player' | 'coop_ally' | 'enemy' | 'boss';
  kind:
    | 'water_whip'
    | 'fan_gale'
    | 'solar_fist'
    | 'terracotta_block'
    | 'pawn_lance'
    | 'bishop_diagonal'
    | 'rook_column'
    | 'knight_impact'
    | 'queen_beam'
    | 'chrono_shard'
    | 'echo_bolt'
    | 'chaos_orb'
    | 'chaos_prism'
    | 'rune_glyph'
    | 'enemy_orb'
    | 'boss_lance'
    | 'boss_wave';
  element: ElementalTag;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierceLeft: number;
  bouncesLeft: number;
  life: number;
  maxLife: number;
  homingStrength: number;
  splitOnHit?: boolean;
  explodeRadius?: number;
  hitEntityIds: Set<string>;
  color: string;
}

export interface ActiveSummonOrConstruct {
  id: string;
  ownerClass: ArcanaClassId;
  kind:
    | 'chess_pawn'
    | 'chess_knight'
    | 'chess_bishop'
    | 'chess_rook'
    | 'chess_queen'
    | 'chrono_echo'
    | 'chrono_dome'
    | 'chaos_totem'
    | 'rune_circle_fire'
    | 'rune_circle_frost'
    | 'rune_circle_volt'
    | 'rune_great_inscription';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  attackTimer: number;
  attackInterval: number;
  damage: number;
  symbolTag?: 'IGNIS' | 'GLACIES' | 'FULGUR' | 'AETHER';
  recordedActions?: Array<{ dx: number; dy: number; cast: boolean; delay: number }>;
}

export interface TelegraphZone {
  id: string;
  sourceId: string;
  owner: 'enemy' | 'boss' | 'player' | 'environment';
  shape: 'circle' | 'line' | 'cone' | 'ring';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  radius: number;
  width?: number;
  angle?: number;
  elapsed: number;
  duration: number;
  damage: number;
  element: ElementalTag;
  label?: string;
}

export interface ActiveEnemy {
  id: string;
  archetypeId: EnemyArchetypeId;
  name: string;
  isElite: boolean;
  eliteModifier?: 'Vampírico' | 'Tempestuoso' | 'Espelhado' | 'Colossal' | ' Crono-Acelerado';
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  aiState: 'spawn' | 'patrol' | 'chase' | 'windup' | 'attack' | 'recover' | 'stunned';
  stateTimer: number;
  attackCooldownTimer: number;
  animState: EntityAnimState;
  animTime: number;
  hitFlashTimer: number;
  slowMultiplier: number;
  slowTimer: number;
  burnDamage: number;
  burnTimer: number;
  shieldAngle?: number; // Para shield_warden
}

export interface ActiveBoss {
  id: string;
  def: BossDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  hp: number;
  maxHp: number;
  currentPhase: 1 | 2 | 3 | 4;
  aiState: 'intro' | 'reposition' | 'telegraph_pattern' | 'executing_pattern' | 'phase_transition' | 'defeated';
  patternIndex: number;
  stateTimer: number;
  invulnerableTimer: number;
  hitFlashTimer: number;
  animState: EntityAnimState;
  animTime: number;
}

export interface XpGemOrLoot {
  id: string;
  kind: 'xp_small' | 'xp_medium' | 'xp_large' | 'arcane_fragment' | 'hp_orb' | 'relic_chest';
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  magnetized: boolean;
  life: number;
}

export interface FloatingCombatText {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
  vz: number;
  color: string;
  isCrit: boolean;
  scale: number;
  life: number;
  maxLife: number;
}

export interface PlayerRuntimeState {
  classId: ArcanaClassId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  aimX: number;
  aimY: number;
  hp: number;
  maxHp: number;
  shield: number;
  level: number;
  xp: number;
  xpToNext: number;
  arcaneFragments: number;
  // Cooldowns & timers
  primaryTimer: number;
  specialCooldown: number;
  specialMaxCooldown: number;
  mobilityCooldown: number;
  mobilityMaxCooldown: number;
  ultimateCharge: number;
  ultimateMaxCharge: number;
  iframeTimer: number;
  dashTimer: number;
  dashDirX: number;
  dashDirY: number;
  animState: EntityAnimState;
  animTime: number;
  hitFlashTimer: number;
  // Class-specific gauges
  chessCoordinationStacks: number; // Mago do Xadrez: Peças Coordenadas (0..10)
  chronoSequenceStacks: number;    // Cronomante: Energia de Sequência (0..8)
  chaosInstability: number;        // Feiticeira do Caos: Medidor de Instabilidade (0..100)
  runeActiveSymbols: Array<'IGNIS' | 'GLACIES' | 'FULGUR' | 'AETHER'>; // Tecelão de Runas
  // Acquired upgrades: id -> stacks
  upgrades: Record<string, number>;
  specializationId: string | null;
  // Computed stats
  computed: {
    damage: number;
    attackInterval: number;
    moveSpeed: number;
    critChance: number;
    critMultiplier: number;
    projectileCount: number;
    pierce: number;
    bounce: number;
    areaScale: number;
    pickupRadius: number;
    cooldownMult: number;
    thorns: number;
    vampirism: number;
  };
}

export interface CoopPartnerState {
  connected: boolean;
  peerId: string;
  name: string;
  classId: ArcanaClassId;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  hp: number;
  maxHp: number;
  animState: EntityAnimState;
  downed: boolean;
  reviveProgress: number; // 0..1
}

export interface TutorialStepState {
  active: boolean;
  stepIndex: number; // 0..7
  completedMove: boolean;
  completedAttack: boolean;
  completedDodge: boolean;
  completedTelegraphRead: boolean;
  completedXpCollect: boolean;
  completedUpgradePick: boolean;
  completedPoiInteract: boolean;
}

export interface ArcanaRunState {
  runId: string;
  isTrainingArena: boolean;
  isTutorial: boolean;
  ascensionLevel: number; // 0..10
  campaignIndex: number;  // 0..4 (ou >=5 em Ascensão Infinita)
  campaignId: CampaignId;
  phase: CampaignPhase;
  elapsedCampaignSec: number;
  totalRunSec: number;
  kills: number;
  elitesDefeated: number;
  bossesDefeated: number;
  map: GeneratedCampaignMap;
  player: PlayerRuntimeState;
  coopPartner: CoopPartnerState | null;
  enemies: ActiveEnemy[];
  boss: ActiveBoss | null;
  projectiles: ActiveProjectile[];
  constructs: ActiveSummonOrConstruct[];
  telegraphs: TelegraphZone[];
  loot: XpGemOrLoot[];
  floatingTexts: FloatingCombatText[];
  pendingLevelUps: number;
  currentUpgradeChoices: UpgradeCardDef[];
  activePoiModal: MapPoiInstance | null;
  tutorial: TutorialStepState;
  statusBanner: { text: string; subtext?: string; timer: number; color: string } | null;
  screenShake: number;
  timeScale: number; // Para hit-stop ou câmara lenta do Cronomante
}

export interface ArcanaInputState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  isAiming: boolean;
  primaryHeld: boolean;
  autoAttackEnabled: boolean;
  specialPressed: boolean;
  mobilityPressed: boolean;
  ultimatePressed: boolean;
  interactPressed: boolean;
}

// ============================================================================
// Persistent Save & Grimório Schema
// ============================================================================

export interface SavedRunCheckpoint {
  version: number;
  timestamp: number;
  classId: ArcanaClassId;
  ascensionLevel: number;
  campaignIndex: number;
  campaignId: CampaignId;
  elapsedCampaignSec: number;
  totalRunSec: number;
  kills: number;
  playerHp: number;
  playerMaxHp: number;
  playerLevel: number;
  playerXp: number;
  arcaneFragments: number;
  upgrades: Record<string, number>;
  specializationId: string | null;
}

export interface ArcanaSettings {
  quality: QualityProfile;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  uiVolume: number;
  vibrationEnabled: boolean;
  reducedFlashes: boolean;
  autoAttackDefault: boolean;
  joystickSensitivity: number;
}

export interface ArcanaPersistentProfile {
  version: number;
  completedTutorial: boolean;
  seenIntroAnimation: boolean;
  highestAscensionUnlocked: number;
  totalRuns: number;
  totalVictories: number;
  totalKills: number;
  eternalEssence: number; // Moeda de meta-progressão horizontal
  unlockedClasses: ArcanaClassId[];
  discoveredUpgrades: string[];
  discoveredEnemies: EnemyArchetypeId[];
  discoveredBosses: string[];
  discoveredBiomes: CampaignId[];
  settings: ArcanaSettings;
  savedCheckpoint: SavedRunCheckpoint | null;
}
