import { describe, expect, it } from 'vitest';
import { ARCANA_CAMPAIGNS, ARCANA_CLASSES, ARCANA_ENEMIES, ARCANA_UPGRADES } from '../src/arcana/data';
import { generateCampaignMap } from '../src/arcana/map-gen';
import {
  advanceToNextCampaign,
  applyUpgradeChoice,
  createInitialRunState,
  draftUpgradeCards,
  interactWithPoi,
  selectSpecialization,
  spawnCampaignBoss,
  stepArcanaSimulation,
} from '../src/arcana/simulation';
import {
  clearRunCheckpoint,
  createDefaultArcanaProfile,
  recordDiscovery,
  saveRunCheckpoint,
} from '../src/arcana/storage';
import type { ArcanaClassId, ArcanaInputState } from '../src/arcana/types';

function neutralInput(): ArcanaInputState {
  return {
    moveX: 0,
    moveY: 0,
    aimX: 1,
    aimY: 0,
    isAiming: false,
    primaryHeld: false,
    autoAttackEnabled: false,
    specialPressed: false,
    mobilityPressed: false,
    ultimatePressed: false,
    interactPressed: false,
  };
}

describe('Ascensão Arcana — Core Architecture & GDD v1.0 Verification', () => {
  it('defines all 4 playable classes with 3 specialization trees each, 10 enemies, and 5 campaigns + infinite', () => {
    const classIds: ArcanaClassId[] = ['chess', 'chrono', 'chaos', 'rune'];
    for (const id of classIds) {
      const cls = ARCANA_CLASSES[id];
      expect(cls).toBeDefined();
      expect(cls.specializations).toHaveLength(3);
      for (const spec of cls.specializations) {
        expect(spec.keyNodes.length).toBeGreaterThanOrEqual(3);
      }
      expect(cls.evolutionsPreview.length).toBeGreaterThanOrEqual(3);
    }
    expect(Object.keys(ARCANA_ENEMIES).length).toBe(10);
    expect(ARCANA_CAMPAIGNS.length).toBe(6);
    expect(ARCANA_UPGRADES.length).toBeGreaterThanOrEqual(25);
  });

  it('generates procedural modular maps with POIs, boss arena, and secret areas for every campaign', () => {
    for (const camp of ARCANA_CAMPAIGNS) {
      const map = generateCampaignMap(camp.id, 42);
      expect(map.campaignId).toBe(camp.id);
      expect(map.width).toBeGreaterThanOrEqual(2000);
      expect(map.pois.length).toBeGreaterThanOrEqual(7);
      expect(map.secretAreas.length).toBeGreaterThanOrEqual(2);
      expect(map.decorations.length).toBeGreaterThanOrEqual(40);
    }
  });

  it('executes distinct primary, special, dash, passive, and ultimate abilities for all 4 classes', () => {
    const classes: ArcanaClassId[] = ['chess', 'chrono', 'chaos', 'rune'];
    for (const classId of classes) {
      const state = createInitialRunState({ classId });
      const inp = neutralInput();
      inp.primaryHeld = true;
      inp.specialPressed = true;
      inp.mobilityPressed = true;
      state.player.ultimateCharge = 100;
      inp.ultimatePressed = true;

      stepArcanaSimulation(state, inp, 0.05);

      expect(state.player.iframeTimer).toBeGreaterThan(0);
      expect(state.projectiles.length + state.constructs.length).toBeGreaterThan(0);
    }
  });

  it('supports specialization tree selection, level-up card drafting, and upgrade application', () => {
    const state = createInitialRunState({ classId: 'chess' });
    const cards = draftUpgradeCards(state, 3);
    expect(cards).toHaveLength(3);

    const baseDmg = state.player.computed.damage;
    applyUpgradeChoice(state, 'fund_arcane_edge');
    expect(state.player.upgrades['fund_arcane_edge']).toBe(1);
    expect(state.player.computed.damage).toBeGreaterThan(baseDmg);

    selectSpecialization(state, 'chess_grandmaster');
    expect(state.player.specializationId).toBe('chess_grandmaster');
  });

  it('handles boss spawning, multi-phase transitions, POI interactions, and campaign progression', () => {
    const state = createInitialRunState({ classId: 'chrono' });
    const firstPoi = state.map.pois[0];
    expect(firstPoi).toBeDefined();
    const msg = interactWithPoi(state, firstPoi.id);
    expect(typeof msg).toBe('string');

    spawnCampaignBoss(state);
    expect(state.boss).not.toBeNull();
    expect(state.phase).toBe('E_BOSS');

    // Damage boss into phase 2
    state.boss!.hp = state.boss!.maxHp * 0.5;
    stepArcanaSimulation(state, neutralInput(), 0.1);
    expect(state.boss!.currentPhase).toBeGreaterThanOrEqual(2);

    // Advance campaign
    advanceToNextCampaign(state);
    expect(state.campaignIndex).toBe(1);
    expect(state.campaignId).toBe('ash');
  });

  it('persists run checkpoints and Grimório discoveries cleanly', () => {
    const profile = createDefaultArcanaProfile();
    const state = createInitialRunState({ classId: 'rune' });
    state.player.level = 5;
    state.player.arcaneFragments = 77;

    saveRunCheckpoint(profile, state);
    expect(profile.savedCheckpoint).not.toBeNull();
    expect(profile.savedCheckpoint?.playerLevel).toBe(5);
    expect(profile.savedCheckpoint?.arcaneFragments).toBe(77);

    const added = recordDiscovery(profile, 'boss', 'boss_seven_runes');
    expect(added).toBe(true);
    expect(profile.discoveredBosses).toContain('boss_seven_runes');

    clearRunCheckpoint(profile);
    expect(profile.savedCheckpoint).toBeNull();
  });
});
