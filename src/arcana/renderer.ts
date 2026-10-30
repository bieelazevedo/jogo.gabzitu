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
import { dressNightWorld, NIGHT_PATHS } from '../night-layout';
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
  // Guardião da Tempestade (Kael — Voo, Vácuo & Tempestade Cortante) -> LunarKnight + Wind Bronze Sword
  chrono: {
    fallbackChar: 'Rogue_Hooded',
    modernModel: 'LunarKnight',
    weaponProp: '1H_Sword',
    authoredWeapon: 'weapon-Sword_Bronze',
    offhandProp: 'Knife_Offhand',
    handGlowHex: 0x80ffdb,
    handCoreHex: 0xffffff,
    auraHex: 0x72efdd,
    slashClips: [
      '1H_Melee_Attack_Slice_Diagonal',
      '1H_Melee_Attack_Slice_Horizontal',
      '2H_Melee_Attack_Spin',
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
  private dressWorldHandle?: ReturnType<typeof dressNightWorld>;
  private fallbackGroundDispose?: () => void;
  private mapSnapshotCanvas?: HTMLCanvasElement;

  // Scene Roots
  private worldRoot = new T.Group();
  private propsRoot = new T.Group();
  private dynamicRoot = new T.Group();
  private vfxRoot = new T.Group();

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
      this.playerLight
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
    this.dressWorldHandle?.dispose();
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

    this.dressWorldHandle?.dispose();
    this.dressWorldHandle = undefined;
    this.fallbackGroundDispose?.();
    this.fallbackGroundDispose = undefined;
    this.worldRoot.clear();
    this.propsRoot.clear();
    this.poiMeshes.clear();

    const map = state.map;
    const bgCol = new T.Color(campaign.palette.bgDeep);
    this.scene.background = bgCol;
    this.scene.fog = new T.FogExp2(bgCol.getHex(), 0.015);

    // Update dynamic atmospheric lighting per campaign
    this.hemiLight.color.set(campaign.palette.ambientLight);
    this.hemiLight.groundColor.set(campaign.palette.bgDeep);
    this.dirLight.color.set(campaign.palette.floorSecondary);
    this.rimLight.color.set(campaign.palette.accentRunes);

    // Convert campaign road network into 3D paths for normal-mapped forestGround blending
    const sp3 = this.to3D(map.spawnX, map.spawnY, map.width, map.height);
    const ar3 = this.to3D(map.bossArenaCenter.x, map.bossArenaCenter.y, map.width, map.height);
    const customPaths: number[][] = [...NIGHT_PATHS];
    for (const poi of map.pois) {
      const p3 = this.to3D(poi.x, poi.y, map.width, map.height);
      customPaths.push([sp3.x, sp3.z, p3.x, p3.z]);
      customPaths.push([p3.x, p3.z, ar3.x, ar3.z]);
    }

    if (this.assets) {
      // 1. Populate the full instanced 3D world (forestGround PBR textures + weatheredStone + 3D trees/cottages/crypts/fences)
      this.dressWorldHandle = dressNightWorld(this.assets, this.worldRoot);
      // 2. Dress the active combat region around Spawn -> Shrines -> Boss Arena with dense Ravenswatch scenery
      this.dressCombatClearing(state, campaign, sp3, ar3);
    } else {
      // Even while GLBs stream (~800ms), immediately use the real photo-based normal-mapped forestGround!
      this.fallbackGroundDispose = forestGround(this.worldRoot, customPaths);
    }

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
   * Dresses the immediate combat lanes and spawn clearing with authentic
   * dark-fantasy biome props matching each Realm of Aethra.
   */
  private dressCombatClearing(
    state: ArcanaRunState,
    campaign: CampaignDef,
    sp3: { x: number; z: number },
    ar3: { x: number; z: number }
  ): void {
    if (!this.assets) return;
    const assets = this.assets;
    const map = state.map;

    const placeProp = (
      name: string,
      x: number,
      z: number,
      rotY = 0,
      scale = 1,
      y = 0,
      useStone = false
    ) => {
      const p = prop(assets, name);
      if (!p.children.length) return;
      p.position.set(x, y, z);
      p.rotation.y = rotY;
      p.scale.setScalar(scale);
      p.traverse((c) => {
        if (c instanceof T.Mesh) {
          c.castShadow = !name.startsWith('path_') && !name.startsWith('floor_');
          c.receiveShadow = true;
          if (useStone && c.material instanceof T.MeshStandardMaterial) {
            c.material = weatheredStone(c.material);
          }
        }
      });
      this.propsRoot.add(p);
    };

    // 1. Cobblestone Path Tiles along Spawn -> Shrines -> Boss Arena
    const pathKeys = ['path_A', 'path_B', 'path_C', 'path_D'];
    let stepIdx = 0;
    const layRoad = (ax: number, az: number, bx: number, bz: number) => {
      const dist = Math.hypot(bx - ax, bz - az);
      const steps = Math.floor(dist / 2.1);
      const angle = Math.atan2(bx - ax, bz - az);
      const nx = -(bz - az) / Math.max(0.1, dist);
      const nz = (bx - ax) / Math.max(0.1, dist);
      for (let s = 0; s <= steps; s++) {
        const t = s / Math.max(1, steps);
        const cx = ax + (bx - ax) * t;
        const cz = az + (bz - az) * t;
        for (const side of [-0.85, 0.85]) {
          const pk = pathKeys[stepIdx++ % pathKeys.length];
          placeProp(
            pk,
            cx + nx * side,
            cz + nz * side,
            angle + (stepIdx % 2) * Math.PI * 0.5,
            1.1,
            0.01,
            true
          );
        }
      }
    };

    for (const poi of map.pois) {
      const p3 = this.to3D(poi.x, poi.y, map.width, map.height);
      layRoad(sp3.x, sp3.z, p3.x, p3.z);
    }
    layRoad(sp3.x, sp3.z, ar3.x, ar3.z);

    // 2. Campaign-Thematic Biome Dressing Around Player Spawn
    const sx = sp3.x;
    const sz = sp3.z;
    const isRunes = campaign.id === 'runes';
    const isAsh = campaign.id === 'ash';
    const isCloister = campaign.id === 'cloister';
    const isHourglasses = campaign.id === 'hourglasses';
    const isRift = campaign.id === 'rift' || campaign.id === 'infinite';

    const lanternColorHex = isRunes
      ? 0x80ffdb
      : isAsh
      ? 0xff5400
      : isCloister
      ? 0xffd166
      : isHourglasses
      ? 0x52b788
      : 0xc77dff;

    // Ambient light pools under spawn lanterns
    for (const [lx, lz] of [
      [sx - 3.2, sz - 0.2],
      [sx + 3.4, sz + 1.8],
      [sx - 1.6, sz + 2.2],
    ]) {
      const glow = new T.Mesh(
        this.unitPlane,
        new T.MeshBasicMaterial({
          map: fxTexture('glow'),
          color: lanternColorHex,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
          blending: T.AdditiveBlending,
        })
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(lx, 0.04, lz);
      glow.scale.setScalar(3.8);
      this.propsRoot.add(glow);
    }

    // Biome-specific props around lane
    if (isAsh) {
      // Forja do Sol Negro: charred fences, braziers, dead trees & crypts
      placeProp('fence_broken', sx - 2.6, sz - 1.2, 0.55, 1.15);
      placeProp('fence_broken', sx + 2.2, sz + 2.4, 0.55, 1.15);
      placeProp('candle_triple', sx - 3.2, sz - 0.2, 0.3, 1.35);
      placeProp('candle_triple', sx + 3.4, sz + 1.8, -0.8, 1.35);
      placeProp('candle_triple', sx - 1.6, sz + 2.2, 0, 1.45);
      placeProp('tree_dead_large', sx - 5.2, sz - 0.8, 0.4, 1.1);
      placeProp('crypt', sx - 4.5, sz - 1.6, 1.1, 0.48, 0, true);
      placeProp('barrel', sx + 4.4, sz - 2.2, 0.4, 4.2);
    } else if (isCloister) {
      // Mil Sinos dos Céus: pristine marble columns, celestial arches & golden lanterns
      placeProp('column', sx - 3.2, sz - 1.2, 0, 0.95, 0, true);
      placeProp('column', sx + 3.2, sz + 1.8, 0, 0.95, 0, true);
      placeProp('post_lantern', sx - 3.2, sz - 0.2, 0.3, 1.15);
      placeProp('post_lantern', sx + 3.4, sz + 1.8, -0.8, 1.15);
      placeProp('arch_gate', sx + 0.5, sz - 5.5, 0.2, 1.05, 0, true);
      placeProp('meadow-Birch_3', sx - 5.2, sz - 0.8, 0.4, 0.42);
      placeProp('meadow-Birch_3', sx + 4.5, sz + 2.6, 1.6, 0.38);
    } else if (isRunes) {
      // Cume de Nerath: frosty pillars, frosted pines, ice rune spires
      placeProp('pillar_decorated', sx - 3.2, sz - 1.2, 0, 1.15, 0, true);
      placeProp('pillar_decorated', sx + 3.2, sz + 1.8, 0, 1.15, 0, true);
      placeProp('post_lantern', sx - 3.2, sz - 0.2, 0.3, 1.15);
      placeProp('post_lantern', sx + 3.4, sz + 1.8, -0.8, 1.15);
      placeProp('arch', sx + 0.5, sz - 5.5, 0.2, 1.05, 0, true);
      placeProp('meadow-Pine_1', sx - 5.2, sz - 0.8, 0, 0.45);
      placeProp('meadow-Pine_1', sx - 4.5, sz - 1.6, 1.2, 0.38);
      placeProp('meadow-Fern_1', sx + 4.4, sz - 2.2, 0.4, 0.85);
    } else if (isHourglasses) {
      // Durmak: heavy iron barrels, crates, wheelbarrows & stone obelisks
      placeProp('fence', sx - 2.6, sz - 1.2, 0.55, 1.05);
      placeProp('pillar_decorated', sx + 2.2, sz + 2.4, 0, 1.1, 0, true);
      placeProp('post_lantern', sx - 3.2, sz - 0.2, 0.3, 1.15);
      placeProp('post_lantern', sx + 3.4, sz + 1.8, -0.8, 1.15);
      placeProp('barrel', sx + 4.4, sz - 2.2, 0.4, 4.2);
      placeProp('barrel', sx + 5.1, sz - 1.8, 1.2, 4.0);
      placeProp('crate_A_big', sx + 4.8, sz - 2.9, 0.2, 4.2);
      placeProp('wheelbarrow', sx + 3.4, sz - 2.6, 2.1, 4.5);
    } else {
      // Fenda Sem Estrelas (O Oco): dark void spires, crypts & purple beacons
      placeProp('tree_dead_large', sx - 5.2, sz - 0.8, 0.5, 1.25);
      placeProp('crypt', sx + 4.4, sz - 2.2, 0.4, 0.45, 0, true);
      placeProp('pillar_decorated', sx - 3.2, sz - 1.2, 0.4, 1.25, 0, true);
      placeProp('post_lantern', sx - 3.2, sz - 0.2, 0.3, 1.15);
      placeProp('post_lantern', sx + 3.4, sz + 1.8, -0.8, 1.15);
    }

    // Foliage perimeter tufts around spawn
    for (let i = 0; i < 48; i++) {
      const angle = i * 2.39996;
      const dist = 3.2 + (i % 7) * 2.2;
      const gx = sx + Math.cos(angle) * dist;
      const gz = sz + Math.sin(angle) * dist;
      const kind = isAsh
        ? 'fence_broken'
        : isRunes
        ? 'meadow-Fern_1'
        : isCloister
        ? 'meadow-Clover_1'
        : 'meadow-Grass_Common_Tall';
      if (!isAsh || i % 6 === 0) {
        placeProp(kind, gx, gz, i * 1.1, 0.65 + (i % 4) * 0.18);
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

    const accentProp = campaignId === 'ash' ? 'candle_triple' : seed % 2 === 0 ? 'meadow-Fern_1' : 'post_lantern';
    const accent = prop(this.assets, accentProp);
    if (accent.children.length > 0) {
      accent.position.set(radius3D * 0.75, 0, radius3D * 0.45);
      accent.scale.setScalar(accentProp === 'candle_triple' ? 1.1 : 0.75);
      g.add(accent);
    }

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
    if (campaign.id === 'runes') {
      choices = ['meadow-Pine_1', 'meadow-Rock_Large', 'post_lantern', 'meadow-Fern_1', 'pillar_decorated'];
      lanternHex = 0x80ffdb;
    } else if (campaign.id === 'ash') {
      choices = ['tree_dead_large', 'crypt', 'candle_triple', 'fence_broken', 'barrel'];
      lanternHex = 0xff5400;
    } else if (campaign.id === 'cloister') {
      choices = ['meadow-Birch_3', 'column', 'post_lantern', 'meadow-Clover_1', 'arch'];
      lanternHex = 0xffd166;
    } else if (campaign.id === 'hourglasses') {
      choices = ['barrel', 'crate_A_big', 'wheelbarrow', 'pillar_decorated', 'meadow-Rock_Large', 'post_lantern'];
      lanternHex = 0x52b788;
    } else {
      choices = ['tree_dead_large', 'crypt', 'pillar_decorated', 'arch_gate', 'post_lantern'];
      lanternHex = 0xc77dff;
    }

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

    inst.auraDisc.rotation.z = this.elapsedTime * 0.85;
    inst.subAuraDisc.rotation.z = -this.elapsedTime * 1.4;
    const subPulse =
      'chessCoordinationStacks' in p &&
      (p.chessCoordinationStacks >= 6 ||
        p.chaosInstability >= 50 ||
        p.chronoSequenceStacks >= 4)
        ? 3.8
        : 2.9;
    inst.subAuraDisc.scale.setScalar(subPulse + Math.sin(this.elapsedTime * 5) * 0.22);

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
        this.vfxRoot.add(grp);
        this.projectileMeshes.set(proj.id, grp);
      }

      const pos = this.to3D(proj.x, proj.y, mapW, mapH);
      grp.position.set(pos.x, 1.05, pos.z);
      const wakeMesh = grp.children[2] as T.Mesh;
      if (wakeMesh) {
        wakeMesh.rotation.z = -Math.atan2(proj.vx, proj.vy);
      }

      if (emitTrail) {
        const tex =
          proj.element === 'fire'
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
          r3d * 1.1,
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
    this.dressWorldHandle?.update(this.elapsedTime);

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

    if (state.coopPartner && !menuHeroShowcase) {
      this.allyHero = this.getOrCreateHero3D(this.allyHero, state.coopPartner.classId);
      this.allyHero.root.visible = true;
      this.updateHero3D(
        this.allyHero,
        state.coopPartner,
        state.map.width,
        state.map.height,
        safeDt,
        false
      );
    } else if (this.allyHero) {
      this.allyHero.root.visible = false;
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

    this.syncEnemies3D(state, safeDt);
    this.syncBoss3D(state, campaign, safeDt);
    this.syncProjectilesAndConstructs3D(state, safeDt);
    this.updateSoftParticles(safeDt);
    this.updateWeatherParticles(campaign, this.camTargetX, this.camTargetZ, safeDt);

    const p3d = this.playerHero.root.position;
    if (menuHeroShowcase) {
      // Close-up Hero Turntable Camera on the right side of the menu screen
      this.camTargetX = p3d.x - 1.35;
      this.camTargetZ = p3d.z;
      this.camera.position.set(p3d.x - 1.05, 2.35, p3d.z + 4.35);
      this.camera.lookAt(p3d.x - 1.25, 1.22, p3d.z);
    } else {
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
    }

    // Keep Directional Shadow Camera centered on the player
    this.dirLight.position.set(p3d.x - 14, 24, p3d.z + 14);
    this.dirLight.target.position.set(p3d.x, 0, p3d.z);

    this.playerLight.position.set(p3d.x, 3.2, p3d.z);
    this.playerLight.color.set(ARCANA_CLASSES[state.player.classId].palette.glow);

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

    if (state.coopPartner) {
      const aProj = this.projectToScreen(
        state.coopPartner.x,
        state.coopPartner.y,
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
          state.coopPartner.hp / Math.max(1, state.coopPartner.maxHp),
          '#4cc9f0',
          0,
          4
        );
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
