<script>
	import { SHEET_STATES } from '../app/viewerState.svelte.js'
	import ExplorerBreadcrumb from './ExplorerBreadcrumb.svelte'
	import ExplorerNode from './ExplorerNode.svelte'
	import { pick, text } from './language.svelte.js'

	let { explorer } = $props()

	const comfortableOffset = 12
	const state = $derived(explorer.state)
	const content = $derived(explorer.content)
	const visible = $derived(state.enhanced && explorer.isVisible())
	const sheetExpanded = $derived(state.sheetState === SHEET_STATES.EXPANDED)

	let scrollElement = $state()
	let scrollTimeout = null
	let dragStart = null

	function scrollToNode(id, smooth) {
		clearTimeout(scrollTimeout)
		const reduceMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches
		const animate = smooth && !reduceMotion
		const behavior = animate ? 'smooth' : 'auto'
		const scroll = () => {
			const link =
				id === explorer.tree.rootId
					? null
					: document
							.getElementById(id)
							?.querySelector(':scope > .explorer-node-heading a')
			if (!link) {
				scrollElement.scrollTo({ top: 0, behavior })
				return
			}
			const containerTop = scrollElement.getBoundingClientRect().top
			const rowTop =
				link.getBoundingClientRect().top -
				containerTop +
				scrollElement.scrollTop
			const comfortableBottom =
				scrollElement.scrollTop + scrollElement.clientHeight * 0.4
			if (
				rowTop >= scrollElement.scrollTop + comfortableOffset &&
				rowTop <= comfortableBottom
			)
				return
			scrollElement.scrollTo({
				top: Math.max(0, rowTop - comfortableOffset),
				behavior,
			})
		}
		scrollTimeout = setTimeout(scroll, animate ? 280 : 0)
	}

	$effect(() => {
		const request = state.scrollRequest
		if (!state.enhanced || !scrollElement) return
		scrollToNode(request.id, request.smooth)
	})

	function handleClick(event) {
		if (!state.enhanced) return
		const link = event.target.closest('a[href^="#"]')
		if (link && explorer.tree.has(link.hash.slice(1))) {
			event.preventDefault()
			const id = link.hash.slice(1)
			if (
				id === state.selectedId &&
				link.classList.contains('explorer-node-link')
			) {
				explorer.toggleSelectedItem()
				return
			}
			explorer.navigate(id, {
				source: link.closest('.explorer-breadcrumb')
					? 'breadcrumb'
					: 'list',
				keyboard: event.detail === 0,
			})
			return
		}
		if (
			explorer.isMobile() &&
			state.sheetState === SHEET_STATES.PEEK &&
			!event.target.closest('a, button')
		)
			explorer.setSheetState(SHEET_STATES.EXPANDED)
	}

	function previewFromEvent(event) {
		if (!state.enhanced) return
		const link = event.target.closest('.explorer-node-link')
		explorer.setPreview(link ? link.hash.slice(1) : null)
	}

	function handleFocusout(event) {
		if (!state.enhanced) return
		if (!event.currentTarget.contains(event.relatedTarget))
			explorer.setPreview(null)
	}

	function handleBarPointerdown(event) {
		if (!explorer.isMobile() || event.target.closest('a, .explorer-close'))
			return
		dragStart = event.clientY
	}

	function handleBarPointerup(event) {
		if (dragStart === null) return
		const distance = event.clientY - dragStart
		dragStart = null
		if (distance < -40) explorer.setSheetState(SHEET_STATES.EXPANDED)
		else if (distance > 40)
			explorer.setSheetState(
				state.sheetState === SHEET_STATES.EXPANDED
					? SHEET_STATES.PEEK
					: SHEET_STATES.CLOSED,
			)
	}

	function toggleSheet() {
		explorer.setSheetState(
			sheetExpanded ? SHEET_STATES.PEEK : SHEET_STATES.EXPANDED,
		)
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
<section
	class="explorer"
	id="explorer"
	aria-label={text('explorerLabel')}
	data-open={String(state.explorerOpen)}
	data-sheet={state.sheetState}
	inert={state.enhanced && !visible}
	onclick={handleClick}
	onpointerover={previewFromEvent}
	onfocusin={previewFromEvent}
	onpointerleave={() => state.enhanced && explorer.setPreview(null)}
	onfocusout={handleFocusout}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="explorer-bar"
		onpointerdown={handleBarPointerdown}
		onpointerup={handleBarPointerup}
		onpointercancel={() => (dragStart = null)}
	>
		<button
			type="button"
			class="explorer-grabber"
			aria-controls="explorer"
			aria-expanded={String(sheetExpanded)}
			aria-label={text(
				sheetExpanded ? 'collapseExplorer' : 'expandExplorer',
			)}
			onclick={toggleSheet}
		></button>
		<ExplorerBreadcrumb {explorer} />
		<p class="explorer-current" aria-hidden="true">
			<span class="explorer-current-number"
				>{explorer.tree.getNumber(state.selectedId) ?? ''}</span
			>
			<span class="explorer-current-title"
				>{state.enhanced
					? explorer.getFullTitle(state.selectedId)
					: ''}</span
			>
		</p>
		<button
			type="button"
			class="explorer-close"
			aria-label={text('closeExplorer')}
			onclick={() => explorer.closeExplorer()}
		>
			<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"
				><path d="M3 3l10 10M13 3L3 13" /></svg
			>
		</button>
	</div>

	<div class="explorer-scroll" bind:this={scrollElement}>
		<div
			class="explorer-root"
			id={content.id}
			data-explorer-item
			data-scene={content.scene}
		>
			<p class="explorer-kicker">{pick(content.kicker)}</p>
			<h1 class="explorer-title">{pick(content.title)}</h1>
			<p class="explorer-lead">{pick(content.lead)}</p>
			<figure class="explorer-figure">
				<img
					src={content.figure.src}
					width={content.figure.width}
					height={content.figure.height}
					loading="lazy"
					decoding="async"
					alt={pick(content.figure.alt)}
				/>
			</figure>
			<nav
				class="explorer-tree-nav"
				aria-labelledby="explorer-components-title"
			>
				<h2
					class="explorer-section-label"
					id="explorer-components-title"
				>
					{pick(content.componentsLabel)}
				</h2>
				<ol class="explorer-tree">
					{#each content.children as item, index (item.id)}
						<ExplorerNode
							{item}
							depth={1}
							number={String(index + 1).padStart(2, '0')}
							{explorer}
						/>
					{/each}
				</ol>
			</nav>
			<div class="explorer-about">
				<h2 class="explorer-section-label">
					{pick(content.mission.title)}
				</h2>
				<p>{pick(content.mission.text)}</p>
			</div>
		</div>

		<footer class="explorer-credits">
			<p>
				<span>{text('missionCredit')}</span>
				<img
					src="/media/sron-logo.png"
					width="66"
					height="16"
					alt="SRON"
				/>
			</p>
			<p class="explorer-credits-link">
				<a href="https://nebulaxplorer.dev.fdnd.nl/" rel="noreferrer"
					>{text('mainWebsite')}</a
				>
			</p>
		</footer>
	</div>
</section>
