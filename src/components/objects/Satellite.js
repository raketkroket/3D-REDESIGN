// alles v/d sat zit hier
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

			// ff op de goeie plek + schaal zetten
			satellite.position.set(0, 0, 0);
			satellite.scale.set(0.1, 0.1, 0.1);

			// beetje schuin draaien, ziet er chiller uit
			satellite.rotation.x = THREE.MathUtils.degToRad(40);
			satellite.rotation.y = THREE.MathUtils.degToRad(-35);
			satellite.rotation.z = THREE.MathUtils.degToRad(-10);

			satellite.traverse((object) => {
				if (!object.isMesh) return;
				object.material = object.material.clone();
				originalMaterials.set(object, {
					color: object.material.color?.clone(),
					emissive: object.material.emissive?.clone(),
					emissiveIntensity: object.material.emissiveIntensity,
				});
				for (const [component, names] of Object.entries(componentMeshNames)) {
					if (names.includes(object.name)) meshComponents.set(object, component);
				}
			});

			// hoppa, in de scene ermee
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
		if (original.color && mesh.material.color) mesh.material.color.copy(original.color);
		if (original.emissive) mesh.material.emissive.copy(original.emissive);
		if (original.emissiveIntensity !== undefined) {
			mesh.material.emissiveIntensity = original.emissiveIntensity;
		}
	}

	for (const [mesh, mappedComponent] of meshComponents) {
		if (mappedComponent !== component) continue;
		const original = originalMaterials.get(mesh);
		if (!original) continue;

		if (mesh.material.emissive && original.emissive) {
			mesh.material.emissive.copy(original.emissive).lerp(new THREE.Color(0xe9845b), 0.11);
			mesh.material.emissiveIntensity = Math.max(original.emissiveIntensity ?? 0, 0.18);
		} else if (mesh.material.color && original.color) {
			mesh.material.color.copy(original.color).lerp(new THREE.Color(0xe9845b), 0.12);
		}
	}
}

// sat draait ff rustig rond in de loop
export function rotateSatellite() {
	if (satellite) {
		// rustig om de y-as heen draaien
		satellite.rotation.y += 0.001;

		// klein beetje kantelen op x
		satellite.rotation.x += 0.0005;

		// en nog een mini draai op z
		satellite.rotation.z += 0.0003;
	}
}

export function resetSatellite(duration = 1500) {
	// sat weer terug naar de startstand pls

	if (satellite) {
		// ff pakken waar de sat nu staat
		let startSatelliteRotation = {
			x: satellite.rotation.x,
			y: satellite.rotation.y,
			z: satellite.rotation.z,
		};

		// dit is de chill start-stand uit de loader
		let endSatelliteRotation = {
			x: 0.698,
			y: -0.611,
			z: -0.175,
		};

		// smooth terugdraaien, geen rare snap
		if (duration === 0) {
			satellite.rotation.set(endSatelliteRotation.x, endSatelliteRotation.y, endSatelliteRotation.z);
			return;
		}

		new TWEEN.Tween(startSatelliteRotation)
			.to(endSatelliteRotation, duration)
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
