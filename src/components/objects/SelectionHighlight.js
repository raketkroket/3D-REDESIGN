import * as THREE from "three";

export function createSelectionHighlight(root, { ghostOpacity = 0.12 } = {}) {
	const originals = new Map();
	const temporaryMaterials = new Set();
	const glowing = new Map();
	const ghosted = new Map();
	root.traverse(mesh => { if (mesh.isMesh) originals.set(mesh, mesh.material); });

	function clear() {
		for (const [mesh, material] of originals) mesh.material = material;
	}

	function apply(meshes) {
		clear();
		const selected = new Set(meshes);
		if (!selected.size) return;
		for (const [mesh, source] of originals) {
			const active = selected.has(mesh);
			const cache = active ? glowing : ghosted;
			const materials = [].concat(source).map(base => {
				if (cache.has(base)) return cache.get(base);
				const material = base.clone();
				if (active) {
					material.userData.selectionHighlight = true;
					material.emissive?.set(0xffaa70);
					material.emissiveIntensity = 0.24;
					material.onBeforeCompile = shader => {
						shader.uniforms.selectionColor = { value: new THREE.Color(0xffaa70) };
						shader.fragmentShader = "uniform vec3 selectionColor;\n" + shader.fragmentShader;
						shader.fragmentShader = shader.fragmentShader.replace(
							"#include <emissivemap_fragment>",
							`#include <emissivemap_fragment>
							float selectionRim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);
							totalEmissiveRadiance += selectionColor * selectionRim * 0.9;`,
						);
					};
					material.customProgramCacheKey = () => "nebula-selection-rim-v1";
				} else {
					material.color?.lerp(new THREE.Color(0x607080), 0.85);
					material.metalness = 0.1;
					material.roughness = 0.8;
					material.transparent = true;
					material.opacity = base.opacity * ghostOpacity;
					material.depthWrite = false;
					material.forceSinglePass = true;
				}
				cache.set(base, material);
				temporaryMaterials.add(material);
				return material;
			});
			mesh.material = Array.isArray(source) ? materials : materials[0];
		}
	}

	return {
		apply,
		clear,
		dispose() {
			clear();
			for (const material of temporaryMaterials) material.dispose();
			temporaryMaterials.clear();
			glowing.clear();
			ghosted.clear();
		},
	};
}
