// alles wat 3d is ff op je scherm knallen

import * as THREE from 'three';

export function createRenderer() {
    const canvas = document.querySelector('#app');

    if (!canvas) return null;

    try {
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });

        const maximumPixelRatio = window.matchMedia('(max-width: 899px)').matches ? 1.3 : 1.6;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, maximumPixelRatio));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;

        return renderer;
    } catch {
        return null;
    }
}
