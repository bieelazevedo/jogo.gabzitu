// ============================================================================
// ASCENSÃO ARCANA — 2-Player Co-op Session (BroadcastChannel + AI Companion)
// Implements GDD Section 12 (Multiplayer Cooperativo de 2 Jogadores)
// ============================================================================

import { ARCANA_CLASSES } from './data';
import type {
  ActiveProjectile,
  ArcanaClassId,
  ArcanaRunState,
  CoopPartnerState,
  EntityAnimState,
  PlayerRuntimeState,
} from './types';

export const COOP_REVIVE_DURATION_SEC = 2.5;
export const COOP_REVIVE_RADIUS = 95;

interface CoopWireMessage {
  type: 'HANDSHAKE_SYN' | 'HANDSHAKE_ACK' | 'STATE_UPDATE' | 'REVIVE_COMPLETE' | 'LEAVE';
  roomCode: string;
  senderId: string;
  senderName: string;
  classId: ArcanaClassId;
  payload?: {
    x: number;
    y: number;
    facingX: number;
    facingY: number;
    hp: number;
    maxHp: number;
    animState: EntityAnimState;
    downed: boolean;
    reviveProgress: number;
  };
}

const AI_COMPANION_NAMES: Record<ArcanaClassId, string> = {
  chess: 'Kaelen (Grão-Mestre)',
  chrono: 'Lyra (Vigia do Tempo)',
  chaos: 'Nyx (Dama do Acaso)',
  rune: 'Theron (Calígrafo)',
};

function pickCompanionClass(playerClass: ArcanaClassId): ArcanaClassId {
  const order: ArcanaClassId[] = ['chess', 'chrono', 'chaos', 'rune'];
  const idx = order.indexOf(playerClass);
  return order[(idx + 1) % order.length];
}

export class ArcanaCoopSession {
  public roomCode: string | null = null;
  public role: 'host' | 'guest' | 'none' = 'none';
  public isActive = false;
  public isAiCompanion = false;
  public localPeerId: string;
  public localName = 'Arcanista';
  public localClassId: ArcanaClassId = 'chess';

  private channel: BroadcastChannel | null = null;
  private partner: CoopPartnerState | null = null;
  private lastRemotePacketMs = 0;
  private aiAttackCooldown = 0;
  private aiOrbitAngle = 0;
  private onPartnerChangedCallback: ((partner: CoopPartnerState | null) => void) | null = null;

  constructor() {
    this.localPeerId = `peer_${Math.random().toString(36).slice(2, 9)}`;
  }

  public onPartnerUpdate(cb: (partner: CoopPartnerState | null) => void): void {
    this.onPartnerChangedCallback = cb;
  }

  public getPartnerState(): CoopPartnerState | null {
    return this.partner;
  }

  /**
   * Creates a 2-player Co-op Room and returns a 6-character code like `ARC-742`.
   */
  public createRoom(hostName: string, classId: ArcanaClassId): string {
    this.disconnect();

    const digits = Math.floor(100 + Math.random() * 900);
    const code = `ARC-${digits}`;

    this.roomCode = code;
    this.role = 'host';
    this.isActive = true;
    this.isAiCompanion = true; // Starts with Arcane Companion ready until a real tab/peer joins
    this.localName = hostName.trim() || 'Anfitrião Arcano';
    this.localClassId = classId;

    const companionClass = pickCompanionClass(classId);
    const classDef = ARCANA_CLASSES[companionClass];

    this.partner = {
      connected: true,
      peerId: 'arcane_companion_ai',
      name: AI_COMPANION_NAMES[companionClass],
      classId: companionClass,
      x: 0,
      y: 0,
      facingX: 1,
      facingY: 0,
      hp: classDef.baseStats.maxHp,
      maxHp: classDef.baseStats.maxHp,
      animState: 'idle',
      downed: false,
      reviveProgress: 0,
    };

    this.openBroadcastChannel(code);
    this.notifyPartnerChanged();
    return code;
  }

  /**
   * Joins an existing room by code (e.g. `ARC-742`).
   * Works across browser tabs via BroadcastChannel and falls back to paired Arcane Companion if solo.
   */
  public joinRoom(roomCode: string, guestName: string, classId: ArcanaClassId): boolean {
    const cleaned = roomCode.trim().toUpperCase();
    if (!cleaned) return false;

    const normalizedCode = cleaned.startsWith('ARC-')
      ? cleaned
      : /^\d{3}$/.test(cleaned)
      ? `ARC-${cleaned}`
      : cleaned.slice(0, 7);

    this.disconnect();

    this.roomCode = normalizedCode;
    this.role = 'guest';
    this.isActive = true;
    this.isAiCompanion = true; // Automatically switches to false when live host answers
    this.localName = guestName.trim() || 'Convidado Arcano';
    this.localClassId = classId;

    const companionClass = pickCompanionClass(classId);
    const classDef = ARCANA_CLASSES[companionClass];

    this.partner = {
      connected: true,
      peerId: 'host_peer_simulated',
      name: AI_COMPANION_NAMES[companionClass],
      classId: companionClass,
      x: 0,
      y: 0,
      facingX: 1,
      facingY: 0,
      hp: classDef.baseStats.maxHp,
      maxHp: classDef.baseStats.maxHp,
      animState: 'idle',
      downed: false,
      reviveProgress: 0,
    };

    this.openBroadcastChannel(normalizedCode);
    this.sendWireMessage({
      type: 'HANDSHAKE_SYN',
      roomCode: normalizedCode,
      senderId: this.localPeerId,
      senderName: this.localName,
      classId: this.localClassId,
    });

    this.notifyPartnerChanged();
    return true;
  }

  public enableAiCompanion(playerClassId: ArcanaClassId): CoopPartnerState {
    if (!this.isActive || !this.partner) {
      this.createRoom(this.localName, playerClassId);
    }
    return this.partner!;
  }

  private openBroadcastChannel(code: string): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }

    try {
      this.channel = new BroadcastChannel(`gabzitu_arcana_coop_${code}`);
      this.channel.onmessage = (ev: MessageEvent<CoopWireMessage>) => {
        const msg = ev.data;
        if (!msg || msg.roomCode !== this.roomCode || msg.senderId === this.localPeerId) {
          return;
        }
        this.handleWireMessage(msg);
      };
    } catch {
      this.channel = null;
    }
  }

  private sendWireMessage(msg: CoopWireMessage): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage(msg);
    } catch {
      // Ignore closed channel errors
    }
  }

  private handleWireMessage(msg: CoopWireMessage): void {
    this.lastRemotePacketMs = performance.now();

    if (msg.type === 'HANDSHAKE_SYN') {
      this.isAiCompanion = false;
      const def = ARCANA_CLASSES[msg.classId] ?? ARCANA_CLASSES.chrono;
      this.partner = {
        connected: true,
        peerId: msg.senderId,
        name: msg.senderName,
        classId: msg.classId,
        x: this.partner?.x ?? 0,
        y: this.partner?.y ?? 0,
        facingX: 1,
        facingY: 0,
        hp: def.baseStats.maxHp,
        maxHp: def.baseStats.maxHp,
        animState: 'idle',
        downed: false,
        reviveProgress: 0,
      };
      this.sendWireMessage({
        type: 'HANDSHAKE_ACK',
        roomCode: this.roomCode!,
        senderId: this.localPeerId,
        senderName: this.localName,
        classId: this.localClassId,
      });
      this.notifyPartnerChanged();
      return;
    }

    if (msg.type === 'HANDSHAKE_ACK') {
      this.isAiCompanion = false;
      const def = ARCANA_CLASSES[msg.classId] ?? ARCANA_CLASSES.chrono;
      this.partner = {
        connected: true,
        peerId: msg.senderId,
        name: msg.senderName,
        classId: msg.classId,
        x: this.partner?.x ?? 0,
        y: this.partner?.y ?? 0,
        facingX: 1,
        facingY: 0,
        hp: def.baseStats.maxHp,
        maxHp: def.baseStats.maxHp,
        animState: 'idle',
        downed: false,
        reviveProgress: 0,
      };
      this.notifyPartnerChanged();
      return;
    }

    if (msg.type === 'STATE_UPDATE' && msg.payload) {
      this.isAiCompanion = false;
      const p = msg.payload;
      if (!this.partner) {
        this.partner = {
          connected: true,
          peerId: msg.senderId,
          name: msg.senderName,
          classId: msg.classId,
          ...p,
        };
      } else {
        this.partner.connected = true;
        this.partner.peerId = msg.senderId;
        this.partner.name = msg.senderName;
        this.partner.classId = msg.classId;
        this.partner.x = p.x;
        this.partner.y = p.y;
        this.partner.facingX = p.facingX;
        this.partner.facingY = p.facingY;
        this.partner.hp = p.hp;
        this.partner.maxHp = p.maxHp;
        this.partner.animState = p.animState;
        this.partner.downed = p.downed;
      }
      return;
    }

    if (msg.type === 'REVIVE_COMPLETE') {
      if (this.partner) {
        this.partner.downed = false;
        this.partner.reviveProgress = 0;
        this.partner.hp = Math.max(1, Math.round(this.partner.maxHp * 0.55));
      }
      return;
    }

    if (msg.type === 'LEAVE') {
      // Fallback smoothly to AI control if remote tab closes mid-run
      this.isAiCompanion = true;
      this.notifyPartnerChanged();
    }
  }

  /**
   * Synchronizes local player state, updates AI companion or remote interpolation,
   * and processes the 2.5s cooperative revival mechanic.
   */
  public syncTick(dt: number, state: ArcanaRunState): void {
    if (!this.isActive || !this.partner) {
      return;
    }

    // Ensure run state references our partner state
    if (!state.coopPartner) {
      state.coopPartner = this.partner;
    }

    const player = state.player;

    // Initialize partner spawn near player on first frame
    if (this.partner.x === 0 && this.partner.y === 0) {
      this.partner.x = player.x + 64;
      this.partner.y = player.y + 36;
    }

    // Check if remote peer timed out (> 4 seconds without packet) -> seamlessly hand over to AI
    if (!this.isAiCompanion && this.lastRemotePacketMs > 0 && performance.now() - this.lastRemotePacketMs > 4000) {
      this.isAiCompanion = true;
    }

    // Broadcast our current state to any connected tab
    this.broadcastLocalState(player);

    // Handle 2.5s Cooperative Revival when ally is downed
    if (this.partner.downed) {
      this.partner.animState = 'defeat';
      const dist = Math.hypot(player.x - this.partner.x, player.y - this.partner.y);
      if (dist <= COOP_REVIVE_RADIUS && player.hp > 0) {
        this.partner.reviveProgress = Math.min(1, this.partner.reviveProgress + dt / COOP_REVIVE_DURATION_SEC);
        if (this.partner.reviveProgress >= 1) {
          this.partner.downed = false;
          this.partner.reviveProgress = 0;
          this.partner.hp = Math.round(this.partner.maxHp * 0.6);
          this.partner.animState = 'victory';
          state.statusBanner = {
            text: 'ALIADO REERGUIDO!',
            subtext: `${this.partner.name} voltou ao combate arcano`,
            timer: 2.2,
            color: '#64dfdf',
          };
          this.sendWireMessage({
            type: 'REVIVE_COMPLETE',
            roomCode: this.roomCode ?? 'ARC-000',
            senderId: this.localPeerId,
            senderName: this.localName,
            classId: this.localClassId,
          });
        }
      } else {
        this.partner.reviveProgress = Math.max(0, this.partner.reviveProgress - dt * 0.5);
      }
      return;
    }

    // If AI-assisted companion is active, simulate tactical movement, combat & damage
    if (this.isAiCompanion) {
      this.updateAiCompanion(dt, state);
    }
  }

  public update(dt: number, state: ArcanaRunState): void {
    this.syncTick(dt, state);
  }

  public broadcastLocalState(player: PlayerRuntimeState): void {
    if (!this.channel || !this.roomCode) return;
    this.sendWireMessage({
      type: 'STATE_UPDATE',
      roomCode: this.roomCode,
      senderId: this.localPeerId,
      senderName: this.localName,
      classId: player.classId,
      payload: {
        x: Math.round(player.x),
        y: Math.round(player.y),
        facingX: player.facingX,
        facingY: player.facingY,
        hp: Math.round(player.hp),
        maxHp: Math.round(player.maxHp),
        animState: player.animState,
        downed: player.hp <= 0,
        reviveProgress: 0,
      },
    });
  }

  private updateAiCompanion(dt: number, state: ArcanaRunState): void {
    const partner = this.partner;
    if (!partner || partner.downed) return;

    const player = state.player;
    this.aiOrbitAngle += dt * 1.15;

    // Desired formation point near player
    const desiredX = player.x + Math.cos(this.aiOrbitAngle) * 85;
    const desiredY = player.y + Math.sin(this.aiOrbitAngle) * 85;

    const dx = desiredX - partner.x;
    const dy = desiredY - partner.y;
    const distToFormation = Math.hypot(dx, dy);

    const moveSpeed = 215;
    if (distToFormation > 12) {
      const step = Math.min(distToFormation, moveSpeed * dt);
      partner.x += (dx / distToFormation) * step;
      partner.y += (dy / distToFormation) * step;
      partner.facingX = dx / distToFormation;
      partner.facingY = dy / distToFormation;
      partner.animState = 'walk';
    } else {
      partner.animState = 'idle';
    }

    // Check enemy contact damage against AI companion
    for (const enemy of state.enemies) {
      const edist = Math.hypot(enemy.x - partner.x, enemy.y - partner.y);
      if (edist < enemy.radius + 18) {
        partner.hp = Math.max(0, partner.hp - enemy.damage * 0.35 * dt);
        if (partner.hp <= 0) {
          partner.downed = true;
          partner.reviveProgress = 0;
          partner.animState = 'defeat';
          state.statusBanner = {
            text: 'ALIADO CAÍDO!',
            subtext: `Permanece junto a ${partner.name} por 2.5s para o reerguer`,
            timer: 3.0,
            color: '#ff4d6d',
          };
          return;
        }
      }
    }

    // Cooperative auto-fire at nearest enemy or boss
    this.aiAttackCooldown -= dt;
    if (this.aiAttackCooldown <= 0) {
      let targetX: number | null = null;
      let targetY: number | null = null;
      let bestDist = 420;

      if (state.boss && state.boss.hp > 0) {
        const bDist = Math.hypot(state.boss.x - partner.x, state.boss.y - partner.y);
        if (bDist < 520) {
          targetX = state.boss.x;
          targetY = state.boss.y;
          bestDist = bDist;
        }
      }

      for (const enemy of state.enemies) {
        const d = Math.hypot(enemy.x - partner.x, enemy.y - partner.y);
        if (d < bestDist) {
          bestDist = d;
          targetX = enemy.x;
          targetY = enemy.y;
        }
      }

      if (targetX !== null && targetY !== null) {
        this.aiAttackCooldown = 0.68;
        const angle = Math.atan2(targetY - partner.y, targetX - partner.x);
        partner.facingX = Math.cos(angle);
        partner.facingY = Math.sin(angle);
        partner.animState = 'attack';

        const projSpeed = 520;
        const projKindMap: Record<ArcanaClassId, ActiveProjectile['kind']> = {
          chess: 'pawn_lance',
          chrono: 'chrono_shard',
          chaos: 'chaos_orb',
          rune: 'rune_glyph',
        };
        const projElemMap: Record<ArcanaClassId, ActiveProjectile['element']> = {
          chess: 'spectral',
          chrono: 'temporal',
          chaos: 'chaos',
          rune: 'runic',
        };
        const classPalette = ARCANA_CLASSES[partner.classId]?.palette.glow ?? '#7de2ff';

        state.projectiles.push({
          id: `coop_proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          owner: 'coop_ally',
          kind: projKindMap[partner.classId],
          element: projElemMap[partner.classId],
          x: partner.x + partner.facingX * 18,
          y: partner.y + partner.facingY * 18,
          vx: Math.cos(angle) * projSpeed,
          vy: Math.sin(angle) * projSpeed,
          radius: 8,
          damage: Math.round(player.computed.damage * 0.65),
          pierceLeft: 1,
          bouncesLeft: 0,
          life: 1.35,
          maxLife: 1.35,
          homingStrength: 0.15,
          hitEntityIds: new Set<string>(),
          color: classPalette,
        });
      }
    }
  }

  public disconnect(): void {
    if (this.channel && this.roomCode) {
      this.sendWireMessage({
        type: 'LEAVE',
        roomCode: this.roomCode,
        senderId: this.localPeerId,
        senderName: this.localName,
        classId: this.localClassId,
      });
      try {
        this.channel.close();
      } catch {
        // Ignore close error
      }
    }
    this.channel = null;
    this.roomCode = null;
    this.role = 'none';
    this.isActive = false;
    this.isAiCompanion = false;
    this.partner = null;
    this.notifyPartnerChanged();
  }

  public leaveRoom(): void {
    this.disconnect();
  }

  public destroy(): void {
    this.disconnect();
  }

  private notifyPartnerChanged(): void {
    this.onPartnerChangedCallback?.(this.partner);
  }
}

export const arcanaCoop = new ArcanaCoopSession();
