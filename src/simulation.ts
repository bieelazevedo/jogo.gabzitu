import {approach,movementRadius} from './mobility';
import {isUnique} from './expansion';
import { CATS, ENEMIES, LEVELS, STEP, waveFor, W, H } from './data';
import { LEGOLLAS } from './dialogue';
import {SKILLS} from './skills';
import type { Ability, CatKind, Command, Effect, Enemy, Level, Point, State, Tower } from './types';
export function pathLength(path: Point[]) { let sum = 0; for (let i = 1; i < path.length; i++)
    sum += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y); return sum; }
export function position(path: Point[], progress: number): Point { let d = progress * pathLength(path); for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], l = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= l)
        return { x: a.x + (b.x - a.x) * d / l, y: a.y + (b.y - a.y) * d / l };
    d -= l;
} return { ...path[path.length - 1] }; }
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function createState(levelId = 1, mode: State['mode'] = 'campaign', teams: CatKind[][] = [['archer', 'ice']], skill: Ability = 'war', equipment: 'standard' | 'keen' = 'standard'): State {
    const l = LEVELS[levelId - 1];
    return { traps:[],version: 1, levelId, mode, time: 0, tick: 0, seed: levelId * 7919, nextId: 1, status: 'playing', hp: 100, maxHp: 100, players: teams.map((team, i) => ({ coins: mode === 'coop' ? 330 : l.coins, team: [...team], skills: ['yarn', skill], cds: { yarn: 0, war: 0, heal: 0, box:0,sardine:0,uia: 0 }, heals: 2, name: i ? 'Amora' : 'Sarda', equipment })), towers: [], enemies: [], projectiles: [], effects: [], active: [], wave: 0, completed: 0, prep: 0, speed: 1, paused: false, war: 0, uia: 0, kills: 0, damage: 0, earned: 0, announcement: l.novelty, votes: { pause: [], speed: [], expires: 0 }, revision: 0 };
}
export function stats(t: Tower, s?: State) {
    const d = CATS[t.kind], mult = t.level === 1 ? 1 : t.level === 2 ? 1.45 : 1.9;
    let damage = d.damage * mult, range = d.range, interval = d.interval, area = d.area || 0;
    if (t.kind === 'archer' && s?.players[t.owner].equipment === 'keen') {
        range *= 1.18;
        damage *= .88;
    }
    if (t.level > 1)
        range += 10;
    if (t.branch === 'a') {
        if(t.kind==='bard')range+=70;
        if(t.kind==='engineer'){area=75;range+=35;}
        if (t.kind === 'archer')
            interval /= 1.65;
        if (t.kind === 'ice')
            area = 65;
        if (t.kind === 'bomber')
            area = 95;
        
        if (t.kind === 'commander')
            range += 70;
    }
    if (t.branch === 'b' && t.kind === 'archer') {
        range *= 1.6;
        damage *= 1.85;
        interval *= 1.25;
    }
    if(t.branch==='b'&&t.kind==='engineer'){damage*=1.65;interval*=1.2;}
    
    if(t.branch==='a'){
      if(['pirate','alchemist','gardener','chef','allyAdmiral','allyKing'].includes(t.kind))area=({pirate:72,alchemist:70,gardener:55,chef:80,allyAdmiral:75,allyKing:90} as Record<string,number>)[t.kind];
      if(['astronomer','guardian','adminMage','allyRatazao','allyDuchess'].includes(t.kind))range+=t.kind==='astronomer'?55:40;
      if(t.kind==='allyVacuum')interval/=1.35;if(['allyKraken','allyMagistrate'].includes(t.kind))range+=45;if(t.kind==='allyPhoenix')area=85;if(t.kind==='allyArchivist')area=80;
    }
    if(t.branch==='b'){
      if(t.kind==='pirate'){damage*=1.55;interval*=1.15;}
      if(t.kind==='astronomer'){area=55;damage*=1.25;}
      if(['boxer','allyAdmiral'].includes(t.kind))interval/=1.35;
      if(['adminMage','allyDuchess'].includes(t.kind))damage*=1.3;
      if(['allyRatazao','allyKing'].includes(t.kind))damage*=1.4;
      if(['allyVacuum','allyHydra'].includes(t.kind))range+=45;
      if(t.kind==='allyLegollas')area=65;if(['allyKraken','allyMagistrate','allyArchivist'].includes(t.kind))damage*=1.35;
    }
    if(s&&t.kind!=='guardian'){const level=LEVELS[s.levelId-1],here=level.spots[t.spot];if(s.towers.some(g=>g.kind==='guardian'&&g.id!==t.id&&dist(here,level.spots[g.spot])<=CATS.guardian.range+(g.level>1?10:0)+(g.branch==='a'?40:0)))range*=1.1;}
    return { damage, range, interval, area, magic: !!d.magic };
}
export const upgradeCost = (t: Tower) => Math.floor(CATS[t.kind].cost * (t.level === 1 ? .8 : 1.3));
export const refund = (t: Tower) => Math.floor(t.invested * .7);
export function physicalDamage(amount: number, armor: number) { return amount * 100 / (100 + Math.max(0, armor) * 4); }
export function effect(s: State, p: Point, type: Effect['type'], color: string, size = 20, life = .4) { s.effects.push({ ...p, id: s.nextId++, type, color, size, life, maxLife: life }); if (s.effects.length > 100)
    s.effects.shift(); }
function pay(s: State, amount: number) { for (const p of s.players)
    p.coins += amount / s.players.length; s.earned += amount; }
function damage(s: State, e: Enemy, n: number, magic = false, pierce = 0) { if (e.hp <= 0)
    return; n*=e.marked>0?1.25:1;if(e.kind==='duchess'&&((Math.floor(e.bossClock/8)%2===0&&!magic)||(Math.floor(e.bossClock/8)%2===1&&magic)))n*=.4;const actual = magic ? n*(1-(ENEMIES[e.kind].magicResist||0)) : physicalDamage(n, (e.armor * (e.broken > 0 ? .35 : 1)) * (1 - pierce)); e.hp -= actual; e.hit = .12; s.damage += actual; }
function status(e: Enemy, type: 'poison' | 'burn', power: number, duration: number) { e[type] = Math.max(e[type], power); e[type === 'poison' ? 'poisonTime' : 'burnTime'] = duration; }
function impact(s: State, e: Enemy, kind: CatKind, branch: string, level: number, amount: number, magic: boolean,element=0) {
    if(kind==='samurai'&&element%3===2)amount*=branch==='b'?3:2;
    const sache=kind==='monk'&&element%5===4?(branch==='b'?2:1.5):1;
    damage(s, e, amount * sache*(kind === 'uia' && ENEMIES[e.kind].boss ? .35 : 1), magic, kind==='knight'?.7:kind==='pirate'?.3:kind==='allyAdmiral'?.35:kind==='allyMagistrate'?.4:kind==='boxer'&&branch==='a'?.6:0);
    if (kind === 'ice') {
        const slow = branch === 'b' ? .65 : .35;
        e.slow = Math.max(e.slow, slow);
        e.slowTime = branch === 'b' ? 3 : 2;
    }
    if(kind==='monk'){
        if(element%5===0){e.slow=Math.max(e.slow,.5);e.slowTime=Math.max(e.slowTime,1.8);}
        if(element%5===1)e.broken=Math.max(e.broken,3);
        if(element%5===2)e.progress=Math.max(0,e.progress-(ENEMIES[e.kind].boss?.004:.015));
        if(element%5===3)status(e,'burn',10,3);
    }
    
    if(kind==='alchemist'){e.broken=Math.max(e.broken,2);if(branch==='b')status(e,'poison',9,4);}
    if(kind==='astronomer'||kind==='allyDuchess')e.marked=Math.max(e.marked,2);
    if(kind==='gardener'){e.slow=Math.max(e.slow,branch==='b'?.6:.45);e.slowTime=Math.max(e.slowTime,branch==='b'?3:2);status(e,'poison',4,3);}
    if(kind==='chef')status(e,'burn',branch==='b'?15:8,branch==='b'?4:3);
    if(kind==='boxer'&&element%4===3)e.progress=Math.max(0,e.progress-(ENEMIES[e.kind].boss?.0015:.008));
    if(['guardian','allyVacuum','allyLegollas'].includes(kind)){e.slow=Math.max(e.slow,kind==='allyLegollas'?.3:.4);e.slowTime=Math.max(e.slowTime,1.8);if((kind==='guardian'&&branch==='b')||(kind==='allyLegollas'&&branch==='a'))e.marked=Math.max(e.marked,2);}
    if(kind==='allyHydra')status(e,'poison',branch==='a'?10:6,3);
    if(kind==='allyKraken'){e.slow=Math.max(e.slow,.35);e.slowTime=Math.max(e.slowTime,2);}
    if(kind==='allyMagistrate')e.marked=Math.max(e.marked,2);
    if(kind==='allyPhoenix')status(e,'burn',branch==='b'?18:12,3);
    if(kind==='allyKing'||kind==='allyArchivist')e.broken=Math.max(e.broken,3);
    if(kind==='adminMage'){if(element%4===1)e.marked=Math.max(e.marked,3);if(element%4===3)status(e,'burn',10,3);}
    if (kind === 'witch')
        status(e, 'poison', branch === 'a' ? 13 : 8, branch === 'a' ? 7 : 3);
    if (kind === 'bomber' && branch === 'b')
        status(e, 'burn', 12, 4);
    if (kind === 'knight' && branch === 'a')
        e.broken = 4;
    // Reações de equipa: uma ativação por alvo a cada três segundos, sem
    // consumir os estados. O host calcula o dano e envia o mesmo efeito aos dois.
    if(e.hp>0 && s.time >= (e.reactionUntil || 0)) {
        const thermal=e.slowTime>0&&e.burnTime>0;
        const marinade=e.broken>0&&e.poisonTime>0;
        if(thermal||marinade){
            e.reactionUntil=s.time+3;
            damage(s,e,thermal?18:12,true);
            effect(s,position(LEVELS[s.levelId-1].paths[e.path],e.progress),'reaction',thermal?'#b4edf2':'#c8e18d',thermal?38:30,.8);
            s.effects[s.effects.length-1].label=thermal?'CHOQUE TÉRMICO':'LATA MARINADA';
        }
    }
    if (level > 0)
        effect(s, position(LEVELS[s.levelId - 1].paths[e.path], e.progress), 'hit', CATS[kind].color, 8, .22);
}
export function command(s: State, player: number, c: Command): string | null {
    if (!c || typeof c !== 'object' || !s.players[player])
        return 'Comando inválido.';
    if (s.status !== 'playing')
        return 'A partida terminou.';
    const p = s.players[player], level = LEVELS[s.levelId - 1];
    if(c.type==='admin'){
        if(!p.admin||typeof c.enabled!=='boolean'||!['money','life'].includes(c.option))return 'Modo reservado ao administrador.';
        if(c.option==='life')s.invulnerable=c.enabled;
        else p.infiniteMoney=c.enabled;
        if(c.enabled)s.adminUsed=true;
        s.revision++;
        s.announcement='ADMIN · partida de teste, sem estrelas ou recordes';
        return null;
    }
    if (c.type === 'pause' || c.type === 'speed') {
        if (s.mode !== 'coop') {
            if (c.type === 'pause')
                s.paused = !s.paused;
            else
                s.speed = s.speed>=5?1:s.speed+1;
        }
        else {
            if (s.votes.expires && Date.now() > s.votes.expires)
                s.votes = { pause: [], speed: [], expires: 0 };
            const key = c.type === 'pause' ? 'pause' : 'speed';
            if (!s.votes[key].includes(player))
                s.votes[key].push(player);
            if (!s.votes.expires)
                s.votes.expires = Date.now() + 10000;
            if (s.votes[key].length === 2) {
                if (key === 'pause')
                    s.paused = !s.paused;
                else
                    s.speed = s.speed>=5?1:s.speed+1;
                s.votes = { pause: [], speed: [], expires: 0 };
            }
            else
                s.announcement = `${p.name} pede ${key === 'pause' ? 'pausa / retoma' : 'mudança de velocidade'}. O outro jogador deve premir o mesmo botão (10 s).`;
        }
        s.revision++;
        return null;
    }
    if (s.paused)
        return 'Retoma a partida primeiro.';
    if (c.type === 'build') {
        if (!Number.isInteger(c.spot) || !level.spots[c.spot] || !(c.kind in CATS) || !p.team.includes(c.kind))
            return 'Posição ou gato indisponível.';
        if (s.towers.some(t => t.spot === c.spot))
            return 'Esta posição já está ocupada.';
        if (isUnique(c.kind) && s.towers.some(t => t.kind === c.kind))
            return 'Só pode existir uma unidade deste aliado único na partida.';
        if (!p.infiniteMoney && p.coins < CATS[c.kind].cost)
            return 'Moedas insuficientes.';
        if(!p.infiniteMoney)p.coins -= CATS[c.kind].cost;
        s.towers.push({ casts:0,id: s.nextId++, spot: c.spot, kind: c.kind, owner: player, level: 1, branch: '', invested: CATS[c.kind].cost, priority: 'first', cd: .1, angle: 0, shot: 0, kills: 0 });
        effect(s, level.spots[c.spot], 'burst', CATS[c.kind].color, 30);
        s.revision++;
        return null;
    }
    if (c.type === 'upgrade' || c.type === 'sell' || c.type === 'priority') {
        const t = s.towers.find(t => t.id === c.id);
        if (!t || t.owner !== player)
            return 'Só podes controlar os teus gatos.';
        if (c.type === 'sell') {
            p.coins += refund(t);
            s.towers = s.towers.filter(v => v.id !== t.id);
        }
        if (c.type === 'priority') {
            if (!['first', 'strong', 'near'].includes(c.priority))
                return 'Prioridade inválida.';
            t.priority = c.priority;
        }
        if (c.type === 'upgrade') {
            if (t.level >= 3)
                return 'Já está no nível máximo.';
            if (t.level === 2 && t.kind !== 'uia' && c.branch !== 'a' && c.branch !== 'b')
                return 'Escolhe uma especialização.';
            const cost = upgradeCost(t);
        if (!p.infiniteMoney && p.coins < cost)
                return 'Moedas insuficientes.';
            if(!p.infiniteMoney)p.coins -= cost;
            t.invested += cost;
            t.level++;
            if (t.level === 3)
                t.branch = t.kind === 'uia' ? 'a' : c.branch!;
            effect(s, level.spots[t.spot], 'burst', CATS[t.kind].color, 45);
        }
        s.revision++;
        return null;
    }
    if (c.type === 'wave') {
        if (s.mode !== 'endless' && s.wave >= level.waves.length)
            return 'Esta é a última onda.';
        if (s.active.length >= 2)
            return 'Já há duas ondas ativas.';
        const next = waveFor(level, s.wave, s.mode === 'chaos', s.mode === 'endless');
        if (s.active.length && (next.boss || s.active.some(w => waveFor(level, w.index, s.mode === 'chaos', s.mode === 'endless').boss)))
            return 'As ondas de chefe não podem ser sobrepostas.';
        if (s.active.length) {
            pay(s, 15);
            s.announcement = 'Onda antecipada · +15 moedas repartidas';
        }
        else
            s.announcement = `Onda ${s.wave + 1} · ${next.title}`;
        if (level.bridgeAt && s.wave + 1 === level.bridgeAt - 1)
            s.announcement = 'A ponte abre na próxima onda! Prepara a segunda entrada.';
        if (level.bridgeAt && s.wave + 1 === level.bridgeAt)
            s.announcement = 'A ponte abriu. A segunda entrada está ativa.';
        s.active.push({ index: s.wave, elapsed: 0, spawned: next.groups.map(() => 0), done: false });
        s.wave++;
        s.prep = s.levelId>=11?10:s.levelId>=6?18:22;
        s.revision++;
        return null;
    }
    if (c.type === 'ability') {
        if (!['yarn', 'war', 'heal','box','sardine', 'uia'].includes(c.skill))
            return 'Habilidade inválida.';
        if (c.skill !== 'uia' && !p.skills.includes(c.skill))
            return 'Habilidade não equipada.';
        if (p.cds[c.skill] > 0)
            return 'A habilidade está a recarregar.';
        if (c.skill === 'box'||c.skill==='sardine'){if(typeof c.x!=='number'||typeof c.y!=='number'||!Number.isFinite(c.x)||!Number.isFinite(c.y)||c.x<0||c.x>W||c.y<0||c.y>H)return 'Escolhe uma posição válida.';s.traps.push({id:s.nextId++,kind:c.skill,x:c.x,y:c.y,life:c.skill==='box'?10:6,charges:8,hits:[]});p.cds[c.skill]=SKILLS[c.skill].cooldown;
        }else if (c.skill === 'yarn') {
            if (typeof c.x !== 'number' || typeof c.y !== 'number' || !Number.isFinite(c.x) || !Number.isFinite(c.y) || c.x < 0 || c.x > W || c.y < 0 || c.y > H)
                return 'Escolhe um ponto no mapa.';
            for (const e of s.enemies)
                if (dist(position(level.paths[e.path], e.progress), { x: c.x, y: c.y }) <= 110)
                    damage(s, e, 145, true);
            effect(s, { x: c.x, y: c.y }, 'yarn', '#e6ba73', 110, 1);
            p.cds.yarn = 38;
        }
        else if (c.skill === 'war') {
            s.war = 8;
            p.cds.war = 48;
            s.announcement = 'Miau de Guerra · +40% cadência durante 8 segundos';
        }
        else if (c.skill === 'heal') {
            if (!p.heals)
                return 'Já usaste as duas entregas.';
            s.hp = Math.min(s.maxHp, s.hp + 15);
            p.heals--;
            p.cds.heal = 55;
            effect(s, { x: 900, y: 350 }, 'heal', '#a9d6a1', 80, 1);
        }
        else {
            const u = s.towers.find(t => t.kind === 'uia' && t.owner === player);
            if (!u)
                return 'Precisas do teu Supremo Uia.';
            s.uia = 8;
            p.cds.uia = 65;
            s.announcement = 'U I I I A · a física saiu da sala';
        }
        s.revision++;
        return null;
    }
    return 'Comando desconhecido.';
}
function spawn(s: State, kind: Enemy['kind'], path: number, wave: number, summon = false, progress = 0) {
    progress=Math.max(0,progress);
    const d = ENEMIES[kind], scale = 1 + Math.min(13,Math.max(0,s.levelId-3))*.115+Math.max(0,s.levelId-16)*.035 + (s.mode === 'endless' ? Math.floor(wave / 10) * .35 : 0);
    const bossScale = s.levelId === 3 && kind === 'ratazao' ? .48 : 1;
    s.enemies.push({ marked:0,id: s.nextId++, kind, path, progress, hp: d.hp * scale * bossScale, maxHp: d.hp * scale * bossScale, armor: d.armor, slow: 0, slowTime: 0, poison: 0, poisonTime: 0, burn: 0, burnTime: 0, broken: 0, spawnWave: wave, summon, phase: 0, bossClock: 0, hit: 0 });
}
export function step(s: State, dt = STEP) {
    if (s.votes.expires && Date.now() > s.votes.expires)
        s.votes = { pause: [], speed: [], expires: 0 };
    if (s.paused || s.status !== 'playing')
        return;
    const l = LEVELS[s.levelId - 1];
    s.time += dt;
    s.tick++;
    s.war = Math.max(0, s.war - dt);
    s.uia = Math.max(0, s.uia - dt);
    for (const p of s.players)
        for (const k of Object.keys(p.cds) as Ability[])
            p.cds[k] = Math.max(0, p.cds[k] - dt);
    for (const w of s.active) {
        w.elapsed += dt;
        const data = waveFor(l, w.index, s.mode === 'chaos', s.mode === 'endless');
        data.groups.forEach((g, i) => { while (w.spawned[i] < g.count && w.elapsed >= g.delay + w.spawned[i] * g.interval && s.enemies.length < 180) {
            spawn(s, g.kind, g.path, w.index);
            w.spawned[i]++;
        } });
        w.done = data.groups.every((g, i) => w.spawned[i] >= g.count);
    }
    const positions = new Map<number, Point>();
    for (const e of s.enemies) {
        if (e.hp <= 0)
            continue;
        const def = ENEMIES[e.kind];
        e.marked=Math.max(0,e.marked-dt);e.hit = Math.max(0, e.hit - dt);
        e.bossClock += dt;
        if (e.poisonTime > 0) {
            damage(s, e, e.poison * dt, true);
            e.poisonTime -= dt;
        }
        else
            e.poison = 0;
        if (e.burnTime > 0) {
            damage(s, e, e.burn * dt, true);
            e.burnTime -= dt;
        }
        else
            e.burn = 0;
        e.slowTime = Math.max(0, e.slowTime - dt);
        if (!e.slowTime)
            e.slow = 0;
        e.broken = Math.max(0, e.broken - dt);
        if(e.kind==='shaman'&&e.bossClock>=5){e.bossClock=0;const here=position(l.paths[e.path],e.progress);let healed=0;for(const other of s.enemies){if(other.id!==e.id&&other.hp>0&&!ENEMIES[other.kind].boss&&other.hp<other.maxHp&&dist(here,position(l.paths[other.path],other.progress))<115&&healed<4){other.hp=Math.min(other.maxHp,other.hp+Math.min(70,other.maxHp*.05));healed++;}}effect(s,here,'heal','#bba4e4',115,.5);}
        let speed = def.speed * (1 - Math.min(.7, e.slow) * (def.boss ? .4 : 1));
        if(!def.boss&&s.enemies.some(a=>a.kind==='drummer'&&a.id!==e.id&&a.hp>0&&dist(position(l.paths[a.path],a.progress),position(l.paths[e.path],e.progress))<=100))speed*=1.22;
        if(e.kind==='mimic'&&e.hp<e.maxHp*.5){if(e.phase===0){e.phase=1;effect(s,position(l.paths[e.path],e.progress),'burst','#e3b273',40,.5);}speed*=1.65;}
        if(e.kind==='duchess'){const phase=Math.floor(e.bossClock/8);if(e.phase!==phase){e.phase=phase;s.announcement=phase%2?'Duquesa · proteção MÁGICA: usa dano físico!':'Duquesa · proteção FÍSICA: usa magia!';}}
        if(e.kind==='admiral'&&e.phase<6){if(e.bossClock>=9&&e.phase%2===0){e.phase++;s.announcement='Almirante: reforços nos flancos em 3 segundos!';}if(e.bossClock>=12&&e.phase%2===1){e.phase++;e.bossClock=0;for(let path=0;path<l.paths.length;path++)for(let i=0;i<2;i++)if(s.enemies.length<180)spawn(s,'runner',path,e.spawnWave,true,i*.015);}}
        if(e.kind==='hydra'){const phase=e.hp/e.maxHp<.3?2:e.hp/e.maxHp<.65?1:0;if(phase>e.phase){e.phase=phase;s.announcement='Hidra: áudio encaminhado para a terceira rota!';for(let i=0;i<2;i++)if(s.enemies.length<180)spawn(s,'runner',l.paths.length-1,e.spawnWave,true,i*.02);effect(s,position(l.paths[e.path],e.progress),'burst','#9fe59c',100,1);}}
        if(e.kind==='kraken'&&e.phase<6){if(e.bossClock>=13&&e.phase%2===0){e.phase++;s.announcement='Kraken: tentáculos nos flancos em 3 segundos!';}if(e.bossClock>=16&&e.phase%2===1){e.phase++;e.bossClock=0;for(let i=0;i<3;i++)if(s.enemies.length<180)spawn(s,'runner',(e.path+1)%l.paths.length,e.spawnWave,true,i*.015);}}
        if(e.kind==='magistrate'&&Math.floor(e.bossClock/12)>e.phase){e.phase=Math.floor(e.bossClock/12);s.announcement='Juiz Pombo: silêncio em 2 segundos! Afasta as defesas.';}
        if(e.kind==='phoenix'&&e.hp<e.maxHp*.08&&e.phase===0){e.phase=1;e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.25);effect(s,position(l.paths[e.path],e.progress),'burst','#ffc37a',100,1);s.announcement='Fénix: renasceu uma vez. Agora é definitivo!';}
        if(e.kind==='archivist'){const phase=e.hp/e.maxHp<.3?2:e.hp/e.maxHp<.65?1:0;if(phase>e.phase){e.phase=phase;s.announcement='Arquivista: páginas soltas em todas as rotas!';for(let path=0;path<l.paths.length;path++)if(s.enemies.length<180)spawn(s,phase===1?'wisp':'armored',path,e.spawnWave,true,0);}}
        if (e.kind === 'legollas') {
            if (e.phase === 0) {
                e.phase = 1;
                s.announcement = LEGOLLAS.firstWarning;
            }
            if (e.bossClock >= 3 && e.phase === 1) {
                e.phase = 2;
                s.announcement = `Legollas: «${LEGOLLAS.first}»`;
                for (let i = 0; i < 3; i++)
                    if (s.enemies.length < 180)
                        spawn(s, 'dog', e.path, e.spawnWave, true, Math.max(0, e.progress - i * .025));
                effect(s, position(l.paths[e.path], e.progress), 'burst', '#af415f', 80, 1);
            }
            if (e.bossClock >= 8 && e.phase === 2) {
                e.phase = 3;
                s.announcement = LEGOLLAS.secondWarning;
            }
            if (e.bossClock >= 11 && e.phase === 3) {
                e.phase = 4;
                e.armor += 8;
                s.announcement = `Legollas: «${LEGOLLAS.second}»`;
                effect(s, position(l.paths[e.path], e.progress), 'burst', '#b13b66', 110, 1.4);
            }
            if (e.phase >= 4)
                speed *= 1.25;
        }
        if (e.kind === 'ratazao' && e.bossClock > 12 && e.phase < 3) {
            e.bossClock = 0;
            e.phase++;
            for (let i = 0; i < 3; i++)
                if (s.enemies.length < 180)
                    spawn(s, 'rat', e.path, e.spawnWave, true, Math.max(0, e.progress - i * .015));
            s.announcement = 'Ratazão chama três ajudantes. Recompensa dos invocados: 0.';
        }
        if (e.kind === 'vacuum') {
            const cycle = e.bossClock % 10;
            if (cycle > 7 && cycle < 8.5)
                speed *= .3;
            if (cycle >= 8.5)
                speed *= 3;
        }
        if (e.kind === 'king') {
            const phase = e.hp / e.maxHp < .3 ? 2 : e.hp / e.maxHp < .65 ? 1 : 0;
            if (phase > e.phase) {
                e.phase = phase;
                s.announcement = `Rei Roedor · fase ${phase + 1}! A máquina acelera.`;
                for (let i = 0; i < 3; i++)
                    if (s.enemies.length < 180)
                        spawn(s, 'armored', e.path, e.spawnWave, true, e.progress - i * .02);
            }
            speed *= 1 + e.phase * .25;
        }
        e.progress += speed * dt / pathLength(l.paths[e.path]);
        positions.set(e.id, position(l.paths[e.path], e.progress));
    }
    for(const trap of s.traps){trap.life-=dt;for(const enemy of s.enemies){if(enemy.hp<=0)continue;const pos=positions.get(enemy.id);if(!pos||dist(trap,pos)>SKILLS[trap.kind].radius)continue;if(trap.kind==='box'){if(trap.charges<=0||trap.hits.includes(enemy.id))continue;trap.hits.push(enemy.id);trap.charges--;damage(s,enemy,60,true);enemy.slow=Math.max(enemy.slow,.65);enemy.slowTime=Math.max(enemy.slowTime,2.5);effect(s,pos,'burst','#c7a46b',35,.4);}else{enemy.marked=.2;enemy.slow=Math.max(enemy.slow,.25);enemy.slowTime=Math.max(enemy.slowTime,.2);}}}
    s.traps=s.traps.filter(t=>t.life>0&&(t.kind==='sardine'||t.charges>0));
    for (const t of s.towers) {
        t.shot = Math.max(0, t.shot - dt);if(s.enemies.some(e=>e.kind==='magistrate'&&e.hp>0&&e.bossClock%12>=2&&e.bossClock%12<4&&e.bossClock>=12&&dist(l.spots[t.spot],position(l.paths[e.path],e.progress))<130))continue;
        if (t.kind === 'commander')
            continue;
        const st=stats(t,s),base=l.spots[t.spot],leash=movementRadius(t.kind);const nearby=leash?s.enemies.filter(e=>e.hp>0&&e.progress<1&&dist(base,positions.get(e.id)!)<=st.range+leash).sort((a,b)=>b.progress-a.progress||a.id-b.id)[0]:undefined;const pos=approach(t,base,nearby?(positions.get(nearby.id)||null):null,st.range,dt);
        let haste = 0, bonus = 0;
        for (const commander of s.towers)
            if ((commander.kind === 'commander'||commander.kind==='bard')&&commander.id!==t.id && dist(pos, l.spots[commander.spot]) <= stats(commander, s).range) {
                if(commander.kind==='commander')haste = Math.max(haste, .22 + (commander.level - 1) * .04);else bonus=Math.max(bonus,commander.branch==='b'?.25:.12+(commander.level-1)*.02);
                if (commander.kind==='commander'&&commander.branch === 'b')
                    bonus = Math.max(bonus, .18);
            }
        t.cd -= dt * Math.min(1.8, 1 + haste + (s.war > 0 ? .4 : 0) + (t.kind === 'uia' && s.uia > 0 ? .75 : 0));
        if (t.cd > 0)
            continue;
        let targets = s.enemies.filter(e => e.hp > 0 && e.progress < 1 && dist(pos, positions.get(e.id) || position(l.paths[e.path], e.progress)) <= st.range);
        targets.sort((a, b) => t.priority === 'strong' ? b.hp - a.hp || a.id - b.id : t.priority === 'near' ? dist(pos, positions.get(a.id)!) - dist(pos, positions.get(b.id)!) || a.id - b.id : b.progress - a.progress || a.id - b.id);
        const e = targets[0];
        if (!e) {
            t.cd = 0;
            continue;
        }
        const to = positions.get(e.id) || position(l.paths[e.path], e.progress);
        t.casts=(t.casts||0)+1;t.angle = Math.atan2(to.y - pos.y, to.x - pos.x);
        t.shot = t.kind==='uia'?.75:t.kind==='monk'?.55:.25;
        t.cd = st.interval;
        if (['knight','monk','uia','samurai','boxer','guardian','allyRatazao','allyVacuum','allyHydra','allyKraken'].includes(t.kind)) {
            const hit = t.kind === 'uia' ? targets : targets.slice(0,['guardian','allyRatazao','allyVacuum','allyHydra','allyKraken'].includes(t.kind)?3:t.kind==='samurai'?(t.branch==='a'?3:1):t.kind==='boxer'?1:t.kind==='monk'?(t.branch==='a'?4:2):(t.branch==='b'?4:1));
            for (const en of hit)
                impact(s, en, t.kind, t.branch, t.level, st.damage * (1 + bonus), st.magic,t.casts-1);
            effect(s, pos, t.kind === 'uia' ? 'uia' : 'burst', CATS[t.kind].color, st.range, .35);
        }
        else if(t.kind==='adminMage'&&(t.casts-1)%4===2){for(const target of targets.slice(0,t.branch==='a'?3:2)){impact(s,target,t.kind,t.branch,t.level,st.damage*.8*(1+bonus),true,2);effect(s,positions.get(target.id)!,'burst','#a7a0f5',28,.35);}}
        else s.projectiles.push({spell:t.casts-1,id:s.nextId++, from: { ...pos }, pos: { ...pos }, target: e.id, speed: t.kind === 'bomber' ? 260 : 450, damage: st.damage * (1 + bonus), magic: t.kind==='allyDuchess'?t.casts%2===0:st.magic, area: t.kind==='adminMage'&&(t.casts-1)%4===3?(t.branch==='b'?70:50):t.kind === 'witch' && t.branch === 'b' ? 80 : st.area, kind: t.kind, branch: t.branch, level: t.level, towerId: t.id });
    }
    s.projectiles = s.projectiles.filter(p => {
        const target = s.enemies.find(e => e.id === p.target && e.hp > 0);
        if (!target)
            return false;
        const dest = position(l.paths[target.path], target.progress), d = dist(p.pos, dest);
        if (d <= p.speed * dt) {
            const hit = p.area ? s.enemies.filter(e => e.hp > 0 && dist(dest, position(l.paths[e.path], e.progress)) <= p.area) : [target];
            for (const e of hit) {
                impact(s, e, p.kind, p.branch, p.level, p.damage, p.magic,p.spell||0);
                if (e.hp <= 0) {
                    const t = s.towers.find(t => t.id === p.towerId);
                    if (t)
                        t.kills++;
                }
            }
            if (p.area)
                effect(s, dest, 'burst', CATS[p.kind].color, p.area, .5);
            return false;
        }
        p.pos.x += (dest.x - p.pos.x) * p.speed * dt / d;
        p.pos.y += (dest.y - p.pos.y) * p.speed * dt / d;
        return true;
    });
    s.enemies = s.enemies.filter(e => { if (e.hp <= 0) {
        pay(s, e.summon ? 0 : ENEMIES[e.kind].reward);
        s.kills++;
        effect(s, position(l.paths[e.path], e.progress), 'death', ENEMIES[e.kind].color, ENEMIES[e.kind].size, .5);
        return false;
    } if (e.progress >= 1) {
        if(e.kind==='thief'&&!s.invulnerable)for(const p of s.players)if(!p.infiniteMoney)p.coins=Math.max(0,p.coins-15);
        if(!s.invulnerable)s.hp = Math.max(0, s.hp - ENEMIES[e.kind].leak);
        effect(s, position(l.paths[e.path], 1), 'hit', '#dc7862', 35, .5);
        return false;
    } return true; });
    const finished = s.active.filter(w => w.done && !s.enemies.some(e => e.spawnWave === w.index));
    for (const w of finished) {
        pay(s, waveFor(l, w.index, s.mode === 'chaos', s.mode === 'endless').reward);
        s.completed++;
        s.revision++;
    }
    s.active = s.active.filter(w => !finished.includes(w));
    if (!s.active.length && s.wave > 0 && (s.wave < l.waves.length || s.mode === 'endless')) {
        s.prep -= dt;
        if (s.prep <= 0)
            command(s, 0, { type: 'wave' });
    }
    s.effects = s.effects.filter(e => { e.life -= dt; return e.life > 0; });
    if (s.hp <= 0) {
        s.status = 'lost';
        s.revision++;
    }
    else if (s.mode !== 'endless' && s.wave >= l.waves.length && !s.active.length && !s.enemies.length) {
        s.status = 'won';
        s.revision++;
    }
}
/** Passos fixos usados pelo jogo e pelos testes; a velocidade altera quantos passos são executados. */
export function advance(s: State, seconds: number) { const count = Math.floor(seconds * s.speed / STEP); for (let i = 0; i < count; i++)
    step(s); }
export function previewWave(s: State) { const l = LEVELS[s.levelId - 1]; if (s.wave >= l.waves.length && s.mode !== 'endless')
    return 'Última onda em curso'; const w = waveFor(l, s.wave, s.mode === 'chaos', s.mode === 'endless'); return w.groups.map(g => `${g.count} ${g.kind === 'legollas' && !s.enemies.some(e => e.kind === 'legollas') ? 'presença desconhecida' : ENEMIES[g.kind].name}`).join(' · '); }
