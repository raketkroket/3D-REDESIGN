const collapsedBreadcrumbLength = 4
const comfortableOffset = 12
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function createElement(tagName, className, text) {
	const element = document.createElement(tagName)
	if (className) element.className = className
	if (text !== undefined) element.textContent = text
	return element
}

export function createExplorerPanel(dom, tree, language) {
	const nodes = new Map(
		dom.items
			.filter((element) => element.id !== tree.rootId)
			.map((element) => [
				element.id,
				{
					element,
					link: element.querySelector(
						':scope > .explorer-node-heading a',
					),
					body: element.querySelector(':scope > .explorer-node-body'),
				},
			]),
	)
	const rootElement = dom.items.find((element) => element.id === tree.rootId)
	let selectedId = tree.rootId
	let breadcrumbExpanded = false
	let scrollTimeout = null

	for (const { element, link, body } of nodes.values()) {
		link.setAttribute('aria-controls', body.id)
		link.setAttribute('aria-expanded', 'false')
		body.inert = true
		element.classList.remove('is-expanded')
	}

	function getTitle(id) {
		if (id === tree.rootId) {
			return (
				language.attribute(rootElement, 'shortLabel') ||
				rootElement.querySelector('.explorer-title').textContent.trim()
			)
		}
		return getFullTitle(id)
	}

	function getFullTitle(id) {
		if (id === tree.rootId)
			return rootElement
				.querySelector('.explorer-title')
				.textContent.trim()
		return (
			nodes
				.get(id)
				?.element.querySelector(
					':scope > .explorer-node-heading .explorer-node-title',
				)
				?.textContent.trim() ?? ''
		)
	}

	function setExpanded(id, expanded) {
		const node = nodes.get(id)
		if (
			!node ||
			node.element.classList.contains('is-expanded') === expanded
		)
			return
		node.element.classList.toggle('is-expanded', expanded)
		node.link.setAttribute('aria-expanded', String(expanded))
		node.body.inert = !expanded
	}

	function renderBreadcrumb(id) {
		const path = tree.getPath(id)
		const collapse =
			!breadcrumbExpanded && path.length > collapsedBreadcrumbLength
		const visible = collapse ? [path[0], null, ...path.slice(-2)] : path
		dom.breadcrumb.setAttribute('aria-label', language.text('breadcrumb'))
		dom.breadcrumbList.replaceChildren(
			...visible.map((item) => {
				const listItem = createElement('li')
				if (!item) {
					const button = createElement(
						'button',
						'explorer-breadcrumb-more',
						'…',
					)
					button.type = 'button'
					button.setAttribute(
						'aria-label',
						`${language.text('showFullPath')}: ${path
							.slice(1, -2)
							.map((hiddenItem) => getTitle(hiddenItem.id))
							.join(', ')}`,
					)
					button.addEventListener('click', () => {
						breadcrumbExpanded = true
						renderBreadcrumb(selectedId)
					})
					listItem.append(button)
					return listItem
				}
				if (item.id === id) {
					const current = createElement(
						'span',
						null,
						getTitle(item.id),
					)
					current.setAttribute('aria-current', 'location')
					listItem.append(current)
				} else {
					const link = createElement('a', null, getTitle(item.id))
					link.href = `#${item.id}`
					listItem.append(link)
				}
				return listItem
			}),
		)
		dom.currentNumber.textContent = tree.getNumber(id) ?? ''
		dom.currentTitle.textContent = getFullTitle(id)
	}

	function scrollToNode(id, { smooth = true } = {}) {
		clearTimeout(scrollTimeout)
		const node = nodes.get(id)
		const container = dom.explorerScroll
		const behavior = smooth && !reduceMotion.matches ? 'smooth' : 'auto'
		const scroll = () => {
			if (!node) {
				container.scrollTo({ top: 0, behavior })
				return
			}
			const containerTop = container.getBoundingClientRect().top
			const rowTop =
				node.link.getBoundingClientRect().top -
				containerTop +
				container.scrollTop
			const comfortableBottom =
				container.scrollTop + container.clientHeight * 0.4
			if (
				rowTop >= container.scrollTop + comfortableOffset &&
				rowTop <= comfortableBottom
			)
				return
			container.scrollTo({
				top: Math.max(0, rowTop - comfortableOffset),
				behavior,
			})
		}
		scrollTimeout = setTimeout(
			scroll,
			smooth && !reduceMotion.matches ? 280 : 0,
		)
	}

	function select(
		id,
		{ collapsed = false, scroll = true, smooth = true } = {},
	) {
		if (id !== selectedId) breadcrumbExpanded = false
		selectedId = id
		const path = new Set(tree.getPath(id).map((item) => item.id))
		for (const [nodeId, node] of nodes) {
			const isSelected = nodeId === id
			setExpanded(nodeId, path.has(nodeId) && !(isSelected && collapsed))
			node.element.classList.toggle('is-selected', isSelected)
			node.element.classList.toggle(
				'is-in-path',
				path.has(nodeId) && !isSelected,
			)
			if (isSelected) node.link.setAttribute('aria-current', 'true')
			else node.link.removeAttribute('aria-current')
		}
		renderBreadcrumb(id)
		if (scroll) scrollToNode(id, { smooth })
	}

	function isExpanded(id) {
		return Boolean(nodes.get(id)?.element.classList.contains('is-expanded'))
	}

	function setPreview(id) {
		for (const { element, link } of nodes.values())
			link.classList.toggle('is-previewed', element.id === id)
	}

	function focusItem(id) {
		const node = nodes.get(id)
		if (node) {
			node.link.focus({ preventScroll: true })
			return
		}
		const title = rootElement.querySelector('.explorer-title')
		title.tabIndex = -1
		title.focus({ preventScroll: true })
	}

	language.onChange(() => renderBreadcrumb(selectedId))

	return {
		focusItem,
		getFullTitle,
		getTitle,
		isExpanded,
		scrollToNode,
		select,
		setPreview,
	}
}
