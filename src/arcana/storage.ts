// ============================================================================
// ASCENSÃO ARCANA — Persistent Profile, Grimório & Checkpoint Storage
// Implements GDD Sections 9.3, 13 & 17.3
// ============================================================================

import type {
  ArcanaClassId,
  ArcanaPersistentProfile,
  ArcanaRunState,
  ArcanaSettings,
  CampaignId,
  EnemyArchetypeId,
  SavedRunCheckpoint,
} from './types';

export const ARCANA_STORAGE_KEY = 'gabzitu_ascensao_arcana_v1';
const PROFILE_SCHEMA_VERSION = 1;

export const DEFAULT_ARCANA_SETTINGS: ArcanaSettings = {
  quality: 'equilibrado',
  musicVolume: 0.65,
  sfxVolume: 0.8,
  ambienceVolume: 0.55,
  uiVolume: 0.75,
  vibrationEnabled: true,
  reducedFlashes: false,
  autoAttackDefault: true,
  joystickSensitivity: 1.0,
};

export function createDefaultArcanaProfile(): ArcanaPersistentProfile {
  return {
    version: PROFILE_SCHEMA_VERSION,
    completedTutorial: false,
    seenIntroAnimation: false,
    highestAscensionUnlocked: 0,
    totalRuns: 0,
    totalVictories: 0,
    totalKills: 0,
    eternalEssence: 0,
    unlockedClasses: ['chess', 'chrono', 'chaos', 'rune'],
    discoveredUpgrades: ['fund_arcane_edge', 'fund_swift_conduit', 'fund_vital_vessel'],
    discoveredEnemies: ['patroller'],
    discoveredBosses: [],
    discoveredBiomes: ['runes'],
    settings: { ...DEFAULT_ARCANA_SETTINGS },
    savedCheckpoint: null,
  };
}

export function loadArcanaProfile(): ArcanaPersistentProfile {
  const fallback = createDefaultArcanaProfile();
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(ARCANA_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<ArcanaPersistentProfile>;
    if (!parsed || typeof parsed !== 'object') {
      return fallback;
    }

    const allClasses: ArcanaClassId[] = ['chess', 'chrono', 'chaos', 'rune'];
    const unlockedClasses = Array.isArray(parsed.unlockedClasses)
      ? Array.from(new Set([...allClasses, ...parsed.unlockedClasses]))
      : allClasses;

    const mergedSettings: ArcanaSettings = {
      ...DEFAULT_ARCANA_SETTINGS,
      ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
    };

    const profile: ArcanaPersistentProfile = {
      version: PROFILE_SCHEMA_VERSION,
      completedTutorial: Boolean(parsed.completedTutorial),
      seenIntroAnimation: Boolean(parsed.seenIntroAnimation),
      highestAscensionUnlocked:
        typeof parsed.highestAscensionUnlocked === 'number'
          ? Math.max(0, Math.min(10, Math.floor(parsed.highestAscensionUnlocked)))
          : 0,
      totalRuns: typeof parsed.totalRuns === 'number' ? Math.max(0, Math.floor(parsed.totalRuns)) : 0,
      totalVictories: typeof parsed.totalVictories === 'number' ? Math.max(0, Math.floor(parsed.totalVictories)) : 0,
      totalKills: typeof parsed.totalKills === 'number' ? Math.max(0, Math.floor(parsed.totalKills)) : 0,
      eternalEssence: typeof parsed.eternalEssence === 'number' ? Math.max(0, Math.floor(parsed.eternalEssence)) : 0,
      unlockedClasses,
      discoveredUpgrades: Array.isArray(parsed.discoveredUpgrades)
        ? Array.from(new Set(parsed.discoveredUpgrades))
        : fallback.discoveredUpgrades,
      discoveredEnemies: Array.isArray(parsed.discoveredEnemies)
        ? (Array.from(new Set(parsed.discoveredEnemies)) as EnemyArchetypeId[])
        : fallback.discoveredEnemies,
      discoveredBosses: Array.isArray(parsed.discoveredBosses)
        ? Array.from(new Set(parsed.discoveredBosses))
        : [],
      discoveredBiomes: Array.isArray(parsed.discoveredBiomes)
        ? (Array.from(new Set(parsed.discoveredBiomes)) as CampaignId[])
        : fallback.discoveredBiomes,
      settings: mergedSettings,
      savedCheckpoint: validateCheckpoint(parsed.savedCheckpoint ?? null),
    };

    return profile;
  } catch {
    return fallback;
  }
}

function validateCheckpoint(cp: SavedRunCheckpoint | null): SavedRunCheckpoint | null {
  if (!cp || typeof cp !== 'object') return null;
  if (!cp.classId || !cp.campaignId || typeof cp.playerHp !== 'number' || cp.playerHp <= 0) {
    return null;
  }
  return {
    version: PROFILE_SCHEMA_VERSION,
    timestamp: typeof cp.timestamp === 'number' ? cp.timestamp : Date.now(),
    classId: cp.classId,
    ascensionLevel: typeof cp.ascensionLevel === 'number' ? cp.ascensionLevel : 0,
    campaignIndex: typeof cp.campaignIndex === 'number' ? cp.campaignIndex : 0,
    campaignId: cp.campaignId,
    elapsedCampaignSec: typeof cp.elapsedCampaignSec === 'number' ? cp.elapsedCampaignSec : 0,
    totalRunSec: typeof cp.totalRunSec === 'number' ? cp.totalRunSec : 0,
    kills: typeof cp.kills === 'number' ? cp.kills : 0,
    playerHp: Math.max(1, cp.playerHp),
    playerMaxHp: Math.max(1, cp.playerMaxHp || 100),
    playerLevel: Math.max(1, cp.playerLevel || 1),
    playerXp: Math.max(0, cp.playerXp || 0),
    arcaneFragments: Math.max(0, cp.arcaneFragments || 0),
    upgrades: cp.upgrades && typeof cp.upgrades === 'object' ? { ...cp.upgrades } : {},
    specializationId: cp.specializationId ?? null,
  };
}

export function saveArcanaProfile(profile: ArcanaPersistentProfile): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(ARCANA_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore quota exceeded or private browsing restrictions
  }
}

export function saveRunCheckpoint(profile: ArcanaPersistentProfile, state: ArcanaRunState): void {
  if (state.isTrainingArena || state.player.hp <= 0) {
    return;
  }

  const checkpoint: SavedRunCheckpoint = {
    version: PROFILE_SCHEMA_VERSION,
    timestamp: Date.now(),
    classId: state.player.classId,
    ascensionLevel: state.ascensionLevel,
    campaignIndex: state.campaignIndex,
    campaignId: state.campaignId,
    elapsedCampaignSec: state.elapsedCampaignSec,
    totalRunSec: state.totalRunSec,
    kills: state.kills,
    playerHp: Math.max(1, Math.round(state.player.hp)),
    playerMaxHp: Math.max(1, Math.round(state.player.maxHp)),
    playerLevel: state.player.level,
    playerXp: Math.round(state.player.xp),
    arcaneFragments: state.player.arcaneFragments,
    upgrades: { ...state.player.upgrades },
    specializationId: state.player.specializationId,
  };

  profile.savedCheckpoint = checkpoint;
  saveArcanaProfile(profile);
}

export function clearRunCheckpoint(profile: ArcanaPersistentProfile): void {
  profile.savedCheckpoint = null;
  saveArcanaProfile(profile);
}

export function recordDiscovery(
  profile: ArcanaPersistentProfile,
  kind: 'upgrade' | 'enemy' | 'boss' | 'biome',
  id: string
): boolean {
  let isNew = false;

  switch (kind) {
    case 'upgrade': {
      if (!profile.discoveredUpgrades.includes(id)) {
        profile.discoveredUpgrades.push(id);
        isNew = true;
      }
      break;
    }
    case 'enemy': {
      const enemyId = id as EnemyArchetypeId;
      if (!profile.discoveredEnemies.includes(enemyId)) {
        profile.discoveredEnemies.push(enemyId);
        isNew = true;
      }
      break;
    }
    case 'boss': {
      if (!profile.discoveredBosses.includes(id)) {
        profile.discoveredBosses.push(id);
        isNew = true;
      }
      break;
    }
    case 'biome': {
      const biomeId = id as CampaignId;
      if (!profile.discoveredBiomes.includes(biomeId)) {
        profile.discoveredBiomes.push(biomeId);
        isNew = true;
      }
      break;
    }
  }

  if (isNew) {
    saveArcanaProfile(profile);
  }
  return isNew;
}

export function bindLifecycleAutoSave(
  getState: () => ArcanaRunState | null,
  getProfile: () => ArcanaPersistentProfile,
  onAutoPause?: () => void
): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const flushCheckpointAndPause = () => {
    const currentRun = getState();
    const profile = getProfile();
    if (currentRun && !currentRun.isTrainingArena && currentRun.player.hp > 0) {
      saveRunCheckpoint(profile, currentRun);
      onAutoPause?.();
    } else {
      saveArcanaProfile(profile);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flushCheckpointAndPause();
    }
  };

  const handlePageHide = () => {
    flushCheckpointAndPause();
  };

  const handleWindowBlur = () => {
    flushCheckpointAndPause();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('blur', handleWindowBlur);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('blur', handleWindowBlur);
  };
}
