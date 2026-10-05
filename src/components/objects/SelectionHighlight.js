import * as THREE from "three";

export function createSelectionHighlight(root, { ghostOpacity = 0.12 } = {}) {
	const highlightColor = new THREE.Color(0xffaa70);
	const ghostColor = new THREE.Color(0x607080);
	const originals = new Map();
	const temporaryMaterials = new Set();
	const glowing = new Map();
	const ghosted = new Map();
	root.traverse((object) => {
		if ((object.isMesh || object.isLine) && object.material) originals.set(object, object.material);
	});

	function clear() {
		for (const [mesh, material] of originals) mesh.material = material;
	}

	function apply(meshes) {
		clear();
		const selected = new Set(meshes);
		if (!selected.size) return;
		for (const [object, source] of originals) {
			const active = selected.has(object);
			const cache = active ? glowing : ghosted;
			const materials = [].concat(source).map((base) => {
				if (cache.has(base)) return cache.get(base);
				const material = base.clone();
				if (active) {
					material.userData.selectionHighlight = true;
					material.color?.lerp(highlightColor, material.isLineBasicMaterial ? 0.85 : 0.32);
					if (material.emissive) {
						material.emissive.copy(highlightColor);
						material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.48);
					}
				} else {
					// Keep context visible without turning the entire CAD model transparent.
					// Transparency forces expensive sorting/overdraw on hundreds of meshes.
					material.color?.lerp(ghostColor, 0.7);
					if (material.emissive) material.emissiveIntensity *= 0.2;
					material.transparent = false;
					material.opacity = 1;
					material.depthWrite = true;
					material.depthTest = true;
					material.forceSinglePass = true;
				}
				cache.set(base, material);
				temporaryMaterials.add(material);
				return material;
			});
			object.material = Array.isArray(source) ? materials : materials[0];
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
