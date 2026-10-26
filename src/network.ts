/** O transporte não executa regras de combate; todas as intenções passam por command(). */
export const PROTOCOL = 'mb-7';
const MAX_CONTROL = 8192, MAX_STATE = 256000;
type Signal = {
    sender: string;
    kind: 'join' | 'offer' | 'answer' | 'full';
    sdp?: RTCSessionDescriptionInit;
    to?: string;
};
export type NetMessage = {
    type: string;
    [key: string]: unknown;
};
export function validName(raw: unknown) { return typeof raw === 'string' ? raw.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 18) || 'Bigodes' : 'Bigodes'; }
export function encode(value: unknown) { return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))); }
export function decode(code: string): any { if (code.length > 40000)
    throw Error('Convite demasiado grande.'); try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.trim()), c => c.charCodeAt(0))));
}
catch {
    throw Error('Convite ou resposta inválidos.');
} }
export function randomRoom() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''); }
export function validCommandPacket(value: unknown): boolean { if (!value || typeof value !== 'object')
    return false; const c = value as Record<string, unknown>; return ['build', 'upgrade', 'sell', 'priority', 'wave', 'ability', 'pause', 'speed','admin'].includes(String(c.type)); }
class SignalBus {
    private socket?: WebSocket;
    private heartbeat = 0;
    private ref = 1;
    private joined = false;
    constructor(private room: string, private receive: (s: Signal) => void, private fail: (m: string) => void) { }
    async connect(url: string, key: string) {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co'))
            throw Error('Usa o URL HTTPS do teu projeto Supabase Free.');
        if (!key.startsWith('sb_publishable_'))
            throw Error('Usa apenas a chave pública publishable, nunca uma chave secreta.');
        return new Promise<void>((resolve, reject) => {
            let settled = false;
            const timeout = window.setTimeout(() => { if (!settled) {
                settled = true;
                this.close();
                reject(Error('A sinalização não respondeu em 12 segundos. Verifica a configuração ou usa convite manual.'));
            } }, 12000);
            const ws = this.socket = new WebSocket(`wss://${parsed.hostname}/realtime/v1/websocket?apikey=${encodeURIComponent(key)}&vsn=1.0.0`);
            ws.onopen = () => ws.send(JSON.stringify({ topic: 'realtime:' + this.room, event: 'phx_join', payload: { config: { broadcast: { ack: false, self: false }, presence: { enabled: false }, private: false } }, ref: '1', join_ref: '1' }));
            ws.onmessage = event => { if (typeof event.data !== 'string' || event.data.length > 60000)
                return; try {
                const m = JSON.parse(event.data);
                if (m.event === 'phx_reply' && m.ref === '1') {
                    if (settled)
                        return;
                    settled = true;
                    clearTimeout(timeout);
                    if (m.payload.status !== 'ok') {
                        this.close();
                        reject(Error('Sinalização recusada: projeto pausado, limite gratuito ou chave inválida.'));
                        return;
                    }
                    this.joined = true;
                    this.heartbeat = window.setInterval(() => { if (ws.readyState === 1)
                        ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++this.ref) })); }, 25000);
                    resolve();
                }
                else if (m.event === 'broadcast' && m.payload?.event === 'signal')
                    this.receive(m.payload.payload as Signal);
                else if (m.event === 'phx_error' || m.event === 'phx_close')
                    this.fail('A sinalização terminou. Tenta novamente manualmente.');
            }
            catch { /* Mensagem externa inválida. */ } };
            ws.onerror = () => { if (!settled) {
                settled = true;
                clearTimeout(timeout);
                reject(Error('Não foi possível contactar a sinalização gratuita.'));
            } };
            ws.onclose = () => { clearTimeout(this.heartbeat); if (!settled) {
                settled = true;
                clearTimeout(timeout);
                reject(Error('A ligação de sinalização foi fechada.'));
            } };
        });
    }
    send(s: Signal) { if (this.joined && this.socket?.readyState === 1)
        this.socket.send(JSON.stringify({ topic: 'realtime:' + this.room, event: 'broadcast', payload: { type: 'broadcast', event: 'signal', payload: s }, ref: String(++this.ref), join_ref: '1' })); }
    close() { clearInterval(this.heartbeat); this.joined = false; this.socket?.close(); this.socket = undefined; }
}
export class PeerSession {
    pc?: RTCPeerConnection;
    control?: RTCDataChannel;
    frames?: RTCDataChannel;
    isHost = false;
    room = '';
    latency = 0;
    onmessage: (m: NetMessage) => void = () => { };
    onstatus: (message: string) => void = () => { };
    onclose: (reason: string) => void = () => { };
    private signal?: SignalBus;
    private id = randomRoom();
    private partner = '';
    private token = '';
    private ending = false;
    private linked = false;
    private timer = 0;
    private lostTimer = 0;
    private heartbeat = 0;
    private pingTime = 0;
    private tokens = 40;
    private lastRate = performance.now();
    private lastMessage = performance.now();
    private timeout = 0;
    private init(host: boolean, room: string, token: string) {
        if (this.pc)
            throw Error('Já existe uma ligação nesta sessão. Sai antes de criar outra.');
        this.isHost = host;
        this.room = room;
        this.token = token;
        this.ending = false;
        const pc = this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle' });
        pc.onconnectionstatechange = () => { if (this.ending)
            return; if (pc.connectionState === 'connected') {
            clearTimeout(this.timer);
            clearTimeout(this.lostTimer);
            this.onstatus('Ligação direta estabelecida');
            if (!this.heartbeat)
                this.heartbeat = window.setInterval(() => { if (this.control?.readyState === 'open') {
                    if (performance.now() - this.lastMessage > 25000) {
                        this.close(this.isHost ? 'O convidado deixou de responder.' : 'O anfitrião deixou de responder. A sessão terminou.');
                        return;
                    }
                    this.pingTime = performance.now();
                    this.send({ type: 'ping', time: this.pingTime });
                } }, 4000);
        }
        else if (pc.connectionState === 'disconnected') {
            this.onstatus('Ligação interrompida · pausa até 20 s para recuperar');
            this.lostTimer = window.setTimeout(() => this.close(this.isHost ? 'O convidado desligou-se.' : 'O anfitrião saiu. A sessão terminou.'), 20000);
        }
        else if (pc.connectionState === 'failed')
            this.close('A ligação direta falhou. A rede pode exigir TURN, que este jogo não usa. Sem custos; tenta outra rede.'); };
        if (host) {
            this.attach(pc.createDataChannel('control', { ordered: true }));
            this.attach(pc.createDataChannel('frames', { ordered: false, maxRetransmits: 0 }));
        }
        else
            pc.ondatachannel = e => this.attach(e.channel);
        // Expiração total impede salas esquecidas e tentativas sem fim.
        this.timeout = window.setTimeout(() => { if (!this.linked)
            this.close('O convite expirou ao fim de 10 minutos. Cria uma nova sala.'); }, 600000);
    }
    private attach(ch: RTCDataChannel) {
        if (ch.label === 'control')
            this.control = ch;
        else if (ch.label === 'frames')
            this.frames = ch;
        else {
            ch.close();
            return;
        }
        ch.onopen = () => { if (ch.label === 'control') {
            this.lastMessage = performance.now();
            this.send({ type: 'hello', protocol: PROTOCOL, token: this.token });
        } };
        ch.onmessage = e => {
            if (typeof e.data !== 'string' || e.data.length > (ch.label === 'frames' ? MAX_STATE : MAX_CONTROL)) {
                this.close('Mensagem de rede fora dos limites.');
                return;
            }
            const now = performance.now();
            this.tokens = Math.min(40, this.tokens + (now - this.lastRate) * .03);
            this.lastRate = now;
            if (ch.label === 'control' && --this.tokens < 0) {
                this.close('Demasiados comandos recebidos.');
                return;
            }
            try {
                const m = JSON.parse(e.data);
                if (!m || typeof m.type !== 'string')
                    return;
                this.lastMessage = now;
                if (m.type === 'hello') {
                    if (m.protocol !== PROTOCOL || m.token !== this.token) {
                        this.close('Versão ou convite incompatível.');
                        return;
                    }
                    this.linked = true;
                    clearTimeout(this.timer);
                    clearTimeout(this.timeout);
                    if (!this.isHost)
                        this.signal?.close();
                    this.onmessage({ type: 'connected' });
                    return;
                }
                if (!this.linked)
                    return;
                if (m.type === 'ping') {
                    this.send({ type: 'pong', time: m.time });
                    return;
                }
                if (m.type === 'pong') {
                    this.latency = Math.round(now - Number(m.time));
                    return;
                }
                if (m.type === 'bye') {
                    this.close(this.isHost ? 'O convidado saiu.' : 'O anfitrião saiu. A sessão terminou.');
                    return;
                }
                this.onmessage(m);
            }
            catch { /* Não executar dados de rede como código. */ }
        };
        ch.onclose = () => { if (!this.ending && ch.label === 'control')
            this.close(this.isHost ? 'O convidado saiu.' : 'O anfitrião saiu. A sessão terminou.'); };
    }
    private async gather() {
        const pc = this.pc!;
        if (pc.iceGatheringState === 'complete')
            return;
        await new Promise<void>(resolve => { const done = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); resolve(); }; const check = () => { if (pc.iceGatheringState === 'complete')
            done(); }; const timer = setTimeout(done, 7000); pc.addEventListener('icegatheringstatechange', check); });
    }
    async createManual() { this.init(true, randomRoom(), randomRoom()); await this.pc!.setLocalDescription(await this.pc!.createOffer()); await this.gather(); return encode({ v: PROTOCOL, room: this.room, token: this.token, sdp: this.pc!.localDescription, expires: Date.now() + 600000 }); }
    async joinManual(code: string) { const data = decode(code); if (data.v !== PROTOCOL || !data.sdp || data.sdp.type !== 'offer' || !/^[a-f0-9]{32}$/.test(data.room) || !/^[a-f0-9]{32}$/.test(data.token) || data.expires < Date.now())
        throw Error('Convite inválido, incompatível ou expirado.'); this.init(false, data.room, data.token); await this.pc!.setRemoteDescription(data.sdp); await this.pc!.setLocalDescription(await this.pc!.createAnswer()); await this.gather(); this.armTimeout(); return encode({ v: PROTOCOL, room: this.room, sdp: this.pc!.localDescription }); }
    async acceptManual(code: string) { const data = decode(code); if (!this.isHost || data.v !== PROTOCOL || data.room !== this.room || data.sdp?.type !== 'answer')
        throw Error('Esta resposta não pertence à sala.'); await this.pc!.setRemoteDescription(data.sdp); this.armTimeout(); }
    private armTimeout() { clearTimeout(this.timer); this.timer = window.setTimeout(() => this.close('Não foi possível estabelecer a ligação direta em 25 segundos. Sem TURN, algumas redes não são compatíveis. Tenta outra rede ou uma ligação local.'), 25000); }
    async online(host: boolean, url: string, key: string, room?: string, token?: string) {
        this.init(host, room || randomRoom(), token || randomRoom());
        this.signal = new SignalBus(this.room, s => { void this.signalMessage(s).catch(() => this.close('Falha na negociação WebRTC. Cria um novo convite.')); }, m => { if (!this.linked)
            this.close(m); });
        await this.signal.connect(url, key);
        if (!host) {
            this.signal.send({ sender: this.id, kind: 'join' });
            this.armTimeout();
        }
        return `${location.origin}${location.pathname}#sala=${this.room}&chave=${this.token}`;
    }
    private async signalMessage(s: Signal) {
        if (!s || s.sender === this.id || s.to && s.to !== this.id || !/^[a-f0-9]{32}$/.test(s.sender))
            return;
        if (this.isHost && s.kind === 'join') {
            if (this.partner && this.partner !== s.sender) {
                this.signal?.send({ sender: this.id, to: s.sender, kind: 'full' });
                return;
            }
            if (this.partner)
                return;
            this.partner = s.sender;
            await this.pc!.setLocalDescription(await this.pc!.createOffer());
            await this.gather();
            this.signal?.send({ sender: this.id, to: s.sender, kind: 'offer', sdp: this.pc!.localDescription!.toJSON() });
            this.armTimeout();
        }
        if (!this.isHost && s.kind === 'offer' && s.sdp?.type === 'offer' && !this.partner) {
            this.partner = s.sender;
            await this.pc!.setRemoteDescription(s.sdp);
            await this.pc!.setLocalDescription(await this.pc!.createAnswer());
            await this.gather();
            this.signal?.send({ sender: this.id, to: s.sender, kind: 'answer', sdp: this.pc!.localDescription!.toJSON() });
        }
        if (this.isHost && s.sender === this.partner && s.kind === 'answer' && s.sdp?.type === 'answer')
            await this.pc!.setRemoteDescription(s.sdp);
        if (s.kind === 'full')
            this.close('Esta sala já tem dois jogadores.');
    }
    send(m: NetMessage) { const data = JSON.stringify(m); if (data.length <= MAX_CONTROL && this.control?.readyState === 'open' && this.control.bufferedAmount < 65536)
        this.control.send(data); }
    snapshot(state: unknown, type: 'snapshot' | 'hunt-state' = 'snapshot') { if (this.frames?.readyState !== 'open' || this.frames.bufferedAmount > 65536)
        return; const data = JSON.stringify({ type, state }, (_, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v); if (data.length < MAX_STATE)
        this.frames.send(data); }
    close(reason = 'Sessão encerrada.') { if (this.ending)
        return; this.ending = true; this.send({ type: 'bye' }); clearTimeout(this.timer); clearTimeout(this.timeout); clearTimeout(this.lostTimer); clearInterval(this.heartbeat); this.signal?.close(); this.pc?.close(); this.onclose(reason); }
    get connected() { return this.linked && !this.ending; }
}
