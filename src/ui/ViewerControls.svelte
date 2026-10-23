<script>
	import { text } from './language.svelte.js'

	let { state, controller } = $props()

	const available = $derived(state.availableControls)
	const canReset = $derived(state.cameraAdjusted && state.satelliteReady)
</script>

<div class="viewer-controls">
	<button
		type="button"
		class="viewer-control"
		data-control="rotation"
		data-state={state.rotationPaused ? 'paused' : 'playing'}
		hidden={!available.rotation}
		onclick={() => controller?.toggleRotation()}
	>
		<svg class="icon icon-pause" viewBox="0 0 16 16" aria-hidden="true"
			><path d="M5 3v10M11 3v10" /></svg
		>
		<svg class="icon icon-play" viewBox="0 0 16 16" aria-hidden="true"
			><path d="M5 3l8 5-8 5z" /></svg
		>
		<span class="viewer-control-label"
			>{text(
				state.rotationPaused ? 'resumeRotation' : 'pauseRotation',
			)}</span
		>
	</button>
	<button
		type="button"
		class="viewer-control"
		data-control="outerPanels"
		aria-pressed={String(state.outerPanelsVisible)}
		hidden={!available.outerPanels}
		onclick={() => controller?.toggleOuterPanels()}
	>
		<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"
			><path d="M2 5l6-3 6 3-6 3zM2 8l6 3 6-3M2 11l6 3 6-3" /></svg
		>
		<span class="viewer-control-label">{text('outerPanels')}</span>
	</button>
	<button
		type="button"
		class="viewer-control"
		data-control="rays"
		data-state={state.raysPlaying ? 'playing' : 'paused'}
		hidden={!available.rays}
		onclick={() => controller?.toggleRays()}
	>
		<svg class="icon icon-pause" viewBox="0 0 16 16" aria-hidden="true"
			><path d="M5 3v10M11 3v10" /></svg
		>
		<svg class="icon icon-play" viewBox="0 0 16 16" aria-hidden="true"
			><path d="M5 3l8 5-8 5z" /></svg
		>
		<span class="viewer-control-label"
			>{text(state.raysPlaying ? 'pauseRays' : 'playRays')}</span
		>
	</button>
	<button
		type="button"
		class="viewer-control"
		data-control="reset"
		hidden={!canReset}
		onclick={() => controller?.resetView()}
	>
		<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"
			><path d="M3 8a5 5 0 1 0 1.5-3.6M3 2v3h3" /></svg
		>
		<span class="viewer-control-label">{text('resetView')}</span>
	</button>
</div>
