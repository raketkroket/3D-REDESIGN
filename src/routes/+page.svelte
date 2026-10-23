<script>
	import {
		PageNotices,
		SatelliteExplorer,
		SiteHeader,
		SkipLink,
		StatusMessage,
	} from '$lib/index.js'
	import { createExplorer } from '$lib/state/explorer.svelte.js'
	import { text } from '$lib/state/language.svelte.js'

	let { data } = $props()

	const explorer = createExplorer(data.explorerContent)
	const { state } = explorer
</script>

<SkipLink
	href="#explorer"
	label={text('skipLink')}
	onclick={explorer.skipToExplorer}
/>
<SiteHeader {explorer} />
<PageNotices fallback={state.fallback} />
<SatelliteExplorer {explorer} />
<StatusMessage message={state.announcement} />
