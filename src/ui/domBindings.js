export function createDomBindings() {
	const explorer = document.querySelector('.explorer')
	const viewer = document.querySelector('.viewer')
	return {
		root: document.documentElement,
		viewer,
		canvas: document.querySelector('#app'),
		explorer,
		skipLink: document.querySelector('.skip-link'),
		explorerToggle: document.querySelector('.explorer-toggle'),
		explorerToggleLabel: document.querySelector('.explorer-toggle-label'),
		explorerBar: explorer.querySelector('.explorer-bar'),
		explorerGrabber: explorer.querySelector('.explorer-grabber'),
		explorerClose: explorer.querySelector('.explorer-close'),
		explorerScroll: explorer.querySelector('.explorer-scroll'),
		breadcrumb: explorer.querySelector('.explorer-breadcrumb'),
		breadcrumbList: explorer.querySelector('.explorer-breadcrumb ol'),
		currentNumber: explorer.querySelector('.explorer-current-number'),
		currentTitle: explorer.querySelector('.explorer-current-title'),
		items: [...explorer.querySelectorAll('[data-explorer-item]')],
		markers: viewer.querySelector('.viewer-markers'),
		visibleArea: viewer.querySelector('.viewer-visible-area'),
		viewerPoster: viewer.querySelector('.viewer-poster'),
		loadModelButton: viewer.querySelector('.viewer-load-model'),
		viewerLabel: viewer.querySelector('.viewer-label'),
		viewerLabelNumber: viewer.querySelector('.viewer-label-number'),
		viewerLabelName: viewer.querySelector('.viewer-label-name'),
		viewerTag: viewer.querySelector('.viewer-tag'),
		viewerStatus: viewer.querySelector('.viewer-status'),
		viewerHint: viewer.querySelector('.viewer-hint'),
		controls: Object.fromEntries(
			[...viewer.querySelectorAll('[data-control]')].map((button) => [
				button.dataset.control,
				button,
			]),
		),
		languageButtons: [...document.querySelectorAll('[data-language]')],
		status: document.querySelector('[data-explorer-status]'),
		fallbackNotice: document.querySelector('[data-fallback-notice]'),
	}
}
