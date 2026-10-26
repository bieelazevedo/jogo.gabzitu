import { CATS, COMMON, LEVELS } from '../src/data';
import { command, createState, dist, position, step } from '../src/simulation';
import type { CatKind } from '../src/types';
/** Jogador automatizado: usa só comandos públicos e dinheiro obtido em combate. Não altera vida ou saldo. */
export function playLevel(id: number, alternate = false, chaos = false) {
    const unlocked = COMMON.filter(k => CATS[k].unlock < id), team = unlocked.slice(0, 5);
    if (id > 10)
        team.push('uia');
    const s = createState(id, chaos ? 'chaos' : 'campaign', [team]);
    const l = LEVELS[id - 1];
    const coverage = (spot: number, kind: CatKind) => l.paths.reduce((total, path) => { let n = 0; for (let p = 0; p < 1; p += .015)
        if (dist(l.spots[spot], position(path, p)) < CATS[kind].range)
            n++; return total + n; }, 0);
    const ranked = l.spots.map((_, spot) => ({ spot, score: coverage(spot, 'archer') })).sort((a, b) => b.score - a.score);
    const build = () => {
        const empty = ranked.filter(r => !s.towers.some(t => t.spot === r.spot));
        if (empty.length) {
            let kind: CatKind = 'archer';
            if (s.towers.length % 5 === 2 && team.includes('bomber'))
                kind = 'bomber';
            else if (s.towers.length % 4 === 1)
                kind = 'ice';
            else if (alternate && s.towers.length % 4 === 3 && team.includes('knight'))
                kind = 'knight';
            if (kind === 'ice' && s.towers.filter(t => t.kind === 'ice').length >= 3)
                kind = 'archer';
            const spot = empty[0].spot;
            if (s.players[0].coins >= CATS[kind].cost)
                command(s, 0, { type: 'build', kind, spot });
        }
        for (const t of s.towers.filter(t => t.kind !== 'ice').sort((a, b) => a.level - b.level)) {
            if (s.towers.length < 5 && empty.length)
                break;
            if (command(s, 0, { type: 'upgrade', id: t.id, branch: t.kind === 'archer' ? 'a' : 'b' }) === null)
                break;
        }
    };
    for (let i = 0; i < 4; i++)
        build();
    command(s, 0, { type: 'wave' });
    let peak = 0;
    for (let i = 0; i < 30 * 1800 && s.status === 'playing'; i++) {
        step(s);
        if (i % 30 === 0) {
            build();
            peak = Math.max(peak, s.enemies.length);
            if (s.enemies.length > 8 && s.players[0].cds.war === 0)
                command(s, 0, { type: 'ability', skill: 'war' });
            if (s.enemies.length > 12 && s.players[0].cds.yarn === 0) {
                const e = s.enemies.slice().sort((a, b) => b.progress - a.progress)[0], p = position(l.paths[e.path], e.progress);
                command(s, 0, { type: 'ability', skill: 'yarn', x: p.x, y: p.y });
            }
        }
    }
    return { id, status: s.status, hp: s.hp, time: Math.round(s.time), kills: s.kills, peak, towers: s.towers.length, state: s };
}
