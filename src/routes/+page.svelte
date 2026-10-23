<script>
	import { flushSync, onMount } from 'svelte'
	import { createExplorer } from '../app/explorer.svelte.js'
	import { explorerContent } from '../app/explorerContent.js'
	import Explorer from '../ui/Explorer.svelte'
	import SiteHeader from '../ui/SiteHeader.svelte'
	import Viewer from '../ui/Viewer.svelte'
	import { restoreLanguage, text } from '../ui/language.svelte.js'
	import { readLayoutMode } from '../ui/layoutMode.js'

	const explorer = createExplorer(explorerContent)
	const state = explorer.state
	const visible = $derived(state.enhanced && explorer.isVisible())

	function enhance() {
		const root = document.documentElement
		const layoutMode = readLayoutMode()
		explorer.initialize(layoutMode)
		state.enhanced = true
		root.dataset.layout = layoutMode
		root.classList.add('js-enhanced')
		flushSync()
	}

	function showFallback() {
		state.fallback = true
	}

	function openExplorer(event) {
		if (!state.enhanced) return
		event.preventDefault()
		explorer.openExplorer()
	}

	onMount(() => {
		document.documentElement.classList.add('js')
		state.scriptActive = true
		restoreLanguage()
		const coarsePointer = window.matchMedia('(pointer: coarse)')
		const updatePointer = () =>
			(state.coarsePointer = coarsePointer.matches)
		updatePointer()
		coarsePointer.addEventListener('change', updatePointer)
		document.addEventListener('keydown', explorer.handleKeydown)
		window.addEventListener('popstate', explorer.handlePopstate)
		return () => {
			coarsePointer.removeEventListener('change', updatePointer)
			document.removeEventListener('keydown', explorer.handleKeydown)
			window.removeEventListener('popstate', explorer.handlePopstate)
		}
	})
</script>

<a class="skip-link" href="#explorer" onclick={openExplorer}
	>{text('skipLink')}</a
>

<SiteHeader {explorer} />

<noscript>
	<p class="page-notice">
		The interactive 3D model needs JavaScript. All satellite information is
		available on this page.
	</p>
</noscript>
<p class="page-notice" data-fallback-notice hidden={!state.fallback}>
	{state.fallback ? text('fallback') : ''}
</p>

<main class="explorer-layout">
	<button
		type="button"
		class="explorer-toggle"
		aria-controls="explorer"
		aria-expanded={String(visible)}
		onclick={() => explorer.openExplorer()}
	>
		<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"
			><path d="M2 4h12M2 8h12M2 12h12" /></svg
		>
		<span class="explorer-toggle-label">{text('exploreSatellite')}</span>
	</button>

	<Viewer {explorer} onReady={enhance} onUnsupported={showFallback} />

	<Explorer {explorer} />
</main>

<p class="visually-hidden" role="status" data-explorer-status>
	{state.announcement}
</p>
