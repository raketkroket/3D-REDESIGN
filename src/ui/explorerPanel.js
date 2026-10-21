const collapsedBreadcrumbLength = 4

function createElement(tagName, className, text) {
	const element = document.createElement(tagName)
	if (className) element.className = className
	if (text !== undefined) element.textContent = text
	return element
}

export function createExplorerPanel(dom, tree, language) {
	const itemElements = new Map(
		dom.items.map((element) => [element.id, element]),
	)
	let currentId = tree.rootId
	let breadcrumbExpanded = false

	function getItemElement(id) {
		return itemElements.get(id) ?? null
	}

	function getTitle(id) {
		const element = getItemElement(id)
		if (!element) return ''
		const shortLabel = language.attribute(element, 'shortLabel')
		return (
			shortLabel ||
			element.querySelector('.explorer-title')?.textContent.trim() ||
			''
		)
	}

	function getFullTitle(id) {
		return (
			getItemElement(id)
				?.querySelector('.explorer-title')
				?.textContent.trim() ?? ''
		)
	}

	function renderKicker(id) {
		const element = getItemElement(id)
		const kicker = element?.querySelector('.explorer-kicker')
		if (!kicker) return
		const category = language.attribute(element, 'category')
		const number = tree.getNumber(id)
		kicker.textContent = number ? `${category} ${number}` : category
	}

	function renderChildMeta(id) {
		const element = getItemElement(id)
		for (const link of element?.querySelectorAll('.explorer-list a') ??
			[]) {
			const childCount = tree.getChildren(link.hash.slice(1)).length
			let meta = link.querySelector('.explorer-list-meta')
			if (!childCount) {
				meta?.remove()
				link.classList.remove('has-children')
				continue
			}
			if (!meta) {
				meta = createElement('span', 'explorer-list-meta')
				link.append(meta)
			}
			link.classList.add('has-children')
			meta.replaceChildren(
				String(childCount),
				createElement(
					'span',
					'visually-hidden',
					` ${language.text('inside')}`,
				),
			)
		}
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
						path
							.slice(1, -2)
							.map((hiddenItem) => getTitle(hiddenItem.id))
							.join(' / '),
					)
					button.addEventListener('click', () => {
						breadcrumbExpanded = true
						renderBreadcrumb(currentId)
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
	}

	function renderPagerLink(item, direction) {
		const link = createElement('a', `explorer-pager-${direction}`)
		link.href = `#${item.id}`
		link.append(
			createElement(
				'span',
				'explorer-pager-number',
				tree.getNumber(item.id),
			),
			createElement(
				'span',
				'explorer-pager-label',
				getFullTitle(item.id),
			),
		)
		return link
	}

	function renderPager(id) {
		const siblings = tree.getSiblings(id)
		if (siblings.length < 2) {
			dom.pager.hidden = true
			dom.pager.replaceChildren()
			return
		}
		const index = tree.getIndex(id)
		const previous =
			siblings[(index - 1 + siblings.length) % siblings.length]
		const next = siblings[(index + 1) % siblings.length]
		dom.pager.hidden = false
		dom.pager.setAttribute('aria-label', language.text('pager'))
		dom.pager.replaceChildren(
			renderPagerLink(previous, 'previous'),
			renderPagerLink(next, 'next'),
		)
	}

	function render(id) {
		renderKicker(id)
		renderChildMeta(id)
		renderBreadcrumb(id)
		renderPager(id)
	}

	function showItem(id, { direction = 'none' } = {}) {
		const element = getItemElement(id)
		if (!element) return
		if (id !== currentId) breadcrumbExpanded = false
		currentId = id
		for (const [itemId, itemElement] of itemElements)
			itemElement.hidden = itemId !== id
		element.classList.remove('is-entering-forward', 'is-entering-back')
		if (direction !== 'none') {
			void element.offsetWidth
			element.classList.add(`is-entering-${direction}`)
		}
		render(id)
		dom.explorerScroll.scrollTop = 0
	}

	function setPreview(id) {
		for (const link of dom.explorer.querySelectorAll('.explorer-list a'))
			link.classList.toggle('is-previewed', link.hash === `#${id}`)
	}

	function focusTitle() {
		const title =
			getItemElement(currentId)?.querySelector('.explorer-title')
		if (!title) return
		title.tabIndex = -1
		title.focus({ preventScroll: true })
	}

	language.onChange(() => render(currentId))

	return {
		focusTitle,
		getFullTitle,
		getTitle,
		setPreview,
		showItem,
	}
}
