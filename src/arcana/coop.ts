// ============================================================================
// SURVIVOR ELEMENTAL — Multiplayer Co-op Session (Até 5 Jogadores)
// Suporta 1 Anfitrião + até 4 Aliados (Jogadores Reais via BroadcastChannel / WebRTC + Guardiões IA)
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
export const MAX_COOP_PLAYERS = 5;

interface CoopWireMessage {
  type: 'HANDSHAKE_SYN' | 'HANDSHAKE_ACK' | 'ROSTER_SYNC' | 'STATE_UPDATE' | 'REVIVE_COMPLETE' | 'LEAVE';
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

const GUARDIAN_COMPANION_DEFS: Array<{ classId: ArcanaClassId; name: string }> = [
  { classId: 'chess', name: 'Kael (Avatar Vento & Bastão)' },
  { classId: 'chrono', name: 'Nerys (Maré & Dança do Gelo)' },
  { classId: 'chaos', name: 'Iskra (Fúria Solar & Magma)' },
  { classId: 'rune', name: 'Borak (Bastião de Basalto)' },
];

export class ArcanaCoopSession {
  public roomCode: string | null = null;
  public role: 'host' | 'guest' | 'none' = 'none';
  public isActive = false;
  public localPeerId: string;
  public localName = 'Guardião';
  public localClassId: ArcanaClassId = 'chess';

  public partners: Map<string, CoopPartnerState> = new Map();
  private channel: BroadcastChannel | null = null;
  private lastRemotePacketMs = new Map<string, number>();
  private aiAttackCooldowns = new Map<string, number>();
  private aiOrbitAngle = 0;
  private onPartnersChangedCallback: ((partners: CoopPartnerState[]) => void) | null = null;

  constructor() {
    this.localPeerId = `peer_${Math.random().toString(36).slice(2, 9)}`;
  }

  public onPartnersUpdate(cb: (partners: CoopPartnerState[]) => void): void {
    this.onPartnersChangedCallback = cb;
  }

  public onPartnerUpdate(cb: (partner: CoopPartnerState | null) => void): void {
    this.onPartnersChangedCallback = (partners) => {
      cb(partners[0] ?? null);
    };
  }

  public getPartners(): CoopPartnerState[] {
    return Array.from(this.partners.values());
  }

  public getPartnerState(): CoopPartnerState | null {
    return this.getPartners()[0] ?? null;
  }

  /**
   * Cria uma sala para até 5 Guardiões (Host + até 4 Aliados).
   * Retorna um código como `ARC-742`.
   */
  public createRoom(hostName: string, classId: ArcanaClassId): string {
    this.disconnect();

    const digits = Math.floor(100 + Math.random() * 900);
    const code = `ARC-${digits}`;

    this.roomCode = code;
    this.role = 'host';
    this.isActive = true;
    this.localName = hostName.trim() || 'Anfitrião Elemental';
    this.localClassId = classId;

    // Inicializa 4 Guardiões companheiros para formar o esquadrão completo de 5
    this.partners.clear();
    const companionList = GUARDIAN_COMPANION_DEFS.filter(c => c.classId !== classId);
    // Se sobrar 3, duplicamos com estilo alternativo para perfazer 4 aliados
    while (companionList.length < 4) {
      companionList.push({
        classId: 'chess',
        name: 'Kyoshi (Avatar dos Leques Celestiais)',
      });
    }

    companionList.slice(0, 4).forEach((comp, idx) => {
      const classDef = ARCANA_CLASSES[comp.classId] ?? ARCANA_CLASSES.chess;
      const peerId = `ai_ally_${idx}_${comp.classId}`;
      this.partners.set(peerId, {
        connected: true,
        peerId,
        name: comp.name,
        classId: comp.classId,
        x: 0,
        y: 0,
        facingX: 1,
        facingY: 0,
        hp: classDef.baseStats.maxHp,
        maxHp: classDef.baseStats.maxHp,
        animState: 'idle',
        downed: false,
        reviveProgress: 0,
        isAi: true,
      });
      this.aiAttackCooldowns.set(peerId, 0.4 + idx * 0.2);
    });

    this.openBroadcastChannel(code);
    this.notifyPartnersChanged();
    return code;
  }

  /**
   * Conecta a uma sala existente com o código (ex: ARC-742).
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
    this.localName = guestName.trim() || 'Guardião Convidado';
    this.localClassId = classId;

    // Cria parceiros temporários que serão sincronizados com o Host
    this.partners.clear();
    const companionList = GUARDIAN_COMPANION_DEFS.filter(c => c.classId !== classId);
    companionList.slice(0, 4).forEach((comp, idx) => {
      const classDef = ARCANA_CLASSES[comp.classId] ?? ARCANA_CLASSES.chrono;
      const peerId = `ai_ally_${idx}_${comp.classId}`;
      this.partners.set(peerId, {
        connected: true,
        peerId,
        name: comp.name,
        classId: comp.classId,
        x: 0,
        y: 0,
        facingX: 1,
        facingY: 0,
        hp: classDef.baseStats.maxHp,
        maxHp: classDef.baseStats.maxHp,
        animState: 'idle',
        downed: false,
        reviveProgress: 0,
        isAi: true,
      });
      this.aiAttackCooldowns.set(peerId, 0.3 + idx * 0.2);
    });

    this.openBroadcastChannel(normalizedCode);
    this.sendWireMessage({
      type: 'HANDSHAKE_SYN',
      roomCode: normalizedCode,
      senderId: this.localPeerId,
      senderName: this.localName,
      classId: this.localClassId,
    });

    this.notifyPartnersChanged();
    return true;
  }

  public enableAiCompanion(playerClassId: ArcanaClassId): CoopPartnerState {
    if (!this.isActive || this.partners.size === 0) {
      this.createRoom(this.localName, playerClassId);
    }
    return this.getPartners()[0]!;
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
    } catch {}
  }

  private handleWireMessage(msg: CoopWireMessage): void {
    this.lastRemotePacketMs.set(msg.senderId, performance.now());

    if (msg.type === 'HANDSHAKE_SYN') {
      const def = ARCANA_CLASSES[msg.classId] ?? ARCANA_CLASSES.chrono;
      // Substitui um slot de IA pelo jogador humano real que entrou
      let slotReplaced = false;
      for (const [key, partner] of this.partners.entries()) {
        if (partner.isAi) {
          this.partners.delete(key);
          this.partners.set(msg.senderId, {
            connected: true,
            peerId: msg.senderId,
            name: msg.senderName,
            classId: msg.classId,
            x: partner.x,
            y: partner.y,
            facingX: 1,
            facingY: 0,
            hp: def.baseStats.maxHp,
            maxHp: def.baseStats.maxHp,
            animState: 'idle',
            downed: false,
            reviveProgress: 0,
            isAi: false,
          });
          slotReplaced = true;
          break;
        }
      }

      if (!slotReplaced && this.partners.size < 4) {
        this.partners.set(msg.senderId, {
          connected: true,
          peerId: msg.senderId,
          name: msg.senderName,
          classId: msg.classId,
          x: 0,
          y: 0,
          facingX: 1,
          facingY: 0,
          hp: def.baseStats.maxHp,
          maxHp: def.baseStats.maxHp,
          animState: 'idle',
          downed: false,
          reviveProgress: 0,
          isAi: false,
        });
      }

      this.sendWireMessage({
        type: 'HANDSHAKE_ACK',
        roomCode: this.roomCode!,
        senderId: this.localPeerId,
        senderName: this.localName,
        classId: this.localClassId,
      });
      this.notifyPartnersChanged();
      return;
    }

    if (msg.type === 'HANDSHAKE_ACK') {
      const def = ARCANA_CLASSES[msg.classId] ?? ARCANA_CLASSES.chrono;
      let slotReplaced = false;
      for (const [key, partner] of this.partners.entries()) {
        if (partner.isAi) {
          this.partners.delete(key);
          this.partners.set(msg.senderId, {
            connected: true,
            peerId: msg.senderId,
            name: msg.senderName,
            classId: msg.classId,
            x: partner.x,
            y: partner.y,
            facingX: 1,
            facingY: 0,
            hp: def.baseStats.maxHp,
            maxHp: def.baseStats.maxHp,
            animState: 'idle',
            downed: false,
            reviveProgress: 0,
            isAi: false,
          });
          slotReplaced = true;
          break;
        }
      }
      if (!slotReplaced && this.partners.size < 4) {
        this.partners.set(msg.senderId, {
          connected: true,
          peerId: msg.senderId,
          name: msg.senderName,
          classId: msg.classId,
          x: 0,
          y: 0,
          facingX: 1,
          facingY: 0,
          hp: def.baseStats.maxHp,
          maxHp: def.baseStats.maxHp,
          animState: 'idle',
          downed: false,
          reviveProgress: 0,
          isAi: false,
        });
      }
      this.notifyPartnersChanged();
      return;
    }

    if (msg.type === 'STATE_UPDATE' && msg.payload) {
      const p = msg.payload;
      const existing = this.partners.get(msg.senderId);
      if (existing) {
        existing.connected = true;
        existing.name = msg.senderName;
        existing.classId = msg.classId;
        existing.x = p.x;
        existing.y = p.y;
        existing.facingX = p.facingX;
        existing.facingY = p.facingY;
        existing.hp = p.hp;
        existing.maxHp = p.maxHp;
        existing.animState = p.animState;
        existing.downed = p.downed;
        existing.isAi = false;
      }
      return;
    }

    if (msg.type === 'REVIVE_COMPLETE') {
      const existing = this.partners.get(msg.senderId);
      if (existing) {
        existing.downed = false;
        existing.reviveProgress = 0;
        existing.hp = Math.max(1, Math.round(existing.maxHp * 0.6));
      }
      return;
    }

    if (msg.type === 'LEAVE') {
      const leavingPartner = this.partners.get(msg.senderId);
      if (leavingPartner) {
        // Converte de volta suavemente para IA
        leavingPartner.isAi = true;
        leavingPartner.name = `${leavingPartner.name} (IA)`;
      }
      this.notifyPartnersChanged();
    }
  }

  /**
   * Sincroniza o estado local, atualiza IA dos aliados e gerencia o renascimento cooperativo de 2.5s.
   */
  public syncTick(dt: number, state: ArcanaRunState): void {
    if (!this.isActive || this.partners.size === 0) {
      return;
    }

    const allies = this.getPartners();
    state.coopAllies = allies;
    state.coopPartner = allies[0] ?? null;

    const player = state.player;
    this.broadcastLocalState(player);

    const now = performance.now();
    this.aiOrbitAngle += dt * 0.95;

    allies.forEach((ally, index) => {
      // Inicia spawn do aliado perto do jogador se zerado
      if (ally.x === 0 && ally.y === 0) {
        const angle = (index * (Math.PI * 2)) / 4;
        ally.x = player.x + Math.cos(angle) * 75;
        ally.y = player.y + Math.sin(angle) * 75;
      }

      // Se for peer remoto e parou de enviar pacotes (>4s), reverte para controle de IA
      if (!ally.isAi) {
        const lastPacket = this.lastRemotePacketMs.get(ally.peerId) || 0;
        if (lastPacket > 0 && now - lastPacket > 4000) {
          ally.isAi = true;
        }
      }

      // Sistema de Renascimento Cooperativo (2.5 segundos junto ao corpo)
      if (ally.downed) {
        ally.animState = 'defeat';
        const dist = Math.hypot(player.x - ally.x, player.y - ally.y);
        if (dist <= COOP_REVIVE_RADIUS && player.hp > 0) {
          ally.reviveProgress = Math.min(1, ally.reviveProgress + dt / COOP_REVIVE_DURATION_SEC);
          if (ally.reviveProgress >= 1) {
            ally.downed = false;
            ally.reviveProgress = 0;
            ally.hp = Math.round(ally.maxHp * 0.65);
            ally.animState = 'victory';
            state.statusBanner = {
              text: 'ALIADO REERGUIDO!',
              subtext: `${ally.name} retornou à batalha elemental!`,
              timer: 2.2,
              color: '#64dfdf',
            };
            this.sendWireMessage({
              type: 'REVIVE_COMPLETE',
              roomCode: this.roomCode ?? 'ARC-000',
              senderId: ally.peerId,
              senderName: ally.name,
              classId: ally.classId,
            });
          }
        } else {
          ally.reviveProgress = Math.max(0, ally.reviveProgress - dt * 0.4);
        }
        return;
      }

      // Se o aliado for IA, simular movimento tático em formação e disparos elementares
      if (ally.isAi) {
        this.updateAiAlly(ally, index, dt, state);
      }
    });
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

  private updateAiAlly(ally: CoopPartnerState, index: number, dt: number, state: ArcanaRunState): void {
    if (ally.downed) return;

    const player = state.player;
    // Formação em diamante / pentágono ao redor do líder
    const offsetAngle = this.aiOrbitAngle + index * ((Math.PI * 2) / 4);
    const formationRadius = 80 + (index % 2) * 25;
    const desiredX = player.x + Math.cos(offsetAngle) * formationRadius;
    const desiredY = player.y + Math.sin(offsetAngle) * formationRadius;

    const dx = desiredX - ally.x;
    const dy = desiredY - ally.y;
    const dist = Math.hypot(dx, dy);
    const speed = 230;

    if (dist > 14) {
      const step = Math.min(dist, speed * dt);
      ally.x += (dx / dist) * step;
      ally.y += (dy / dist) * step;
      ally.facingX = dx / dist;
      ally.facingY = dy / dist;
      ally.animState = 'walk';
    } else {
      ally.animState = 'idle';
    }

    // Dano de contato dos monstros contra o aliado IA
    for (const enemy of state.enemies) {
      const edist = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
      if (edist < enemy.radius + 18) {
        ally.hp = Math.max(0, ally.hp - enemy.damage * 0.28 * dt);
        if (ally.hp <= 0) {
          ally.downed = true;
          ally.reviveProgress = 0;
          ally.animState = 'defeat';
          state.statusBanner = {
            text: 'ALIADO CAÍDO!',
            subtext: `Aproxima-te de ${ally.name} por 2.5s para o reerguer`,
            timer: 3.0,
            color: '#ff4d6d',
          };
          return;
        }
      }
    }

    // Ataque cooperativo automático no inimigo mais próximo
    let cd = this.aiAttackCooldowns.get(ally.peerId) || 0;
    cd -= dt;
    if (cd <= 0) {
      let targetX: number | null = null;
      let targetY: number | null = null;
      let bestDist = 450;

      if (state.boss && state.boss.hp > 0) {
        const bDist = Math.hypot(state.boss.x - ally.x, state.boss.y - ally.y);
        if (bDist < 550) {
          targetX = state.boss.x;
          targetY = state.boss.y;
          bestDist = bDist;
        }
      }

      for (const enemy of state.enemies) {
        const d = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
        if (d < bestDist) {
          bestDist = d;
          targetX = enemy.x;
          targetY = enemy.y;
        }
      }

      if (targetX !== null && targetY !== null) {
        this.aiAttackCooldowns.set(ally.peerId, 0.62 + (index % 3) * 0.15);
        const angle = Math.atan2(targetY - ally.y, targetX - ally.x);
        ally.facingX = Math.cos(angle);
        ally.facingY = Math.sin(angle);
        ally.animState = 'attack';

        const projSpeed = 580;
        const projKindMap: Record<ArcanaClassId, ActiveProjectile['kind']> = {
          chess: 'fan_gale',
          chrono: 'water_whip',
          chaos: 'solar_fist',
          rune: 'terracotta_block',
        };
        const projElemMap: Record<ArcanaClassId, ActiveProjectile['element']> = {
          chess: 'spectral',
          chrono: 'temporal',
          chaos: 'chaos',
          rune: 'runic',
        };
        const classPalette = ARCANA_CLASSES[ally.classId]?.palette.glow ?? '#7de2ff';

        state.projectiles.push({
          id: `coop_proj_${ally.peerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          owner: 'coop_ally',
          kind: projKindMap[ally.classId] || 'pawn_lance',
          element: projElemMap[ally.classId] || 'spectral',
          x: ally.x + ally.facingX * 18,
          y: ally.y + ally.facingY * 18,
          vx: Math.cos(angle) * projSpeed,
          vy: Math.sin(angle) * projSpeed,
          radius: 12,
          damage: Math.round(player.computed.damage * 0.7),
          pierceLeft: 3,
          bouncesLeft: 0,
          life: 2.2,
          maxLife: 2.2,
          homingStrength: 0.2,
          hitEntityIds: new Set<string>(),
          color: classPalette,
        });
      } else {
        this.aiAttackCooldowns.set(ally.peerId, 0.2);
      }
    } else {
      this.aiAttackCooldowns.set(ally.peerId, cd);
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
      } catch {}
    }
    this.channel = null;
    this.roomCode = null;
    this.role = 'none';
    this.isActive = false;
    this.partners.clear();
    this.lastRemotePacketMs.clear();
    this.aiAttackCooldowns.clear();
    this.notifyPartnersChanged();
  }

  public leaveRoom(): void {
    this.disconnect();
  }

  public destroy(): void {
    this.disconnect();
  }

  private notifyPartnersChanged(): void {
    const list = this.getPartners();
    this.onPartnersChangedCallback?.(list);
  }
}

export const arcanaCoop = new ArcanaCoopSession();
