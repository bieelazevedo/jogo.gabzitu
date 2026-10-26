import {it,expect} from 'vitest';
import * as T from 'three';
import {HuntScene} from '../src/hunt-scene';
import {FarmScene} from '../src/farm-scene';
import {nightMovement} from '../src/night-camera';
import {farmMovement} from '../src/farm-controls';
it('both modes move forward along the rendered camera at every orbit angle',()=>{for(const yaw of [0,.6,1.5,3,4.5,6.2]){const camera=new T.PerspectiveCamera();camera.position.set(Math.sin(yaw)*7,4,Math.cos(yaw)*7);camera.lookAt(0,1,0);camera.updateMatrixWorld();const dir=camera.getWorldDirection(new T.Vector3());dir.y=0;dir.normalize();const night=Object.assign(Object.create(HuntScene.prototype),{camera});const farm=Object.assign(Object.create(FarmScene.prototype),{camera});const a=nightMovement(0,-1,night.movementHeading()),b=farmMovement(0,1,farm.movementHeading());expect(a.x).toBeCloseTo(dir.x);expect(a.z).toBeCloseTo(dir.z);expect(b.x).toBeCloseTo(dir.x);expect(b.z).toBeCloseTo(dir.z);}});
