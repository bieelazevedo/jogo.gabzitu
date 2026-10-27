export type CatKind = 'archer' | 'ice' | 'bomber' | 'knight' | 'witch' | 'commander' | 'bard' | 'monk' | 'engineer' | 'uia' | 'pirate' | 'samurai' | 'alchemist' | 'astronomer' | 'gardener' | 'chef' | 'boxer' | 'guardian' | 'adminMage' | 'allyLegollas' | 'allyRatazao' | 'allyVacuum' | 'allyKing' | 'allyAdmiral' | 'allyDuchess' | 'allyHydra' | 'allyKraken' | 'allyMagistrate' | 'allyPhoenix' | 'allyArchivist';
export type EnemyKind = 'rat' | 'runner' | 'dog' | 'armored' | 'swarm' | 'elite' | 'legollas' | 'ratazao' | 'vacuum' | 'king' | 'thief' | 'shaman' | 'scarab' | 'wisp' | 'drummer' | 'mimic' | 'admiral' | 'duchess' | 'hydra' | 'kraken' | 'magistrate' | 'phoenix' | 'archivist';
export type Point = {
    x: number;
    y: number;
};
export type Priority = 'first' | 'strong' | 'near';
export type Ability = 'yarn' | 'war' | 'heal' | 'box' | 'sardine' | 'uia';
export interface CatDef {
    name: string;
    short: string;
    role: string;
    color: string;
    cost: number;
    damage: number;
    range: number;
    interval: number;
    magic?: boolean;
    area?: number;
    a: string;
    b: string;
    unlock: number;
}
export interface EnemyDef {
    name: string;
    hp: number;
    speed: number;
    reward: number;
    leak: number;
    armor: number;
    magicResist?: number;
    color: string;
    size: number;
    boss?: boolean;
    description: string;
}
export interface Group {
    kind: EnemyKind;
    count: number;
    interval: number;
    path: number;
    delay: number;
}
export interface Wave {
    groups: Group[];
    reward: number;
    boss: boolean;
    title: string;
}
export interface Level {
    id: number;
    name: string;
    chapter: number;
    subtitle: string;
    story: string;
    novelty: string;
    theme: 'garden' | 'town' | 'night' | 'coast' | 'archive';
    paths: Point[][];
    spots: Point[];
    waves: Wave[];
    coins: number;
    bridgeAt?: number;
    dual?: boolean;
    high?: number[];
}
export interface Tower {
    offset?:Point;
    casts:number;
    id: number;
    spot: number;
    kind: CatKind;
    owner: number;
    level: number;
    branch: '' | 'a' | 'b';
    invested: number;
    priority: Priority;
    cd: number;
    angle: number;
    shot: number;
    kills: number;
}
export interface Enemy {
    reactionUntil?:number;
    marked:number;
    id: number;
    kind: EnemyKind;
    path: number;
    progress: number;
    hp: number;
    maxHp: number;
    armor: number;
    slow: number;
    slowTime: number;
    poison: number;
    poisonTime: number;
    burn: number;
    burnTime: number;
    broken: number;
    spawnWave: number;
    summon: boolean;
    phase: number;
    bossClock: number;
    hit: number;
}
export interface Projectile {
    spell?:number;
    id: number;
    from: Point;
    pos: Point;
    target: number;
    speed: number;
    damage: number;
    magic: boolean;
    area: number;
    kind: CatKind;
    branch: string;
    level: number;
    towerId: number;
}
export interface Effect extends Point {
    id: number;
    type: 'hit' | 'burst' | 'yarn' | 'death' | 'heal' | 'uia' | 'reaction';
    label?:string;
    color: string;
    life: number;
    maxLife: number;
    size: number;
}
export interface ActiveWave {
    index: number;
    elapsed: number;
    spawned: number[];
    done: boolean;
}
export interface Player {
    admin?:boolean;
    infiniteMoney?:boolean;
    coins: number;
    team: CatKind[];
    skills: Ability[];
    cds: Record<Ability, number>;
    heals: number;
    name: string;
    equipment: 'standard' | 'keen';
}
export interface State {
    adminUsed?:boolean;
    invulnerable?:boolean;
    traps:{id:number;kind:'box'|'sardine';x:number;y:number;life:number;charges:number;hits:number[]}[];
    version: number;
    levelId: number;
    mode: 'campaign' | 'chaos' | 'endless' | 'coop' | 'practice';
    time: number;
    tick: number;
    seed: number;
    nextId: number;
    status: 'playing' | 'won' | 'lost';
    hp: number;
    maxHp: number;
    players: Player[];
    towers: Tower[];
    enemies: Enemy[];
    projectiles: Projectile[];
    effects: Effect[];
    active: ActiveWave[];
    wave: number;
    completed: number;
    prep: number;
    speed: number;
    paused: boolean;
    war: number;
    uia: number;
    kills: number;
    damage: number;
    earned: number;
    announcement: string;
    votes: {
        pause: number[];
        speed: number[];
        expires: number;
    };
    revision: number;
}
export type Command = {
    type:'admin';
    option:'money'|'life';
    enabled:boolean;
} | {
    type: 'build';
    spot: number;
    kind: CatKind;
} | {
    type: 'upgrade';
    id: number;
    branch?: 'a' | 'b';
} | {
    type: 'sell';
    id: number;
} | {
    type: 'priority';
    id: number;
    priority: Priority;
} | {
    type: 'wave';
} | {
    type: 'ability';
    skill: Ability;
    x?: number;
    y?: number;
} | {
    type: 'pause';
} | {
    type: 'speed';
};
export interface Save {
    farm?:import('./farm-progress').FarmProgress;
    formation?:{team:CatKind[];coopTeam:CatKind[];updatedAt:number};
    version: 2;
    stars: Record<string, number>;
    chaos: Record<string, number>;
    records: Record<string, number>;
    settings: {
        effects: number;
        music: number;
        comedy?:number;
        reduced: boolean;
        quality: 'low' | 'medium' | 'high';
    };
    skill: 'war' | 'heal' | 'box' | 'sardine';
    equipment: 'standard' | 'keen';
}
