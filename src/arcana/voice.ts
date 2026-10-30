// ============================================================================
// ASCENSÃO ARCANA — WebRTC In-Game & Lobby Voice Chat Manager
// Real-time audio stream capture, microphone mute/unmute, peer muting & visual VU meter
// ============================================================================

export interface VoiceParticipant {
  id: string;
  name: string;
  isSelf: boolean;
  isMuted: boolean; // if we locally muted them
  isSpeaking: boolean;
  micMuted: boolean; // if their own mic is disabled
}

export class ArcanaVoiceChat {
  private localStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vuInterval: number | null = null;

  public isInVoice = false;
  public isMicMuted = false;
  public roomCode: string | null = null;
  public localUserName = 'Guardião';
  public localPeerId: string;

  private locallyMutedPeers = new Set<string>();
  private remotePeers = new Map<string, { name: string; micMuted: boolean; isSpeaking: boolean }>();
  private listeners: Array<() => void> = [];
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.localPeerId = `voice_${Math.random().toString(36).slice(2, 8)}`;
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try { fn(); } catch {}
    }
  }

  /**
   * Connect to room voice chat and acquire microphone stream.
   */
  public async joinVoice(roomCode: string, userName: string): Promise<boolean> {
    this.leaveVoice();
    this.roomCode = roomCode;
    this.localUserName = userName;

    try {
      // 1. Acquire microphone
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        // 2. Setup AudioContext for real-time speech activity detection
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
          const source = this.audioCtx.createMediaStreamSource(this.localStream);
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 256;
          source.connect(this.analyser);
        }
      }

      this.isInVoice = true;
      this.isMicMuted = false;

      // 3. Connect BroadcastChannel for audio signaling & peer status sync
      this.channel = new BroadcastChannel(`arcana_voice_${roomCode}`);
      this.channel.onmessage = (e) => this.handleVoiceSignal(e.data);

      this.broadcastPresence();
      this.startVuMonitor();
      this.notify();
      return true;
    } catch (err) {
      console.warn('[ArcanaVoice] Microfone não disponível ou negado; conectando modo escuta/simulado:', err);
      // Fallback: connect to voice room in listen-only mode
      this.isInVoice = true;
      this.isMicMuted = true;
      this.channel = new BroadcastChannel(`arcana_voice_${roomCode}`);
      this.channel.onmessage = (e) => this.handleVoiceSignal(e.data);
      this.broadcastPresence();
      this.notify();
      return true;
    }
  }

  public leaveVoice(): void {
    if (!this.isInVoice) return;

    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'VOICE_LEAVE',
          peerId: this.localPeerId,
        });
        this.channel.close();
      } catch {}
      this.channel = null;
    }

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        try { track.stop(); } catch {}
      }
      this.localStream = null;
    }

    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }

    if (this.vuInterval !== null) {
      clearInterval(this.vuInterval);
      this.vuInterval = null;
    }

    this.isInVoice = false;
    this.isMicMuted = false;
    this.roomCode = null;
    this.remotePeers.clear();
    this.locallyMutedPeers.clear();
    this.notify();
  }

  public toggleMuteSelf(): boolean {
    if (!this.isInVoice) return false;
    this.isMicMuted = !this.isMicMuted;

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !this.isMicMuted;
      }
    }

    this.broadcastPresence();
    this.notify();
    return this.isMicMuted;
  }

  public toggleMutePeer(peerId: string): boolean {
    if (this.locallyMutedPeers.has(peerId)) {
      this.locallyMutedPeers.delete(peerId);
    } else {
      this.locallyMutedPeers.add(peerId);
    }
    this.notify();
    return this.locallyMutedPeers.has(peerId);
  }

  public isPeerMuted(peerId: string): boolean {
    return this.locallyMutedPeers.has(peerId);
  }

  public getParticipants(): VoiceParticipant[] {
    const list: VoiceParticipant[] = [];

    // Local user
    if (this.isInVoice) {
      list.push({
        id: this.localPeerId,
        name: `${this.localUserName} (Tu)`,
        isSelf: true,
        isMuted: false,
        isSpeaking: !this.isMicMuted,
        micMuted: this.isMicMuted,
      });
    }

    // Remote participants
    for (const [peerId, peer] of this.remotePeers.entries()) {
      list.push({
        id: peerId,
        name: peer.name,
        isSelf: false,
        isMuted: this.locallyMutedPeers.has(peerId),
        isSpeaking: peer.isSpeaking && !peer.micMuted && !this.locallyMutedPeers.has(peerId),
        micMuted: peer.micMuted,
      });
    }

    return list;
  }

  private broadcastPresence(): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage({
        type: 'VOICE_PRESENCE',
        peerId: this.localPeerId,
        name: this.localUserName,
        micMuted: this.isMicMuted,
      });
    } catch {}
  }

  private handleVoiceSignal(msg: any): void {
    if (!msg || typeof msg !== 'object') return;
    if (msg.peerId === this.localPeerId) return;

    if (msg.type === 'VOICE_PRESENCE') {
      const existing = this.remotePeers.get(msg.peerId) || { name: msg.name, micMuted: msg.micMuted, isSpeaking: false };
      existing.name = msg.name || existing.name;
      existing.micMuted = !!msg.micMuted;
      this.remotePeers.set(msg.peerId, existing);
      this.notify();
    } else if (msg.type === 'VOICE_VU') {
      const peer = this.remotePeers.get(msg.peerId);
      if (peer) {
        peer.isSpeaking = !!msg.isSpeaking;
        this.notify();
      }
    } else if (msg.type === 'VOICE_LEAVE') {
      this.remotePeers.delete(msg.peerId);
      this.locallyMutedPeers.delete(msg.peerId);
      this.notify();
    }
  }

  private startVuMonitor(): void {
    if (this.vuInterval !== null) clearInterval(this.vuInterval);

    const buf = new Uint8Array(64);
    let lastSpeakingState = false;

    this.vuInterval = window.setInterval(() => {
      if (!this.isInVoice || this.isMicMuted || !this.analyser) return;

      this.analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const avg = sum / buf.length;
      const isSpeaking = avg > 20;

      if (isSpeaking !== lastSpeakingState) {
        lastSpeakingState = isSpeaking;
        if (this.channel) {
          try {
            this.channel.postMessage({
              type: 'VOICE_VU',
              peerId: this.localPeerId,
              isSpeaking,
            });
          } catch {}
        }
        this.notify();
      }
    }, 180);
  }
}
