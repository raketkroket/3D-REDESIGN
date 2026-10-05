// ff wat licht op de sat gooien
import * as THREE from 'three';

export function createLights(scene) {
    const hemisphere = new THREE.HemisphereLight(0xdcecff, 0x566677, 2.0);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(8, 10, 12);

    const fillLight = new THREE.DirectionalLight(0xdcecff, 2.0);
    fillLight.position.set(-10, 2, 6);

    const rimLight = new THREE.DirectionalLight(0xd7e9ff, 2.15);
    rimLight.position.set(2, 7, -12);

    scene.add(hemisphere);
    scene.add(mainLight);
    scene.add(fillLight);
    scene.add(rimLight);

    return { update: () => {} };
}