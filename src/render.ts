import {movementRadius} from './mobility';
import {battleBackground} from './battle-background';
import {expansionCatFrames,expansionEnemyFrames,RECRUITS,RECRUIT_CATS,laterBossFrames} from './expansion';
import { CATS, ENEMIES, H, LEVELS, W } from './data';
import {art,atlas,catFrame,enemyFrame} from './art';
import {CombatVfx,drawAura,drawRouteHints} from './combat-vfx';
import { position, stats } from './simulation';
import type { CatKind, Enemy, Level, Point, Save, State, Tower } from './types';
type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const legollasSprite = new Image();
legollasSprite.src = '/legollas.webp';
function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, color: string) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
function line(c: Ctx, points: Point[], color: string, width: number) { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); }
function polygon(c: Ctx, pts: number[][], color: string) { c.fillStyle = color; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); }
function round(c: Ctx, x: number, y: number, w: number, h: number, r: number, color: string) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
function random(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function tree(c: Ctx, x: number, y: number, size = 1, night = false) { c.save(); c.translate(x, y); c.scale(size, size); ellipse(c, 5, 8, 32, 15, '#173c3620'); round(c, -4, -8, 9, 25, 3, '#886e4b'); ellipse(c, -14, -14, 23, 24, night ? '#36574d' : '#4d8062'); ellipse(c, 11, -18, 27, 28, night ? '#426656' : '#659574'); ellipse(c, 0, -32, 21, 22, night ? '#54715b' : '#8aaa79'); ellipse(c, -8, -40, 10, 5, '#b4c68b45'); c.restore(); }
function house(c: Ctx, x: number, y: number, w = 110, color = '#bc785f') { ellipse(c, x + 8, y + 25, w * .62, 20, '#183d3426'); round(c, x - w / 2, y - 30, w, 65, 4, '#e3c5a0'); round(c, x - 12, y + 2, 24, 33, 4, '#576751'); polygon(c, [[x - w * .6, y - 26], [x - w * .42, y - 66], [x + w * .42, y - 66], [x + w * .6, y - 26]], color); line(c, [{ x: x - w * .58, y: -26 + y }, { x: x + w * .58, y: y - 26 }], '#6b5146', 4); for (let i = 0; i < 4; i++)
    line(c, [{ x: x - w * .42 + i * w * .22, y: y - 61 }, { x: x - w * .57 + i * w * .29, y: y - 30 }], '#f4cc9f40', 2); for (const dx of [-33, 33]) {
    round(c, x + dx - 9, y - 10, 18, 18, 3, '#3d635c');
    line(c, [{ x: x + dx, y: y - 10 }, { x: x + dx, y: y + 8 }], '#d6bb8c', 2);
} round(c, x + w * .27, y - 78, 13, 29, 2, '#bb9d80'); }
const backgrounds = new Map<number, HTMLCanvasElement>();
export function background(level: Level): HTMLCanvasElement {
    const cached = backgrounds.get(level.id);
    if (cached)
        return cached;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext('2d')!;
    const night = level.theme === 'night', town = level.theme === 'town', rand = random(level.id * 63), grass = night ? '#557267' : town ? '#b5b899' : '#b8c99a';
    c.fillStyle = grass;
    c.fillRect(0, 0, W, H);
    const terrain=level.theme==='archive'?art.archive:level.theme==='coast'?art.coast:night?art.night:town?art.town:art.terrain;
    const illustrated=terrain.complete&&terrain.naturalWidth>0;
    if(illustrated)c.drawImage(terrain,0,0,W,H);
    for (let i = 0; i < (illustrated?0:1100); i++) {
        const x = rand() * W, y = rand() * H;
        c.fillStyle = i % 3 === 0 ? '#f3e1b126' : '#365f4210';
        c.fillRect(x, y, rand() * 8 + 2, 2);
    }
    // Patches of soft moss and clover, arranged independently of collision geometry.
    for (let i = 0; i < (illustrated?0:60); i++)
        ellipse(c, rand() * W, rand() * H, rand() * 45 + 5, rand() * 16 + 3, night ? '#173f3510' : '#82a16d20');
    for (const path of level.paths) {
        line(c, path, '#182e3d55', 67);
        line(c, path, night?'#293e50':'#7d7754', 58);
        line(c, path, night?'#607481':town?'#b69b76':'#b6a582', 52);
        for (let i = 0; i < path.length - 1; i++) {
            const a = path[i], b = path[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y), dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
            for (let d = 10; d < len; d += 25) {
                const x = a.x + dx * d, y = a.y + dy * d;
                c.save();
                c.translate(x, y);
                c.rotate(Math.atan2(dy, dx));
                const stone=(night?['#8a9ca7','#728892','#798e9c','#92a3ac']:['#d6c8a7','#bdb39a','#c4b797','#cfc1a2'])[Math.floor(rand()*4)];
                round(c,-10,-23,21,20,3,'#6b684d55');round(c,-10,-24,20,18,3,stone);
                round(c,-6,0,21,21,4,'#6b684d55');round(c,-6,-1,20,19,4,stone);
                line(c,[{x:-7,y:-21},{x:7,y:-21}],'#f1e6c23d',1);
                if(rand()>.6){line(c,[{x:-5,y:4},{x:0,y:9},{x:-2,y:14}],night?'#475d6855':'#7a795044',.8);}
                c.restore();
            }
        }
    }
    // Decorative plots, terracotta roofs and lanterns frame the playable field.
    if(!illustrated){for (const [x, y, z] of [[35, 60, .95], [930, 65, 1.2], [960, 535, 1.1], [45, 545, 1.2], [560, 565, .8], [355, 555, .65]])
        tree(c, x, y, z, night);
    house(c, 475, 48, 102, night ? '#6b6b85' : '#b77760');
    house(c, 120, 560, 104, town ? '#627f7b' : '#bd8668');
    house(c, 830, 560, 106, '#748d79');
    }
    for (let i = 0; i < (illustrated?0:23); i++) {
        const x = rand() * W, y = rand() * H;
        if (level.paths.some(path => path.some(p => Math.hypot(p.x - x, p.y - y) < 75)) || level.spots.some(p => Math.hypot(p.x - x, p.y - y) < 58))
            continue;
        tree(c, x, y, .45 + rand() * .35, night);
    }
    for (let i = 0; i < 80; i++) {
        const x = rand() * W, y = rand() * H;
        if (level.spots.some(p => Math.hypot(p.x - x, p.y - y) < 35))
            continue;
        for (let j = 0; j < 3; j++)
            ellipse(c, x + j * 4, y + (j % 2) * 4, 2, 2, i % 2 ? '#e9d49c' : '#f0e8cf');
    }
    // A small prophecy sign.
    round(c, 672, 38, 4, 35, 1, '#8d7353');
    round(c, 647, 26, 53, 24, 3, '#e9d7b2');
    c.fillStyle = '#615d49';
    c.font = 'bold 9px Georgia';
    c.textAlign = 'center';
    c.fillText('ELE GIRA', 674, 42);
    level.paths.forEach((path, i) => { const a = path[0], end = path[path.length - 1]; c.save(); c.translate(Math.max(18, a.x + 25), a.y); polygon(c, [[-10, -9], [3, -9], [3, -15], [18, 0], [3, 15], [3, 9], [-10, 9]], '#9c6c55'); c.restore(); if(!illustrated)house(c, Math.min(959, end.x - 65), end.y - 7, 65, '#546d65');else{round(c,Math.min(930,end.x-105),end.y-54,86,27,4,'#324e39df');}c.fillStyle = '#f4dfab'; c.font = 'bold 12px Georgia'; c.textAlign = 'center'; c.fillText(level.dual ? 'RAÇÃO ' + (i + 1) : 'REFÚGIO', Math.min(972, end.x - 62), end.y - 36); });
    backgrounds.set(level.id, canvas);
    return canvas;
}
export function drawCat(c: Ctx, kind: CatKind, x: number, y: number, scale = 1, level = 1, angle = 0, attack = 0, time = 0, branch = '',casts=0) {
    if(art.cats.complete&&art.cats.naturalWidth){
        c.save();c.translate(x,y);c.scale(scale,scale);ellipse(c,0,19,24,8,'#17372b55');
        drawAura(c,kind,0,0,time,attack,casts);
        const breathe=time?Math.sin(time*2.4+x*.03)*.025:0;
        c.translate(Math.cos(angle)*attack*7,-Math.sin(attack*Math.PI)*4);c.rotate(Math.sin(time*1.8+x)*.014+Math.sin(angle)*attack*.1);c.scale(1+breathe,1-breathe);
        c.save();if(kind!=='uia'&&Math.cos(angle)<-.2)c.scale(-1,1);
        if(kind==='uia'&&art.uia.complete&&art.uia.naturalWidth){const frame=Math.floor(time*(attack>0?(level>=2?16:10):level>=2?5:2))%8;atlas(c,art.uia,4,2,frame,-40,-58,80,80);if(level>=2){c.strokeStyle='#e9c168';c.lineWidth=2;c.beginPath();c.ellipse(0,19,35+level*3,10,0,0,TAU);c.stroke();}}
        else if(kind==='adminMage'&&art.adminSpells.naturalWidth){const f=attack>0?1+(Math.max(0,casts-1)%4):level===3?5:0;atlas(c,art.adminSpells,3,2,f,-48,-73,96,96);}
        else if(RECRUIT_CATS.includes(kind)){const enemy=RECRUITS[kind as keyof typeof RECRUITS].enemy;if(laterBossFrames[enemy]!==undefined){atlas(c,art.laterBosses,2,2,laterBossFrames[enemy]!,-48,-62,96,80);}else if(enemy==='legollas'&&art.legollas.naturalWidth){atlas(c,art.legollas,4,2,attack>0?3:Math.floor(time*2)%2,-44,-70,88,88);}else{const fresh=expansionEnemyFrames[enemy]!==undefined;atlas(c,fresh?art.villains:art.enemies,3,3,(fresh?expansionEnemyFrames[enemy]:enemyFrame[enemy])||0,-44,-66,88,88);}c.strokeStyle='#8ce7d6';c.lineWidth=2;c.beginPath();c.ellipse(0,20,30,8,0,0,TAU);c.stroke();}
        else if(expansionCatFrames[kind]!==undefined&&art.roster.naturalWidth){atlas(c,art.roster,3,3,expansionCatFrames[kind]!,-44,-66,88,88);if(level===3){c.strokeStyle=CATS[kind].color;c.lineWidth=2;c.beginPath();c.ellipse(0,20,37,10,0,0,TAU);c.stroke();}}
        else if(level>=3&&art.evolved.complete&&art.evolved.naturalWidth){const frames={archer:0,ice:1,bomber:2,knight:3,witch:4,commander:5,bard:6,monk:7,engineer:8,uia:0};atlas(c,art.evolved,3,3,(frames as Partial<Record<CatKind,number>>)[kind]||0,-44,-66,88,88);}
        else if(kind==='monk'&&art.elemental.complete&&art.elemental.naturalWidth){const f=attack>0?1+Math.max(0,casts-1)%5:0;atlas(c,art.elemental,3,2,f,-43,-64,86,86);}
        else if(['bard','monk','engineer'].includes(kind)&&art.extra.complete&&art.extra.naturalWidth)atlas(c,art.extra,3,1,({bard:0,monk:1,engineer:2} as Record<string,number>)[kind],-40,-58,80,80);
        else atlas(c,art.cats,4,2,catFrame[kind]||0,-40,-58,80,80);
        c.restore();
        if(level>1){for(let i=0;i<level-1;i++){polygon(c,[[-8+i*12,25],[-3+i*12,20],[2+i*12,25],[-3+i*12,30]],'#e7c375');}}
        if(attack>0&&kind!=='commander'&&kind!=='uia'){c.strokeStyle=CATS[kind].color;c.lineWidth=2;c.globalAlpha=.65;c.beginPath();c.arc(0,-5,40,-.7+angle,.7+angle);c.stroke();}
        c.restore();return;
    }
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    const color = CATS[kind].color;
    ellipse(c, 1, 17, 22, 9, '#173d3633');
    if (kind === 'uia')
        c.rotate(attack ? time * (level + 2) : Math.sin(time) * .06);
    // Curled tail, coat, paws and unmistakable triangular ears.
    c.strokeStyle = kind === 'uia' ? '#ddd2b5' : '#8d7257';
    c.lineWidth = 8;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-13, 12);
    c.bezierCurveTo(-38, 17, -30, -4, -22, 0);
    c.stroke();
    ellipse(c, 0, 7, 17, 19, kind === 'uia' ? '#ddd9c7' : kind === 'ice' ? '#5e8d9b' : kind === 'witch' ? '#715874' : kind === 'commander' ? '#738263' : '#697b62');
    ellipse(c, -9, 20, 8, 5, '#e7cba5');
    ellipse(c, 9, 20, 8, 5, '#e7cba5');
    polygon(c, [[-19, -11], [-19, -32], [-5, -21]], kind === 'uia' ? '#d6d4c5' : color);
    polygon(c, [[5, -21], [19, -32], [19, -11]], kind === 'uia' ? '#d6d4c5' : color);
    polygon(c, [[-16, -17], [-16, -26], [-9, -20]], '#c9827e');
    polygon(c, [[9, -20], [16, -26], [16, -17]], '#c9827e');
    ellipse(c, 0, -10, 20, 17, kind === 'uia' ? '#e5e1d4' : kind === 'knight' ? '#bcb5a4' : color);
    ellipse(c, 0, -3, 11, 8, '#f0dfbd');
    c.strokeStyle = '#293f37';
    c.lineWidth = 2.3;
    for (const dx of [-7, 7]) {
        c.beginPath();
        c.moveTo(dx - 3, -12);
        c.lineTo(dx + 3, -12 + (kind === 'uia' ? 0 : -1));
        c.stroke();
    }
    polygon(c, [[-3, -5], [3, -5], [0, -1]], '#b77872');
    line(c, [{ x: 0, y: -1 }, { x: -3, y: 2 }], '#785953', 1);
    line(c, [{ x: 0, y: -1 }, { x: 3, y: 2 }], '#785953', 1);
    for (const sign of [-1, 1])
        for (let k = 0; k < 2; k++)
            line(c, [{ x: sign * 11, y: -3 + k * 5 }, { x: sign * 25, y: -5 + k * 8 }], '#5f635b', .9);
    if (kind === 'archer') {
        line(c, [{ x: -7, y: 7 }, { x: 12, y: 19 }], '#e2c595', 4);
        c.strokeStyle = '#68563e';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(23 + attack * 10, 1, 18, -1.4, 1.4);
        c.stroke();
        line(c, [{ x: 26, y: -17 }, { x: 26, y: 19 }], '#eee0b8', 1);
        line(c, [{ x: 7, y: 4 }, { x: 39 + attack * 20, y: 4 }], '#ede1b9', 2);
        polygon(c, [[40 + attack * 20, 4], [32 + attack * 20, 0], [32 + attack * 20, 8]], '#526b62');
        if (level > 1)
            round(c, -15, -23, 28, 7, 3, branch === 'b' ? '#586e74' : '#6e8758');
    }
    if (kind === 'ice' || kind === 'witch') {
        polygon(c, [[-23, -22], [0, -55], [22, -22]], kind === 'ice' ? '#719faa' : '#705579');
        ellipse(c, 0, -22, 26, 5, kind === 'ice' ? '#a2d6d7' : '#b992c5');
        line(c, [{ x: 26, y: 24 }, { x: 26, y: -26 }], '#755f49', 4);
        if (kind === 'ice')
            polygon(c, [[26, -42], [17, -29], [26, -15], [35, -29]], '#c3f0e7');
        else {
            ellipse(c, 26, -29, 9, 9, '#b6c270');
            ellipse(c, 24, -32, 3, 3, '#e3eaa7');
        }
        if (level > 1)
            ellipse(c, -4, -36, 3, 3, '#ecd393');
    }
    if (kind === 'bomber') {
        round(c, -20, -28, 40, 10, 4, '#5f6555');
        ellipse(c, 23, 9, 13, 13, '#46534a');
        line(c, [{ x: 23, y: -4 }, { x: 27, y: -13 }], '#c5ac76', 3);
        ellipse(c, 28, -14, 4 + attack * 5, 4 + attack * 5, '#f1be6b');
        round(c, -12, 0, 24, 6, 2, '#ac714c');
    }
    if (kind === 'knight') {
        polygon(c, [[-19, -15], [-14, -30], [14, -30], [21, -15]], '#98a6a6');
        round(c, -18, -17, 36, 6, 2, '#6b8385');
        polygon(c, [[22, -22], [29, -12], [25, 20], [20, 20], [19, -12]], '#e4e3c7');
        round(c, 14, 14, 22, 4, 1, '#c6a565');
        ellipse(c, -22, 8, 11, 16, '#879c9c');
        line(c, [{ x: -22, y: -5 }, { x: -22, y: 19 }], '#d8c799', 3);
    }
    if (kind === 'commander') {
        line(c, [{ x: 27, y: 24 }, { x: 27, y: -51 }], '#7c684b', 4);
        polygon(c, [[29, -50], [57, -44], [48, -32], [29, -35]], '#cfaa61');
        c.fillStyle = '#526b50';
        c.font = 'bold 13px Georgia';
        c.fillText('✦', 34, -37);
        round(c, -17, -26, 34, 8, 3, '#5c705a');
        ellipse(c, 0, -23, 3, 4, '#e6c579');
    }
    if (kind === 'uia') {
        if (level > 1) {
            c.strokeStyle = '#ead49a';
            c.lineWidth = 2;
            c.setLineDash([5, 6]);
            c.beginPath();
            c.ellipse(0, 7, 31 + level * 4, 15, 0, 0, TAU);
            c.stroke();
            c.setLineDash([]);
        }
        if (level === 3)
            polygon(c, [[-14, -27], [-18, -40], [-5, -34], [0, -45], [6, -34], [18, -40], [14, -27]], '#e6bc6c');
    }
    if (level > 1 && kind !== 'uia') {
        for (let i = 0; i < level - 1; i++)
            ellipse(c, -5 + i * 10, 10, 2.5, 2.5, '#f3d997');
    }
    c.restore();
}
export function drawEnemy(c: Ctx, e: Enemy, x: number, y: number, time: number) {
    const d = ENEMIES[e.kind];
    if(e.kind!=='legollas'&&art.enemies.complete&&art.enemies.naturalWidth){
        const freshBoss=laterBossFrames[e.kind]!==undefined;const width=(d.boss?75:e.kind==='swarm'?54:65)*(d.size/16),height=width*(art.enemies.naturalHeight/3)/(art.enemies.naturalWidth/3);
        c.save();c.translate(x,y);ellipse(c,0,9,width*.28,8,'#1a302a55');const walk=time?Math.sin(time*(e.kind==='runner'?15:9)+e.id):0;c.translate(0,-Math.abs(walk)*(e.kind==='runner'?5:3));c.rotate(walk*.045);c.scale(1+Math.abs(walk)*.025,1-Math.abs(walk)*.035);atlas(c,freshBoss?art.laterBosses:expansionEnemyFrames[e.kind]!==undefined?art.villains:art.enemies,freshBoss?2:3,freshBoss?2:3,laterBossFrames[e.kind]??expansionEnemyFrames[e.kind]??enemyFrame[e.kind]??0,-width/2,-height+14,width,height);if(e.hit>0){c.globalAlpha=e.hit*2;ellipse(c,0,-height*.38,width*.27,height*.35,'#fff1c9');}c.restore();
        if(['shaman','drummer','duchess','admiral'].includes(e.kind)){c.save();c.strokeStyle=e.kind==='duchess'?(Math.floor(e.bossClock/8)%2?'#c5a4f5':'#e5b76e'):d.color;c.globalAlpha=.55;c.lineWidth=e.kind==='duchess'&&e.bossClock%8>6?4:2;c.setLineDash([8,7]);c.beginPath();c.ellipse(x,y+8,width*.4,12,0,0,TAU);c.stroke();c.restore();}
        if(e.slowTime>0){c.strokeStyle='#a6e5e9';c.lineWidth=2;c.beginPath();c.ellipse(x,y+10,width*.34,7,0,0,TAU);c.stroke();}
        if(e.poisonTime>0)ellipse(c,x-width*.3,y,3,5,'#b3d65f');if(e.burnTime>0)ellipse(c,x+width*.3,y,4,7,'#e7a34c');
        if(e.hp<e.maxHp||d.boss){const bar=d.boss?75:30;round(c,x-bar/2,y-height-2,bar,4,2,'#253b2c99');round(c,x-bar/2,y-height-2,bar*Math.max(0,e.hp/e.maxHp),4,2,d.boss?'#c9796a':'#d4c58a');}
        return;
    }
    c.save();
    c.translate(x, y);
    const bounce = Math.sin(time * 8 + e.id) * 1.4;
    c.translate(0, bounce);
    const scale = d.size / 16;
    c.scale(scale, scale);
    ellipse(c, 0, 13, 18, 7, '#29443930');
    if (e.kind === 'legollas') {
        const casting = e.phase === 1 || e.phase === 3;
        if(art.legollas.complete&&art.legollas.naturalWidth){
            const clock=e.bossClock;let frame=Math.floor(time*2)%2;
            if(e.phase===1)frame=2;if(e.phase===2&&clock<4.5)frame=3;if(e.phase===3)frame=5;if(e.phase>=4)frame=6+Math.floor(time*3)%2;
            atlas(c,art.legollas,4,2,frame,-31,-48,62,62);
        }
        else if (legollasSprite.complete && legollasSprite.naturalWidth)
            c.drawImage(legollasSprite, -27, -42, 54, 54);
        else {
            polygon(c, [[-18, 17], [-13, -20], [13, -20], [22, 17]], '#332d37');
            polygon(c, [[-18, 17], [-13, -20], [-5, 17]], '#97384c');
            ellipse(c, 0, -22, 10, 11, '#ba9173');
            round(c, -11, -34, 22, 8, 3, '#3b2d29');
            round(c, -10, -24, 8, 5, 1, '#232c2c');
            round(c, 2, -24, 8, 5, 1, '#232c2c');
            line(c, [{ x: 17, y: 13 }, { x: 23, y: -26 }], '#6b4c48', 2);
            ellipse(c, 23, -27, 5, 5, '#bf3257');
        }
        c.strokeStyle = casting ? '#c34e6a' : '#9e47634d';
        c.lineWidth = 1.3;
        c.beginPath();
        c.ellipse(0, 15, 24 + Math.sin(time * 3) * 2, 8, 0, 0, TAU);
        c.stroke();
        if (e.phase >= 4)
            for (let i = 0; i < 3; i++) {
                const a = time * 1.5 + i * TAU / 3, fx = Math.cos(a) * 25, fy = Math.sin(a) * 10 + 4;
                ellipse(c, fx, fy, 5, 2.5, '#b45778');
                polygon(c, [[fx - 4, fy], [fx - 9, fy - 4], [fx - 9, fy + 4]], '#b45778');
            }
    }
    else if (e.kind === 'vacuum') {
        ellipse(c, 0, 1, 22, 20, '#455c5c');
        ellipse(c, 0, -3, 22, 19, '#9aaba2');
        ellipse(c, 0, -3, 14, 12, '#597470');
        round(c, -8, -9, 16, 5, 2, e.bossClock % 10 > 7 ? '#e9b65a' : '#a6d9ba');
        line(c, [{ x: -26, y: 8 }, { x: -14, y: 2 }], '#7a7a66', 4);
        line(c, [{ x: 26, y: 8 }, { x: 14, y: 2 }], '#7a7a66', 4);
    }
    else {
        c.strokeStyle = '#bf9d8a';
        c.lineWidth = 3;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-10, 8);
        c.bezierCurveTo(-39, 7, -23, -16, -35, -12);
        c.stroke();
        ellipse(c, 0, 4, 17, 16, d.color);
        ellipse(c, -7, 17, 6, 4, '#bba28c');
        ellipse(c, 9, 17, 6, 4, '#bba28c');
        if (e.kind === 'dog') {
            ellipse(c, -14, -14, 7, 12, '#79634f');
            ellipse(c, 14, -14, 7, 12, '#79634f');
            ellipse(c, 0, -5, 17, 15, d.color);
            ellipse(c, 1, 2, 11, 7, '#d2b18b');
        }
        else {
            ellipse(c, -13, -16, 9, 9, d.color);
            ellipse(c, 13, -16, 9, 9, d.color);
            ellipse(c, -13, -16, 5, 5, '#c2918d');
            ellipse(c, 13, -16, 5, 5, '#c2918d');
            ellipse(c, 0, -5, 16, 13, d.color);
            polygon(c, [[-9, 0], [9, 0], [2, 13]], '#c0aaa0');
        }
        ellipse(c, -6, -7, 2, 2, '#2b3b35');
        ellipse(c, 6, -7, 2, 2, '#2b3b35');
        ellipse(c, 2, 8, 3, 2, '#625057');
        if (e.kind === 'armored') {
            polygon(c, [[-18, -8], [-11, -25], [11, -25], [19, -8]], '#718a91');
            line(c, [{ x: -18, y: -8 }, { x: 18, y: -8 }], '#c0c9bc', 3);
            round(c, -14, 5, 28, 10, 3, '#73878a');
        }
        if (e.kind === 'elite' || e.kind === 'king')
            round(c, -16, 4, 32, 9, 3, '#886f8e');
        if (e.kind === 'king' || e.kind === 'ratazao')
            polygon(c, [[-15, -23], [-17, -39], [-5, -31], [0, -44], [7, -31], [17, -39], [15, -23]], '#cfad62');
    }
    if (e.slowTime > 0) {
        c.strokeStyle = '#b6edf0';
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(0, 15, 22, 7, 0, 0, TAU);
        c.stroke();
    }
    if (e.poisonTime > 0)
        ellipse(c, -18, 0, 3, 4, '#c2dc83');
    if (e.burnTime > 0)
        ellipse(c, 18, 0, 3, 5, '#f1b671');
    if (e.hit > 0) {
        c.globalAlpha = .3;
        ellipse(c, 0, 0, 20, 20, '#fff9e1');
        c.globalAlpha = 1;
    }
    c.restore();
    if (e.hp < e.maxHp || d.boss) {
        const width = d.boss ? 70 : 28;
        round(c, x - width / 2, y - d.size - 17, width, 4, 2, '#30463c70');
        round(c, x - width / 2, y - d.size - 17, width * Math.max(0, e.hp / e.maxHp), 4, 2, d.boss ? '#cd986f' : '#93b98c');
    }
}
export interface Selection {
    aimRadius?:number;
    spot: number | null;
    preview: CatKind | null;
    aim: Point | null;
}
export class Renderer {
    private vfx = new CombatVfx();
    private c: Ctx;
    private dpr = 1;
    private smooth = new Map<number, Point>();
    constructor(public canvas: HTMLCanvasElement) { this.c = canvas.getContext('2d')!; }
    resize(quality: Save['settings']['quality']) { const r = this.canvas.getBoundingClientRect(); this.dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2); const w = Math.round(r.width * this.dpr), h = Math.round(r.height * this.dpr); if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
    } }
    point(clientX: number, clientY: number): Point { const r = this.canvas.getBoundingClientRect(); return { x: (clientX - r.left) * W / r.width, y: (clientY - r.top) * H / r.height }; }
    screen(p: Point) { const r = this.canvas.getBoundingClientRect(); return { x: r.left + p.x * r.width / W, y: r.top + p.y * r.height / H }; }
    dispose() {}
    draw(s: State, selected: Selection, settings: Save['settings'], remote = false) {
        this.resize(settings.quality);
        const c = this.c, l = LEVELS[s.levelId - 1];
        c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
        c.clearRect(0, 0, W, H);
        c.drawImage(battleBackground(l,this.canvas.width/this.canvas.height),0,0,W,H);
        drawRouteHints(c,s,settings.reduced);
        const chosen = s.towers.find(t => t.spot === selected.spot), spot = selected.spot === null ? null : l.spots[selected.spot];
        if (spot && (chosen || selected.preview)) {
            const range = chosen ? stats(chosen, s).range+movementRadius(chosen.kind) : CATS[selected.preview!].range+movementRadius(selected.preview!);
            c.fillStyle = '#eef1ca24';
            c.strokeStyle = '#f9efbaaa';
            c.lineWidth = 2;
            c.setLineDash([7, 6]);
            c.beginPath();
            c.arc(spot.x, spot.y, range, 0, TAU);
            c.fill();
            c.stroke();
            c.setLineDash([]);
        }
        if(chosen&&['commander','bard','guardian'].includes(chosen.kind)){const center=l.spots[chosen.spot],range=stats(chosen,s).range;for(const ally of s.towers){if(ally.id===chosen.id)continue;const to=l.spots[ally.spot];if(Math.hypot(to.x-center.x,to.y-center.y)<=range){c.save();c.globalAlpha=.55;line(c,[center,to],'#aee6d5',2);c.strokeStyle='#c4efb2';c.lineWidth=2;c.beginPath();c.ellipse(to.x,to.y+14,30,11,0,0,TAU);c.stroke();c.restore();}}}
        for (let i = 0; i < l.spots.length; i++) {
            const p = l.spots[i];
            if (s.towers.some(t => t.spot === i))
                continue;
            c.save();c.translate(p.x,p.y);c.scale((this.canvas.height/H)/(this.canvas.width/W)*1.5,1.5);ellipse(c,0,3,24,18,'#172d3b44');ellipse(c,0,0,22,19,selected.spot===i?'#e5c783':'#193c359c');c.strokeStyle=selected.spot===i?'#ffe6a4':'#d6cb9ac4';c.lineWidth=2;c.beginPath();c.ellipse(0,0,22,19,0,0,TAU);c.stroke();line(c,[{x:-7,y:0},{x:7,y:0}],'#e9e0b9',2.5);line(c,[{x:0,y:-7},{x:0,y:7}],'#e9e0b9',2.5);c.restore();
        }
        const t = s.time;
        for(const trap of s.traps){
            c.save();c.translate(trap.x,trap.y);
            c.globalAlpha=.12;c.fillStyle=trap.kind==='box'?'#d2a465':'#dbbe77';c.beginPath();c.arc(0,0,trap.kind==='box'?60:100,0,TAU);c.fill();c.globalAlpha=1;
            if(trap.kind==='box'){round(c,-18,-13,36,28,3,'#946b42');polygon(c,[[-18,-13],[0,-23],[19,-13],[0,-5]],'#c49d63');polygon(c,[[-18,-13],[-28,-20],[-11,-29],[0,-23]],'#dfbb7e');polygon(c,[[0,-23],[11,-29],[28,-19],[19,-13]],'#dfbb7e');ellipse(c,-5,0,3,4,'#203930');ellipse(c,6,0,3,4,'#203930');}
            else{ellipse(c,0,4,26,12,'#ece5c7');ellipse(c,0,3,20,8,'#8a9c91');polygon(c,[[-12,0],[0,-8],[14,0],[0,8]],'#bb9e67');polygon(c,[[12,0],[22,-6],[22,6]],'#bb9e67');ellipse(c,-5,-1,1,1,'#243b32');}
            c.restore();
        }
        const sorted = [...s.towers.map(t => ({ type: 'cat' as const, t, y: l.spots[t.spot].y+(t.offset?.y||0) })), ...s.enemies.map(e => ({ type: 'enemy' as const, e, y: position(l.paths[e.path], e.progress).y }))].sort((a, b) => a.y - b.y);
        const live = new Set<number>();
        for (const obj of sorted) {
            if (obj.type === 'cat') {
                const t=obj.t,base=l.spots[t.spot],p={x:base.x+(t.offset?.x||0),y:base.y+(t.offset?.y||0)};if((t.offset?.x||t.offset?.y)&&selected.spot===t.spot){c.save();c.globalAlpha=.6;line(c,[base,p],'#ede1ab',1.5);ellipse(c,base.x,base.y,8,5,'#f0dca380');c.restore();}
                if (t.owner === 1) {
                    c.strokeStyle = '#79bed2';
                    c.lineWidth = 3;
                    c.beginPath();
                    c.ellipse(p.x, p.y + 18, 23, 9, 0, 0, TAU);
                    c.stroke();
                }
                c.save();c.translate(p.x,Math.max(95,p.y));c.scale((this.canvas.height/H)/(this.canvas.width/W),1);drawCat(c, t.kind, 0, 0, 1.4, t.level, t.angle, settings.reduced ? 0 : t.kind==='uia'&&s.uia>0?1:t.shot,settings.reduced?0:s.time, t.branch,t.casts);c.restore();
            }
            else {
                const e = obj.e;
                let p = position(l.paths[e.path], e.progress);
                if (remote) {
                    const prev = this.smooth.get(e.id);
                    if (prev)
                        p = { x: prev.x + (p.x - prev.x) * .24, y: prev.y + (p.y - prev.y) * .24 };
                    this.smooth.set(e.id, p);
                    live.add(e.id);
                }
                c.save();c.translate(p.x,p.y);c.scale((this.canvas.height/H)/(this.canvas.width/W)*1.12,1.12);drawEnemy(c, e, 0, 0, settings.reduced ? 0 : t);c.restore();
            }
        }
        for (const id of this.smooth.keys())
            if (!live.has(id))
                this.smooth.delete(id);
        for (const p of s.projectiles) {
            const target=s.enemies.find(e=>e.id===p.target),dest=target?position(l.paths[target.path],target.progress):p.pos;
            c.save();c.translate(p.pos.x,p.pos.y);c.rotate(Math.atan2(dest.y-p.pos.y,dest.x-p.pos.x));
            if(!settings.reduced&&p.magic){c.globalAlpha=.18;ellipse(c,-10,0,22,7,CATS[p.kind].color);c.globalAlpha=1;}
            if(p.kind==='archer'){line(c,[{x:-14,y:0},{x:10,y:0}],'#6a4b30',2);polygon(c,[[15,0],[6,-4],[6,4]],'#e4e0c1');polygon(c,[[-11,0],[-17,-5],[-7,-3]],'#ded4b0');}
            else if(p.kind==='ice'){polygon(c,[[10,0],[0,-6],[-8,0],[0,6]],'#a8e8ee');line(c,[{x:-7,y:0},{x:-19,y:0}],'#caf5ec88',3);}
            else if(p.kind==='bomber'){ellipse(c,0,0,7,7,'#35443a');line(c,[{x:3,y:-5},{x:7,y:-10}],'#e0ad62',2);ellipse(c,8,-10,2,2,'#ffdb81');}
            else{ellipse(c,0,0,6,6,CATS[p.kind].color);ellipse(c,-2,-2,2,2,'#f3edce');line(c,[{x:-8,y:0},{x:-18,y:0}],CATS[p.kind].color+'88',3);}
            c.restore();
        }
        if(!settings.reduced){for(let i=0;i<(settings.quality==='low'?5:12);i++){const x=(i*173+s.time*(l.theme==='night'?3:9))%W,y=(i*97+s.time*4)%H;c.save();c.translate(x,y);c.rotate(Math.sin(s.time+i));ellipse(c,0,0,l.theme==='night'?1.5:3,l.theme==='night'?1.5:1.2,l.theme==='night'?'#e9d69460':'#b9a76780');c.restore();}}
        for (const e of s.effects.slice(-(settings.reduced ? 15 : settings.quality === 'low' ? 25 : 80))) {
            const f = 1 - e.life / e.maxLife;
            c.globalAlpha = Math.min(.7, e.life / e.maxLife);
            if (e.type === 'death') {
                if (!settings.reduced){
                    for(let i=0;i<(settings.quality==='low'?3:7);i++){const a=i*TAU/7+e.id;ellipse(c,e.x+Math.cos(a)*f*e.size*2,e.y+Math.sin(a)*f*e.size-f*18,Math.max(1,4*(1-f)),Math.max(1,3*(1-f)),i%2?'#f1d49c':e.color);}
                }
            }
            else {
                c.strokeStyle = e.color;
                c.lineWidth = e.type === 'yarn' ? 5 : 2;
                c.beginPath();
                c.arc(e.x, e.y, Math.max(1, e.size * f), 0, TAU);
                c.stroke();
                if(e.type==='burst'||e.type==='reaction'||e.type==='uia'){
                    if(!settings.reduced)for(let i=0;i<8;i++){const a=i*TAU/8+e.id;line(c,[{x:e.x+Math.cos(a)*e.size*f*.5,y:e.y+Math.sin(a)*e.size*f*.5},{x:e.x+Math.cos(a)*e.size*f,y:e.y+Math.sin(a)*e.size*f}],e.color,2);}
                    if(e.label){c.globalAlpha=Math.min(1,e.life*3);c.font='bold 12px sans-serif';c.textAlign='center';c.strokeStyle='#173038';c.lineWidth=3;c.strokeText(e.label,e.x,e.y-35-f*15);c.fillStyle=e.color;c.fillText(e.label,e.x,e.y-35-f*15);}
                }
                if (e.type === 'yarn' && !settings.reduced)
                    for (let i = 0; i < 7; i++) {
                        const a = i * TAU / 7 + f;
                        ellipse(c, e.x + Math.cos(a) * e.size * f, e.y + Math.sin(a) * e.size * f, 8, 8, '#f2d19d');
                    }
            }
            c.globalAlpha = 1;
        }
        this.vfx.draw(c,s,settings);
        if (selected.aim) {
            c.fillStyle = '#e9c77d44';
            c.strokeStyle = '#fff2ce';
            c.lineWidth = 2;
            c.beginPath();
            c.arc(selected.aim.x, selected.aim.y, selected.aimRadius||110, 0, TAU);
            c.fill();
            c.stroke();
        }
        if (s.war > 0) {
            c.strokeStyle = '#e8be6d';
            c.lineWidth = 4;
            c.strokeRect(3, 3, W - 6, H - 6);
        }
    }
}
const portraits = new Map<string, string>();
export function portrait(kind: CatKind, level = 1) { const key = kind + level; if (portraits.has(key))
    return portraits.get(key)!; const canvas = document.createElement('canvas'); canvas.width = 140; canvas.height = 140; const c = canvas.getContext('2d')!; ellipse(c, 70, 75, 57, 57, CATS[kind].color + '25'); drawCat(c, kind, 65, 83, 1.65, level); const url = canvas.toDataURL(); portraits.set(key, url); return url; }
export function thumbnail(level: Level) { return background(level).toDataURL('image/webp', .75); }
export function drawHome(canvas: HTMLCanvasElement, time: number) { const c = canvas.getContext('2d')!; canvas.width = 1000; canvas.height = 600; c.drawImage(background(LEVELS[0]), 0, 0); for (const [kind, x, y, scale] of [['archer', 230, 280, 2.7], ['ice', 500, 235, 2.3], ['bomber', 665, 400, 2.5], ['commander', 390, 460, 2.2]] as [
    CatKind,
    number,
    number,
    number
][]) {
    drawCat(c, kind, x, y, scale, 2, 0, 0, time);
} c.fillStyle = '#f0e4c6'; c.font = 'italic 20px Georgia'; c.textAlign = 'center'; c.fillText('O último saco de ração tem quem o defenda.', 520, 560); }
