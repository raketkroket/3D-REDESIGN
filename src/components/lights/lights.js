import * as THREE from "three";

export function createLights(scene) {
    const hemisphere = new THREE.HemisphereLight(0x9dc8ff, 0x111827, 0.42);
    const key = new THREE.DirectionalLight(0xfff0d6, 2.35);
    const fill = new THREE.DirectionalLight(0x9bc8ff, 0.42);
    const rim = new THREE.DirectionalLight(0xb7e2ff, 2.1);
    const offsets = [
        [key, new THREE.Vector3(-4, 5, 7)],
        [fill, new THREE.Vector3(5, 1, 4)],
        [rim, new THREE.Vector3(2, 4, -6)],
    ];
    scene.add(hemisphere, key, fill, rim, key.target, fill.target, rim.target);
    return {
        update(camera, target) {
            // Keep the light balance stable while the visitor orbits the assembly.
            for (const [light, offset] of offsets) {
                light.position.copy(offset).applyQuaternion(camera.quaternion).add(target);
                light.target.position.copy(target);
            }
        },
    };
}
