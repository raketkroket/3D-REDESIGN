// camera en scene omzetten naar pixels

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