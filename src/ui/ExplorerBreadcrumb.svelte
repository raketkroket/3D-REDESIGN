<script>
	import { text } from './language.svelte.js'

	let { explorer } = $props()

	const collapsedBreadcrumbLength = 4
	const state = $derived(explorer.state)
	const path = $derived(explorer.tree.getPath(state.selectedId))
	const collapsed = $derived(
		!state.breadcrumbExpanded && path.length > collapsedBreadcrumbLength,
	)
	const visibleItems = $derived(
		collapsed ? [path[0], null, ...path.slice(-2)] : path,
	)
	const hiddenTitles = $derived(
		path
			.slice(1, -2)
			.map((item) => explorer.getTitle(item.id))
			.join(', '),
	)
</script>

<nav class="explorer-breadcrumb" aria-label={text('breadcrumb')}>
	<ol>
		{#if state.enhanced}
			{#each visibleItems as item, index (item?.id ?? `more-${index}`)}
				<li>
					{#if !item}
						<button
							type="button"
							class="explorer-breadcrumb-more"
							aria-label="{text('showFullPath')}: {hiddenTitles}"
							onclick={() => (state.breadcrumbExpanded = true)}
							>…</button
						>
					{:else if item.id === state.selectedId}
						<span aria-current="location"
							>{explorer.getTitle(item.id)}</span
						>
					{:else}
						<a href="#{item.id}">{explorer.getTitle(item.id)}</a>
					{/if}
				</li>
			{/each}
		{/if}
	</ol>
</nav>
