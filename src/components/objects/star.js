import * as THREE from 'three';
export function createStars(amount, scene) {
 const positions = new Float32Array(amount * 3);
 const colors = new Float32Array(amount * 3);
 let seed=2026;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<amount;i++) {
  const y=random()*2-1, angle=random()*Math.PI*2, r=8+random()*2;
  const horizontal=Math.sqrt(1-y*y);
  positions.set([r*horizontal*Math.cos(angle),r*y,r*horizontal*Math.sin(angle)],i*3);
  const brightness=.4+random()*.6;
  colors.set([brightness*.88,brightness*.94,brightness],i*3);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const stars=new THREE.Points(geometry,new THREE.PointsMaterial({size:1.5,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.85,depthWrite:false}));
 stars.name='Starfield';scene.add(stars);return stars;
}
