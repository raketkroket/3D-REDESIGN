<script>
	import ExplorerNode from './ExplorerNode.svelte'
	import { pick, text } from './language.svelte.js'

	let { item, depth, number, explorer } = $props()

	const state = $derived(explorer.state)
	const path = $derived(explorer.getPath(state.selectedId))
	const selected = $derived(state.selectedId === item.id)
	const expanded = $derived(
		path.has(item.id) && !(selected && state.selectedCollapsed),
	)
	const headingLevel = $derived(`h${Math.min(depth + 2, 6)}`)
</script>

<li
	class="explorer-node"
	class:is-expanded={state.enhanced && expanded}
	class:is-selected={state.enhanced && selected}
	class:is-in-path={state.enhanced && path.has(item.id) && !selected}
	id={item.id}
	data-explorer-item
	data-scene={item.scene}
	data-component={item.component}
>
	<svelte:element this={headingLevel} class="explorer-node-heading"
		><a
			class="explorer-node-link"
			class:is-previewed={state.previewId === item.id}
			href="#{item.id}"
			aria-controls={state.enhanced ? `${item.id}-content` : undefined}
			aria-expanded={state.enhanced ? String(expanded) : undefined}
			aria-current={state.enhanced && selected ? 'true' : undefined}
			><span class="explorer-list-number"
				>{number}<span class="visually-hidden">,</span></span
			>
			<span class="explorer-node-title">{pick(item.title)}</span
			>{#if item.children.length}<span class="explorer-list-meta"
					>{item.children.length}<span class="visually-hidden"
						>{text('itemsInside')}</span
					></span
				>{/if}</a
		></svelte:element
	>
	<div
		class="explorer-node-body"
		id="{item.id}-content"
		inert={state.enhanced && !expanded}
	>
		<div class="explorer-node-content">
			{#each item.blocks as block, index (index)}
				{#if block.kind === 'lead'}
					<p class="explorer-lead">{pick(block.text)}</p>
				{:else if block.kind === 'note'}
					<p class="explorer-note">{pick(block.text)}</p>
				{:else}
					<div class="explorer-about">
						{#each block.paragraphs as paragraph, paragraphIndex (paragraphIndex)}
							<p>{pick(paragraph)}</p>
						{/each}
					</div>
				{/if}
			{/each}
			{#if item.children.length}
				<ol class="explorer-tree">
					{#each item.children as child, index (child.id)}
						<ExplorerNode
							item={child}
							depth={depth + 1}
							number={String(index + 1).padStart(2, '0')}
							{explorer}
						/>
					{/each}
				</ol>
			{/if}
		</div>
	</div>
</li>
