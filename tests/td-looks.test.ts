import {it,expect} from 'vitest';
import {CAT_LOOKS,lookKey} from '../src/td-looks';
it('every tower defense cat has its own model combination',()=>{const keys=Object.values(CAT_LOOKS).map(lookKey);expect(new Set(keys).size).toBe(keys.length);});
