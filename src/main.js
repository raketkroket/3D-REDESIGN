import * as THREE from "three";
import TWEEN from "three/examples/jsm/libs/tween.module.js";
import { createScene } from "./setup/scene.js";
import { createCamera } from "./setup/camera.js";
import { createRenderer } from "./setup/renderer.js";
import { createControls, updateControls } from "./setup/controls.js";
import { createLights } from "./components/lights/lights.js";
import {
	loadSatellite,
	getSatellite,
	getComponentFromObject,
	getComponentFocus,
	highlightComponent,
	rotateSatellite,
} from "./components/objects/Satellite.js";
import { createStars } from "./components/objects/star.js";
import { updateCamera } from "./scripts/updateCamera.js";

// basis van de 3d shit ff klaarzetten
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
const visualization = document.querySelector(".visualization");
const canvas = renderer.domElement;
const componentLinks = [...document.querySelectorAll("[data-3d-object]")];
const componentDetails = [...document.querySelectorAll("[data-component-info]")];
const selectionStatus = document.querySelector(".selection-status");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// controls ff koppelen aan cam + renderer
const controls = createControls(camera, renderer);
let selectedComponent = null;

// anders zie je dus letterlijk niks lol
createLights(scene);

// sat inladen
loadSatellite(scene, {
	onError: () => visualization.classList.add("model-unavailable"),
});

// 300 sterretjes voor de vibes
createStars(300, scene);

function resizeRenderer() {
	const { width, height } = visualization.getBoundingClientRect();
	if (width === 0 || height === 0) return;
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height, false);
}

new ResizeObserver(resizeRenderer).observe(visualization);
resizeRenderer();

function animate() {
	requestAnimationFrame(animate);

	if (!selectedComponent && !reduceMotion.matches) {
		rotateSatellite();
	}

	updateControls();
	TWEEN.update();
	renderer.render(scene, camera);
}

animate();

function selectComponent(component, { focusDetail = false } = {}) {
	const link = componentLinks.find((item) => item.dataset["3dObject"] === component);
	if (!link) return;

	selectedComponent = component;
	highlightComponent(component);
	const focus = getComponentFocus(component);
	if (focus) updateCamera(controls, camera, focus, reduceMotion.matches ? 0 : 1100);

	componentLinks.forEach((item) => item.removeAttribute("aria-current"));
	link.setAttribute("aria-current", "true");
	componentDetails.forEach((detail) => {
		detail.hidden = detail.id !== link.hash.slice(1);
	});

	const detail = document.querySelector(link.hash);
	selectionStatus.textContent = `${link.textContent.trim()} selected.`;
	if (focusDetail && detail) {
		detail.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
		detail.focus({ preventScroll: true });
	}
}

document.documentElement.classList.add("js-enhanced");
componentDetails.forEach((detail) => (detail.hidden = true));

componentLinks.forEach((link) => {
	link.addEventListener("click", (event) => {
		event.preventDefault();
		history.replaceState(null, "", link.hash);
		selectComponent(link.dataset["3dObject"], { focusDetail: true });
	});
	link.addEventListener("focus", () => selectComponent(link.dataset["3dObject"]));
});

canvas.addEventListener("click", (event) => {
	const satellite = getSatellite();
	if (!satellite) return;
	const bounds = canvas.getBoundingClientRect();
	pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
	pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
	raycaster.setFromCamera(pointer, camera);
	const hit = raycaster.intersectObject(satellite, true)[0];
	const component = hit && getComponentFromObject(hit.object);
	if (component) selectComponent(component, { focusDetail: true });
});
