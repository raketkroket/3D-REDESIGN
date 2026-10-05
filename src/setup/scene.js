import * as THREE from 'three';
export function createScene(onChange = () => {}) {
 const scene = new THREE.Scene();
 new THREE.TextureLoader().load('/galaxy.jpg', texture => {
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.backgroundIntensity = 1.35;
  onChange();
 });
 return scene;
}
