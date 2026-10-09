import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOptics,createPartViewer} from './src/components/objects/Optics.js';
globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,init){Object.assign(this,init)}};
const nativeFetch=globalThis.fetch;globalThis.fetch=async r=>{const url=typeof r==='string'?r:r.url;return url.startsWith('file:')?new Response(await fs.readFile(new URL(url))):nativeFetch(r)};
const scene=new THREE.Scene();const optics=createOptics(scene);assert(!optics.root.visible);optics.show(true);optics.setPlaying(true);assert(optics.isAnimating());optics.update(900);const rayStages=new Set();let tube;optics.root.traverse(o=>{if(o.userData.component==='tube')tube=o;if(o.isLine){rayStages.add(o.userData.rayStage);const a=o.geometry.attributes.position;assert.equal(a.count,12);}});assert.deepEqual(rayStages,new Set(['incoming','primary-reflection','secondary-reflection']));assert.equal(tube.geometry.parameters.radiusTop,.25);assert.equal(tube.geometry.parameters.radiusBottom,.2);optics.hide();assert(!optics.isAnimating());
const parts=createPartViewer(scene);for(const key of ['primary','secondary','fpm']){const root=await parts.load(key);assert(!root.visible);parts.show(root);assert(root.visible);parts.hide();assert(!root.visible);const bounds=new THREE.Box3().setFromObject(root);assert(!bounds.isEmpty());}
await assert.rejects(parts.load('fpcm'));
console.log('PASS: three color-coded ray stages show two reflections; animation/visibility; FPM and mirror CAD assets decode, frame and hide; FPCM is excluded.');
