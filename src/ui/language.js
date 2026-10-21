const interfaceCopy = {
	en: {
		exploreSatellite: 'Explore satellite',
		closeExplorer: 'Close explorer',
		expandExplorer: 'Show more',
		collapseExplorer: 'Show less',
		breadcrumb: 'Breadcrumb',
		pauseRotation: 'Pause rotation',
		resumeRotation: 'Resume rotation',
		outerPanels: 'Outer panels',
		resetView: 'Reset view',
		pauseRays: 'Pause X-rays',
		playRays: 'Play X-rays',
		hintPointer: 'Drag to rotate · Scroll to zoom',
		hintTouch: 'Drag · Pinch',
		loading: 'Loading 3D model…',
		loadError: 'This 3D view could not be loaded.',
		schematic: 'Schematic · not to scale',
		cadPart: 'Supplied CAD part',
		showFullPath: 'Show full path',
		selected: 'selected',
		fallback:
			'The interactive 3D model is not available on this device. All satellite information is available below.',
	},
	nl: {
		exploreSatellite: 'Verken satelliet',
		closeExplorer: 'Verkenner sluiten',
		expandExplorer: 'Meer tonen',
		collapseExplorer: 'Minder tonen',
		breadcrumb: 'Kruimelpad',
		pauseRotation: 'Draaien pauzeren',
		resumeRotation: 'Draaien hervatten',
		outerPanels: 'Buitenpanelen',
		resetView: 'Beeld herstellen',
		pauseRays: 'Röntgenstralen pauzeren',
		playRays: 'Röntgenstralen afspelen',
		hintPointer: 'Sleep om te draaien · Scroll om te zoomen',
		hintTouch: 'Slepen · Knijpen',
		loading: '3D-model laden…',
		loadError: 'Deze 3D-weergave kon niet worden geladen.',
		schematic: 'Schematisch · niet op schaal',
		cadPart: 'Aangeleverd CAD-onderdeel',
		showFullPath: 'Volledig pad tonen',
		selected: 'geselecteerd',
		fallback:
			'Het interactieve 3D-model is niet beschikbaar op dit apparaat. Alle informatie over de satelliet staat hieronder.',
	},
}

const storageKey = 'nebula-xplorer-language'

function readStoredLanguage() {
	try {
		return localStorage.getItem(storageKey)
	} catch {
		return null
	}
}

function storeLanguage(language) {
	try {
		localStorage.setItem(storageKey, language)
	} catch {}
}

export function createLanguage(dom) {
	const translatableElements = [
		...document.querySelectorAll('[data-i18n-nl]'),
	]
	const englishCopy = new Map(
		translatableElements.map((element) => [element, element.textContent]),
	)
	const labelledElements = [
		...document.querySelectorAll('[data-i18n-nl-label]'),
	]
	const englishLabels = new Map(
		labelledElements.map((element) => [
			element,
			element.getAttribute('aria-label'),
		]),
	)
	const altElements = [...document.querySelectorAll('[data-i18n-nl-alt]')]
	const englishAlts = new Map(
		altElements.map((element) => [element, element.alt]),
	)
	const listeners = new Set()
	let language = 'en'

	function setLanguage(nextLanguage, { store = true } = {}) {
		language = nextLanguage === 'nl' ? 'nl' : 'en'
		document.documentElement.lang = language
		for (const element of translatableElements)
			element.textContent =
				language === 'nl'
					? element.dataset.i18nNl
					: englishCopy.get(element)
		for (const element of labelledElements)
			element.setAttribute(
				'aria-label',
				language === 'nl'
					? element.dataset.i18nNlLabel
					: englishLabels.get(element),
			)
		for (const element of altElements)
			element.alt =
				language === 'nl'
					? element.dataset.i18nNlAlt
					: englishAlts.get(element)
		for (const button of dom.languageButtons)
			button.setAttribute(
				'aria-pressed',
				String(button.dataset.language === language),
			)
		if (store) storeLanguage(language)
		for (const listener of listeners) listener(language)
	}

	for (const button of dom.languageButtons)
		button.addEventListener('click', () =>
			setLanguage(button.dataset.language),
		)

	const storedLanguage = readStoredLanguage()
	if (storedLanguage === 'nl') setLanguage('nl', { store: false })

	return {
		setLanguage,
		getLanguage: () => language,
		onChange: (listener) => listeners.add(listener),
		text: (key) => interfaceCopy[language][key] ?? interfaceCopy.en[key],
		attribute(element, name) {
			const translatedName = `${name}Nl`
			return language === 'nl' && element.dataset[translatedName]
				? element.dataset[translatedName]
				: (element.dataset[name] ?? '')
		},
	}
}
