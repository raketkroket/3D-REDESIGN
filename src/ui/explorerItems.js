function getChildList(element) {
	return [...element.querySelectorAll('.explorer-tree')].find(
		(list) =>
			list.parentElement.closest('[data-explorer-item]') === element,
	)
}

export function readExplorerItems(itemElements) {
	return itemElements.map((element) => ({
		id: element.id,
		scene: element.dataset.scene,
		component: element.dataset.component ?? null,
		childIds: [
			...(getChildList(element)?.querySelectorAll(
				':scope > li[data-explorer-item]',
			) ?? []),
		].map((child) => child.id),
	}))
}
