// ff wat licht op de sat gooien
import * as THREE from 'three';

export function createLights(scene) {
    const hemisphere = new THREE.HemisphereLight(0xdcecff, 0x171b20, 1.15);

    const mainLight = new THREE.DirectionalLight(0xfff6e8, 3.2);
    mainLight.position.set(8, 10, 12);

    const fillLight = new THREE.DirectionalLight(0xb9d8ff, 1.35);
    fillLight.position.set(-10, 2, 6);

    const rimLight = new THREE.DirectionalLight(0xd7e9ff, 2.15);
    rimLight.position.set(2, 7, -12);

    scene.add(hemisphere);
    scene.add(mainLight);
    scene.add(fillLight);
    scene.add(rimLight);

    return { update: () => {} };
}