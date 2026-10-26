import {expect,it} from 'vitest';
import {farmMovement,farmLookTurn,farmOrbitStep} from '../src/farm-controls';
it('keeps a held joystick relative to the camera throughout a complete turn',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]){const m=farmMovement(0,1,yaw);expect(m.x).toBeCloseTo(Math.sin(yaw));expect(m.z).toBeCloseTo(Math.cos(yaw));expect(Math.hypot(m.x,m.z)).toBeCloseTo(1);}
 expect(Math.hypot(...Object.values(farmMovement(1,1,1)))).toBeCloseTo(1);
});
it('rotates continuously beyond 360 degrees and smooths across the angle seam',()=>{
 const turn=farmLookTurn(1200,390);expect(turn).toBeGreaterThan(Math.PI*2);
 const result=farmOrbitStep(Math.PI-.01,-Math.PI+.01,1/60);expect(result).toBeGreaterThan(Math.PI-.01);expect(result).toBeLessThan(Math.PI+.01);
 let y=0;for(let i=0;i<20;i++)y=farmOrbitStep(y,Math.PI/2,1/60);expect(y).toBeCloseTo(Math.PI/2,2);
});

import {farmStick,farmFollowYaw} from '../src/farm-controls';
it('thumb deadzone removes jitter and preserves analog walking',()=>{expect(farmStick(.04,.04)).toEqual({side:0,forward:0});expect(farmStick(.55,0).side).toBeCloseTo(.5);expect(Math.hypot(...Object.values(farmStick(1,1)))).toBeCloseTo(1);});
it('manual look overrides tracking and automatic tracking remains gentle',()=>{expect(farmFollowYaw(0,1,.05,0,1,true,2)).toBe(0);expect(Math.abs(farmFollowYaw(0,1,.05,0,1,false,2))).toBeLessThanOrEqual(.06);});
