// controls voor ff rondkijken
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let controls;

export function createControls(camera, renderer) {
    controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.75;

    return controls;
}

export function updateControls(delta) {
    if (controls) controls.update(delta);
}