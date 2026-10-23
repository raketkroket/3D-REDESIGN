<script>
	import '../style.css'
	import favicon from '../assets/favicon.svg'

	let { children } = $props()
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<title>NEBULA Xplorer satellite · SRON</title>
</svelte:head>

{@render children()}
