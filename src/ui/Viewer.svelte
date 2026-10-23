<script>
	import { onMount, tick, untrack } from 'svelte'
	import { getRepresentation } from '../scene/explorerScene.js'
	import { language, text } from './language.svelte.js'
	import ViewerControls from './ViewerControls.svelte'

	let { explorer, onReady, onUnsupported } = $props()

	const state = $derived(explorer.state)
	const selectedItem = $derived(explorer.tree.get(state.selectedId))
	const isRoot = $derived(state.selectedId === explorer.tree.rootId)
	const representation = $derived(getRepresentation(selectedItem))
	const tag = $derived(
		representation === 'optics'
			? 'schematic'
			: representation === 'part'
				? 'cadPart'
				: null,
	)
	const visible = $derived(state.enhanced && explorer.isVisible())

	let viewer = $state()
	let canvas = $state()
	let visibleArea = $state()
	let markersElement = $state()
	let controller = $state(null)

	onMount(() => {
		let disposed = false
		let created = null
		;(async () => {
			const { createRenderer } = await import('../scene/renderer.js')
			const renderer = createRenderer()
			if (!renderer) {
				onUnsupported()
				return
			}
			const { createViewerController } =
				await import('../app/viewerController.js')
			if (disposed) {
				renderer.dispose()
				return
			}
			onReady()
			created = createViewerController(explorer, {
				renderer,
				viewer,
				canvas,
				visibleArea,
				markersElement,
			})
			controller = created
			created.start()
		})()
		return () => {
			disposed = true
			created?.destroy()
		}
	})

	$effect(() => {
		state.sceneRequest
		if (controller) untrack(() => controller.applySceneState())
	})

	$effect(() => {
		const id = state.previewId
		if (controller) untrack(() => controller.preview(id))
	})

	$effect(() => {
		language.current
		if (controller) untrack(() => controller.updateMarkerLabels())
	})

	$effect(() => {
		visible
		state.sheetState
		state.layoutMode
		if (!controller) return
		tick().then(() => controller.updateViewOffsetTarget())
	})
</script>

<div
	class="viewer"
	class:is-loading={state.status === 'loading'}
	class:is-switching={state.switching}
	data-explorer={visible ? 'open' : 'closed'}
	data-sheet={state.enhanced
		? explorer.isMobile()
			? state.sheetState
			: 'none'
		: undefined}
	data-representation={state.representation ?? undefined}
	bind:this={viewer}
>
	<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
	<canvas
		id="app"
		role="img"
		aria-label={text('canvasLabel')}
		bind:this={canvas}
	></canvas>
	<div
		class="viewer-markers"
		aria-hidden="true"
		bind:this={markersElement}
	></div>
	<div class="viewer-visible-area" bind:this={visibleArea}>
		<div class="viewer-poster" hidden={!state.posterVisible}>
			<img
				src="/media/satellite-overview.webp"
				width="1200"
				height="800"
				loading="lazy"
				decoding="async"
				alt={language.current === 'nl'
					? 'Weergave van de NEBULA Xplorer-satelliet: een kastvormig ruimtevaartuig met twee uitgeklapte zonnepanelen.'
					: 'Rendering of the NEBULA Xplorer satellite: a box-shaped spacecraft with two deployed solar panels.'}
			/>
			<div class="viewer-poster-panel">
				<p>{text('posterText')}</p>
				<button
					type="button"
					class="viewer-load-model"
					onclick={() => controller?.loadModel()}
					>{text('loadModel')}</button
				>
			</div>
		</div>
		<p class="viewer-label" aria-hidden="true" hidden={isRoot}>
			<span class="viewer-label-number"
				>{explorer.tree.getNumber(state.selectedId) ?? ''}</span
			>
			<span class="viewer-label-name"
				>{state.enhanced
					? explorer.getFullTitle(state.selectedId)
					: ''}</span
			>
			<span class="viewer-tag" hidden={!tag}>{tag ? text(tag) : ''}</span>
		</p>
		<p class="viewer-status" role="status" hidden={!state.status}>
			{state.status
				? text(state.status === 'error' ? 'loadError' : 'loading')
				: ''}
		</p>
		<p
			class="viewer-hint"
			class:is-dismissed={state.hintDismissed}
			aria-hidden="true"
		>
			{text(state.coarsePointer ? 'hintTouch' : 'hintPointer')}
		</p>
		<ViewerControls {state} {controller} />
	</div>
</div>
