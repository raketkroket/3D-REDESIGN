import * as THREE from "three";
import TWEEN from "three/examples/jsm/libs/tween.module.js";
import { createScene } from "./setup/scene.js";
import { createCamera } from "./setup/camera.js";
import { createRenderer } from "./setup/renderer.js";
import { createControls, updateControls } from "./setup/controls.js";
import { createLights } from "./components/lights/lights.js";
import {
	frameModelRoot,
	getSatellite,
	getSatelliteMaterialMap,
	getInstrument,
	getComponentFromObject,
	getComponentFocus,
	getSelectableComponentMeshes,
	highlightComponent,
	loadInstrument,
	loadSatellite,
	resetSatellite,
	showSatellite,
	showSatelliteInterior,
	showInstrument,
	getCurrentView,
} from "./components/objects/Satellite.js";
import { createStars } from "./components/objects/star.js";
import { stopCameraTween, updateCamera } from "./scripts/updateCamera.js";

function initializeExperience() {
	const visualization = document.querySelector(".visualization");
	const renderer = createRenderer();

	if (!visualization || !renderer) return;

	const scene = createScene();
	const camera = createCamera();
	const canvas = renderer.domElement;
	const componentLinks = [...document.querySelectorAll("[data-3d-object]")];
	const componentDetails = [...document.querySelectorAll("[data-component-info]")];
	const componentDetailsPanel = document.querySelector(".component-details");
	const selectionStatus = document.querySelector(".selection-status");
	const experienceModeLinks = [...document.querySelectorAll("[data-experience-mode]")];
	const languageButtons = [...document.querySelectorAll("[data-language]")];
	const translatableElements = [...document.querySelectorAll("[data-i18n-nl]")];
	const englishCopy = new Map(translatableElements.map((element) => [element, element.textContent]));
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	const viewButtons = [...document.querySelectorAll("[data-view]")];
	const controls = createControls(camera, renderer);
	let frameRequest = null;
	let viewerInViewport = true;
	let pointerStart = null;
	let pointerDragged = false;
	let selectedComponent = null;
	let activeLanguage = "en";
	const defaultPixelRatio = Math.min(window.devicePixelRatio, 2);
	const interactionPixelRatio = Math.min(window.devicePixelRatio, 1.25);

	function requestRender() {
		if (frameRequest !== null || document.hidden || !viewerInViewport) return;
		frameRequest = requestAnimationFrame(renderFrame);
	}

	function renderFrame(time) {
		frameRequest = null;
		if (document.hidden || !viewerInViewport) return;
		TWEEN.update(time);
		updateControls();
		renderer.render(scene, camera);

		// OrbitControls damping and camera tweens need a few follow-up frames,
		// but once the scene is stable the viewer becomes completely idle.
		if (TWEEN.getAll().length > 0) requestRender();
	}

	function setInteractionQuality(isInteracting) {
		const targetRatio = isInteracting ? interactionPixelRatio : defaultPixelRatio;
		if (Math.abs(renderer.getPixelRatio() - targetRatio) > 0.01) {
			renderer.setPixelRatio(targetRatio);
		}
		requestRender();
	}

	controls.addEventListener("start", () => {
		stopCameraTween();
		setInteractionQuality(true);
		requestRender();
	});
	controls.addEventListener("change", requestRender);
	controls.addEventListener("end", () => {
		setInteractionQuality(false);
		requestRender();
	});

	document.addEventListener("visibilitychange", () => {
		if (!document.hidden) requestRender();
	});

	new IntersectionObserver(([entry]) => {
		viewerInViewport = entry.isIntersecting;
		if (viewerInViewport) requestRender();
	}).observe(visualization);

	if (import.meta.env.DEV) {
		window.__nebulaDebug = { scene, camera, controls, renderer };
	}

	createLights(scene);

	// Warm local light makes selected hardware visibly glow instead of only changing tint.
	const selectionLight = new THREE.PointLight(0xff8b61, 0, 1, 1.7);
	scene.add(selectionLight);

	function frameCurrentModel(viewName) {
		if (viewName === "instrument") {
			const instrument = getInstrument();
			if (instrument) frameModelRoot(camera, controls, instrument, { padding: 1.1 });
			return;
		}

		const satellite = getSatellite();
		if (satellite) {
			frameModelRoot(camera, controls, satellite, { padding: 1.22 });
		}
	}

	async function applyView(viewName) {
		if (viewName === "satellite") {
			showSatellite();
			frameCurrentModel(viewName);
		} else if (viewName === "interior") {
			showSatelliteInterior();
			frameCurrentModel(viewName);
		} else if (viewName === "instrument") {
			await loadInstrument(scene);
			showInstrument();
			frameCurrentModel(viewName);
		}

		viewButtons.forEach((button) => {
			button.setAttribute("aria-pressed", String(button.dataset.view === viewName));
		});
		requestRender();
	}

	loadSatellite(scene, {
		onLoad: (satelliteModel) => {
			if (!satelliteModel) return;
			if (import.meta.env.DEV) {
				window.__nebulaDebug.materialMap = getSatelliteMaterialMap();
			}
			console.log("[satellite] loaded and framed", satelliteModel.name);
			applyView("satellite");
		},
		onError: activateFallback,
	});

	createStars(300, scene);

	function resizeRenderer() {
		const { width, height } = visualization.getBoundingClientRect();
		if (width === 0 || height === 0) return;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height, false);
		requestRender();
	}

	new ResizeObserver(resizeRenderer).observe(visualization);
	resizeRenderer();
	requestRender();

	function selectComponent(component) {
		const link = componentLinks.find((item) => item.dataset["3dObject"] === component);
		if (!link) return;

		selectedComponent = component;

		// The X-ray assembly sits behind the exterior panels, so reveal the interior first.
		if (component === "xrayInstrument") {
			showSatelliteInterior();
			viewButtons.forEach((button) => {
				button.setAttribute("aria-pressed", String(button.dataset.view === "interior"));
			});
		} else if (getCurrentView() === "interior") {
			showSatellite();
			viewButtons.forEach((button) => {
				button.setAttribute("aria-pressed", String(button.dataset.view === "satellite"));
			});
		}

		highlightComponent(component);
		const focus = getComponentFocus(component);
		if (focus) {
			selectionLight.position.copy(focus.componentCenter);
			selectionLight.distance = Math.max(focus.componentRadius * 5, focus.satelliteRadius * 0.45);
			selectionLight.intensity = component === "starTrackerModule" || component === "xrayInstrument" ? 18 : 10;
			updateCamera(controls, camera, focus, reduceMotion.matches ? 0 : 1100);
		} else {
			selectionLight.intensity = 0;
		}

		componentLinks.forEach((item) => item.removeAttribute("aria-current"));
		link.setAttribute("aria-current", "true");
		componentDetails.forEach((detail) => {
			detail.hidden = detail.id !== link.hash.slice(1);
		});
		componentDetailsPanel.classList.add("has-selection");
		setExperienceMode("explore");

		updateSelectionStatus(component);
		requestRender();
	}

	function updateSelectionStatus(component) {
		if (!component) {
			selectionStatus.textContent = activeLanguage === "nl" ? "Verkenningsmodus actief." : "Exploration mode active.";
			return;
		}

		const link = componentLinks.find((item) => item.dataset["3dObject"] === component);
		const label = link?.querySelector(".component-label")?.textContent ?? "";
		selectionStatus.textContent = activeLanguage === "nl" ? `${label} geselecteerd.` : `${label} selected.`;
	}

	function setLanguage(language) {
		activeLanguage = language;
		document.documentElement.lang = language;
		translatableElements.forEach((element) => {
			element.textContent = language === "nl" ? element.dataset.i18nNl : englishCopy.get(element);
		});
		languageButtons.forEach((button) => {
			button.setAttribute("aria-pressed", String(button.dataset.language === language));
		});
		updateSelectionStatus(selectedComponent);
	}

	function setExperienceMode(mode) {
		experienceModeLinks.forEach((link) => {
			if (link.dataset.experienceMode === mode) link.setAttribute("aria-current", "true");
			else link.removeAttribute("aria-current");
		});
	}

	function resetExperience() {
		selectedComponent = null;
		selectionLight.intensity = 0;
		highlightComponent(null);
		resetSatellite(reduceMotion.matches ? 0 : 1100);
		showSatellite();
		frameCurrentModel("satellite");
		componentLinks.forEach((link) => link.removeAttribute("aria-current"));
		componentDetails.forEach((detail) => (detail.hidden = true));
		componentDetailsPanel.classList.remove("has-selection");
		setExperienceMode("explore");
		updateSelectionStatus(null);
		requestRender();
	}

	function activateFallback() {
		document.documentElement.classList.remove("js-enhanced");
		visualization.classList.add("model-unavailable");
		componentDetails.forEach((detail) => (detail.hidden = false));
	}

	document.documentElement.classList.add("js-enhanced");
	componentDetails.forEach((detail) => (detail.hidden = true));

	componentLinks.forEach((link) => {
		link.addEventListener("click", (event) => {
			event.preventDefault();
			history.replaceState(null, "", link.hash);
			selectComponent(link.dataset["3dObject"]);
		});
	});

	experienceModeLinks.forEach((link) => {
		link.addEventListener("click", (event) => {
			event.preventDefault();
			if (link.dataset.experienceMode === "explore") {
				history.replaceState(null, "", window.location.pathname);
				resetExperience();
			}
		});
	});

	viewButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const viewName = button.dataset.view;
			selectionLight.intensity = 0;
			applyView(viewName);
		});
	});

	languageButtons.forEach((button) => {
		button.addEventListener("click", () => {
			setLanguage(button.dataset.language);
			requestRender();
		});
	});

	canvas.addEventListener("pointerdown", (event) => {
		pointerStart = { x: event.clientX, y: event.clientY };
		pointerDragged = false;
	});

	canvas.addEventListener("pointermove", (event) => {
		if (!pointerStart) return;
		pointerDragged ||= Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6;
	});

	canvas.addEventListener("pointercancel", () => {
		pointerStart = null;
		pointerDragged = false;
	});

	canvas.addEventListener("click", (event) => {
		const shouldSelect = !pointerDragged;
		pointerStart = null;
		pointerDragged = false;
		if (!shouldSelect) return;

		const satellite = getSatellite();
		if (!satellite || getCurrentView() !== "satellite") return;
		const bounds = canvas.getBoundingClientRect();
		pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
		pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
		raycaster.setFromCamera(pointer, camera);
		const hit = raycaster.intersectObjects(getSelectableComponentMeshes(), false)[0];
		const component = hit && getComponentFromObject(hit.object);
		if (component) selectComponent(component);
	});
}

try {
	initializeExperience();
} catch {
	document.documentElement.classList.remove("js-enhanced");
}
