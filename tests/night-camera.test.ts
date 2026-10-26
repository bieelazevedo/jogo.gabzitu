import {it,expect} from 'vitest';
import {nightZoom,nightMovement,nightFollow,nightBoom} from '../src/night-camera';
it('camera follow takes the shortest arc and keeps idle and casting stable',()=>{const a=nightFollow(Math.PI-.02, .02,1,0,.05);expect(Math.abs(a-(Math.PI-.02))).toBeLessThan(.1);expect(nightFollow(1,2,0,0,.1)).toBe(1);expect(nightFollow(1,2,1,2,.1)).toBe(1);});
it('a held movement heading remains fixed while the camera follows',()=>{const movement=nightMovement(1,0,0);let camera=0;for(let i=0;i<50;i++)camera=nightFollow(camera,Math.PI/2,1,0,.05);expect(Math.abs(camera)).toBeGreaterThan(1);expect(nightMovement(1,0,0)).toEqual(movement);expect(Math.hypot(...Object.values(nightMovement(1,1,2)))).toBeCloseTo(1);});
it('zoom stays bounded and the boom pulls in ahead of an obstacle',()=>{expect(nightZoom(20)).toBe(1.55);expect(nightZoom(-1)).toBe(.7);expect(nightBoom(0,0,0,10,[{x:0,z:6,r:1}])).toBeLessThan(5);expect(nightBoom(0,0,0,10,[])).toBe(10);});

import {nightLook} from '../src/night-camera';
it('manual camera rotates through 360 degrees and clamps vertical drag',()=>{const turn=nightLook(0,.42,1280,0,960,540);expect(turn.yaw).toBeCloseTo(-Math.PI*2);expect(nightLook(0,.42,0,10000,960,540).pitch).toBe(.95);expect(nightLook(0,.42,0,-10000,960,540).pitch).toBe(.12);const moved=nightMovement(0,-1,nightLook(0,.42,-320,0,960,540).yaw);expect(moved.x).toBeCloseTo(-1);expect(moved.z).toBeCloseTo(0);});
