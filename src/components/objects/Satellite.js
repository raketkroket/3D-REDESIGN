// alles v/d sat zit hier
import * as THREE from "three";
import TWEEN from "three/examples/jsm/libs/tween.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const satelliteModelUrl = new URL("../../scripts/Satellite.source-colors.glb", import.meta.url).href;
const instrumentModelUrl = new URL("../../scripts/Instrument.source-colors.glb", import.meta.url).href;

let satelliteRoot = null;
let instrumentRoot = null;
let instrumentLoadPromise = null;
let currentView = "satellite";
let satelliteMaterialMap = [];

const componentMeshNames = {
	xrayInstrument: [
		"Instrument19-6_C",
		"InstrumentHexa_B",
		"Instrument Electronics Module L1G",
	],
	starTrackerModule: [
		"StarTracker_Mounting",
		"StarTracker_BracketPlate_C4",
		"StarTracker_Cap_C4",
	],
	dawn4UCubeDrive: [
		"PropulsionModule",
		"PropulsionModule_Box_SD5_1",
		"PropulsionModule_FuelTank_SD5_1",
		"PropulsionModule_OxidizerTank_SD5_1",
		"PropulsionModule_MountingPlate_SD5_1",
		"Deployed 15in Rocketlab MLB",
	],
	dawn4UCubeDrive: ["PropulsionModule", "PropulsionModule_Box_SD5_1", "PropulsionModule_FuelTank_SD5_1", "PropulsionModule_OxidizerTank_SD5_1", "PropulsionModule_MountingPlate_SD5_1", "Deployed 15in Rocketlab MLB"],
	sBandAntenna: ["S-Band_PatchAntenna_ISISpace", "S-Band_Diplexer"],
	sunSensor: ["Magnetometer_FGM-A-75_ZARM", "HE_sensor_", "HE sensor_", "Sensor_(New)", "Fe55"],
	magnetorquers: ["MagnetoTorquer_MT10-2-H", "magnet_", "magnet_step", "MagnetoTorquer"],
	solarPanel: ["Solar Panels_step", "Solar Panels", "Deployed 910x570 Sparkwing", "SARA_", "SARA_Mounting_SolarArray", "SARA-v02.01.00.001_CASING_REV00_stp_1"],
};

const satelliteInteriorHideNames = ["Top_Side_Panel", "Upper_Side_Panel", "Lower_Side_Panel", "Bottom_Side_Panel", "Solar Panels_step", "Solar Panels", "Deployed 910x570 Sparkwing", "SARA_", "SARA_Mounting_SolarArray", "SARA-v02.01.00.001_CASING_REV00_stp_1", "Side_Panel", "side_panel", "Panel", "Cover", "Outer_Panel", "Exterior"];
const satelliteInteriorHideCategories = new Set(["BODY_DARK", "SOLAR_CELL_BLUE", "SOLAR_FRAME_METAL"]);

const meshComponents = new Map();
const originalMaterials = new Map();
const componentMeshes = new Map();
const highlightedMeshes = new Set();
const selectionOutlines = new Map();
const selectionRevealMeshes = new Set();
const highlightColor = new THREE.Color(0xffbe4a);
const xrayRevealPanels = [
	"sandwich_backpanel_c4",
	"sandwich_toppanel_c4",
	"sandwich_top_panel_c4",
	"sandwich_sidepanel_c4",
	"sidepanel_c4",
	"mirrored_sidepanel_c4",
	"lv_adapter_panel_c4",
];

const visualCategories = {
	BODY_DARK: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / BODY_DARK", color: 0x343940, metalness: 0.38, roughness: 0.3, side: THREE.DoubleSide }),
	SOLAR_CELL_BLUE: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Solar Panel / SOLAR_CELL_BLUE", color: 0x123e78, emissive: 0x071b34, emissiveIntensity: 0.24, metalness: 0.55, roughness: 0.22, side: THREE.DoubleSide }),
	SOLAR_FRAME_METAL: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Solar Panel / SOLAR_FRAME_METAL", color: 0x454b52, metalness: 0.62, roughness: 0.25, side: THREE.DoubleSide }),
	STRUCTURE_ALUMINIUM: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / STRUCTURE_ALUMINIUM", color: 0xd6d8db, metalness: 0.82, roughness: 0.24, side: THREE.DoubleSide }),
	INSTRUMENT_METAL: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / INSTRUMENT_METAL", color: 0xbfc4ca, metalness: 0.76, roughness: 0.27, side: THREE.DoubleSide }),
	GOLD_EDGE: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / GOLD_EDGE", color: 0xa69b4d, metalness: 0.58, roughness: 0.25, side: THREE.DoubleSide }),
	SENSOR: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / SENSOR", color: 0xb5bbc2, metalness: 0.68, roughness: 0.23, side: THREE.DoubleSide }),
};

const bodyMeshNames = new Set(["sidepanel_c4", "mirrored_sidepanel_c4", "lv_adapter_panel_c4", "part104", "part264", "part266", "part268", "part272", "part272_1", "p2", "p2_1", "p3", "p3_1", "p6", "p12", "six_ob_b", "concentrator_sunshades_step"]);

function getVisualCategory(object) {
	const name = object.parent?.name?.toLowerCase() ?? "";
	if (/^solar_panels_step/.test(name)) return "SOLAR_CELL_BLUE";
	if (/^deployed_910x570_sparkwing|^sara[-_]|^simplified_sara/.test(name)) return "SOLAR_FRAME_METAL";
	if (bodyMeshNames.has(name)) return "BODY_DARK";
	if (/^(sixfp|dh-|pa210|pa-230|sdd_to|collimator|fe55|backplatefe55|caltube|rib|con_work_e)/.test(name)) return "INSTRUMENT_METAL";
	if (/startracker|st-16rt2|sensor|antenna|diplexer|magnetometer|magnetotorquer/.test(name)) return "SENSOR";
	if (/ansi_|iso_|din_|bracket|brkt|mounting|rod|frame|shaft|casing|hinge|screw|bolt|washer|nut|bshcs|fshcs|fastener|propulsion|tank|thruster|rocketlab/.test(name)) return "STRUCTURE_ALUMINIUM";
	return "OTHER";
}

function getObjectPath(object) {
	const names = [];
	let current = object;
	while (current) {
		if (current.name) names.push(current.name.toLowerCase().replace(/[\s:.-]+/g, "_"));
		current = current.parent;
	}
	return names.join(" ");
}

function matchesComponentName(name, candidates) {
	if (!name) return false;
	const pathTokens = name.split(" ");
	return candidates.some((candidate) => pathTokens.some((token) => token === candidate || token.startsWith(candidate)));
}

function registerMeshComponent(object, root) {
	if (!object.isMesh || root.name !== "NebulaSatellite") return;
	const objectPath = getObjectPath(object);
	for (const [component, names] of Object.entries(componentMeshNames)) {
		if (matchesComponentName(objectPath, names.map((name) => name.toLowerCase().replace(/[\s:.-]+/g, "_")))) {
			meshComponents.set(object, component);
			if (!componentMeshes.has(component)) componentMeshes.set(component, []);
			componentMeshes.get(component).push(object);
			break;
		}
	}
}

function preserveBaseMaterial(object) { if (object.isMesh && object.material) originalMaterials.set(object, object.material); }

function prepareModelMaterials(root, applyReferenceAppearance) {
	const report = [];
	const displayMaterials = new Map();
	root.updateWorldMatrix(true, true);
	root.traverse((object) => {
		if (!object.isMesh || !object.material) return;
		const importedMaterials = Array.isArray(object.material) ? object.material : [object.material];
		const category = applyReferenceAppearance ? getVisualCategory(object) : "OTHER";
		object.userData.nebulaVisualCategory = category;
		const bounds = object.geometry.boundingBox ?? object.geometry.computeBoundingBox() ?? object.geometry.boundingBox;
		const worldBounds = bounds?.clone().applyMatrix4(object.matrixWorld);
		report.push({ meshName: object.name, parentName: object.parent?.name ?? "", existingMaterialName: importedMaterials.map((material) => material.name || "(unnamed)").join(", "), boundingBox: worldBounds ? { min: worldBounds.min.toArray(), max: worldBounds.max.toArray() } : null, assignedVisualCategory: category });
		if (category !== "OTHER") object.material = visualCategories[category];
		else {
			// Keep STEP base colors, but soften its all-metal export defaults.
			const materials = importedMaterials.map((source) => {
				if (!displayMaterials.has(source)) {
					const material = source.clone();
					material.metalness = Math.min(material.metalness, 0.35);
					material.roughness = THREE.MathUtils.clamp(material.roughness, 0.55, 0.85);
					displayMaterials.set(source, material);
				}
				return displayMaterials.get(source);
			});
			object.material = Array.isArray(object.material) ? materials : materials[0];
		}
		preserveBaseMaterial(object);
		registerMeshComponent(object, root);
	});
	return report;
}

function setInstrumentInteriorVisibility(isInterior) {
	if (!satelliteRoot) return;
	satelliteRoot.traverse((object) => {
		if (!object.isMesh) return;
		const objectPath = getObjectPath(object);
		const hidesByName = matchesComponentName(objectPath, satelliteInteriorHideNames.map((name) => name.toLowerCase().replace(/[\s:.-]+/g, "_")));
		const hidesByCategory = satelliteInteriorHideCategories.has(object.userData.nebulaVisualCategory);
		const shouldHide = isInterior && (hidesByName || hidesByCategory);
		if (shouldHide) {
			object.userData.wasHiddenByInterior = true;
			object.visible = false;
			return;
		}
		if (object.userData.wasHiddenByInterior) {
			object.visible = true;
			delete object.userData.wasHiddenByInterior;
		}
	});
}

function loadModel(url, modelName, applyReferenceAppearance = false) {
	return new Promise((resolve, reject) => {
		const loader = new GLTFLoader();
		loader.setMeshoptDecoder(MeshoptDecoder);
		loader.load(
			url,
			(glbData) => {
				const root = glbData.scene || glbData.scenes?.[0];
				if (!root) {
					reject(new Error(`No scene found for ${modelName}`));
					return;
				}

				root.name = modelName;
				root.visible = true;
				const materialMap = prepareModelMaterials(root, applyReferenceAppearance);
				// CAD parts stay fixed relative to their assembly. Visibility and
				// materials can still change without rebuilding local matrices.
				root.traverse((object) => {
					if (object === root) return;
					object.updateMatrix();
					object.matrixAutoUpdate = false;
				});
				if (modelName === "NebulaSatellite") satelliteMaterialMap = materialMap;

				console.log(`[${modelName}] loaded`, getModelStats(root));
				resolve(root);
			},
			undefined,
			(error) => {
				console.error(`Error loading ${modelName} GLB:`, url, error);
				reject(error);
			},
		);
	});
}

export function getModelStats(object) {
	if (!object) return null;
	object.updateMatrixWorld(true, true);
	const box = new THREE.Box3().setFromObject(object);
	const size = box.getSize(new THREE.Vector3());
	const center = box.getCenter(new THREE.Vector3());
	const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
	return { box, center, size, radius, maxDimension: Math.max(size.x, size.y, size.z) };
}

export function frameModelRoot(camera, controls, object, { padding = 1.6, direction } = {}) {
	if (!object || !camera || !controls) return null;
	const stats = getModelStats(object); if (!stats) return null;
	const verticalFov = THREE.MathUtils.degToRad(camera.fov);
	const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
	const limitingFov = Math.min(verticalFov, horizontalFov);
	const distance = (stats.radius / Math.sin(limitingFov / 2)) * padding;
	const cameraOffset = direction
		? new THREE.Vector3(...direction).normalize().multiplyScalar(distance)
		: new THREE.Vector3(0, stats.radius * 0.18, distance);
	const targetPosition = stats.center.clone();
	const cameraPosition = targetPosition.clone().add(cameraOffset);

	camera.position.copy(cameraPosition);
	controls.target.copy(targetPosition);
	controls.minDistance = distance * 0.25;
	controls.maxDistance = distance * 1.55;
	camera.near = Math.max(0.1, stats.radius * 0.02);
	camera.far = distance + stats.radius * 10;
	camera.updateProjectionMatrix();
	// Flush the previous view's damping before setting this view's orbit.
	const damping = controls.enableDamping;
	const autoRotate = controls.autoRotate;
	controls.enableDamping = false;
	controls.autoRotate = false;
	controls.update();
	camera.position.copy(cameraPosition);
	controls.target.copy(targetPosition);
	controls.update();
	controls.enableDamping = damping;
	controls.autoRotate = autoRotate;

	console.log("[camera-framing]", {
		center: targetPosition.toArray(),
		size: stats.size.toArray(),
		radius: stats.radius,
		cameraPosition: cameraPosition.toArray(),
	});

	return stats;
}

export function loadSatellite(scene, { onLoad, onError } = {}) {
	loadModel(satelliteModelUrl, "NebulaSatellite", false)
		.then((satellite) => {
			satelliteRoot = satellite;
			setView("satellite");

			scene.add(satelliteRoot);
			console.log("[scene] satellite added", satelliteRoot.name);

			onLoad?.(satelliteRoot, getModelStats(satelliteRoot));
		})
		.catch((error) => {
			console.error("[scene] model failure", error);
			onError?.(error);
		});
}

export function loadInstrument(scene) {
	if (instrumentRoot) return Promise.resolve(instrumentRoot);
	if (instrumentLoadPromise) return instrumentLoadPromise;
	instrumentLoadPromise = loadModel(instrumentModelUrl, "InstrumentAssembly").then((instrument) => { instrumentRoot = instrument; instrumentRoot.visible = false; scene.add(instrumentRoot); return instrumentRoot; }).catch((error) => { instrumentLoadPromise = null; throw error; });
	return instrumentLoadPromise;
}

export function getSatellite() { return satelliteRoot; }
export function getInstrument() { return instrumentRoot; }
export function getSatelliteMaterialMap() { return satelliteMaterialMap; }
export function getCurrentView() { return currentView; }

export function setView(viewName) {
	const nextView = viewName === "interior" ? "interior" : viewName === "instrument" ? "instrument" : "satellite";
	currentView = nextView;
	if (satelliteRoot) { satelliteRoot.visible = nextView !== "instrument"; setInstrumentInteriorVisibility(nextView === "interior"); }
	if (instrumentRoot) instrumentRoot.visible = nextView === "instrument";
	return nextView;
}

export function showSatellite() {
	revealComponent(null);
	setView("satellite");
}

export function showSatelliteInterior() {
	revealComponent(null);
	setView("interior");
}

export function showInstrument() {
	revealComponent(null);
	setView("instrument");
	setInstrumentPanels(false);
}

function setInstrumentPanels(hidden) {
	if (!instrumentRoot) return;
	instrumentRoot.traverse((object) => {
		if (!object.isMesh) return;
		const path = getObjectPath(object);
		if (!["top_side_panel", "upper_side_panel", "lower_side_panel", "bottom_side_panel"].some((name) => path.includes(name))) return;
		object.visible = !hidden;
	});
}

export function showInstrumentInterior() {
	setView("instrument");
	setInstrumentPanels(true);
}

export function getComponentFromObject(object) {
	let current = object;
	while (current) { const component = meshComponents.get(current); if (component) return component; current = current.parent; }
	return null;
}

export function getSelectableComponentMeshes() { return [...meshComponents.keys()]; }

export function getComponentFocus(component) {
	if (!satelliteRoot) return null;
	satelliteRoot.updateWorldMatrix(true, true);
	const componentBox = new THREE.Box3().makeEmpty(); let meshCount = 0;
	for (const mesh of componentMeshes.get(component) ?? []) { if (!mesh.visible) continue; componentBox.expandByObject(mesh); meshCount += 1; }
	if (meshCount === 0 || componentBox.isEmpty()) return null;
	const satelliteBox = new THREE.Box3().setFromObject(satelliteRoot);
	const componentCenter = componentBox.getCenter(new THREE.Vector3());
	const satelliteCenter = satelliteBox.getCenter(new THREE.Vector3());
	const direction = componentCenter.clone().sub(satelliteCenter);
	if (direction.lengthSq() === 0) direction.set(0, 0, 1).applyQuaternion(satelliteRoot.quaternion);
	direction.normalize();
	const componentRadius = componentBox.getSize(new THREE.Vector3()).length() / 2;
	const satelliteRadius = satelliteBox.getSize(new THREE.Vector3()).length() / 2;
	return { componentCenter, direction, componentRadius, satelliteRadius };
}

function clearHighlightOutlines() {
	for (const [mesh, outline] of selectionOutlines) {
		mesh.remove(outline);
		outline.geometry.dispose();
		outline.material.dispose();
	}
	selectionOutlines.clear();
}

function addHighlightOutline(mesh) {
	const geometry = new THREE.EdgesGeometry(mesh.geometry, 22);
	if (geometry.getAttribute("position").count === 0) {
		geometry.dispose();
		return;
	}
	const material = new THREE.LineBasicMaterial({
		color: highlightColor,
		transparent: true,
		opacity: 0.96,
		depthTest: false,
		depthWrite: false,
		toneMapped: false,
	});
	const outline = new THREE.LineSegments(geometry, material);
	outline.renderOrder = 10;
	outline.scale.setScalar(1.002);
	mesh.add(outline);
	selectionOutlines.set(mesh, outline);
}

function restoreSelectionReveal() {
	for (const mesh of selectionRevealMeshes) {
		if (!mesh.userData.wasHiddenByInterior) mesh.visible = true;
		delete mesh.userData.wasHiddenBySelection;
	}
	selectionRevealMeshes.clear();
}

export function revealComponent(component) {
	restoreSelectionReveal();
	if (component !== "xrayInstrument" || !satelliteRoot || currentView === "interior") return;
	satelliteRoot.traverse((mesh) => {
		if (!mesh.isMesh || !matchesComponentName(getObjectPath(mesh), xrayRevealPanels)) return;
		mesh.userData.wasHiddenBySelection = true;
		mesh.visible = false;
		selectionRevealMeshes.add(mesh);
	});
}

export function highlightComponent(component) {
	for (const mesh of highlightedMeshes) {
		const highlightedMaterial = mesh.material; mesh.material = originalMaterials.get(mesh);
		(Array.isArray(highlightedMaterial) ? highlightedMaterial : [highlightedMaterial]).forEach((material) => material.dispose());
	}
	highlightedMeshes.clear();
	clearHighlightOutlines();

	if (!component) return;
	const outlineCandidates = [];
	for (const mesh of componentMeshes.get(component) ?? []) {
		if (!mesh.visible) continue;
		const baseMaterial = originalMaterials.get(mesh); if (!baseMaterial) continue;
		const baseMaterials = Array.isArray(baseMaterial) ? baseMaterial : [baseMaterial];
		const highlightedMaterials = baseMaterials.map((sourceMaterial) => {
			const material = sourceMaterial.clone();
			if (material.emissive) {
				material.emissive.copy(sourceMaterial.emissive).lerp(highlightColor, 0.32);
				material.emissiveIntensity = Math.max(sourceMaterial.emissiveIntensity ?? 0, 0.42);
			} else if (material.color) {
				material.color.copy(sourceMaterial.color).lerp(highlightColor, 0.1);
			}
			material.metalness = Math.min(material.metalness ?? 0, 0.72);
			material.roughness = THREE.MathUtils.clamp(material.roughness ?? 0.55, 0.28, 0.62);
			return material;
		});
		mesh.material = Array.isArray(baseMaterial) ? highlightedMaterials : highlightedMaterials[0];
		highlightedMeshes.add(mesh);
		mesh.geometry.computeBoundingSphere();
		outlineCandidates.push({ mesh, radius: mesh.geometry.boundingSphere?.radius ?? 0 });
	}
	outlineCandidates
		.sort((left, right) => right.radius - left.radius)
		.slice(0, 18)
		.forEach(({ mesh }) => addHighlightOutline(mesh));
}

export function rotateSatellite() {
	if (satelliteRoot && currentView !== "instrument") { satelliteRoot.rotation.y += 0.0018; satelliteRoot.rotation.x += 0.00075; satelliteRoot.rotation.z += 0.0004; }
	if (instrumentRoot && currentView === "instrument") { instrumentRoot.rotation.y += 0.0018; instrumentRoot.rotation.x += 0.00075; }
}

export function resetSatellite(duration = 1500) {
	if (!satelliteRoot) return;
	const startSatelliteRotation = { x: satelliteRoot.rotation.x, y: satelliteRoot.rotation.y, z: satelliteRoot.rotation.z };
	const endSatelliteRotation = { x: 0.698, y: -0.611, z: -0.175 };
	if (duration === 0) { satelliteRoot.rotation.set(endSatelliteRotation.x, endSatelliteRotation.y, endSatelliteRotation.z); return; }
	new TWEEN.Tween(startSatelliteRotation).to(endSatelliteRotation, duration).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(() => { satelliteRoot.rotation.set(startSatelliteRotation.x, startSatelliteRotation.y, startSatelliteRotation.z); }).start();
}
