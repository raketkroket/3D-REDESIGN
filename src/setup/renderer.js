// alles wat 3d is ff op je scherm knallen

import * as THREE from 'three';

export function createRenderer() {
    const canvas = document.querySelector('#app');

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    return renderer;
}