import {installGameTouchGuard} from './game-touch';
import './game-touch.css';
import {movementRadius} from './mobility';
import {TEAM_LIMIT,rememberedTeam,suggestTeam} from './formation';
import {decorateMenu,gameIcon} from './ui/icons';
import {RECRUIT_CATS} from './expansion';
import {scoutWave,COMBOS} from './scouting';
import {GameAccount,adultFromDate,mergeProgress,type CloudData} from './account';
import {publicConfig} from './public-config';
import {accountScreen,accountView,privacyScreen} from './ui/account-screen';
import {readCheckpoint,writeCheckpoint,clearCheckpoint,storeCheckpoint,validateCheckpoint} from './checkpoint';
import * as screens from './ui/screens';
import {artReady} from './art';
import {SKILLS} from './skills';
import './style.css';
import './combat-ui.css';
import './mobile-hub.css';
import './menu-dark.css';
import { CATS, CHAPTERS, COMMON, ENEMIES, H, LEVELS, STEP, W, waveFor } from './data';
import { command, createState, dist, previewWave, refund, stats, step, upgradeCost } from './simulation';
import { completed, fresh, load, persist, recordWin, starsFor, totalStars, validateSave,setSaveScope } from './persistence';
import { drawCat,portrait, Renderer, thumbnail } from './render';
import type {TdRenderer} from './td-scene';
type BattleRenderer = Renderer | TdRenderer;
import { AudioManager } from './audio';
import { PeerSession, validCommandPacket, validName } from './network';
import type { Ability, CatKind, Command, Point, State } from './types';
installGameTouchGuard();
const app = document.querySelector<HTMLDivElement>('#app')!;
const receivedInvite=new URLSearchParams(location.hash.slice(1)).get('convite');if(receivedInvite&&/^[a-f0-9]{48}$/.test(receivedInvite)){sessionStorage.setItem('mb-invite',receivedInvite);accountView.tab='register';history.replaceState({},'',location.pathname+location.search);}
let save = load(), screen = 'account', state: State | null = null, renderer: BattleRenderer | null = null, selected: number | null = null, preview: CatKind | null = null, aim: Point | null = null, aiming = false;
let chosenLevel = 1, chosenMode: State['mode'] = 'campaign', team: CatKind[] = ['archer', 'ice'], resultShown = false, lastTime = 0, acc = 0, lastHud = 0, lastSnapshot = 0, lastAudioKills = 0;
let peer: PeerSession | null = null, localPlayer = 0, remoteName = 'À espera de companhia', remoteTeam: CatKind[] = ['archer', 'ice', 'bomber'], remoteReady = false, localReady = false, networkStatus = '', manualOutput = '', manualStep = '', oldRemoteTick = -1;
let dialog = '', muted = false, networkPaused = false, wasPaused = false;
let toastTimer = 0;
let menuRenderer: Renderer | null = null, menuState: State | null = null, lastMenuDraw = 0;
let dragging: {
    kind: CatKind;
    pointer: number;
    active: boolean;
    x: number;
    y: number;
} | null = null;
let dockChoice: CatKind | null = null;let dockPage=0;
let remotePrefsSent=false;let remoteAdmin=false;const adminPrefs={money:false,life:false};
let announcementText='',announcementUntil=0;
let scoutAutoPause=false;let scoutPage=0;
let inspectorCoins = -1;let aimingSkill:Ability='yarn';
let guestAccess=false;const account=new GameAccount();let registrationDraft:{email:string;password:string}|null=null;let lastCheckpointCompleted=-1;
const audio = new AudioManager(() => muted ? { ...save.settings, effects: 0, music: 0 } : save.settings);
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const stars = (n: number) => `<span class="stars" aria-label="${n} estrelas">${'★'.repeat(n)}<span>${'☆'.repeat(3 - n)}</span></span>`;
const icon = (name: string) => ({ paw: '✦', coin: '◉', heart: '♥', arrow: '↗', play: '▶', pause: 'Ⅱ', close: '×', back: '←', settings: '⚙', shield: '♜', spark: '✧' }[name] || name);
const button = (label: string, action: string, cls = '', disabled = false) => `<button class="${cls}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
function toast(message: string) { document.querySelector('#toast')?.remove(); const el = document.createElement('div'); el.id = 'toast'; el.role = 'status'; el.textContent = message; document.body.append(el); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => el.remove(), 4200); }
function store(){if(!persist(save))toast('Não foi possível guardar. Exporta o progresso nas definições.');queueCloud();}
function rememberFormation(coop=false){const previous=save.formation||{team:['archer','ice'] as CatKind[],coopTeam:['archer','ice','bomber'] as CatKind[],updatedAt:0};save.formation={team:coop?previous.team:[...team],coopTeam:coop?[...team]:previous.coopTeam,updatedAt:Date.now()};store();}
function cloudData(){return {progress:save,checkpoint:readCheckpoint()};}
function applyCloud(data:CloudData){save=mergeProgress(save,data.progress);persist(save);if(screen!=='game')storeCheckpoint(data.checkpoint);}
function queueCloud(){account.queue(cloudData,applyCloud);}
function saveSafePoint(){if(!state||guestAccess)return;lastCheckpointCompleted=state.completed;if(peer||state.players.length!==1||!['campaign','chaos','endless'].includes(state.mode))return;const cp=writeCheckpoint(state);if(cp)queueCloud();else toast('Não foi possível guardar a recuperação neste dispositivo.');}
account.onStatus=()=>{const el=document.getElementById('sync-status');if(el)el.textContent=account.status;};
account.onUser=(user,recovery)=>{void (async()=>{if(farmStop){farmStop();farmStop=null;}if(huntStop){huntStop();huntStop=null;}if(peer){peer.close();peer=null;}state=null;if(user)guestAccess=false;setSaveScope(user?.id||null,guestAccess);save=load();account.admin=false;adminPrefs.money=false;adminPrefs.life=false;if(recovery){accountView.tab='password';setScreen('account');return;}if(user){account.status='A recuperar o progresso da conta…';if(screen==='account')render();try{const remote=await account.pull();await account.checkAdmin();const cp=readCheckpoint();applyCloud({...remote,checkpoint:cp&&(!remote.checkpoint||cp.savedAt>remote.checkpoint.savedAt)?cp:remote.checkpoint});account.status='Progresso da conta recuperado';queueCloud();}catch(error){toast(error instanceof Error?error.message:'A cópia local continua disponível.');}}if(screen!=='privacy'){if(account.user&&location.hash.startsWith('#quinta='))await beginFarm(location.href);else setScreen(account.user||guestAccess?(location.hash.startsWith('#sala=')?'coop':'home'):'account');}})();};
function header() { return `<header class="site-header app-header">${button('← Menu', 'home', 'secondary')}<div class="brand"><img class="brand-emblem" src="/icon.svg" alt=""><span>Muralhas <em>&</em> Bigodes<small>A ORDEM DO NOVELO</small></span></div><span class="star-total">✦ ${totalStars(save)} <small>/ ${LEVELS.length*3}</small></span>${button('⛶', 'fullscreen', 'icon-button')}</header>`; }
function footer() { return ''; }
// Dev server only: ?devgame=N opens level N without an account, for layout checks on phone sizes.
const DEV_GUEST = import.meta.env.DEV && ['devgame','devscreen','devfarm'].some(k=>new URLSearchParams(location.search).has(k));
function setScreen(next: string) {if(!['account','privacy'].includes(next))registrationDraft=null;screen = next; dialog = ''; renderer?.dispose(); renderer = null; render(); }
function render() {
    if(!account.user&&!guestAccess&&!DEV_GUEST&&!['account','privacy'].includes(screen)){screen='account';}
    if (screen === 'game') {
        renderGame();
        return;
    }
    let content = '';
    if(screen==='account')content=accountScreen(account);
    if(screen==='privacy')content=privacyScreen();
    if (screen === 'home')
        content = `<main class="title-screen mobile-game-hub"><div class="menu-scenery"><canvas id="home-art" aria-label="Cenário animado do jogo"></canvas></div><div class="title-vignette"></div><div class="hub-top"><span>CRÓNICAS DA VIGÍLIA</span>${button(gameIcon('account')+'<span class="hub-sr">A minha conta</span>','account','hub-icon')}${button(gameIcon('settings')+'<span class="hub-sr">Definições</span>','settings','hub-icon')}</div><section class="title-menu"><h1 class="brand-title"><span class="dungeon-wordmark"><small>DUNGEON</small>NIGHTREIGN</span></h1><nav class="main-menu" aria-label="Escolher modo de jogo">${button('<span class="hub-mode-art">♜</span><span class="hub-mode-copy"><small>A CIDADE PRECISA DE PATAS</small><strong>Tower Defense</strong><em>'+ (readCheckpoint()?'Retomar defesa':completed(save)?'Continuar aventura':'Começar aventura')+'</em></span><b>▶</b>',readCheckpoint()?'resume-choice':'continue','hub-mode hub-tower')}${button('<span class="hub-mode-art hub-night">☾</span><span class="hub-mode-copy"><small>COMBATE & CHEFES EM 3D</small><strong>Dungeon Nightreign</strong><em>Enfrenta a noite</em></span><b>▶</b>','night-menu','hub-mode hub-nightreign')}${button('<span class="hub-mode-art hub-farm">♧</span><span class="hub-mode-copy"><small>AMIGOS, DISFARCES & BARRACO</small><strong>Quinta do Caos</strong><em>Entra no pasto</em></span><b>▶</b>','farm-menu','hub-mode hub-chaos')}</nav><div class="hub-shortcuts">${button('Mapa','campaign')}${button('Dupla','coop')}${button('Mais','hub-more')}</div><p class="menu-save">${guestAccess?'CONVIDADO · progresso temporário':totalStars(save)+' estrelas · '+completed(save)+' fases concluídas'}</p></section><div class="hub-bottom">PRIVADO · SEM COMPRAS</div></main>`;
    if (screen === 'campaign')
        content = screens.campaign(save);
    if (screen === 'briefing')
        content = briefing();
    if (screen === 'help')
        content = screens.help();
    if (screen === 'settings')
        content = settings();
    if (screen === 'coop')
        content = coopScreen();
    if (screen === 'lobby')
        content = lobby();
    app.innerHTML = (['home','account','lobby'].includes(screen) ? '' : header()) + content + footer() + `<div id="modal-root"></div>`;
    decorateMenu(app);
    if (screen === 'home') {
        menuRenderer = new Renderer(document.querySelector<HTMLCanvasElement>('#home-art')!);
        menuState = createState(1, 'endless', [['archer', 'ice', 'bomber', 'commander']]);
        menuState.players[0].coins = 4000;
        for (const [spot, kind] of [[3, 'archer'], [6, 'ice'], [8, 'bomber'], [11, 'archer'], [2, 'archer'], [5, 'bomber'], [9, 'commander']] as [
            number,
            CatKind
        ][]) {
            command(menuState, 0, { type: 'build', spot, kind });
            const t = menuState.towers.at(-1)!;
            command(menuState, 0, { type: 'upgrade', id: t.id });
        }
        command(menuState, 0, { type: 'wave' });
    }
    else {
        menuRenderer = null;
        menuState = null;
    }
}
function briefing() { return screens.briefing(save, team, chosenLevel, chosenMode); }
function settings() { return screens.settings(save); }
function getConfig() { try {
    return { url: import.meta.env.VITE_SIGNAL_URL || localStorage.getItem('mb-signal-url') || publicConfig.supabaseUrl, key: import.meta.env.VITE_SIGNAL_KEY || localStorage.getItem('mb-signal-key') || publicConfig.supabaseKey };
}
catch {
    return { url: '', key: '' };
} }
function coopScreen() { const markup=screens.coop(getConfig(), location.hash.startsWith('#sala=') ? location.href : '');return nightMode?markup.replace('<h1>Cooperativo</h1>','<h1>Dungeon Nightreign</h1>'):markup; }
function lobby() { const markup=screens.lobby({ host: localPlayer === 0, connected: !!peer?.connected, name: peerName, remoteName, ready: localReady, remoteReady, team, status: networkStatus, step: manualStep, output: manualOutput },save,chosenLevel);return nightMode?markup.replace('Sala da Ordem','Dungeon Nightreign').replace('A tua equipa está guardada.','Garra Lunar e Astral estão preparados.').replace('Começar partida ▶','Iniciar caçada ▶')+'<style>.room-selection,.room-team,.room-cat-pages,.room-rule{display:none!important}</style>':markup; }
let peerName = 'Bigodes';
let farmStop:(()=>void)|null=null;
async function beginFarm(invite?:string){if(farmStop)return;hideDialog();const {launchFarm}=await import('./farm');screen='farm';state=null;menuState=null;app.style.visibility='hidden';farmStop=launchFarm({identity:account.user?.id,name:account.user?.email?.split('@')[0]||'Bigodes',invite,progress:save.farm,onProgress:p=>{save.farm=p;store();},onExit:()=>{farmStop=null;app.style.visibility='';setScreen('home');}});}
let nightMode=false, huntStop:(()=>void)|null=null;
async function beginHunt(training=false){if(huntStop)return;hideDialog();const session=training?null:peer;const {launchHunt}=await import('./hunt');if(!training&&(!session||session!==peer||!session.connected))return;screen='hunt';state=null;menuState=null;app.style.visibility='hidden';try{huntStop=launchHunt(session,()=>{huntStop=null;app.style.visibility='';peer?.close();peer=null;nightMode=false;if(location.hash.startsWith('#sala='))history.replaceState({},'',location.pathname+location.search);setScreen('home');},kind=>audio.hunt(kind));}catch(error){app.style.visibility='';setScreen('home');toast(error instanceof Error?error.message:'Não foi possível iniciar o 3D.');}}
function dockMarkup(){if(!state)return '';const all=state.players[localPlayer].team,pages=Math.ceil(all.length/5);dockPage=Math.min(dockPage,pages-1);return all.slice(dockPage*5,dockPage*5+5).map(k=>`<button class="dock-cat" data-cat="${k}" data-action="dock:${k}" title="${CATS[k].name} · ${CATS[k].cost} moedas"><img src="${portrait(k)}" alt="${CATS[k].short}"><small class="dock-name">${CATS[k].short}</small><span>${CATS[k].cost} ◉</span></button>`).join('')+(pages>1?button('⇄<small>'+ (dockPage+1)+'/'+pages+'</small>','dock-page','dock-pager'):'');}
function renderGame() {
    if (!state)
        return;
    const l = LEVELS[state.levelId - 1];
    app.innerHTML = `<div class="game-shell"><header class="game-header">${button('←', 'exit', 'icon-button')}<div class="game-title"><span>FASE ${String(l.id).padStart(2, '0')} ${state.mode === 'coop' ? '· DUAS PATAS EXTRAS' : ''}</span><strong>${l.name}</strong></div><div class="hud-stat"><span>♥</span><b id="hp">100</b><small>REFÚGIO</small></div><div class="hud-stat gold"><span>◉</span><b id="coins">0</b><small>MOEDAS</small></div><div class="hud-stat"><b id="wave">0 / 10</b><small>ONDAS</small></div><div class="game-tools">${button('1×', 'speed', 'compact')}${button('Ⅱ', 'pause', 'compact')}${button(gameIcon('settings'),'battle-tools','compact battle-tools-open')}</div></header><main class="battle-layout"><section class="battlefield"><div class="battle-caption"><span id="phase-label">PREPARA AS DEFESAS</span><span id="enemy-count">0 inimigos</span></div><div class="canvas-wrap"><canvas id="battle-canvas" tabindex="0" aria-label="Campo de batalha. Toca numa posição marcada com mais para construir."></canvas></div><div class="battle-message" id="announcement" role="status"></div><div id="tutorial"></div><aside id="inspector" class="inspector" hidden></aside></section></main><footer class="battle-footer"><div class="cat-dock" aria-label="Arrasta um gato para construir">${dockMarkup()}</div><div class="ability-bar"><button data-action="skill:yarn" class="ability" title="145 de dano mágico numa área de 110; recarga 38 s">${gameIcon("yarn")}<small id="cd-yarn">Novelos</small></button><button data-action="skill:${state.players[localPlayer].skills[1]}" class="ability">${gameIcon(state.players[localPlayer].skills[1])}<small id="cd-secondary">Pronto</small></button><button data-action="skill:uia" id="uia-button" class="ability legendary-ability" hidden>${gameIcon("uia")}<small id="cd-uia">Uia</small></button></div><div class="next-wave"><button id="wave-preview" data-action="scout" class="scout-button" aria-label="Ver próxima onda e combinações de equipa">${gameIcon("scout")}<small>Espiar</small></button>${button('Iniciar onda <span>▶</span>', 'wave', 'primary')}</div></footer></div><div id="modal-root"></div><div class="rotate-overlay"><span>↻</span><h2>Mais espaço para os bigodes.</h2><p>Roda o dispositivo para jogar na horizontal.</p></div>`;
    renderer?.dispose();
    renderer = new Renderer(document.querySelector<HTMLCanvasElement>('#battle-canvas')!);
    upgradeRenderer();
    document.querySelector<HTMLElement>('.battlefield')!.style.setProperty('--battle-bg',`url('${thumbnail(l)}')`);
    selected = null;
    preview = null;
    aim = null;
    aiming = false;
    document.querySelector('#battle-canvas')!.addEventListener('pointerup', canvasPointer);
    renderInspector();
    updateHud();
    if (state.levelId === 1 && state.mode === 'campaign' && !save.stars[1])
        document.querySelector('#tutorial')!.innerHTML = `<div class="tutorial"><b>A tua primeira muralha</b><p>Arrasta um gato da barra para um +.<br>Larga para construir. Toca no gato para melhorar.<br>Também podes escolher um gato e tocar no +.</p>${button('Já percebi ×', 'tutorial-close', 'text-button')}</div>`;
}
/** Swaps the 2D battlefield for the 3D hex battlefield once its models are loaded; the 2D view stays as fallback. */
function upgradeRenderer() {
    const flat = renderer, wrap = document.querySelector<HTMLElement>('.canvas-wrap');
    if (!(flat instanceof Renderer) || !wrap || new URLSearchParams(location.search).has('2d'))
        return;
    void import('./td-scene').then(({ TdRenderer }) => {
        if (renderer !== flat || screen !== 'game')
            return;
        const canvas = document.createElement('canvas');
        canvas.className = 'battle-3d';
        Object.assign(canvas.style, { position: 'absolute', inset: '0', visibility: 'hidden', touchAction: 'none' });
        wrap.append(canvas);
        let td: TdRenderer;
        const revert = () => { if (renderer === td) { renderer = flat; flat.canvas.style.display = ''; flat.canvas.id = 'battle-canvas'; } td?.dispose(); canvas.remove(); };
        try { td = new TdRenderer(canvas, revert); }
        catch { canvas.remove(); return; }
        void td.ready.then(() => {
            if (renderer !== flat || screen !== 'game') { td.dispose(); canvas.remove(); return; }
            flat.canvas.style.display = 'none';
            flat.canvas.removeAttribute('id');
            canvas.id = 'battle-canvas';
            canvas.style.visibility = '';
            canvas.addEventListener('pointerup', canvasPointer);
            td.onView = placeInspector;
            renderer = td;
            placeInspector();
        }, () => {});
    }, () => {});
}
function renderInspector(){
 if(!state)return;const el=document.querySelector<HTMLElement>('#inspector');if(!el)return;
 el.hidden=selected===null&&!aiming;if(el.hidden)return;
 const p=state.players[localPlayer],t=state.towers.find(t=>t.spot===selected);
 const close=button('×','cancel','icon-button');let html='';
 if(aiming){const skill=SKILLS[aimingSkill];html=`<div class="popover-heading"><b>${skill.name}</b>${close}</div><p class="skill-description">${skill.description}</p><p class="aim-hint">Toca no mapa para apontar.</p>${button('Confirmar aqui','confirm-yarn','primary wide',!aim)}`;}
 else if(t){const st=stats(t,state),own=t.owner===localPlayer;const support=['commander','bard','guardian'].includes(t.kind)?state.towers.filter(other=>other.id!==t.id&&dist(LEVELS[state!.levelId-1].spots[t.spot],LEVELS[state!.levelId-1].spots[other.spot])<=st.range).length:null;html=`<div class="popover-heading"><img src="${portrait(t.kind,t.level)}" alt=""><div><b>${CATS[t.kind].short}</b><small>NÍVEL ${t.level}${t.branch?' · '+t.branch.toUpperCase():''}</small></div>${close}</div><div class="popover-stats"><span><b>${Math.round(st.damage)}</b> dano</span><span><b>${Math.round(st.range)}</b> alcance</span><span><b>${st.interval.toFixed(2)} s</b> base</span></div>${support===null?'':'<p class="support-readout">'+support+' aliados no alcance · '+(t.kind==='commander'?'cadência extra':t.kind==='bard'?'dano extra':'+10% alcance')+'</p>'}${own?`${t.level===1?button('Melhorar · '+upgradeCost(t)+' ◉','upgrade','primary wide',!p.infiniteMoney&&p.coins<upgradeCost(t)):t.level===2?(t.kind==='uia'?button('Supremo Uia · '+upgradeCost(t)+' ◉','upgrade:a','primary wide',!p.infiniteMoney&&p.coins<upgradeCost(t)):`<div class="compact-upgrades">${button(CATS[t.kind].a+' · '+upgradeCost(t)+' ◉','upgrade:a','secondary',!p.infiniteMoney&&p.coins<upgradeCost(t))}${button(CATS[t.kind].b+' · '+upgradeCost(t)+' ◉','upgrade:b','secondary',!p.infiniteMoney&&p.coins<upgradeCost(t))}</div>`):'<p class="max-level">✦ Especialização concluída</p>'}<div class="popover-actions"><select id="priority" aria-label="Prioridade"><option value="first" ${t.priority==='first'?'selected':''}>Primeiro</option><option value="strong" ${t.priority==='strong'?'selected':''}>Mais forte</option><option value="near" ${t.priority==='near'?'selected':''}>Próximo</option></select>${button('Vender · '+refund(t)+' ◉','sell','secondary')}</div>`:'<p class="skill-description">Defesa do aliado. O apoio beneficia os dois.</p>'}`;}
 else if(selected!==null){html=`<div class="popover-heading"><b>Escolhe a guarda</b>${close}</div><div class="popover-shop">${p.team.map(k=>`<button data-action="quickbuild:${k}" class="cat-choice" ${!p.infiniteMoney&&p.coins<CATS[k].cost?'disabled':''}><img src="${portrait(k)}" alt=""><strong>${CATS[k].short}</strong><small>${CATS[k].cost} ◉</small></button>`).join('')}</div>`;}
 el.innerHTML=html;placeInspector();
}
function nearestSpot(clientX: number, clientY: number) {
    if (!renderer || !state)
        return null;
    const r = renderer.canvas.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom)
        return null;
    const view = renderer, nearest = LEVELS[state.levelId - 1].spots.map((v, i) => { const q = view.screen(v); return { i, d: Math.hypot(q.x - clientX, q.y - clientY) }; }).sort((a, b) => a.d - b.d)[0];
    return nearest.d < 32 ? nearest.i : null;
}
function canvasPointer(event: Event) {
    const e = event as PointerEvent;
    if (!renderer || !state || ('dragged' in renderer && renderer.dragged))
        return;
    audio.unlock();
    const p = renderer.point(e.clientX, e.clientY);
    if (aiming) {
        aim = p;
        renderInspector();
        return;
    }
    const spot = nearestSpot(e.clientX, e.clientY);
    if (spot !== null && dockChoice && !state.towers.some(t => t.spot === spot)) {
        dispatch({ type: 'build', spot, kind: dockChoice });
        dockChoice = null;
        preview = null;
        selected = null;
        updateDock();
        renderInspector();
        return;
    }
    selected = spot;
    preview = null;
    dockChoice = null;
    updateDock();
    renderInspector();
}
function placeInspector() {
    if (!renderer || !state)
        return;
    const el = document.querySelector<HTMLElement>('#inspector'), field = document.querySelector<HTMLElement>('.battlefield');
    if (!el || !field || el.hidden)
        return;
    const r = renderer.canvas.getBoundingClientRect(), fr = field.getBoundingClientRect();
    const pos = selected === null ? { x: W / 2, y: H / 2 } : LEVELS[state.levelId - 1].spots[selected];
    const q = renderer.screen(pos), x = q.x - fr.left, y = q.y - fr.top, width = el.offsetWidth, height = Math.min(el.offsetHeight, fr.height - 20);
    let left = x + 34;
    if (left + width > fr.width - 12)
        left = x - width - 34;
    el.style.left = Math.max(10, Math.min(fr.width - width - 10, left)) + 'px';
    el.style.top = Math.max(10, Math.min(fr.height - height - 10, y - height / 2)) + 'px';
}
function updateDock() {
    if (!state)
        return;
    const coins = state.players[localPlayer].infiniteMoney?1000000000:state.players[localPlayer].coins;
    for (const b of document.querySelectorAll<HTMLButtonElement>('.dock-cat')) {
        const k = b.dataset.cat as CatKind;
        b.classList.toggle('dock-selected', dockChoice === k);
        b.classList.toggle('unaffordable', coins < CATS[k].cost);
        b.setAttribute('aria-pressed', String(dockChoice === k));
    }
    if (Math.floor(coins) !== inspectorCoins) {
        inspectorCoins = Math.floor(coins);
        for (const b of document.querySelectorAll<HTMLButtonElement>('#inspector [data-action="build"],#inspector [data-action^="upgrade"]')) {
            const t = state.towers.find(t => t.spot === selected);
            b.disabled = b.dataset.action === 'build' ? !!preview && coins < CATS[preview].cost : !!t && coins < upgradeCost(t);
        }
    }
}
let skipDockClickUntil = 0;
function clearDrag() { dragging = null; document.getElementById('drag-ghost')?.remove(); document.body.classList.remove('placing-cat'); }
app.addEventListener('pointerdown', e => {
    const el = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cat]');
    if (el && state && screen === 'game' && !state.paused) {
        audio.unlock();
        dragging = { kind: el.dataset.cat as CatKind, pointer: e.pointerId, active: false, x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
    }
    else {
        const quick = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action^="quickbuild:"]');
        if (quick) {
            preview = quick.dataset.action!.split(':')[1] as CatKind;
        }
    }
});
app.addEventListener('pointermove', e => {
    if (!dragging || dragging.pointer !== e.pointerId || !renderer || !state)
        return;
    if (!dragging.active && Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) < 7)
        return;
    dragging.active = true;
    document.body.classList.add('placing-cat');
    preview = dragging.kind;
    dockChoice = null;
    aiming = false;
    const spot = nearestSpot(e.clientX, e.clientY);
    selected = spot !== null && !state.towers.some(t => t.spot === spot) ? spot : null;
    const inspector = document.querySelector<HTMLElement>('#inspector');
    if (inspector)
        inspector.hidden = true;
    let ghost = document.getElementById('drag-ghost');
    if (!ghost) {
        ghost = document.createElement('div');
        ghost.id = 'drag-ghost';
        ghost.innerHTML = `<img src="${portrait(dragging.kind)}" alt=""><span></span>`;
        document.body.append(ghost);
    }
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    ghost.classList.toggle('valid-drop', selected !== null);
    ghost.querySelector('span')!.textContent = selected === null ? 'Arrasta para um +' : `Larga · ${CATS[dragging.kind].cost} ◉`;
    e.preventDefault();
});
app.addEventListener('pointerup', e => {
    if (!dragging || dragging.pointer !== e.pointerId)
        return;
    if (dragging.active) {
        skipDockClickUntil = performance.now() + 400;
        const kind = dragging.kind, spot = selected;
        clearDrag();
        if (spot !== null)
            dispatch({ type: 'build', spot, kind });
        selected = null;
        preview = null;
        renderInspector();
        updateDock();
    }
    else {
        const kind = dragging.kind;
        clearDrag();
        skipDockClickUntil = performance.now() + 400;
        dockChoice = kind;
        preview = kind;
        selected = null;
        updateDock();
        renderInspector();
    }
});
app.addEventListener('pointercancel', () => { if (dragging) {
    clearDrag();
    selected = null;
    preview = null;
    renderInspector();
} });
window.addEventListener('resize', () => { if (screen === 'game')
    requestAnimationFrame(placeInspector); });
function dispatch(c: Command) { if (!state)
    return; if (peer && localPlayer === 1) {
    peer.send({ type: 'command', command: c });
    return;
} const error = command(state, localPlayer, c); if (error) {
    toast(error);
    return;
} if (c.type === 'build')
    audio.play('buy'); if (c.type === 'upgrade')
    audio.play('upgrade'); if (c.type === 'ability')
    audio.play('ability'); if (c.type === 'sell')
    selected = null; renderInspector(); updateHud(); if (peer)
    peer.snapshot(state);if(!state.active.length)saveSafePoint(); }
function updateHud() {
    if (screen !== 'game' || !state)
        return;
    const s = state, p = s.players[localPlayer];
    const set = (id: string, value: string) => { const el = document.getElementById(id); if (el && el.textContent !== value)
        el.textContent = value; };
    set('hp', `${Math.ceil(s.hp)}`);
    set('coins',p.infiniteMoney?'∞':`${Math.floor(p.coins)}`);
    set('wave', `${s.wave} / ${s.mode === 'endless' ? '∞' : LEVELS[s.levelId - 1].waves.length}`);
    set('enemy-count', `${s.enemies.length} ${s.enemies.length === 1 ? 'inimigo' : 'inimigos'}`);
    set('phase-label',s.adminUsed?'ADMIN · SEM ESTRELAS': s.paused ? 'PAUSA' : s.active.length ? 'A DEFENDER O BAIRRO' : s.wave ? `PRÓXIMA ONDA EM ${Math.max(0, Math.ceil(s.prep))} s` : 'PREPARA AS DEFESAS');
    if(announcementText!==s.announcement){announcementText=s.announcement;announcementUntil=performance.now()+6500;}set('announcement',s.announcement);document.getElementById('announcement')?.classList.toggle('message-hidden',!s.announcement||performance.now()>announcementUntil);
    document.querySelector('#wave-preview')?.setAttribute('title',previewWave(s));
    const btn = document.querySelector<HTMLButtonElement>('[data-action="wave"]');
    if (btn) {
        const max = s.wave >= LEVELS[s.levelId - 1].waves.length && s.mode !== 'endless';
        btn.disabled = max || s.active.length >= 2 || s.paused;
        btn.innerHTML=gameIcon('continue')+'<span>'+(max?'FINAL':s.active.length?'ANTECIPAR':'DEFENDER')+'</span>';btn.setAttribute('aria-label',max?'Última onda':s.active.length?'Antecipar onda: mais 15 moedas':'Iniciar onda');
    }
    for (const [skill, id] of [['yarn', 'cd-yarn'], [p.skills[1], 'cd-secondary'], ['uia', 'cd-uia']] as [
        Ability,
        string
    ][]) {
        set(id,p.cds[skill]>0?Math.ceil(p.cds[skill])+' s':({yarn:'Novelos',war:'Inspirar',heal:'Curar',box:'Caixa',sardine:'Isca',uia:'Uia'})[skill]);
        const b = document.querySelector<HTMLButtonElement>(`[data-action="skill:${skill}"]`);
        if (b){b.disabled = p.cds[skill] > 0 || s.paused;b.style.setProperty('--cooldown',String(Math.min(1,p.cds[skill]/SKILLS[skill].cooldown)));}
    }
    const ub = document.getElementById('uia-button');
    if (ub)
        ub.hidden = !s.towers.some(t => t.kind === 'uia' && t.owner === localPlayer);
    updateDock();
    const speed = document.querySelector('[data-action="speed"]');
    if (speed)
        speed.textContent = s.speed + '×';
    const pause = document.querySelector('[data-action="pause"]');
    if (pause)
        pause.textContent = s.paused ? '▶' : 'Ⅱ';
}
function showDialog(html: string) { dialog = html; document.querySelector('#modal-root')!.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true">${html}</section></div>`; }
function hideDialog() { if(scoutAutoPause){scoutAutoPause=false;if(state&&state.mode!=='coop')state.paused=false;}dialog = ''; const m = document.querySelector('#modal-root'); if (m)
    m.innerHTML = ''; }
function startGame(coop = false) {
    if (!coop) {
        localPlayer = 0;
        const available = team.filter(k => CATS[k].unlock <= completed(save)).slice(0, TEAM_LIMIT);
        if (completed(save) >= 3)
            available.push('uia');
        state = createState(chosenLevel, chosenMode, [available], save.skill, save.equipment);state.players[0].admin=account.admin;if(account.admin){if(adminPrefs.money)command(state,0,{type:'admin',option:'money',enabled:true});if(adminPrefs.life)command(state,0,{type:'admin',option:'life',enabled:true});}
    }
    selected = null;
    preview = null;
    aim = null;
    resultShown = false;
    acc = 0;
    lastAudioKills = 0;
    lastTime = performance.now();
    screen = 'game';
    lastCheckpointCompleted=state!.completed;renderGame();if(!coop)saveSafePoint();
}
function finish() {
    if (!state || resultShown)
        return;
    resultShown = true;
    const s = state;
    if(s.players.length===1&&s.mode!=='coop'){clearCheckpoint();queueCloud();}
    let earnedStars = 0;
    if (!s.adminUsed && s.mode === 'campaign' && s.status === 'won') {
        recordWin(save, s.levelId, s.hp, s.maxHp);
        earnedStars = starsFor(s.hp, s.maxHp);
        store();
    }
    if (!s.adminUsed && s.mode === 'chaos' && s.status === 'won') {
        recordWin(save, s.levelId, s.hp, s.maxHp, true);
        earnedStars = starsFor(s.hp, s.maxHp);
        store();
    }
    if (!s.adminUsed && s.mode === 'endless') {
        save.records[s.levelId] = Math.max(save.records[s.levelId] || 0, s.completed);
        store();
    }
    audio.play(s.status === 'won' ? 'win' : 'lose');
    const unlock = !s.adminUsed && s.status === 'won' && s.mode === 'campaign' ? COMMON.filter(k => CATS[k].unlock === s.levelId) : [];
    showDialog(`<div class="result-emblem">${s.status === 'won' ? '✦' : '♜'}</div><div class="eyebrow">${s.adminUsed?'ADMIN · SEM ESTRELAS OU RECORDES':s.mode === 'coop' ? 'A ORDEM, EM CONJUNTO' : 'CADERNO DA ORDEM'}</div><h2>${s.status === 'won' ? 'O bairro é nosso.' : 'Os bigodes voltam já.'}</h2><p>${s.status === 'won' ? 'Hoje, os ratos jantam noutro sítio.' : 'Uma retirada estratégica. Com uma sesta pelo meio.'}</p>${earnedStars ? stars(earnedStars) : ''}<div class="result-stats"><div><b>${s.kills}</b><small>DERROTADOS</small></div><div><b>${s.completed}</b><small>ONDAS</small></div><div><b>${Math.ceil(s.hp)}%</b><small>REFÚGIO</small></div></div>${unlock.map(k => `<p class="unlock">✦ ${CATS[k].name} juntou-se à Ordem!</p>`).join('')}${!s.adminUsed && s.levelId === 3 && s.status === 'won' && s.mode === 'campaign' ? `<img class="unit-portrait" src="${portrait('uia', 3)}" alt="Supremo Uia"><p class="dialogue">O bruxo termina a reclamação. Um gato tigrado entra, olha para todos e começa a girar.<br><strong>Supremo Uia desbloqueado.</strong></p>` : ''}${s.mode === 'coop'||s.mode==='practice' ? button('Sair da sala', 'leave-coop', 'primary wide') : `${s.status === 'won' && s.levelId < LEVELS.length && s.mode !== 'endless' ? button('Próximo bairro ↗', 'next-level', 'primary wide') : ''}${button('Tentar outra vez', 'retry', 'secondary wide')}${button('Voltar à campanha', 'campaign', 'text-button')}`}`);
}
function makePeer(host: boolean) {
    if (peer)
        peer.close();
    peer = new PeerSession();remoteAdmin=false;remotePrefsSent=false;
    localPlayer = host ? 0 : 1;
    peerName = validName((document.querySelector('#player-name') as HTMLInputElement)?.value);
    team = rememberedTeam(save,true);if(!team.length)team=['archer','ice','bomber'];
    remoteName = 'À espera de companhia';
    remoteReady = false;
    localReady = false;
    oldRemoteTick = -1;
    networkStatus = 'A preparar a ligação direta…';
    peer.onstatus = m => { networkStatus = m; if (screen === 'lobby')
        render(); if (screen === 'game' && state && localPlayer === 0) {
        if (m.includes('interrompida')) {
            wasPaused = state.paused;
            state.paused = true;
            networkPaused = true;
            state.announcement = m;
        }
        else if (networkPaused) {
            state.paused = wasPaused;
            networkPaused = false;
        }
    } };
    peer.onclose = reason => { networkStatus = reason; remoteReady = false; localReady = false; if (screen === 'game' && state) {
        state.paused = true;
        showDialog(`<div class="eyebrow">LIGAÇÃO TERMINADA</div><h2>A Ordem ficou<br><em>sem ligação.</em></h2><p>${esc(reason)}</p>${localPlayer === 0 ? button('Continuar a solo, com ambas as defesas', 'takeover', 'primary wide') : ''}${button('Voltar ao início', 'closed-home', 'secondary wide')}`);
    }
    else if (screen === 'lobby') {
        manualStep = '';
        manualOutput = '';
        render();
        toast(reason);
    } };
    peer.onmessage = receiveNetwork;
}
async function proveAdmin(){const session=peer;if(!session||!account.admin||localPlayer!==1)return;try{const proof=await account.adminProof(session.room);if(peer===session)session.send({type:'admin-proof',proof});}catch(error){toast(error instanceof Error?error.message:'Admin indisponível nesta sala.');}}
function applyRemoteAdminPrefs(){if(remotePrefsSent||!state||localPlayer!==1||!state.players[1].admin||!account.admin)return;remotePrefsSent=true;if(adminPrefs.money)dispatch({type:'admin',option:'money',enabled:true});if(adminPrefs.life)dispatch({type:'admin',option:'life',enabled:true});}
function sendProfile() { peer?.send({ type: 'profile', name: peerName, team, ready: localReady, night:nightMode }); }
function receiveNetwork(m: {
    type: string;
    [key: string]: unknown;
}) {
    if (m.type === 'connected') {void proveAdmin();
        manualStep = '';
        manualOutput = '';
        networkStatus = 'Ligação direta estabelecida · escolham a equipa';
        sendProfile();
        if (screen === 'lobby')
            render();
    }
    if(m.type==='admin-proof'&&localPlayer===0&&peer&&typeof m.proof==='string'&&m.proof.length===48){const session=peer;void account.consumeAdminProof(session.room,m.proof).then(allowed=>{if(peer!==session||!allowed)return;remoteAdmin=true;if(state?.mode==='coop'){state.players[1].admin=true;state.revision++;session.snapshot(state);}session.send({type:'admin-approved'});});return;}
    if(m.type==='admin-approved'&&localPlayer===1&&account.admin){toast('Modo admin validado para esta sala.');return;}
    if(m.type==='hunt-start'&&localPlayer===1&&nightMode&&localReady&&screen==='lobby'){void beginHunt();return;}
    if (m.type === 'profile') {
        if(localPlayer===1)nightMode=m.night===true;
        remoteName = validName(m.name);
        const rt = m.team;
        if (Array.isArray(rt) && rt.length >= 1 && rt.length <= TEAM_LIMIT && new Set(rt).size === rt.length && rt.every(k => COMMON.includes(k as CatKind)))
            remoteTeam = rt as CatKind[];
        else
            return;
        remoteReady = m.ready === true;
        if (screen === 'lobby')
            render();
    }
    if (m.type === 'start' && localPlayer === 1) {
        const s = m.state as State;
        if (validSnapshot(s) && s.mode === 'coop' && s.players.length === 2) {
            state = s;
            chosenLevel = s.levelId;
            oldRemoteTick = s.tick;
            startGame(true);applyRemoteAdminPrefs();
        }
    }
    if (m.type === 'snapshot' && localPlayer === 1 && screen === 'game') {
        const s = m.state as State;
        if (validSnapshot(s) && (s.tick > oldRemoteTick || s.tick === oldRemoteTick && s.revision >= (state?.revision || 0))) {
            const revision = state?.revision;
            state = s;applyRemoteAdminPrefs();
            oldRemoteTick = s.tick;
            if (revision !== s.revision)
                renderInspector();
            updateHud();
            if (s.status !== 'playing')
                finish();
        }
    }
    if (m.type === 'command' && localPlayer === 0 && screen === 'game' && state) {
        if (!validCommandPacket(m.command))
            return;
        const error = command(state, 1, m.command as Command);
        if (error)
            peer?.send({ type: 'error', message: error });
        else {
            renderInspector();
            updateHud();
            peer?.snapshot(state);
        }
    }
    if (m.type === 'error' && typeof m.message === 'string')
        toast(m.message.slice(0, 200));
}
function validSnapshot(s: State) { return !!s && s.version === 1 && Number.isInteger(s.levelId) && s.levelId >= 1 && s.levelId <= LEVELS.length && Array.isArray(s.players) && s.players.length === 2 && Array.isArray(s.enemies) && s.enemies.length <= 180 && Array.isArray(s.towers) && s.towers.length <= 24 && Array.isArray(s.projectiles) && Array.isArray(s.effects) && ['playing', 'won', 'lost'].includes(s.status) && Number.isFinite(s.tick); }
function showScout(){
 if(!state)return;const scout=scoutWave(state),pages=Math.max(1,Math.ceil((scout?.rows.length||0)/4)),combos=scoutPage>=pages;
 const content=combos?COMBOS.map(c=>`<article><strong>${c.name}</strong><small>${c.recipe}</small><p>${c.tip}</p></article>`).join(''):(scout?.rows.slice(scoutPage*4,scoutPage*4+4).map(r=>`<article><strong>${r.count} × ${r.name}</strong><small>ENTRADA ${r.paths.join(' + ')}</small><p>${r.tip}</p></article>`).join('')||'<article><strong>Última onda em curso</strong><p>Defende o refúgio. Os bigodes contam contigo.</p></article>');
 showDialog(`<div class="scout-heading"><span>CONSELHO DOS BIGODES</span><h2>${combos?'Combinações de equipa':'Onda '+(scout?.number||state.wave)}</h2><small>${combos?'Uma reação por alvo a cada 3 s.':scout?'Entradas '+scout.paths.join(' + ')+' · recompensa '+scout.reward+' ◉':''} · ${state.mode==='coop'?'EM DIRETO':'PAUSA TÁTICA'}</small></div><div class="scout-content">${content}</div><div class="scout-nav">${button('←','scout-page:'+Math.max(0,scoutPage-1),'secondary',scoutPage===0)}<span>${scoutPage+1} / ${pages+1}</span>${button('→','scout-page:'+Math.min(pages,scoutPage+1),'secondary',scoutPage===pages)}${button('Voltar à defesa','dialog-close','primary')}</div>`);
}
function showAdmin(){const inGame=screen==='game'&&state;const money=inGame?!!state!.players[localPlayer].infiniteMoney:adminPrefs.money,life=inGame?!!state!.invulnerable:adminPrefs.life;
 showDialog(`<div class="eyebrow">GABRIEL · LABORATÓRIO DE BIGODES</div><h2>Modo administrador</h2><p class="admin-note">Disponível em todos os modos. No cooperativo, a vida é partilhada; o dinheiro infinito é só teu. Partidas com ajudas não dão estrelas nem recordes.</p><div class="admin-controls">${button((life?'✓':'○')+' Vida protegida','admin-toggle:life',life?'primary':'secondary')}${button((money?'✓':'○')+' Dinheiro infinito','admin-toggle:money',money?'primary':'secondary')}</div><p class="admin-note">${inGame?'Aplica-se a esta partida.':'Estas opções aplicam-se às próximas partidas nesta sessão.'}</p>${button('Fechar','dialog-close','secondary wide')}`);
}
async function action(a: string) {
    const [key, value] = a.split(':');
    if(key==='hub-more'){showDialog(`<h2>À tua maneira</h2>${button('Modo infinito','endless','secondary wide',completed(save)<LEVELS.length)}${button('Como jogar','help','secondary wide')}${button('Definições','settings','secondary wide')}${button('Privacidade','privacy','secondary wide')}${button('Voltar','dialog-close','primary wide')}`);return;}
    if(key==='admin-panel'){if(!account.admin)throw Error('Modo reservado ao administrador.');showAdmin();return;}
    if(key==='admin-toggle'){if(!account.admin||!['money','life'].includes(value))throw Error('Modo reservado ao administrador.');const option=value as 'money'|'life';if(screen==='game'&&state){if(!state.players[localPlayer].admin)throw Error('A sala ainda está a validar o administrador. Aguarda um momento.');const enabled=option==='money'?!state.players[localPlayer].infiniteMoney:!state.invulnerable;dispatch({type:'admin',option,enabled});if(peer&&localPlayer===1){hideDialog();toast('Pedido enviado ao anfitrião.');return;}}else adminPrefs[option]=!adminPrefs[option];showAdmin();return;}
    if(key==='dock-page'&&state){dockPage=(dockPage+1)%Math.ceil(state.players[localPlayer].team.length/5);document.querySelector('.cat-dock')!.innerHTML=dockMarkup();updateDock();return;}
    if(key==='coop-edit'){screens.navigation.roomEdit=!screens.navigation.roomEdit;render();return;}
    if(key==='coop-help'){showDialog(`<h2>Uma sala, dois jogadores</h2><p>1. Um cria a sala e envia a ligação.<br>2. O outro abre a ligação e toca em Entrar.<br>3. Os dois confirmam a equipa com Estou pronto.<br>4. O criador toca em Começar partida.</p><p>Os dois precisam de conta autorizada. Se o criador sair, a sessão termina. Se a ligação falhar, não há cobrança; algumas redes bloqueiam a ligação direta. Experimentem ambos no mesmo Wi-Fi.</p>${button('Entendi','dialog-close','primary wide')}`);return;}
    if(key==='share-room'){const code=(document.querySelector('#manual-output') as HTMLInputElement)?.value;if(!code)return;if(typeof navigator.share==='function'){try{await navigator.share({title:'Joga comigo · Muralhas & Bigodes',text:'Entra na minha sala. Estou à tua espera!',url:code});}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))await action('copy-code');}}else await action('copy-code');return;}
    if(key==='roster-filter'){screens.navigation.rosterFilter=value;screens.navigation.catPage=0;render();return;}
    if(key==='suggest-team'){const rec=suggestTeam(save,chosenLevel,chosenMode==='chaos');showDialog(`<h2>Uma equipa para esta fase</h2><div class="suggested-team">${rec.team.map(k=>'<img src="'+portrait(k)+'" alt="'+CATS[k].short+'" title="'+CATS[k].short+'">').join('')}</div><p>${rec.reasons.join('<br>')}</p>${button('Usar esta equipa','accept-suggestion','primary wide')}${button('Manter a minha','dialog-close','text-button')}`);return;}
    if(key==='accept-suggestion'){team=suggestTeam(save,chosenLevel,chosenMode==='chaos').team;rememberFormation();hideDialog();render();return;}
    if(key==='swap-unit'){const [old,replacement]=value.split(',') as CatKind[];if(!team.includes(old)||!COMMON.includes(replacement)||team.includes(replacement))return;const coop=screen==='lobby';if(!coop&&CATS[replacement].unlock>completed(save))return;team=team.map(k=>k===old?replacement:k);rememberFormation(coop);if(coop)sendProfile();hideDialog();render();return;}
    if(key==='battle-tools'){if(state?.mode!=='coop'&&state&&!state.paused){state.paused=true;scoutAutoPause=true;}showDialog(`<h2>À tua maneira</h2><div class="combat-options">${button('⛶ Ecrã inteiro','fullscreen','secondary')}${button(muted?'Ativar som':'Silenciar','mute','secondary')}${account.admin?button('♛ Administrador','admin-panel','secondary'):''}</div><p class="combat-guide">Arrasta um aliado para uma base. Toca numa unidade para melhorar. Novelos: toca na habilidade e escolhe o alvo. Espiar mostra a próxima onda.</p>${button('Voltar à defesa','dialog-close','primary wide')}`);return;}
    if(key==='unit-info'){const k=value as CatKind;if(!CATS[k]||(RECRUIT_CATS.includes(k)&&CATS[k].unlock>completed(save)))return;showDialog(`<div class="unit-detail"><img src="${portrait(k,3)}" alt=""><div><small>${CATS[k].cost} ◉ · ${CATS[k].unlock?'APÓS FASE '+CATS[k].unlock:'INICIAL'}</small><h2>${CATS[k].name}</h2><p>${CATS[k].role}${movementRadius(k)?'<br>Avança até '+movementRadius(k)+' de distância e regressa à base.':''}</p><p><b>Especializações</b><br>${CATS[k].a}<br>${CATS[k].b}</p>${k==='adminMage'?'<p>Projétil → marca → raios (2 alvos) → meteoro. Um Admin por partida; sem poderes de administrador da conta.</p>':''}</div></div>${button('Voltar','dialog-close','primary wide')}`);return;}
    if(key==='sound-test'){audio.unlock();audio.comedy(value==='boom'?'boom':'bonk');return;}
    if(key==='scout'){if(!state)return;scoutAutoPause=state.mode!=='coop'&&!state.paused;if(scoutAutoPause)state.paused=true;scoutPage=0;showScout();return;}
    if(key==='scout-page'){scoutPage=Number(value);showScout();return;}
    if(key==='account'){setScreen('account');return;}
    if(key==='privacy'){setScreen('privacy');return;}
    if(key==='privacy-page'){accountView.policyPage=Number(value);render();return;}
    if(key==='account-tab'){accountView.tab=value;accountView.registerStep=0;registrationDraft=null;render();return;}
    const field=(id:string)=>(document.getElementById(id) as HTMLInputElement)?.value||'';
    if(key==='account-login'){await account.signIn(field('account-email'),field('account-password'),(document.getElementById('remember-account') as HTMLInputElement).checked);return;}
    if(key==='account-guest'){guestAccess=true;setSaveScope(null,true);save=fresh();state=null;setScreen('home');toast('Modo convidado · o progresso não fica guardado.');return;}
    if(key==='account-register-next'){const email=field('account-email').trim(),password=field('account-password');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<6)throw Error('Usa um email válido e uma palavra-passe com pelo menos 6 caracteres.');registrationDraft={email,password};accountView.registerStep=1;render();return;}
    if(key==='account-register-submit'){if(!registrationDraft)throw Error('Preenche primeiro os dados da conta.');const draft=registrationDraft;const accepted=(document.getElementById('account-privacy') as HTMLInputElement).checked;const birth=field('account-birth');if(!accepted||!adultFromDate(birth))throw Error('Confirma que tens 18 anos e leste a informação.');try{const connected=await account.register(draft.email,draft.password,birth,accepted);registrationDraft=null;accountView.registerStep=0;accountView.tab='login';render();toast(connected?'Conta criada.':'Abre o email de confirmação no mesmo navegador. A entrega pode demorar.');}finally{registrationDraft=null;}return;}
    if(key==='account-recover'){await account.recover(field('account-email'));toast('Se a conta existir e o envio estiver disponível, receberás um email.');return;}
    if(key==='account-password-submit'){if(field('new-password')!==field('repeat-password'))throw Error('As palavras-passe não coincidem.');await account.changePassword(field('new-password'));accountView.tab='login';render();toast('Palavra-passe atualizada.');return;}
    if(key==='account-sync'){const remote=await account.pull();applyCloud(remote);await account.flush(cloudData,applyCloud);render();return;}
    if(key==='account-logout'){await account.flush(cloudData,applyCloud);await account.signOut();return;}
    if(key==='account-export'){const payload={account:{id:account.user?.id,email:account.user?.email},progress:save,checkpoint:readCheckpoint(),privacyVersion:publicConfig.privacyVersion};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='bigodes-meus-dados.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
    if(key==='account-delete'){showDialog(`<h2>Apagar a conta e os dados?</h2><p>Esta ação elimina a conta e o progresso ativo na nuvem. Não pode ser desfeita. Exporta antes se quiseres uma cópia.</p>${button('Sim, apagar a minha conta','account-delete-confirm','danger wide')}${button('Cancelar','dialog-close','text-button')}`);return;}
    if(key==='account-delete-confirm'){clearCheckpoint();const oldScope=account.user?.id;await account.erase();if(oldScope){localStorage.removeItem('muralhas-bigodes-v2:'+oldScope);localStorage.removeItem('mb-checkpoint-v1:'+oldScope);}setScreen('home');toast('Conta e progresso ativo eliminados.');return;}
    if(key==='invite-link'){const link=await account.createInvite();showDialog(`<div class="eyebrow">UM LUGAR NA ORDEM</div><h2>Convida um amigo.</h2><p>Um registo com qualquer email, válido por 7 dias. O convite só pode ser utilizado uma vez.</p><textarea id="manual-output" readonly>${esc(link)}</textarea>${button('Copiar convite','copy-code','primary wide')}${button('Fechar','dialog-close','text-button')}`);return;}
    if(key==='account-invite'){showDialog(`<h2>Aprovar um amigo</h2><p>O email ficará autorizado a registar-se. Não será enviado qualquer convite automaticamente.</p><input id="friend-email" type="email" placeholder="Email do amigo">${button('Aprovar este email','account-invite-confirm','primary wide')}${button('Cancelar','dialog-close','text-button')}`);return;}
    if(key==='account-invite-confirm'){await account.invite(field('friend-email'));hideDialog();toast('Email aprovado. Partilha agora a ligação do jogo com esse amigo.');return;}

    audio.unlock();
    if (key === 'chapter') {
        screens.navigation.chapter = Number(value);
        render();
    }
    if (key === 'chapter-prev' || key === 'chapter-next') {
        screens.navigation.chapter = Math.max(0, Math.min(CHAPTERS.length-1, screens.navigation.chapter + (key === 'chapter-next' ? 1 : -1)));
        render();
    }
    if (key === 'coop-tab') {if(value==='invite'&&location.hash.startsWith('#sala='))history.replaceState({},'',location.pathname+location.search);
        screens.navigation.coop = value;
        render();
    }
    if(key==='coop-cat-page'){screens.navigation.catPage=Number(value);render();}
    if(key==='cat-page'){screens.navigation.catPage=Number(value);render();}
    if(key==='preview-uia'){showDialog(`<div class="eyebrow">O ESPAÇO LENDÁRIO</div><h2>Supremo Uia</h2><canvas id="uia-preview" width="260" height="170"></canvas><p>${completed(save)>=3?'Desbloqueado. Ocupa um espaço separado na equipa. Custo: 650 moedas. Só pode existir um.':'Vence a fase 3 para o juntar à Ordem.'}<br>«Não sabemos por que gira. Os ratos também não.»</p>${button('Ele gira. Já percebi.','dialog-close','primary wide')}`);}
    if(key==='story-preview'){showDialog(`<h2>${LEVELS[chosenLevel-1].name}</h2><p class="dialogue">${LEVELS[chosenLevel-1].story}</p>${button('Voltar à preparação','dialog-close','primary wide')}`);}
    if (key === 'setup-tab') {
        screens.navigation.setup = value;
        render();
    }
    if (key === 'settings-tab') {
        screens.navigation.settings = value;
        render();
    }
    if (key === 'help-prev' || key === 'help-next') {
        screens.navigation.help = Math.max(0, Math.min(5, screens.navigation.help + (key === 'help-next' ? 1 : -1)));
        render();
    }
    if(key==='fullscreen'){
      if(document.fullscreenElement&&typeof document.exitFullscreen==='function')await document.exitFullscreen();
      else if(typeof document.documentElement.requestFullscreen==='function'){try{await document.documentElement.requestFullscreen();}catch{toast('O navegador não permitiu ecrã inteiro. Abre pelo ícone do ecrã principal.');}}
      else showDialog(`<h2>Jogar com mais espaço</h2><p>No iPhone: abre no Safari, toca em <b>Partilhar → Adicionar ao ecrã principal</b>. Depois abre o jogo pelo novo ícone. Os menus ficam na vertical; roda o telemóvel quando entrar a partida.</p><p>Este navegador não disponibiliza ecrã inteiro através deste botão.</p>${button('Entendi','dialog-close','primary wide')}`);
      return;
    }
    if (key === 'home' || key === 'campaign' || key === 'help' || key === 'settings') {
        if (screen === 'game' && peer) {
            toast('Sai da sala antes de mudar de ecrã.');
            return;
        }
        if (screen === 'lobby' && peer) {
            peer.close();
            peer = null;
        }
        if (key === 'campaign') {
            state = null;
        }
        setScreen(key);
        return;
    }
    if (key === 'continue') {
        chosenLevel = Math.min(LEVELS.length, completed(save) + 1);
        chosenMode = 'campaign';
        team = rememberedTeam(save);
        setScreen('briefing');
    }
    if (key === 'level') {
        chosenLevel = Number(value);
        if (chosenLevel > completed(save) + 1)
            return;
        chosenMode = 'campaign';
        team = rememberedTeam(save);
        setScreen('briefing');
    }
    if (key === 'team' || key === 'coop-team') {
        const k = value as CatKind;
        if (!COMMON.includes(k)||(RECRUIT_CATS.includes(k)&&CATS[k].unlock>completed(save))||(key==='team'&&CATS[k].unlock>completed(save)))
            return;
        const max=TEAM_LIMIT;
        if (team.includes(k))
            team = team.filter(v => v !== k);
        else if (team.length < max)
            team.push(k);
        else
            {showDialog(`<h2>Quem vai descansar?</h2><p>Escolhe um aliado para trocar por ${CATS[k].short}.</p><div class="swap-grid">${team.map(old=>button('<img src="'+portrait(old)+'" alt=""><span>'+CATS[old].short+'</span>','swap-unit:'+old+','+k,'secondary')).join('')}</div>${button('Cancelar','dialog-close','text-button')}`);return;}
        rememberFormation(key==='coop-team');
        if (key === 'coop-team')
            sendProfile();
        render();
    }
    if(key==='start'){if(readCheckpoint())showDialog(`<h2>Começar uma nova defesa?</h2><p>A recuperação anterior será substituída. As estrelas ficam guardadas.</p>${button('Começar de novo','start-fresh','primary wide')}${button('Manter recuperação','dialog-close','text-button')}`);else startGame();}
    if(key==='start-fresh'){clearCheckpoint();startGame();}
    // A saved defense is only resumed on purpose: the hub button asks first, showing what was saved.
    if(key==='resume-choice'){const cp=readCheckpoint();if(!cp){await action('continue');return;}const s=cp.state,l=LEVELS[s.levelId-1];showDialog(`<h2>Tens uma defesa guardada</h2><p>Fase ${l.id} · ${esc(l.name)}<br>Onda ${s.wave} de ${l.waves.length} · ${Math.floor(s.players[0].coins)} ◉ · ${s.towers.length} ${s.towers.length===1?'gato colocado':'gatos colocados'}</p>${button('Retomar esta defesa','resume-checkpoint','primary wide')}${button('Escolher fase nova','continue','secondary wide')}`);return;}
    if(key==='resume-checkpoint'){const cp=readCheckpoint();if(!cp){toast('Não há uma recuperação válida.');return;}state=cp.state;state.players[0].admin=account.admin;if(!account.admin){state.invulnerable=false;state.players[0].infiniteMoney=false;}state.paused=true;chosenLevel=state.levelId;chosenMode=state.mode;localPlayer=0;peer=null;resultShown=false;acc=0;lastCheckpointCompleted=state.completed;setScreen('game');showDialog(`<h2>A Ordem guardou-te o lugar.</h2><p>${LEVELS[state.levelId-1].name} · ${state.completed} ondas concluídas.<br>Retomas o último ponto seguro; ações posteriores da onda interrompida podem ter sido perdidas.</p>${button('Retomar ▶','resume','primary wide')}`);}
    if (key === 'story-close') {
        hideDialog();
        if (state)
            state.paused = false;
    }
    if (key === 'dock') {
        if (performance.now() < skipDockClickUntil)
            return;
        dockChoice = value as CatKind;
        preview = dockChoice;
        selected = null;
        aiming = false;
        renderInspector();
        updateDock();
    }
    if (key === 'quickbuild' && selected !== null) {
        dispatch({ type: 'build', spot: selected, kind: value as CatKind });
        selected = null;
        preview = null;
        renderInspector();
    }
    if (key === 'preview') {
        preview = value as CatKind;
        renderInspector();
    }
    if (key === 'build' && selected !== null && preview)
        dispatch({ type: 'build', spot: selected, kind: preview });
    if (key === 'upgrade' && state) {
        const t = state.towers.find(t => t.spot === selected);
        if (t)
            dispatch({ type: 'upgrade', id: t.id, branch: value as 'a' | 'b' | undefined });
    }
    if (key === 'sell' && state) {
        const t = state.towers.find(t => t.spot === selected);
        if (t)
            showDialog(`<h2>Dispensar ${CATS[t.kind].short}?</h2><p>Recebes ${refund(t)} moedas: 70% do total investido.</p>${button('Confirmar venda', 'confirm-sell', 'primary wide')}${button('Manter na Ordem', 'dialog-close', 'text-button')}`);
    }
    if (key === 'confirm-sell' && state) {
        const t = state.towers.find(t => t.spot === selected);
        hideDialog();
        if (t)
            dispatch({ type: 'sell', id: t.id });
    }
    if (key === 'wave')
        dispatch({ type: 'wave' });
    if (key === 'speed')
        dispatch({ type: 'speed' });
    if (key === 'pause') {
        if (state?.mode === 'coop') {
            dispatch({ type: 'pause' });
            return;
        }
        dispatch({ type: 'pause' });
        if (state?.paused)
            showPause();
        else
            hideDialog();
    }
    if (key === 'mute') {
        muted = !muted;
        const b = document.querySelector('[data-action="mute"]');
        if (b)
            b.textContent = muted ? '♪̸' : '♪';
    }
    if(key==='skill'&&state){const skill=value as Ability;if(SKILLS[skill].radius&&skill!=='uia'){aimingSkill=skill;aiming=true;aim=null;selected=null;renderInspector();}else showDialog(`<h2>${SKILLS[skill].name}</h2><p>${SKILLS[skill].description}</p>${button('Confirmar habilidade','confirm-skill:'+skill,'primary wide')}${button('Cancelar','dialog-close','text-button')}`);}
    if (key === 'confirm-skill') {
        hideDialog();
        dispatch({ type: 'ability', skill: value as Ability });
    }
    if (key === 'confirm-yarn' && aim) {
        dispatch({ type: 'ability', skill: aimingSkill, x: aim.x, y: aim.y });
        aiming = false;
        aim = null;
        renderInspector();
    }
    if (key === 'cancel') {
        selected = null;
        preview = null;
        dockChoice = null;
        aiming = false;
        aim = null;
        renderInspector();
        updateDock();
    }
    if (key === 'dialog-close')
        hideDialog();
    if (key === 'resume') {
        hideDialog();
        if (state?.paused)
            dispatch({ type: 'pause' });
    }
    if (key === 'exit') {
        if (state && state.mode !== 'coop')
            state.paused = true;
        showDialog(`<h2>Sair desta defesa?</h2><p>${state?.mode === 'coop' ? 'A ligação será encerrada. Se fores anfitrião, a sessão termina para ambos.' : 'A recuperação da última onda concluída fica guardada. A onda atual pode ter de ser repetida.'}</p>${button('Sair da partida', 'confirm-exit', 'danger wide')}${button('Continuar a defender', 'resume', 'text-button')}`);
    }
    if (key === 'confirm-exit') {
        if (peer) {
            peer.close('O anfitrião ou convidado saiu da partida.');
            peer = null;
        }
        state = null;
        setScreen('campaign');
    }
    if (key === 'retry') {
        hideDialog();
        startGame();
    }
    if (key === 'next-level') {
        chosenLevel = state!.levelId + 1;
        state = null;
        chosenMode = 'campaign';
        team = rememberedTeam(save);
        setScreen('briefing');
    }
    if (key === 'tutorial-close')
        document.querySelector('#tutorial')!.innerHTML = '';
    if (key === 'endless') {
        if (completed(save) < LEVELS.length)
            return;
        chosenMode = 'endless';
        showDialog(`<h2>Escolhe o teu último reduto.</h2><div class="button-row">${[1, 2, 4, 12].map(id => button(LEVELS[id - 1].name, 'endless-map:' + id, 'secondary')).join('')}</div>${button('Voltar', 'dialog-close', 'text-button')}`);
    }
    if (key === 'endless-map') {
        chosenLevel = Number(value);
        chosenMode = 'endless';
        team = rememberedTeam(save);
        setScreen('briefing');
    }
    if (key === 'export') {
        const url = URL.createObjectURL(new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'muralhas-bigodes-progresso.json';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (key === 'import')
        (document.querySelector('#import-file') as HTMLInputElement).click();
    if (key === 'reset')
        showDialog(`<h2>Apagar o caderno da Ordem?</h2><p>Esta ação apaga estrelas, recordes e preferências deste navegador. Exporta primeiro se quiseres uma cópia.</p>${button('Sim, apagar o progresso', 'confirm-reset', 'danger wide')}${button('Guardar os meus bigodes', 'dialog-close', 'text-button')}`);
    if (key === 'confirm-reset') {
        save = fresh();
        store();
        render();
        toast('O caderno está pronto para uma nova aventura.');
    }
    if(key==='farm-menu'){await beginFarm();return;}
    if(key==='night-menu'){hideDialog();const {launchNight}=await import('./night');screen='hunt';state=null;menuState=null;app.style.visibility='hidden';huntStop=launchNight({name:account.user?.email?.split('@')[0]||'Bigodes',identity:account.user?.id,sound:kind=>audio.hunt(kind),onExit:()=>{huntStop=null;app.style.visibility='';setScreen('home');}});return;}
    if(key==='night-train'){await beginHunt(true);return;}
    if(key==='night-coop'){nightMode=true;screens.navigation.coop='invite';setScreen('coop');return;}
    if (key === 'coop') {nightMode=false;chosenLevel=4;screens.navigation.catPage=0;
        setScreen('coop');
    }
    if (key === 'signal-save') {
        const url = (document.querySelector('#signal-url') as HTMLInputElement).value.trim(), k = (document.querySelector('#signal-key') as HTMLInputElement).value.trim();
        if (k.startsWith('sb_secret_') || k.includes('service_role'))
            throw Error('Nunca uses chaves secretas ou service_role no navegador.');
        localStorage.setItem('mb-signal-url', url);
        localStorage.setItem('mb-signal-key', k);
        toast('Configuração pública guardada neste navegador.');
    }
    if (key === 'manual-host') {
        makePeer(true);
        manualStep = 'offer';
        manualOutput = 'A gerar convite…';
        setScreen('lobby');
        manualOutput = await peer!.createManual();
        if (screen === 'lobby')
            render();
    }
    if (key === 'manual-join')
        showDialog(`<h2>Recebeste um convite?</h2><p>Cola o código do anfitrião. Depois envia-lhe a resposta gerada.</p><textarea id="join-offer" placeholder="Código do convite"></textarea>${button('Gerar resposta', 'manual-answer', 'primary wide')}${button('Cancelar', 'dialog-close', 'text-button')}`);
    if (key === 'manual-answer') {
        const code = (document.querySelector('#join-offer') as HTMLTextAreaElement).value;
        makePeer(false);
        manualStep = 'answer';
        manualOutput = 'A gerar resposta…';
        setScreen('lobby');
        manualOutput = await peer!.joinManual(code);
        if (screen === 'lobby')
            render();
    }
    if (key === 'manual-accept') {
        const code = (document.querySelector('#manual-answer') as HTMLTextAreaElement).value;
        await peer!.acceptManual(code);
        networkStatus = 'A estabelecer ligação · até 25 s';
        render();
    }
    if (key === 'copy-code') {
        const code = (document.querySelector('#manual-output') as HTMLInputElement).value;
        try {
            await navigator.clipboard.writeText(code);
            toast('Copiado. Envia à outra pessoa.');
        }
        catch {
            (document.querySelector('#manual-output') as HTMLInputElement).select();
            toast('Selecionado. Usa Copiar no dispositivo.');
        }
    }
    if (key === 'online-host' || key === 'online-join') {
        const config = getConfig();
        if (!config.url || !config.key)
            throw Error('Configura primeiro um projeto Supabase Free ou escolhe o convite manual.');
        let room: string | undefined, token: string | undefined;
        if (key === 'online-join') {
            const link = (document.querySelector('#invite-link') as HTMLInputElement).value;
            try {
                const u = new URL(link), params = new URLSearchParams(u.hash.slice(1));
                room = params.get('sala') || '';
                token = params.get('chave') || '';
            }
            catch {
                throw Error('Cola uma ligação de convite válida.');
            }
            if (!/^[a-f0-9]{32}$/.test(room) || !/^[a-f0-9]{32}$/.test(token))
                throw Error('Convite inválido.');
        }
        makePeer(key === 'online-host');
        manualStep = '';
        manualOutput = '';
        setScreen('lobby');
        try {
            manualOutput = await peer!.online(key === 'online-host', config.url, config.key, room, token);
            if (key === 'online-join')
                manualOutput = '';
            render();
        }
        catch (e) {
            peer!.close();
            throw e;
        }
    }
    if (key === 'ready') {
        localReady = !localReady;
        sendProfile();
        render();
    }
    if (key === 'coop-start' && peer?.isHost && localReady && remoteReady) {
        if(nightMode){peer.send({type:'hunt-start'});await beginHunt();return;}
        chosenLevel=Math.max(1,Math.min(chosenLevel,Math.max(4,completed(save)+1),LEVELS.length));
        state = createState(chosenLevel, 'coop', [[...team, 'uia'], [...remoteTeam, 'uia']]);
        state.players[0].name = peerName;state.players[0].admin=account.admin;state.players[1].admin=remoteAdmin;if(account.admin){if(adminPrefs.money)command(state,0,{type:"admin",option:"money",enabled:true});if(adminPrefs.life)command(state,0,{type:"admin",option:"life",enabled:true});}
        state.players[1].name = remoteName;
        peer.send({ type: 'start', state });
        startGame(true);
    }
    if (key === 'leave-coop' || key === 'closed-home') {if(location.hash.startsWith('#sala='))history.replaceState({},'',location.pathname+location.search);screens.navigation.roomEdit=false;
        peer?.close();
        peer = null;
        state = null;
        manualStep = '';
        manualOutput = '';
        setScreen('home');
    }
    if (key === 'takeover' && state && localPlayer === 0) {
        peer = null;
        state.mode = 'practice';
        state.players[0].coins += state.players[1].coins;
        state.players[0].team = [...new Set([...state.players[0].team, ...state.players[1].team])];
        state.players = state.players.slice(0, 1);
        state.towers.forEach(t => t.owner = 0);
        state.paused = false; /* Não atribuir estrelas por uma partida cooperativa convertida. */
        chosenMode = 'practice';
        hideDialog();
        renderInspector();
    }
}
function showPause() { showDialog(`<div class="eyebrow">A ORDEM FAZ UMA PAUSA</div><h2>Uma pequena<br><em>sesta estratégica.</em></h2><p>Toda a simulação está parada. As recargas também precisam de descansar.</p>${button('Retomar defesa ▶', 'resume', 'primary wide')}${button('Sair da partida', 'exit', 'text-button')}`); }
app.addEventListener('click', e => { const el = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]'); if (el && !el.disabled)
    void action(el.dataset.action!).catch(err => toast(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')); });
app.addEventListener('change', async (e) => { const el = e.target as HTMLInputElement | HTMLSelectElement; const id = el.id;if(id==='roster-filter'){screens.navigation.rosterFilter=el.value;screens.navigation.catPage=0;render();return;}if(id==='coop-level'){chosenLevel=Number(el.value);return;} if (id === 'skill-select') {
    save.skill = el.value as typeof save.skill;
    store();
} if (id === 'equipment-select') {
    save.equipment = el.value as 'standard' | 'keen';
    store();
} if (id === 'mode-select')
    chosenMode = el.value as State['mode']; if (id === 'quality') {
    save.settings.quality = el.value as 'low' | 'medium' | 'high';
    store();
} if (id === 'reduced') {
    save.settings.reduced = (el as HTMLInputElement).checked;
    store();
} if (id === 'effects-volume' || id === 'music-volume'||id==='comedy-volume') {
    save.settings[id==='comedy-volume'?'comedy':id === 'effects-volume' ? 'effects' : 'music'] = Number(el.value);
    audio.unlock();
    audio.play('buy');
    store();
} if (id === 'priority' && state) {
    const t = state.towers.find(t => t.spot === selected);
    if (t)
        dispatch({ type: 'priority', id: t.id, priority: el.value as 'first' | 'strong' | 'near' });
} if (id === 'import-file') {
    const file = (el as HTMLInputElement).files?.[0];
    if (!file)
        return;
    try {
        if (file.size > 100000)
            throw Error('Ficheiro demasiado grande.');
        const parsed = validateSave(JSON.parse(await file.text()));
        save = parsed;
        store();
        render();
        toast('Progresso importado. A Ordem reconhece-te.');
    }
    catch (err) {
        toast(err instanceof Error ? err.message : 'Ficheiro inválido.');
    }
} });
window.addEventListener('keydown', e => { if ((e.target as HTMLElement).matches('input,textarea,select'))
    return; if (screen !== 'game')
    return; if (e.key === 'Escape') {
    if (dialog) {
        if (state?.paused)
            void action('resume');
        else
            hideDialog();
    }
    else
        void action('cancel');
}
else if (!dialog) {
    if (e.code === 'Space') {
        e.preventDefault();
        void action('wave');
    }
    if (e.key.toLowerCase() === 'p')
        void action('pause');
    if (e.key.toLowerCase() === 'x')
        void action('speed');
} });
document.addEventListener('visibilitychange', () => { if (document.hidden && state && screen === 'game' && state.status === 'playing') {
    if (!peer) {
        state.paused = true;
        showPause();
    }
    else if (localPlayer === 0) {
        state.paused = true;
        state.announcement = 'O anfitrião mudou de separador. Ambos devem concordar para retomar.';
        peer.snapshot(state);
    }
} });
window.addEventListener('pagehide',()=>{if(state&&!state.active.length)saveSafePoint();peer?.close('A página da sala foi fechada.');});
function frame(now: number) {
    const elapsed = Math.min(.2, (now - (lastTime || now)) / 1000);
    lastTime = now;
    if (screen === 'home' && menuRenderer && menuState && !document.hidden) {
        acc += elapsed;
        if(now-lastMenuDraw>33){
            while (acc >= STEP) {step(menuState);acc-=STEP;}
            menuRenderer.draw(menuState, { spot: null, preview: null, aim: null }, save.settings);
            lastMenuDraw=now;
        }
        if (menuState.status !== 'playing')
            render();
        audio.update(true);
    }
    if (screen === 'game' && state && renderer) {
        if (localPlayer === 0) {
            acc += elapsed * state.speed;
            let count = 0;
            while (acc >= STEP && count++ < 12) {
                step(state);
                acc -= STEP;
            }
            if (count >= 12)
                acc = 0;
            if (peer && now - lastSnapshot > 100) {
                peer.snapshot(state);
                lastSnapshot = now;
            }
            if (state.kills > lastAudioKills) {
                audio.play('hit');
                lastAudioKills = state.kills;
            }
        }
        renderer.draw(state, { spot: selected, preview, aim,aimRadius:SKILLS[aimingSkill].radius }, save.settings, localPlayer === 1);
        audio.observe(state);
        audio.update(!state.paused && state.status === 'playing');
        if (now - lastHud > 200) {
            updateHud();
            lastHud = now;
        }
        if(state.completed!==lastCheckpointCompleted&&state.status==='playing')saveSafePoint();
        if (state.status !== 'playing')
            finish();
    }
    const uc=document.querySelector<HTMLCanvasElement>('#uia-preview');if(uc){const c=uc.getContext('2d')!;c.clearRect(0,0,260,170);drawCat(c,'uia',130,125,1.6,3,0,1,now/1000);}
    requestAnimationFrame(frame);
}
app.innerHTML='<main class="loading-screen"><span>✦</span><h1>Dungeon Nightreign</h1><p>A abrir os portões da noite…</p></main>';
void artReady.then(()=>{render();requestAnimationFrame(frame);const devQuery=new URLSearchParams(location.search);if(DEV_GUEST&&devQuery.has('devscreen'))setScreen(devQuery.get('devscreen')||'home');if(DEV_GUEST&&devQuery.has('devfarm'))void beginFarm();if(DEV_GUEST&&devQuery.has('devgame')){chosenLevel=Number(devQuery.get('devgame'))||1;startGame();}if(DEV_GUEST){(window as unknown as {__mb:unknown}).__mb={renderer:()=>renderer,state:()=>state,spots:()=>state?LEVELS[state.levelId-1].spots:[]};}});
if (location.hash.startsWith('#sala=')&&account.user) {
    screens.navigation.coop = 'invite';
    setScreen('coop');
}
if('serviceWorker' in navigator&&import.meta.env.PROD){
 // Keep the repair worker URL available to replace legacy offline workers.
 // No navigation interception, cache wipe of account data, or forced reload.
 void navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
}

window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#quinta=')){if(account.user&&!farmStop)void beginFarm(location.href);else if(!account.user)setScreen('account');return;}if(!location.hash.startsWith('#sala='))return;if(peer){toast('Sai da sala atual antes de entrar noutra.');return;}screens.navigation.coop='join';setScreen(account.user?'coop':'account');});
