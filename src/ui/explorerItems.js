export function readExplorerItems(itemElements) {
	return itemElements.map((element) => ({
		id: element.id,
		scene: element.dataset.scene,
		component: element.dataset.component ?? null,
		childIds: [
			...element.querySelectorAll(
				':scope .explorer-list > li > a[href^="#"]',
			),
		].map((link) => link.hash.slice(1)),
	}))
}
