function setLabel(button, text) {
	button.querySelector('.viewer-control-label').textContent = text
}

export function updateViewerControls(dom, language, { available, state }) {
	const { rotation, outerPanels, rays, reset } = dom.controls
	rotation.hidden = !available.rotation
	outerPanels.hidden = !available.outerPanels
	rays.hidden = !available.rays
	reset.hidden = !available.reset

	rotation.dataset.state = state.rotationPaused ? 'paused' : 'playing'
	setLabel(
		rotation,
		language.text(
			state.rotationPaused ? 'resumeRotation' : 'pauseRotation',
		),
	)
	outerPanels.setAttribute('aria-pressed', String(state.outerPanelsVisible))
	setLabel(outerPanels, language.text('outerPanels'))
	rays.dataset.state = state.raysPlaying ? 'playing' : 'paused'
	setLabel(rays, language.text(state.raysPlaying ? 'pauseRays' : 'playRays'))
	setLabel(reset, language.text('resetView'))
}
