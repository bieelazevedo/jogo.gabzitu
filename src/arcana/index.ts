// ============================================================================
// ASCENSÃO ARCANA — Main Mode Controller, UI/HUD & Skill Tree (GDD v1.0)
// ============================================================================

import './arcana.css';
import {
  ARCANA_CAMPAIGNS,
  ARCANA_CLASSES,
  ARCANA_ENEMIES,
  ARCANA_UPGRADES,
  ASCENSION_MODIFIERS,
  TUTORIAL_STEPS,
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
  legendary: 'Evolução Lendária',
  mythic: 'Mítico Primordial',
};

const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  fundamental: 'Fundamental',
  modifier: 'Modificador de Forma',
  elemental: 'Sinergia Elemental',
  class: 'Domínio de Classe',
  relic: 'Relíquia Ancestral',
  evolution: 'Evolução Superior',
  mythic: 'Decreto Mítico',
};

export function launchArcana(options: LaunchArcanaOptions): () => void {
  const profile: ArcanaPersistentProfile = loadArcanaProfile();
  const audio = new ArcanaAudio();
  audio.applySettings(profile.settings);

  const coop = new ArcanaCoopSession();
  coop.localName = options.name || 'Arcanista';

  // Create isolated root container
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

  // Canvas for 2.5D Renderer (used both as live menu backdrop & gameplay viewport)
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

  // Input state
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

  // Lifecycle auto-save for Safari / Mobile Chrome
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

  // Keyboard & Mouse bindings
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
  // UI Rendering (Menus, Modals, Skill Tree, Grimório & HUD)
  // ============================================================================

  function renderSkillTreeContent(classId: ArcanaClassId, interactiveInRun = false): string {
    const cls = ARCANA_CLASSES[classId];
    const activeSpecId = runState?.player.specializationId || null;
    const playerLevel = runState?.player.level || 1;
    const acquiredUpgrades = runState?.player.upgrades || {};

    const classUpgrades = ARCANA_UPGRADES.filter(
      u => u.classRestriction === classId || u.category === 'mythic'
    );

    return `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid rgba(125,226,255,0.22);padding-bottom:10px;">
          <div>
            <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7de2ff;">ÁRVORE DE HABILIDADES & EVOLUÇÕES</span>
            <h3 style="margin:2px 0 0;font-size:20px;color:#ffd166;">${cls.name} — ${cls.title}</h3>
          </div>
          ${
            !interactiveInRun
              ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${(['chess', 'chrono', 'chaos', 'rune'] as ArcanaClassId[])
                    .map(
                      id => `
                      <button data-act="tree-class:${id}" style="pointer-events:auto;padding:6px 12px;border-radius:8px;border:1px solid ${
                        id === classId ? '#ffd166' : 'rgba(255,255,255,0.2)'
                      };background:${
                        id === classId ? 'rgba(255,209,102,0.2)' : 'rgba(15,10,30,0.8)'
                      };color:#fff;cursor:pointer;font-weight:700;font-size:12px;">
                        ${ARCANA_CLASSES[id].primaryAttack.icon} ${ARCANA_CLASSES[id].name}
                      </button>`
                    )
                    .join('')}
                </div>`
              : `<div style="font-size:13px;color:#80ffdb;font-weight:700;">Nível Atual: ${playerLevel} · Essência Eterna: ✦ ${profile.eternalEssence}</div>`
          }
        </div>

        <!-- 3 Specialization Branches with Progressive Nodes -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;">
          ${cls.specializations
            .map(spec => {
              const isChosen = activeSpecId === spec.id;
              return `
                <div style="background:linear-gradient(160deg,rgba(32,20,58,0.92),rgba(14,9,28,0.95));border:2px solid ${
                  isChosen ? '#ffd166' : 'rgba(125,226,255,0.25)'
                };border-radius:12px;padding:14px;box-shadow:${
                  isChosen ? '0 0 22px rgba(255,209,102,0.3)' : 'none'
                };">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:24px;">${spec.icon}</span>
                    <span style="font-size:10px;padding:3px 8px;border-radius:99px;background:${
                      isChosen ? '#ffd166' : 'rgba(125,226,255,0.15)'
                    };color:${isChosen ? '#120824' : '#7de2ff'};font-weight:800;">
                      ${isChosen ? 'RAMO ATIVO' : 'RAMO DE CLASSE'}
                    </span>
                  </div>
                  <h4 style="margin:0;font-size:16px;color:#fff;">${spec.name}</h4>
                  <div style="font-size:11px;color:#ffd166;margin-bottom:6px;">${spec.subtitle}</div>
                  <p style="font-size:12px;color:#cfc4e8;line-height:1.4;margin:0 0 12px;">${spec.description}</p>
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    ${spec.keyNodes
                      .map((nodeName, idx) => {
                        const reqLv = idx === 0 ? 2 : idx === 1 ? 5 : 8;
                        const unlocked = isChosen && playerLevel >= reqLv;
                        return `
                          <div style="display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:8px;background:${
                            unlocked ? 'rgba(0,245,212,0.16)' : 'rgba(255,255,255,0.05)'
                          };border:1px solid ${
                            unlocked ? '#00f5d4' : 'rgba(255,255,255,0.1)'
                          };">
                            <span style="width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:${
                              unlocked ? '#00f5d4' : '#2b2240'
                            };color:${unlocked ? '#09141a' : '#9d8ec4'};">${idx + 1}</span>
                            <div style="flex:1;">
                              <div style="font-size:12px;font-weight:700;color:${unlocked ? '#80ffdb' : '#e2dbf0'};">${nodeName}</div>
                              <div style="font-size:10px;color:#9d8ec4;">Desbloqueia no Nível ${reqLv}</div>
                            </div>
                            <span>${unlocked ? '✦' : '🔒'}</span>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <!-- Class Upgrades, Legendary Evolutions & Mythic Nodes -->
        <div>
          <h4 style="margin:0 0 8px;font-size:14px;color:#7de2ff;letter-spacing:1px;text-transform:uppercase;">
            Habilidades, Evoluções Lendárias & Míticos que Desbloqueiam ao Subir de Nível
          </h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;">
            ${classUpgrades
              .map(u => {
                const stacks = acquiredUpgrades[u.id] || 0;
                const discovered = profile.discoveredUpgrades.includes(u.id) || stacks > 0;
                const borderCol =
                  u.rarity === 'mythic'
                    ? '#ff007f'
                    : u.rarity === 'legendary'
                    ? '#ffd166'
                    : u.rarity === 'epic'
                    ? '#c77dff'
                    : '#4ea8de';
                return `
                  <div style="padding:10px;border-radius:10px;background:rgba(18,12,34,0.9);border:1px solid ${borderCol};opacity:${
                    discovered ? '1' : '0.82'
                  };">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <span style="font-size:18px;">${u.icon}</span>
                      <span style="font-size:10px;font-weight:800;color:${borderCol};text-transform:uppercase;">
                        ${RARITY_LABELS[u.rarity]} ${stacks > 0 ? `· Nv.${stacks}/${u.maxStacks}` : ''}
                      </span>
                    </div>
                    <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">${u.name}</div>
                    <div style="font-size:11px;color:#cfc4e8;line-height:1.35;">${u.shortDesc}</div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderUi() {
    uiLayer.innerHTML = '';

    // Portrait orientation helper on mobile
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

    // 1. OPENING ANIMATED FISSURE SCENE (GDD 3.2)
    if (currentScreen === 'intro') {
      const intro = document.createElement('div');
      intro.className = 'arcana-intro-scene';
      intro.style.cssText =
        'position:absolute;inset:0;background:radial-gradient(circle at center,#1d0f3d 0%,#05020d 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;text-align:center;padding:24px;';
      intro.innerHTML = `
        <div style="position:relative;width:180px;height:180px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
          <div style="position:absolute;inset:0;border-radius:50%;border:2px dashed #7de2ff;animation:spin 9s linear infinite;opacity:0.65;"></div>
          <div style="position:absolute;inset:22px;border-radius:50%;border:2px solid #f15bb5;animation:spin 5s linear infinite reverse;opacity:0.8;"></div>
          <div style="width:28px;height:110px;border-radius:50%;background:linear-gradient(180deg,#80ffdb,#f15bb5,#ffd166);box-shadow:0 0 48px #7de2ff,0 0 90px #f15bb5;transform:rotate(18deg);"></div>
          <span style="position:absolute;top:-10px;left:25%;font-size:20px;color:#ffd166;">ᚠ</span>
          <span style="position:absolute;bottom:0;right:20%;font-size:20px;color:#80ffdb;">♛</span>
          <span style="position:absolute;top:35%;right:-8px;font-size:20px;color:#f15bb5;">⏳</span>
        </div>
        <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#7de2ff;margin-bottom:6px;">
          A FISSURA PRIMORDIAL DESPERTA
        </div>
        <h1 style="margin:0 0 10px;font-size:clamp(30px,5vw,52px);background:linear-gradient(90deg,#ffd166,#ffffff,#7de2ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 32px rgba(125,226,255,0.4);">
          ASCENSÃO ARCANA
        </h1>
        <p style="max-width:480px;color:#cfc4e8;font-size:14px;line-height:1.5;margin:0 0 24px;">
          Domina as regras da própria magia através de cinco campanhas místicas.
        </p>
        <button data-act="skip-intro" style="padding:12px 28px;border-radius:99px;border:1px solid #ffd166;background:linear-gradient(135deg,#3d1e6d,#1b0d36);color:#ffd166;font-weight:800;font-size:14px;letter-spacing:1px;cursor:pointer;box-shadow:0 0 24px rgba(255,209,102,0.3);">
          ENTRAR NO SANTUÁRIO ✦
        </button>
      `;
      uiLayer.appendChild(intro);
      if (introTimer === null) {
        introTimer = window.setTimeout(() => finishIntro(), 4200);
      }
      bindUiActions();
      return;
    }

    // 2. MAIN MENU (GDD 3.3)
    if (currentScreen === 'menu') {
      const hasSave = !!profile.savedCheckpoint;
      const savedClass = hasSave ? ARCANA_CLASSES[profile.savedCheckpoint!.classId] : null;
      const menu = document.createElement('div');
      menu.style.cssText =
        'position:absolute;inset:0;background:radial-gradient(circle at 70% 40%,rgba(16,8,38,0.45),rgba(7,3,18,0.88));display:flex;flex-direction:column;justify-content:space-between;padding:max(16px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left));pointer-events:auto;overflow-y:auto;';
      menu.innerHTML = `
        <header style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:24px;filter:drop-shadow(0 0 10px #7de2ff);">✧</span>
            <div>
              <div style="font-size:10px;letter-spacing:3px;color:#7de2ff;text-transform:uppercase;">PLATAFORMA GABZITU · NOVO MODO</div>
              <div style="font-size:15px;font-weight:800;color:#ffd166;">ASCENSÃO ARCANA · v1.0</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="padding:6px 12px;border-radius:99px;background:rgba(125,226,255,0.12);border:1px solid rgba(125,226,255,0.3);font-size:12px;color:#80ffdb;">
              ✦ Essência Eterna: <strong>${profile.eternalEssence}</strong> · Vitórias: <strong>${profile.totalVictories}</strong>
            </span>
            <button data-act="exit-platform" style="padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.25);background:rgba(20,14,36,0.85);color:#e2dbf0;font-weight:700;font-size:12px;cursor:pointer;">
              ← Voltar à Plataforma
            </button>
          </div>
        </header>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:24px;align-items:center;margin:auto 0;padding:12px 0;">
          <div>
            <div style="display:inline-block;padding:4px 12px;border-radius:99px;background:rgba(241,91,181,0.18);border:1px solid #f15bb5;color:#ff99d8;font-size:11px;font-weight:700;letter-spacing:1.5px;margin-bottom:10px;">
              ROGUELITE DE AÇÃO & FANTASIA ARCANA 2.5D
            </div>
            <h1 style="margin:0 0 10px;font-size:clamp(28px,4.5vw,48px);line-height:1.08;color:#ffffff;text-shadow:0 0 28px rgba(125,226,255,0.45);">
              Ascensão <span style="color:#ffd166;">Arcana</span>
            </h1>
            <p style="color:#cfc4e8;font-size:14px;line-height:1.55;margin:0 0 18px;max-width:480px;">
              Domina 4 classes excêntricas — <strong>Mago do Xadrez</strong>, <strong>Cronomante</strong>, <strong>Feiticeira do Caos</strong> e <strong>Tecelão de Runas</strong>. Atravessa 5 campanhas místicas, evolui na árvore de habilidades e derrota os Guardiões da Ruptura.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button data-act="start-tutorial" style="padding:9px 15px;border-radius:10px;border:1px solid #80ffdb;background:rgba(128,255,219,0.14);color:#80ffdb;font-weight:700;font-size:12px;cursor:pointer;">
                🎓 Tutorial Jogável (3 min)
              </button>
              <button data-act="open-skill-tree" style="padding:9px 15px;border-radius:10px;border:1px solid #ffd166;background:rgba(255,209,102,0.16);color:#ffd166;font-weight:700;font-size:12px;cursor:pointer;">
                🌿 Árvore de Habilidades & Evoluções
              </button>
            </div>
          </div>

          <nav style="display:flex;flex-direction:column;gap:10px;max-width:400px;width:100%;justify-self:end;">
            <button data-act="continue-run" ${!hasSave ? 'disabled' : ''} style="padding:14px 18px;border-radius:12px;border:2px solid ${
              hasSave ? '#00f5d4' : 'rgba(255,255,255,0.12)'
            };background:${
              hasSave
                ? 'linear-gradient(135deg,rgba(0,245,212,0.25),rgba(18,38,58,0.92))'
                : 'rgba(20,16,32,0.5)'
            };color:${hasSave ? '#fff' : '#6c6380'};text-align:left;cursor:${
              hasSave ? 'pointer' : 'not-allowed'
            };display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:800;font-size:15px;">▶ Continuar Aventura</div>
                <div style="font-size:11px;opacity:0.85;">
                  ${
                    hasSave
                      ? `${savedClass?.name} · Nível ${profile.savedCheckpoint!.playerLevel} · Campanha ${
                          profile.savedCheckpoint!.campaignIndex + 1
                        }`
                      : 'Nenhuma aventura guardada em curso'
                  }
                </div>
              </div>
              <span>✦</span>
            </button>

            <button data-act="open-class-select" style="padding:15px 18px;border-radius:12px;border:2px solid #ffd166;background:linear-gradient(135deg,rgba(255,209,102,0.28),rgba(58,28,94,0.92));color:#fff;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,0.4);">
              <div>
                <div style="font-weight:800;font-size:16px;color:#ffd166;">⚔ Nova Aventura (5 Campanhas)</div>
                <div style="font-size:11px;color:#e2dbf0;">Escolhe a tua Classe, Especialização e Arena de Treino</div>
              </div>
              <span style="font-size:18px;color:#ffd166;">→</span>
            </button>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <button data-act="open-coop" style="padding:12px 14px;border-radius:12px;border:1px solid rgba(125,226,255,0.35);background:rgba(22,16,42,0.9);color:#fff;text-align:left;cursor:pointer;">
                <div style="font-weight:800;font-size:13px;color:#7de2ff;">👥 Multiplayer (2J)</div>
                <div style="font-size:11px;color:#b8add4;">Sala Co-op ou Dupla IA</div>
              </button>
              <button data-act="open-grimoire" style="padding:12px 14px;border-radius:12px;border:1px solid rgba(199,125,255,0.35);background:rgba(22,16,42,0.9);color:#fff;text-align:left;cursor:pointer;">
                <div style="font-weight:800;font-size:13px;color:#e0aaff;">📖 Grimório</div>
                <div style="font-size:11px;color:#b8add4;">Cartas, Bosses & Lore</div>
              </button>
              <button data-act="open-ascensions" style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,159,28,0.35);background:rgba(22,16,42,0.9);color:#fff;text-align:left;cursor:pointer;">
                <div style="font-weight:800;font-size:13px;color:#ffbe0b;">🔥 Ascensões (${selectedAscension})</div>
                <div style="font-size:11px;color:#b8add4;">Dificuldade & Infinito</div>
              </button>
              <button data-act="open-settings" style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.22);background:rgba(22,16,42,0.9);color:#fff;text-align:left;cursor:pointer;">
                <div style="font-weight:800;font-size:13px;">⚙ Definições</div>
                <div style="font-size:11px;color:#b8add4;">Áudio, Qualidade & Toque</div>
              </button>
            </div>
          </nav>
        </div>

        <footer style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#9d8ec4;flex-wrap:wrap;gap:8px;">
          <span>Campanhas: I Pátio das Runas · II Cinza Viva · III Claustro Invertido · IV Ampulhetas · V Trono da Ruptura</span>
          <span>Controlos: WASD/Rato ou Duplo Joystick Virtual Mobile</span>
        </footer>
      `;
      uiLayer.appendChild(menu);
      bindUiActions();
      return;
    }

    // 3. CLASS SELECTION & TRAINING ARENA PREVIEW (GDD 3.5)
    if (currentScreen === 'class_select') {
      const cls = ARCANA_CLASSES[selectedClassId];
      const modal = document.createElement('div');
      modal.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.92);display:flex;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));pointer-events:auto;overflow-y:auto;gap:14px;';
      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:11px;letter-spacing:2px;color:#7de2ff;">ESCOLHE O TEU ARCANISTA</div>
            <h2 style="margin:0;font-size:24px;color:#ffd166;">Seleção de Classe & Especialização</h2>
          </div>
          <div style="display:flex;gap:8px;">
            <button data-act="open-skill-tree" style="padding:8px 14px;border-radius:8px;border:1px solid #ffd166;background:rgba(255,209,102,0.16);color:#ffd166;font-weight:700;cursor:pointer;">
              🌿 Ver Árvore de Habilidades Completa
            </button>
            <button data-act="back-menu" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(20,14,36,0.9);color:#fff;cursor:pointer;">
              ← Menu Principal
            </button>
          </div>
        </div>

        <!-- 4 Class Cards -->
        <div style="display:grid;grid-template-columns:repeat(4,minmax(175px,1fr));gap:10px;overflow-x:auto;">
          ${(['chess', 'chrono', 'chaos', 'rune'] as ArcanaClassId[])
            .map(id => {
              const c = ARCANA_CLASSES[id];
              const active = id === selectedClassId;
              return `
                <button data-act="pick-class:${id}" style="padding:12px;border-radius:12px;border:2px solid ${
                  active ? c.palette.accent : 'rgba(255,255,255,0.14)'
                };background:${
                  active
                    ? 'linear-gradient(160deg,rgba(68,38,118,0.92),rgba(20,12,42,0.96))'
                    : 'rgba(16,10,32,0.85)'
                };color:#fff;text-align:left;cursor:pointer;box-shadow:${
                  active ? `0 0 20px ${c.palette.glow}44` : 'none'
                };">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="font-size:26px;">${c.primaryAttack.icon}</span>
                    <span style="font-size:11px;color:#ffd166;">${'★'.repeat(c.difficulty)}${'☆'.repeat(3 - c.difficulty)}</span>
                  </div>
                  <div style="font-weight:800;font-size:15px;color:${active ? '#ffd166' : '#fff'};">${c.name}</div>
                  <div style="font-size:11px;color:#b8add4;margin-top:2px;">${c.combatStyle}</div>
                </button>
              `;
            })
            .join('')}
        </div>

        <!-- Selected Class Detailed Breakdown -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;background:rgba(18,12,38,0.88);border:1px solid rgba(125,226,255,0.25);border-radius:14px;padding:16px;">
          <div>
            <span style="font-size:11px;color:#80ffdb;letter-spacing:1.5px;text-transform:uppercase;">${cls.title}</span>
            <h3 style="margin:4px 0 8px;font-size:22px;color:#fff;">${cls.name}</h3>
            <p style="font-size:13px;color:#d6cce8;line-height:1.5;margin:0 0 12px;">${cls.concept}</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
              <div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.05);">
                <div style="font-size:10px;color:#9d8ec4;">VIDA BASE</div>
                <div style="font-size:16px;font-weight:800;color:#ff6b8b;">♥ ${cls.baseStats.maxHp}</div>
              </div>
              <div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.05);">
                <div style="font-size:10px;color:#9d8ec4;">DANO BASE</div>
                <div style="font-size:16px;font-weight:800;color:#ffd166;">⚔ ${cls.baseStats.baseDamage}</div>
              </div>
              <div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.05);">
                <div style="font-size:10px;color:#9d8ec4;">VELOCIDADE</div>
                <div style="font-size:16px;font-weight:800;color:#7de2ff;">⚡ ${cls.baseStats.moveSpeed}</div>
              </div>
            </div>
            <div style="font-size:12px;color:#ffd166;font-weight:700;margin-bottom:6px;">Pré-visualização de Evoluções:</div>
            <ul style="margin:0;padding-left:18px;font-size:12px;color:#cfc4e8;line-height:1.5;">
              ${cls.evolutionsPreview.map(ev => `<li>${ev}</li>`).join('')}
            </ul>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="padding:9px 12px;border-radius:9px;background:rgba(255,255,255,0.05);border-left:3px solid #7de2ff;">
              <div style="font-size:12px;font-weight:800;color:#7de2ff;">${cls.primaryAttack.icon} Ataque Principal — ${cls.primaryAttack.name}</div>
              <div style="font-size:11px;color:#cfc4e8;">${cls.primaryAttack.description}</div>
            </div>
            <div style="padding:9px 12px;border-radius:9px;background:rgba(255,255,255,0.05);border-left:3px solid #ffd166;">
              <div style="font-size:12px;font-weight:800;color:#ffd166;">${cls.specialSkill.icon} Especial — ${cls.specialSkill.name} (${cls.specialSkill.cooldown}s)</div>
              <div style="font-size:11px;color:#cfc4e8;">${cls.specialSkill.description}</div>
            </div>
            <div style="padding:9px 12px;border-radius:9px;background:rgba(255,255,255,0.05);border-left:3px solid #80ffdb;">
              <div style="font-size:12px;font-weight:800;color:#80ffdb;">${cls.mobilitySkill.icon} Mobilidade — ${cls.mobilitySkill.name} (${cls.mobilitySkill.cooldown}s)</div>
              <div style="font-size:11px;color:#cfc4e8;">${cls.mobilitySkill.description}</div>
            </div>
            <div style="padding:9px 12px;border-radius:9px;background:rgba(255,255,255,0.05);border-left:3px solid #c77dff;">
              <div style="font-size:12px;font-weight:800;color:#e0aaff;">${cls.passive.icon} Passiva — ${cls.passive.name}</div>
              <div style="font-size:11px;color:#cfc4e8;">${cls.passive.description}</div>
            </div>
            <div style="padding:9px 12px;border-radius:9px;background:rgba(255,255,255,0.05);border-left:3px solid #ff4ecd;">
              <div style="font-size:12px;font-weight:800;color:#ff99d8;">${cls.ultimateSkill.icon} Ultimate — ${cls.ultimateSkill.name}</div>
              <div style="font-size:11px;color:#cfc4e8;">${cls.ultimateSkill.description}</div>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:auto;">
          <button data-act="start-training" style="padding:12px 20px;border-radius:12px;border:1px solid #7de2ff;background:rgba(125,226,255,0.16);color:#7de2ff;font-weight:800;font-size:14px;cursor:pointer;">
            🎯 Experimentar na Arena de Treino
          </button>
          <button data-act="launch-campaign" style="padding:14px 28px;border-radius:12px;border:2px solid #ffd166;background:linear-gradient(135deg,#ffd166,#f77f00);color:#140926;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 0 25px rgba(255,209,102,0.45);">
            INICIAR CAMPANHA COM ${cls.name.toUpperCase()} ✦
          </button>
        </div>
      `;
      uiLayer.appendChild(modal);
      bindUiActions();
      return;
    }

    // 4. SKILL TREE & EVOLUTIONS SCREEN
    if (currentScreen === 'skill_tree') {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.95);padding:max(16px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left));pointer-events:auto;overflow-y:auto;display:flex;flex-direction:column;gap:14px;';
      wrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <button data-act="back-menu" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(20,14,36,0.9);color:#fff;cursor:pointer;">
            ← Voltar
          </button>
          <button data-act="open-class-select" style="padding:8px 16px;border-radius:8px;border:1px solid #ffd166;background:rgba(255,209,102,0.2);color:#ffd166;font-weight:800;cursor:pointer;">
            Escolher Classe e Jogar →
          </button>
        </div>
        ${renderSkillTreeContent(selectedClassId, false)}
      `;
      uiLayer.appendChild(wrap);
      bindUiActions();
      return;
    }

    // 5. MULTIPLAYER CO-OP LOBBY (GDD 12)
    if (currentScreen === 'coop_lobby') {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;inset:0;background:rgba(8,4,20,0.94);padding:24px;pointer-events:auto;overflow-y:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;';
      wrap.innerHTML = `
        <div style="max-width:620px;width:100%;background:rgba(20,12,42,0.95);border:1px solid rgba(125,226,255,0.35);border-radius:16px;padding:22px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div>
              <span style="font-size:11px;color:#7de2ff;letter-spacing:2px;">COOPERATIVO ONLINE DE 2 JOGADORES</span>
              <h2 style="margin:2px 0 0;color:#ffd166;">Salão da Aliança Arcana</h2>
            </div>
            <button data-act="back-menu" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#fff;cursor:pointer;">← Voltar</button>
          </div>
          <p style="font-size:13px;color:#cfc4e8;line-height:1.5;margin-bottom:16px;">
            Joga em dupla com outro jogador (via código de sala sincronizado) ou ativa um <strong>Parceiro Arcano de IA</strong> que luta ao teu lado, combina sinergias e permite ressurreição cooperativa no campo!
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

          <button data-act="coop-start-ai" style="width:100%;padding:14px;border-radius:12px;border:2px solid #f15bb5;background:linear-gradient(135deg,rgba(241,91,181,0.28),rgba(58,20,88,0.92));color:#fff;font-weight:800;font-size:15px;cursor:pointer;">
            ⚡ Iniciar Aventura Cooperativa Agora (Com Guardião Aliado)
          </button>
        </div>
      `;
      uiLayer.appendChild(wrap);
      bindUiActions();
      return;
    }

    // 6. GRIMÓRIO COMPENDIUM (GDD 9.3)
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
                <strong>Mecânica Ambiental (${c.environmentalMechanic.name}):</strong> ${c.environmentalMechanic.description}
              </div>
            </div>`
          ).join('')}
        </div>`;
      }

      wrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <span style="font-size:11px;color:#e0aaff;letter-spacing:2px;">ENCICLOPÉDIA PERMANENTE</span>
            <h2 style="margin:0;color:#ffd166;">Grimório da Ascensão</h2>
          </div>
          <button data-act="back-menu" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.25);background:rgba(20,14,36,0.9);color:#fff;cursor:pointer;">← Voltar</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${(
            [
              ['classes', '🌿 Árvores de Classe'],
              ['upgrades', `🃏 Cartas & Evoluções (${ARCANA_UPGRADES.length})`],
              ['enemies', '👾 Bestiário (10)'],
              ['bosses', '👑 Guardiões Boss (6)'],
              ['biomes', '🏛 Campanhas & Biomas (6)'],
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
            <h2 style="margin:0;color:#ffd166;">🔥 Graus de Ascensão</h2>
            <button data-act="back-menu" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#fff;cursor:pointer;">← Voltar</button>
          </div>
          <p style="font-size:13px;color:#cfc4e8;margin-bottom:14px;">
            Escolhe o nível de desafio arcano. Graus superiores aumentam a ferocidade dos Guardiões e a recompensa de Essência Eterna.
          </p>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            <button data-act="pick-asc:0" style="padding:12px;border-radius:10px;border:2px solid ${
              selectedAscension === 0 ? '#00f5d4' : 'rgba(255,255,255,0.15)'
            };background:rgba(255,255,255,0.05);color:#fff;text-align:left;cursor:pointer;">
              <strong>Ascensão 0 — Iniciação Padrão</strong> · Equilíbrio original das cinco campanhas.
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

    // 8. SETTINGS MODAL (GDD 11 & 16)
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
            <div style="font-size:12px;font-weight:700;color:#7de2ff;margin-bottom:6px;">Perfil de Qualidade Gráfica 2.5D</div>
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
            <span>Ataque Principal Automático por Padrão</span>
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

    // 9. IN-GAME HUD & INTERACTIVE OVERLAYS (GDD 11)
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
        <!-- Top Bar: Player Status (Left), Campaign/Boss Bar (Center), Quick Actions (Right) -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
          <!-- Player Status Card -->
          <div class="arcana-hud-interactive" style="pointer-events:auto;background:rgba(12,8,28,0.84);border:1px solid rgba(125,226,255,0.3);border-radius:12px;padding:8px 12px;min-width:210px;backdrop-filter:blur(6px);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-weight:800;font-size:13px;color:#ffd166;">${cls.primaryAttack.icon} ${cls.name} · <span id="arc-hud-lv">Nv.${p.level}</span></span>
              <span id="arc-hud-frags" style="font-size:12px;color:#80ffdb;font-weight:700;">◈ ${p.arcaneFragments}</span>
            </div>
            <!-- HP Bar -->
            <div style="width:100%;height:10px;background:#1c1130;border-radius:99px;overflow:hidden;margin-bottom:4px;border:1px solid rgba(255,255,255,0.15);">
              <div id="arc-hud-hp-fill" style="height:100%;width:${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100))}%;background:linear-gradient(90deg,#ff2a54,#ff758f);transition:width 0.12s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#e2dbf0;margin-bottom:4px;">
              <span id="arc-hud-hp-text">♥ ${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}${p.shield > 0 ? ` (+${Math.ceil(p.shield)} 🛡)` : ''}</span>
              <span id="arc-hud-passive" style="color:#ffd166;font-weight:700;"></span>
            </div>
            <!-- XP Bar -->
            <div style="width:100%;height:5px;background:#140d24;border-radius:99px;overflow:hidden;">
              <div id="arc-hud-xp-fill" style="height:100%;width:${Math.min(100, (p.xp / Math.max(1, p.xpToNext)) * 100)}%;background:linear-gradient(90deg,#00f5d4,#7de2ff);"></div>
            </div>
          </div>

          <!-- Center Campaign / Boss Header -->
          <div style="display:flex;flex-direction:column;align-items:center;flex:1;max-width:440px;">
            <div style="padding:5px 14px;border-radius:99px;background:rgba(12,8,28,0.84);border:1px solid ${camp.palette.accentRunes};font-size:11px;font-weight:800;color:#fff;margin-bottom:6px;">
              ${st.isTrainingArena ? '🎯 ARENA DE TREINO LIVRE' : st.isTutorial ? '🎓 INICIAÇÃO ARCANA' : `CAMPANHA ${camp.roman} — ${camp.name.toUpperCase()}`} · <span id="arc-hud-timer">00:00</span>
            </div>
            <div id="arc-hud-boss-wrap" style="width:100%;display:${st.boss ? 'block' : 'none'};background:rgba(20,6,28,0.92);border:1px solid #ff4d6d;border-radius:10px;padding:6px 10px;">
              <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;color:#ffd166;margin-bottom:3px;">
                <span id="arc-hud-boss-name">${st.boss ? `${st.boss.def.name} (Fase ${st.boss.currentPhase})` : ''}</span>
                <span id="arc-hud-boss-hp">${st.boss ? `${Math.ceil(st.boss.hp)} / ${st.boss.maxHp}` : ''}</span>
              </div>
              <div style="width:100%;height:10px;background:#240818;border-radius:99px;overflow:hidden;">
                <div id="arc-hud-boss-fill" style="height:100%;width:${st.boss ? Math.max(0, (st.boss.hp / st.boss.maxHp) * 100) : 100}%;background:linear-gradient(90deg,#ff0054,#ffbe0b);"></div>
              </div>
            </div>
            <div id="arc-hud-banner" style="margin-top:6px;padding:6px 14px;border-radius:8px;background:rgba(16,10,36,0.9);border:1px solid #ffd166;font-size:12px;font-weight:800;color:#ffd166;display:none;text-align:center;"></div>
          </div>

          <!-- Top-Right Utility Buttons -->
          <div class="arcana-hud-interactive" style="pointer-events:auto;display:flex;gap:6px;align-items:center;">
            ${
              st.isTrainingArena
                ? `<button data-act="training-levelup" style="padding:7px 10px;border-radius:8px;border:1px solid #00f5d4;background:rgba(0,245,212,0.18);color:#80ffdb;font-size:11px;font-weight:800;cursor:pointer;">+ Subir Nível</button>
                   <button data-act="training-boss" style="padding:7px 10px;border-radius:8px;border:1px solid #ff4d6d;background:rgba(255,77,109,0.2);color:#ff99ac;font-size:11px;font-weight:800;cursor:pointer;">Invocar Boss</button>`
                : ''
            }
            <button data-act="toggle-inrun-tree" title="Árvore de Habilidades (Tecla K)" style="padding:8px 11px;border-radius:10px;border:1px solid #ffd166;background:rgba(16,10,34,0.88);color:#ffd166;font-weight:800;font-size:12px;cursor:pointer;">
              🌿 Árvore [K]
            </button>
            <button data-act="toggle-pause" title="Pausa (Esc)" style="padding:8px 11px;border-radius:10px;border:1px solid rgba(255,255,255,0.25);background:rgba(16,10,34,0.88);color:#fff;font-weight:800;font-size:12px;cursor:pointer;">
              Ⅱ
            </button>
          </div>
        </div>

        <!-- Tutorial Prompt Box (if active) -->
        ${
          st.tutorial.active
            ? `<div style="align-self:center;max-width:460px;background:rgba(14,24,42,0.92);border:1px solid #80ffdb;border-radius:12px;padding:10px 16px;text-align:center;">
                <div style="font-size:10px;color:#80ffdb;font-weight:800;letter-spacing:1.5px;">${
                  TUTORIAL_STEPS[Math.min(st.tutorial.stepIndex, TUTORIAL_STEPS.length - 1)].badge
                }</div>
                <div style="font-size:14px;font-weight:800;color:#ffd166;margin:2px 0;">${
                  TUTORIAL_STEPS[Math.min(st.tutorial.stepIndex, TUTORIAL_STEPS.length - 1)].title
                }</div>
                <div style="font-size:12px;color:#e2dbf0;">${
                  TUTORIAL_STEPS[Math.min(st.tutorial.stepIndex, TUTORIAL_STEPS.length - 1)].instruction
                }</div>
              </div>`
            : ''
        }

        <!-- Bottom Touch Controls: Left Virtual Move Stick + Center Interact Prompt + Right Action Arc -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:auto;">
          <!-- Left Virtual Joystick -->
          <div id="arc-joy-move" class="arcana-hud-interactive" style="pointer-events:auto;width:118px;height:118px;border-radius:50%;background:radial-gradient(circle,rgba(125,226,255,0.14),rgba(12,8,28,0.65));border:2px solid rgba(125,226,255,0.35);position:relative;display:flex;align-items:center;justify-content:center;touch-action:none;">
            <div id="arc-joy-move-knob" style="width:46px;height:46px;border-radius:50%;background:radial-gradient(circle,#7de2ff,#2b5876);box-shadow:0 0 14px #7de2ff;transform:translate(0px,0px);pointer-events:none;"></div>
          </div>

          <!-- Center Contextual Interact / Next Campaign Portal Button -->
          <div class="arcana-hud-interactive" style="pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <button id="arc-btn-interact" data-act="hud-interact" style="display:none;padding:10px 18px;border-radius:99px;border:2px solid #ffd166;background:linear-gradient(135deg,#3d1e6d,#140926);color:#ffd166;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 0 20px rgba(255,209,102,0.45);">
              ✋ Interagir com Altar [F]
            </button>
            ${
              st.phase === 'F_CONCLUSION'
                ? `<button data-act="next-campaign" style="padding:12px 22px;border-radius:99px;border:2px solid #00f5d4;background:linear-gradient(135deg,#00f5d4,#1b3b5c);color:#08121e;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 0 26px #00f5d4;">
                    🌀 ATRAVESSAR PORTAL DA PRÓXIMA CAMPANHA →
                  </button>`
                : ''
            }
          </div>

          <!-- Right Action Buttons Cluster -->
          <div class="arcana-hud-interactive" style="pointer-events:auto;display:flex;align-items:flex-end;gap:8px;">
            <div style="display:grid;grid-template-columns:repeat(2,62px);gap:8px;">
              <button id="arc-btn-dash" data-act="hud-dash" style="width:62px;height:62px;border-radius:50%;border:2px solid #80ffdb;background:rgba(14,24,42,0.88);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">
                <span style="font-size:18px;">${cls.mobilitySkill.icon}</span>
                <span id="arc-cd-dash" style="font-size:9px;color:#80ffdb;font-weight:700;">ESQUIVA</span>
              </button>
              <button id="arc-btn-special" data-act="hud-special" style="width:62px;height:62px;border-radius:50%;border:2px solid #ffd166;background:rgba(28,16,48,0.88);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">
                <span style="font-size:18px;">${cls.specialSkill.icon}</span>
                <span id="arc-cd-special" style="font-size:9px;color:#ffd166;font-weight:700;">ESPECIAL</span>
              </button>
              <button id="arc-btn-auto" data-act="hud-auto" style="width:62px;height:52px;border-radius:14px;border:1px solid ${
                input.autoAttackEnabled ? '#00f5d4' : 'rgba(255,255,255,0.25)'
              };background:${
                input.autoAttackEnabled ? 'rgba(0,245,212,0.2)' : 'rgba(16,10,32,0.8)'
              };color:#fff;font-size:10px;font-weight:800;cursor:pointer;">
                AUTO: ${input.autoAttackEnabled ? 'ON' : 'OFF'}
              </button>
              <button id="arc-btn-ult" data-act="hud-ult" style="width:62px;height:62px;border-radius:50%;border:2px solid #ff4ecd;background:rgba(42,12,48,0.9);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">
                <span style="font-size:18px;">${cls.ultimateSkill.icon}</span>
                <span id="arc-cd-ult" style="font-size:9px;color:#ff99d8;font-weight:700;">${Math.floor(p.ultimateCharge)}%</span>
              </button>
            </div>

            <!-- Right Aim / Primary Attack Virtual Stick -->
            <div id="arc-joy-aim" style="width:94px;height:94px;border-radius:50%;background:radial-gradient(circle,rgba(255,209,102,0.22),rgba(24,12,42,0.75));border:2px solid #ffd166;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;">
              <span style="font-size:22px;pointer-events:none;">${cls.primaryAttack.icon}</span>
              <span style="font-size:9px;color:#ffd166;font-weight:800;pointer-events:none;">MIRAR</span>
            </div>
          </div>
        </div>
      `;
      uiLayer.appendChild(hud);
      bindTouchJoysticks();

      // SPECIALIZATION PICKER MODAL (Level 2 unlock!)
      if (showSpecChoiceModal && !p.specializationId) {
        const specModal = document.createElement('div');
        specModal.className = 'arcana-modal';
        specModal.style.cssText =
          'position:absolute;inset:0;background:rgba(6,3,16,0.88);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;pointer-events:auto;z-index:10010;overflow-y:auto;';
        specModal.innerHTML = `
          <div style="max-width:820px;width:100%;text-align:center;">
            <span style="font-size:11px;letter-spacing:3px;color:#80ffdb;text-transform:uppercase;">DESPERTAR DE CLASSE · NÍVEL ${p.level}</span>
            <h2 style="margin:4px 0 6px;font-size:26px;color:#ffd166;">Escolhe o Ramo da Tua Árvore de Especialização</h2>
            <p style="font-size:13px;color:#cfc4e8;margin:0 0 18px;">
              Esta escolha define a tua especialização principal e desbloqueia nós passivos adicionais nos níveis 5 e 8.
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;">
              ${cls.specializations
                .map(
                  spec => `
                  <button data-act="choose-spec:${spec.id}" style="padding:16px;border-radius:14px;border:2px solid #ffd166;background:linear-gradient(165deg,rgba(44,24,78,0.95),rgba(16,10,34,0.98));color:#fff;text-align:left;cursor:pointer;transition:transform 0.15s;">
                    <div style="font-size:32px;margin-bottom:6px;">${spec.icon}</div>
                    <div style="font-size:17px;font-weight:900;color:#ffd166;">${spec.name}</div>
                    <div style="font-size:11px;color:#80ffdb;margin-bottom:8px;">${spec.subtitle}</div>
                    <p style="font-size:12px;color:#e2dbf0;line-height:1.45;margin:0 0 10px;">${spec.description}</p>
                    <div style="font-size:11px;color:#b8add4;">
                      Nós da Árvore: <strong>${spec.keyNodes.join(' → ')}</strong>
                    </div>
                  </button>`
                )
                .join('')}
            </div>
          </div>
        `;
        uiLayer.appendChild(specModal);
      }

      // 3-CARD LEVEL UP DRAFT MODAL (GDD 8)
      else if (st.pendingLevelUps > 0 && st.currentUpgradeChoices.length > 0) {
        const draftModal = document.createElement('div');
        draftModal.className = 'arcana-modal';
        draftModal.style.cssText =
          'position:absolute;inset:0;background:rgba(6,3,16,0.86);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;pointer-events:auto;z-index:10010;overflow-y:auto;';
        draftModal.innerHTML = `
          <div style="max-width:860px;width:100%;text-align:center;">
            <div style="font-size:11px;letter-spacing:3px;color:#00f5d4;text-transform:uppercase;">ASCENSÃO DE PODER · NÍVEL ${p.level}</div>
            <h2 style="margin:4px 0 14px;font-size:24px;color:#ffd166;">Escolhe um Aprimoramento Arcano</h2>
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
                        <div style="font-size:11px;color:#80ffdb;margin-bottom:2px;">${CATEGORY_LABELS[card.category]} · Nv.${curStacks + 1}/${card.maxStacks}</div>
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
            <button data-act="toggle-inrun-tree" style="padding:8px 16px;border-radius:8px;border:1px solid #7de2ff;background:rgba(125,226,255,0.14);color:#7de2ff;font-weight:700;cursor:pointer;">
              🌿 Inspecionar Árvore de Habilidades & Sinergias Ativas
            </button>
          </div>
        `;
        uiLayer.appendChild(draftModal);
      }

      // IN-RUN SKILL TREE & BUILD INSPECTOR OVERLAY
      if (showInRunSkillTree) {
        const treeOverlay = document.createElement('div');
        treeOverlay.className = 'arcana-modal';
        treeOverlay.style.cssText =
          'position:absolute;inset:0;background:rgba(8,4,20,0.95);padding:20px;pointer-events:auto;z-index:10020;overflow-y:auto;';
        treeOverlay.innerHTML = `
          <div style="max-width:960px;margin:0 auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h2 style="margin:0;color:#ffd166;">🌿 Árvore de Habilidades & Build da Aventura</h2>
              <button data-act="toggle-inrun-tree" style="padding:8px 16px;border-radius:8px;border:1px solid #00f5d4;background:rgba(0,245,212,0.2);color:#fff;font-weight:800;cursor:pointer;">
                Fechar [K / Esc]
              </button>
            </div>
            ${renderSkillTreeContent(p.classId, true)}
          </div>
        `;
        uiLayer.appendChild(treeOverlay);
      }

      // PAUSE / DEFEAT / VICTORY OVERLAY
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
              ${dead ? '☠ O Teu Corpo Astral Caiu' : 'Ⅱ Aventura em Pausa'}
            </h2>
            <p style="font-size:13px;color:#cfc4e8;margin:0;">
              ${cls.name} · Nível ${p.level} · Abates: ${st.kills} · Fragmentos: ◈ ${p.arcaneFragments}
            </p>
            ${
              !dead
                ? `<button data-act="toggle-pause" style="padding:12px;border-radius:10px;border:1px solid #00f5d4;background:rgba(0,245,212,0.22);color:#fff;font-weight:800;cursor:pointer;">▶ Continuar Combate</button>`
                : `<button data-act="restart-run" style="padding:12px;border-radius:10px;border:1px solid #ffd166;background:rgba(255,209,102,0.24);color:#ffd166;font-weight:800;cursor:pointer;">↻ Tentar Nova Ascensão</button>`
            }
            <button data-act="toggle-inrun-tree" style="padding:10px;border-radius:10px;border:1px solid rgba(125,226,255,0.35);background:rgba(255,255,255,0.06);color:#7de2ff;font-weight:700;cursor:pointer;">
              🌿 Ver Árvore de Habilidades
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
          renderUi();
        } else if (key === 'open-coop') {
          currentScreen = 'coop_lobby';
          renderUi();
        } else if (key === 'coop-create') {
          coop.createRoom(options.name || 'Arcanista', selectedClassId);
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

    // Passive gauge readout
    let passiveTxt = '';
    if (p.classId === 'chess') passiveTxt = `♔ Coordenação: ${p.chessCoordinationStacks}/10`;
    else if (p.classId === 'chrono') passiveTxt = `⚙ Sequência: ${p.chronoSequenceStacks}/8`;
    else if (p.classId === 'chaos') passiveTxt = `🌀 Instabilidade: ${Math.floor(p.chaosInstability)}%`;
    else if (p.classId === 'rune') passiveTxt = `📜 Glifos: ${p.runeActiveSymbols.join('·') || '—'}`;
    setTxt('arc-hud-passive', passiveTxt);

    // Timer
    const mins = Math.floor(st.elapsedCampaignSec / 60);
    const secs = Math.floor(st.elapsedCampaignSec % 60);
    setTxt('arc-hud-timer', `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);

    // Cooldowns
    setTxt(
      'arc-cd-dash',
      p.mobilityCooldown > 0 ? `${p.mobilityCooldown.toFixed(1)}s` : 'ESQUIVA'
    );
    setTxt(
      'arc-cd-special',
      p.specialCooldown > 0 ? `${p.specialCooldown.toFixed(1)}s` : 'ESPECIAL'
    );
    setTxt('arc-cd-ult', p.ultimateCharge >= 100 ? 'PRONTO!' : `${Math.floor(p.ultimateCharge)}%`);

    // Boss bar
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

    // Status Banner
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

    // Nearby interactive POI button
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

  // ============================================================================
  // Main Loop
  // ============================================================================
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
        // Compute movement vector from WASD/Arrows + virtual stick
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

        // Check POI interaction
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

        // Clear one-shot triggers
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

      renderer.render(runState, dt);
      updateHudFast();
    } else {
      // Animate lightweight 2.5D background scene behind menus
      menuBackdropState.elapsedCampaignSec += dt;
      menuBackdropState.player.animTime += dt;
      renderer.render(menuBackdropState, dt);
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
