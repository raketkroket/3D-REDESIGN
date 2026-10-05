import * as THREE from "three";

export function createLights(scene) {
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0xd8dce2, 1.1);
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    const fill = new THREE.DirectionalLight(0xf0f4ff, 0.65);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    const offsets = [
        [key, new THREE.Vector3(-3, 4, 6)],
        [fill, new THREE.Vector3(4, 1, 3)],
        [rim, new THREE.Vector3(1, 3, -4)],
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
