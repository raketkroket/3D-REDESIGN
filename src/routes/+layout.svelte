<script>
	import '$lib/styles/global.css'
	import favicon from '$lib/assets/favicon.svg'

	let { children } = $props()
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<title>NEBULA Xplorer satellite · SRON</title>
</svelte:head>

{@render children()}
