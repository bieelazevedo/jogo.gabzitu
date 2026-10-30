// ============================================================================
// ASCENSÃO ARCANA — 2.5D Elemental Bending Render & VFX Engine (v3.0)
// ============================================================================
// Implements textured 16-bit pixel-art biome floors, Y-sorted 2.5D painter's
// algorithm, Elemental Bending VFX (Water Whips, Blood-Moon Tendrils, Air
// Scooters, Wind Blades, Blue-Fire Dragon Spirals, Forked Lightning Arcs,
// Combustion Shockwaves, Seismic Sense Sonar Waves, Molten Lava Fissures &
// Metalbending Cables), and Dynamic Additive Lighting.
// ============================================================================

import { ARCANA_CAMPAIGNS, ARCANA_CLASSES } from './data';
import {
  clearSpriteCache,
  drawBossSprite,
  drawClassSprite,
  drawConstructSprite,
  drawDecoration25D,
  drawEnemySprite,
  drawObstacle25D,
  drawPoiShrine25D,
  getBiomeTileCanvas,
} from './sprites';
import type {
  ActiveProjectile,
  ArcanaRunState,
  CampaignDef,
  QualityProfile,
  TelegraphZone,
  XpGemOrLoot,
} from './types';

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

interface DashGhost {
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  life: number;
  maxLife: number;
}

interface ElementalParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  coreColor: string;
  life: number;
  maxLife: number;
  gravity: number;
}

interface ElementalShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  lineWidth: number;
  life: number;
  maxLife: number;
  dashed?: boolean;
}

interface Renderable25D {
  sortY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export class ArcanaRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private quality: QualityProfile;
  private width = 1280;
  private height = 720;
  private dpr = 1;

  // Smooth Camera State
  private camX = 0;
  private camY = 0;
  private camZoom = 1;
  private camInitialized = false;
  private elapsedTime = 0;

  // Ambient Parallax Motes, Dash Ghosts & Elemental VFX Emitters
  private ambientParticles: AmbientParticle[] = [];
  private dashGhosts: DashGhost[] = [];
  private vfxParticles: ElementalParticle[] = [];
  private shockwaves: ElementalShockwave[] = [];
  private ghostSpawnTimer = 0;
  private sonarPulseTimer = 0;
  private lastKnownProjCount = 0;
  private lastKnownKills = 0;

  constructor(canvas: HTMLCanvasElement, quality: QualityProfile = 'equilibrado') {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('ArcanaRenderer: Unable to initialize 2D rendering context.');
    }
    this.ctx = context;
    this.quality = quality;
    this.initAmbientParticles();
    this.resize(canvas.clientWidth || 1280, canvas.clientHeight || 720);
  }

  public setQuality(quality: QualityProfile): void {
    this.quality = quality;
    this.initAmbientParticles();
    this.resize(this.width, this.height);
  }

  public resize(width: number, height: number): void {
    this.width = Math.max(320, width);
    this.height = Math.max(240, height);
    const maxDpr = this.quality === 'economico' ? 1 : this.quality === 'equilibrado' ? 1.5 : 2;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
  }

  public screenToWorld(
    screenX: number,
    screenY: number,
    state: ArcanaRunState
  ): { x: number; y: number } {
    const cx = this.camInitialized ? this.camX : state.player.x;
    const cy = this.camInitialized ? this.camY : state.player.y;
    const zoom = this.camZoom || 1;
    const wx = (screenX - this.width * 0.5) / zoom + cx;
    const wy = (screenY - this.height * 0.5) / zoom + cy;
    return { x: wx, y: wy };
  }

  public dispose(): void {
    this.ambientParticles = [];
    this.dashGhosts = [];
    this.vfxParticles = [];
    this.shockwaves = [];
    clearSpriteCache();
  }

  private initAmbientParticles(): void {
    const count = this.quality === 'economico' ? 25 : this.quality === 'equilibrado' ? 50 : 85;
    this.ambientParticles = [];
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        vx: (Math.random() - 0.5) * 22,
        vy: -12 - Math.random() * 24,
        size: 1.5 + Math.random() * 3.2,
        alpha: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnBurstParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    coreColor = '#ffffff',
    speed = 110,
    gravity = 0
  ): void {
    const maxAllowed = this.quality === 'economico' ? 90 : this.quality === 'equilibrado' ? 200 : 340;
    if (this.vfxParticles.length >= maxAllowed) return;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.85) * speed;
      const life = 0.22 + Math.random() * 0.34;
      this.vfxParticles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        z: 6 + Math.random() * 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 20 + Math.random() * 45,
        size: 2.2 + Math.random() * 3.8,
        color,
        coreColor,
        life,
        maxLife: life,
        gravity,
      });
    }
  }

  private spawnShockwave(
    x: number,
    y: number,
    maxRadius: number,
    color: string,
    duration = 0.42,
    lineWidth = 3,
    dashed = false
  ): void {
    if (this.shockwaves.length > 24) return;
    this.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius,
      color,
      lineWidth,
      life: duration,
      maxLife: duration,
      dashed,
    });
  }

  private getCampaignDef(state: ArcanaRunState): CampaignDef {
    return (
      ARCANA_CAMPAIGNS.find((c) => c.id === state.campaignId) ?? ARCANA_CAMPAIGNS[0]
    );
  }

  public render(state: ArcanaRunState, dt: number): void {
    const safeDt = Math.min(0.1, Math.max(0.001, dt));
    this.elapsedTime += safeDt;
    const campaign = this.getCampaignDef(state);
    const ctx = this.ctx;

    // 1. Update Camera, Dash Trail & Elemental VFX Emitters
    this.updateCamera(state, safeDt);
    this.updateDashGhosts(state, safeDt);
    this.updateElementalVfx(state, safeDt);

    // 2. Clear & Render Deep Abyssal Backdrop
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = campaign.palette.bgDeep;
    ctx.fillRect(0, 0, this.width, this.height);

    // Screen Shake Offset
    let shakeX = 0;
    let shakeY = 0;
    if (state.screenShake > 0.01) {
      const mag = Math.min(18, state.screenShake * 10);
      shakeX = (Math.random() - 0.5) * 2 * mag;
      shakeY = (Math.random() - 0.5) * 2 * mag;
    }

    // Apply World Camera Transform
    ctx.save();
    ctx.translate(this.width * 0.5 + shakeX, this.height * 0.5 + shakeY);
    ctx.scale(this.camZoom, this.camZoom);
    ctx.translate(-this.camX, -this.camY);

    // 3. Render Pixel-Art Biome Floor, Secret Shimmers & Boss Arena Ring
    this.renderBiomeFloor(ctx, state, campaign);

    // 4. Render Floor-Level Decorations & Elemental Bending Ground Effects
    this.renderFloorDecorationsAndElementalAuras(ctx, state);

    // 5. Render Expanding Elemental Shockwaves (Seismic Sonar, Sound Booms, Blood Moon)
    this.renderShockwaves(ctx);

    // 6. Render Combat Telegraphs (Crisp Above Floor, Below Characters)
    this.renderTelegraphs(ctx, state.telegraphs);

    // 7. Render Sub-Bending Network (Lava Fissures & Titanium Metal Cables for Terra)
    this.renderSubBendingConstructNetwork(ctx, state);

    // 8. Y-Sorted 2.5D Painter's Algorithm Pass (Obstacles, POIs, Constructs, Loot, Entities)
    this.renderYSortedWorld(ctx, state);

    // 9. Render Active Elemental Projectiles, Water Whips, Lightning Chains & Dragon Flames
    this.renderProjectiles(ctx, state);

    // 10. Render Elemental Burst Particles & Additive Dynamic Bloom Lighting
    this.renderVfxParticlesAndLighting(ctx, state);

    // 11. Render Floating Combat Damage Numbers
    this.renderFloatingTexts(ctx, state);

    ctx.restore(); // End World Camera Transform

    // 12. Render Parallax Biome Motes, Atmospheric Vignette, Off-Screen Indicators & Radar Minimap
    this.renderAmbientParallax(ctx, campaign, safeDt);
    this.renderAtmosphericVignette(ctx, state, campaign);
    this.renderOffscreenIndicators(ctx, state);
    this.renderMinimap(ctx, state, campaign);

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Camera, Dash Trail & Elemental VFX Updates
  // --------------------------------------------------------------------------

  private updateCamera(state: ArcanaRunState, dt: number): void {
    const p = state.player;
    const leadDist = 28;
    const targetX = p.x + p.facingX * leadDist + p.vx * 0.08;
    const targetY = p.y + p.facingY * leadDist + p.vy * 0.08;

    if (!this.camInitialized) {
      this.camX = targetX;
      this.camY = targetY;
      this.camInitialized = true;
    } else {
      const lerp = 1 - Math.exp(-8.5 * dt);
      this.camX += (targetX - this.camX) * lerp;
      this.camY += (targetY - this.camY) * lerp;
    }

    const desiredZoom = state.phase === 'E_BOSS' || state.boss !== null ? 0.86 : 1.0;
    this.camZoom += (desiredZoom - this.camZoom) * (1 - Math.exp(-4.0 * dt));
  }

  private updateDashGhosts(state: ArcanaRunState, dt: number): void {
    const p = state.player;
    const pal = ARCANA_CLASSES[p.classId].palette;
    if (p.dashTimer > 0 || p.animState === 'dash') {
      this.ghostSpawnTimer -= dt;
      if (this.ghostSpawnTimer <= 0) {
        this.ghostSpawnTimer = 0.035;
        this.dashGhosts.push({
          x: p.x,
          y: p.y,
          facingX: p.facingX,
          facingY: p.facingY,
          life: 0.26,
          maxLife: 0.26,
        });
        this.spawnBurstParticles(p.x, p.y, 3, pal.glow, '#ffffff', 75, 0);
      }
    }

    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].life -= dt;
      if (this.dashGhosts[i].life <= 0) {
        this.dashGhosts.splice(i, 1);
      }
    }
  }

  private updateElementalVfx(state: ArcanaRunState, dt: number): void {
    const p = state.player;
    const pal = ARCANA_CLASSES[p.classId].palette;

    // Periodic Elemental Pulse (Seismic Sense sonar for Earth, Lunar Tide for Water, etc.)
    this.sonarPulseTimer -= dt;
    if (this.sonarPulseTimer <= 0) {
      this.sonarPulseTimer = p.classId === 'rune' ? 1.15 : 1.65;
      if (p.classId === 'rune') {
        this.spawnShockwave(p.x, p.y, 190, '#ffd166', 0.65, 2.5, true);
      } else if (p.classId === 'chess' && p.chessCoordinationStacks >= 5) {
        this.spawnShockwave(p.x, p.y, 165, '#ff0054', 0.55, 2.5, false);
      } else if (p.classId === 'chrono' && p.chronoSequenceStacks >= 4) {
        this.spawnShockwave(p.x, p.y, 175, '#80ffdb', 0.5, 2.2, true);
      } else if (p.classId === 'chaos' && p.chaosInstability >= 50) {
        this.spawnShockwave(p.x, p.y, 170, '#00bbf9', 0.5, 2.8, false);
      }
    }

    // Detect newly fired projectiles for muzzle/bending bursts
    if (state.projectiles.length > this.lastKnownProjCount) {
      this.spawnBurstParticles(
        p.x + p.facingX * 22,
        p.y + p.facingY * 22,
        4,
        pal.primary,
        pal.glow,
        95
      );
    }
    this.lastKnownProjCount = state.projectiles.length;

    // Detect enemy kills for elemental shatter bursts
    if (state.kills > this.lastKnownKills) {
      this.spawnShockwave(p.x + p.facingX * 65, p.y + p.facingY * 65, 85, pal.glow, 0.32, 3);
      this.lastKnownKills = state.kills;
    }

    // Spawn continuous elemental trails from active projectiles
    for (const proj of state.projectiles) {
      if (Math.random() < (this.quality === 'economico' ? 0.25 : 0.55)) {
        const coreCol =
          proj.kind === 'chaos_orb' || proj.kind === 'chaos_prism'
            ? '#00bbf9'
            : proj.kind === 'rune_glyph'
            ? '#ffd166'
            : '#ffffff';
        this.spawnBurstParticles(proj.x, proj.y, 1, proj.color, coreCol, 45, 0);
      }
    }

    // Spawn particles on enemies taking hit flash
    for (const en of state.enemies) {
      if (en.hitFlashTimer > 0.08 && Math.random() < 0.45) {
        this.spawnBurstParticles(en.x, en.y - 12, 2, pal.glow, '#ffffff', 110, 80);
      }
    }

    // Update active particles
    for (let i = this.vfxParticles.length - 1; i >= 0; i--) {
      const pt = this.vfxParticles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.vfxParticles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vz -= pt.gravity * dt;
      pt.z = Math.max(0, pt.z + pt.vz * dt);
    }

    // Update expanding shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const pRatio = 1 - sw.life / sw.maxLife;
      sw.radius = 8 + (sw.maxRadius - 8) * (1 - Math.pow(1 - pRatio, 2));
    }
  }

  // --------------------------------------------------------------------------
  // Pixel-Art Biome Floor, Secret Zones & Boss Arena Perimeter
  // --------------------------------------------------------------------------

  private renderBiomeFloor(
    ctx: CanvasRenderingContext2D,
    state: ArcanaRunState,
    campaign: CampaignDef
  ): void {
    const map = state.map;
    const halfW = (this.width / this.camZoom) * 0.58;
    const halfH = (this.height / this.camZoom) * 0.58;

    const minX = Math.max(0, Math.floor((this.camX - halfW) / 96) * 96);
    const maxX = Math.min(map.width, Math.ceil((this.camX + halfW) / 96) * 96);
    const minY = Math.max(0, Math.floor((this.camY - halfH) / 96) * 96);
    const maxY = Math.min(map.height, Math.ceil((this.camY + halfH) / 96) * 96);

    ctx.fillStyle = '#070510';
    ctx.fillRect(-16, -16, map.width + 32, map.height + 54);
    ctx.fillStyle = campaign.palette.floorPrimary;
    ctx.fillRect(0, 0, map.width, map.height);

    // Draw 16-bit Pixel-Art Textured Biome Tiles
    const tileSize = 96;
    ctx.imageSmoothingEnabled = false;
    for (let ty = minY; ty < maxY; ty += tileSize) {
      for (let tx = minX; tx < maxX; tx += tileSize) {
        const ix = Math.floor(tx / tileSize);
        const iy = Math.floor(ty / tileSize);
        const variant = (ix * 3 + iy * 7) % 4;
        const tileCanvas = getBiomeTileCanvas(state.campaignId, variant);
        ctx.drawImage(tileCanvas, tx, ty, tileSize, tileSize);
      }
    }

    // Sanctuary Map Border Frame
    ctx.strokeStyle = campaign.palette.accentRunes;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, map.width, map.height);

    // Biome Elemental River / Chasm & Paved Temple Pathways (eliminates flat empty maps!)
    const arena = map.bossArenaCenter;
    ctx.save();
    const riverColor =
      state.campaignId === 'runes'
        ? 'rgba(0, 187, 249, 0.24)'
        : state.campaignId === 'ash'
        ? 'rgba(255, 84, 0, 0.28)'
        : state.campaignId === 'cloister'
        ? 'rgba(128, 255, 219, 0.2)'
        : state.campaignId === 'hourglasses'
        ? 'rgba(82, 183, 136, 0.22)'
        : 'rgba(199, 125, 255, 0.24)';
    const riverCore =
      state.campaignId === 'runes'
        ? '#90e0ef'
        : state.campaignId === 'ash'
        ? '#ffd166'
        : state.campaignId === 'cloister'
        ? '#ffffff'
        : state.campaignId === 'hourglasses'
        ? '#80ffdb'
        : '#ff99c8';

    // Winding Elemental Canal across the biome
    ctx.strokeStyle = riverColor;
    ctx.lineWidth = 64;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(80, map.height * 0.22);
    ctx.bezierCurveTo(
      map.width * 0.35,
      map.height * 0.12,
      map.width * 0.65,
      map.height * 0.88,
      map.width - 80,
      map.height * 0.78
    );
    ctx.stroke();

    ctx.strokeStyle = riverCore;
    ctx.globalAlpha = 0.22 + 0.08 * Math.sin(this.elapsedTime * 3);
    ctx.lineWidth = 14;
    ctx.setLineDash([24, 18]);
    ctx.lineDashOffset = -this.elapsedTime * 28;
    ctx.stroke();
    ctx.setLineDash([]);

    // Paved Sacred Pathways connecting Spawn -> Shrines -> Boss Arena
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = campaign.palette.floorSecondary;
    ctx.lineWidth = 42;
    for (const poi of map.pois) {
      ctx.beginPath();
      ctx.moveTo(map.spawnX, map.spawnY);
      ctx.lineTo(poi.x, poi.y);
      ctx.lineTo(arena.x, arena.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = campaign.palette.accentRunes;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    for (const poi of map.pois) {
      ctx.beginPath();
      ctx.moveTo(map.spawnX, map.spawnY);
      ctx.lineTo(poi.x, poi.y);
      ctx.lineTo(arena.x, arena.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Secret Areas Shimmer
    for (const secret of map.secretAreas) {
      const pulse = 0.45 + 0.35 * Math.sin(this.elapsedTime * 3.5 + secret.x);
      ctx.save();
      ctx.translate(secret.x, secret.y);
      ctx.strokeStyle = secret.discovered ? '#52b788' : '#ffd166';
      ctx.globalAlpha = secret.discovered ? 0.25 : 0.45 * pulse;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, secret.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Boss Arena Sacred Ring & Temple Plaza Floor
    ctx.save();
    ctx.translate(arena.x, arena.y);
    const isBossActive = state.phase === 'E_BOSS' || state.boss !== null;
    ctx.fillStyle = isBossActive ? 'rgba(48, 10, 28, 0.32)' : 'rgba(20, 14, 42, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, arena.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isBossActive ? campaign.boss.palette.danger : campaign.palette.accentRunes;
    ctx.globalAlpha = isBossActive ? 0.72 : 0.32;
    ctx.lineWidth = isBossActive ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, arena.radius, 0, Math.PI * 2);
    ctx.stroke();

    // 8 Cardinal Elemental Compass Lines inside Boss Plaza
    ctx.globalAlpha = isBossActive ? 0.35 : 0.18;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (arena.radius * 0.35), Math.sin(a) * (arena.radius * 0.35));
      ctx.lineTo(Math.cos(a) * arena.radius, Math.sin(a) * arena.radius);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, arena.radius * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderFloorDecorationsAndElementalAuras(
    ctx: CanvasRenderingContext2D,
    state: ArcanaRunState
  ): void {
    const p = state.player;
    for (const dec of state.map.decorations) {
      if (dec.kind === 'rune_tile' || dec.kind === 'sand_vortex' || dec.kind === 'void_fissure') {
        drawDecoration25D(ctx, dec, state.campaignId, this.elapsedTime);
      }
    }

    // 1. ÁGUA (`chess`): Swirling Ocean Tide & Crimson Blood-Moon Ritual Ring
    if (p.classId === 'chess') {
      const isBloodMoon = p.chessCoordinationStacks >= 6;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = isBloodMoon ? '#ff0054' : '#00bbf9';
      ctx.lineWidth = isBloodMoon ? 3 : 2;
      ctx.globalAlpha = isBloodMoon ? 0.42 : 0.24;
      for (let r = 1; r <= 2; r++) {
        const rad = 52 * r + Math.sin(this.elapsedTime * 4 + r) * 6;
        ctx.beginPath();
        ctx.arc(0, 0, rad, this.elapsedTime * (r % 2 === 0 ? -2 : 2), this.elapsedTime * 2 + Math.PI * 1.4);
        ctx.stroke();
      }
      // Bloodbending crimson tendrils linking player to nearby enemies during Full Moon
      if (isBloodMoon) {
        for (const en of state.enemies) {
          const d = Math.hypot(en.x - p.x, en.y - p.y);
          if (d < 240) {
            ctx.strokeStyle = '#ff0054';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(0, -14);
            const mx = (en.x - p.x) * 0.5 + Math.sin(this.elapsedTime * 8 + en.x) * 18;
            const my = (en.y - p.y) * 0.5 + Math.cos(this.elapsedTime * 8 + en.y) * 18;
            ctx.quadraticCurveTo(mx, my, en.x - p.x, en.y - p.y - 12);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 2. AR (`chrono`): Spinning Air Scooter Vortex & Supersonic Currents
    if (p.classId === 'chrono' && (Math.hypot(p.vx, p.vy) > 25 || p.dashTimer > 0)) {
      ctx.save();
      ctx.translate(p.x, p.y + 6);
      ctx.strokeStyle = '#80ffdb';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.65;
      for (let i = 0; i < 3; i++) {
        const r = 16 + i * 8;
        const a = this.elapsedTime * 12 + i * 2;
        ctx.beginPath();
        ctx.ellipse(0, -i * 4, r, r * 0.48, 0, a, a + Math.PI * 1.3);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. FOGO (`chaos`): Blazing Sozin Comet Ring & Electric Lightning Sparks
    if (p.classId === 'chaos' && p.chaosInstability >= 25) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const isBlueFlame = p.chaosInstability >= 65;
      ctx.strokeStyle = isBlueFlame ? '#00bbf9' : '#ff5400';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.48;
      ctx.beginPath();
      ctx.arc(0, 0, 58 + Math.sin(this.elapsedTime * 10) * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. TERRA (`rune`): Toph's Golden Seismic Sense Grid & Orbiting Metal Plates
    if (p.classId === 'rune') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.26;
      const sonarR = ((this.elapsedTime * 110) % 220);
      ctx.beginPath();
      ctx.arc(0, 0, sonarR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderShockwaves(ctx: CanvasRenderingContext2D): void {
    for (const sw of this.shockwaves) {
      const alpha = Math.max(0, sw.life / sw.maxLife);
      ctx.save();
      ctx.translate(sw.x, sw.y);
      ctx.scale(1, 0.62); // 2.5D isometric perspective foreshortening
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = alpha * 0.78;
      ctx.lineWidth = sw.lineWidth;
      if (sw.dashed) ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // Combat Readability: Ground Telegraphs & Sub-Bending Construct Networks
  // --------------------------------------------------------------------------

  private renderTelegraphs(ctx: CanvasRenderingContext2D, telegraphs: TelegraphZone[]): void {
    for (const t of telegraphs) {
      const progress = Math.max(0, Math.min(1, t.elapsed / Math.max(0.05, t.duration)));
      const isPlayer = t.owner === 'player';
      const borderColor = isPlayer ? '#7de2ff' : '#ff2a54';
      const fillColor = isPlayer ? 'rgba(125, 226, 255, 0.25)' : 'rgba(255, 42, 84, 0.28)';

      ctx.save();
      if (t.shape === 'circle' || t.shape === 'ring') {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * progress, 0, Math.PI * 2);
        ctx.fill();

        if (t.shape === 'ring') {
          ctx.strokeStyle = '#ffbe0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.radius * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (t.shape === 'line') {
        const tx = t.targetX ?? t.x + Math.cos(t.angle ?? 0) * t.radius;
        const ty = t.targetY ?? t.y + Math.sin(t.angle ?? 0) * t.radius;
        const w = t.width ?? 36;
        const dx = tx - t.x;
        const dy = ty - t.y;
        const len = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx);

        ctx.translate(t.x, t.y);
        ctx.rotate(ang);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -w * 0.5, len, w);

        ctx.fillStyle = fillColor;
        ctx.fillRect(0, -w * 0.5, len * progress, w);
      } else if (t.shape === 'cone') {
        const ang = t.angle ?? 0;
        const spread = 0.55;
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.arc(t.x, t.y, t.radius, ang - spread, ang + spread);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.arc(t.x, t.y, t.radius * progress, ang - spread, ang + spread);
        ctx.closePath();
        ctx.fill();
      }

      if (t.label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.label, t.x, t.y - t.radius - 8);
      }
      ctx.restore();
    }
  }

  private renderSubBendingConstructNetwork(ctx: CanvasRenderingContext2D, state: ArcanaRunState): void {
    const runes = state.constructs.filter(
      (c) => c.kind.startsWith('rune_circle') || c.kind === 'rune_great_inscription'
    );
    if (runes.length < 2) return;

    ctx.save();
    for (let i = 0; i < runes.length; i++) {
      for (let j = i + 1; j < runes.length; j++) {
        const a = runes[i];
        const b = runes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist <= 380) {
          // Molten Lava Fissure + Whipping Titanium Metal Cable between Earth Monoliths
          ctx.strokeStyle = '#ff5400';
          ctx.lineWidth = 7;
          ctx.globalAlpha = 0.45 + 0.25 * Math.sin(this.elapsedTime * 8);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          ctx.strokeStyle = '#ffbe0b';
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.92;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Y-Sorted 2.5D Painter's Algorithm
  // --------------------------------------------------------------------------

  private renderYSortedWorld(ctx: CanvasRenderingContext2D, state: ArcanaRunState): void {
    const items: Renderable25D[] = [];
    const p = state.player;

    for (const obs of state.map.obstacles) {
      items.push({
        sortY: obs.y + obs.h * 0.5,
        draw: (c) => drawObstacle25D(c, obs, state.campaignId, this.elapsedTime),
      });
    }

    for (const dec of state.map.decorations) {
      if (dec.kind !== 'rune_tile' && dec.kind !== 'sand_vortex' && dec.kind !== 'void_fissure') {
        items.push({
          sortY: dec.y,
          draw: (c) => drawDecoration25D(c, dec, state.campaignId, this.elapsedTime),
        });
      }
    }

    for (const poi of state.map.pois) {
      const dist = Math.hypot(p.x - poi.x, p.y - poi.y);
      items.push({
        sortY: poi.y,
        draw: (c) => drawPoiShrine25D(c, poi, this.elapsedTime, dist),
      });
    }

    for (const con of state.constructs) {
      items.push({
        sortY: con.kind.startsWith('rune_') || con.kind === 'chrono_dome' ? con.y - 40 : con.y,
        draw: (c) => drawConstructSprite(c, con, this.elapsedTime),
      });
    }

    for (const loot of state.loot) {
      items.push({
        sortY: loot.y,
        draw: (c) => this.drawLootItem(c, loot),
      });
    }

    for (const ghost of this.dashGhosts) {
      items.push({
        sortY: ghost.y - 1,
        draw: (c) =>
          drawClassSprite(c, p.classId, ghost.x, ghost.y, {
            animState: 'dash',
            animTime: this.elapsedTime,
            facingX: ghost.facingX,
            facingY: ghost.facingY,
            hitFlash: false,
            alpha: (ghost.life / ghost.maxLife) * 0.48,
            isDashGhost: true,
          }),
      });
    }

    for (const enemy of state.enemies) {
      items.push({
        sortY: enemy.y,
        draw: (c) => drawEnemySprite(c, enemy, this.elapsedTime),
      });
    }

    if (state.coopPartner && state.coopPartner.connected) {
      const partner = state.coopPartner;
      items.push({
        sortY: partner.y,
        draw: (c) => {
          drawClassSprite(c, partner.classId, partner.x, partner.y, {
            animState: partner.downed ? 'defeat' : partner.animState,
            animTime: this.elapsedTime,
            facingX: partner.facingX,
            facingY: partner.facingY,
            hitFlash: false,
            alpha: partner.downed ? 0.6 : 0.95,
          });
          c.save();
          c.fillStyle = '#7de2ff';
          c.font = 'bold 11px system-ui, sans-serif';
          c.textAlign = 'center';
          c.fillText(partner.name, partner.x, partner.y - 68);
          c.restore();
        },
      });
    }

    items.push({
      sortY: p.y,
      draw: (c) => {
        drawClassSprite(c, p.classId, p.x, p.y, {
          animState: p.animState,
          animTime: p.animTime,
          facingX: p.facingX,
          facingY: p.facingY,
          hitFlash: p.hitFlashTimer > 0,
        });

        if (p.shield > 0 || p.iframeTimer > 0) {
          c.save();
          c.strokeStyle = p.shield > 0 ? '#00bbf9' : '#ffffff';
          c.lineWidth = 2.5;
          c.globalAlpha = 0.72;
          c.beginPath();
          c.arc(p.x, p.y - 24, 32, 0, Math.PI * 2);
          c.stroke();
          c.restore();
        }
      },
    });

    if (state.boss) {
      const boss = state.boss;
      items.push({
        sortY: boss.y,
        draw: (c) => drawBossSprite(c, boss, this.elapsedTime),
      });
    }

    items.sort((a, b) => a.sortY - b.sortY);
    for (let i = 0; i < items.length; i++) {
      items[i].draw(ctx);
    }
  }

  private drawLootItem(ctx: CanvasRenderingContext2D, loot: XpGemOrLoot): void {
    ctx.save();
    const bob = Math.sin(this.elapsedTime * 5 + loot.x * 0.1) * 3;
    ctx.translate(loot.x, loot.y + bob);

    if (loot.kind === 'relic_chest') {
      ctx.fillStyle = '#5c3a21';
      ctx.strokeStyle = '#ffbe0b';
      ctx.lineWidth = 2;
      ctx.fillRect(-12, -10, 24, 18);
      ctx.strokeRect(-12, -10, 24, 18);
      ctx.fillStyle = '#ffbe0b';
      ctx.fillRect(-4, -3, 8, 6);
    } else if (loot.kind === 'hp_orb') {
      ctx.fillStyle = '#ff4d6d';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (loot.kind === 'arcane_fragment') {
      ctx.fillStyle = '#c77dff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, -3);
      ctx.lineTo(0, 4);
      ctx.lineTo(-7, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const r = loot.kind === 'xp_large' ? 7.5 : loot.kind === 'xp_medium' ? 5.8 : 4.2;
      ctx.fillStyle =
        loot.kind === 'xp_large'
          ? '#ffbe0b'
          : loot.kind === 'xp_medium'
          ? '#00f5d4'
          : '#7de2ff';
      ctx.strokeStyle = '#090612';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -r - 2);
      ctx.lineTo(r, -2);
      ctx.lineTo(0, r - 2);
      ctx.lineTo(-r, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Elemental Bending Projectiles (Water Whips, Wind Blades, Blue-Fire Dragons,
  // Lightning Arcs & Tectonic Boulders)
  // --------------------------------------------------------------------------

  private renderProjectiles(ctx: CanvasRenderingContext2D, state: ArcanaRunState): void {
    const projectiles = state.projectiles;
    for (const proj of projectiles) {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      const ang = Math.atan2(proj.vy, proj.vx);

      if (proj.kind === 'pawn_lance') {
        // ÁGUA: Flowing Sine-Wave Water Whip + Crystalline Ice Tip
        ctx.rotate(ang);
        ctx.strokeStyle = '#00bbf9';
        ctx.lineWidth = proj.radius * 1.15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let s = 0; s <= 6; s++) {
          const lx = -s * 7.5;
          const ly = Math.sin(this.elapsedTime * 18 + s * 0.9 + proj.x * 0.05) * (s * 1.25);
          if (s === 0) ctx.moveTo(proj.radius, 0);
          else ctx.lineTo(lx, ly);
        }
        ctx.stroke();

        // Inner white foam highlight
        ctx.strokeStyle = '#caf0f8';
        ctx.lineWidth = proj.radius * 0.45;
        ctx.stroke();

        // Crystalline Glacial Ice Spearhead
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(proj.radius * 1.8, 0);
        ctx.lineTo(0, proj.radius * 0.75);
        ctx.lineTo(0, -proj.radius * 0.75);
        ctx.closePath();
        ctx.fill();
      } else if (proj.kind === 'chrono_shard') {
        // AR: Spinning Crescent Wind Blade & Supersonic Wake
        ctx.rotate(ang);
        for (let w = 0; w < 2; w++) {
          const offset = w * 8;
          ctx.strokeStyle = w === 0 ? '#ffffff' : '#80ffdb';
          ctx.lineWidth = w === 0 ? 3.5 : 2;
          ctx.beginPath();
          ctx.arc(-offset, 0, proj.radius * 1.45, -Math.PI * 0.42, Math.PI * 0.42);
          ctx.stroke();
        }
      } else if (proj.kind === 'chaos_orb' || proj.kind === 'chaos_prism') {
        // FOGO: Swirling Orange + Azure Blue Dragon Fireball & Forked Lightning Arcs
        ctx.rotate(ang);
        // Dragon Fire Tail
        ctx.strokeStyle = '#ff5400';
        ctx.lineWidth = proj.radius * 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-proj.radius * 3.2, Math.sin(this.elapsedTime * 22) * 5);
        ctx.stroke();

        // Outer Solar Fire Core
        ctx.fillStyle = '#ff5400';
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Inner Azula Blue Flame Core
        ctx.fillStyle = '#00bbf9';
        ctx.beginPath();
        ctx.arc(proj.radius * 0.2, 0, proj.radius * 0.78, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(proj.radius * 0.3, 0, proj.radius * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Jagged Electric Lightning Arcs around Fire/Lightning projectile
        ctx.strokeStyle = '#7df9ff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(proj.radius, 0);
        ctx.lineTo(0, (Math.random() - 0.5) * proj.radius * 2.6);
        ctx.lineTo(-proj.radius * 1.8, (Math.random() - 0.5) * proj.radius * 2.2);
        ctx.stroke();
      } else if (proj.kind === 'rune_glyph') {
        // TERRA: Rotating Jagged Boulder / Zaofu Metal Disc with Molten Lava Cracks
        ctx.rotate(this.elapsedTime * 9 + proj.x * 0.02);
        const r = proj.radius * 1.35;
        ctx.fillStyle = '#5c4b33';
        ctx.strokeStyle = '#080510';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const rad = r * (i % 2 === 0 ? 1.05 : 0.82);
          if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
          else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing Emerald Crystal / Molten Magma Core
        ctx.fillStyle = '#52b788';
        ctx.fillRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7);
      } else {
        // Enemy / Boss Projectiles
        ctx.strokeStyle = proj.color;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = Math.max(2, proj.radius * 0.85);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-proj.vx * 0.045, -proj.vy * 0.045);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.rotate(ang);
        ctx.fillStyle = proj.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderVfxParticlesAndLighting(
    ctx: CanvasRenderingContext2D,
    state: ArcanaRunState
  ): void {
    // 1. Render Elemental Burst Particles
    for (const pt of this.vfxParticles) {
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - pt.z, pt.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pt.coreColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - pt.z, pt.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Dynamic Additive Bloom Lighting Pass
    if (this.quality !== 'economico') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const p = state.player;
      const pal = ARCANA_CLASSES[p.classId].palette;

      // Player Elemental Aura Glow
      const pGrad = ctx.createRadialGradient(p.x, p.y - 16, 4, p.x, p.y - 16, 85);
      pGrad.addColorStop(0, `${pal.glow}44`);
      pGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 16, 85, 0, Math.PI * 2);
      ctx.fill();

      // Projectile Additive Glows
      for (const proj of state.projectiles) {
        ctx.fillStyle = proj.color;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D, state: ArcanaRunState): void {
    for (const ft of state.floatingTexts) {
      const alpha = Math.max(0, Math.min(1, ft.life / Math.max(0.1, ft.maxLife)));
      ctx.save();
      ctx.globalAlpha = alpha;
      const fontSize = Math.round((ft.isCrit ? 19 : 14) * ft.scale);
      ctx.font = `bold ${fontSize}px "Cinzel", system-ui, sans-serif`;
      ctx.textAlign = 'center';

      const sx = ft.x;
      const sy = ft.y - ft.z;

      ctx.strokeStyle = '#080512';
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, sx, sy);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, sx, sy);
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // Screen-Space Parallax Motes, Atmospheric Vignette & Directional Pointers
  // --------------------------------------------------------------------------

  private renderAmbientParallax(
    ctx: CanvasRenderingContext2D,
    campaign: CampaignDef,
    dt: number
  ): void {
    ctx.save();
    ctx.fillStyle = campaign.palette.ambientLight;
    for (const p of this.ambientParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const sx =
        (((p.x - this.camX * 0.35) % this.width) + this.width) % this.width;
      const sy =
        (((p.y - this.camY * 0.35) % this.height) + this.height) % this.height;
      const pulse = 0.5 + 0.5 * Math.sin(this.elapsedTime * 2.5 + p.phase);
      ctx.globalAlpha = p.alpha * pulse;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderAtmosphericVignette(
    ctx: CanvasRenderingContext2D,
    state: ArcanaRunState,
    campaign: CampaignDef
  ): void {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const outerRadius = Math.hypot(cx, cy);
    const grad = ctx.createRadialGradient(cx, cy, outerRadius * 0.42, cx, cy, outerRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.75, campaign.palette.fogColor);
    grad.addColorStop(1, 'rgba(4, 2, 12, 0.78)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    const hpRatio = state.player.hp / Math.max(1, state.player.maxHp);
    if (hpRatio < 0.3) {
      const dangerAlpha = (0.3 - hpRatio) * (0.65 + 0.35 * Math.sin(this.elapsedTime * 7));
      ctx.strokeStyle = `rgba(255, 32, 78, ${dangerAlpha})`;
      ctx.lineWidth = 18;
      ctx.strokeRect(0, 0, this.width, this.height);
    }
  }

  private renderOffscreenIndicators(ctx: CanvasRenderingContext2D, state: ArcanaRunState): void {
    const margin = 44;
    const halfW = this.width * 0.5 - margin;
    const halfH = this.height * 0.5 - margin;

    const drawPointer = (wx: number, wy: number, color: string, label: string) => {
      const dx = (wx - this.camX) * this.camZoom;
      const dy = (wy - this.camY) * this.camZoom;
      if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) return;

      const ang = Math.atan2(dy, dx);
      const px = this.width * 0.5 + Math.cos(ang) * Math.min(halfW, halfH * 1.35);
      const py = this.height * 0.5 + Math.sin(ang) * Math.min(halfH, halfW * 0.85);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillStyle = color;
      ctx.strokeStyle = '#090612';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, 7);
      ctx.lineTo(-8, -7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = color;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, py + 18);
      ctx.restore();
    };

    if (state.boss) {
      drawPointer(state.boss.x, state.boss.y, '#ff2a54', 'BOSS');
    } else {
      for (const poi of state.map.pois) {
        if (!poi.used) {
          drawPointer(poi.x, poi.y, '#ffd166', 'ALTAR');
        }
      }
    }
  }

  private renderMinimap(
    ctx: CanvasRenderingContext2D,
    state: ArcanaRunState,
    campaign: CampaignDef
  ): void {
    if (this.width < 520) return;
    const map = state.map;
    const mw = 132;
    const mh = Math.round(mw * (map.height / Math.max(1, map.width)));
    const mx = this.width - mw - 16;
    const my = 56;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 5, 20, 0.82)';
    ctx.strokeStyle = campaign.palette.accentRunes;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 10);
    ctx.fill();
    ctx.stroke();

    const sx = mw / map.width;
    const sy = mh / map.height;

    // Boss Arena Ring on Minimap
    const ax = mx + map.bossArenaCenter.x * sx;
    const ay = my + map.bossArenaCenter.y * sy;
    ctx.strokeStyle = state.boss ? '#ff2a54' : 'rgba(255, 209, 102, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ax, ay, map.bossArenaCenter.radius * sx, 0, Math.PI * 2);
    ctx.stroke();

    // POIs (Shrines) on Minimap
    for (const poi of map.pois) {
      if (poi.used) continue;
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(mx + poi.x * sx - 2.5, my + poi.y * sy - 2.5, 5, 5);
    }

    // Enemies on Minimap
    for (const en of state.enemies) {
      ctx.fillStyle = en.isElite ? '#ffbe0b' : '#ff4d6d';
      const r = en.isElite ? 2.5 : 1.6;
      ctx.beginPath();
      ctx.arc(mx + en.x * sx, my + en.y * sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boss Dot on Minimap
    if (state.boss) {
      ctx.fillStyle = '#ff0054';
      ctx.beginPath();
      ctx.arc(mx + state.boss.x * sx, my + state.boss.y * sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Dot on Minimap
    const px = mx + state.player.x * sx;
    const py = my + state.player.y * sy;
    ctx.fillStyle = '#00f5d4';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cfc4e8';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`MAPA · ${campaign.roman}`, mx + 6, my + mh - 5);
    ctx.restore();
  }
}
