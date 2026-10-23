<script>
	import { language, setLanguage, text } from './language.svelte.js'

	let { explorer } = $props()

	function goHome(event) {
		if (!explorer.state.enhanced) return
		event.preventDefault()
		explorer.navigate(explorer.tree.rootId, { source: 'breadcrumb' })
	}
</script>

<header class="site-header">
	<a class="brand" href="#satellite" data-explorer-home onclick={goHome}>
		<img
			class="brand-logo"
			src="/media/sron-logo.png"
			width="115"
			height="28"
			alt="SRON"
		/>
		<span class="brand-divider" aria-hidden="true"></span>
		<span class="brand-product">NEBULA Xplorer</span>
	</a>
	<nav class="site-navigation" aria-label="Site">
		<a href="https://nebulaxplorer.dev.fdnd.nl/" rel="noreferrer"
			>{text('mainWebsite')}</a
		>
	</nav>
	<div class="language-switcher" role="group" aria-label="Language / Taal">
		<button
			type="button"
			data-language="nl"
			aria-pressed={String(language.current === 'nl')}
			lang="nl"
			onclick={() => setLanguage('nl')}>NL</button
		>
		<button
			type="button"
			data-language="en"
			aria-pressed={String(language.current === 'en')}
			lang="en"
			onclick={() => setLanguage('en')}>EN</button
		>
	</div>
</header>
