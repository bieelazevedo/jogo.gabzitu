// ============================================================================
// ASCENSÃO ARCANA — 2.5D Isometric/Tilted Canvas Render Engine
// ============================================================================
// Implements smooth camera tracking with boss zoom-out, layered biome floors,
// Y-sorted 2.5D painter's algorithm, high-contrast combat telegraphs, rune
// laser networks, projectiles, floating damage popups, and directional markers.
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

  // Ambient Parallax Motes & Dash Trail Ghosts
  private ambientParticles: AmbientParticle[] = [];
  private dashGhosts: DashGhost[] = [];
  private ghostSpawnTimer = 0;

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
    clearSpriteCache();
  }

  private initAmbientParticles(): void {
    const count = this.quality === 'economico' ? 22 : this.quality === 'equilibrado' ? 45 : 75;
    this.ambientParticles = [];
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        vx: (Math.random() - 0.5) * 18,
        vy: -10 - Math.random() * 22,
        size: 1.5 + Math.random() * 3,
        alpha: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
      });
    }
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

    // 1. Update Camera Position & Contextual Zoom
    this.updateCamera(state, safeDt);
    this.updateDashGhosts(state, safeDt);

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

    // 3. Render Modular 2.5D Biome Floor, Secret Shimmers & Boss Arena Ring
    this.renderBiomeFloor(ctx, state, campaign);

    // 4. Render Floor-Level Decorations & Class Ground Grids
    this.renderFloorDecorationsAndClassGrids(ctx, state);

    // 5. Render Combat Telegraphs (Always Crisp Above Floor, Below Characters)
    this.renderTelegraphs(ctx, state.telegraphs);

    // 6. Render Connected Rune Laser Network (Tecelão de Runas)
    this.renderRuneLaserNetwork(ctx, state);

    // 7. Y-Sorted 2.5D Painter's Algorithm Pass (Obstacles, POIs, Constructs, Loot, Entities)
    this.renderYSortedWorld(ctx, state);

    // 8. Render Active Projectiles & Beams Above Entities
    this.renderProjectiles(ctx, state.projectiles);

    // 9. Render Floating Combat Damage Numbers
    this.renderFloatingTexts(ctx, state);

    ctx.restore(); // End World Camera Transform

    // 10. Render Parallax Biome Motes, Atmospheric Vignette & Off-Screen Indicators
    this.renderAmbientParallax(ctx, campaign, safeDt);
    this.renderAtmosphericVignette(ctx, state, campaign);
    this.renderOffscreenIndicators(ctx, state);

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Camera & Dash Trail Updates
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
    if (p.dashTimer > 0 || p.animState === 'dash') {
      this.ghostSpawnTimer -= dt;
      if (this.ghostSpawnTimer <= 0) {
        this.ghostSpawnTimer = 0.035;
        this.dashGhosts.push({
          x: p.x,
          y: p.y,
          facingX: p.facingX,
          facingY: p.facingY,
          life: 0.24,
          maxLife: 0.24,
        });
      }
    }

    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].life -= dt;
      if (this.dashGhosts[i].life <= 0) {
        this.dashGhosts.splice(i, 1);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Biome Floor, Secret Zones & Boss Arena Perimeter
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

    // Base Sanctuary Platform Fill + 2.5D Outer Abyssal Ledge
    ctx.fillStyle = '#070510';
    ctx.fillRect(-16, -16, map.width + 32, map.height + 54);
    ctx.fillStyle = campaign.palette.floorPrimary;
    ctx.fillRect(0, 0, map.width, map.height);

    // Checkerboard / Isometric Modular Stone Slabs
    const tileSize = 96;
    ctx.lineWidth = 1;
    for (let ty = minY; ty < maxY; ty += tileSize) {
      for (let tx = minX; tx < maxX; tx += tileSize) {
        const ix = Math.floor(tx / tileSize);
        const iy = Math.floor(ty / tileSize);
        const isAlt = (ix + iy) % 2 === 0;
        ctx.fillStyle = isAlt ? campaign.palette.floorPrimary : campaign.palette.floorSecondary;
        ctx.fillRect(tx, ty, tileSize, tileSize);

        // Subtle stone bevel & carved circuit line on every 4th tile
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);

        if ((ix * 7 + iy * 13) % 11 === 0) {
          ctx.strokeStyle = campaign.palette.accentRunes;
          ctx.globalAlpha = 0.16 + 0.08 * Math.sin(this.elapsedTime * 2 + ix + iy);
          ctx.strokeRect(tx + 18, ty + 18, tileSize - 36, tileSize - 36);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Sanctuary Map Border Frame
    ctx.strokeStyle = campaign.palette.accentRunes;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, map.width, map.height);

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

    // Boss Arena Sacred Ring
    const arena = map.bossArenaCenter;
    ctx.save();
    ctx.translate(arena.x, arena.y);
    const isBossActive = state.phase === 'E_BOSS' || state.boss !== null;
    ctx.strokeStyle = isBossActive ? campaign.boss.palette.danger : campaign.palette.accentRunes;
    ctx.globalAlpha = isBossActive ? 0.68 : 0.24;
    ctx.lineWidth = isBossActive ? 5 : 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, arena.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner octagram seal at Boss Arena center
    ctx.globalAlpha = isBossActive ? 0.32 : 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, arena.radius * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderFloorDecorationsAndClassGrids(
    ctx: CanvasRenderingContext2D,
    state: ArcanaRunState
  ): void {
    const p = state.player;
    // Ground-level rune tiles & sand vortices
    for (const dec of state.map.decorations) {
      if (dec.kind === 'rune_tile' || dec.kind === 'sand_vortex' || dec.kind === 'void_fissure') {
        drawDecoration25D(ctx, dec, state.campaignId, this.elapsedTime);
      }
    }

    // Chess Mage Spectral Board Overlay when Coordination >= 6 or many pieces active
    if (p.classId === 'chess' && (p.chessCoordinationStacks >= 6 || state.constructs.length >= 3)) {
      ctx.save();
      const cell = 64;
      const gx0 = Math.floor((p.x - 256) / cell) * cell;
      const gy0 = Math.floor((p.y - 256) / cell) * cell;
      ctx.globalAlpha = p.chessCoordinationStacks >= 10 ? 0.24 : 0.12;
      for (let gy = gy0; gy < gy0 + 512; gy += cell) {
        for (let gx = gx0; gx < gx0 + 512; gx += cell) {
          const isGold = (Math.floor(gx / cell) + Math.floor(gy / cell)) % 2 === 0;
          ctx.fillStyle = isGold ? '#d4af37' : '#7de2ff';
          if (isGold) ctx.fillRect(gx, gy, cell, cell);
        }
      }
      ctx.restore();
    }

    // Pickup Radius subtle indicator ring around player
    ctx.save();
    ctx.strokeStyle = ARCANA_CLASSES[p.classId].palette.glow;
    ctx.globalAlpha = 0.09;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.computed.pickupRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Combat Readability: Ground Telegraphs & Rune Laser Connections
  // --------------------------------------------------------------------------

  private renderTelegraphs(ctx: CanvasRenderingContext2D, telegraphs: TelegraphZone[]): void {
    for (const t of telegraphs) {
      const progress = Math.max(0, Math.min(1, t.elapsed / Math.max(0.05, t.duration)));
      const isPlayer = t.owner === 'player';
      const borderColor = isPlayer ? '#7de2ff' : '#ff2a54';
      const fillColor = isPlayer ? 'rgba(125, 226, 255, 0.25)' : 'rgba(255, 42, 84, 0.28)';

      ctx.save();
      if (t.shape === 'circle' || t.shape === 'ring') {
        // Outer crisp danger border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Animated expanding inner fill indicating exact impact timing
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

  private renderRuneLaserNetwork(ctx: CanvasRenderingContext2D, state: ArcanaRunState): void {
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
          ctx.strokeStyle = '#80ffdb';
          ctx.lineWidth = 4;
          ctx.globalAlpha = 0.45 + 0.25 * Math.sin(this.elapsedTime * 10);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.9;
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

    // 1. Obstacles
    for (const obs of state.map.obstacles) {
      items.push({
        sortY: obs.y + obs.h * 0.5,
        draw: (c) => drawObstacle25D(c, obs, state.campaignId, this.elapsedTime),
      });
    }

    // 2. Vertical Decorations (trees, mirror arches, floating shards)
    for (const dec of state.map.decorations) {
      if (dec.kind !== 'rune_tile' && dec.kind !== 'sand_vortex' && dec.kind !== 'void_fissure') {
        items.push({
          sortY: dec.y,
          draw: (c) => drawDecoration25D(c, dec, state.campaignId, this.elapsedTime),
        });
      }
    }

    // 3. Interactive POI Shrines
    for (const poi of state.map.pois) {
      const dist = Math.hypot(p.x - poi.x, p.y - poi.y);
      items.push({
        sortY: poi.y,
        draw: (c) => drawPoiShrine25D(c, poi, this.elapsedTime, dist),
      });
    }

    // 4. Constructs & Summons
    for (const con of state.constructs) {
      items.push({
        sortY: con.kind.startsWith('rune_') || con.kind === 'chrono_dome' ? con.y - 40 : con.y,
        draw: (c) => drawConstructSprite(c, con, this.elapsedTime),
      });
    }

    // 5. XP Gems, Arcane Fragments, HP Orbs & Relic Chests
    for (const loot of state.loot) {
      items.push({
        sortY: loot.y,
        draw: (c) => this.drawLootItem(c, loot),
      });
    }

    // 6. Dash Afterimages
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

    // 7. Enemies
    for (const enemy of state.enemies) {
      items.push({
        sortY: enemy.y,
        draw: (c) => drawEnemySprite(c, enemy, this.elapsedTime),
      });
    }

    // 8. Coop Partner (if connected)
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

    // 9. Local Player
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

        // Shield Bubble / Iframe Shimmer
        if (p.shield > 0 || p.iframeTimer > 0) {
          c.save();
          c.strokeStyle = p.shield > 0 ? '#7de2ff' : '#ffffff';
          c.lineWidth = 2;
          c.globalAlpha = 0.65;
          c.beginPath();
          c.arc(p.x, p.y - 24, 30, 0, Math.PI * 2);
          c.stroke();
          c.restore();
        }
      },
    });

    // 10. Active Boss
    if (state.boss) {
      const boss = state.boss;
      items.push({
        sortY: boss.y,
        draw: (c) => drawBossSprite(c, boss, this.elapsedTime),
      });
    }

    // Sort ascending by sortY (back-to-front 2.5D depth)
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
      // XP Gems (small / medium / large)
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
  // Projectiles & Floating Combat Text
  // --------------------------------------------------------------------------

  private renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: ActiveProjectile[]): void {
    for (const proj of projectiles) {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      const ang = Math.atan2(proj.vy, proj.vx);

      // Luminous motion tail
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

      if (proj.kind === 'chrono_shard' || proj.kind === 'pawn_lance' || proj.kind === 'boss_lance') {
        // Crystalline clockhand / lance silhouette
        ctx.beginPath();
        ctx.moveTo(proj.radius * 1.6, 0);
        ctx.lineTo(-proj.radius, proj.radius * 0.7);
        ctx.lineTo(-proj.radius * 0.5, 0);
        ctx.lineTo(-proj.radius, -proj.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (proj.kind === 'rune_glyph' || proj.kind === 'chaos_prism') {
        // Rotating square/diamond glyph
        ctx.rotate(this.elapsedTime * 8);
        ctx.fillRect(-proj.radius, -proj.radius, proj.radius * 2, proj.radius * 2);
        ctx.strokeRect(-proj.radius, -proj.radius, proj.radius * 2, proj.radius * 2);
      } else {
        // Glowing Arcane Orb with white hot core
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius * 0.48, 0, Math.PI * 2);
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

    // Low HP Crimson Pulse Warning
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
      if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) return; // Already on screen

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
}
