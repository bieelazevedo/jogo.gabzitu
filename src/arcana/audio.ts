// ============================================================================
// ASCENSÃO ARCANA — Procedural Web Audio Synthesizer & Adaptive Soundtrack
// Implements GDD Section 14 (Direção de Áudio)
// ============================================================================

import type { ArcanaClassId, ArcanaSettings, CampaignId } from './types';

export type ArcanaMusicTheme = CampaignId | 'menu' | 'boss';

export type ArcanaSfxName =
  | 'attack'
  | 'special'
  | 'dash'
  | 'ultimate'
  | 'hit'
  | 'player_hurt'
  | 'crit'
  | 'xp_pickup'
  | 'level_up'
  | 'card_pick'
  | 'poi_activate'
  | 'boss_warning'
  | 'victory'
  | 'defeat'
  | 'ui_click'
  | 'ui_hover'
  | (string & {});

interface ThemeScaleConfig {
  rootFreq: number;
  ratios: number[];
  padWave: OscillatorType;
  leadWave: OscillatorType;
  tempoBpm: number;
  filterCutoff: number;
  ambienceType: 'wind_ruins' | 'ember_crackle' | 'cathedral_choir' | 'desert_sand' | 'cosmic_rift' | 'infinite_pulse' | 'menu_void';
}

const THEME_CONFIGS: Record<ArcanaMusicTheme, ThemeScaleConfig> = {
  menu: {
    rootFreq: 110, // A2 minor/dorian dark arcane
    ratios: [1, 1.125, 1.2, 1.5, 1.6, 1.8, 2],
    padWave: 'sine',
    leadWave: 'triangle',
    tempoBpm: 72,
    filterCutoff: 650,
    ambienceType: 'menu_void',
  },
  runes: {
    rootFreq: 130.81, // C3 minor pentatonic + mystical 6th
    ratios: [1, 1.2, 1.333, 1.5, 1.6, 1.8, 2],
    padWave: 'triangle',
    leadWave: 'sine',
    tempoBpm: 96,
    filterCutoff: 950,
    ambienceType: 'wind_ruins',
  },
  ash: {
    rootFreq: 116.54, // Bb2 phrygian dominant (fiery/tense)
    ratios: [1, 1.067, 1.25, 1.333, 1.5, 1.6, 1.875, 2],
    padWave: 'sawtooth',
    leadWave: 'triangle',
    tempoBpm: 112,
    filterCutoff: 820,
    ambienceType: 'ember_crackle',
  },
  cloister: {
    rootFreq: 146.83, // D3 harmonic minor (gothic mirror cathedral)
    ratios: [1, 1.125, 1.2, 1.333, 1.5, 1.6, 1.875, 2],
    padWave: 'sine',
    leadWave: 'sawtooth',
    tempoBpm: 104,
    filterCutoff: 1100,
    ambienceType: 'cathedral_choir',
  },
  hourglasses: {
    rootFreq: 123.47, // B2 lydian/hijaz clockwork desert
    ratios: [1, 1.067, 1.25, 1.414, 1.5, 1.667, 1.875, 2],
    padWave: 'triangle',
    leadWave: 'square',
    tempoBpm: 120,
    filterCutoff: 1250,
    ambienceType: 'desert_sand',
  },
  rift: {
    rootFreq: 98.0, // G2 cosmic diminished / altered
    ratios: [1, 1.067, 1.2, 1.414, 1.5, 1.6, 1.778, 2],
    padWave: 'sawtooth',
    leadWave: 'sawtooth',
    tempoBpm: 132,
    filterCutoff: 1400,
    ambienceType: 'cosmic_rift',
  },
  infinite: {
    rootFreq: 138.59, // C#3 astral Minor
    ratios: [1, 1.125, 1.2, 1.333, 1.5, 1.667, 1.875, 2],
    padWave: 'sawtooth',
    leadWave: 'triangle',
    tempoBpm: 138,
    filterCutoff: 1550,
    ambienceType: 'infinite_pulse',
  },
  boss: {
    rootFreq: 92.5, // F#2 intense boss escalation
    ratios: [1, 1.067, 1.2, 1.333, 1.414, 1.5, 1.6, 1.875, 2],
    padWave: 'sawtooth',
    leadWave: 'sawtooth',
    tempoBpm: 148,
    filterCutoff: 1800,
    ambienceType: 'cosmic_rift',
  },
};

export class ArcanaAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private uiGain: GainNode | null = null;

  private settings: ArcanaSettings = {
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

  private currentTheme: ArcanaMusicTheme = 'menu';
  private baseCampaignTheme: ArcanaMusicTheme = 'runes';
  private bossModeActive = false;
  private isPaused = false;
  private unlocked = false;

  private musicTimerId: number | null = null;
  private stepCounter = 0;
  private ambienceNodes: AudioNode[] = [];
  private lastSfxTimestamp: Record<string, number> = {};

  constructor(initialSettings?: ArcanaSettings) {
    if (initialSettings) {
      this.settings = { ...initialSettings };
    }
    this.bindAutoUnlock();
  }

  private bindAutoUnlock(): void {
    if (typeof window === 'undefined') return;
    const handler = () => {
      this.unlock();
    };
    window.addEventListener('pointerdown', handler, { once: true, passive: true });
    window.addEventListener('touchstart', handler, { once: true, passive: true });
    window.addEventListener('keydown', handler, { once: true, passive: true });
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.9;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.ambienceGain = this.ctx.createGain();
        this.uiGain = this.ctx.createGain();

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.ambienceGain.connect(this.masterGain);
        this.uiGain.connect(this.masterGain);

        this.syncGainValues();
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }

      if (!this.unlocked) {
        this.unlocked = true;
        if (!this.isPaused) {
          this.restartSoundtrackLoop();
        }
      }
    } catch {
      // Ignore Web Audio restriction errors until next user gesture
    }
  }

  public applySettings(settings: ArcanaSettings): void {
    this.settings = { ...settings };
    this.syncGainValues();
  }

  private syncGainValues(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const muteFactor = this.isPaused ? 0 : 1;
    this.musicGain?.gain.setTargetAtTime(Math.max(0, Math.min(1, this.settings.musicVolume)) * 0.28 * muteFactor, now, 0.08);
    this.sfxGain?.gain.setTargetAtTime(Math.max(0, Math.min(1, this.settings.sfxVolume)) * 0.55 * muteFactor, now, 0.05);
    this.ambienceGain?.gain.setTargetAtTime(Math.max(0, Math.min(1, this.settings.ambienceVolume)) * 0.25 * muteFactor, now, 0.1);
    this.uiGain?.gain.setTargetAtTime(Math.max(0, Math.min(1, this.settings.uiVolume)) * 0.45, now, 0.04);
  }

  public vibrate(pattern: number | number[]): void {
    if (!this.settings.vibrationEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore unsupported devices
    }
  }

  public setTheme(theme: ArcanaMusicTheme, isBossEscalation = false): void {
    if (theme !== 'boss' && theme !== 'menu') {
      this.baseCampaignTheme = theme;
    }
    this.bossModeActive = isBossEscalation || theme === 'boss';
    const nextTheme: ArcanaMusicTheme = this.bossModeActive && theme !== 'menu' ? 'boss' : theme;

    if (this.currentTheme === nextTheme && this.musicTimerId !== null) {
      return;
    }
    this.currentTheme = nextTheme;
    this.stepCounter = 0;
    if (this.unlocked && !this.isPaused) {
      this.restartSoundtrackLoop();
    }
  }

  public startMusic(theme: ArcanaMusicTheme = 'menu', isBossEscalation = false): void {
    this.isPaused = false;
    this.setTheme(theme, isBossEscalation);
    this.syncGainValues();
    if (this.unlocked && this.musicTimerId === null) {
      this.restartSoundtrackLoop();
    }
  }

  public setBossMode(active: boolean): void {
    if (this.bossModeActive === active) return;
    this.bossModeActive = active;
    const target = active ? 'boss' : this.baseCampaignTheme;
    this.setTheme(target, active);
  }

  public stopMusic(): void {
    if (this.musicTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    this.stopAmbienceDrone();
  }

  public pause(): void {
    this.isPaused = true;
    this.syncGainValues();
  }

  public resume(): void {
    this.isPaused = false;
    this.unlock();
    this.syncGainValues();
    if (this.musicTimerId === null) {
      this.restartSoundtrackLoop();
    }
  }

  public destroy(): void {
    this.stopMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }

  // ==========================================================================
  // Procedural Adaptive Soundtrack & Ambience Generator
  // ==========================================================================

  private restartSoundtrackLoop(): void {
    if (typeof window === 'undefined' || !this.ctx) return;
    this.stopMusic();

    const cfg = THEME_CONFIGS[this.currentTheme] ?? THEME_CONFIGS.runes;
    this.startAmbienceDrone(cfg);

    const stepDurationMs = Math.round((60 / cfg.tempoBpm / 2) * 1000); // 8th notes
    this.musicTimerId = window.setInterval(() => {
      if (this.isPaused || !this.ctx || this.ctx.state !== 'running') return;
      this.playSequencerStep(cfg, this.stepCounter++);
    }, stepDurationMs);
  }

  private startAmbienceDrone(cfg: ThemeScaleConfig): void {
    if (!this.ctx || !this.ambienceGain) return;
    this.stopAmbienceDrone();

    try {
      const now = this.ctx.currentTime;
      // Sub-harmonic arcane drone
      const droneOsc1 = this.ctx.createOscillator();
      const droneOsc2 = this.ctx.createOscillator();
      const droneFilter = this.ctx.createBiquadFilter();
      const droneGain = this.ctx.createGain();

      droneOsc1.type = 'sine';
      droneOsc1.frequency.setValueAtTime(cfg.rootFreq * 0.5, now);

      droneOsc2.type = cfg.padWave;
      droneOsc2.frequency.setValueAtTime(cfg.rootFreq * 0.75, now); // Fifth

      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(240, now);

      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.linearRampToValueAtTime(0.32, now + 1.5);

      droneOsc1.connect(droneFilter);
      droneOsc2.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.ambienceGain);

      droneOsc1.start(now);
      droneOsc2.start(now);

      this.ambienceNodes.push(droneOsc1, droneOsc2, droneFilter, droneGain);
    } catch {
      // Ignore audio node allocation error
    }
  }

  private stopAmbienceDrone(): void {
    for (const node of this.ambienceNodes) {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped
      }
    }
    this.ambienceNodes = [];
  }

  private playSequencerStep(cfg: ThemeScaleConfig, step: number): void {
    if (!this.ctx || !this.musicGain) return;
    if (this.settings.musicVolume <= 0.01) return;

    const now = this.ctx.currentTime;
    const barStep = step % 16;

    // 1. Pad chord every 8 steps
    if (barStep === 0 || barStep === 8) {
      const chordIdx = ((step >> 3) * 2) % cfg.ratios.length;
      const freq1 = cfg.rootFreq * cfg.ratios[chordIdx];
      const freq2 = cfg.rootFreq * cfg.ratios[(chordIdx + 2) % cfg.ratios.length];
      this.triggerPadNote(freq1, 1.4, cfg.padWave, cfg.filterCutoff * 0.65);
      this.triggerPadNote(freq2, 1.4, 'sine', cfg.filterCutoff * 0.5);
    }

    // 2. Melodic arpeggio / motif
    const shouldPlayLead =
      this.bossModeActive
        ? barStep % 2 === 0 || barStep === 7 || barStep === 15
        : barStep === 0 || barStep === 3 || barStep === 6 || barStep === 10 || barStep === 12;

    if (shouldPlayLead) {
      const patternIndex = (step * 3 + (step >> 2)) % cfg.ratios.length;
      const octaveMult = barStep >= 10 ? 2 : 1;
      const leadFreq = cfg.rootFreq * cfg.ratios[patternIndex] * octaveMult;
      this.triggerArpNote(leadFreq, this.bossModeActive ? 0.22 : 0.35, cfg.leadWave, cfg.filterCutoff);
    }

    // 3. Rhythmic pulse in combat / boss themes
    if (this.currentTheme !== 'menu') {
      if (barStep % 4 === 0) {
        this.triggerPercussionPulse(cfg.rootFreq * 0.5, 0.14, this.bossModeActive ? 0.5 : 0.28);
      } else if (this.bossModeActive && barStep % 2 === 1) {
        this.triggerPercussionPulse(cfg.rootFreq * 0.75, 0.08, 0.22);
      }
    }

    // 4. Biome-specific ambient shimmer on step 14
    if (barStep === 14 && this.settings.ambienceVolume > 0.02) {
      this.triggerBiomeAccent(cfg, now);
    }
  }

  private triggerPadNote(freq: number, duration: number, type: OscillatorType, cutoff: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private triggerArpNote(freq: number, duration: number, type: OscillatorType, cutoff: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);
    filter.frequency.exponentialRampToValueAtTime(cutoff * 0.35, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  private triggerPercussionPulse(freq: number, duration: number, peakGain: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.6, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(32, freq * 0.45), now + duration);

    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private triggerBiomeAccent(cfg: ThemeScaleConfig, now: number): void {
    if (!this.ctx || !this.ambienceGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (cfg.ambienceType === 'desert_sand') {
      // Clockwork tick in desert of hourglasses
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.ambienceGain);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (cfg.ambienceType === 'cathedral_choir') {
      // High glass chime in inverted cloister
      osc.type = 'sine';
      osc.frequency.setValueAtTime(cfg.rootFreq * 4, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(this.ambienceGain);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (cfg.ambienceType === 'ember_crackle') {
      // Low magma pop
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ambienceGain);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  }

  // ==========================================================================
  // Procedural Sound Effects (Combat, Class-Distinct & UI)
  // ==========================================================================

  public playSfx(name: ArcanaSfxName, classId?: ArcanaClassId): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || !this.uiGain) return;

    // Rate-limit identical high-frequency SFX to avoid clipping during massive hordes
    const nowMs = performance.now();
    const key = classId ? `${name}_${classId}` : name;
    const minGapMs = name === 'hit' || name === 'xp_pickup' ? 35 : name === 'attack' ? 45 : 20;
    if (this.lastSfxTimestamp[key] && nowMs - this.lastSfxTimestamp[key] < minGapMs) {
      return;
    }
    this.lastSfxTimestamp[key] = nowMs;

    const now = this.ctx.currentTime;

    // UI Sounds route to uiGain
    if (name === 'ui_click') {
      this.synthTone(660, 880, 0.065, 'triangle', 0.28, this.uiGain);
      return;
    }
    if (name === 'ui_hover') {
      this.synthTone(520, 580, 0.035, 'sine', 0.12, this.uiGain);
      return;
    }
    if (name === 'card_pick') {
      this.synthTone(440, 660, 0.14, 'triangle', 0.35, this.uiGain);
      this.synthTone(660, 990, 0.22, 'sine', 0.3, this.uiGain, 0.05);
      this.vibrate(15);
      return;
    }

    // Class-distinct combat sounds
    if (name === 'attack' || name === 'special' || name === 'dash' || name === 'ultimate') {
      this.playClassCombatSfx(name as 'attack' | 'special' | 'dash' | 'ultimate', classId ?? 'chess', now);
      return;
    }

    switch (name) {
      case 'hit': {
        this.synthTone(240, 95, 0.075, 'triangle', 0.28, this.sfxGain);
        break;
      }
      case 'crit': {
        // Metallic crystalline critical slash
        this.synthTone(580, 1280, 0.11, 'sawtooth', 0.36, this.sfxGain);
        this.synthTone(1160, 1740, 0.16, 'sine', 0.28, this.sfxGain, 0.02);
        this.vibrate(12);
        break;
      }
      case 'player_hurt': {
        this.synthTone(185, 58, 0.24, 'sawtooth', 0.5, this.sfxGain);
        this.synthTone(130, 48, 0.26, 'square', 0.3, this.sfxGain, 0.02);
        this.vibrate([30, 20, 40]);
        break;
      }
      case 'xp_pickup': {
        const pitchJitter = 1 + (Math.random() * 0.18 - 0.06);
        this.synthTone(740 * pitchJitter, 1120 * pitchJitter, 0.08, 'sine', 0.22, this.sfxGain);
        break;
      }
      case 'level_up': {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          this.synthTone(freq, freq * 1.02, 0.28, 'triangle', 0.35, this.sfxGain!, idx * 0.065);
        });
        this.vibrate([20, 30, 45]);
        break;
      }
      case 'poi_activate': {
        this.synthTone(330, 660, 0.32, 'sine', 0.38, this.sfxGain);
        this.synthTone(495, 990, 0.38, 'triangle', 0.3, this.sfxGain, 0.08);
        this.vibrate(25);
        break;
      }
      case 'boss_warning': {
        // Deep ominous horn + dissonant overtone
        this.synthTone(110, 82.4, 0.75, 'sawtooth', 0.55, this.sfxGain);
        this.synthTone(155.56, 116.5, 0.75, 'sawtooth', 0.4, this.sfxGain, 0.04);
        this.vibrate([60, 40, 90]);
        break;
      }
      case 'victory': {
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq, i) => {
          this.synthTone(freq, freq, 0.55, 'triangle', 0.38, this.sfxGain!, i * 0.09);
        });
        this.vibrate([30, 40, 60, 40, 100]);
        break;
      }
      case 'defeat': {
        const descent = [392.0, 349.23, 311.13, 261.63];
        descent.forEach((freq, i) => {
          this.synthTone(freq, freq * 0.94, 0.42, 'sawtooth', 0.34, this.sfxGain!, i * 0.14);
        });
        this.vibrate([80, 50, 120]);
        break;
      }
      default: {
        // Fallback arcane pulse
        this.synthTone(420, 640, 0.1, 'sine', 0.25, this.sfxGain);
        break;
      }
    }
  }

  private playClassCombatSfx(
    action: 'attack' | 'special' | 'dash' | 'ultimate',
    classId: ArcanaClassId,
    _now: number
  ): void {
    if (!this.sfxGain) return;

    if (classId === 'chess') {
      // Mago do Xadrez: ivory/marble piece placement, sword-chime slash, horse leap, checkmate gong
      if (action === 'attack') {
        // Crisp ivory piece clack + spectral sword-chime
        this.synthTone(920, 360, 0.055, 'triangle', 0.34, this.sfxGain);
        this.synthTone(1380, 1620, 0.09, 'sine', 0.22, this.sfxGain, 0.015);
      } else if (action === 'special') {
        // Royal Gambit marble impact + harmonic chord
        this.synthTone(260, 140, 0.16, 'triangle', 0.42, this.sfxGain);
        this.synthTone(520, 780, 0.22, 'sawtooth', 0.28, this.sfxGain, 0.03);
      } else if (action === 'dash') {
        // Horse leap: rising arc whoosh + heavy stone landing
        this.synthTone(220, 580, 0.14, 'sine', 0.32, this.sfxGain);
        this.synthTone(150, 65, 0.14, 'triangle', 0.38, this.sfxGain, 0.12);
      } else if (action === 'ultimate') {
        // Checkmate Imperial Gong
        this.synthTone(130.81, 128, 0.85, 'sawtooth', 0.5, this.sfxGain);
        this.synthTone(261.63, 523.25, 0.75, 'triangle', 0.42, this.sfxGain, 0.03);
        this.synthTone(783.99, 1046.5, 0.6, 'sine', 0.35, this.sfxGain, 0.08);
        this.vibrate([40, 30, 80]);
      }
      return;
    }

    if (classId === 'chrono') {
      // Cronomante: clockwork gear tick, crystalline chime, time-warp whoosh, clock stop resonance
      if (action === 'attack') {
        // Escapement double-tick + crystal shard ping
        this.synthTone(1480, 1960, 0.045, 'square', 0.22, this.sfxGain);
        this.synthTone(2100, 1250, 0.08, 'sine', 0.28, this.sfxGain, 0.025);
      } else if (action === 'special') {
        // Echo of the Past crystalline chime
        this.synthTone(660, 1320, 0.2, 'sine', 0.35, this.sfxGain);
        this.synthTone(990, 1485, 0.24, 'triangle', 0.28, this.sfxGain, 0.06);
      } else if (action === 'dash') {
        // Time-warp whoosh
        this.synthTone(880, 220, 0.16, 'sawtooth', 0.3, this.sfxGain);
        this.synthTone(440, 1100, 0.14, 'sine', 0.26, this.sfxGain, 0.04);
      } else if (action === 'ultimate') {
        // Clock Stop Resonance: deep sub drop + suspended golden bell
        this.synthTone(320, 48, 0.65, 'sawtooth', 0.52, this.sfxGain);
        this.synthTone(1046.5, 1046.5, 0.8, 'sine', 0.4, this.sfxGain, 0.12);
        this.vibrate([50, 20, 70]);
      }
      return;
    }

    if (classId === 'chaos') {
      // Feiticeira do Caos: dice roll clatter, prismatic synth burst, erratic pop, carnival fanfare
      if (action === 'attack') {
        // Dice clatter + erratic prismatic pop
        const randBase = 380 + Math.random() * 280;
        this.synthTone(randBase, randBase * 1.65, 0.06, 'sawtooth', 0.28, this.sfxGain);
        this.synthTone(randBase * 1.8, randBase * 0.9, 0.05, 'triangle', 0.24, this.sfxGain, 0.03);
      } else if (action === 'special') {
        // Arcane Roulette spin + burst
        [400, 560, 720, 960].forEach((f, i) => {
          this.synthTone(f, f * 1.25, 0.07, 'square', 0.26, this.sfxGain!, i * 0.035);
        });
      } else if (action === 'dash') {
        // Erratic kaleidoscope pop
        this.synthTone(300, 1200, 0.11, 'sine', 0.35, this.sfxGain);
        this.synthTone(950, 420, 0.1, 'triangle', 0.28, this.sfxGain, 0.04);
      } else if (action === 'ultimate') {
        // Arcane Carnival Fanfare
        const notes = [349.23, 440, 523.25, 698.46, 880];
        notes.forEach((f, i) => {
          this.synthTone(f, f * 1.05, 0.35, 'sawtooth', 0.34, this.sfxGain!, i * 0.055);
        });
        this.vibrate([30, 20, 30, 20, 60]);
      }
      return;
    }

    // Tecelão de Runas ('rune'): stone carving hum, laser ley-line connection, glyph pierce, sacred chord
    if (action === 'attack') {
      // Glyph pierce whistle-cut
      this.synthTone(680, 1180, 0.085, 'triangle', 0.3, this.sfxGain);
      this.synthTone(340, 590, 0.08, 'sine', 0.22, this.sfxGain, 0.01);
    } else if (action === 'special') {
      // Stone carving hum + ley-line laser snap
      this.synthTone(165, 220, 0.18, 'sawtooth', 0.36, this.sfxGain);
      this.synthTone(880, 1320, 0.16, 'sine', 0.3, this.sfxGain, 0.05);
    } else if (action === 'dash') {
      // Runic translation pulse
      this.synthTone(440, 880, 0.13, 'triangle', 0.32, this.sfxGain);
      this.synthTone(220, 440, 0.15, 'sine', 0.28, this.sfxGain, 0.02);
    } else if (action === 'ultimate') {
      // The Great Inscription sacred chord
      const sacred = [220, 330, 440, 659.25, 880];
      sacred.forEach((f, i) => {
        this.synthTone(f, f, 0.7, 'triangle', 0.35, this.sfxGain!, i * 0.04);
      });
      this.vibrate([45, 25, 85]);
    }
  }

  private synthTone(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
    destination: AudioNode,
    delaySec = 0
  ): void {
    if (!this.ctx) return;
    try {
      const startTime = this.ctx.currentTime + delaySec;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(24, startFreq), startTime);
      if (Math.abs(endFreq - startFreq) > 1) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(24, endFreq), startTime + duration);
      }

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.015, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    } catch {
      // Ignore Web Audio scheduling errors
    }
  }
}

export const arcanaAudio = new ArcanaAudio();
