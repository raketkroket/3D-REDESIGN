export const SHEET_STATES = Object.freeze({
	CLOSED: 'closed',
	PEEK: 'peek',
	EXPANDED: 'expanded',
})

export function createViewerState(rootId) {
	return {
		selectedId: rootId,
		previewId: null,
		explorerOpen: false,
		sheetState: SHEET_STATES.CLOSED,
		outerPanelsVisible: false,
		raysPlaying: true,
		rotationPaused: false,
		cameraAdjusted: false,
		interacting: false,
		satelliteReady: false,
		viewRequest: 0,
		frameRequest: null,
		lastFrameTime: null,
		viewerInViewport: true,
		pointerStart: null,
		pointerDragged: false,
	}
}
