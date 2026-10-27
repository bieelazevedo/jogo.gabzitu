import {CATS} from './data';
import {validateFarmProgress} from './farm-progress';
import type { Save } from './types';
export const SAVE_KEY = 'muralhas-bigodes-v2';
let scope='';
let volatileProgress=false;
export const progressIsVolatile=()=>volatileProgress;
export const saveScope=()=>scope;
export function setSaveScope(userId:string|null,volatile=false){scope=userId?':'+userId:'';volatileProgress=volatile;}
export function fresh(): Save { return { version: 2, formation:{team:['archer','ice'],coopTeam:['archer','ice','bomber'],updatedAt:0}, stars: {}, chaos: {}, records: {}, settings: { effects: .4, music: .16, comedy: .65, reduced: false, quality: 'high' }, skill: 'war', equipment: 'standard' }; }
export function validateSave(raw: unknown): Save {
    if (!raw || typeof raw !== 'object')
        throw Error('O ficheiro não contém progresso válido.');
    const v = raw as Partial<Save>;
    if (v.version !== 2 && (v as {
        version?: number;
    }).version !== 1)
        throw Error('Esta versão de progresso não é compatível.');
    const s = fresh();
    for (const key of ['stars', 'chaos', 'records'] as const) {
        const obj = v[key];
        if (obj && typeof obj === 'object')
            for (const [id, n] of Object.entries(obj)) {
                if (!/^([1-9]|[12][0-9]|3[01])$/.test(id) || typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > (key === 'records' ? 100000 : 3))
                    throw Error('O ficheiro tem resultados inválidos.');
                s[key][id] = n;
            }
    }
    // A cadeia de desbloqueio deve ser coerente.
    for (let i = 2; i <= 31; i++)
        if (s.stars[i] && !s.stars[i - 1])
            throw Error('O progresso tem fases fora de ordem.');
    if (v.settings) {
        for (const k of ['music', 'effects', 'comedy'] as const) {
            const n = v.settings[k];
            if (typeof n === 'number' && Number.isFinite(n))
                s.settings[k] = Math.max(0, Math.min(1, n));
        }
        s.settings.reduced = v.settings.reduced === true;
        if (['low', 'medium', 'high'].includes(v.settings.quality))
            s.settings.quality = v.settings.quality;
    }
    if (v.skill&&['heal','box','sardine'].includes(v.skill))
        s.skill = v.skill!;
    if (v.equipment === 'keen')
        s.equipment = 'keen';
    if(v.formation&&typeof v.formation==='object'){
      const clean=(list:unknown)=>Array.isArray(list)?[...new Set(list.filter((k):k is keyof typeof CATS=>typeof k==='string'&&Object.hasOwn(CATS,k)&&k!=='uia'))].slice(0,8):[];
      s.formation={team:clean(v.formation.team),coopTeam:clean(v.formation.coopTeam),updatedAt:typeof v.formation.updatedAt==='number'&&Number.isFinite(v.formation.updatedAt)?Math.max(0,v.formation.updatedAt):0};
    }
    if(v.farm)s.farm=validateFarmProgress(v.farm);
    return s;
}
export function load(): Save { try {
    if(volatileProgress)return fresh();
    const raw = localStorage.getItem(SAVE_KEY+scope);
    return raw ? validateSave(JSON.parse(raw)) : fresh();
}
catch {
    return fresh();
} }
export function persist(s: Save): boolean { try {
    if(volatileProgress)return true;
    localStorage.setItem(SAVE_KEY+scope, JSON.stringify(s));
    return true;
}
catch {
    return false;
} }
export function totalStars(s: Save) { return Object.values(s.stars).reduce((a, b) => a + b, 0); }
export function completed(s: Save) { let n = 0; while (s.stars[n + 1])
    n++; return n; }
export function starsFor(hp: number, max: number) { return hp / max >= .9 ? 3 : hp / max >= .6 ? 2 : 1; }
export function recordWin(s: Save, id: number, hp: number, max: number, chaos = false) { const key = chaos ? 'chaos' : 'stars'; s[key][id] = Math.max(s[key][id] || 0, starsFor(hp, max)); }
