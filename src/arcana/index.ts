// ============================================================================
// ASCENSÃO ARCANA — Main Mode Controller, Powers UX & Constellation Skill Web
// ============================================================================

import './arcana.css';
import { skillIcon } from '../night-skill-icons';
import {
  ARCANA_CAMPAIGNS,
  ARCANA_CLASSES,
  ARCANA_ENEMIES,
  ARCANA_UPGRADES,
  ASCENSION_MODIFIERS,
  SKILL_WEB_NODES,
  TUTORIAL_STEPS,
  type SkillWebNodeDef,
} from './data';
import { ArcanaAudio } from './audio';
import { ArcanaCoopSession } from './coop';
import { ArcanaRenderer } from './renderer';
import {
  advanceToNextCampaign,
  applyUpgradeChoice,
  createInitialRunState,
  interactWithPoi,
  selectSpecialization,
  spawnCampaignBoss,
  spawnTrainingDummies,
  stepArcanaSimulation,
} from './simulation';
import {
  bindLifecycleAutoSave,
  clearRunCheckpoint,
  loadArcanaProfile,
  recordDiscovery,
  saveArcanaProfile,
  saveRunCheckpoint,
} from './storage';
import type {
  ArcanaClassId,
  ArcanaInputState,
  ArcanaPersistentProfile,
  ArcanaRunState,
  QualityProfile,
  UpgradeCategory,
  UpgradeRarity,
} from './types';

export interface LaunchArcanaOptions {
  name?: string;
  identity?: string;
  onExit: () => void;
  sound?: (kind: string) => void;
}

type ArcanaScreen =
  | 'intro'
  | 'menu'
  | 'class_select'
  | 'skill_tree'
  | 'coop_lobby'
  | 'grimoire'
  | 'ascensions'
  | 'settings'
  | 'playing';

const RARITY_LABELS: Record<UpgradeRarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Vertente Lendária',
  mythic: 'Ascensão Mítica',
};

const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  fundamental: 'Arte Marcial Base',
  modifier: 'Forma Primordial',
  elemental: 'Sinergia Elemental',
  class: 'Técnica de Vertente',
  relic: 'Relíquia Espiritual',
  evolution: 'Vertente Suprema',
  mythic: 'Convergência dos Selos',
};

import {
  renderAnimeGuardianBadge,
  getAnimeGuardianSvg,
} from './anime-portraits';

// Quadrant CSS background-position for /arcana-benders.jpg (2x2 pixel-art sheet)
const BENDER_PORTRAIT_BG_POS: Record<ArcanaClassId, string> = {
  chess: '0% 0%',     // Top-Left: Mestre da Água
  rune: '100% 0%',    // Top-Right: Mestre da Terra
  chaos: '0% 100%',   // Bottom-Left: Mestre do Fogo
  chrono: '100% 100%', // Bottom-Right: Mestre do Ar
};

export function getSkillVectorIcon(nameOrText: string): string {
  const t = (nameOrText || '').toLowerCase();
  if (t.includes('gelo') || t.includes('ice') || t.includes('glaciar') || t.includes('congelar')) return skillIcon('snowflake-1');
  if (t.includes('sangue') || t.includes('blood') || t.includes('vampiro') || t.includes('drenar')) return skillIcon('bloody-sword');
  if (t.includes('cura') || t.includes('vital') || t.includes('vida') || t.includes('regenera')) return skillIcon('heart-plus');
  if (t.includes('água') || t.includes('mar') || t.includes('onda') || t.includes('turbilhão')) return skillIcon('magic-swirl');
  if (t.includes('vento') || t.includes('ar') || t.includes('tornado') || t.includes('ciclone')) return skillIcon('tornado');
  if (t.includes('voo') || t.includes('flecha') || t.includes('velocidade') || t.includes('impulso')) return skillIcon('arrow-flights');
  if (t.includes('som') || t.includes('vácuo') || t.includes('eco') || t.includes('ressonância')) return skillIcon('ringed-beam');
  if (t.includes('projeção') || t.includes('astral') || t.includes('espírito') || t.includes('fantasma')) return skillIcon('ghost');
  if (t.includes('relâmpago') || t.includes('raio') || t.includes('trovão') || t.includes('elétrico')) return skillIcon('bolt-spell-cast');
  if (t.includes('combustão') || t.includes('explosão') || t.includes('crânio') || t.includes('morte')) return skillIcon('dread-skull');
  if (t.includes('fogo') || t.includes('chama') || t.includes('solar') || t.includes('inferno')) return skillIcon('sun');
  if (t.includes('metal') || t.includes('ferro') || t.includes('aço') || t.includes('lâmina')) return skillIcon('crossed-swords');
  if (t.includes('sísmica') || t.includes('terremoto') || t.includes('vibra')) return skillIcon('vibrating-shield');
  if (t.includes('terra') || t.includes('rocha') || t.includes('pedra') || t.includes('geodo')) return skillIcon('axe-swing');
  if (t.includes('lava') || t.includes('magma') || t.includes('vulcão')) return skillIcon('sun');
  if (t.includes('escudo') || t.includes('barreira') || t.includes('proteção')) return skillIcon('magic-shield');
  if (t.includes('dash') || t.includes('passo') || t.includes('esquiva') || t.includes('salto')) return skillIcon('heavy-arrow');
  if (t.includes('portal') || t.includes('teleporte') || t.includes('fenda')) return skillIcon('teleport');
  if (t.includes('avatar') || t.includes('convergência') || t.includes('supremo') || t.includes('mítico')) return skillIcon('crown');
  return skillIcon('beams-aura');
}

function renderBenderPortraitBadge(
  classId: ArcanaClassId,
  sizePx = 64,
  borderCol = '#ffd166',
  active = false
): string {
  return renderAnimeGuardianBadge(classId, sizePx, borderCol, active);
}

export function launchArcana(options: LaunchArcanaOptions): () => void {
  const profile: ArcanaPersistentProfile = loadArcanaProfile();
  const audio = new ArcanaAudio();
  audio.applySettings(profile.settings);

  const coop = new ArcanaCoopSession();
  coop.localName = options.name || 'Guardião';

  // Isolated root container
  const root = document.createElement('div');
  root.className = 'arcana-root';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    background: '#070312',
    color: '#f4effa',
    fontFamily: "'Cinzel', 'Georgia', system-ui, sans-serif",
    overflow: 'hidden',
    userSelect: 'none',
    touchAction: 'none',
  });
  document.body.appendChild(root);

  const canvas = document.createElement('canvas');
  canvas.className = 'arcana-canvas';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
  });
  root.appendChild(canvas);

  const uiLayer = document.createElement('div');
  uiLayer.className = 'arcana-ui-layer';
  Object.assign(uiLayer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
  });
  root.appendChild(uiLayer);

  const renderer = new ArcanaRenderer(canvas, profile.settings.quality);

  let currentScreen: ArcanaScreen = profile.seenIntroAnimation ? 'menu' : 'intro';
  let selectedClassId: ArcanaClassId = 'chess';
  let selectedWebNodeId: string | null = null;
  let unlockedWebNodes = new Set<string>(profile.discoveredUpgrades);
  let spentChiPointsInRun = 0;
  let selectedAscension = Math.min(profile.highestAscensionUnlocked, 0);
  let grimoireTab: 'classes' | 'upgrades' | 'enemies' | 'bosses' | 'biomes' = 'classes';
  let runState: ArcanaRunState | null = null;
  let menuBackdropState: ArcanaRunState = createInitialRunState({
    classId: 'chess',
    isTraining: true,
  });

  let isPaused = false;
  let showInRunSkillTree = false;
  let showSpecChoiceModal = false;
  let portraitDismissed = false;
  let introTimer: number | null = null;
  let rafId = 0;
  let lastFrameTime = performance.now();

  const input: ArcanaInputState = {
    moveX: 0,
    moveY: 0,
    aimX: 1,
    aimY: 0,
    isAiming: false,
    primaryHeld: false,
    autoAttackEnabled: profile.settings.autoAttackDefault,
    specialPressed: false,
    mobilityPressed: false,
    ultimatePressed: false,
    interactPressed: false,
  };

  const keysHeld = new Set<string>();
  let joyMoveVec = { x: 0, y: 0 };
  let joyAimVec = { x: 0, y: 0, active: false };

  const unbindLifecycle = bindLifecycleAutoSave(
    () => (currentScreen === 'playing' && runState && !runState.isTrainingArena ? runState : null),
    () => profile,
    () => {
      if (currentScreen === 'playing' && !isPaused) {
        isPaused = true;
        renderUi();
      }
    }
  );

  function unlockAudioOnce() {
    audio.unlock();
  }

  function handleResize() {
    renderer.resize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  function onKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.matches('input,textarea,select')) return;
    unlockAudioOnce();
    const code = e.code;
    keysHeld.add(code);

    if (currentScreen === 'intro' && (code === 'Space' || code === 'Enter' || code === 'Escape')) {
      finishIntro();
      return;
    }
    if (currentScreen !== 'playing' || !runState) return;

    if (code === 'Escape' || code === 'KeyP') {
      if (showInRunSkillTree) {
        showInRunSkillTree = false;
        renderUi();
        return;
      }
      isPaused = !isPaused;
      audio.playSfx('ui_click');
      renderUi();
      return;
    }
    if (code === 'KeyK' || code === 'Tab') {
      e.preventDefault();
      showInRunSkillTree = !showInRunSkillTree;
      audio.playSfx('ui_click');
      renderUi();
      return;
    }
    if (isPaused || runState.pendingLevelUps > 0 || showSpecChoiceModal) return;

    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
      e.preventDefault();
      input.mobilityPressed = true;
    }
    if (code === 'KeyE') {
      input.specialPressed = true;
    }
    if (code === 'KeyR' || code === 'KeyQ') {
      input.ultimatePressed = true;
    }
    if (code === 'KeyF') {
      input.interactPressed = true;
    }
    if (code === 'KeyT') {
      input.autoAttackEnabled = !input.autoAttackEnabled;
      audio.playSfx('ui_click');
      updateHudFast();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keysHeld.delete(e.code);
  }

  function onPointerMove(e: PointerEvent) {
    if (currentScreen !== 'playing' || !runState || e.pointerType === 'touch') return;
    const worldPt = renderer.screenToWorld(e.clientX, e.clientY, runState);
    const dx = worldPt.x - runState.player.x;
    const dy = worldPt.y - runState.player.y;
    const len = Math.hypot(dx, dy);
    if (len > 4) {
      input.aimX = dx / len;
      input.aimY = dy / len;
      input.isAiming = true;
    }
  }

  function onPointerDown(e: PointerEvent) {
    unlockAudioOnce();
    if (currentScreen !== 'playing' || !runState || e.pointerType === 'touch') return;
    if ((e.target as HTMLElement).closest('button,.arcana-modal,.arcana-hud-interactive')) return;
    if (e.button === 0) {
      input.primaryHeld = true;
    } else if (e.button === 2) {
      input.specialPressed = true;
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.button === 0) {
      input.primaryHeld = false;
    }
  }

  function onContextMenu(e: MouseEvent) {
    if (currentScreen === 'playing') e.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('contextmenu', onContextMenu);

  function finishIntro() {
    if (introTimer !== null) {
      clearTimeout(introTimer);
      introTimer = null;
    }
    profile.seenIntroAnimation = true;
    saveArcanaProfile(profile);
    currentScreen = 'menu';
    audio.setTheme('menu');
    audio.startMusic();
    renderUi();
  }

  function startNewAdventure(opts: { isTraining?: boolean; isTutorial?: boolean; resumeCheckpoint?: boolean }) {
    unlockAudioOnce();
    isPaused = false;
    showInRunSkillTree = false;
    showSpecChoiceModal = false;
    spentChiPointsInRun = 0;

    const checkpoint = opts.resumeCheckpoint ? profile.savedCheckpoint : null;
    const cls = checkpoint ? checkpoint.classId : selectedClassId;
    selectedClassId = cls;

    runState = createInitialRunState({
      classId: cls,
      ascensionLevel: checkpoint ? checkpoint.ascensionLevel : selectedAscension,
      isTraining: opts.isTraining,
      isTutorial: opts.isTutorial,
      checkpoint,
    });

    if (opts.isTraining) {
      spawnTrainingDummies(runState);
    }

    if (coop.isActive) {
      coop.localClassId = cls;
      coop.syncTick(0.016, runState);
    }

    if (!opts.isTraining && !opts.isTutorial && !checkpoint) {
      profile.totalRuns += 1;
      saveArcanaProfile(profile);
    }

    currentScreen = 'playing';
    audio.setTheme(runState.campaignId);
    audio.startMusic();
    renderUi();
  }

  function triggerSpecModalIfNeeded() {
    if (!runState) return;
    if (runState.player.level >= 2 && !runState.player.specializationId && !showSpecChoiceModal) {
      showSpecChoiceModal = true;
      renderUi();
    }
  }

  // ============================================================================
  // TRUE RADIAL CONSTELLATION SKILL WEB ("TEIA DE HABILIDADES & VERTENTES PRIMORDIAIS")
  // ============================================================================

  function getNodeCoordsPct(node: SkillWebNodeDef): { x: number; y: number } {
    const rad = (node.angleDeg * Math.PI) / 180;
    const scaledR = node.radiusPct * 0.46;
    return {
      x: 50 + Math.cos(rad) * scaledR,
      y: 50 + Math.sin(rad) * scaledR,
    };
  }

  function isWebNodeUnlocked(node: SkillWebNodeDef, classId: ArcanaClassId): boolean {
    if (unlockedWebNodes.has(node.id)) return true;
    const cls = ARCANA_CLASSES[classId];
    const specId = cls.specializations[node.branchIndex]?.id;
    if (runState && runState.player.classId === classId) {
      if (node.upgradeId && (runState.player.upgrades[node.upgradeId] || 0) > 0) return true;
      if (
        specId &&
        runState.player.specializationId === specId &&
        ((node.tier === 1 && runState.player.level >= 2) ||
          (node.tier === 2 && runState.player.level >= 5) ||
          (node.tier === 3 && runState.player.level >= 8))
      ) {
        return true;
      }
    }
    return false;
  }

  function canUnlockWebNode(node: SkillWebNodeDef, allNodes: SkillWebNodeDef[], classId: ArcanaClassId): boolean {
    if (isWebNodeUnlocked(node, classId)) return false;
    if (node.tier === 1) return true; // Tier 1 connects directly to the Central Elemental Core
    for (const other of allNodes) {
      if (
        (other.connectsTo.includes(node.id) || node.connectsTo.includes(other.id)) &&
        isWebNodeUnlocked(other, classId)
      ) {
        return true;
      }
    }
    return false;
  }

  function renderSkillTreeContent(classId: ArcanaClassId, interactiveInRun = false): string {
    const cls = ARCANA_CLASSES[classId];
    const nodes = SKILL_WEB_NODES.filter(n => n.classId === classId);
    const nodeMap = new Map<string, SkillWebNodeDef>();
    for (const n of nodes) nodeMap.set(n.id, n);

    const selectedNode =
      (selectedWebNodeId && nodeMap.get(selectedWebNodeId)) || nodes[0] || null;
    if (selectedNode) selectedWebNodeId = selectedNode.id;

    const playerLevel = runState?.player.level || 1;
    const availableChiPoints = runState
      ? Math.max(0, playerLevel - spentChiPointsInRun)
      : Math.max(1, Math.floor(profile.eternalEssence / 15) + 2);

    // Build SVG Constellation Lines (Core -> Tier 1 + Node -> Node connections)
    const svgLines: string[] = [];
    const drawnPairs = new Set<string>();

    for (const n of nodes) {
      const p1 = getNodeCoordsPct(n);
      const n1Unlocked = isWebNodeUnlocked(n, classId);

      // Connect Tier 1 nodes to the Central Elemental Core (50%, 50%)
      if (n.tier === 1) {
        const stroke = n1Unlocked ? cls.palette.glow : 'rgba(125,226,255,0.28)';
        const width = n1Unlocked ? '3' : '1.8';
        svgLines.push(
          `<line x1="50%" y1="50%" x2="${p1.x.toFixed(2)}%" y2="${p1.y.toFixed(2)}%" stroke="${stroke}" stroke-width="${width}" ${
            n1Unlocked ? 'stroke-dasharray="6 4"' : ''
          } />`
        );
      }

      for (const targetId of n.connectsTo) {
        const pairKey = [n.id, targetId].sort().join('--');
        if (drawnPairs.has(pairKey)) continue;
        drawnPairs.add(pairKey);

        const target = nodeMap.get(targetId);
        if (!target) continue;
        const p2 = getNodeCoordsPct(target);
        const n2Unlocked = isWebNodeUnlocked(target, classId);
        const bothUnlocked = n1Unlocked && n2Unlocked;
        const oneUnlocked = n1Unlocked || n2Unlocked;

        const stroke = bothUnlocked
          ? '#ffd166'
          : oneUnlocked
          ? cls.palette.glow
          : 'rgba(160, 148, 210, 0.24)';
        const width = bothUnlocked ? '3.2' : oneUnlocked ? '2.2' : '1.4';
        svgLines.push(
          `<line x1="${p1.x.toFixed(2)}%" y1="${p1.y.toFixed(2)}%" x2="${p2.x.toFixed(2)}%" y2="${p2.y.toFixed(2)}%" stroke="${stroke}" stroke-width="${width}" ${
            oneUnlocked && !bothUnlocked ? 'stroke-dasharray="5 5"' : ''
          } />`
        );
      }
    }

    // Sub-bending branch sector labels around outer perimeter
    const sectorAngles = [270, 30, 150];
    const sectorLabelsHtml = cls.specializations
      .map((spec, idx) => {
        const angRad = ((sectorAngles[idx] ?? 0) * Math.PI) / 180;
        const lx = 50 + Math.cos(angRad) * 45;
        const ly = 50 + Math.sin(angRad) * 45;
        const isSpecActive = runState?.player.specializationId === spec.id;
        return `
          <div style="position:absolute;left:${lx.toFixed(1)}%;top:${ly.toFixed(1)}%;transform:translate(-50%,-50%);padding:3px 10px;border-radius:99px;background:rgba(10,6,24,0.92);border:1px solid ${
            isSpecActive ? '#ffd166' : cls.palette.glow
          };font-size:10px;font-weight:800;color:${
            isSpecActive ? '#ffd166' : '#80ffdb'
          };white-space:nowrap;pointer-events:none;box-shadow:0 0 12px rgba(0,0,0,0.8);">
            ${spec.icon} ${spec.name}
          </div>
        `;
      })
      .join('');

    // Render each Constellation Node button
    const nodesHtml = nodes
      .map((n: SkillWebNodeDef) => {
        const pos = getNodeCoordsPct(n);
        const unlocked = isWebNodeUnlocked(n, classId);
        const unlockable = canUnlockWebNode(n, nodes, classId);
        const isSelected = selectedNode?.id === n.id;

        const size = n.tier === 4 ? 54 : n.tier === 3 ? 46 : n.tier === 2 ? 42 : 38;
        const borderCol = unlocked
          ? '#ffd166'
          : unlockable
          ? cls.palette.glow
          : 'rgba(255,255,255,0.22)';
        const bg = unlocked
          ? `radial-gradient(circle, ${cls.palette.primary}, #160c2e)`
          : unlockable
          ? 'radial-gradient(circle, rgba(45,32,84,0.95), rgba(14,9,28,0.98))'
          : 'rgba(12, 8, 24, 0.9)';
        const borderRadius = n.tier === 4 ? '12px' : '50%';
        const transform =
          n.tier === 4
            ? `translate(-50%,-50%) rotate(45deg) scale(${isSelected ? 1.15 : 1})`
            : `translate(-50%,-50%) scale(${isSelected ? 1.16 : 1})`;
        const innerTransform = n.tier === 4 ? 'rotate(-45deg)' : 'none';

        return `
          <button
            data-act="web-node:${n.id}"
            title="${n.name} (${n.subBendingName})"
            style="pointer-events:auto;position:absolute;left:${pos.x.toFixed(2)}%;top:${pos.y.toFixed(2)}%;width:${size}px;height:${size}px;border-radius:${borderRadius};border:${
              isSelected ? '3px' : '2px'
            } solid ${borderCol};background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transform:${transform};transition:transform 0.16s,box-shadow 0.16s;box-shadow:${
              unlocked
                ? `0 0 20px ${cls.palette.glow}, inset 0 0 10px #ffd166`
                : isSelected
                ? `0 0 18px ${cls.palette.glow}`
                : '0 4px 10px rgba(0,0,0,0.65)'
            };z-index:4;"
          >
            <div style="transform:${innerTransform};width:${n.tier === 4 ? '24px' : '19px'};height:${
              n.tier === 4 ? '24px' : '19px'
            };color:${unlocked ? '#ffd166' : unlockable ? cls.palette.accent : '#cfc4e8'};filter:${
              unlocked ? 'drop-shadow(0 0 6px #ffd166)' : 'none'
            };">${getSkillVectorIcon(n.name)}</div>
          </button>
        `;
      })
      .join('');

    // Selected Node Details & Action Button
    const selUnlocked = selectedNode ? isWebNodeUnlocked(selectedNode, classId) : false;
    const selCanUnlock = selectedNode ? canUnlockWebNode(selectedNode, nodes, classId) : false;

    return `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <!-- Header & Element Selector -->
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid rgba(125,226,255,0.22);padding-bottom:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${renderBenderPortraitBadge(classId, 52, cls.palette.accent)}
            <div>
              <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#80ffdb;">TEIA DE HABILIDADES & VERTENTES PRIMORDIAIS</span>
              <h3 style="margin:2px 0 0;font-size:20px;color:#ffd166;">${cls.name} — ${cls.title}</h3>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="padding:6px 12px;border-radius:99px;background:rgba(0,245,212,0.15);border:1px solid #00f5d4;font-size:12px;font-weight:800;color:#80ffdb;">
              ✦ Centelhas de Éter: ${availableChiPoints}
            </span>
            ${
              !interactiveInRun
                ? (['chess', 'chrono', 'chaos', 'rune'] as ArcanaClassId[])
                    .map(
                      id => `
                      <button data-act="tree-class:${id}" style="pointer-events:auto;padding:6px 12px;border-radius:8px;border:1px solid ${
                        id === classId ? '#ffd166' : 'rgba(255,255,255,0.2)'
                      };background:${
                        id === classId ? 'rgba(255,209,102,0.22)' : 'rgba(15,10,30,0.85)'
                      };color:#fff;cursor:pointer;font-weight:700;font-size:12px;">
                        ${ARCANA_CLASSES[id].primaryAttack.icon} ${ARCANA_CLASSES[id].name}
                      </button>`
                    )
                    .join('')
                : ''
            }
          </div>
        </div>

        <!-- Main Constellation Web Canvas + Node Inspector Sidebar -->
        <div style="display:grid;grid-template-columns:minmax(310px, 1.35fr) minmax(270px, 0.85fr);gap:16px;align-items:stretch;">
          <!-- Interactive Radial Constellation Web -->
          <div style="position:relative;width:100%;aspect-ratio:1/1;max-height:560px;margin:0 auto;border-radius:20px;background:radial-gradient(circle at 50% 50%, rgba(28, 18, 62, 0.95) 0%, rgba(9, 5, 22, 0.98) 72%, #04020a 100%);border:1px solid ${cls.palette.glow}55;box-shadow:inset 0 0 60px rgba(0,0,0,0.85), 0 0 28px rgba(0,0,0,0.6);overflow:hidden;">
            <!-- Concentric Orbital Rings & Constellation Lines SVG -->
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;">
              <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(125,226,255,0.12)" stroke-width="0.3" stroke-dasharray="1.5 1.5" />
              <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(125,226,255,0.12)" stroke-width="0.3" stroke-dasharray="1.5 1.5" />
              <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(255,209,102,0.14)" stroke-width="0.35" />
              ${svgLines.join('')}
            </svg>

            <!-- Sub-Bending Sector Badges -->
            ${sectorLabelsHtml}

            <!-- Central Elemental Core -->
            <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:72px;border-radius:50%;border:3px solid #ffd166;background-image:url('data:image/svg+xml;utf8,${encodeURIComponent(getAnimeGuardianSvg(classId))}');background-size:cover;background-position:center;box-shadow:0 0 28px ${cls.palette.glow}, 0 0 50px ${cls.palette.primary};z-index:5;display:flex;align-items:flex-end;justify-content:center;">
              <span style="font-size:9px;font-weight:900;background:#080512;color:#ffd166;padding:1px 6px;border-radius:99px;border:1px solid #ffd166;transform:translateY(8px);">NÚCLEO</span>
            </div>

            <!-- Interactive Constellation Nodes -->
            ${nodesHtml}
          </div>

          <!-- Right Sidebar: Selected Constellation Node Inspector & Sub-Bending Overview -->
          <div style="display:flex;flex-direction:column;justify-content:space-between;gap:12px;background:rgba(16,10,34,0.92);border:1px solid rgba(125,226,255,0.28);border-radius:16px;padding:16px;">
            ${
              selectedNode
                ? `
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px;background:rgba(125,226,255,0.15);color:#80ffdb;letter-spacing:1px;text-transform:uppercase;">
                      ${selectedNode.subBendingName} · Grau ${selectedNode.tier}
                    </span>
                    <span style="font-size:11px;font-weight:800;color:${
                      selUnlocked ? '#00f5d4' : selCanUnlock ? '#ffd166' : '#9d8ec4'
                    };">
                      ${selUnlocked ? '✦ NÓ DESBLOQUEADO' : selCanUnlock ? '🔓 DISPONÍVEL' : '🔒 REQUER NÓ ANTERIOR'}
                    </span>
                  </div>

                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                    <div style="width:48px;height:48px;border-radius:12px;border:2px solid #ffd166;background:rgba(255,209,102,0.15);display:flex;align-items:center;justify-content:center;font-size:26px;">
                      ${selectedNode.icon}
                    </div>
                    <div>
                      <h4 style="margin:0;font-size:18px;color:#fff;">${selectedNode.name}</h4>
                      <div style="font-size:12px;color:#ffd166;font-weight:700;">✦ ${selectedNode.visualEffectDesc}</div>
                    </div>
                  </div>

                  <p style="font-size:13px;color:#e2dbf0;line-height:1.5;margin:0 0 12px;padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);border-left:3px solid ${cls.palette.glow};">
                    ${selectedNode.description}
                  </p>

                  <div style="font-size:11px;color:#b8add4;margin-bottom:12px;">
                    <strong>Ligações na Teia:</strong> Conecta com ${selectedNode.connectsTo.length} nós de vertente adjacentes.
                  </div>

                  <button
                    data-act="unlock-web-node:${selectedNode.id}"
                    ${selUnlocked || (!selCanUnlock && availableChiPoints <= 0) ? 'disabled' : ''}
                    style="width:100%;padding:12px 16px;border-radius:12px;border:2px solid ${
                      selUnlocked
                        ? '#00f5d4'
                        : selCanUnlock && availableChiPoints > 0
                        ? '#ffd166'
                        : 'rgba(255,255,255,0.15)'
                    };background:${
                      selUnlocked
                        ? 'rgba(0,245,212,0.18)'
                        : selCanUnlock && availableChiPoints > 0
                        ? 'linear-gradient(135deg,#ffd166,#f77f00)'
                        : 'rgba(255,255,255,0.06)'
                    };color:${
                      selUnlocked
                        ? '#80ffdb'
                        : selCanUnlock && availableChiPoints > 0
                        ? '#140926'
                        : '#8a829e'
                    };font-weight:900;font-size:13px;cursor:${
                      selUnlocked || !(selCanUnlock && availableChiPoints > 0) ? 'default' : 'pointer'
                    };"
                  >
                    ${
                      selUnlocked
                        ? '✓ Vertente Ativa no Guardião'
                        : selCanUnlock && availableChiPoints > 0
                        ? `⚡ Desbloquear Nó na Teia (1 Centelha de Éter)`
                        : !selCanUnlock
                        ? 'Desbloqueia um Nó Conectado Primeiro'
                        : 'Sobe de Nível para Ganhar +Centelhas de Éter'
                    }
                  </button>
                </div>
              `
                : ''
            }

            <!-- 3 Sub-Bending Artery Summary -->
            <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">
              <div style="font-size:11px;font-weight:800;color:#7de2ff;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">
                3 Vertentes Primordiais de ${cls.name}:
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${cls.specializations
                  .map(
                    spec => `
                    <div style="padding:7px 10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid ${
                      runState?.player.specializationId === spec.id
                        ? '#ffd166'
                        : 'rgba(255,255,255,0.08)'
                    };display:flex;align-items:center;gap:8px;">
                      <span style="font-size:18px;">${spec.icon}</span>
                      <div style="flex:1;">
                        <div style="font-size:12px;font-weight:800;color:#fff;">${spec.name}</div>
                        <div style="font-size:10px;color:#b8add4;">${spec.subtitle}</div>
                      </div>
                    </div>`
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderUi() {
    uiLayer.innerHTML = '';

    const isPortraitMobile = window.innerHeight > window.innerWidth && window.innerWidth < 820;
    if (isPortraitMobile && !portraitDismissed) {
      const rot = document.createElement('div');
      rot.style.cssText =
        'position:fixed;inset:0;z-index:10050;background:rgba(7,3,18,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;pointer-events:auto;';
      rot.innerHTML = `
        <div style="font-size:54px;margin-bottom:12px;">📱↻</div>
        <h2 style="margin:0 0 8px;color:#ffd166;font-size:22px;">Roda o Dispositivo para Horizontal</h2>
        <p style="max-width:340px;color:#cfc4e8;font-size:14px;line-height:1.5;margin-bottom:20px;">
          <strong>Ascensão Arcana</strong> foi desenhado para orientação horizontal com controlos duplos ergonómicos e visão ampla da arena.
        </p>
        <button data-act="dismiss-portrait" style="padding:10px 20px;border-radius:10px;border:1px solid #7de2ff;background:rgba(125,226,255,0.18);color:#fff;font-weight:700;cursor:pointer;">
          Continuar Mesmo Assim
        </button>
      `;
      uiLayer.appendChild(rot);
    }

    // 1. OPENING ANIMATED ELEMENTAL CONVERGENCE SCENE
    if (currentScreen === 'intro') {
      const intro = document.createElement('div');
      intro.className = 'arcana-intro-scene';
      intro.style.cssText =
        'position:absolute;inset:0;background:radial-gradient(circle at center,#1d0f3d 0%,#05020d 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;text-align:center;padding:24px;';
      intro.innerHTML = `
        <div style="position:relative;width:180px;height:180px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
          <div style="position:absolute;inset:0;border-radius:50%;border:2px dashed #00bbf9;animation:spin 9s linear infinite;opacity:0.75;"></div>
          <div style="position:absolute;inset:22px;border-radius:50%;border:2px solid #ff5400;animation:spin 5s linear infinite reverse;opacity:0.85;"></div>
          <div style="width:32px;height:115px;border-radius:50%;background:linear-gradient(180deg,#00bbf9,#80ffdb,#ff5400,#52b788);box-shadow:0 0 48px #00bbf9,0 0 90px #ff5400;transform:rotate(18deg);"></div>
          <span style="position:absolute;top:-10px;left:25%;font-size:22px;">🌊</span>
          <span style="position:absolute;bottom:0;right:20%;font-size:22px;">🔥</span>
          <span style="position:absolute;top:35%;right:-8px;font-size:22px;">🌪️</span>
          <span style="position:absolute;bottom:25%;left:-8px;font-size:22px;">🪨</span>
        </div>
        <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#80ffdb;margin-bottom:6px;">
          A CONVERGÊNCIA DOS QUATRO ELEMENTOS
        </div>
        <h1 style="margin:0 0 10px;font-size:clamp(30px,5vw,52px);background:linear-gradient(90deg,#00bbf9,#ffffff,#ffd166,#ff5400);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 32px rgba(125,226,255,0.4);">
          ASCENSÃO ARCANA
        </h1>
        <p style="max-width:520px;color:#cfc4e8;font-size:14px;line-height:1.5;margin:0 0 24px;">
          Canaliza Maré, Tempestade, Cinza-Solar e Raiz-de-Ferro — e desperta Vertentes Ancestrais na luta contra a Corrupção do Oco.
        </p>
        <button data-act="skip-intro" style="padding:12px 28px;border-radius:99px;border:1px solid #ffd166;background:linear-gradient(135deg,#3d1e6d,#1b0d36);color:#ffd166;font-weight:800;font-size:14px;letter-spacing:1px;cursor:pointer;box-shadow:0 0 24px rgba(255,209,102,0.3);">
          DESPERTAR OS SELOS ✦
        </button>
      `;
      uiLayer.appendChild(intro);
      if (introTimer === null) {
        introTimer = window.setTimeout(() => finishIntro(), 4200);
      }
      bindUiActions();
      return;
    }

    // 2. MAIN MENU — RAVENSWATCH SPLIT-STAGE CHARACTER LOBBY
    if (currentScreen === 'menu') {
      const hasSave = !!profile.savedCheckpoint;
      const savedClass = hasSave ? ARCANA_CLASSES[profile.savedCheckpoint!.classId] : null;
      const curCls = ARCANA_CLASSES[selectedClassId];
      const menu = document.createElement('div');
      menu.style.cssText =
        'position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:max(14px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left));pointer-events:none;overflow:hidden;';
      menu.innerHTML = `
        <!-- Top Ornate Header -->
        <header style="pointer-events:auto;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;z-index:20;">
          <div style="display:flex;align-items:center;gap:12px;background:rgba(10,6,22,0.85);padding:8px 16px;border-radius:14px;border:1.5px solid rgba(255,209,102,0.4);backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(0,0,0,0.6);">
            <div style="width:32px;height:32px;color:#ffd166;">${skillIcon('crown')}</div>
            <div>
              <div style="font-size:10px;letter-spacing:2px;color:#80ffdb;text-transform:uppercase;font-weight:800;">DARK-FANTASY ROGUELITE · ESTILO RAVENSWATCH</div>
              <div style="font-size:19px;font-weight:900;color:#ffd166;letter-spacing:1px;">ASCENSÃO ARCANA</div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${
              hasSave
                ? `<button data-act="continue-run" style="padding:9px 16px;border-radius:10px;border:2px solid #00f5d4;background:rgba(0,245,212,0.22);color:#fff;font-weight:800;font-size:12px;cursor:pointer;box-shadow:0 0 14px rgba(0,245,212,0.4);">
                    ▶ Continuar (${savedClass?.name} · Fase ${profile.savedCheckpoint!.campaignIndex + 1}/5)
                  </button>`
                : ''
            }
            <button data-act="open-skill-tree" style="padding:9px 16px;border-radius:10px;border:1.5px solid #ffd166;background:rgba(255,209,102,0.18);color:#ffd166;font-weight:800;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;">
              <span style="width:16px;height:16px;display:inline-block;color:#ffd166;">${skillIcon('beams-aura')}</span> Teia de Vertentes
            </button>
            <button data-act="open-coop" style="padding:9px 14px;border-radius:10px;border:1px solid rgba(125,226,255,0.35);background:rgba(20,14,38,0.88);color:#7de2ff;font-weight:800;font-size:12px;cursor:pointer;">
              👥 Co-op (2J)
            </button>
            <button data-act="open-grimoire" style="padding:9px 14px;border-radius:10px;border:1px solid rgba(199,125,255,0.35);background:rgba(20,14,38,0.88);color:#e0aaff;font-weight:800;font-size:12px;cursor:pointer;">
              📖 Grimório
            </button>
            <button data-act="open-ascensions" style="padding:9px 14px;border-radius:10px;border:1px solid rgba(255,190,11,0.35);background:rgba(20,14,38,0.88);color:#ffbe0b;font-weight:800;font-size:12px;cursor:pointer;">
              🔥 Ascensão ${selectedAscension}
            </button>
            <button data-act="open-settings" style="padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.22);background:rgba(20,14,38,0.88);color:#fff;font-weight:800;font-size:12px;cursor:pointer;">
              ⚙
            </button>
            <button data-act="exit-platform" style="padding:9px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.22);background:rgba(20,14,36,0.85);color:#e2dbf0;font-weight:700;font-size:12px;cursor:pointer;">
              ← Sair
            </button>
          </div>
        </header>

        <!-- Main Body: Split-Stage Lobby -->
        <div style="display:flex;gap:24px;flex:1;align-items:stretch;margin:14px 0;position:relative;overflow:hidden;">
          <!-- Left Column: 4 Elemental Bender Cards (Zero distortion, 1:1 square portraits) -->
          <div style="pointer-events:auto;width:380px;max-width:40vw;display:flex;flex-direction:column;gap:10px;z-index:20;overflow-y:auto;padding-right:6px;">
            <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#80ffdb;text-transform:uppercase;">
              ESCOLHE O TEU GUARDIÃO PRIMORDIAL:
            </div>
            ${(['chess', 'chaos', 'chrono', 'rune'] as ArcanaClassId[])
              .map(id => {
                const c = ARCANA_CLASSES[id];
                const active = id === selectedClassId;
                return `
                  <div
                    data-act="pick-class:${id}"
                    style="border-radius:16px;border:${active ? '2.5px solid #ffd166' : `1.5px solid ${c.palette.glow}44`};background:${
                      active
                        ? 'linear-gradient(135deg,rgba(38,22,68,0.96),rgba(18,10,36,0.98))'
                        : 'rgba(14,8,28,0.88)'
                    };padding:10px;display:flex;gap:12px;align-items:center;cursor:pointer;box-shadow:${
                      active
                        ? `0 0 24px ${c.palette.glow}66, inset 0 0 16px rgba(255,209,102,0.25)`
                        : '0 6px 18px rgba(0,0,0,0.6)'
                    };transition:transform 0.15s,box-shadow 0.15s,border-color 0.15s;transform:${
                      active ? 'scale(1.02)' : 'scale(1)'
                    };"
                  >
                    <!-- Exact 1:1 Square Portrait Medallion -->
                    ${renderBenderPortraitBadge(id, 74, active ? '#ffd166' : c.palette.glow)}
                    <div style="flex:1;min-width:0;">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                        <span style="font-size:15px;font-weight:900;color:${active ? '#ffd166' : '#fff'};">${c.name}</span>
                        <span style="font-size:10px;padding:2px 6px;border-radius:6px;background:${c.palette.glow}22;border:1px solid ${c.palette.glow}66;color:${c.palette.accent};font-weight:800;">
                          ${c.title}
                        </span>
                      </div>
                      <div style="font-size:11px;color:#cfc4e8;margin-bottom:6px;display:flex;gap:8px;">
                        <span>♥ ${c.baseStats.maxHp} HP</span>
                        <span>⚔ ${c.baseStats.baseDamage} Dano</span>
                      </div>
                      <!-- 3 Vertentes Vector Badges -->
                      <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        ${c.specializations
                          .map(
                            sp => `
                            <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid ${c.palette.glow}33;font-size:10px;font-weight:700;color:#e2dbf0;">
                              <span style="width:12px;height:12px;display:inline-block;color:${c.palette.accent};">${getSkillVectorIcon(sp.name)}</span>
                              ${sp.name.replace('Vertente da ', '').replace('Vertente do ', '').replace('Vertente de ', '')}
                            </span>`
                          )
                          .join('')}
                      </div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>

          <!-- Right Area: Open 3D Viewport with Bottom Hero Control Bar -->
          <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;pointer-events:none;z-index:20;">
            <!-- Bottom Showcase Dock -->
            <div style="pointer-events:auto;background:radial-gradient(ellipse at 50% 50%,rgba(20,12,40,0.92),rgba(8,4,18,0.96));border:2px solid #ffd166;border-radius:20px;padding:16px 26px;display:flex;flex-direction:column;align-items:center;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,0.8), 0 0 30px rgba(255,209,102,0.3);max-width:680px;width:100%;backdrop-filter:blur(8px);">
              <div style="text-align:center;">
                <div style="font-size:11px;color:#80ffdb;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">
                  HERÓI 3D SELECIONADO: <span style="color:#ffd166;">${curCls.name.toUpperCase()}</span> (${curCls.title.toUpperCase()})
                </div>
              </div>

              <!-- 4 Framed Skill Slots of Selected Hero -->
              <div style="display:flex;gap:12px;align-items:center;">
                <div class="ravenswatch-skill-slot" title="${curCls.primaryAttack.name}">
                  <div style="width:30px;height:30px;color:#ffd166;">${getSkillVectorIcon(curCls.primaryAttack.name)}</div>
                  <div class="ravenswatch-keybind-pill">RATO</div>
                </div>
                <div class="ravenswatch-skill-slot" title="${curCls.specialSkill.name}">
                  <div style="width:30px;height:30px;color:#80ffdb;">${getSkillVectorIcon(curCls.specialSkill.name)}</div>
                  <div class="ravenswatch-keybind-pill">E</div>
                </div>
                <div class="ravenswatch-skill-slot" title="${curCls.mobilitySkill.name}">
                  <div style="width:30px;height:30px;color:#7de2ff;">${getSkillVectorIcon(curCls.mobilitySkill.name)}</div>
                  <div class="ravenswatch-keybind-pill">ESPAÇO</div>
                </div>
                <div class="ravenswatch-skill-slot" title="${curCls.ultimateSkill.name}">
                  <div style="width:30px;height:30px;color:#ff4ecd;">${getSkillVectorIcon(curCls.ultimateSkill.name)}</div>
                  <div class="ravenswatch-keybind-pill">R</div>
                </div>
              </div>

              <!-- Big Golden Button to Launch Expedition -->
              <div style="display:flex;gap:12px;width:100%;">
                <button
                  data-act="quick-play:${selectedClassId}"
                  class="fantasy-btn"
                  style="flex:1;padding:15px 28px;border-radius:14px;border:2px solid #ffd166;background:linear-gradient(135deg,#ffd166,#f77f00);color:#120824;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 0 24px rgba(255,209,102,0.5);letter-spacing:1px;"
                >
                  ⚔ DESPERTAR SELO PRIMORDIAL ✦
                </button>
                <button
                  data-act="start-training"
                  title="Treinar combos e dano contra bonecos"
                  style="padding:14px 20px;border-radius:14px;border:1.5px solid #80ffdb;background:rgba(128,255,219,0.15);color:#80ffdb;font-weight:800;font-size:13px;cursor:pointer;"
                >
                  🎯 Campo de Provas
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 5-Realm Campaign Progression Roadmap Footer -->
        <footer style="pointer-events:auto;display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-radius:12px;background:rgba(12,7,26,0.9);border:1px solid rgba(255,209,102,0.3);font-size:11px;color:#cfc4e8;flex-wrap:wrap;gap:8px;z-index:20;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <strong style="color:#ffd166;">Campanha dos 5 Selos de Aethra:</strong>
            <span>I. Cume de Nerath</span> →
            <span>II. Forja do Sol Negro</span> →
            <span>III. Mil Sinos dos Céus</span> →
            <span>IV. Cidadela de Durmak</span> →
            <span>V. Fenda Sem Estrelas</span>
          </div>
          <div style="display:flex;gap:12px;align-items:center;">
            <span>✦ Essência Arcana: <strong style="color:#80ffdb;">${profile.eternalEssence}</strong></span>
            <button data-act="start-tutorial" style="padding:4px 10px;border-radius:99px;border:1px solid #80ffdb;background:rgba(128,255,219,0.14);color:#80ffdb;font-weight:700;font-size:11px;cursor:pointer;">
              🎓 Tutorial Rápido
            </button>
          </div>
        </footer>
      `;
      uiLayer.appendChild(menu);
      bindUiActions();
      return;
    }

    // 3. CLASS DETAILS, DOJO & SUB-BENDING PREVIEW
    if (currentScreen === 'class_select') {
      const cls = ARCANA_CLASSES[selectedClassId];
      const posMap: Record<ArcanaClassId, string> = {
        chess: '0% 0%',
        rune: '100% 0%',
        chaos: '0% 100%',
        chrono: '100% 100%',
      };
      const modal = document.createElement('div');
      modal.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.94);display:flex;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));pointer-events:auto;overflow-y:auto;gap:12px;';
      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:11px;letter-spacing:2px;color:#7de2ff;">DETALHES DO GUARDIÃO & CAMPO DE PROVAS</div>
            <h2 style="margin:0;font-size:22px;color:#ffd166;">Escolhe o Teu Elemento</h2>
          </div>
          <div style="display:flex;gap:8px;">
            <button data-act="open-skill-tree" style="padding:8px 14px;border-radius:8px;border:1px solid #ffd166;background:rgba(255,209,102,0.18);color:#ffd166;font-weight:800;cursor:pointer;">
              🕸️ Ver Teia de Habilidades
            </button>
            <button data-act="back-menu" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(20,14,36,0.9);color:#fff;cursor:pointer;">
              ← Voltar
            </button>
          </div>
        </div>

        <!-- 4 Visual Element Switcher Tabs -->
        <div style="display:grid;grid-template-columns:repeat(4,minmax(160px,1fr));gap:10px;overflow-x:auto;">
          ${(['chess', 'chrono', 'chaos', 'rune'] as ArcanaClassId[])
            .map(id => {
              const c = ARCANA_CLASSES[id];
              const active = id === selectedClassId;
              return `
                <button data-act="pick-class:${id}" style="padding:10px;border-radius:14px;border:2.5px solid ${
                  active ? '#ffd166' : 'rgba(255,255,255,0.15)'
                };background:${
                  active
                    ? 'linear-gradient(160deg,rgba(45,28,88,0.96),rgba(14,9,32,0.98))'
                    : 'rgba(16,10,32,0.85)'
                };color:#fff;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                  ${renderBenderPortraitBadge(id, 54, active ? '#ffd166' : c.palette.primary)}
                  <div>
                    <div style="font-size:14px;font-weight:900;color:${active ? '#ffd166' : '#fff'};">${c.name}</div>
                    <div style="font-size:10px;color:#80ffdb;font-weight:700;">${c.specializations.map(s => s.icon).join(' ')} 3 Vertentes</div>
                  </div>
                </button>
              `;
            })
            .join('')}
        </div>

        <!-- Visual Showcase of Selected Bender -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;background:rgba(18,12,38,0.92);border:1.5px solid ${cls.palette.glow}66;border-radius:16px;padding:16px;">
          <!-- Left: Giant Portrait + Vertentes -->
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;gap:14px;align-items:center;">
              <div style="width:130px;height:130px;border-radius:18px;border:3px solid ${cls.palette.accent};background-image:url('data:image/svg+xml;utf8,${encodeURIComponent(getAnimeGuardianSvg(selectedClassId))}');background-size:cover;background-position:center;flex-shrink:0;box-shadow:0 0 28px ${cls.palette.glow}77;"></div>
              <div>
                <span style="font-size:11px;color:#80ffdb;font-weight:800;text-transform:uppercase;">${cls.title}</span>
                <h3 style="margin:2px 0 6px;font-size:24px;color:#fff;">${cls.name}</h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;font-weight:800;">
                  <span style="padding:4px 8px;border-radius:6px;background:rgba(255,107,139,0.16);color:#ff6b8b;">♥ ${cls.baseStats.maxHp} HP</span>
                  <span style="padding:4px 8px;border-radius:6px;background:rgba(255,209,102,0.16);color:#ffd166;">⚔ ${cls.baseStats.baseDamage} Dano</span>
                  <span style="padding:4px 8px;border-radius:6px;background:rgba(125,226,255,0.16);color:#7de2ff;">⚡ ${cls.baseStats.moveSpeed} Vel</span>
                </div>
              </div>
            </div>

            <div style="font-size:12px;font-weight:800;color:#ffd166;">3 Vertentes Ancestrais Desbloqueáveis:</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              ${cls.specializations
                .map(
                  sp => `
                  <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid ${cls.palette.glow}44;text-align:center;">
                    <div style="font-size:24px;margin-bottom:4px;">${sp.icon}</div>
                    <div style="font-size:11px;font-weight:900;color:#fff;">${sp.name.replace('Vertente da ', '').replace('Vertente do ', '').replace('Vertente de ', '')}</div>
                    <div style="font-size:10px;color:#80ffdb;">${sp.subtitle}</div>
                  </div>`
                )
                .join('')}
            </div>
          </div>

          <!-- Right: 5 Visual Skill Cards -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);border-left:3px solid #7de2ff;">
              <div style="font-size:12px;font-weight:900;color:#7de2ff;">${cls.primaryAttack.icon} ${cls.primaryAttack.name}</div>
              <div style="font-size:11px;color:#cfc4e8;margin-top:2px;">${cls.primaryAttack.description}</div>
            </div>
            <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);border-left:3px solid #ffd166;">
              <div style="font-size:12px;font-weight:900;color:#ffd166;">${cls.specialSkill.icon} [E] ${cls.specialSkill.name}</div>
              <div style="font-size:11px;color:#cfc4e8;margin-top:2px;">${cls.specialSkill.description}</div>
            </div>
            <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);border-left:3px solid #80ffdb;">
              <div style="font-size:12px;font-weight:900;color:#80ffdb;">${cls.mobilitySkill.icon} [Espaço] ${cls.mobilitySkill.name}</div>
              <div style="font-size:11px;color:#cfc4e8;margin-top:2px;">${cls.mobilitySkill.description}</div>
            </div>
            <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);border-left:3px solid #ff4ecd;">
              <div style="font-size:12px;font-weight:900;color:#ff99d8;">${cls.ultimateSkill.icon} [R] ${cls.ultimateSkill.name}</div>
              <div style="font-size:11px;color:#cfc4e8;margin-top:2px;">${cls.ultimateSkill.description}</div>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:auto;">
          <button data-act="start-training" style="padding:12px 20px;border-radius:12px;border:1px solid #7de2ff;background:rgba(125,226,255,0.16);color:#7de2ff;font-weight:800;font-size:14px;cursor:pointer;">
            🎯 Testar no Dojo de Treino
          </button>
          <button data-act="launch-campaign" style="padding:14px 28px;border-radius:12px;border:2px solid #ffd166;background:linear-gradient(135deg,#ffd166,#f77f00);color:#140926;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 0 25px rgba(255,209,102,0.45);">
            ⚔ JOGAR COM ${cls.name.toUpperCase()} ✦
          </button>
        </div>
      `;
      uiLayer.appendChild(modal);
      bindUiActions();
      return;
    }

    // 4. CONSTELLATION SKILL WEB SCREEN
    if (currentScreen === 'skill_tree') {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.96);padding:max(14px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));pointer-events:auto;overflow-y:auto;display:flex;flex-direction:column;gap:12px;';
      wrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <button data-act="back-menu" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(20,14,36,0.9);color:#fff;cursor:pointer;">
            ← Voltar ao Menu
          </button>
          <button data-act="open-class-select" style="padding:8px 16px;border-radius:8px;border:1px solid #ffd166;background:rgba(255,209,102,0.2);color:#ffd166;font-weight:800;cursor:pointer;">
            Escolher Guardião e Jogar →
          </button>
        </div>
        ${renderSkillTreeContent(selectedClassId, false)}
      `;
      uiLayer.appendChild(wrap);
      bindUiActions();
      return;
    }

    // 5. MULTIPLAYER CO-OP LOBBY
    if (currentScreen === 'coop_lobby') {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.94);padding:24px;pointer-events:auto;overflow-y:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;';
      wrap.innerHTML = `
        <div style="max-width:620px;width:100%;background:rgba(20,12,42,0.95);border:1px solid rgba(125,226,255,0.35);border-radius:16px;padding:22px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div>
              <span style="font-size:11px;color:#7de2ff;letter-spacing:2px;">COOPERATIVO ONLINE DE 2 GUARDIÕES</span>
              <h2 style="margin:2px 0 0;color:#ffd166;">Pacto dos Guardiões</h2>
            </div>
            <button data-act="back-menu" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#fff;cursor:pointer;">← Voltar</button>
          </div>
          <p style="font-size:13px;color:#cfc4e8;line-height:1.5;margin-bottom:16px;">
            Combina vertentes em dupla com outro jogador (via código de sala sincronizado) ou invoca um <strong>Guardião Aliado de IA</strong> que conjura técnicas em sinergia contigo!
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="padding:14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(125,226,255,0.2);">
              <h4 style="margin:0 0 8px;color:#80ffdb;">Criar Sala Cooperativa</h4>
              <button data-act="coop-create" style="width:100%;padding:10px;border-radius:8px;border:1px solid #00f5d4;background:rgba(0,245,212,0.2);color:#fff;font-weight:700;cursor:pointer;">
                Gerar Código de Sala
              </button>
              ${
                coop.roomCode
                  ? `<div style="margin-top:10px;padding:8px;border-radius:8px;background:#120824;text-align:center;font-size:18px;font-weight:900;color:#ffd166;letter-spacing:2px;">${coop.roomCode}</div>`
                  : ''
              }
            </div>

            <div style="padding:14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,209,102,0.2);">
              <h4 style="margin:0 0 8px;color:#ffd166;">Entrar numa Sala</h4>
              <input id="arcana-room-input" placeholder="Ex: ARC-742" value="${coop.roomCode || ''}" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:#0d071c;color:#fff;margin-bottom:8px;font-weight:700;" />
              <button data-act="coop-join" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ffd166;background:rgba(255,209,102,0.2);color:#ffd166;font-weight:700;cursor:pointer;">
                Conectar à Sala
              </button>
            </div>
          </div>

          <button data-act="coop-start-ai" style="width:100%;padding:14px;border-radius:12px;border:2px solid #00bbf9;background:linear-gradient(135deg,rgba(0,187,249,0.28),rgba(58,20,88,0.92));color:#fff;font-weight:800;font-size:15px;cursor:pointer;">
            ⚡ Iniciar Aventura Cooperativa Agora (Com Guardião Aliado)
          </button>
        </div>
      `;
      uiLayer.appendChild(wrap);
      bindUiActions();
      return;
    }

    // 6. GRIMÓRIO / PERGAMINHOS ELEMENTAIS
    if (currentScreen === 'grimoire') {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.95);padding:20px;pointer-events:auto;overflow-y:auto;display:flex;flex-direction:column;gap:14px;';
      let tabHtml = '';
      if (grimoireTab === 'classes') {
        tabHtml = renderSkillTreeContent(selectedClassId, false);
      } else if (grimoireTab === 'upgrades') {
        tabHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">
          ${ARCANA_UPGRADES.map(
            u => `
            <div style="padding:12px;border-radius:10px;background:rgba(20,14,40,0.9);border:1px solid rgba(125,226,255,0.22);">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#ffd166;margin-bottom:4px;">
                <span>${u.icon} ${CATEGORY_LABELS[u.category]}</span>
                <span>${RARITY_LABELS[u.rarity]}</span>
              </div>
              <div style="font-weight:800;font-size:14px;color:#fff;margin-bottom:4px;">${u.name}</div>
              <div style="font-size:12px;color:#cfc4e8;margin-bottom:6px;">${u.shortDesc}</div>
              <div style="font-size:11px;color:#80ffdb;font-style:italic;">${u.behaviorTransformation}</div>
            </div>`
          ).join('')}
        </div>`;
      } else if (grimoireTab === 'enemies') {
        tabHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;">
          ${Object.values(ARCANA_ENEMIES)
            .map(
              e => `
            <div style="padding:12px;border-radius:10px;background:rgba(20,14,40,0.9);border:1px solid ${e.palette.eyeGlow}55;">
              <div style="font-size:11px;color:${e.palette.eyeGlow};font-weight:700;">${e.role}</div>
              <div style="font-size:15px;font-weight:800;color:#fff;margin:2px 0 6px;">${e.name}</div>
              <div style="font-size:12px;color:#cfc4e8;margin-bottom:8px;">${e.description}</div>
              <div style="font-size:11px;color:#9d8ec4;">♥ Vida: ${e.maxHp} · ⚔ Dano: ${e.damage} · ⚡ Vel: ${e.speed}</div>
            </div>`
            )
            .join('')}
        </div>`;
      } else if (grimoireTab === 'bosses') {
        tabHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
          ${ARCANA_CAMPAIGNS.map(
            c => `
            <div style="padding:14px;border-radius:12px;background:rgba(22,12,44,0.92);border:1px solid ${c.boss.palette.glow};">
              <div style="font-size:11px;color:#ffd166;">Campanha ${c.roman} — ${c.name}</div>
              <h4 style="margin:4px 0 2px;font-size:17px;color:#fff;">${c.boss.name}</h4>
              <div style="font-size:12px;color:${c.boss.palette.glow};margin-bottom:8px;">${c.boss.title}</div>
              <p style="font-size:12px;color:#cfc4e8;line-height:1.4;margin:0 0 8px;">${c.boss.lore}</p>
              <div style="font-size:11px;color:#ff99d8;">${c.boss.phases.length} Fases de Combate · ♥ ${c.boss.maxHp} HP</div>
            </div>`
          ).join('')}
        </div>`;
      } else {
        tabHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;">
          ${ARCANA_CAMPAIGNS.map(
            c => `
            <div style="padding:14px;border-radius:12px;background:rgba(20,14,38,0.92);border:1px solid ${c.palette.accentRunes};">
              <div style="font-size:11px;color:${c.palette.accentRunes};font-weight:800;">CAMPANHA ${c.roman}</div>
              <h4 style="margin:4px 0;font-size:17px;color:#fff;">${c.name}</h4>
              <div style="font-size:12px;color:#ffd166;margin-bottom:6px;">${c.subtitle}</div>
              <p style="font-size:12px;color:#cfc4e8;margin:0 0 8px;">${c.themeDescription}</p>
              <div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.05);font-size:11px;color:#80ffdb;">
                <strong>Mecânica Elemental (${c.environmentalMechanic.name}):</strong> ${c.environmentalMechanic.description}
              </div>
            </div>`
          ).join('')}
        </div>`;
      }

      wrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <span style="font-size:11px;color:#e0aaff;letter-spacing:2px;">ARQUIVOS PRIMORDIAIS DE AETHRA</span>
            <h2 style="margin:0;color:#ffd166;">Pergaminhos de Vertentes & Selos</h2>
          </div>
          <button data-act="back-menu" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(20,14,36,0.9);color:#fff;cursor:pointer;">← Voltar</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${(
            [
              ['classes', '🕸️ Teia de Habilidades'],
              ['upgrades', `📜 Técnicas & Vertentes (${ARCANA_UPGRADES.length})`],
              ['enemies', '👾 Inimigos (10)'],
              ['bosses', '👑 Guardiões & Senhores Corrompidos (6)'],
              ['biomes', '🏛 Reinos & Selos Primordiais (6)'],
            ] as const
          )
            .map(
              ([id, label]) => `
              <button data-act="grim-tab:${id}" style="padding:8px 14px;border-radius:8px;border:1px solid ${
                grimoireTab === id ? '#ffd166' : 'rgba(255,255,255,0.18)'
              };background:${
                grimoireTab === id ? 'rgba(255,209,102,0.22)' : 'rgba(18,12,34,0.85)'
              };color:#fff;font-weight:700;cursor:pointer;">${label}</button>`
            )
            .join('')}
        </div>
        <div style="flex:1;overflow-y:auto;">${tabHtml}</div>
      `;
      uiLayer.appendChild(wrap);
      bindUiActions();
      return;
    }

    // 7. ASCENSIONS DIFFICULTY SELECTOR
    if (currentScreen === 'ascensions') {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.94);padding:24px;pointer-events:auto;overflow-y:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;';
      wrap.innerHTML = `
        <div style="max-width:600px;width:100%;background:rgba(20,12,42,0.95);border:1px solid rgba(255,190,11,0.35);border-radius:16px;padding:22px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h2 style="margin:0;color:#ffd166;">🔥 Graus de Ascensão Elemental</h2>
            <button data-act="back-menu" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#fff;cursor:pointer;">← Voltar</button>
          </div>
          <p style="font-size:13px;color:#cfc4e8;margin-bottom:14px;">
            Escolhe o nível de desafio espiritual. Graus superiores aumentam a ferocidade dos Mestres Guardiões e os Pontos de Chi recebidos.
          </p>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            <button data-act="pick-asc:0" style="padding:12px;border-radius:10px;border:2px solid ${
              selectedAscension === 0 ? '#00f5d4' : 'rgba(255,255,255,0.15)'
            };background:rgba(255,255,255,0.05);color:#fff;text-align:left;cursor:pointer;">
              <strong>Ascensão 0 — Harmonia Padrão</strong> · Equilíbrio original das cinco campanhas.
            </button>
            ${ASCENSION_MODIFIERS.map(
              m => `
              <button data-act="pick-asc:${m.level}" style="padding:12px;border-radius:10px;border:2px solid ${
                selectedAscension === m.level ? '#ffd166' : 'rgba(255,255,255,0.15)'
              };background:rgba(255,255,255,0.05);color:#fff;text-align:left;cursor:pointer;">
                <div style="font-weight:800;color:#ffd166;">${m.name}</div>
                <div style="font-size:12px;color:#cfc4e8;">${m.description}</div>
              </button>`
            ).join('')}
          </div>
        </div>
      `;
      uiLayer.appendChild(wrap);
      bindUiActions();
      return;
    }

    // 8. SETTINGS MODAL
    if (currentScreen === 'settings') {
      const s = profile.settings;
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.94);padding:24px;pointer-events:auto;overflow-y:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;';
      wrap.innerHTML = `
        <div style="max-width:540px;width:100%;background:rgba(20,12,42,0.95);border:1px solid rgba(125,226,255,0.3);border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h2 style="margin:0;color:#ffd166;">⚙ Definições</h2>
            <button data-act="back-menu" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#fff;cursor:pointer;">← Guardar e Voltar</button>
          </div>

          <div>
            <div style="font-size:12px;font-weight:700;color:#7de2ff;margin-bottom:6px;">Perfil de Qualidade Gráfica & Partículas 2.5D</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              ${(['economico', 'equilibrado', 'alto'] as QualityProfile[])
                .map(
                  q => `
                  <button data-act="set-quality:${q}" style="padding:10px;border-radius:8px;border:1px solid ${
                    s.quality === q ? '#ffd166' : 'rgba(255,255,255,0.2)'
                  };background:${
                    s.quality === q ? 'rgba(255,209,102,0.22)' : 'rgba(255,255,255,0.05)'
                  };color:#fff;font-weight:700;text-transform:capitalize;cursor:pointer;">${q}</button>`
                )
                .join('')}
            </div>
          </div>

          <label style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
            <span>Volume da Música (${Math.round(s.musicVolume * 100)}%)</span>
            <input type="range" min="0" max="1" step="0.05" value="${s.musicVolume}" data-setting-range="musicVolume" />
          </label>
          <label style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
            <span>Volume de Efeitos (${Math.round(s.sfxVolume * 100)}%)</span>
            <input type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}" data-setting-range="sfxVolume" />
          </label>
          <label style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
            <span>Volume de Ambiente (${Math.round(s.ambienceVolume * 100)}%)</span>
            <input type="range" min="0" max="1" step="0.05" value="${s.ambienceVolume}" data-setting-range="ambienceVolume" />
          </label>

          <label style="display:flex;justify-content:space-between;align-items:center;font-size:13px;cursor:pointer;">
            <span>Ataque Primordial Automático por Padrão</span>
            <input type="checkbox" ${s.autoAttackDefault ? 'checked' : ''} data-setting-check="autoAttackDefault" />
          </label>
          <label style="display:flex;justify-content:space-between;align-items:center;font-size:13px;cursor:pointer;">
            <span>Reduzir Clarões Intensos (Acessibilidade)</span>
            <input type="checkbox" ${s.reducedFlashes ? 'checked' : ''} data-setting-check="reducedFlashes" />
          </label>
        </div>
      `;
      uiLayer.appendChild(wrap);
      bindUiActions();
      return;
    }

    // 9. IN-GAME POWERS UX, HUD & INTERACTIVE MODALS
    if (currentScreen === 'playing' && runState) {
      const st = runState;
      const p = st.player;
      const cls = ARCANA_CLASSES[p.classId];
      const camp = ARCANA_CAMPAIGNS.find(c => c.id === st.campaignId) || ARCANA_CAMPAIGNS[0];

      const hud = document.createElement('div');
      hud.className = 'arcana-hud';
      hud.style.cssText =
        'position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding:max(10px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));';

      hud.innerHTML = `
        <!-- Top Bar: Objective Tracker & Utilities -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;width:100%;">
          <!-- Top-Left: Mini Campaign Progress Breadcrumb -->
          <div style="pointer-events:auto;background:rgba(10,6,22,0.85);border:1px solid rgba(255,209,102,0.3);border-radius:12px;padding:6px 14px;backdrop-filter:blur(8px);display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px rgba(0,0,0,0.6);">
            ${(['runes', 'ash', 'cloister', 'hourglasses', 'rift'] as const)
              .map((cid, idx) => {
                const active = st.campaignId === cid;
                const done = st.campaignIndex > idx && st.campaignId !== 'infinite';
                const labels = ['I.Água', 'II.Fogo', 'III.Ar', 'IV.Terra', 'V.Espírito'];
                return `<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:900;background:${
                  active ? '#ffd166' : done ? 'rgba(0,245,212,0.22)' : 'rgba(255,255,255,0.05)'
                };color:${active ? '#140926' : done ? '#80ffdb' : '#7a708e'};">${labels[idx]}</span>`;
              })
              .join('<span style="color:#5a5072;font-size:10px;">→</span>')}
          </div>

          <!-- Top-Right: Ravenswatch Quest Box & Clock & Pause/Tree Shortcuts -->
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:auto;">
            <!-- Quest Box -->
            <div style="background:rgba(12,8,26,0.92);border:1.5px solid #d4af37;border-radius:12px;padding:8px 16px;min-width:260px;box-shadow:0 6px 20px rgba(0,0,0,0.7);backdrop-filter:blur(8px);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:10px;font-weight:800;letter-spacing:1px;color:#ffd166;text-transform:uppercase;">
                  ${st.isTrainingArena ? '🎯 DOJO DE TREINO' : camp.name.toUpperCase()}
                </span>
                <span style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:900;color:#fff;">
                  ⏱ <span id="arc-hud-timer">00:00</span>
                </span>
              </div>
              <div style="font-size:11px;font-weight:900;color:#f0e6d2;margin-bottom:4px;">
                <span id="arc-hud-stage-pct">Progresso até ao Boss: 0%</span>
              </div>
              <div style="width:100%;height:6px;background:#1a102a;border-radius:99px;overflow:hidden;border:1px solid rgba(255,209,102,0.2);">
                <div id="arc-hud-stage-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#00bbf9,#ffd166,#ff5400);transition:width 0.2s;"></div>
              </div>
            </div>

            <!-- Boss HP Header if Active -->
            <div id="arc-hud-boss-wrap" style="width:100%;display:${st.boss ? 'block' : 'none'};background:rgba(28,6,20,0.95);border:1.5px solid #ff4d6d;border-radius:10px;padding:6px 12px;box-shadow:0 0 20px rgba(255,77,109,0.4);">
              <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:900;color:#ffd166;margin-bottom:3px;">
                <span id="arc-hud-boss-name">${st.boss ? `👑 ${st.boss.def.name}` : ''}</span>
                <span id="arc-hud-boss-hp">${st.boss ? `${Math.ceil(st.boss.hp)} / ${st.boss.maxHp}` : ''}</span>
              </div>
              <div style="width:100%;height:8px;background:#240818;border-radius:99px;overflow:hidden;">
                <div id="arc-hud-boss-fill" style="height:100%;width:${st.boss ? Math.max(0, (st.boss.hp / st.boss.maxHp) * 100) : 100}%;background:linear-gradient(90deg,#ff0054,#ffbe0b);"></div>
              </div>
            </div>

            <!-- Quick Action Pills -->
            <div style="display:flex;gap:6px;">
              ${
                st.isTrainingArena
                  ? `<button data-act="training-levelup" style="padding:6px 10px;border-radius:8px;border:1px solid #00f5d4;background:rgba(0,245,212,0.2);color:#80ffdb;font-size:11px;font-weight:800;cursor:pointer;">+ Nível</button>
                     <button data-act="training-boss" style="padding:6px 10px;border-radius:8px;border:1px solid #ff4d6d;background:rgba(255,77,109,0.2);color:#ff99ac;font-size:11px;font-weight:800;cursor:pointer;">Boss</button>`
                  : ''
              }
              <button data-act="toggle-inrun-tree" title="Teia de Vertentes (K)" style="padding:6px 12px;border-radius:8px;border:1.5px solid #ffd166;background:rgba(20,12,38,0.9);color:#ffd166;font-weight:800;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                <span style="width:14px;height:14px;display:inline-block;color:#ffd166;">${skillIcon('beams-aura')}</span> Teia [K]
              </button>
              <button data-act="toggle-pause" title="Pausa (Esc)" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(16,10,34,0.9);color:#fff;font-weight:800;font-size:11px;cursor:pointer;">
                Ⅱ
              </button>
            </div>
          </div>
        </div>

        <div id="arc-hud-banner" style="align-self:center;padding:8px 20px;border-radius:10px;background:rgba(18,10,40,0.94);border:1.5px solid #ffd166;font-size:13px;font-weight:900;color:#ffd166;display:none;text-align:center;box-shadow:0 0 24px rgba(255,209,102,0.4);pointer-events:none;"></div>

        <!-- Center Contextual Interact Button (Appears near Shrines/Portals) -->
        <div style="align-self:center;pointer-events:auto;margin-bottom:8px;">
          <button id="arc-btn-interact" data-act="hud-interact" style="display:none;padding:12px 26px;border-radius:99px;border:2.5px solid #ffd166;background:linear-gradient(135deg,#3d1e6d,#140926);color:#ffd166;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 0 26px rgba(255,209,102,0.6);">
            ✋ Interagir com Santuário [F]
          </button>
          ${
            st.phase === 'F_CONCLUSION'
              ? `<button data-act="next-campaign" style="padding:14px 28px;border-radius:99px;border:2px solid #00f5d4;background:linear-gradient(135deg,#00f5d4,#1b3b5c);color:#08121e;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 0 30px #00f5d4;">
                  🌀 ATRAVESSAR O PORTAL DO PRÓXIMO SELO →
                </button>`
              : ''
          }
        </div>

        <!-- Bottom Ravenswatch Dock: Left Status & Stats + Center Framed Skills -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;width:100%;pointer-events:none;">
          <!-- Bottom-Left: Ravenswatch Diamond Level Crest + Angled Emerald Health Bar + 4 Stats -->
          <div style="pointer-events:auto;display:flex;flex-direction:column;gap:6px;background:rgba(8,5,18,0.88);padding:12px 16px;border-radius:16px;border:1.5px solid rgba(255,209,102,0.35);backdrop-filter:blur(8px);box-shadow:0 8px 26px rgba(0,0,0,0.7);">
            <!-- Active Vertente Badges Diagonally Floating -->
            <div style="display:flex;gap:6px;margin-bottom:2px;">
              ${cls.specializations
                .map(
                  sp => `
                  <div title="${sp.name}" style="width:22px;height:22px;background:#1a102e;border:1.5px solid #ffd166;transform:rotate(45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(255,209,102,0.4);">
                    <div style="transform:rotate(-45deg);width:14px;height:14px;color:#ffd166;">${getSkillVectorIcon(sp.name)}</div>
                  </div>`
                )
                .join('')}
              <div id="arc-hud-passive" style="font-size:10px;font-weight:800;color:#80ffdb;margin-left:6px;align-self:center;"></div>
            </div>

            <!-- Diamond Level Badge + Angled Emerald Health Bar -->
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="ravenswatch-level-diamond">
                <span id="arc-hud-lv" class="ravenswatch-level-num">1</span>
              </div>
              <div>
                <div class="ravenswatch-hp-container">
                  <div id="arc-hud-hp-fill" class="ravenswatch-hp-fill" style="width:100%;"></div>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;text-shadow:0 1px 4px #000;">
                    <span id="arc-hud-hp-text">${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}</span>
                  </div>
                </div>
                <!-- XP Micro Bar -->
                <div style="width:220px;height:4px;background:#140d24;border-radius:2px;overflow:hidden;margin-top:4px;">
                  <div id="arc-hud-xp-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#00f5d4,#ffd166);"></div>
                </div>
              </div>
            </div>

            <!-- 4 Ravenswatch Stat Counters -->
            <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;color:#cfc4e8;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1);">
              <span title="Dano">⚔ <span id="arc-hud-stat-dmg">${Math.round(cls.baseStats.baseDamage * (1 + (p.level - 1) * 0.1))}</span></span>
              <span title="Armadura">🛡 <span id="arc-hud-stat-def">${Math.round(p.shield)}</span></span>
              <span title="Crítico">⚡ <span id="arc-hud-stat-crit">${Math.round(cls.baseStats.critChance * 100)}%</span></span>
              <span title="Fragmentos Arcanos" style="color:#80ffdb;"><span id="arc-hud-frags">◈ ${p.arcaneFragments}</span></span>
            </div>
          </div>

          <!-- Bottom-Center: Hero Portrait Crest + 5 Framed Square Skill Slots (Ravenswatch Hotbar) -->
          <div style="pointer-events:auto;display:flex;align-items:center;gap:10px;background:rgba(8,5,18,0.92);padding:10px 18px;border-radius:18px;border:1.5px solid rgba(255,209,102,0.4);backdrop-filter:blur(8px);box-shadow:0 10px 30px rgba(0,0,0,0.8);">
            <!-- Hero Crest -->
            <div style="position:relative;margin-right:4px;">
              ${renderBenderPortraitBadge(p.classId, 54, cls.palette.accent)}
            </div>

            <!-- 5 Framed Skill Slots -->
            <!-- 1. Primary Attack -->
            <button id="arc-joy-aim" class="ravenswatch-skill-slot" data-act="hud-primary" title="${cls.primaryAttack.name} [Rato]">
              <div style="width:28px;height:28px;color:#ffd166;">${getSkillVectorIcon(cls.primaryAttack.name)}</div>
              <div class="ravenswatch-keybind-pill">RATO</div>
            </button>

            <!-- 2. Special Skill -->
            <button id="arc-btn-special" class="ravenswatch-skill-slot" data-act="hud-special" title="${cls.specialSkill.name} [E]">
              <div style="width:28px;height:28px;color:#80ffdb;">${getSkillVectorIcon(cls.specialSkill.name)}</div>
              <div class="ravenswatch-keybind-pill">E</div>
              <div id="arc-cd-special" style="position:absolute;font-size:10px;font-weight:900;color:#ffd166;"></div>
            </button>

            <!-- 3. Mobility Dash -->
            <button id="arc-btn-dash" class="ravenswatch-skill-slot" data-act="hud-dash" title="${cls.mobilitySkill.name} [Espaço]">
              <div style="width:28px;height:28px;color:#7de2ff;">${getSkillVectorIcon(cls.mobilitySkill.name)}</div>
              <div class="ravenswatch-keybind-pill">ESPAÇO</div>
              <div id="arc-cd-dash" style="position:absolute;font-size:10px;font-weight:900;color:#80ffdb;"></div>
            </button>

            <!-- 4. Vertente Active / Trait -->
            <button class="ravenswatch-skill-slot" title="Técnica de Vertente Primordial [Q]">
              <div style="width:28px;height:28px;color:#ff99c8;">${getSkillVectorIcon(cls.specializations[0]?.name || 'chi')}</div>
              <div class="ravenswatch-keybind-pill">Q</div>
            </button>

            <!-- 5. Habilidade de Ascensão Primordial -->
            <button id="arc-btn-ult" class="ravenswatch-skill-slot" data-act="hud-ult" title="${cls.ultimateSkill.name} [R]">
              <div style="width:28px;height:28px;color:#ff4ecd;">${getSkillVectorIcon(cls.ultimateSkill.name)}</div>
              <div class="ravenswatch-keybind-pill">R</div>
              <div id="arc-cd-ult" style="position:absolute;font-size:10px;font-weight:900;color:#ff99d8;"></div>
            </button>

            <!-- Auto Attack Toggle -->
            <button id="arc-btn-auto" data-act="hud-auto" style="margin-left:6px;padding:6px 10px;border-radius:8px;border:1px solid ${
              input.autoAttackEnabled ? '#00f5d4' : 'rgba(255,255,255,0.2)'
            };background:${
              input.autoAttackEnabled ? 'rgba(0,245,212,0.22)' : 'rgba(16,10,32,0.85)'
            };color:#fff;font-size:9px;font-weight:800;cursor:pointer;">
              AUTO<br/>${input.autoAttackEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <!-- Bottom-Right placeholder for Minimap alignment (Minimap is rendered directly on 3D canvas) -->
          <div style="width:160px;height:10px;"></div>
        </div>
      `;
      uiLayer.appendChild(hud);
      bindTouchJoysticks();

      // SUB-BENDING SPECIALIZATION PICKER MODAL (Level 2 unlock!)
      if (showSpecChoiceModal && !p.specializationId) {
        const specModal = document.createElement('div');
        specModal.className = 'arcana-modal';
        specModal.style.cssText =
          'position:absolute;inset:0;background:rgba(6,3,16,0.9);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;pointer-events:auto;z-index:10010;overflow-y:auto;';
        specModal.innerHTML = `
          <div style="max-width:840px;width:100%;text-align:center;">
            <span style="font-size:11px;letter-spacing:3px;color:#80ffdb;text-transform:uppercase;">DESPERTAR DE VERTENTE · NÍVEL ${p.level}</span>
            <h2 style="margin:4px 0 6px;font-size:26px;color:#ffd166;">Escolhe a Tua Vertente Primordial</h2>
            <p style="font-size:13px;color:#cfc4e8;margin:0 0 18px;">
              Esta escolha desperta a tua Vertente ancestral na Teia de Habilidades e desbloqueia técnicas avançadas nos níveis 5 e 8.
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:14px;">
              ${cls.specializations
                .map(
                  spec => `
                  <button data-act="choose-spec:${spec.id}" style="padding:16px;border-radius:14px;border:2px solid #ffd166;background:linear-gradient(165deg,rgba(44,24,78,0.95),rgba(16,10,34,0.98));color:#fff;text-align:left;cursor:pointer;transition:transform 0.15s;">
                    <div style="font-size:32px;margin-bottom:6px;">${spec.icon}</div>
                    <div style="font-size:17px;font-weight:900;color:#ffd166;">${spec.name}</div>
                    <div style="font-size:11px;color:#80ffdb;margin-bottom:8px;">${spec.subtitle}</div>
                    <p style="font-size:12px;color:#e2dbf0;line-height:1.45;margin:0 0 10px;">${spec.description}</p>
                    <div style="font-size:11px;color:#b8add4;">
                      Nós da Teia: <strong>${spec.keyNodes.join(' → ')}</strong>
                    </div>
                  </button>`
                )
                .join('')}
            </div>
          </div>
        `;
        uiLayer.appendChild(specModal);
      }

      // 3-TECHNIQUE LEVEL UP DRAFT MODAL
      else if (st.pendingLevelUps > 0 && st.currentUpgradeChoices.length > 0) {
        const draftModal = document.createElement('div');
        draftModal.className = 'arcana-modal';
        draftModal.style.cssText =
          'position:absolute;inset:0;background:rgba(6,3,16,0.88);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;pointer-events:auto;z-index:10010;overflow-y:auto;';
        draftModal.innerHTML = `
          <div style="max-width:860px;width:100%;text-align:center;">
            <div style="font-size:11px;letter-spacing:3px;color:#00f5d4;text-transform:uppercase;">DESPERTAR DO ÉTER · NÍVEL ${p.level}</div>
            <h2 style="margin:4px 0 14px;font-size:24px;color:#ffd166;">Escolhe uma Nova Técnica ou Vertente</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:14px;margin-bottom:14px;">
              ${st.currentUpgradeChoices
                .map(card => {
                  const curStacks = p.upgrades[card.id] || 0;
                  const borderCol =
                    card.rarity === 'mythic'
                      ? '#ff007f'
                      : card.rarity === 'legendary'
                      ? '#ffd166'
                      : card.rarity === 'epic'
                      ? '#c77dff'
                      : card.rarity === 'rare'
                      ? '#4ea8de'
                      : '#8d99ae';
                  return `
                    <button data-act="pick-upgrade:${card.id}" style="padding:16px;border-radius:14px;border:2px solid ${borderCol};background:linear-gradient(165deg,rgba(32,20,58,0.96),rgba(12,8,26,0.98));color:#fff;text-align:left;cursor:pointer;box-shadow:0 0 24px ${borderCol}44;display:flex;flex-direction:column;justify-content:space-between;">
                      <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                          <span style="font-size:28px;">${card.icon}</span>
                          <span style="font-size:10px;padding:3px 8px;border-radius:99px;background:${borderCol}28;color:${borderCol};font-weight:800;text-transform:uppercase;">
                            ${RARITY_LABELS[card.rarity]}
                          </span>
                        </div>
                        <div style="font-size:11px;color:#80ffdb;margin-bottom:2px;">${CATEGORY_LABELS[card.category]} · Grau ${curStacks + 1}/${card.maxStacks}</div>
                        <h3 style="margin:0 0 8px;font-size:17px;color:#fff;">${card.name}</h3>
                        <p style="font-size:13px;color:#e2dbf0;line-height:1.4;margin:0 0 10px;">${card.shortDesc}</p>
                      </div>
                      <div style="padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#ffd166;font-style:italic;">
                        ✦ ${card.behaviorTransformation}
                      </div>
                    </button>
                  `;
                })
                .join('')}
            </div>
            <button data-act="toggle-inrun-tree" style="padding:9px 18px;border-radius:99px;border:1.5px solid #ffd166;background:rgba(255,209,102,0.16);color:#ffd166;font-weight:800;cursor:pointer;">
              🕸️ Abrir Teia de Habilidades & Alocar Centelhas de Éter
            </button>
          </div>
        `;
        uiLayer.appendChild(draftModal);
      }

      // IN-RUN CONSTELLATION SKILL WEB OVERLAY
      if (showInRunSkillTree) {
        const treeOverlay = document.createElement('div');
        treeOverlay.className = 'arcana-modal';
        treeOverlay.style.cssText =
          'position:absolute;inset:0;background:rgba(8,4,20,0.96);padding:20px;pointer-events:auto;z-index:10020;overflow-y:auto;';
        treeOverlay.innerHTML = `
          <div style="max-width:980px;margin:0 auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h2 style="margin:0;color:#ffd166;">🕸️ Teia de Habilidades & Vertentes da Jornada</h2>
              <button data-act="toggle-inrun-tree" style="padding:8px 16px;border-radius:8px;border:1px solid #00f5d4;background:rgba(0,245,212,0.2);color:#fff;font-weight:800;cursor:pointer;">
                Fechar Teia [K / Esc]
              </button>
            </div>
            ${renderSkillTreeContent(p.classId, true)}
          </div>
        `;
        uiLayer.appendChild(treeOverlay);
      }

      // CHAPTER VICTORY / NATION TRANSITION MODAL (Clear Progression Between Phases!)
      if (st.phase === 'F_CONCLUSION' && !isPaused && p.hp > 0) {
        const nextIdx = st.campaignIndex + 1;
        const isFifthCampaignDone = st.campaignIndex === 4;
        const nextCamp = ARCANA_CAMPAIGNS[Math.min(nextIdx, ARCANA_CAMPAIGNS.length - 1)];
        const vicModal = document.createElement('div');
        vicModal.className = 'arcana-modal';
        vicModal.style.cssText =
          'position:absolute;inset:0;background:rgba(6,3,16,0.88);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;pointer-events:auto;z-index:10025;';
        vicModal.innerHTML = `
          <div style="max-width:580px;width:100%;background:linear-gradient(165deg,rgba(28,16,58,0.97),rgba(10,6,24,0.98));border:2.5px solid #00f5d4;border-radius:18px;padding:24px;text-align:center;box-shadow:0 0 42px rgba(0,245,212,0.35);">
            <div style="font-size:11px;letter-spacing:3px;color:#80ffdb;font-weight:900;text-transform:uppercase;margin-bottom:4px;">
              ${isFifthCampaignDone ? '🏆 TODOS OS 5 SELOS PRIMORDIAIS LIBERTADOS!' : `✦ FASE ${st.campaignIndex + 1} DE 5 CONCLUÍDA ✦`}
            </div>
            <h2 style="margin:0 0 8px;font-size:28px;color:#ffd166;">
              ${camp.name} Libertada!
            </h2>
            <p style="font-size:13px;color:#e2dbf0;line-height:1.5;margin:0 0 16px;">
              Derrotaste <strong>${camp.boss.name}</strong> e purificaste este Selo da Corrupção do Oco! Recebeste <strong>+25 Essência Espiritual</strong> e restauraste a tua vitalidade.
            </p>

            <!-- 5-Nation Visual Progress Map -->
            <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
              ${ARCANA_CAMPAIGNS.slice(0, 5)
                .map((c, idx) => {
                  const done = idx <= st.campaignIndex;
                  const isNext = idx === nextIdx;
                  return `<div style="padding:8px 10px;border-radius:10px;border:1.5px solid ${
                    done ? '#00f5d4' : isNext ? '#ffd166' : 'rgba(255,255,255,0.15)'
                  };background:${
                    done
                      ? 'rgba(0,245,212,0.18)'
                      : isNext
                      ? 'rgba(255,209,102,0.2)'
                      : 'rgba(255,255,255,0.04)'
                  };font-size:11px;font-weight:800;color:${done ? '#80ffdb' : isNext ? '#ffd166' : '#8a829e'};">
                    ${done ? '✓ ' : isNext ? '▶ ' : ''}${c.roman}. ${c.name.split(' ')[0]}
                  </div>`;
                })
                .join('')}
            </div>

            ${
              isFifthCampaignDone
                ? `
                <div style="padding:12px;border-radius:12px;background:rgba(255,209,102,0.12);border:1px solid #ffd166;margin-bottom:16px;font-size:12px;color:#ffd166;">
                  🎉 <strong>Glória ao Guardião!</strong> Libertaste os 5 Selos Primordiais de Aethra! Podes regressar vitorioso ao Menu ou enfrentar a prova final no <strong>Modo Pós-Jogo: Fenda Sem Estrelas (Ascensão Infinita)</strong>.
                </div>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                  <button data-act="save-and-menu" style="padding:13px 22px;border-radius:12px;border:2px solid #ffd166;background:linear-gradient(135deg,#ffd166,#f77f00);color:#140926;font-weight:900;font-size:14px;cursor:pointer;">
                    🏆 Concluir Libertação dos 5 Selos (Menu)
                  </button>
                  <button data-act="next-campaign" style="padding:13px 20px;border-radius:12px;border:1.5px solid #ff007f;background:rgba(255,0,127,0.22);color:#ff99c8;font-weight:800;font-size:13px;cursor:pointer;">
                    ∞ Desafiar a Fenda Sem Estrelas (Ascensão Infinita) →
                  </button>
                </div>
                `
                : `
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                  <button data-act="toggle-inrun-tree" style="padding:12px 18px;border-radius:12px;border:1.5px solid #ffd166;background:rgba(255,209,102,0.16);color:#ffd166;font-weight:800;font-size:13px;cursor:pointer;">
                    🕸️ Abrir Teia de Habilidades
                  </button>
                  <button data-act="next-campaign" style="padding:14px 26px;border-radius:12px;border:2px solid #00f5d4;background:linear-gradient(135deg,#00f5d4,#00bbf9);color:#06101e;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 0 24px rgba(0,245,212,0.45);">
                    🌀 AVANÇAR PARA FASE ${nextIdx + 1}/5: ${nextCamp.name.toUpperCase()} →
                  </button>
                </div>
                `
            }
          </div>
        `;
        uiLayer.appendChild(vicModal);
      }

      // PAUSE / DEFEAT OVERLAY
      if (isPaused || p.hp <= 0) {
        const dead = p.hp <= 0;
        const pauseModal = document.createElement('div');
        pauseModal.className = 'arcana-modal';
        pauseModal.style.cssText =
          'position:absolute;inset:0;background:rgba(6,3,16,0.88);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;pointer-events:auto;z-index:10030;';
        pauseModal.innerHTML = `
          <div style="max-width:420px;width:100%;background:rgba(20,12,42,0.96);border:2px solid ${
            dead ? '#ff4d6d' : '#ffd166'
          };border-radius:16px;padding:24px;text-align:center;display:flex;flex-direction:column;gap:12px;">
            <h2 style="margin:0;font-size:26px;color:${dead ? '#ff4d6d' : '#ffd166'};">
              ${dead ? '☠ O Teu Guardião Sucumbiu ao Oco' : 'Ⅱ Jornada em Pausa'}
            </h2>
            <p style="font-size:13px;color:#cfc4e8;margin:0;">
              ${cls.name} · Nível ${p.level} · Abates: ${st.kills} · Relíquias: ◈ ${p.arcaneFragments}
            </p>
            ${
              !dead
                ? `<button data-act="toggle-pause" style="padding:12px;border-radius:10px;border:1px solid #00f5d4;background:rgba(0,245,212,0.22);color:#fff;font-weight:800;cursor:pointer;">▶ Continuar Combate</button>`
                : `<button data-act="restart-run" style="padding:12px;border-radius:10px;border:1px solid #ffd166;background:rgba(255,209,102,0.24);color:#ffd166;font-weight:800;cursor:pointer;">↻ Renascer no Selo Primordial</button>`
            }
            <button data-act="toggle-inrun-tree" style="padding:10px;border-radius:10px;border:1px solid rgba(125,226,255,0.35);background:rgba(255,255,255,0.06);color:#7de2ff;font-weight:700;cursor:pointer;">
              🕸️ Abrir Teia de Habilidades
            </button>
            <button data-act="save-and-menu" style="padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#e2dbf0;cursor:pointer;">
              Guardar Progresso & Voltar ao Menu
            </button>
          </div>
        `;
        uiLayer.appendChild(pauseModal);
      }

      bindUiActions();
    }
  }

  function bindTouchJoysticks() {
    const moveZone = uiLayer.querySelector<HTMLElement>('#arc-joy-move');
    const moveKnob = uiLayer.querySelector<HTMLElement>('#arc-joy-move-knob');
    const aimZone = uiLayer.querySelector<HTMLElement>('#arc-joy-aim');

    if (moveZone && moveKnob) {
      let pid: number | null = null;
      const updateMove = (clientX: number, clientY: number) => {
        const r = moveZone.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const maxR = r.width * 0.42;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        moveKnob.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
        joyMoveVec = { x: dx / maxR, y: dy / maxR };
      };
      moveZone.addEventListener('pointerdown', e => {
        pid = e.pointerId;
        moveZone.setPointerCapture(e.pointerId);
        updateMove(e.clientX, e.clientY);
      });
      moveZone.addEventListener('pointermove', e => {
        if (e.pointerId === pid) updateMove(e.clientX, e.clientY);
      });
      const resetMove = (e: PointerEvent) => {
        if (e.pointerId === pid) {
          pid = null;
          moveKnob.style.transform = 'translate(0px,0px)';
          joyMoveVec = { x: 0, y: 0 };
        }
      };
      moveZone.addEventListener('pointerup', resetMove);
      moveZone.addEventListener('pointercancel', resetMove);
    }

    if (aimZone) {
      let pid: number | null = null;
      const updateAim = (clientX: number, clientY: number) => {
        const r = aimZone.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          joyAimVec = { x: dx / dist, y: dy / dist, active: true };
        }
      };
      aimZone.addEventListener('pointerdown', e => {
        pid = e.pointerId;
        aimZone.setPointerCapture(e.pointerId);
        joyAimVec.active = true;
        updateAim(e.clientX, e.clientY);
      });
      aimZone.addEventListener('pointermove', e => {
        if (e.pointerId === pid) updateAim(e.clientX, e.clientY);
      });
      const resetAim = (e: PointerEvent) => {
        if (e.pointerId === pid) {
          pid = null;
          joyAimVec.active = false;
        }
      };
      aimZone.addEventListener('pointerup', resetAim);
      aimZone.addEventListener('pointercancel', resetAim);
    }
  }

  function bindUiActions() {
    for (const btn of uiLayer.querySelectorAll<HTMLElement>('[data-act]')) {
      btn.onclick = e => {
        e.stopPropagation();
        unlockAudioOnce();
        audio.playSfx('ui_click');
        const act = btn.dataset.act!;
        const [key, val] = act.split(':');

        if (key === 'dismiss-portrait') {
          portraitDismissed = true;
          renderUi();
        } else if (key === 'skip-intro') {
          finishIntro();
        } else if (key === 'exit-platform') {
          cleanup();
          options.onExit();
        } else if (key === 'back-menu') {
          currentScreen = 'menu';
          audio.setTheme('menu');
          renderUi();
        } else if (key === 'open-class-select') {
          currentScreen = 'class_select';
          renderUi();
        } else if (key === 'open-skill-tree') {
          currentScreen = 'skill_tree';
          renderUi();
        } else if (key === 'tree-class') {
          selectedClassId = val as ArcanaClassId;
          selectedWebNodeId = null;
          renderUi();
        } else if (key === 'web-node') {
          selectedWebNodeId = val;
          renderUi();
        } else if (key === 'unlock-web-node') {
          const activeCls = runState ? runState.player.classId : selectedClassId;
          const nodes = SKILL_WEB_NODES.filter(n => n.classId === activeCls);
          const targetNode = nodes.find(n => n.id === val);
          if (targetNode) {
            unlockedWebNodes.add(targetNode.id);
            recordDiscovery(profile, 'upgrade', targetNode.id);
            if (targetNode.upgradeId) {
              recordDiscovery(profile, 'upgrade', targetNode.upgradeId);
            }
            if (runState) {
              spentChiPointsInRun += 1;
              const specId = ARCANA_CLASSES[activeCls].specializations[targetNode.branchIndex]?.id;
              if (!runState.player.specializationId && specId) {
                selectSpecialization(runState, specId);
              }
              if (targetNode.upgradeId) {
                runState.player.upgrades[targetNode.upgradeId] =
                  (runState.player.upgrades[targetNode.upgradeId] || 0) + 1;
              }
              audio.playSfx('card_pick', runState.player.classId);
            } else if (profile.eternalEssence >= 15) {
              profile.eternalEssence = Math.max(0, profile.eternalEssence - 15);
              saveArcanaProfile(profile);
            }
          }
          renderUi();
        } else if (key === 'quick-play') {
          selectedClassId = val as ArcanaClassId;
          clearRunCheckpoint(profile);
          startNewAdventure({});
        } else if (key === 'inspect-class') {
          selectedClassId = val as ArcanaClassId;
          currentScreen = 'class_select';
          renderUi();
        } else if (key === 'open-coop') {
          currentScreen = 'coop_lobby';
          renderUi();
        } else if (key === 'coop-create') {
          coop.createRoom(options.name || 'Guardião', selectedClassId);
          renderUi();
        } else if (key === 'coop-join') {
          const inp = uiLayer.querySelector<HTMLInputElement>('#arcana-room-input');
          const code = inp?.value.trim() || 'ARC-777';
          coop.joinRoom(code, options.name || 'Convidado', selectedClassId);
          startNewAdventure({});
        } else if (key === 'coop-start-ai') {
          coop.enableAiCompanion(selectedClassId);
          startNewAdventure({});
        } else if (key === 'open-grimoire') {
          currentScreen = 'grimoire';
          renderUi();
        } else if (key === 'grim-tab') {
          grimoireTab = val as typeof grimoireTab;
          renderUi();
        } else if (key === 'open-ascensions') {
          currentScreen = 'ascensions';
          renderUi();
        } else if (key === 'pick-asc') {
          selectedAscension = Number(val) || 0;
          currentScreen = 'menu';
          renderUi();
        } else if (key === 'open-settings') {
          currentScreen = 'settings';
          renderUi();
        } else if (key === 'set-quality') {
          profile.settings.quality = val as QualityProfile;
          renderer.setQuality(profile.settings.quality);
          saveArcanaProfile(profile);
          renderUi();
        } else if (key === 'pick-class') {
          selectedClassId = val as ArcanaClassId;
          selectedWebNodeId = null;
          menuBackdropState = createInitialRunState({ classId: selectedClassId, isTraining: true });
          renderUi();
        } else if (key === 'start-training') {
          startNewAdventure({ isTraining: true });
        } else if (key === 'start-tutorial') {
          startNewAdventure({ isTutorial: true });
        } else if (key === 'launch-campaign') {
          clearRunCheckpoint(profile);
          startNewAdventure({});
        } else if (key === 'continue-run') {
          if (profile.savedCheckpoint) {
            startNewAdventure({ resumeCheckpoint: true });
          }
        } else if (key === 'toggle-pause') {
          isPaused = !isPaused;
          renderUi();
        } else if (key === 'toggle-inrun-tree') {
          showInRunSkillTree = !showInRunSkillTree;
          renderUi();
        } else if (key === 'choose-spec' && runState) {
          selectSpecialization(runState, val);
          showSpecChoiceModal = false;
          audio.playSfx('card_pick', runState.player.classId);
          renderUi();
        } else if (key === 'pick-upgrade' && runState) {
          applyUpgradeChoice(runState, val);
          recordDiscovery(profile, 'upgrade', val);
          audio.playSfx('card_pick', runState.player.classId);
          triggerSpecModalIfNeeded();
          renderUi();
        } else if (key === 'hud-dash') {
          input.mobilityPressed = true;
        } else if (key === 'hud-special') {
          input.specialPressed = true;
        } else if (key === 'hud-ult') {
          input.ultimatePressed = true;
        } else if (key === 'hud-auto') {
          input.autoAttackEnabled = !input.autoAttackEnabled;
          renderUi();
        } else if (key === 'hud-interact') {
          input.interactPressed = true;
        } else if (key === 'next-campaign' && runState) {
          advanceToNextCampaign(runState);
          recordDiscovery(profile, 'biome', runState.campaignId);
          saveRunCheckpoint(profile, runState);
          audio.setTheme(runState.campaignId);
          renderUi();
        } else if (key === 'training-levelup' && runState) {
          runState.player.xp += runState.player.xpToNext;
        } else if (key === 'training-boss' && runState) {
          spawnCampaignBoss(runState);
          renderUi();
        } else if (key === 'restart-run') {
          clearRunCheckpoint(profile);
          startNewAdventure({});
        } else if (key === 'save-and-menu') {
          if (runState && runState.player.hp > 0 && !runState.isTrainingArena) {
            saveRunCheckpoint(profile, runState);
          }
          currentScreen = 'menu';
          audio.setTheme('menu');
          renderUi();
        }
      };
    }

    for (const rng of uiLayer.querySelectorAll<HTMLInputElement>('[data-setting-range]')) {
      rng.oninput = () => {
        const k = rng.dataset.settingRange as 'musicVolume' | 'sfxVolume' | 'ambienceVolume';
        profile.settings[k] = Number(rng.value);
        audio.applySettings(profile.settings);
        saveArcanaProfile(profile);
      };
    }

    for (const chk of uiLayer.querySelectorAll<HTMLInputElement>('[data-setting-check]')) {
      chk.onchange = () => {
        const k = chk.dataset.settingCheck as 'autoAttackDefault' | 'reducedFlashes';
        profile.settings[k] = chk.checked;
        input.autoAttackEnabled = profile.settings.autoAttackDefault;
        saveArcanaProfile(profile);
      };
    }
  }

  function updateHudFast() {
    if (currentScreen !== 'playing' || !runState) return;
    const st = runState;
    const p = st.player;

    const setTxt = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== text) el.textContent = text;
    };

    setTxt('arc-hud-lv', `Nv.${p.level}`);
    setTxt('arc-hud-frags', `◈ ${p.arcaneFragments}`);
    setTxt(
      'arc-hud-hp-text',
      `♥ ${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}${p.shield > 0 ? ` (+${Math.ceil(p.shield)} 🛡)` : ''}`
    );

    const hpFill = document.getElementById('arc-hud-hp-fill');
    if (hpFill) hpFill.style.width = `${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100))}%`;

    const xpFill = document.getElementById('arc-hud-xp-fill');
    if (xpFill) xpFill.style.width = `${Math.min(100, (p.xp / Math.max(1, p.xpToNext)) * 100)}%`;

    // Elemental Bending Passive Gauge Readout
    let passiveTxt = '';
    if (p.classId === 'chess') passiveTxt = `🌕 Lua Cheia: ${p.chessCoordinationStacks}/10`;
    else if (p.classId === 'chrono') passiveTxt = `🍃 Correntes: ${p.chronoSequenceStacks}/8`;
    else if (p.classId === 'chaos') passiveTxt = `☄️ Cometa: ${Math.floor(p.chaosInstability)}%`;
    else if (p.classId === 'rune') passiveTxt = `⛰️ Sísmico: ${p.runeActiveSymbols.join('·') || 'Ativo'}`;
    setTxt('arc-hud-passive', passiveTxt);

    const mins = Math.floor(st.elapsedCampaignSec / 60);
    const secs = Math.floor(st.elapsedCampaignSec % 60);
    setTxt('arc-hud-timer', `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);

    // Update Stage Progress Bar (0% -> 100% toward Boss)
    const stagePct = st.boss
      ? 100
      : Math.min(100, Math.floor((st.elapsedCampaignSec / 115) * 100));
    setTxt(
      'arc-hud-stage-pct',
      st.boss
        ? '⚔ BOSS GUARDIÃO NA ARENA!'
        : st.phase === 'F_CONCLUSION'
        ? '✓ FASE CONCLUÍDA!'
        : `Até ao Boss: ${stagePct}% (${st.kills} abates)`
    );
    const stageFill = document.getElementById('arc-hud-stage-fill');
    if (stageFill) stageFill.style.width = `${stagePct}%`;

    setTxt(
      'arc-cd-dash',
      p.mobilityCooldown > 0 ? `${p.mobilityCooldown.toFixed(1)}s` : 'PASSO'
    );
    setTxt(
      'arc-cd-special',
      p.specialCooldown > 0 ? `${p.specialCooldown.toFixed(1)}s` : 'VERTENTE'
    );
    setTxt('arc-cd-ult', p.ultimateCharge >= 100 ? 'ASCENSÃO!' : `${Math.floor(p.ultimateCharge)}%`);

    const bossWrap = document.getElementById('arc-hud-boss-wrap');
    if (bossWrap) {
      bossWrap.style.display = st.boss ? 'block' : 'none';
      if (st.boss) {
        setTxt('arc-hud-boss-name', `${st.boss.def.name} (Fase ${st.boss.currentPhase})`);
        setTxt('arc-hud-boss-hp', `${Math.ceil(st.boss.hp)} / ${st.boss.maxHp}`);
        const bf = document.getElementById('arc-hud-boss-fill');
        if (bf) bf.style.width = `${Math.max(0, (st.boss.hp / st.boss.maxHp) * 100)}%`;
      }
    }

    const bannerEl = document.getElementById('arc-hud-banner');
    if (bannerEl) {
      if (st.statusBanner && st.statusBanner.timer > 0) {
        bannerEl.style.display = 'block';
        bannerEl.textContent = st.statusBanner.subtext
          ? `${st.statusBanner.text} — ${st.statusBanner.subtext}`
          : st.statusBanner.text;
      } else {
        bannerEl.style.display = 'none';
      }
    }

    const interactBtn = document.getElementById('arc-btn-interact');
    if (interactBtn) {
      const nearPoi = st.map.pois.find(
        poi => !poi.used && Math.hypot(poi.x - p.x, poi.y - p.y) <= poi.radius + 55
      );
      if (nearPoi) {
        interactBtn.style.display = 'inline-block';
        interactBtn.textContent = `✋ ${nearPoi.name} [F]`;
      } else {
        interactBtn.style.display = 'none';
      }
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    if (currentScreen === 'playing' && runState) {
      const pausedModalOpen =
        isPaused ||
        showInRunSkillTree ||
        showSpecChoiceModal ||
        runState.pendingLevelUps > 0 ||
        runState.player.hp <= 0;

      if (!pausedModalOpen) {
        let mx = joyMoveVec.x;
        let my = joyMoveVec.y;
        if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) my -= 1;
        if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) my += 1;
        if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) mx -= 1;
        if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) mx += 1;
        const mLen = Math.hypot(mx, my);
        if (mLen > 1) {
          mx /= mLen;
          my /= mLen;
        }
        input.moveX = mx;
        input.moveY = my;

        if (joyAimVec.active) {
          input.aimX = joyAimVec.x;
          input.aimY = joyAimVec.y;
          input.isAiming = true;
          input.primaryHeld = true;
        }

        if (input.interactPressed) {
          const nearPoi = runState.map.pois.find(
            poi =>
              !poi.used &&
              Math.hypot(poi.x - runState!.player.x, poi.y - runState!.player.y) <= poi.radius + 60
          );
          if (nearPoi) {
            interactWithPoi(runState, nearPoi.id);
            audio.playSfx('poi_activate', runState.player.classId);
            renderUi();
          }
          input.interactPressed = false;
        }

        const prevPhase = runState.phase;
        const prevPending = runState.pendingLevelUps;
        const prevHp = runState.player.hp;

        stepArcanaSimulation(runState, input, dt, {
          onSfx: sfx => audio.playSfx(sfx, runState?.player.classId),
          onLevelUp: () => {
            audio.playSfx('level_up', runState?.player.classId);
            triggerSpecModalIfNeeded();
            renderUi();
          },
          onBossSpawn: () => {
            audio.playSfx('boss_warning');
            audio.setBossMode(true);
            renderUi();
          },
          onCampaignComplete: () => {
            audio.playSfx('victory');
            audio.setBossMode(false);
            profile.eternalEssence += 25;
            saveArcanaProfile(profile);
            renderUi();
          },
          onRunEnd: victory => {
            if (victory) {
              profile.totalVictories += 1;
              profile.eternalEssence += 100;
              profile.highestAscensionUnlocked = Math.min(5, profile.highestAscensionUnlocked + 1);
              clearRunCheckpoint(profile);
            }
            profile.totalKills += runState?.kills || 0;
            saveArcanaProfile(profile);
            renderUi();
          },
          onDiscovery: (kind, id) => {
            recordDiscovery(profile, kind, id);
          },
        });

        if (coop.isActive) {
          coop.syncTick(dt, runState);
        }

        input.specialPressed = false;
        input.mobilityPressed = false;
        input.ultimatePressed = false;

        if (
          runState.phase !== prevPhase ||
          runState.pendingLevelUps !== prevPending ||
          (prevHp > 0 && runState.player.hp <= 0)
        ) {
          renderUi();
        }
      }

      renderer.render(runState, dt, !pausedModalOpen);
      updateHudFast();
    } else {
      menuBackdropState.elapsedCampaignSec += dt;
      menuBackdropState.player.animTime += dt;
      const cycle = menuBackdropState.elapsedCampaignSec % 4.5;
      menuBackdropState.player.animState =
        cycle < 0.55 ? 'attack' : cycle > 2.2 && cycle < 2.8 ? 'cast' : 'idle';
      menuBackdropState.player.facingX = Math.sin(menuBackdropState.elapsedCampaignSec * 0.45);
      menuBackdropState.player.facingY = Math.cos(menuBackdropState.elapsedCampaignSec * 0.45);
      menuBackdropState.player.classId = selectedClassId;
      renderer.render(menuBackdropState, dt, false, currentScreen === 'menu');
    }

    rafId = requestAnimationFrame(frame);
  }

  function cleanup() {
    cancelAnimationFrame(rafId);
    if (introTimer !== null) clearTimeout(introTimer);
    unbindLifecycle();
    coop.disconnect();
    audio.stopMusic();
    renderer.dispose();
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('contextmenu', onContextMenu);
    root.remove();
  }

  renderUi();
  rafId = requestAnimationFrame(frame);
  return cleanup;
}
