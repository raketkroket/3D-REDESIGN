import * as THREE from 'three'
import TWEEN from 'three/examples/jsm/libs/tween.module.js'
import { createExplorerTree } from './app/explorerTree.js'
import { SHEET_STATES, createViewerState } from './app/viewerState.js'
import { createDomBindings } from './ui/domBindings.js'
import { readExplorerItems } from './ui/explorerItems.js'
import { createExplorerPanel } from './ui/explorerPanel.js'
import { createLanguage } from './ui/language.js'
import { createMarkers } from './ui/markers.js'
import { updateViewerControls } from './ui/viewerControls.js'
import { createCamera } from './scene/camera.js'
import { createControls, updateControls } from './scene/controls.js'
import {
	createExplorerScene,
	getRepresentation,
} from './scene/explorerScene.js'
import { createLights } from './scene/lights.js'
import { createMotionDetail } from './scene/objects/MotionDetail.js'
import {
	getComponentFromObject,
	getModelStats,
	loadSatellite,
} from './scene/objects/Satellite.js'
import { createStars } from './scene/objects/star.js'
import { createRenderQuality } from './scene/renderQuality.js'
import { createRenderer } from './scene/renderer.js'
import { createScene } from './scene/scene.js'
import { isCameraMoving, stopCameraTween } from './scene/updateCamera.js'
import { createViewOffset } from './scene/viewOffset.js'
import { createCameraOrbit } from './scene/cameraOrbit.js'

const mobileQuery = window.matchMedia('(max-width: 899px)')
const wideQuery = window.matchMedia('(min-width: 1280px)')
const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const selectionSources = new Set(['list', 'marker', 'canvas'])
const orbitResumeDelay = 3500

function wait(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function getHashId() {
	try {
		return decodeURIComponent(window.location.hash.slice(1))
	} catch {
		return ''
	}
}

function readPixels(element, property) {
	return parseFloat(getComputedStyle(element).getPropertyValue(property)) || 0
}

function showFallbackNotice(dom, language) {
	const update = () => {
		dom.fallbackNotice.textContent = language.text('fallback')
	}
	update()
	dom.fallbackNotice.hidden = false
	language.onChange(update)
}

function initializeExplorer() {
	const dom = createDomBindings()
	if (!dom.items.length) return
	dom.root.classList.add('js')
	const language = createLanguage(dom)
	const renderer = createRenderer()
	if (!renderer) {
		showFallbackNotice(dom, language)
		return
	}

	dom.root.classList.add('js-enhanced')
	const tree = createExplorerTree(readExplorerItems(dom.items))
	const state = createViewerState(tree.rootId)
	const panel = createExplorerPanel(dom, tree, language)
	const scene = createScene(requestRender)
	const camera = createCamera()
	const controls = createControls(camera, renderer)
	const lighting = createLights(scene, renderer)
	const renderQuality = createRenderQuality(renderer)
	const motionDetail = createMotionDetail()
	const viewOffset = createViewOffset(camera)
	const cameraOrbit = createCameraOrbit(camera, controls)
	const explorerScene = createExplorerScene({ scene, camera, controls })
	const starfield = createStars(14000, scene)
	const raycaster = new THREE.Raycaster()
	const pointer = new THREE.Vector2()
	const viewerSize = { width: 1, height: 1 }
	const markers = createMarkers(dom.markers, {
		onPreview: setPreview,
		onSelect: (id) => navigate(id, { source: 'marker' }),
	})
	let availableControls = { rotation: false, outerPanels: false, rays: false }
	let markerCenter = null
	let cadStateKey = null
	let collapseTimeout = null
	raycaster.layers.enable(1)
	controls.autoRotateSpeed = 0.32

	function getSelectedItem() {
		return tree.get(state.selectedId)
	}

	function isMobile() {
		return mobileQuery.matches
	}

	function requestRender() {
		if (state.frameRequest !== null || document.hidden) return
		state.frameRequest = requestAnimationFrame(renderFrame)
	}

	function renderFrame(time) {
		state.frameRequest = null
		if (document.hidden) return
		const frameMs =
			state.lastFrameTime === null ? 0 : time - state.lastFrameTime
		const delta = Math.min(frameMs / 1000, 0.1)
		state.lastFrameTime = time
		TWEEN.update(time)
		const tweening = TWEEN.getAll().some((tween) => tween.isPlaying())
		const ambientMotionAllowed =
			state.satelliteReady &&
			!state.rotationPaused &&
			!state.interacting &&
			!reduceMotion.matches &&
			!tweening &&
			time - state.lastInteractionTime > orbitResumeDelay
		controls.autoRotate =
			ambientMotionAllowed && getSelectedItem().scene === 'satellite'
		const orbiting = cameraOrbit.update(
			Math.min(frameMs / 1000, 0.25),
			ambientMotionAllowed,
		)
		updateControls(delta)
		const offsetMoving = viewOffset.update(delta || 1 / 60)
		const moving =
			controls.autoRotate ||
			orbiting ||
			state.interacting ||
			tweening ||
			offsetMoving ||
			explorerScene.isAnimating()
		renderQuality.update(frameMs, moving, state.interacting)
		const nextCadStateKey = [
			state.selectedId,
			state.previewId,
			state.outerPanelsVisible,
			explorerScene.getCurrentRepresentation(),
		].join('|')
		if (nextCadStateKey !== cadStateKey) {
			for (const root of explorerScene.getRoots())
				root?.userData.cadInstances?.sync()
			cadStateKey = nextCadStateKey
		}
		motionDetail.update(explorerScene.getRoots(), moving)
		lighting.update(camera, controls.target)
		explorerScene.update(time)
		renderer.render(scene, camera)
		markers.setHidden(isCameraMoving())
		markers.update(
			camera,
			viewerSize.width,
			viewerSize.height,
			markerCenter,
		)
		if (moving) requestRender()
	}

	function updateViewOffsetTarget(immediate = false) {
		let left = 0
		let bottom = 0
		if (isMobile()) {
			if (state.sheetState === SHEET_STATES.CLOSED)
				bottom = dom.explorerToggle.offsetHeight
			else if (state.sheetState === SHEET_STATES.PEEK)
				bottom = readPixels(dom.explorer, '--sheet-peek-height')
			else
				bottom =
					viewerSize.height -
					readPixels(dom.explorer, '--sheet-expanded-top')
		} else if (state.explorerOpen) {
			left = readPixels(dom.explorer, '--explorer-width')
		}
		viewOffset.setTarget(
			{ left, bottom },
			immediate || reduceMotion.matches,
		)
		requestRender()
	}

	function syncExplorerVisibility() {
		const mobile = isMobile()
		const visible = mobile
			? state.sheetState !== SHEET_STATES.CLOSED
			: state.explorerOpen
		dom.explorer.inert = !visible
		dom.explorer.dataset.open = String(state.explorerOpen)
		dom.explorer.dataset.sheet = state.sheetState
		dom.viewer.dataset.explorer = visible ? 'open' : 'closed'
		dom.viewer.dataset.sheet = mobile ? state.sheetState : 'none'
		dom.explorerToggle.setAttribute('aria-expanded', String(visible))
		const expanded = state.sheetState === SHEET_STATES.EXPANDED
		dom.explorerGrabber.setAttribute('aria-expanded', String(expanded))
		dom.explorerGrabber.setAttribute(
			'aria-label',
			language.text(expanded ? 'collapseExplorer' : 'expandExplorer'),
		)
		updateViewOffsetTarget()
	}

	function setExplorerOpen(open, { focus = false } = {}) {
		clearTimeout(collapseTimeout)
		state.explorerOpen = open
		syncExplorerVisibility()
		if (!focus) return
		if (open) panel.focusTitle()
		else dom.explorerToggle.focus()
	}

	function setSheetState(sheetState, { focus = false } = {}) {
		state.sheetState = sheetState
		syncExplorerVisibility()
		if (!focus) return
		if (sheetState === SHEET_STATES.CLOSED) dom.explorerToggle.focus()
		else panel.focusTitle()
	}

	function openExplorer() {
		if (isMobile()) setSheetState(SHEET_STATES.EXPANDED, { focus: true })
		else setExplorerOpen(true, { focus: true })
	}

	function closeExplorer() {
		if (isMobile()) setSheetState(SHEET_STATES.CLOSED, { focus: true })
		else setExplorerOpen(false, { focus: true })
	}

	function setStatus(kind) {
		dom.viewerStatus.hidden = !kind
		dom.viewerStatus.textContent = kind
			? language.text(kind === 'error' ? 'loadError' : 'loading')
			: ''
		dom.viewer.classList.toggle('is-loading', kind === 'loading')
	}

	function updateViewerLabel() {
		const item = getSelectedItem()
		const isRoot = item.id === tree.rootId
		dom.viewerLabel.hidden = isRoot
		dom.viewerLabelNumber.textContent = tree.getNumber(item.id) ?? ''
		dom.viewerLabelName.textContent = panel.getFullTitle(item.id)
		const representation = getRepresentation(item)
		const tag =
			representation === 'optics'
				? 'schematic'
				: representation === 'part'
					? 'cadPart'
					: null
		dom.viewerTag.hidden = !tag
		dom.viewerTag.textContent = tag ? language.text(tag) : ''
	}

	function updateHint() {
		dom.viewerHint.textContent = language.text(
			coarsePointerQuery.matches ? 'hintTouch' : 'hintPointer',
		)
	}

	function updateControlsUi() {
		updateViewerControls(dom, language, {
			available: {
				...availableControls,
				reset: state.cameraAdjusted && state.satelliteReady,
			},
			state,
		})
	}

	function updateMarkers(item) {
		const anchors = explorerScene.getMarkerAnchors(
			tree.getChildren(item.id),
		)
		markers.set(
			anchors.map(({ id, position }) => ({
				id,
				position,
				number: tree.getNumber(id),
				label: panel.getFullTitle(id),
			})),
		)
		const activeObject = explorerScene.getActiveObject()
		markerCenter =
			anchors.length && activeObject
				? getModelStats(activeObject).center
				: null
	}

	function setPreview(id) {
		if (state.previewId === id) return
		state.previewId = id
		panel.setPreview(id)
		markers.setPreview(id)
		explorerScene.preview(id ? tree.get(id) : null)
		requestRender()
	}

	function getSceneOptions(duration) {
		return {
			outerPanelsVisible: state.outerPanelsVisible,
			raysPlaying: state.raysPlaying && !reduceMotion.matches,
			duration: reduceMotion.matches ? 0 : duration,
			aspect: viewOffset.getVisibleAspect(),
		}
	}

	async function applySceneState() {
		if (!state.satelliteReady) return
		const request = ++state.viewRequest
		const item = getSelectedItem()
		state.outerPanelsVisible = false
		state.cameraAdjusted = false
		state.previewId = null
		markers.set([])
		const currentRepresentation = explorerScene.getCurrentRepresentation()
		const switching =
			currentRepresentation !== null &&
			(getRepresentation(item) !== currentRepresentation ||
				item.scene === 'cad-part')
		if (!explorerScene.isReady(item)) setStatus('loading')
		try {
			await explorerScene.prepare(item)
		} catch (error) {
			console.error('3D view failed to load', error)
			if (request === state.viewRequest) setStatus('error')
			return
		}
		if (request !== state.viewRequest) return
		setStatus(null)
		if (switching && !reduceMotion.matches) {
			dom.viewer.classList.add('is-switching')
			await wait(180)
			if (request !== state.viewRequest) return
		}
		stopCameraTween()
		const result = explorerScene.apply(item, getSceneOptions(1000))
		cameraOrbit.setSettings(result.orbit)
		dom.viewer.classList.remove('is-switching')
		dom.viewer.dataset.representation = result.representation
		availableControls = result.controls
		updateMarkers(item)
		updateControlsUi()
		requestRender()
	}

	function getDirection(previousId, nextId) {
		if (previousId === nextId) return 'none'
		return tree.getDepth(nextId) < tree.getDepth(previousId)
			? 'back'
			: 'forward'
	}

	function announce(id) {
		dom.status.textContent = ''
		setTimeout(() => {
			dom.status.textContent = `${panel.getFullTitle(id)}, ${panel.getKicker(id)}`
		}, 60)
	}

	function revealSelection(id, source, keyboard) {
		clearTimeout(collapseTimeout)
		if (!selectionSources.has(source) || keyboard) return
		if (isMobile()) {
			setSheetState(SHEET_STATES.PEEK)
			return
		}
		const isLeaf = tree.getChildren(id).length === 0
		if (state.explorerOpen && isLeaf && !wideQuery.matches)
			collapseTimeout = setTimeout(
				() =>
					setExplorerOpen(false, {
						focus: dom.explorer.contains(document.activeElement),
					}),
				400,
			)
	}

	function navigate(
		id,
		{ source = 'list', push = true, focus = false, keyboard = false } = {},
	) {
		const nextId = tree.has(id) ? id : tree.rootId
		const previousId = state.selectedId
		const changed = nextId !== previousId
		if (push && changed) history.pushState(null, '', `#${nextId}`)
		state.selectedId = nextId
		setPreview(null)
		panel.showItem(nextId, { direction: getDirection(previousId, nextId) })
		updateViewerLabel()
		revealSelection(nextId, source, keyboard)
		if (changed || source === 'history') applySceneState()
		if (focus) panel.focusTitle()
		else if (changed) announce(nextId)
	}

	function resetView() {
		state.cameraAdjusted = false
		const result = explorerScene.apply(
			getSelectedItem(),
			getSceneOptions(800),
		)
		cameraOrbit.setSettings(result.orbit)
		state.lastInteractionTime = -Infinity
		updateControlsUi()
		requestRender()
	}

	function getLinkSource(link) {
		if (link.closest('.explorer-breadcrumb')) return 'breadcrumb'
		if (link.closest('.explorer-pager')) return 'pager'
		return 'list'
	}

	function bindExplorerEvents() {
		dom.explorer.addEventListener('click', (event) => {
			const link = event.target.closest('a[href^="#"]')
			if (link && tree.has(link.hash.slice(1))) {
				event.preventDefault()
				navigate(link.hash.slice(1), {
					source: getLinkSource(link),
					focus: true,
					keyboard: event.detail === 0,
				})
				return
			}
			if (
				isMobile() &&
				state.sheetState === SHEET_STATES.PEEK &&
				event.target.closest('.explorer-scroll')
			)
				setSheetState(SHEET_STATES.EXPANDED)
		})
		const previewFromEvent = (event) => {
			const link = event.target.closest('.explorer-list a')
			setPreview(link ? link.hash.slice(1) : null)
		}
		dom.explorer.addEventListener('pointerover', previewFromEvent)
		dom.explorer.addEventListener('focusin', previewFromEvent)
		dom.explorer.addEventListener('pointerleave', () => setPreview(null))
		dom.explorer.addEventListener('focusout', (event) => {
			if (!dom.explorer.contains(event.relatedTarget)) setPreview(null)
		})
		dom.explorerToggle.addEventListener('click', openExplorer)
		dom.skipLink.addEventListener('click', (event) => {
			event.preventDefault()
			openExplorer()
		})
		dom.explorerClose.addEventListener('click', closeExplorer)
		dom.explorerGrabber.addEventListener('click', () => {
			setSheetState(
				state.sheetState === SHEET_STATES.EXPANDED
					? SHEET_STATES.PEEK
					: SHEET_STATES.EXPANDED,
			)
		})
		let dragStart = null
		dom.explorerBar.addEventListener('pointerdown', (event) => {
			if (!isMobile() || event.target.closest('a, .explorer-close'))
				return
			dragStart = event.clientY
		})
		dom.explorerBar.addEventListener('pointerup', (event) => {
			if (dragStart === null) return
			const distance = event.clientY - dragStart
			dragStart = null
			if (distance < -40) setSheetState(SHEET_STATES.EXPANDED)
			else if (distance > 40)
				setSheetState(
					state.sheetState === SHEET_STATES.EXPANDED
						? SHEET_STATES.PEEK
						: SHEET_STATES.CLOSED,
				)
		})
		dom.explorerBar.addEventListener('pointercancel', () => {
			dragStart = null
		})
		document.addEventListener('keydown', (event) => {
			if (event.key !== 'Escape') return
			const parent = tree.getParent(state.selectedId)
			if (parent && dom.explorer.contains(document.activeElement)) {
				event.preventDefault()
				navigate(parent.id, {
					source: 'breadcrumb',
					focus: true,
					keyboard: true,
				})
				return
			}
			if (isMobile()) {
				if (state.sheetState === SHEET_STATES.EXPANDED)
					setSheetState(SHEET_STATES.PEEK)
				else if (state.sheetState === SHEET_STATES.PEEK)
					setSheetState(SHEET_STATES.CLOSED, { focus: true })
			} else if (state.explorerOpen) {
				setExplorerOpen(false, { focus: true })
			}
		})
		for (const link of document.querySelectorAll('[data-explorer-home]'))
			link.addEventListener('click', (event) => {
				event.preventDefault()
				navigate(tree.rootId, { source: 'breadcrumb' })
			})
		window.addEventListener('popstate', () => {
			navigate(getHashId(), { source: 'history', push: false })
		})
		mobileQuery.addEventListener('change', syncExplorerVisibility)
		coarsePointerQuery.addEventListener('change', updateHint)
	}

	function bindViewerControls() {
		dom.controls.rotation.addEventListener('click', () => {
			state.rotationPaused = !state.rotationPaused
			updateControlsUi()
			requestRender()
		})
		dom.controls.outerPanels.addEventListener('click', () => {
			const item = getSelectedItem()
			state.outerPanelsVisible = !state.outerPanelsVisible
			explorerScene.setOuterPanels(item, state.outerPanelsVisible)
			updateMarkers(item)
			updateControlsUi()
			requestRender()
		})
		dom.controls.rays.addEventListener('click', () => {
			state.raysPlaying = !state.raysPlaying
			explorerScene.setRaysPlaying(
				state.raysPlaying && !reduceMotion.matches,
			)
			updateControlsUi()
			requestRender()
		})
		dom.controls.reset.addEventListener('click', resetView)
		reduceMotion.addEventListener('change', () => {
			explorerScene.setRaysPlaying(
				state.raysPlaying && !reduceMotion.matches,
			)
			requestRender()
		})
	}

	function bindCanvasEvents() {
		const canvas = dom.canvas
		controls.addEventListener('start', () => {
			stopCameraTween()
			state.interacting = true
			state.lastInteractionTime = performance.now()
			if (!state.cameraAdjusted) {
				state.cameraAdjusted = true
				updateControlsUi()
			}
			dom.viewerHint.classList.add('is-dismissed')
			requestRender()
		})
		controls.addEventListener('end', () => {
			state.interacting = false
			state.lastInteractionTime = performance.now()
			setTimeout(requestRender, orbitResumeDelay + 50)
			requestRender()
		})
		controls.addEventListener('change', requestRender)
		canvas.addEventListener('pointerdown', (event) => {
			state.pointerStart = { x: event.clientX, y: event.clientY }
			state.pointerDragged = false
		})
		canvas.addEventListener('pointermove', (event) => {
			if (!state.pointerStart) return
			state.pointerDragged ||=
				Math.hypot(
					event.clientX - state.pointerStart.x,
					event.clientY - state.pointerStart.y,
				) > 6
		})
		canvas.addEventListener('pointercancel', () => {
			state.pointerStart = null
			state.pointerDragged = false
		})
		canvas.addEventListener('click', (event) => {
			const shouldSelect = !state.pointerDragged
			state.pointerStart = null
			state.pointerDragged = false
			if (!shouldSelect || !state.satelliteReady) return
			const bounds = canvas.getBoundingClientRect()
			pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
			pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
			raycaster.setFromCamera(pointer, camera)
			const target = explorerScene.pick(raycaster, getSelectedItem())
			const item = target && tree.find(target.scene, target.component)
			if (item && item.id !== state.selectedId)
				navigate(item.id, { source: 'canvas' })
		})
	}

	function bindRenderPipeline() {
		document.addEventListener('visibilitychange', () => {
			state.lastFrameTime = null
			requestRender()
		})
		const resizeRenderer = () => {
			const { width, height } = dom.viewer.getBoundingClientRect()
			if (width === 0 || height === 0) return
			viewerSize.width = width
			viewerSize.height = height
			camera.aspect = width / height
			renderer.setSize(width, height, false)
			viewOffset.setSize(width, height)
			updateViewOffsetTarget(true)
		}
		new ResizeObserver(resizeRenderer).observe(dom.viewer)
		resizeRenderer()
	}

	function activateFallback() {
		dom.root.classList.remove('js-enhanced')
		showFallbackNotice(dom, language)
		for (const item of dom.items) item.hidden = false
		markers.set([])
		setStatus(null)
	}

	function loadInitialSatellite() {
		setStatus('loading')
		loadSatellite(scene, {
			onLoad: async (satellite) => {
				const bounds = getModelStats(satellite)
				starfield.position.copy(bounds.center)
				starfield.scale.setScalar(bounds.radius / 4.5)
				try {
					const { createCadInstances } =
						await import('./scene/objects/CadInstances.js')
					satellite.userData.cadInstances = createCadInstances(
						satellite,
						getComponentFromObject,
					)
				} catch (error) {
					console.error('CAD batching unavailable', error)
				}
				state.satelliteReady = true
				setStatus(null)
				applySceneState()
			},
			onError: activateFallback,
		})
	}

	function initializeState() {
		const initialId = tree.has(getHashId()) ? getHashId() : tree.rootId
		state.selectedId = initialId
		if (initialId !== tree.rootId) {
			state.explorerOpen = !isMobile()
			state.sheetState = isMobile()
				? SHEET_STATES.PEEK
				: SHEET_STATES.CLOSED
		}
		panel.showItem(initialId)
		syncExplorerVisibility()
		updateViewerLabel()
		updateHint()
		updateControlsUi()
		language.onChange(() => {
			dom.explorerToggleLabel.textContent =
				language.text('exploreSatellite')
			dom.explorerClose.setAttribute(
				'aria-label',
				language.text('closeExplorer'),
			)
			syncExplorerVisibility()
			updateViewerLabel()
			updateHint()
			updateControlsUi()
			markers.setLabels(panel.getFullTitle)
			if (!dom.viewerStatus.hidden)
				dom.viewerStatus.textContent = language.text(
					dom.viewer.classList.contains('is-loading')
						? 'loading'
						: 'loadError',
				)
		})
		language.setLanguage(language.getLanguage(), { store: false })
	}

	initializeState()
	bindExplorerEvents()
	bindViewerControls()
	bindCanvasEvents()
	bindRenderPipeline()
	loadInitialSatellite()
	requestRender()

	if (import.meta.env.DEV)
		window.__nebulaDebug = {
			scene,
			camera,
			controls,
			renderer,
			motionDetail,
			cameraOrbit,
			state,
			tree,
		}
}

try {
	initializeExplorer()
} catch (error) {
	console.error('Explorer failed to start', error)
	document.documentElement.classList.remove('js-enhanced')
}
