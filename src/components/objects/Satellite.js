// Satellite.js
import * as THREE from "three";
import TWEEN from "three/examples/jsm/libs/tween.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let satellite;
const componentMeshNames = {
	xrayInstrument: ["Plate"],
	starTrackerModule: ["Star_Tracker_Module", "Star_Tracker_Module_Bracket"],
	dawn4UCubeDrive: ["Propulsion_Module"],
	sBandAntenna: ["Circle"],
	sunSensor: ["Thingies"],
	magnetorquers: ["Magnetorquers"],
	solarPanel: ["Solar_Panels", "Hinges"],
};
const meshComponents = new Map();
const originalMaterials = new Map();

export function loadSatellite(scene, { onLoad, onError } = {}) {
	const loader = new GLTFLoader();

	loader.load(
		"/NebulaXplorer.glb",
		function (glbData) {
			satellite = glbData.scene;

			// positie en schaal
			satellite.position.set(0, 0, 0);
			satellite.scale.set(0.1, 0.1, 0.1);

			// zet object schuin naar de andere kant
			satellite.rotation.x = THREE.MathUtils.degToRad(40);
			satellite.rotation.y = THREE.MathUtils.degToRad(-35);
			satellite.rotation.z = THREE.MathUtils.degToRad(-10);

			satellite.traverse((object) => {
				if (!object.isMesh) return;
				object.material = object.material.clone();
				originalMaterials.set(object, {
					emissive: object.material.emissive?.clone(),
					emissiveIntensity: object.material.emissiveIntensity,
				});
				for (const [component, names] of Object.entries(componentMeshNames)) {
					if (names.includes(object.name)) meshComponents.set(object, component);
				}
			});

			//voeg toe aan scene
			scene.add(glbData.scene);
			onLoad?.(satellite);
		},
		undefined,
		(error) => {
			console.error("Error loading satellite GLB:", error);
			onError?.(error);
		},
	);
}

export function getSatellite() {
	return satellite;
}

export function getComponentFromObject(object) {
	let current = object;
	while (current) {
		const component = meshComponents.get(current);
		if (component) return component;
		current = current.parent;
	}
	return null;
}

export function getComponentFocus(component) {
	if (!satellite) return null;

	satellite.updateWorldMatrix(true, true);
	const componentBox = new THREE.Box3().makeEmpty();
	let meshCount = 0;

	for (const [mesh, mappedComponent] of meshComponents) {
		if (mappedComponent !== component) continue;
		componentBox.expandByObject(mesh);
		meshCount += 1;
	}

	if (meshCount === 0 || componentBox.isEmpty()) return null;

	const satelliteBox = new THREE.Box3().setFromObject(satellite);
	const componentCenter = componentBox.getCenter(new THREE.Vector3());
	const satelliteCenter = satelliteBox.getCenter(new THREE.Vector3());
	const direction = componentCenter.clone().sub(satelliteCenter);

	if (direction.lengthSq() === 0) direction.set(0, 0, 1).applyQuaternion(satellite.quaternion);
	direction.normalize();

	const componentRadius = componentBox.getSize(new THREE.Vector3()).length() / 2;
	const satelliteRadius = satelliteBox.getSize(new THREE.Vector3()).length() / 2;

	return { componentCenter, direction, componentRadius, satelliteRadius };
}

export function highlightComponent(component) {
	for (const [mesh, original] of originalMaterials) {
		if (original.emissive) mesh.material.emissive.copy(original.emissive);
		if (original.emissiveIntensity !== undefined) {
			mesh.material.emissiveIntensity = original.emissiveIntensity;
		}
	}

	for (const [mesh, mappedComponent] of meshComponents) {
		if (mappedComponent !== component) continue;
		const original = originalMaterials.get(mesh);
		if (!mesh.material.emissive || !original?.emissive) continue;

		mesh.material.emissive.copy(original.emissive).lerp(new THREE.Color(0xeb5b33), 0.22);
		mesh.material.emissiveIntensity = Math.max(original.emissiveIntensity ?? 0, 0.32);
	}
}

// roteren in animatieloop
export function rotateSatellite() {
	if (satellite) {
		// Langzaam draaien rond Y as
		satellite.rotation.y += 0.001;

		// Kleine kanteling rond X as
		satellite.rotation.x += 0.0005;

		// kleine draai rond Z as
		satellite.rotation.z += 0.0003;
	}
}

export function resetSatellite() {
	// reset the satellite to its starting position

	if (satellite) {
		// current satellite rotation
		let startSatelliteRotation = {
			x: satellite.rotation.x,
			y: satellite.rotation.y,
			z: satellite.rotation.z,
		};

		// target satellite rotation (based on values in LoadSatellite function)
		let endSatelliteRotation = {
			x: 0.698,
			y: -0.611,
			z: -0.175,
		};

		// transition between current rotation and target rotation
		new TWEEN.Tween(startSatelliteRotation)
			.to(endSatelliteRotation, 1500)
			.easing(TWEEN.Easing.Quadratic.InOut)
			.onUpdate(() => {
				satellite.rotation.set(
					startSatelliteRotation.x,
					startSatelliteRotation.y,
					startSatelliteRotation.z,
				);
			})
			.start();
	}
}
