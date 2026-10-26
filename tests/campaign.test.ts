import { it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { playLevel } from './bot';
it('regista partidas de todas as fases sem alterar a economia', () => {
    const results = Array.from({ length: 31 }, (_, i) => playLevel(i + 1)).map(({ state, ...r }) => r);
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/campaign.json', JSON.stringify(results, null, 2));
    expect(results.filter(r => r.id <= 3).every(r => r.status === 'won')).toBe(true);
    expect(results.every(r => r.status !== 'playing')).toBe(true);
}, 120000);
