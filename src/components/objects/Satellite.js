// alles v/d sat zit hier
import * as THREE from "three";
import TWEEN from "three/examples/jsm/libs/tween.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const satelliteModelUrl = new URL("../../scripts/Nebula_Assembly_V2_Stowed.web-lite.glb", import.meta.url).href;
const instrumentModelUrl = new URL("../../scripts/Instrument_assembly updated FPA+OBA.glb", import.meta.url).href;

let satelliteRoot = null;
let instrumentRoot = null;
let instrumentLoadPromise = null;
let currentView = "satellite";
let satelliteMaterialMap = [];

const componentMeshNames = {
	xrayInstrument: [
		"Instrument_(Last)", "Top_Side_Panel", "Upper_Side_Panel", "Upper_Side_Panel_1",
		"Lower_Side_Panel", "Lower_Side_Panel_1", "Bottom_Side_Panel", "Six_OB_B",
		"middle_rib", "back_fitting", "left_fitting", "right_fitting", "Back_OBA_rod",
		"Back_OBA_rod_1", "Front_OBA_rod", "Front_OBA_rod_1", "Rear_FPA_Rod",
		"Rear_FPA_Rod_1", "Science_baffle", "Base_shield_plate", "Collar_(New)",
		"Sensor_(New)", "Fe55", "Fe55_Cover", "Callibration_Tube", "Head_Callibration_tube",
		"BackplateFe55", "PA210_(Preamplifier)", "PA-230_(Preamplifier-Pins_connection)", "Housing_(1)",
	],
	starTrackerModule: [
		"StarTracker", "StarTracker_Mounting", "StarTracker_BracketPlate_C4", "StarTracker_Cap_C4",
		"ST-16RT2", "Mounting_Bracket_1", "Mounting_Bracket_2", "Mounting_Bracket_3",
		"AngleBracket_30x30x50_2h", "AngleBracket_30x30x74.5_3h",
	],
	dawn4UCubeDrive: ["PropulsionModule", "PropulsionModule_Box_SD5_1", "PropulsionModule_FuelTank_SD5_1", "PropulsionModule_OxidizerTank_SD5_1", "PropulsionModule_MountingPlate_SD5_1", "Deployed 15in Rocketlab MLB"],
	sBandAntenna: ["S-Band_PatchAntenna_ISISpace", "S-Band_Diplexer"],
	sunSensor: ["Magnetometer_FGM-A-75_ZARM", "HE_sensor_", "HE sensor_", "Sensor_(New)", "Fe55"],
	magnetorquers: ["MagnetoTorquer_MT10-2-H", "magnet_", "magnet_step", "MagnetoTorquer"],
	solarPanel: ["Solar Panels_step", "Solar Panels", "Deployed 910x570 Sparkwing", "SARA_", "SARA_Mounting_SolarArray", "SARA-v02.01.00.001_CASING_REV00_stp_1"],
};

const satelliteInteriorHideNames = ["Top_Side_Panel", "Upper_Side_Panel", "Lower_Side_Panel", "Bottom_Side_Panel", "Solar Panels_step", "Solar Panels", "Deployed 910x570 Sparkwing", "SARA_", "SARA_Mounting_SolarArray", "SARA-v02.01.00.001_CASING_REV00_stp_1", "Side_Panel", "side_panel", "Panel"];

const meshComponents = new Map();
const originalMaterials = new Map();
const componentMeshes = new Map();
const highlightedMeshes = new Set();

const visualCategories = {
	BODY_DARK: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / BODY_DARK", color: 0x404348, metalness: 0.2824, roughness: 0.3872727155685425, side: THREE.DoubleSide }),
	SOLAR_CELL_BLUE: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Solar Panel / SOLAR_CELL_BLUE", color: 0x174172, emissive: 0x174172, emissiveIntensity: 0.3, metalness: 0.4471, roughness: 0.307272732257843, side: THREE.DoubleSide }),
	SOLAR_FRAME_METAL: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Solar Panel / SOLAR_FRAME_METAL", color: 0x404348, metalness: 0.2824, roughness: 0.307272732257843, side: THREE.DoubleSide }),
	STRUCTURE_ALUMINIUM: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / STRUCTURE_ALUMINIUM", color: 0xcacaca, metalness: 0.7921, roughness: 0.3872727155685425, side: THREE.DoubleSide }),
	INSTRUMENT_METAL: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / INSTRUMENT_METAL", color: 0xcacaca, metalness: 0.7921, roughness: 0.3872727155685425, side: THREE.DoubleSide }),
	GOLD_EDGE: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / GOLD_EDGE", color: 0x918d47, metalness: 0.2745, roughness: 0.3872727155685425, side: THREE.DoubleSide }),
	SENSOR: new THREE.MeshStandardMaterial({ name: "Nebula Xplorer Base / SENSOR", color: 0xa5a5a5, metalness: 0.6476, roughness: 0.3872727155685425, side: THREE.DoubleSide }),
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
	while (current) { if (current.name) names.push(current.name.toLowerCase()); current = current.parent; }
	return names.join(" ");
}

function matchesComponentName(name, candidates) {
	if (!name) return false;
	return candidates.some((candidate) => candidate && (name === candidate || name.startsWith(candidate) || name.includes(candidate)));
}

function registerMeshComponent(object) {
	if (!object.isMesh || !object.name) return;
	const objectPath = getObjectPath(object);
	for (const [component, names] of Object.entries(componentMeshNames)) {
		if (matchesComponentName(objectPath, names.map((name) => name.toLowerCase()))) {
			meshComponents.set(object, component);
			if (!componentMeshes.has(component)) componentMeshes.set(component, []);
			componentMeshes.get(component).push(object);
		}
	}
}

function preserveBaseMaterial(object) { if (object.isMesh && object.material) originalMaterials.set(object, object.material); }

function prepareModelMaterials(root, applyReferenceAppearance) {
	const report = [];
	root.updateWorldMatrix(true, true);
	root.traverse((object) => {
		if (!object.isMesh || !object.material) return;
		const importedMaterials = Array.isArray(object.material) ? object.material : [object.material];
		const category = applyReferenceAppearance ? getVisualCategory(object) : "OTHER";
		const bounds = object.geometry.boundingBox ?? object.geometry.computeBoundingBox() ?? object.geometry.boundingBox;
		const worldBounds = bounds?.clone().applyMatrix4(object.matrixWorld);
		report.push({ meshName: object.name, parentName: object.parent?.name ?? "", existingMaterialName: importedMaterials.map((material) => material.name || "(unnamed)").join(", "), boundingBox: worldBounds ? { min: worldBounds.min.toArray(), max: worldBounds.max.toArray() } : null, assignedVisualCategory: category });
		if (category !== "OTHER") object.material = visualCategories[category];
		preserveBaseMaterial(object);
		registerMeshComponent(object);
	});
	return report;
}

function setInstrumentInteriorVisibility(isInterior) {
	if (!satelliteRoot) return;
	satelliteRoot.traverse((object) => {
		if (!object.isMesh) return;
		const shouldHide = isInterior && matchesComponentName(getObjectPath(object), satelliteInteriorHideNames.map((name) => name.toLowerCase()));
		if (shouldHide) { object.userData.wasHiddenByInterior = true; object.visible = false; return; }
		if (object.userData.wasHiddenByInterior) { object.visible = true; delete object.userData.wasHiddenByInterior; }
	});
}

function loadModel(url, modelName, applyReferenceAppearance = false) {
	return new Promise((resolve, reject) => {
		const loader = new GLTFLoader();
		loader.setMeshoptDecoder(MeshoptDecoder);
		loader.load(url, (glbData) => {
			const root = glbData.scene || glbData.scenes?.[0];
			if (!root) { reject(new Error(`No scene found for ${modelName}`)); return; }
			root.name = modelName; root.visible = true;
			const materialMap = prepareModelMaterials(root, applyReferenceAppearance);
			if (modelName === "NebulaSatellite") satelliteMaterialMap = materialMap;
			console.log(`[${modelName}] loaded`, getModelStats(root)); resolve(root);
		}, undefined, (error) => { console.error(`Error loading ${modelName} GLB:`, url, error); reject(error); });
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

export function frameModelRoot(camera, controls, object, { padding = 1.6 } = {}) {
	if (!object || !camera || !controls) return null;
	const stats = getModelStats(object); if (!stats) return null;
	const verticalFov = THREE.MathUtils.degToRad(camera.fov);
	const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
	const limitingFov = Math.min(verticalFov, horizontalFov);
	const distance = (stats.radius / Math.sin(limitingFov / 2)) * padding;
	const cameraOffset = new THREE.Vector3(0, stats.radius * 0.18, distance);
	const targetPosition = stats.center.clone();
	const cameraPosition = targetPosition.clone().add(cameraOffset);
	camera.position.copy(cameraPosition); controls.target.copy(targetPosition);
	controls.minDistance = distance * 0.9; controls.maxDistance = distance * 1.55;
	camera.near = Math.max(0.1, stats.radius * 0.02); camera.far = distance + stats.radius * 10;
	camera.updateProjectionMatrix(); controls.update();
	return stats;
}

export function loadSatellite(scene, { onLoad, onError } = {}) {
	loadModel(satelliteModelUrl, "NebulaSatellite", true).then((satellite) => {
		satelliteRoot = satellite; setView("satellite"); scene.add(satelliteRoot); onLoad?.(satelliteRoot, getModelStats(satelliteRoot));
	}).catch((error) => { console.error("[scene] model failure", error); onError?.(error); });
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

export function showSatellite() { setView("satellite"); }
export function showSatelliteInterior() { setView("interior"); }
export function showInstrument() { setView("instrument"); }

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

export function highlightComponent(component) {
	for (const mesh of highlightedMeshes) {
		const highlightedMaterial = mesh.material; mesh.material = originalMaterials.get(mesh);
		(Array.isArray(highlightedMaterial) ? highlightedMaterial : [highlightedMaterial]).forEach((material) => material.dispose());
	}
	highlightedMeshes.clear();
	if (!component) return;

	const highlightColor = new THREE.Color(component === "starTrackerModule" ? 0xffb15f : component === "xrayInstrument" ? 0xff6f4a : 0xe9845b);
	const glowStrength = component === "starTrackerModule" || component === "xrayInstrument" ? 1.35 : 0.72;

	for (const mesh of componentMeshes.get(component) ?? []) {
		if (!mesh.visible) continue;
		const baseMaterial = originalMaterials.get(mesh); if (!baseMaterial) continue;
		const baseMaterials = Array.isArray(baseMaterial) ? baseMaterial : [baseMaterial];
		const highlightedMaterials = baseMaterials.map((sourceMaterial) => {
			const material = sourceMaterial.clone();
			if (material.color) material.color.copy(sourceMaterial.color).lerp(highlightColor, 0.28);
			if (material.emissive) { material.emissive.copy(highlightColor); material.emissiveIntensity = glowStrength; }
			if ("roughness" in material) material.roughness = Math.max(0.16, (sourceMaterial.roughness ?? 0.4) * 0.72);
			return material;
		});
		mesh.material = Array.isArray(baseMaterial) ? highlightedMaterials : highlightedMaterials[0]; highlightedMeshes.add(mesh);
	}
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
