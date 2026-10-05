import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadSatellite,loadInstrument,getSatellite,getComponentFocus,getSelectableComponentMeshes,showSatelliteInterior,showSatellite,showInstrument,getCurrentView} from './src/components/objects/Satellite.js';
import {showInstrumentInterior} from './src/components/objects/Satellite.js';
import {createInstrumentComponents} from './src/components/objects/InstrumentComponents.js';
globalThis.ProgressEvent=class {constructor(type,init){Object.assign(this,init)}};
globalThis.self=globalThis;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async (request)=>{const url=typeof request==='string'?request:request.url;if(url.startsWith('file:')) return new Response(await fs.readFile(new URL(url)));return nativeFetch(request)};
const scene=new THREE.Scene();
await new Promise((resolve,reject)=>loadSatellite(scene,{onLoad:resolve,onError:reject}));
const root=getSatellite();let meshes=0,triangles=0;const colors=new Set();
root.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const m of [].concat(o.material))colors.add(m.color.getHexString());});
assert(colors.size>5);assert(triangles<3929677);
const mapped={};for(const c of ['xrayInstrument','starTrackerModule','dawn4UCubeDrive','sBandAntenna','sunSensor','magnetorquers','solarPanel'])mapped[c]=Boolean(getComponentFocus(c));
const selections=getSelectableComponentMeshes().length;
showSatelliteInterior();let hidden=0;root.traverse(o=>{if(o.isMesh&&!o.visible)hidden++});assert(hidden>0);showSatellite();let restored=0;root.traverse(o=>{if(o.isMesh&&!o.visible)restored++});assert.equal(restored,0);
const instrument=await loadInstrument(scene);assert.equal(getSelectableComponentMeshes().length,selections);showInstrument();assert.equal(root.visible,false);assert.equal(instrument.visible,true);showSatellite();assert.equal(root.visible,true);assert.equal(instrument.visible,false);
const instrumentParts=createInstrumentComponents(instrument);const instrumentGroups={};
for(const key of ['detectors','baffles','electronics','calibration','structure','mounts','support']) {
 const meshes=instrumentParts.getMeshes(key);assert(meshes.length>0);instrumentGroups[key]=meshes.length;
 const original=meshes[0].material;instrumentParts.highlight(key);assert.notEqual(meshes[0].material,original);instrumentParts.clearHighlight();assert.equal(meshes[0].material,original);
}
instrument.traverse(mesh=>{if(!mesh.isMesh)return;assert(instrumentParts.getComponent(mesh));assert(mesh.material.metalness<=.35);if(mesh.name.startsWith('Sensor_'))assert.equal(instrumentParts.getComponent(mesh),'detectors');if(mesh.parent?.name.startsWith('Science_baffle'))assert.equal(instrumentParts.getComponent(mesh),'baffles');});
showInstrumentInterior();assert.equal(instrumentParts.getMeshes('structure').filter(mesh=>!mesh.visible).length,6);showInstrument();assert(instrumentParts.getMeshes('structure').every(mesh=>mesh.visible));showSatellite();
console.log(JSON.stringify({instrumentGroups,sourceColors:colors.size,interiorPanelsRestore:true}));
console.log(JSON.stringify({meshes,triangles,colors:colors.size,mapped,hidden,selections,view:getCurrentView()}));
