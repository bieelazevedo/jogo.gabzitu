// ============================================================================
// ASCENSÃO ARCANA — Commercial 3D Ravenswatch Dark-Fantasy Engine
// Built on Three.js + Real Textured PBR Terrain (forestGround & weatheredStone)
// + Dense Instanced 3D Scenery (dressNightWorld: Trees, Cobblestones, Fences,
//   Pumpkins, Cottages, Crypts, Lanterns, Ferns & Tall Grass)
// + Real Rigged .GLB Models (AstralMage, ScarletSorceress, LunarKnight,
//   ReaverKnight, KayKit Adventurers & Skeletons + Authored 3D Weapons)
// + Soft Antialiased Textured VFX (vfxTexture / fxTexture — ZERO blocky polygons)
// ============================================================================

import * as T from 'three';
import { gameGLTFLoader } from '../game-gltf';
import { contactShadows, forestGround, weatheredStone } from '../night-art-direction';
import {
  Actor,
  brightenFoliage,
  fxTexture,
  loadExtraPack,
  loadNightAssets,
  prop,
  type CharacterName,
  type NightAssets,
} from '../night-assets';
import { vfxTexture } from '../night-vfx-textures';
import { ARCANA_CAMPAIGNS, ARCANA_CLASSES } from './data';
import type {
  ActiveBoss,
  ActiveEnemy,
  ArcanaClassId,
  ArcanaRunState,
  CampaignDef,
  CampaignId,
  CoopPartnerState,
  EnemyArchetypeId,
  PlayerRuntimeState,
  QualityProfile,
} from './types';

declare global {
  interface Window {
    __ARCANA_3D_READY__?: boolean;
  }
}

// Scale factor converting 2D simulation coordinates (0..2200) into 3D meters
const WORLD_SCALE = 1 / 42;

const ease = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, t);
const turnAngle = (a: number, b: number, t: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * Math.min(1, t);

interface ElementalHero3DConfig {
  fallbackChar: CharacterName;
  modernModel: string;
  weaponProp: string;
  authoredWeapon?: string;
  offhandProp?: string;
  handGlowHex: number;
  handCoreHex: number;
  auraHex: number;
  slashClips: string[];
  castClip: string;
  ultClip: string;
}

const HERO_3D_CONFIG: Record<ArcanaClassId, ElementalHero3DConfig> = {
  // Mestre da Água (Kya — Sangue, Gelo & Cura) -> AstralMage + Priestess Staff & Grimoire
  chess: {
    fallbackChar: 'Mage',
    modernModel: 'AstralMage',
    weaponProp: '2H_Staff',
    authoredWeapon: 'weapon-PriestessStaff',
    offhandProp: 'Spellbook_open',
    handGlowHex: 0x00bbf9,
    handCoreHex: 0xe0fbfc,
    auraHex: 0x00f5d4,
    slashClips: ['Spellcast_Shoot', '1H_Melee_Attack_Slice_Horizontal', 'Spellcast_Long'],
    castClip: 'Spellcast_Long',
    ultClip: 'Spellcast_Summon',
  },
  // Guardião do Vento (Kael — Monge Nômade com Bastão Planador & Tornados) -> LunarKnight + 2H Glider Staff
  chrono: {
    fallbackChar: 'Rogue_Hooded',
    modernModel: 'LunarKnight',
    weaponProp: '2H_Staff',
    authoredWeapon: 'weapon-PriestessStaff',
    handGlowHex: 0x80ffdb,
    handCoreHex: 0xffffff,
    auraHex: 0x72efdd,
    slashClips: [
      '2H_Melee_Attack_Spin',
      '1H_Melee_Attack_Slice_Horizontal',
      '2H_Melee_Attack_Slice',
    ],
    castClip: '2H_Melee_Attack_Spin',
    ultClip: 'Spellcast_Raise',
  },
  // Guardião da Cinza-Solar (Iskra — Centelha Estelar, Combustão & Sol Negro) -> ScarletSorceress + Skull Staff
  chaos: {
    fallbackChar: 'Rogue_Crimson',
    modernModel: 'ScarletSorceress',
    weaponProp: '1H_Wand',
    authoredWeapon: 'weapon-SkullStaff',
    handGlowHex: 0xff5400,
    handCoreHex: 0xffd166,
    auraHex: 0xff0054,
    slashClips: ['Spellcast_Shoot', '1H_Melee_Attack_Slice_Diagonal', 'Spellcast_Long'],
    castClip: 'Spellcast_Long',
    ultClip: 'Spellcast_Summon',
  },
  // Guardião da Raiz-de-Ferro (Borak — Ferro, Magma Primordial & Sentido Sísmico) -> ReaverKnight + Bronze Axe & Shield
  rune: {
    fallbackChar: 'Barbarian',
    modernModel: 'ReaverKnight',
    weaponProp: '1H_Axe',
    authoredWeapon: 'weapon-Axe_Bronze',
    offhandProp: 'Barbarian_Round_Shield',
    handGlowHex: 0x52b788,
    handCoreHex: 0xffd166,
    auraHex: 0xffbe0b,
    slashClips: [
      '1H_Melee_Attack_Chop',
      '1H_Melee_Attack_Slice_Horizontal',
      '2H_Melee_Attack_Spin',
    ],
    castClip: '1H_Melee_Attack_Jump_Chop',
    ultClip: '2H_Melee_Attack_Spin',
  },
};

// Maps each of the 10 Enemy Archetypes to a rigged 3D .GLB model & weapons (preserving original textures!)
const ENEMY_3D_CONFIG: Record<
  EnemyArchetypeId,
  {
    model: CharacterName;
    rightWeapon?: string;
    leftWeapon?: string;
    eyeHex: number;
    scale: number;
  }
> = {
  patroller: {
    model: 'Skeleton_Minion',
    rightWeapon: 'Skeleton_Blade',
    eyeHex: 0xff4ecd,
    scale: 1.05,
  },
  ranged_caster: {
    model: 'Skeleton_Rogue',
    rightWeapon: '2H_Crossbow',
    eyeHex: 0x00bbf9,
    scale: 1.08,
  },
  charger: {
    model: 'Barbarian',
    rightWeapon: '1H_Axe',
    leftWeapon: '1H_Axe_Offhand',
    eyeHex: 0xffbe0b,
    scale: 1.22,
  },
  area_conjuror: {
    model: 'Skeleton_Mage',
    rightWeapon: 'Skeleton_Staff',
    eyeHex: 0x00f5d4,
    scale: 1.12,
  },
  summoner: {
    model: 'Mage',
    rightWeapon: '2H_Staff',
    eyeHex: 0xf72585,
    scale: 1.14,
  },
  shield_warden: {
    model: 'Skeleton_Warrior',
    rightWeapon: 'Skeleton_Axe',
    leftWeapon: 'Skeleton_Shield_Large_A',
    eyeHex: 0xff9f1c,
    scale: 1.25,
  },
  sigil_priest: {
    model: 'Mage',
    rightWeapon: '1H_Wand',
    eyeHex: 0xc77dff,
    scale: 1.1,
  },
  terrain_weaver: {
    model: 'Skeleton_Mage',
    rightWeapon: 'Skeleton_Staff',
    eyeHex: 0x80ffdb,
    scale: 1.15,
  },
  rift_stalker: {
    model: 'Rogue_Crimson',
    rightWeapon: 'Skeleton_Blade',
    leftWeapon: 'Skeleton_Blade',
    eyeHex: 0xff0054,
    scale: 1.08,
  },
  colossus_elite: {
    model: 'Knight',
    rightWeapon: '1H_Sword',
    leftWeapon: 'Barbarian_Round_Shield',
    eyeHex: 0xff0054,
    scale: 1.42,
  },
};

interface SoftVfxParticle3D {
  sprite: T.Sprite | T.Mesh;
  age: number;
  life: number;
  from: T.Vector3;
  to: T.Vector3;
  baseScale: number;
  endScale: number;
  spin: number;
  isFlat: boolean;
}

interface Hero3DInstance {
  classId: ArcanaClassId;
  hasModern: boolean;
  actor?: Actor;
  root: T.Group;
  auraDisc: T.Mesh;
  subAuraDisc: T.Mesh;
  shadowDisc: T.Mesh;
  handSprites: { sprite: T.Sprite; side: 'l' | 'r'; layer: number }[];
  lastAnimState: string;
}

interface Enemy3DInstance {
  archetypeId: EnemyArchetypeId;
  isElite: boolean;
  actor?: Actor;
  root: T.Group;
  shadowDisc: T.Mesh;
  eliteRing?: T.Mesh;
  shieldArc?: T.Mesh;
}

interface Boss3DInstance {
  bossId: string;
  actor?: Actor;
  root: T.Group;
  auraRing: T.Mesh;
  innerSigil: T.Mesh;
  light: T.PointLight;
}

let sharedArcanaAssetsPromise: Promise<NightAssets> | null = null;

async function loadFullArcanaAssets(): Promise<NightAssets> {
  if (sharedArcanaAssetsPromise) return sharedArcanaAssetsPromise;
  sharedArcanaAssetsPromise = (async () => {
    try {
      console.log('[Arcana3D] Loading loadNightAssets(td)...');
      const baseAssets = await loadNightAssets('td');
      console.log('[Arcana3D] loadNightAssets(td) done! Loading extra packs...');
      await Promise.all([
        loadExtraPack('nature', 'td'),
        loadExtraPack('medieval', 'td'),
        loadExtraPack('weapons', 'td'),
        loadExtraPack('authored-weapons', 'td'),
      ]);
      console.log('[Arcana3D] Extra packs done!');
      brightenFoliage(
        new T.Group().add(
          ...Array.from(baseAssets.props.values()).map((o) => o.clone())
        )
      );

      // Also load the 4 high-detail authored hero rigs + shared modern clips
      try {
        const base = import.meta.env.BASE_URL + 'models/characters/modern/';
        const loader = gameGLTFLoader();
        const heroNames = ['AstralMage', 'LunarKnight', 'ScarletSorceress', 'ReaverKnight'];
        const [heroGltfs, clipGltfs] = await Promise.all([
          Promise.all(heroNames.map((n) => loader.loadAsync(base + n + '.glb'))),
          Promise.all(['gaits', 'animations'].map((n) => loader.loadAsync(base + n + '.glb'))),
        ]);

        const models = new Map<string, T.Object3D>();
        const variants = new Map<string, Map<string, T.AnimationClip>>();
        const sharedClips = new Map<string, T.AnimationClip>(
          clipGltfs.flatMap((g) => g.animations.map((c) => [c.name, c] as const))
        );

        heroNames.forEach((name, idx) => {
          const gltf = heroGltfs[idx];
          const model = gltf.scene;
          model.updateMatrixWorld(true);
          const box = new T.Box3().setFromObject(model);
          const height = box.getSize(new T.Vector3()).y;
          if (Number.isFinite(height) && height > 0) {
            const scale = 1.95 / height;
            const wrapper = new T.Group();
            wrapper.add(model);
            model.scale.multiplyScalar(scale);
            model.position.set(
              -(box.min.x + box.max.x) * 0.5 * scale,
              -box.min.y * scale,
              -(box.min.z + box.max.z) * 0.5 * scale
            );
            wrapper.traverse((o) => {
              if (o instanceof T.Mesh) {
                o.castShadow = true;
                o.receiveShadow = true;
                o.frustumCulled = false;
              }
            });
            models.set(name, wrapper);
            const clipMap = new Map<string, T.AnimationClip>(sharedClips);
            for (const c of gltf.animations) clipMap.set(c.name, c);
            variants.set(name, clipMap);
          }
        });

        baseAssets.modern = {
          models,
          heads: new Map(),
          clips: sharedClips,
          variants,
        };
        console.log('[Arcana3D] Modern heroes loaded successfully!');
      } catch (err) {
        console.warn('[Arcana3D] Modern heroes load error (fallback active):', err);
      }

      if (typeof window !== 'undefined') {
        window.__ARCANA_3D_READY__ = true;
      }
      console.log('[Arcana3D] FULL ASSETS READY!');
      return baseAssets;
    } catch (outerErr) {
      console.error('[Arcana3D] Fatal error loading assets:', outerErr);
      throw outerErr;
    }
  })();
  return sharedArcanaAssetsPromise;
}

export class ArcanaRenderer {
  private canvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private webgl: T.WebGLRenderer | null = null;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(40, 16 / 9, 0.5, 220);
  private raycaster = new T.Raycaster();
  private groundPlaneMath = new T.Plane(new T.Vector3(0, 1, 0), 0);

  private quality: QualityProfile;
  private width = 1280;
  private height = 720;
  private dpr = 1;
  private elapsedTime = 0;

  // Camera tracking in 3D world space
  private camTargetX = 0;
  private camTargetZ = 0;
  private camZoom = 1;

  // Lighting (matches HuntScene's balanced moonlit + warm torch key lighting)
  private hemiLight!: T.HemisphereLight;
  private dirLight!: T.DirectionalLight;
  private rimLight!: T.DirectionalLight;
  private playerLight!: T.PointLight;

  // Shared Geometries & Textures
  private unitPlane = new T.PlaneGeometry(1, 1);
  private unitRing = new T.RingGeometry(0.78, 1.0, 48);
  private unitDisc = new T.CircleGeometry(1, 36);
  private boltCylinder = new T.CylinderGeometry(1, 1, 1, 16, 1, true);
  private sharedTextures: T.Texture[] = [];

  // 3D Asset Library (KayKit + Quaternius + Modern GLBs)
  private assets: NightAssets | null = null;
  private assetsLoading = false;
  private sanctuaryDispose?: () => void;
  private fallbackGroundDispose?: () => void;
  private mapSnapshotCanvas?: HTMLCanvasElement;

  // Scene Roots
  private worldRoot = new T.Group();
  private propsRoot = new T.Group();
  private dynamicRoot = new T.Group();
  private vfxRoot = new T.Group();
  private elementalVfxRoot = new T.Group();
  private eyeGlowSprites: T.Sprite[] = [];
  private elementalVfxSprites: { sprite: T.Sprite; offsetIdx: number }[] = [];
  private auroraRibbons: T.Mesh[] = [];

  // Cached Campaign Environment State
  private builtCampaignId: CampaignId | null = null;
  private builtAssetsReady = false;
  private poiMeshes = new Map<string, { group: T.Group; runeRing: T.Mesh; beacon: T.Sprite }>();
  private constructMeshes = new Map<string, T.Group>();
  private lootMeshes = new Map<string, T.Group>();
  private projectileMeshes = new Map<string, T.Group>();
  private telegraphMeshes = new Map<string, { group: T.Group; fill: T.Mesh; border: T.Mesh }>();

  // Actors
  private playerHero: Hero3DInstance | null = null;
  private allyHero: Hero3DInstance | null = null;
  private allyHeroes = new Map<string, Hero3DInstance>();
  private enemyInstances = new Map<string, Enemy3DInstance>();
  private bossInstance: Boss3DInstance | null = null;

  // Soft Textured 3D Particles
  private softParticles: SoftVfxParticle3D[] = [];
  private lastPlayerAnimState = 'idle';
  private attackComboCounter = 0;
  private trailTimer = 0;

  // Ambient Weather Particles
  private weatherMesh: T.Points | null = null;
  private weatherPositions: Float32Array | null = null;
  private weatherVelocities: Float32Array | null = null;
  private weatherCount = 140;
  private weatherCampaignId: CampaignId | null = null;

  constructor(canvas: HTMLCanvasElement, quality: QualityProfile = 'equilibrado') {
    this.canvas = canvas;
    this.quality = quality;

    // Create crisp 2D Overlay Canvas for Ravenswatch-style overhead HP bars & Damage Numbers
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.className = 'arcana-overlay-2d';
    Object.assign(this.overlayCanvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1',
    });
    if (this.canvas.parentElement) {
      this.canvas.parentElement.insertBefore(this.overlayCanvas, this.canvas.nextSibling);
    }
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    // Initialize Three.js WebGLRenderer with PCFSoftShadowMap
    try {
      this.webgl = new T.WebGLRenderer({
        canvas: this.canvas,
        antialias: quality !== 'economico',
        powerPreference: 'high-performance',
      });
      this.webgl.outputColorSpace = T.SRGBColorSpace;
      this.webgl.toneMapping = T.ACESFilmicToneMapping;
      this.webgl.toneMappingExposure = 1.18;
      this.webgl.shadowMap.enabled = quality !== 'economico';
      this.webgl.shadowMap.type = T.PCFSoftShadowMap;
    } catch {
      this.webgl = null;
    }

    // Scene Hierarchy
    this.scene.add(this.worldRoot);
    this.scene.add(this.propsRoot);
    this.scene.add(this.dynamicRoot);
    this.scene.add(this.vfxRoot);

    // Ravenswatch Dramatic Dark-Fantasy Lighting Setup (Crisp Albedo + Soft Shadows + Warm Torch Rim)
    this.hemiLight = new T.HemisphereLight(0xb8d4ff, 0x2a2438, 1.85);
    this.dirLight = new T.DirectionalLight(0xffe8c8, 2.85);
    this.dirLight.position.set(-14, 24, 14);
    this.dirLight.castShadow = quality !== 'economico';
    this.dirLight.shadow.mapSize.set(1024, 1024);
    Object.assign(this.dirLight.shadow.camera, {
      left: -22,
      right: 22,
      top: 22,
      bottom: -22,
      near: 1,
      far: 75,
    });
    this.dirLight.shadow.camera.updateProjectionMatrix();
    this.dirLight.shadow.bias = -0.0002;
    this.dirLight.shadow.normalBias = 0.035;

    this.rimLight = new T.DirectionalLight(0xffa56b, 1.65);
    this.rimLight.position.set(12, 12, -16);
    this.playerLight = new T.PointLight(0xffd28a, 2.8, 15, 1.4);
    this.playerLight.position.set(0, 3.2, 0);

    this.scene.add(
      this.hemiLight,
      this.dirLight,
      this.dirLight.target,
      this.rimLight,
      this.playerLight,
      this.elementalVfxRoot
    );

    this.ensureAssetsLoaded();
    this.resize();
  }

  public waitUntilReady(): Promise<NightAssets> {
    return loadFullArcanaAssets();
  }

  private ensureAssetsLoaded(): void {
    if (this.assets || this.assetsLoading) return;
    this.assetsLoading = true;
    loadFullArcanaAssets()
      .then((loaded) => {
        this.assets = loaded;
        this.builtCampaignId = null;
        // Rebuild actors & world with 100% real .glb meshes
        if (this.playerHero) {
          this.playerHero.actor?.dispose();
          this.playerHero.root.removeFromParent();
          this.playerHero = null;
        }
        if (this.allyHero) {
          this.allyHero.actor?.dispose();
          this.allyHero.root.removeFromParent();
          this.allyHero = null;
        }
        for (const [, a] of this.allyHeroes) {
          a.actor?.dispose();
          a.root.removeFromParent();
        }
        this.allyHeroes.clear();
        for (const [, en] of this.enemyInstances) {
          en.actor?.dispose();
          en.root.removeFromParent();
        }
        this.enemyInstances.clear();
        if (this.bossInstance) {
          this.bossInstance.actor?.dispose();
          this.bossInstance.root.removeFromParent();
          this.bossInstance = null;
        }
      })
      .catch(() => {
        this.assetsLoading = false;
      });
  }

  public setQuality(quality: QualityProfile): void {
    this.quality = quality;
    this.resize();
  }

  public resize(w?: number, h?: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(320, w || rect.width || window.innerWidth || 1280);
    this.height = Math.max(240, h || rect.height || window.innerHeight || 720);

    const maxDpr =
      this.quality === 'economico' ? 1 : this.quality === 'equilibrado' ? 1.5 : 2.0;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    if (this.webgl) {
      this.webgl.setPixelRatio(this.dpr);
      this.webgl.setSize(this.width, this.height, false);
    }

    this.overlayCanvas.width = Math.floor(this.width * this.dpr);
    this.overlayCanvas.height = Math.floor(this.height * this.dpr);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  public screenToWorld(
    clientX: number,
    clientY: number,
    state?: ArcanaRunState
  ): { x: number; y: number } {
    const mapW = state?.map.width ?? 2200;
    const mapH = state?.map.height ?? 1800;
    const ndc = new T.Vector2(
      (clientX / Math.max(1, this.width)) * 2 - 1,
      -(clientY / Math.max(1, this.height)) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new T.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlaneMath, hit)) {
      return {
        x: hit.x / WORLD_SCALE + mapW * 0.5,
        y: hit.z / WORLD_SCALE + mapH * 0.5,
      };
    }
    return {
      x: state?.player.x ?? mapW * 0.5,
      y: state?.player.y ?? mapH * 0.5,
    };
  }

  public dispose(): void {
    this.sanctuaryDispose?.();
    this.fallbackGroundDispose?.();
    this.overlayCanvas.remove();
    if (this.webgl) {
      this.webgl.dispose();
    }
    this.unitPlane.dispose();
    this.unitRing.dispose();
    this.unitDisc.dispose();
    this.boltCylinder.dispose();
    for (const tex of this.sharedTextures) tex.dispose();
  }

  private to3D(wx: number, wy: number, mapW: number, mapH: number): { x: number; z: number } {
    return {
      x: (wx - mapW * 0.5) * WORLD_SCALE,
      z: (wy - mapH * 0.5) * WORLD_SCALE,
    };
  }

  private getCampaignDef(state: ArcanaRunState): CampaignDef {
    return (
      ARCANA_CAMPAIGNS.find((c) => c.id === state.campaignId) ?? ARCANA_CAMPAIGNS[0]
    );
  }

  private elementToColorHex(element: string): number {
    switch (element) {
      case 'frost':
      case 'spectral':
        return 0x00bbf9;
      case 'temporal':
        return 0x80ffdb;
      case 'fire':
      case 'chaos':
        return 0xff5400;
      case 'lightning':
        return 0x4cc9f0;
      case 'runic':
        return 0x52b788;
      default:
        return 0xff0054;
    }
  }

  // --------------------------------------------------------------------------
  // Soft Antialiased 3D Particle Emitter (Uses vfxTexture / fxTexture — NO squares!)
  // --------------------------------------------------------------------------

  private spawnSoftParticle(
    texName:
      | 'glow'
      | 'spark'
      | 'flare'
      | 'fire'
      | 'smoke'
      | 'slash'
      | 'trace'
      | 'ring'
      | 'star'
      | 'magic'
      | 'rune'
      | 'scorch'
      | 'twirl',
    x: number,
    y: number,
    z: number,
    colorHex: number,
    startScale: number,
    endScale: number,
    life: number,
    to?: T.Vector3,
    isFlat = false
  ): void {
    const maxCap = this.quality === 'economico' ? 85 : this.quality === 'equilibrado' ? 160 : 240;
    if (this.softParticles.length >= maxCap) {
      const oldest = this.softParticles.shift()!;
      oldest.sprite.removeFromParent();
      (oldest.sprite.material as T.Material).dispose();
    }

    const map = ['magic', 'rune', 'scorch', 'twirl'].includes(texName)
      ? fxTexture(texName)
      : vfxTexture(texName);

    let mesh: T.Sprite | T.Mesh;
    if (isFlat) {
      const mat = new T.MeshBasicMaterial({
        map,
        color: colorHex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: T.DoubleSide,
        blending: texName === 'scorch' ? T.NormalBlending : T.AdditiveBlending,
        toneMapped: false,
      });
      mesh = new T.Mesh(this.unitPlane, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = Math.random() * Math.PI * 2;
    } else {
      const mat = new T.SpriteMaterial({
        map,
        color: colorHex,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: texName === 'smoke' ? T.NormalBlending : T.AdditiveBlending,
        rotation: Math.random() * Math.PI * 2,
        toneMapped: false,
      });
      mesh = new T.Sprite(mat);
    }

    mesh.position.set(x, y, z);
    mesh.scale.setScalar(startScale);
    this.vfxRoot.add(mesh);

    this.softParticles.push({
      sprite: mesh,
      age: 0,
      life,
      from: new T.Vector3(x, y, z),
      to: to ?? new T.Vector3(x, y + 0.4, z),
      baseScale: startScale,
      endScale,
      spin: (Math.random() - 0.5) * 4.5,
      isFlat,
    });
  }

  // --------------------------------------------------------------------------
  // Real Textured 3D Ravenswatch World Builder (forestGround + dressNightWorld + Village/Pumpkin/Cobblestone Lanes)
  // --------------------------------------------------------------------------

  private ensureBiomeBuilt(state: ArcanaRunState, campaign: CampaignDef): void {
    const assetsReady = !!this.assets;
    if (
      this.builtCampaignId === state.campaignId &&
      this.builtAssetsReady === assetsReady
    ) {
      return;
    }
    this.builtCampaignId = state.campaignId;
    this.builtAssetsReady = assetsReady;
    this.mapSnapshotCanvas = undefined;

    this.sanctuaryDispose?.();
    this.sanctuaryDispose = undefined;
    this.fallbackGroundDispose?.();
    this.fallbackGroundDispose = undefined;
    this.worldRoot.clear();
    this.propsRoot.clear();
    this.poiMeshes.clear();

    const map = state.map;
    const bgCol = new T.Color(campaign.palette.bgDeep);
    this.scene.background = bgCol;
    this.scene.fog = new T.FogExp2(bgCol.getHex(), 0.012);

    // Update dynamic atmospheric lighting per campaign
    this.hemiLight.color.set(campaign.palette.ambientLight);
    this.hemiLight.groundColor.set(campaign.palette.bgDeep);
    this.dirLight.color.set(campaign.palette.floorSecondary);
    this.rimLight.color.set(campaign.palette.accentRunes);

    const sp3 = this.to3D(map.spawnX, map.spawnY, map.width, map.height);
    const ar3 = this.to3D(map.bossArenaCenter.x, map.bossArenaCenter.y, map.width, map.height);

    // Build the authentic Elemental Sanctuary (Terracotta cliffs, glowing crystals, sacred dais & aurora ribbons)
    this.dressArcanaSanctuary(state, campaign, sp3, ar3);

    // 3. Boss Arena Glowing Rune Decal Ring on the floor
    const bossRingSize = map.bossArenaCenter.radius * WORLD_SCALE * 2;
    const bossSigil = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: fxTexture('magic'),
        color: new T.Color(campaign.palette.accentRunes),
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    bossSigil.rotation.x = -Math.PI / 2;
    bossSigil.position.set(ar3.x, 0.04, ar3.z);
    bossSigil.scale.setScalar(bossRingSize);
    this.worldRoot.add(bossSigil);

    // 4. Populate 3D Obstacle Props (Trees, Gothic Arches, Weathered Stone Pillars, Cottages)
    if (this.assets) {
      const shadows = contactShadows(this.propsRoot);
      for (let i = 0; i < map.obstacles.length; i++) {
        const obs = map.obstacles[i];
        const pos = this.to3D(obs.x, obs.y, map.width, map.height);
        const radius3D = Math.max(0.65, Math.max(obs.w, obs.h) * 0.5 * WORLD_SCALE);
        const propGroup = this.build3DObstacleProp(obs.kind, radius3D, i, state.campaignId);
        propGroup.position.set(pos.x, 0, pos.z);
        this.propsRoot.add(propGroup);
        shadows.add(pos.x, pos.z, radius3D * 2.5, radius3D * 2.1);
      }

      // 5. Scatter Ravenswatch Atmospheric Props (Fences, Jack-o-Lanterns, Ferns, Lanterns)
      for (let i = 0; i < map.decorations.length; i++) {
        const dec = map.decorations[i];
        const pos = this.to3D(dec.x, dec.y, map.width, map.height);
        const decGroup = this.build3DDecorationProp(dec.kind, i, campaign);
        decGroup.position.set(pos.x, 0, pos.z);
        this.propsRoot.add(decGroup);
      }
      shadows.bake();
    }

    // 6. Build 3D Interactive Shrine POIs
    for (const poi of map.pois) {
      const pos = this.to3D(poi.x, poi.y, map.width, map.height);
      const group = new T.Group();
      group.position.set(pos.x, 0, pos.z);

      const poiColor =
        poi.type === 'healing_sanctuary'
          ? 0x00f5d4
          : poi.type === 'unstable_ritual' || poi.type === 'early_boss_beacon'
          ? 0xff0054
          : 0xffd166;

      if (this.assets) {
        const shrineMesh = prop(
          this.assets,
          poi.type === 'forbidden_library'
            ? 'coffin_decorated'
            : poi.type === 'healing_sanctuary'
            ? 'building_well_red'
            : 'shrine_candles'
        );
        shrineMesh.scale.setScalar(poi.type === 'healing_sanctuary' ? 3.2 : 1.45);
        shrineMesh.traverse((c) => {
          if (c instanceof T.Mesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        group.add(shrineMesh);
      }

      const runeRing = new T.Mesh(
        this.unitPlane,
        new T.MeshBasicMaterial({
          map: fxTexture('rune'),
          color: poiColor,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
          blending: T.AdditiveBlending,
        })
      );
      runeRing.rotation.x = -Math.PI / 2;
      runeRing.position.y = 0.05;
      runeRing.scale.setScalar(3.4);
      group.add(runeRing);

      const beacon = new T.Sprite(
        new T.SpriteMaterial({
          map: vfxTexture('glow'),
          color: poiColor,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: T.AdditiveBlending,
        })
      );
      beacon.position.y = 2.4;
      beacon.scale.setScalar(2.4);
      group.add(beacon);

      this.propsRoot.add(group);
      this.poiMeshes.set(poi.id, { group, runeRing, beacon });
    }
  }

  /**
   * Builds the authentic Elemental Sanctuary:
   * - Stepped Obsidian & Sunstone Sacred Dais at player spawn
   * - Concentric Glowing Elemental Circles (Water, Fire, Air, Earth)
   * - Terracotta rock canyon formations (Reference Image 1)
   * - Iridescent prismatic crystal clusters in cyan, magenta, and gold (Reference Image 1)
   * - Shimmering Aurora Borealis sky ribbons (Reference Images 1 & 4)
   * - Zero cartoon clutter, zero viking heads, zero pumpkins!
   */
  private dressArcanaSanctuary(
    _state: ArcanaRunState,
    _campaign: CampaignDef,
    sp3: { x: number; z: number },
    ar3: { x: number; z: number }
  ): void {
    const geometries: T.BufferGeometry[] = [];
    const materials: T.Material[] = [];

    // 1. Bedrock Ground Plane (Rich Terracotta & Twilight Stone)
    const groundGeo = new T.PlaneGeometry(240, 240, 48, 48);
    groundGeo.rotateX(-Math.PI / 2);
    geometries.push(groundGeo);

    const positions = groundGeo.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    // 5 Elemental Biome Dynamic Ground Palettes
    let cFloor1 = 0xb55232;
    let cFloor2 = 0x8a3820;
    let cFloor3 = 0x191024;

    if (_campaign.id === 'cloister') {
      // Biome II: Mirror Lake (Liquid Azure & Ice)
      cFloor1 = 0x0f4c5c;
      cFloor2 = 0x0a2e36;
      cFloor3 = 0x031926;
    } else if (_campaign.id === 'ash') {
      // Biome III: Black Sun Forge (Volcanic Basalt & Magma)
      cFloor1 = 0x541818;
      cFloor2 = 0x2e0c0c;
      cFloor3 = 0x140505;
    } else if (_campaign.id === 'hourglasses') {
      // Biome IV: Thousand Bells (Jade Pavers & Sky Slate)
      cFloor1 = 0x2d6a4f;
      cFloor2 = 0x1b4332;
      cFloor3 = 0x081c15;
    } else if (_campaign.id === 'rift' || _campaign.id === 'infinite') {
      // Biome V: Primordial Nexus (Convergence)
      cFloor1 = 0x3c096c;
      cFloor2 = 0x240046;
      cFloor3 = 0x10002b;
    }

    const tc1 = new T.Color(cFloor1);
    const tc2 = new T.Color(cFloor2);
    const tc3 = new T.Color(cFloor3);
    const tmp = new T.Color();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const distFromSpawn = Math.hypot(x - sp3.x, z - sp3.z);
      const distFromArena = Math.hypot(x - ar3.x, z - ar3.z);
      const noise = 0.5 + 0.5 * Math.sin(x * 0.12) * Math.cos(z * 0.12);

      if (distFromSpawn < 16) {
        tmp.copy(tc1).lerp(tc2, noise * 0.45);
      } else if (distFromArena < 24) {
        tmp.copy(tc2).lerp(tc3, 0.45);
      } else {
        const t = Math.min(1, Math.max(0, (Math.hypot(x, z) - 30) / 60));
        tmp.copy(tc1).lerp(tc3, t * 0.85);
      }
      tmp.toArray(colors, i * 3);
    }
    groundGeo.setAttribute('color', new T.BufferAttribute(colors, 3));

    const groundMat = new T.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.08,
      vertexColors: true,
    });
    materials.push(groundMat);

    const groundMesh = new T.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    this.worldRoot.add(groundMesh);

    // 2. The Sacred Elemental Dais at Player Spawn
    const daisRoot = new T.Group();
    daisRoot.position.set(sp3.x, 0, sp3.z);
    this.worldRoot.add(daisRoot);

    const daisMat = new T.MeshStandardMaterial({
      color: 0x181224,
      roughness: 0.85,
      metalness: 0.15,
    });
    const daisTrimMat = new T.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.45,
      metalness: 0.65,
    });
    materials.push(daisMat, daisTrimMat);

    const daisLowerGeo = new T.CylinderGeometry(9.2, 9.6, 0.2, 48);
    geometries.push(daisLowerGeo);
    const daisLower = new T.Mesh(daisLowerGeo, daisMat);
    daisLower.position.y = 0.1;
    daisLower.receiveShadow = true;
    daisRoot.add(daisLower);

    const daisTrimGeo = new T.TorusGeometry(9.3, 0.12, 12, 48);
    daisTrimGeo.rotateX(Math.PI / 2);
    geometries.push(daisTrimGeo);
    const daisTrim = new T.Mesh(daisTrimGeo, daisTrimMat);
    daisTrim.position.y = 0.2;
    daisRoot.add(daisTrim);

    const daisUpperGeo = new T.CylinderGeometry(6.6, 6.8, 0.14, 48);
    geometries.push(daisUpperGeo);
    const daisUpper = new T.Mesh(daisUpperGeo, daisMat);
    daisUpper.position.y = 0.24;
    daisUpper.receiveShadow = true;
    daisRoot.add(daisUpper);

    // Concentric Glowing Elemental Runic Decals
    const runeRingOuter = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: fxTexture('rune'),
        color: 0x00f5d4,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    runeRingOuter.rotation.x = -Math.PI / 2;
    runeRingOuter.position.y = 0.32;
    runeRingOuter.scale.setScalar(8.2);
    daisRoot.add(runeRingOuter);

    const runeRingInner = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: fxTexture('magic'),
        color: 0xffd166,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    runeRingInner.rotation.x = -Math.PI / 2;
    runeRingInner.position.y = 0.33;
    runeRingInner.scale.setScalar(5.2);
    daisRoot.add(runeRingInner);

    // 4 Elemental Monolith Pillars around Dais
    const pillarGeo = new T.CylinderGeometry(0.35, 0.55, 3.8, 6);
    geometries.push(pillarGeo);
    const pillarMat = new T.MeshStandardMaterial({
      color: 0x241830,
      roughness: 0.9,
      metalness: 0.1,
    });
    materials.push(pillarMat);

    const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    const elementColors = [0x00f5d4, 0xff5400, 0x80ffdb, 0xffd166];
    angles.forEach((ang, idx) => {
      const px = Math.sin(ang) * 7.8;
      const pz = Math.cos(ang) * 7.8;
      const pillar = new T.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 1.9, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      daisRoot.add(pillar);

      const beacon = new T.Sprite(
        new T.SpriteMaterial({
          map: vfxTexture('glow'),
          color: elementColors[idx],
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: T.AdditiveBlending,
        })
      );
      beacon.position.set(px, 4.2, pz);
      beacon.scale.setScalar(1.8);
      daisRoot.add(beacon);
    });

    // 3. Terracotta Cliffs & Rock Formations (Reference Image 1)
    const cliffGeo = new T.CylinderGeometry(2.4, 3.6, 4.5, 7);
    geometries.push(cliffGeo);
    const cliffMat = new T.MeshStandardMaterial({
      color: 0xaa4828,
      roughness: 0.92,
      metalness: 0.05,
    });
    materials.push(cliffMat);

    const cliffPositions = [
      { x: sp3.x - 14, z: sp3.z - 8, s: 1.4 },
      { x: sp3.x + 15, z: sp3.z - 6, s: 1.6 },
      { x: sp3.x - 12, z: sp3.z + 14, s: 1.3 },
      { x: sp3.x + 14, z: sp3.z + 12, s: 1.5 },
      { x: sp3.x - 18, z: sp3.z + 2, s: 1.7 },
      { x: sp3.x + 19, z: sp3.z + 3, s: 1.8 },
    ];
    cliffPositions.forEach((pos, idx) => {
      const cliff = new T.Mesh(cliffGeo, cliffMat);
      cliff.position.set(pos.x, 2.25 * pos.s, pos.z);
      cliff.scale.setScalar(pos.s);
      cliff.rotation.y = idx * 1.1;
      cliff.castShadow = true;
      cliff.receiveShadow = true;
      this.worldRoot.add(cliff);
    });

    // 4. Iridescent Prismatic Crystal Clusters (Reference Image 1 Foreground)
    const crystalGeo = new T.ConeGeometry(0.35, 2.4, 6);
    geometries.push(crystalGeo);
    const cyanCrystalMat = new T.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00bbf9,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.2,
    });
    const magCrystalMat = new T.MeshStandardMaterial({
      color: 0xf72585,
      emissive: 0x7209b7,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.2,
    });
    const goldCrystalMat = new T.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf77f00,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.2,
    });
    materials.push(cyanCrystalMat, magCrystalMat, goldCrystalMat);

    const crystalClusters = [
      { x: sp3.x - 8.5, z: sp3.z - 4.5, mat: cyanCrystalMat, lightCol: 0x00f5d4 },
      { x: sp3.x + 9.2, z: sp3.z - 3.8, mat: magCrystalMat, lightCol: 0xf72585 },
      { x: sp3.x - 7.8, z: sp3.z + 7.5, mat: goldCrystalMat, lightCol: 0xffd166 },
      { x: sp3.x + 8.4, z: sp3.z + 6.8, mat: cyanCrystalMat, lightCol: 0x00f5d4 },
    ];

    crystalClusters.forEach((cl, cIdx) => {
      const clusterGroup = new T.Group();
      clusterGroup.position.set(cl.x, 0, cl.z);
      for (let s = 0; s < 4; s++) {
        const spike = new T.Mesh(crystalGeo, cl.mat);
        const rotX = Math.sin(s * 1.5 + cIdx) * 0.25;
        const rotZ = Math.cos(s * 1.5 + cIdx) * 0.25;
        spike.rotation.set(rotX, s * 1.5, rotZ);
        spike.scale.set(0.6 + s * 0.15, 0.7 + s * 0.2, 0.6 + s * 0.15);
        spike.position.set((s - 1.5) * 0.25, 0.9 * spike.scale.y, (s % 2) * 0.25);
        spike.castShadow = true;
        clusterGroup.add(spike);
      }
      const cLight = new T.PointLight(cl.lightCol, 1.4, 7);
      cLight.position.set(0, 1.2, 0);
      clusterGroup.add(cLight);
      this.worldRoot.add(clusterGroup);
    });

    // 5. Aurora Borealis Sky Ribbon Arches (Reference Images 1 & 4)
    const auroraGeo = new T.PlaneGeometry(140, 22, 32, 8);
    geometries.push(auroraGeo);
    const auroraColors = [0x00f5d4, 0x00bbf9, 0x7209b7];
    this.auroraRibbons = [];

    auroraColors.forEach((col, aIdx) => {
      const aMat = new T.MeshBasicMaterial({
        map: fxTexture('magic'),
        color: col,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
      });
      materials.push(aMat);
      const ribbon = new T.Mesh(auroraGeo, aMat);
      ribbon.position.set(sp3.x, 32 + aIdx * 3.5, sp3.z - 20 - aIdx * 15);
      ribbon.rotation.x = Math.PI / 4 + aIdx * 0.1;
      ribbon.rotation.z = (aIdx - 1) * 0.12;
      this.worldRoot.add(ribbon);
      this.auroraRibbons.push(ribbon);
    });

    this.sanctuaryDispose = () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      this.auroraRibbons = [];
    };
  }

  private syncAvatarStateVFX(
    p3d: T.Vector3,
    classId: ArcanaClassId,
    dt: number,
    _menuHeroShowcase: boolean
  ): void {
    if (!this.eyeGlowSprites.length) {
      for (let i = 0; i < 2; i++) {
        const sp = new T.Sprite(
          new T.SpriteMaterial({
            map: fxTexture('flare'),
            color: 0xffffff,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            blending: T.AdditiveBlending,
            toneMapped: false,
          })
        );
        sp.scale.setScalar(0.08);
        this.elementalVfxRoot.add(sp);
        this.eyeGlowSprites.push(sp);
      }
    }

    const heroY = this.playerHero?.actor?.root.position.y || 0;
    const eyeY = 1.62 + heroY;
    const eyeDist = 0.065;
    const pulse = 0.075 + Math.sin(this.elapsedTime * 6) * 0.015;
    this.eyeGlowSprites[0].position.set(p3d.x - eyeDist, eyeY, p3d.z + 0.22);
    this.eyeGlowSprites[0].scale.setScalar(pulse);
    this.eyeGlowSprites[1].position.set(p3d.x + eyeDist, eyeY, p3d.z + 0.22);
    this.eyeGlowSprites[1].scale.setScalar(pulse);

    this.syncHeroElementalVfx(p3d, classId, dt);
  }

  private syncHeroElementalVfx(
    p3d: T.Vector3,
    classId: ArcanaClassId,
    _dt: number
  ): void {
    if (!this.elementalVfxSprites.length) {
      for (let i = 0; i < 28; i++) {
        const sp = new T.Sprite(
          new T.SpriteMaterial({
            map: vfxTexture('glow'),
            color: 0x00f5d4,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: T.AdditiveBlending,
            toneMapped: false,
          })
        );
        this.elementalVfxRoot.add(sp);
        this.elementalVfxSprites.push({ sprite: sp, offsetIdx: i });
      }
    }

    const heroY = this.playerHero?.actor?.root.position.y || 0;
    const t = this.elapsedTime;

    if (classId === 'chess') {
      // Nerys — Water Twin: Swirling dynamic luminous aqua ribbons & floating water motes (Image 3)
      for (const item of this.elementalVfxSprites) {
        const i = item.offsetIdx;
        const ang = t * 2.8 + (i * Math.PI * 2) / 28;
        const r = 0.9 + Math.sin(t * 1.8 + i) * 0.22;
        const py = heroY + ((t * 1.2 + i * 0.08) % 2.4);
        item.sprite.position.set(
          p3d.x + Math.cos(ang) * r,
          py,
          p3d.z + Math.sin(ang) * r
        );
        const mat = item.sprite.material as T.SpriteMaterial;
        mat.color.setHex(i % 3 === 0 ? 0xffffff : i % 2 === 0 ? 0x00f5d4 : 0x00bbf9);
        mat.map = vfxTexture(i % 4 === 0 ? 'spark' : i % 2 === 0 ? 'twirl' : 'glow');
        item.sprite.scale.setScalar(0.28 + Math.sin(t * 3 + i) * 0.1);
      }
    } else if (classId === 'chaos') {
      // Iskra — Fire Twin: Roaring double-helix flame vortex & rising embers (Image 3)
      for (const item of this.elementalVfxSprites) {
        const i = item.offsetIdx;
        const dir = i % 2 === 0 ? 1 : -1;
        const ang = dir * t * 3.4 + (i * Math.PI * 2) / 14;
        const r = 0.82 + Math.sin(t * 2.2 + i) * 0.18;
        const py = heroY + ((t * 1.6 + i * 0.09) % 2.5);
        item.sprite.position.set(
          p3d.x + Math.cos(ang) * r,
          py,
          p3d.z + Math.sin(ang) * r
        );
        const mat = item.sprite.material as T.SpriteMaterial;
        mat.color.setHex(i % 3 === 0 ? 0xffd166 : i % 2 === 0 ? 0xff5400 : 0xd00000);
        mat.map = vfxTexture(i % 2 === 0 ? 'fire' : 'spark');
        item.sprite.scale.setScalar(0.35 + Math.sin(t * 4 + i) * 0.12);
      }
    } else if (classId === 'chrono') {
      // Kael — Wind Guardian: Translucent white & teal cyclone tornado under feet (Image 3)
      for (const item of this.elementalVfxSprites) {
        const i = item.offsetIdx;
        const ang = t * 4.2 + (i * Math.PI * 2) / 28;
        const r = 0.4 + (i / 28) * 1.1;
        const py = heroY + (i / 28) * 2.2;
        item.sprite.position.set(
          p3d.x + Math.cos(ang) * r,
          py,
          p3d.z + Math.sin(ang) * r
        );
        const mat = item.sprite.material as T.SpriteMaterial;
        mat.color.setHex(i % 2 === 0 ? 0x80ffdb : 0xffffff);
        mat.map = vfxTexture('twirl');
        item.sprite.scale.setScalar(0.32 + Math.sin(t * 3.5 + i) * 0.1);
      }
    } else {
      // Borak — Earth Guardian: Floating rock boulders & iridescent crystals orbiting (Image 1 & 3)
      for (const item of this.elementalVfxSprites) {
        const i = item.offsetIdx;
        const ang = t * 1.4 + (i * Math.PI * 2) / 28;
        const r = 1.35 + Math.sin(t * 1.1 + i) * 0.25;
        const py = heroY + 0.5 + Math.sin(t * 2.5 + i * 0.8) * 0.6;
        item.sprite.position.set(
          p3d.x + Math.cos(ang) * r,
          py,
          p3d.z + Math.sin(ang) * r
        );
        const mat = item.sprite.material as T.SpriteMaterial;
        mat.color.setHex(i % 3 === 0 ? 0xf72585 : i % 2 === 0 ? 0x00f5d4 : 0xffd166);
        mat.map = vfxTexture(i % 2 === 0 ? 'flare' : 'spark');
        item.sprite.scale.setScalar(0.38 + Math.sin(t * 2 + i) * 0.1);
      }
    }
  }

  private build3DObstacleProp(
    kind: string,
    radius3D: number,
    seed: number,
    campaignId: CampaignId
  ): T.Group {
    const g = new T.Group();
    if (!this.assets) return g;

    let propName = 'pillar_decorated';
    let scaleMult = 1.15;
    if (kind === 'pillar' || kind === 'hourglass_monolith') {
      propName = campaignId === 'cloister' ? 'column' : seed % 2 === 0 ? 'pillar_decorated' : 'column';
      scaleMult = 1.25;
    } else if (kind === 'statue') {
      propName = campaignId === 'ash' || campaignId === 'rift' ? 'crypt' : seed % 2 === 0 ? 'arch_gate' : 'crypt';
      scaleMult = propName === 'arch_gate' ? 0.95 : 0.48;
    } else if (kind === 'crystal_obelisk') {
      propName =
        campaignId === 'ash' || campaignId === 'rift'
          ? 'tree_dead_large'
          : campaignId === 'runes'
          ? 'meadow-Pine_1'
          : 'meadow-CommonTree_3';
      scaleMult = propName.startsWith('meadow-') ? 0.36 : 1.15;
    } else {
      propName = seed % 3 === 0 ? 'arch' : 'pillar_decorated';
      scaleMult = 1.1;
    }

    const mesh = prop(this.assets, propName);
    if (mesh.children.length > 0) {
      mesh.scale.setScalar(scaleMult * (0.85 + (seed % 3) * 0.12));
      mesh.rotation.y = (seed * 1.57) % (Math.PI * 2);
      mesh.traverse((c) => {
        if (c instanceof T.Mesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (
            !propName.startsWith('meadow-') &&
            !propName.startsWith('tree_') &&
            c.material instanceof T.MeshStandardMaterial
          ) {
            c.material = weatheredStone(c.material);
          }
        }
      });
      g.add(mesh);
    }

    const crystalGeo = new T.ConeGeometry(0.24, 1.35, 6);
    const crystalMat = new T.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00bbf9,
      emissiveIntensity: 0.65,
      roughness: 0.18,
    });
    const crystalMesh = new T.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.set(radius3D * 0.75, 0.68, radius3D * 0.45);
    crystalMesh.rotation.z = 0.22;
    g.add(crystalMesh);

    return g;
  }

  private build3DDecorationProp(
    _kind: string,
    seed: number,
    campaign: CampaignDef
  ): T.Group {
    const g = new T.Group();
    if (!this.assets) return g;

    let choices: string[];
    let lanternHex: number;
    choices = ['column', 'pillar_decorated', 'arch', 'arch_gate'];
    lanternHex = campaign.id === 'ash' ? 0xff5400 : campaign.id === 'cloister' ? 0xffd166 : 0x00f5d4;

    const pick = choices[seed % choices.length];
    const model = prop(this.assets, pick);
    if (model.children.length > 0) {
      const sc = pick.startsWith('meadow-')
        ? 0.55
        : pick === 'barrel' || pick === 'wheelbarrow'
        ? 4.0
        : pick === 'crypt'
        ? 0.45
        : 1.08;
      model.scale.setScalar(sc);
      model.rotation.y = seed * 1.1;
      model.traverse((c) => {
        if (c instanceof T.Mesh) {
          c.castShadow = !pick.startsWith('meadow-');
          c.receiveShadow = true;
        }
      });
      g.add(model);

      if (pick.includes('lantern') || pick.includes('candle')) {
        const glow = new T.Sprite(
          new T.SpriteMaterial({
            map: vfxTexture('glow'),
            color: lanternHex,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
            blending: T.AdditiveBlending,
          })
        );
        glow.position.y = 1.2;
        glow.scale.setScalar(2.2);
        g.add(glow);
      }
    }
    return g;
  }

  // --------------------------------------------------------------------------
  // 3D Hero Actor Builder & Updater (Real Rigged .GLB Models + Authored Weapons + Hand FX)
  // --------------------------------------------------------------------------

  private getOrCreateHero3D(
    current: Hero3DInstance | null,
    classId: ArcanaClassId
  ): Hero3DInstance {
    const hasModern = !!this.assets?.modern?.models.has(HERO_3D_CONFIG[classId].modernModel);
    if (
      current &&
      current.classId === classId &&
      !!current.actor === !!this.assets &&
      current.hasModern === hasModern
    ) {
      return current;
    }
    if (current) {
      current.actor?.dispose();
      current.root.removeFromParent();
    }

    const cfg = HERO_3D_CONFIG[classId];
    const root = new T.Group();
    this.dynamicRoot.add(root);

    const shadowDisc = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: vfxTexture('glow'),
        color: 0x030208,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.03;
    shadowDisc.scale.setScalar(2.3);
    root.add(shadowDisc);

    const auraDisc = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: fxTexture('rune'),
        color: cfg.auraHex,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    auraDisc.rotation.x = -Math.PI / 2;
    auraDisc.position.y = 0.05;
    auraDisc.scale.setScalar(2.4);
    root.add(auraDisc);

    const subAuraDisc = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: fxTexture('twirl'),
        color: cfg.handGlowHex,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    subAuraDisc.rotation.x = -Math.PI / 2;
    subAuraDisc.position.y = 0.07;
    subAuraDisc.scale.setScalar(3.2);
    root.add(subAuraDisc);

    let actor: Actor | undefined;

    if (this.assets) {
      const items: string[] = [cfg.weaponProp];
      if (cfg.offhandProp) items.push(cfg.offhandProp);
      // Do NOT pass a dark/saturated tint so the original hand-painted PBR textures remain 100% crisp!
      actor = new Actor(this.assets, cfg.fallbackChar, {
        items,
        modern: hasModern ? cfg.modernModel : undefined,
        scale: hasModern ? 1.55 : 1.32,
      });

      if (actor.modern && cfg.authoredWeapon && classId !== 'chrono' && classId !== 'rune') {
        actor.hold(cfg.authoredWeapon, 'handslot.r', (o) => {
          const isAuthored = /Priestess|Skull/.test(cfg.authoredWeapon!);
          o.scale.setScalar(isAuthored ? 1.0 : 0.65);
          o.rotation.set(isAuthored ? 0 : Math.PI / 2, 0, 0);
        });
      }

      actor.root.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      actor.play('Idle');
      root.add(actor.root);
    }

    const handSprites: { sprite: T.Sprite; side: 'l' | 'r'; layer: number }[] = [];
    for (const side of ['l', 'r'] as const) {
      for (let layer = 0; layer < 4; layer++) {
        const tex = layer === 0 ? 'glow' : layer === 1 ? 'fire' : layer === 2 ? 'spark' : 'flare';
        const sp = new T.Sprite(
          new T.SpriteMaterial({
            map: vfxTexture(tex),
            color: layer % 2 === 0 ? cfg.handGlowHex : cfg.handCoreHex,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: T.AdditiveBlending,
            toneMapped: false,
          })
        );
        root.add(sp);
        handSprites.push({ sprite: sp, side, layer });
      }
    }

    return {
      classId,
      hasModern,
      actor,
      root,
      auraDisc,
      subAuraDisc,
      shadowDisc,
      handSprites,
      lastAnimState: '',
    };
  }

  private updateHero3D(
    inst: Hero3DInstance,
    p: PlayerRuntimeState | CoopPartnerState,
    mapW: number,
    mapH: number,
    dt: number,
    isMainPlayer: boolean
  ): void {
    const pos = this.to3D(p.x, p.y, mapW, mapH);
    inst.root.position.x = ease(inst.root.position.x, pos.x, dt * 22);
    inst.root.position.z = ease(inst.root.position.z, pos.z, dt * 22);

    const targetYaw = Math.atan2(p.facingX, p.facingY);
    const vx = 'vx' in p ? p.vx : 0;
    const vy = 'vy' in p ? p.vy : 0;
    const speed = Math.hypot(vx, vy);
    const isMoving = speed > 14 || p.animState === 'walk';
    const dashTimer = 'dashTimer' in p ? p.dashTimer : 0;
    const hitFlashTimer = 'hitFlashTimer' in p ? p.hitFlashTimer : 0;

    if (p.animState === 'attack' && inst.lastAnimState !== 'attack') {
      this.attackComboCounter = (this.attackComboCounter + 1) % 3;
    }

    if (inst.actor) {
      inst.actor.root.rotation.y = turnAngle(inst.actor.root.rotation.y, targetYaw, dt * 18);

      const cfg = HERO_3D_CONFIG[p.classId];
      let desiredClip = 'Idle';
      let loop = true;
      let clipSpeed = 1.0;
      let restart = false;

      if (p.hp <= 0) {
        desiredClip = 'Death_A';
        loop = false;
      } else if (dashTimer > 0 || p.animState === 'dash') {
        desiredClip = 'Dodge_Forward';
        loop = false;
        clipSpeed = 1.65;
      } else if (p.animState === 'cast') {
        desiredClip = cfg.castClip;
        loop = false;
        clipSpeed = 1.45;
        restart = inst.lastAnimState !== 'cast';
      } else if (p.animState === 'attack') {
        desiredClip = cfg.slashClips[this.attackComboCounter % cfg.slashClips.length];
        loop = false;
        clipSpeed = 1.75;
        restart = inst.lastAnimState !== 'attack';
      } else if (hitFlashTimer > 0.08) {
        desiredClip = 'Hit_A';
        loop = false;
        clipSpeed = 1.4;
      } else if (isMoving) {
        desiredClip = 'Running_A';
        loop = true;
        clipSpeed = Math.max(0.85, Math.min(1.55, speed / 195 || 1.1));
      }

      inst.actor.play(desiredClip, { loop, fade: 0.1, speed: clipSpeed, restart });
      inst.actor.flash(
        hitFlashTimer > 0 ? 0xff2a54 : 0x000000,
        hitFlashTimer > 0 ? 0.35 : 0
      );
      inst.actor.update(dt);
    }

    inst.lastAnimState = p.animState;

    inst.auraDisc.rotation.z = this.elapsedTime * 0.95;
    inst.subAuraDisc.rotation.z = -this.elapsedTime * 1.5;
    const isAwakened =
      ('chessCoordinationStacks' in p && p.chessCoordinationStacks >= 6) ||
      ('chaosInstability' in p && p.chaosInstability >= 50) ||
      ('chronoSequenceStacks' in p && p.chronoSequenceStacks >= 3) ||
      ('runeActiveSymbols' in p && p.runeActiveSymbols.length >= 2) ||
      p.animState === 'cast';

    const subPulse = isAwakened ? 4.2 : 2.9;
    inst.subAuraDisc.scale.setScalar(subPulse + Math.sin(this.elapsedTime * 5.5) * 0.28);

    // Dynamic Awakening Particle Emitters around Heroes
    if (isAwakened && Math.random() < dt * 6.5) {
      const cfg = HERO_3D_CONFIG[p.classId];
      const partType =
        p.classId === 'chrono' ? 'spark' :
        p.classId === 'rune' ? 'glow' :
        p.classId === 'chaos' ? 'fire' : 'star';
      const offX = (Math.random() - 0.5) * 1.6;
      const offZ = (Math.random() - 0.5) * 1.6;
      this.spawnSoftParticle(
        partType,
        inst.root.position.x + offX,
        0.4 + Math.random() * 1.4,
        inst.root.position.z + offZ,
        cfg.handGlowHex,
        0.85,
        0.15,
        0.35,
        new T.Vector3(inst.root.position.x + offX * 1.5, 2.2, inst.root.position.z + offZ * 1.5)
      );
    }

    // Update Elemental Hand Emitters attached to the 3D Hand Bones
    inst.root.updateMatrixWorld(true);
    for (let i = 0; i < inst.handSprites.length; i++) {
      const hs = inst.handSprites[i];
      let localPos = new T.Vector3(
        hs.side === 'l' ? -0.45 : 0.45,
        1.25,
        0.35
      );
      if (inst.actor) {
        const bone = inst.actor.bone('handslot.' + hs.side);
        if (bone) {
          const worldBonePos = bone.getWorldPosition(new T.Vector3());
          localPos = inst.root.worldToLocal(worldBonePos);
        }
      }
      const orbitA = this.elapsedTime * (4 + hs.layer * 1.5) + i;
      const orbitR = hs.layer === 0 ? 0 : 0.08 + hs.layer * 0.04;
      hs.sprite.position.set(
        localPos.x + Math.cos(orbitA) * orbitR,
        localPos.y + Math.sin(orbitA * 1.3) * orbitR + 0.06,
        localPos.z + Math.sin(orbitA) * orbitR
      );
      const actionBoost =
        p.animState === 'attack' || p.animState === 'cast' ? 1.55 : 0.9;
      const sc =
        (hs.layer === 0 ? 0.62 : hs.layer === 1 ? 0.44 : 0.28) *
        actionBoost *
        (1 + Math.sin(this.elapsedTime * 9 + i) * 0.16);
      hs.sprite.scale.setScalar(sc);
      (hs.sprite.material as T.SpriteMaterial).rotation = orbitA * 0.5;
    }

    if (isMainPlayer && p.animState === 'attack' && this.lastPlayerAnimState !== 'attack') {
      const cfg = HERO_3D_CONFIG[p.classId];
      const fx = inst.root.position.x + Math.sin(targetYaw) * 1.15;
      const fz = inst.root.position.z + Math.cos(targetYaw) * 1.15;
      this.spawnSoftParticle(
        'slash',
        fx,
        1.15,
        fz,
        cfg.handGlowHex,
        2.3,
        3.2,
        0.24,
        new T.Vector3(fx, 1.15, fz),
        true
      );
      this.spawnSoftParticle(
        'flare',
        fx,
        1.2,
        fz,
        cfg.handCoreHex,
        1.1,
        1.8,
        0.22
      );
    }
    if (isMainPlayer) {
      this.lastPlayerAnimState = p.animState;
    }
  }

  // --------------------------------------------------------------------------
  // 3D Enemy & Boss Actors (Real Rigged .GLB Models + Weapons + Animations)
  // --------------------------------------------------------------------------

  private syncEnemies3D(state: ArcanaRunState, dt: number): void {
    if (!this.assets) return;
    const mapW = state.map.width;
    const mapH = state.map.height;
    const activeIds = new Set<string>();

    for (const enemy of state.enemies) {
      activeIds.add(enemy.id);
      let inst = this.enemyInstances.get(enemy.id);
      if (!inst) {
        inst = this.createEnemy3D(enemy);
        this.enemyInstances.set(enemy.id, inst);
      }

      const pos = this.to3D(enemy.x, enemy.y, mapW, mapH);
      inst.root.position.x = ease(inst.root.position.x, pos.x, dt * 18);
      inst.root.position.z = ease(inst.root.position.z, pos.z, dt * 18);

      const yaw = Math.atan2(enemy.facingX, enemy.facingY);
      const spd = Math.hypot(enemy.vx, enemy.vy);

      if (inst.actor) {
        inst.actor.root.rotation.y = turnAngle(inst.actor.root.rotation.y, yaw, dt * 14);
        const clip =
          enemy.aiState === 'attack'
            ? '1H_Melee_Attack_Chop'
            : enemy.aiState === 'windup'
            ? 'Taunt'
            : spd > 10
            ? 'Running_A'
            : 'Idle_Combat';
        inst.actor.play(clip, {
          loop: enemy.aiState !== 'attack',
          fade: 0.12,
          speed: enemy.aiState === 'attack' ? 1.5 : 1.05,
        });
        inst.actor.flash(
          enemy.hitFlashTimer > 0 ? 0xff2a54 : 0x000000,
          enemy.hitFlashTimer > 0 ? 0.45 : 0
        );
        inst.actor.update(dt);
      }

      if (inst.eliteRing) {
        inst.eliteRing.rotation.z = this.elapsedTime * 1.4;
      }
      if (inst.shieldArc && enemy.shieldAngle !== undefined) {
        inst.shieldArc.rotation.z = -enemy.shieldAngle;
      }
    }

    for (const [id, inst] of this.enemyInstances) {
      if (!activeIds.has(id)) {
        this.spawnImpactBurst(
          inst.root.position.x,
          0.8,
          inst.root.position.z,
          inst.isElite ? 'earth' : 'fire',
          inst.isElite ? 0xffbe0b : 0x9d4edd,
          inst.isElite ? 1.8 : 1.25
        );
        inst.actor?.dispose();
        inst.root.removeFromParent();
        this.enemyInstances.delete(id);
      }
    }
  }

  private createEnemy3D(enemy: ActiveEnemy): Enemy3DInstance {
    const cfg = ENEMY_3D_CONFIG[enemy.archetypeId] ?? ENEMY_3D_CONFIG.patroller;
    const scale = cfg.scale * (enemy.isElite ? 1.28 : 1.0);
    const root = new T.Group();
    this.dynamicRoot.add(root);

    const shadowDisc = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: vfxTexture('glow'),
        color: 0x040208,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.02;
    shadowDisc.scale.setScalar(1.9 * scale);
    root.add(shadowDisc);

    let eliteRing: T.Mesh | undefined;
    if (enemy.isElite) {
      eliteRing = new T.Mesh(
        this.unitPlane,
        new T.MeshBasicMaterial({
          map: fxTexture('rune'),
          color: 0xffbe0b,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: T.AdditiveBlending,
        })
      );
      eliteRing.rotation.x = -Math.PI / 2;
      eliteRing.position.y = 0.05;
      eliteRing.scale.setScalar(2.8);
      root.add(eliteRing);
    }

    let actor: Actor | undefined;
    if (this.assets) {
      const items: string[] = [];
      if (cfg.rightWeapon) items.push(cfg.rightWeapon);
      if (cfg.leftWeapon) items.push(cfg.leftWeapon);
      // Preserve 100% original KayKit textures (no dark tint multiplication)
      actor = new Actor(this.assets, cfg.model, {
        items,
        scale: scale * 1.15,
      });
      if (cfg.rightWeapon && cfg.rightWeapon.startsWith('Skeleton_')) {
        actor.hold(cfg.rightWeapon, 'handslot.r');
      }
      if (cfg.leftWeapon && cfg.leftWeapon.startsWith('Skeleton_')) {
        actor.hold(cfg.leftWeapon, 'handslot.l');
      }
      actor.root.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      actor.play('Idle_Combat');
      root.add(actor.root);
    }

    return {
      archetypeId: enemy.archetypeId,
      isElite: enemy.isElite,
      actor,
      root,
      shadowDisc,
      eliteRing,
    };
  }

  private syncBoss3D(state: ArcanaRunState, campaign: CampaignDef, dt: number): void {
    if (!this.assets) return;
    const boss = state.boss;
    if (!boss) {
      if (this.bossInstance) {
        this.bossInstance.actor?.dispose();
        this.bossInstance.root.removeFromParent();
        this.bossInstance = null;
      }
      return;
    }

    if (!this.bossInstance || this.bossInstance.bossId !== boss.def.id) {
      if (this.bossInstance) {
        this.bossInstance.actor?.dispose();
        this.bossInstance.root.removeFromParent();
      }
      this.bossInstance = this.createBoss3D(boss, campaign);
    }

    const pos = this.to3D(boss.x, boss.y, state.map.width, state.map.height);
    const inst = this.bossInstance;
    inst.root.position.x = ease(inst.root.position.x, pos.x, dt * 14);
    inst.root.position.z = ease(inst.root.position.z, pos.z, dt * 14);

    const yaw = Math.atan2(boss.facingX, boss.facingY);
    if (inst.actor) {
      inst.actor.root.rotation.y = turnAngle(inst.actor.root.rotation.y, yaw, dt * 10);
      const clip =
        boss.patternIndex % 3 === 0
          ? '2H_Melee_Attack_Spin'
          : boss.patternIndex % 3 === 1
          ? '1H_Melee_Attack_Jump_Chop'
          : 'Spellcast_Summon';
      inst.actor.play(clip, { loop: true, fade: 0.2, speed: 0.95 });
      inst.actor.flash(
        boss.hitFlashTimer > 0 ? 0xff0054 : 0x000000,
        boss.hitFlashTimer > 0 ? 0.45 : 0
      );
      inst.actor.update(dt);
    }

    inst.auraRing.rotation.z = this.elapsedTime * 0.7;
    inst.innerSigil.rotation.z = -this.elapsedTime * 1.2;
  }

  private createBoss3D(boss: ActiveBoss, campaign: CampaignDef): Boss3DInstance {
    const root = new T.Group();
    this.dynamicRoot.add(root);

    const auraColor = new T.Color(campaign.boss.palette.glow).getHex();
    const auraRing = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: fxTexture('magic'),
        color: auraColor,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.06;
    auraRing.scale.setScalar(5.4);
    root.add(auraRing);

    const innerSigil = new T.Mesh(
      this.unitPlane,
      new T.MeshBasicMaterial({
        map: fxTexture('rune'),
        color: new T.Color(campaign.boss.palette.armor).getHex(),
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    innerSigil.rotation.x = -Math.PI / 2;
    innerSigil.position.y = 0.08;
    innerSigil.scale.setScalar(3.8);
    root.add(innerSigil);

    const light = new T.PointLight(auraColor, 5.5, 18, 1.5);
    light.position.set(0, 4.2, 0);
    root.add(light);

    let actor: Actor | undefined;
    if (this.assets) {
      const modernChoice =
        campaign.id === 'runes'
          ? 'AstralMage'
          : campaign.id === 'ash'
          ? 'ScarletSorceress'
          : campaign.id === 'cloister'
          ? 'LunarKnight'
          : 'ReaverKnight';
      const hasModern = !!this.assets.modern?.models.has(modernChoice);
      actor = new Actor(this.assets, 'Skeleton_Warrior', {
        modern: hasModern ? modernChoice : undefined,
        scale: hasModern ? 2.45 : 2.25,
      });
      if (!hasModern) {
        actor.hold('Skeleton_Axe', 'handslot.r');
        actor.hold('Skeleton_Shield_Large_A', 'handslot.l');
      }
      actor.root.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      actor.play('Idle_Combat');
      root.add(actor.root);
    }

    return {
      bossId: boss.def.id,
      actor,
      root,
      auraRing,
      innerSigil,
      light,
    };
  }

  // --------------------------------------------------------------------------
  // 3D Projectiles, Telegraphs, Constructs & Loot Sync
  // --------------------------------------------------------------------------

  private syncProjectilesAndConstructs3D(state: ArcanaRunState, dt: number): void {
    const mapW = state.map.width;
    const mapH = state.map.height;

    const activeProjIds = new Set<string>();
    this.trailTimer += dt;
    const emitTrail = this.trailTimer >= 0.045;
    if (emitTrail) this.trailTimer = 0;

    for (const proj of state.projectiles) {
      activeProjIds.add(proj.id);
      let grp = this.projectileMeshes.get(proj.id);
      const pCol = new T.Color(proj.color).getHex();
      const cCol = 0xffffff;
      const r3d = Math.max(0.35, proj.radius * WORLD_SCALE * 2.2);

      if (!grp) {
        grp = new T.Group();

        if (proj.kind === 'terracotta_block') {
          // Borak's Stratified Terracotta Kinetic Rock Block (Real 3D tumbling monolith!)
          const blockGeo = new T.BoxGeometry(r3d * 1.8, r3d * 1.4, r3d * 2.0);
          const blockMat = new T.MeshStandardMaterial({
            color: 0xb55232, // Terracotta rich clay
            roughness: 0.75,
            metalness: 0.15,
            emissive: 0xffbe0b,
            emissiveIntensity: 0.35,
          });
          const blockMesh = new T.Mesh(blockGeo, blockMat);
          blockMesh.name = 'terra_block';

          const glowAura = new T.Sprite(
            new T.SpriteMaterial({
              map: vfxTexture('glow'),
              color: 0xffbe0b,
              transparent: true,
              opacity: 0.65,
              blending: T.AdditiveBlending,
            })
          );
          glowAura.scale.setScalar(r3d * 3.2);

          const dustWake = new T.Mesh(
            this.unitPlane,
            new T.MeshBasicMaterial({
              map: vfxTexture('trace'),
              color: 0xd4a373,
              transparent: true,
              opacity: 0.55,
              side: T.DoubleSide,
              blending: T.NormalBlending,
            })
          );
          dustWake.rotation.x = -Math.PI / 2;
          dustWake.scale.set(r3d * 1.8, r3d * 3.8, 1);

          grp.add(blockMesh, glowAura, dustWake);
        } else if (proj.kind === 'fan_gale') {
          // Kael's Celestial Fan Gust (Sweeping wide aerodynamic wind crescent)
          const outer = new T.Sprite(
            new T.SpriteMaterial({
              map: vfxTexture('glow'),
              color: 0x80ffdb,
              transparent: true,
              opacity: 0.95,
              depthWrite: false,
              blending: T.AdditiveBlending,
            })
          );
          outer.scale.set(r3d * 4.6, r3d * 2.2, 1);

          const bladeSlash = new T.Mesh(
            this.unitPlane,
            new T.MeshBasicMaterial({
              map: vfxTexture('slash'),
              color: 0xffffff,
              transparent: true,
              opacity: 0.95,
              side: T.DoubleSide,
              blending: T.AdditiveBlending,
            })
          );
          bladeSlash.rotation.x = -Math.PI / 2;
          bladeSlash.scale.set(r3d * 4.8, r3d * 2.4, 1);

          const galeWake = new T.Mesh(
            this.unitPlane,
            new T.MeshBasicMaterial({
              map: vfxTexture('trace'),
              color: 0x52b788,
              transparent: true,
              opacity: 0.72,
              side: T.DoubleSide,
              blending: T.AdditiveBlending,
            })
          );
          galeWake.rotation.x = -Math.PI / 2;
          galeWake.scale.set(r3d * 3.4, r3d * 5.2, 1);

          grp.add(outer, bladeSlash, galeWake);
        } else if (proj.kind === 'water_whip') {
          // Nerys' Liquid Water Whip with Frost Mist
          const outer = new T.Sprite(
            new T.SpriteMaterial({
              map: vfxTexture('glow'),
              color: 0x00bbf9,
              transparent: true,
              opacity: 0.95,
              blending: T.AdditiveBlending,
            })
          );
          outer.scale.set(r3d * 2.2, r3d * 4.2, 1);

          const core = new T.Sprite(
            new T.SpriteMaterial({
              map: vfxTexture('flare'),
              color: 0xe0fbfc,
              transparent: true,
              opacity: 0.98,
              blending: T.AdditiveBlending,
            })
          );
          core.scale.set(r3d * 1.2, r3d * 2.8, 1);

          const splashWake = new T.Mesh(
            this.unitPlane,
            new T.MeshBasicMaterial({
              map: vfxTexture('trace'),
              color: 0x00f5d4,
              transparent: true,
              opacity: 0.85,
              side: T.DoubleSide,
              blending: T.AdditiveBlending,
            })
          );
          splashWake.rotation.x = -Math.PI / 2;
          splashWake.scale.set(r3d * 1.5, r3d * 4.8, 1);

          grp.add(outer, core, splashWake);
        } else if (proj.kind === 'solar_fist') {
          // Iskra's Blazing Solar Fist with Roaring Corona
          const outer = new T.Sprite(
            new T.SpriteMaterial({
              map: vfxTexture('fire'),
              color: 0xff5400,
              transparent: true,
              opacity: 0.96,
              blending: T.AdditiveBlending,
            })
          );
          outer.scale.setScalar(r3d * 3.6);

          const core = new T.Sprite(
            new T.SpriteMaterial({
              map: vfxTexture('flare'),
              color: 0xffd166,
              transparent: true,
              opacity: 1.0,
              blending: T.AdditiveBlending,
            })
          );
          core.scale.setScalar(r3d * 1.8);

          const flameWake = new T.Mesh(
            this.unitPlane,
            new T.MeshBasicMaterial({
              map: vfxTexture('trace'),
              color: 0xff0054,
              transparent: true,
              opacity: 0.85,
              side: T.DoubleSide,
              blending: T.AdditiveBlending,
            })
          );
          flameWake.rotation.x = -Math.PI / 2;
          flameWake.scale.set(r3d * 1.8, r3d * 4.2, 1);

          grp.add(outer, core, flameWake);
        } else {
          // Generic elemental projectile
          const outer = new T.Sprite(
            new T.SpriteMaterial({
              map: vfxTexture(proj.element === 'fire' ? 'fire' : 'glow'),
              color: pCol,
              transparent: true,
              opacity: 0.92,
              depthWrite: false,
              blending: T.AdditiveBlending,
              toneMapped: false,
            })
          );
          outer.scale.setScalar(r3d * 2.4);

          const core = new T.Sprite(
            new T.SpriteMaterial({
              map: vfxTexture('flare'),
              color: cCol,
              transparent: true,
              opacity: 0.98,
              depthWrite: false,
              blending: T.AdditiveBlending,
              toneMapped: false,
            })
          );
          core.scale.setScalar(r3d * 1.15);

          const wake = new T.Mesh(
            this.unitPlane,
            new T.MeshBasicMaterial({
              map: vfxTexture('trace'),
              color: pCol,
              transparent: true,
              opacity: 0.78,
              depthWrite: false,
              side: T.DoubleSide,
              blending: T.AdditiveBlending,
              toneMapped: false,
            })
          );
          wake.rotation.x = -Math.PI / 2;
          wake.scale.set(r3d * 1.2, r3d * 3.4, 1);

          grp.add(outer, core, wake);
        }

        this.vfxRoot.add(grp);
        this.projectileMeshes.set(proj.id, grp);
      }

      const pos = this.to3D(proj.x, proj.y, mapW, mapH);
      grp.position.set(pos.x, 1.05, pos.z);
      const wakeMesh = grp.children[2] as T.Mesh;
      if (wakeMesh) {
        wakeMesh.rotation.z = -Math.atan2(proj.vx, proj.vy);
      }
      const blockMesh = grp.getObjectByName('terra_block');
      if (blockMesh) {
        blockMesh.rotation.x += dt * 8.5;
        blockMesh.rotation.y += dt * 5.5;
        blockMesh.rotation.z += dt * 3.2;
      }

      if (emitTrail) {
        const tex =
          proj.kind === 'fan_gale'
            ? 'spark'
            : proj.kind === 'water_whip'
              ? 'star'
              : proj.kind === 'solar_fist' || proj.element === 'fire'
                ? 'fire'
                : proj.element === 'lightning'
                  ? 'spark'
                  : proj.element === 'frost'
                    ? 'star'
                    : 'glow';
        this.spawnSoftParticle(
          tex,
          pos.x,
          1.05,
          pos.z,
          pCol,
          r3d * 1.3,
          0.1,
          0.26,
          new T.Vector3(pos.x, 1.35, pos.z)
        );
      }
    }

    for (const [id, grp] of this.projectileMeshes) {
      if (!activeProjIds.has(id)) {
        this.spawnImpactBurst(
          grp.position.x,
          grp.position.y,
          grp.position.z,
          'elemental',
          0xffd166,
          0.95
        );
        grp.removeFromParent();
        this.projectileMeshes.delete(id);
      }
    }

    // 2. Sync Combat Ground Telegraphs
    const activeTelIds = new Set<string>();
    for (const tel of state.telegraphs) {
      activeTelIds.add(tel.id);
      let entry = this.telegraphMeshes.get(tel.id);
      const tCol =
        tel.owner === 'player'
          ? 0x00f5d4
          : tel.owner === 'boss'
          ? 0xff0054
          : this.elementToColorHex(tel.element);
      if (!entry) {
        const group = new T.Group();
        const fill = new T.Mesh(
          this.unitPlane,
          new T.MeshBasicMaterial({
            map: fxTexture('magic'),
            color: tCol,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
            blending: T.AdditiveBlending,
          })
        );
        fill.rotation.x = -Math.PI / 2;

        const border = new T.Mesh(
          this.unitPlane,
          new T.MeshBasicMaterial({
            map: vfxTexture('ring'),
            color: tCol,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: T.AdditiveBlending,
          })
        );
        border.rotation.x = -Math.PI / 2;

        group.add(fill, border);
        this.vfxRoot.add(group);
        entry = { group, fill, border };
        this.telegraphMeshes.set(tel.id, entry);
      }

      const pos = this.to3D(tel.x, tel.y, mapW, mapH);
      const rad3D = Math.max(0.8, tel.radius * WORLD_SCALE * 2);
      const progress = Math.min(1, tel.elapsed / Math.max(0.05, tel.duration));
      entry.group.position.set(pos.x, 0.05, pos.z);
      entry.fill.scale.setScalar(rad3D * (0.25 + 0.75 * progress));
      entry.fill.rotation.z = this.elapsedTime * 1.5;
      entry.border.scale.setScalar(rad3D);
    }

    for (const [id, entry] of this.telegraphMeshes) {
      if (!activeTelIds.has(id)) {
        entry.group.removeFromParent();
        this.telegraphMeshes.delete(id);
      }
    }

    // 3. Sync Elemental Constructs
    const activeConIds = new Set<string>();
    for (const c of state.constructs) {
      activeConIds.add(c.id);
      let grp = this.constructMeshes.get(c.id);
      const cCol = HERO_3D_CONFIG[c.ownerClass].handGlowHex;
      if (!grp) {
        grp = new T.Group();
        const baseRing = new T.Mesh(
          this.unitPlane,
          new T.MeshBasicMaterial({
            map: fxTexture('twirl'),
            color: cCol,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: T.AdditiveBlending,
          })
        );
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.y = 0.06;
        baseRing.scale.setScalar(Math.max(2.4, c.radius * WORLD_SCALE * 2));

        const pillar = new T.Sprite(
          new T.SpriteMaterial({
            map: vfxTexture(c.kind.includes('chaos') ? 'fire' : 'glow'),
            color: cCol,
            transparent: true,
            opacity: 0.88,
            depthWrite: false,
            blending: T.AdditiveBlending,
          })
        );
        pillar.position.y = 1.6;
        pillar.scale.set(2.2, 3.4, 1);

        grp.add(baseRing, pillar);
        this.vfxRoot.add(grp);
        this.constructMeshes.set(c.id, grp);
      }
      const pos = this.to3D(c.x, c.y, mapW, mapH);
      grp.position.set(pos.x, 0, pos.z);
      grp.children[0].rotation.z = this.elapsedTime * 2.5;
    }

    for (const [id, grp] of this.constructMeshes) {
      if (!activeConIds.has(id)) {
        grp.removeFromParent();
        this.constructMeshes.delete(id);
      }
    }

    // 4. Sync Loot Drops
    const activeLootIds = new Set<string>();
    for (let i = 0; i < state.loot.length; i++) {
      const l = state.loot[i];
      activeLootIds.add(l.id);
      let grp = this.lootMeshes.get(l.id);
      const isXp = l.kind.startsWith('xp_');
      if (!grp) {
        grp = new T.Group();
        const col = isXp
          ? 0x00f5d4
          : l.kind === 'hp_orb'
          ? 0xff2a54
          : 0xffd166;
        const sp = new T.Sprite(
          new T.SpriteMaterial({
            map: vfxTexture('flare'),
            color: col,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            blending: T.AdditiveBlending,
          })
        );
        sp.scale.setScalar(isXp ? 0.85 : 1.25);
        grp.add(sp);
        this.vfxRoot.add(grp);
        this.lootMeshes.set(l.id, grp);
      }
      const pos = this.to3D(l.x, l.y, mapW, mapH);
      grp.position.set(
        pos.x,
        0.55 + Math.sin(this.elapsedTime * 5 + i) * 0.16,
        pos.z
      );
    }

    for (const [id, grp] of this.lootMeshes) {
      if (!activeLootIds.has(id)) {
        grp.removeFromParent();
        this.lootMeshes.delete(id);
      }
    }
  }

  private updateSoftParticles(dt: number): void {
    for (let i = this.softParticles.length - 1; i >= 0; i--) {
      const p = this.softParticles[i];
      p.age += dt;
      const t = Math.min(1, p.age / Math.max(0.01, p.life));
      if (t >= 1) {
        p.sprite.removeFromParent();
        (p.sprite.material as T.Material).dispose();
        this.softParticles.splice(i, 1);
        continue;
      }

      p.sprite.position.lerpVectors(p.from, p.to, t);
      const curScale = p.baseScale + (p.endScale - p.baseScale) * t;
      p.sprite.scale.setScalar(curScale);

      const mat = p.sprite.material as T.SpriteMaterial | T.MeshBasicMaterial;
      mat.opacity = 0.92 * (1 - t * t);
      if (p.sprite instanceof T.Sprite) {
        (p.sprite.material as T.SpriteMaterial).rotation += p.spin * dt;
      } else {
        p.sprite.rotation.z += p.spin * dt * 0.4;
      }
    }
  }

  /**
   * Spawns an impactful, juicy combat VFX burst:
   * 1. Ground shockwave ring
   * 2. Lingering scorch/ice/arcane ground decal
   * 3. Flash flare
   * 4. Radial spark motes
   */
  public spawnImpactBurst(
    x: number,
    y: number,
    z: number,
    element: string,
    colorHex: number,
    radius = 1.0
  ): void {
    // 1. Ground shockwave ring
    this.spawnSoftParticle(
      'ring',
      x,
      0.04,
      z,
      colorHex,
      radius * 0.4,
      radius * 2.2,
      0.24,
      new T.Vector3(x, 0.04, z)
    );

    // 2. Lingering ground decal
    const decalTex =
      element === 'fire' || element === 'earth'
        ? 'scorch'
        : element === 'frost'
        ? 'star'
        : element === 'lightning'
        ? 'rune'
        : 'twirl';
    this.spawnSoftParticle(
      decalTex,
      x,
      0.03,
      z,
      element === 'fire' ? 0x221108 : colorHex,
      radius * 0.8,
      radius * 1.05,
      element === 'fire' ? 2.5 : 1.2,
      new T.Vector3(x, 0.03, z)
    );

    // 3. Central flash flare
    this.spawnSoftParticle('flare', x, y, z, 0xffffff, radius * 0.7, radius * 2.2, 0.16);

    // 4. Radial burst sparks
    const sparkTex =
      element === 'fire'
        ? 'fire'
        : element === 'frost'
        ? 'star'
        : element === 'lightning'
        ? 'spark'
        : 'magic';
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const dist = radius * (0.8 + Math.random() * 0.8);
      this.spawnSoftParticle(
        sparkTex,
        x,
        y,
        z,
        colorHex,
        radius * 0.45,
        radius * 0.2,
        0.35 + Math.random() * 0.2,
        new T.Vector3(x + Math.cos(angle) * dist, y + 0.4 + Math.random() * 0.4, z + Math.sin(angle) * dist)
      );
    }
  }

  private updateWeatherParticles(
    campaign: CampaignDef,
    targetX: number,
    targetZ: number,
    dt: number
  ): void {
    if (this.weatherCampaignId !== campaign.id || !this.weatherMesh) {
      this.weatherCampaignId = campaign.id;
      if (this.weatherMesh) {
        this.weatherMesh.geometry.dispose();
        (this.weatherMesh.material as T.Material).dispose();
        this.weatherMesh.removeFromParent();
        this.weatherMesh = null;
      }

      this.weatherPositions = new Float32Array(this.weatherCount * 3);
      this.weatherVelocities = new Float32Array(this.weatherCount * 3);

      const isRunes = campaign.id === 'runes';
      const isAsh = campaign.id === 'ash';
      const isCloister = campaign.id === 'cloister';
      const isHourglasses = campaign.id === 'hourglasses';

      const texName = isRunes ? 'star' : isAsh ? 'fire' : isCloister ? 'twirl' : isHourglasses ? 'spark' : 'magic';
      const pColor = isRunes ? 0xd0f4ff : isAsh ? 0xff6b35 : isCloister ? 0xffe66d : isHourglasses ? 0x80ffdb : 0xc77dff;
      const pSize = isRunes ? 0.35 : isAsh ? 0.42 : isCloister ? 0.38 : isHourglasses ? 0.32 : 0.45;

      for (let i = 0; i < this.weatherCount; i++) {
        this.weatherPositions[i * 3] = targetX + (Math.random() - 0.5) * 32;
        this.weatherPositions[i * 3 + 1] = 0.4 + Math.random() * 5.5;
        this.weatherPositions[i * 3 + 2] = targetZ + (Math.random() - 0.5) * 32;

        if (isRunes) {
          // Falling snow
          this.weatherVelocities[i * 3] = 0.8 + (Math.random() - 0.5) * 0.4;
          this.weatherVelocities[i * 3 + 1] = -1.2 - Math.random() * 0.8;
          this.weatherVelocities[i * 3 + 2] = 0.4 + (Math.random() - 0.5) * 0.4;
        } else if (isAsh) {
          // Rising embers
          this.weatherVelocities[i * 3] = (Math.random() - 0.5) * 0.6;
          this.weatherVelocities[i * 3 + 1] = 0.9 + Math.random() * 1.1;
          this.weatherVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
        } else {
          // Swirling motes
          this.weatherVelocities[i * 3] = (Math.random() - 0.5) * 1.2;
          this.weatherVelocities[i * 3 + 1] = 0.3 + (Math.random() - 0.5) * 0.6;
          this.weatherVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
        }
      }

      const geom = new T.BufferGeometry();
      geom.setAttribute('position', new T.BufferAttribute(this.weatherPositions, 3));
      const mat = new T.PointsMaterial({
        size: pSize,
        map: vfxTexture(texName),
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: T.AdditiveBlending,
        color: pColor,
      });

      this.weatherMesh = new T.Points(geom, mat);
      this.weatherMesh.frustumCulled = false;
      this.vfxRoot.add(this.weatherMesh);
    }

    if (!this.weatherMesh || !this.weatherPositions || !this.weatherVelocities) return;

    const pos = this.weatherPositions;
    const vel = this.weatherVelocities;
    const isAsh = campaign.id === 'ash';

    for (let i = 0; i < this.weatherCount; i++) {
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

      // Recycle if outside bounding box around camera/target
      const dx = pos[i * 3] - targetX;
      const dz = pos[i * 3 + 2] - targetZ;
      if (Math.hypot(dx, dz) > 19 || pos[i * 3 + 1] < 0.2 || pos[i * 3 + 1] > 6.5) {
        pos[i * 3] = targetX + (Math.random() - 0.5) * 28;
        pos[i * 3 + 1] = isAsh ? 0.3 : 5.8;
        pos[i * 3 + 2] = targetZ + (Math.random() - 0.5) * 28;
      }
    }

    this.weatherMesh.geometry.attributes.position.needsUpdate = true;
  }

  // --------------------------------------------------------------------------
  // Main Render Entry Point
  // --------------------------------------------------------------------------

  public render(
    state: ArcanaRunState,
    dt: number,
    showHudOverlay = true,
    menuHeroShowcase = false
  ): void {
    const safeDt = Math.min(0.1, Math.max(0.001, dt));
    this.elapsedTime += safeDt;
    const campaign = this.getCampaignDef(state);

    this.ensureBiomeBuilt(state, campaign);

    this.playerHero = this.getOrCreateHero3D(this.playerHero, state.player.classId);
    this.updateHero3D(
      this.playerHero,
      state.player,
      state.map.width,
      state.map.height,
      safeDt,
      true
    );

    if (menuHeroShowcase && this.playerHero.actor) {
      // Gently rotate hero on turntable for menu showcase
      this.playerHero.actor.root.rotation.y = Math.sin(this.elapsedTime * 0.65) * 0.42;
    }

    const allies = state.coopAllies && state.coopAllies.length > 0
      ? state.coopAllies
      : (state.coopPartner ? [state.coopPartner] : []);

    if (!menuHeroShowcase && allies.length > 0) {
      const activeKeys = new Set<string>();
      allies.forEach((ally, i) => {
        const allyKey = ally.peerId || `ally_${i}`;
        activeKeys.add(allyKey);
        let instance = this.allyHeroes.get(allyKey) || null;
        instance = this.getOrCreateHero3D(instance, ally.classId);
        this.allyHeroes.set(allyKey, instance);
        instance.root.visible = true;
        this.updateHero3D(
          instance,
          ally,
          state.map.width,
          state.map.height,
          safeDt,
          false
        );
      });
      for (const [key, inst] of this.allyHeroes) {
        if (!activeKeys.has(key)) {
          inst.root.visible = false;
        }
      }
    } else {
      for (const [, inst] of this.allyHeroes) {
        inst.root.visible = false;
      }
      if (this.allyHero) this.allyHero.root.visible = false;
    }

    for (const poi of state.map.pois) {
      const m = this.poiMeshes.get(poi.id);
      if (m) {
        m.runeRing.visible = !poi.used;
        m.beacon.visible = !poi.used;
        m.runeRing.rotation.z = this.elapsedTime * 0.9;
        m.beacon.scale.setScalar(2.1 + Math.sin(this.elapsedTime * 3.5) * 0.28);
      }
    }

    const p3d = this.playerHero.root.position;

    if (menuHeroShowcase) {
      // In Hero Selection Menu: Hide enemies & bosses so the Hero is framed in peace!
      for (const [, en] of this.enemyInstances) {
        en.root.visible = false;
      }
      if (this.bossInstance) {
        this.bossInstance.root.visible = false;
      }

      // Floating Transcendence Stance (Matching Reference Image 3)
      if (this.playerHero.actor) {
        this.playerHero.actor.root.position.y = 0.28 + Math.sin(this.elapsedTime * 2.2) * 0.08;
        this.playerHero.actor.root.rotation.y = Math.sin(this.elapsedTime * 0.65) * 0.38;
      }

      // Avatar State Glowing White Eyes & Swirling Elemental VFX (Images 3 & 4)
      this.syncAvatarStateVFX(p3d, state.player.classId, safeDt, true);

      // Camera Framing with ample headroom — full hero visible from head to boots
      this.camTargetX = p3d.x - 0.7;
      this.camTargetZ = p3d.z;
      this.camera.position.set(p3d.x - 0.65, 1.45, p3d.z + 4.85);
      this.camera.lookAt(p3d.x - 0.75, 1.08, p3d.z);

      // Key light & rim light tuned for cel-shaded anime brilliance
      this.playerLight.position.set(p3d.x - 0.8, 2.2, p3d.z + 2.4);
      this.playerLight.intensity = 3.6;
      this.playerLight.color.setHex(0xfffaed);

      const cfg = HERO_3D_CONFIG[state.player.classId];
      this.rimLight.position.set(p3d.x + 1.8, 2.5, p3d.z - 2.8);
      this.rimLight.intensity = 5.2;
      this.rimLight.color.setHex(cfg.handGlowHex);
    } else {
      this.syncEnemies3D(state, safeDt);
      this.syncBoss3D(state, campaign, safeDt);
      this.syncProjectilesAndConstructs3D(state, safeDt);
      this.syncAvatarStateVFX(p3d, state.player.classId, safeDt, false);

      // Ravenswatch Intimate Isometric 3D Camera (Closer framing so models, weapons & textures shine!)
      const leadX = state.player.facingX * 0.65;
      const leadZ = state.player.facingY * 0.65;
      this.camTargetX = ease(this.camTargetX, p3d.x + leadX, safeDt * 8.5);
      this.camTargetZ = ease(this.camTargetZ, p3d.z + leadZ, safeDt * 8.5);

      const isBoss = state.phase === 'E_BOSS' || state.boss !== null;
      this.camZoom = ease(this.camZoom, isBoss ? 1.12 : 1.0, safeDt * 3);

      let shakeX = 0;
      let shakeZ = 0;
      if (state.screenShake > 0.01) {
        const mag = Math.min(0.35, state.screenShake * 0.18);
        shakeX = (Math.random() - 0.5) * mag;
        shakeZ = (Math.random() - 0.5) * mag;
      }

      const camDistY = 8.8 * this.camZoom;
      const camDistZ = 8.2 * this.camZoom;
      this.camera.position.set(
        this.camTargetX + shakeX,
        camDistY,
        this.camTargetZ + camDistZ + shakeZ
      );
      this.camera.lookAt(this.camTargetX, 1.05, this.camTargetZ);

      this.playerLight.position.set(p3d.x, 3.2, p3d.z);
      this.playerLight.color.set(ARCANA_CLASSES[state.player.classId].palette.glow);
      this.playerLight.intensity = 2.8;
    }

    this.updateSoftParticles(safeDt);
    this.updateWeatherParticles(campaign, this.camTargetX, this.camTargetZ, safeDt);

    // Keep Directional Shadow Camera centered on the player
    this.dirLight.position.set(p3d.x - 14, 24, p3d.z + 14);
    this.dirLight.target.position.set(p3d.x, 0, p3d.z);

    // Gently animate celestial Aurora ribbons in sky
    if (this.auroraRibbons.length > 0) {
      this.auroraRibbons.forEach((ribbon, idx) => {
        ribbon.rotation.z = (idx - 1) * 0.12 + Math.sin(this.elapsedTime * 0.4 + idx) * 0.04;
      });
    }

    if (this.webgl) {
      this.webgl.render(this.scene, this.camera);
    }

    this.render2DOverlay(state, campaign, showHudOverlay);
  }

  // --------------------------------------------------------------------------
  // Ravenswatch Graphic-Novel 2D Overlay: Overhead Health Bars, Damage Texts & Organic Minimap
  // --------------------------------------------------------------------------

  private projectToScreen(
    wx: number,
    wy: number,
    yHeight: number,
    mapW: number,
    mapH: number
  ): { x: number; y: number; visible: boolean } {
    const pos3d = this.to3D(wx, wy, mapW, mapH);
    const v = new T.Vector3(pos3d.x, yHeight, pos3d.z);
    v.project(this.camera);
    if (v.z > 1) return { x: 0, y: 0, visible: false };
    return {
      x: (v.x * 0.5 + 0.5) * this.width,
      y: (-v.y * 0.5 + 0.5) * this.height,
      visible: true,
    };
  }

  private drawRavenswatchOverheadBar(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    width: number,
    height: number,
    ratio: number,
    fillColor: string,
    shieldRatio = 0,
    segments = 4
  ): void {
    const x = Math.round(sx - width * 0.5);
    const y = Math.round(sy);

    // Thick dark ink outline with slight angled bevel
    ctx.fillStyle = '#05040a';
    ctx.fillRect(x - 2, y - 2, width + 4, height + 4);

    ctx.fillStyle = '#181424';
    ctx.fillRect(x, y, width, height);

    const fillW = Math.max(0, Math.min(width, width * ratio));
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, fillW, height);

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x, y, fillW, Math.max(1, height * 0.35));

    // Ravenswatch segment ticks
    ctx.fillStyle = 'rgba(5, 4, 10, 0.65)';
    for (let i = 1; i < segments; i++) {
      const tx = Math.round(x + (width * i) / segments);
      ctx.fillRect(tx, y, 1, height);
    }

    if (shieldRatio > 0) {
      const shW = Math.min(width, width * shieldRatio);
      ctx.fillStyle = '#7de2ff';
      ctx.fillRect(x, y - 3, shW, 2);
    }
  }

  private render2DOverlay(
    state: ArcanaRunState,
    campaign: CampaignDef,
    showHudOverlay = true
  ): void {
    const ctx = this.overlayCtx;
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    if (!showHudOverlay) {
      ctx.restore();
      return;
    }

    const mapW = state.map.width;
    const mapH = state.map.height;

    // Ravenswatch dark atmospheric edge vignette
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxR = Math.hypot(cx, cy);
    const vig = ctx.createRadialGradient(cx, cy, maxR * 0.52, cx, cy, maxR);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.78, 'rgba(5,4,12,0.34)');
    vig.addColorStop(1, 'rgba(2,2,6,0.82)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.width, this.height);

    // Overhead Health Bar for Player (Ravenswatch Emerald Green Bar)
    const pProj = this.projectToScreen(state.player.x, state.player.y, 2.55, mapW, mapH);
    if (pProj.visible) {
      this.drawRavenswatchOverheadBar(
        ctx,
        pProj.x,
        pProj.y,
        56,
        7,
        state.player.hp / Math.max(1, state.player.maxHp),
        '#52b788',
        state.player.shield / Math.max(1, state.player.maxHp),
        5
      );
    }

    const renderAllies = state.coopAllies && state.coopAllies.length > 0
      ? state.coopAllies
      : (state.coopPartner ? [state.coopPartner] : []);

    for (const ally of renderAllies) {
      const aProj = this.projectToScreen(
        ally.x,
        ally.y,
        2.55,
        mapW,
        mapH
      );
      if (aProj.visible) {
        this.drawRavenswatchOverheadBar(
          ctx,
          aProj.x,
          aProj.y,
          50,
          6,
          ally.hp / Math.max(1, ally.maxHp),
          '#4cc9f0',
          0,
          4
        );
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Cinzel, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        const shortName = ally.name.split(' (')[0] || ally.name;
        ctx.fillText(shortName, aProj.x, aProj.y - 8);
        ctx.shadowBlur = 0;
      }
    }

    for (const en of state.enemies) {
      const eProj = this.projectToScreen(
        en.x,
        en.y,
        en.isElite ? 2.65 : 2.15,
        mapW,
        mapH
      );
      if (eProj.visible) {
        this.drawRavenswatchOverheadBar(
          ctx,
          eProj.x,
          eProj.y,
          en.isElite ? 52 : 38,
          en.isElite ? 6 : 5,
          en.hp / Math.max(1, en.maxHp),
          en.isElite ? '#ffbe0b' : '#52b788',
          0,
          en.isElite ? 5 : 3
        );
      }
    }

    ctx.textAlign = 'center';
    for (const ft of state.floatingTexts) {
      const fProj = this.projectToScreen(ft.x, ft.y, 2.2, mapW, mapH);
      if (!fProj.visible) continue;
      const alpha = Math.max(0, Math.min(1, ft.life / ft.maxLife));
      const floatOffset = (1 - alpha) * 28;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${ft.isCrit ? '900 18px' : '800 13px'} "Cinzel", Georgia, serif`;
      ctx.strokeStyle = '#05030a';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, fProj.x, fProj.y - floatOffset);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fProj.x, fProj.y - floatOffset);
      ctx.restore();
    }

    this.renderRavenswatchMinimap(ctx, state, campaign);

    ctx.restore();
  }

  /**
   * Ravenswatch-style organic lower-right tactical minimap with POI icons, roads, and boss medallion.
   */
  private renderRavenswatchMinimap(
    ctx: CanvasRenderingContext2D,
    state: ArcanaRunState,
    campaign: CampaignDef
  ): void {
    if (this.width < 580) return;
    const map = state.map;
    const radius = 68;
    const cx = this.width - radius - 26;
    const cy = this.height - radius - 86;

    ctx.save();
    // Outer dark ink shadow & gold compass ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 5, 12, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(218, 182, 110, 0.55)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Earthy Ravenswatch parchment-dark terrain fill
    const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, radius);
    bgGrad.addColorStop(0, '#2a3028');
    bgGrad.addColorStop(0.75, '#1a1e1a');
    bgGrad.addColorStop(1, '#0c0e0e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    const sx = (radius * 1.75) / map.width;
    const sy = (radius * 1.75) / map.height;
    const ox = cx - radius * 0.875;
    const oy = cy - radius * 0.875;

    // Draw organic road network on minimap
    ctx.strokeStyle = 'rgba(168, 158, 128, 0.42)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    for (const poi of map.pois) {
      ctx.beginPath();
      ctx.moveTo(ox + map.spawnX * sx, oy + map.spawnY * sy);
      ctx.lineTo(ox + poi.x * sx, oy + poi.y * sy);
      ctx.lineTo(ox + map.bossArenaCenter.x * sx, oy + map.bossArenaCenter.y * sy);
      ctx.stroke();
    }

    // Boss Arena circle
    const ax = ox + map.bossArenaCenter.x * sx;
    const ay = oy + map.bossArenaCenter.y * sy;
    ctx.strokeStyle = state.boss ? '#ff2a54' : 'rgba(226, 201, 138, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ax, ay, map.bossArenaCenter.radius * sx, 0, Math.PI * 2);
    ctx.stroke();

    // Shrine POI diamond markers
    for (const poi of map.pois) {
      if (poi.used) continue;
      const px = ox + poi.x * sx;
      const py = oy + poi.y * sy;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = poi.type === 'healing_sanctuary' ? '#52b788' : '#f3d79a';
      ctx.strokeStyle = '#05040a';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-3.5, -3.5, 7, 7);
      ctx.strokeRect(-3.5, -3.5, 7, 7);
      ctx.restore();
    }

    // Enemy dots
    for (const en of state.enemies) {
      ctx.fillStyle = en.isElite ? '#ffbe0b' : '#e63946';
      const r = en.isElite ? 2.6 : 1.8;
      ctx.beginPath();
      ctx.arc(ox + en.x * sx, oy + en.y * sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.boss) {
      ctx.fillStyle = '#ff0054';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox + state.boss.x * sx, oy + state.boss.y * sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Player green beacon dot (Ravenswatch style)
    const px = ox + state.player.x * sx;
    const py = oy + state.player.y * sy;
    ctx.fillStyle = '#40c057';
    ctx.strokeStyle = '#05040a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Sun/Moon Medallion at bottom-right of minimap (Ravenswatch signature)
    const medX = this.width - 38;
    const medY = this.height - 34;
    ctx.save();
    ctx.beginPath();
    ctx.arc(medX, medY, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#181422';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#d4b46a';
    ctx.stroke();

    ctx.fillStyle = '#f3d79a';
    ctx.font = '700 11px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(campaign.roman, medX, medY + 1);
    ctx.restore();
  }
}
