// ff wat licht op de sat gooien
import * as THREE from 'three';

export function createLights(scene) {
    // Softer ambient fill + stronger directional separation makes the model read as 3D.
    const hemisphere = new THREE.HemisphereLight(0xdcecff, 0x0b0e13, 0.82);

    const mainLight = new THREE.DirectionalLight(0xfff1df, 4.1);
    mainLight.position.set(9, 12, 10);

    const fillLight = new THREE.DirectionalLight(0x9fcaff, 1.15);
    fillLight.position.set(-11, 1, 7);

    const rimLight = new THREE.DirectionalLight(0xc8e2ff, 3.35);
    rimLight.position.set(3, 8, -13);

    const lowerFill = new THREE.DirectionalLight(0xffb890, 0.72);
    lowerFill.position.set(-3, -8, 4);

    scene.add(hemisphere);
    scene.add(mainLight);
    scene.add(fillLight);
    scene.add(rimLight);
    scene.add(lowerFill);

    return { update: () => {} };
}