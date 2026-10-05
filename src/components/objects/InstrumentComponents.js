import * as THREE from "three";

// These groups follow the names in the supplied instrument assembly.
function componentForMesh(mesh) {
	const names = [];
	for (let object = mesh; object; object = object.parent) {
		names.push(object.name.toLowerCase().replace(/[\s:.-]+/g, "_"));
	}
	const path = names.join(" ");
	if (/sandwich_panel/.test(path)) return "support";
	if (/callibration|calibration|fe55|caltube/.test(path)) return "calibration";
	if (/science_baffle/.test(path)) return "baffles";
	if (/preamplifier|pa210|pa_230|housing_/.test(path)) return "electronics";
	if (/fpm_|fpcm_|sensor_/.test(path)) return "detectors";
	if (/rod|fitting|foot|feet/.test(path)) return "mounts";
	return "structure";
}

export function createInstrumentComponents(root) {
	const groups = new Map();
	const meshGroups = new Map();
	const originals = new Map();
	const highlighted = new Set();
	root.traverse((mesh) => {
		if (!mesh.isMesh) return;
		const component = componentForMesh(mesh);
		if (!groups.has(component)) groups.set(component, []);
		groups.get(component).push(mesh);
		meshGroups.set(mesh, component);
		originals.set(mesh, mesh.material);
	});

	function clearHighlight() {
		for (const mesh of highlighted) {
			const materials = [].concat(mesh.material);
			mesh.material = originals.get(mesh);
			materials.forEach((material) => material.dispose());
		}
		highlighted.clear();
	}

	return {
		getComponent: (mesh) => meshGroups.get(mesh),
		getMeshes: (component) => groups.get(component) ?? [],
		highlight(component) {
			clearHighlight();
			for (const mesh of groups.get(component) ?? []) {
				const source = originals.get(mesh);
				const materials = [].concat(source).map((material) => {
					const copy = material.clone();
					copy.emissive?.set(0xe9845b);
					copy.emissiveIntensity = 0.14;
					return copy;
				});
				mesh.material = Array.isArray(source) ? materials : materials[0];
				highlighted.add(mesh);
			}
		},
		getFocus(component, camera, target) {
			root.updateWorldMatrix(true, true);
			const box = new THREE.Box3().makeEmpty();
			for (const mesh of groups.get(component) ?? []) {
				if (mesh.visible) box.expandByObject(mesh);
			}
			if (box.isEmpty()) return null;
			return {
				componentCenter: box.getCenter(new THREE.Vector3()),
				componentRadius: box.getBoundingSphere(new THREE.Sphere()).radius,
				satelliteRadius: new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere()).radius,
				direction: camera.position.clone().sub(target).normalize(),
			};
		},
		clearHighlight,
	};
}
