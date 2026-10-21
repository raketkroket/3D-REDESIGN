import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createExplorerTree } from './src/app/explorerTree.js'
import { explorerScenes } from './src/scene/explorerScene.js'
import { opticalComponents } from './src/scene/objects/OpticalComponents.js'
import { satelliteComponents } from './src/scene/objects/Satellite.js'

const instrumentComponents = [
	'detectors',
	'baffles',
	'electronics',
	'calibration',
	'structure',
	'mounts',
	'support',
]
const html = await fs.readFile(new URL('./index.html', import.meta.url), 'utf8')
const articlePattern =
	/<article\b([^>]*\bdata-explorer-item\b[^>]*)>([\s\S]*?)<\/article>/g
const attribute = (attributes, name) =>
	attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? null
const stripTags = (markup) => markup.replace(/<[^>]+>/g, '').trim()

const items = [...html.matchAll(articlePattern)].map(([, attributes, body]) => {
	const list =
		body.match(/<ol class="explorer-list">([\s\S]*?)<\/ol>/)?.[1] ?? ''
	const title = body.match(
		/<h(\d) class="explorer-title"[^>]*>([^<]*)<\/h\1>/,
	)
	const breadcrumb =
		body.match(
			/<nav class="explorer-item-breadcrumb"[^>]*>([\s\S]*?)<\/nav>/,
		)?.[1] ?? null
	return {
		id: attribute(attributes, 'id'),
		scene: attribute(attributes, 'data-scene'),
		component: attribute(attributes, 'data-component'),
		titleLevel: title ? Number(title[1]) : null,
		title: title?.[2].trim(),
		kicker: stripTags(
			body.match(
				/<p class="explorer-kicker"[^>]*>([\s\S]*?)<\/p>/,
			)?.[1] ?? '',
		),
		sectionLevels: [
			...body.matchAll(/<h(\d) class="explorer-section-label"/g),
		].map(([, level]) => Number(level)),
		links: [
			...list.matchAll(
				/<a href="#([^"]+)"><span class="explorer-list-number">(\d+)[\s\S]*?<\/span>[\s\S]*?(?:<span class="explorer-list-meta">(\d+))?[^<]*(?:<span class="visually-hidden"[^>]*>[^<]*<\/span><\/span>)?<\/a>/g,
			),
		].map(([, id, number, count]) => ({
			id,
			number,
			count: count ? Number(count) : 0,
		})),
		childIds: [...list.matchAll(/href="#([^"]+)"/g)].map(([, id]) => id),
		breadcrumbIds: breadcrumb
			? [...breadcrumb.matchAll(/href="#([^"]+)"/g)].map(([, id]) => id)
			: null,
		breadcrumbCurrent: breadcrumb
			? stripTags(
					breadcrumb.match(
						/<span aria-current="location"[^>]*>([^<]*)<\/span>/,
					)?.[1] ?? '',
				)
			: null,
		backId: body.match(/<p class="explorer-back"><a href="#([^"]+)"/)?.[1],
	}
})

assert(items.length > 0, 'No explorer items found')
assert.equal(new Set(items.map((item) => item.id)).size, items.length)
const ids = new Set(items.map((item) => item.id))
const parents = new Map()
for (const item of items) {
	assert(item.title, `${item.id} has no title`)
	assert(item.kicker, `${item.id} has no kicker`)
	assert(explorerScenes.includes(item.scene), `${item.id}: unknown scene`)
	assert.equal(item.links.length, item.childIds.length, `${item.id} links`)
	for (const childId of item.childIds) {
		assert(ids.has(childId), `${item.id} links to missing ${childId}`)
		assert(!parents.has(childId), `${childId} has more than one parent`)
		parents.set(childId, item.id)
	}
	if (item.scene === 'satellite-component')
		assert(satelliteComponents.includes(item.component), item.id)
	if (item.scene === 'instrument-component')
		assert(instrumentComponents.includes(item.component), item.id)
	if (item.scene === 'optical-component')
		assert(item.component in opticalComponents, item.id)
	if (item.scene === 'cad-part')
		assert(opticalComponents[item.component]?.cadPart, item.id)
}

const tree = createExplorerTree(items)
assert.equal(tree.rootId, 'satellite')
assert(!parents.has(tree.rootId))
for (const item of items) {
	const depth = tree.getDepth(item.id)
	const path = tree.getPath(item.id).map((pathItem) => pathItem.id)
	assert.equal(item.titleLevel, Math.min(depth + 1, 6), `${item.id} heading`)
	for (const level of item.sectionLevels)
		assert.equal(
			level,
			Math.min(depth + 2, 6),
			`${item.id} section heading`,
		)
	item.links.forEach((link, index) => {
		assert.equal(link.number, String(index + 1).padStart(2, '0'), link.id)
		assert.equal(link.count, tree.getChildren(link.id).length, link.id)
	})
	if (item.id === tree.rootId) {
		assert.equal(item.breadcrumbIds, null)
		continue
	}
	assert(parents.has(item.id), `${item.id} is not reachable`)
	assert(item.kicker.endsWith(tree.getNumber(item.id)), `${item.id} kicker`)
	assert.deepEqual(item.breadcrumbIds, path.slice(0, -1), `${item.id} path`)
	assert.equal(item.breadcrumbCurrent, item.title, `${item.id} current`)
	assert.equal(item.backId, parents.get(item.id), `${item.id} back link`)
}
assert.deepEqual(
	tree.getPath('instrument-detectors').map((item) => item.id),
	[
		'satellite',
		'xray-instrument',
		'instrument-components',
		'instrument-detectors',
	],
)
assert.equal(tree.getChildren('satellite').length, satelliteComponents.length)
for (const component of satelliteComponents)
	assert(tree.find('satellite-component', component), component)
for (const component of instrumentComponents)
	assert(tree.find('instrument-component', component), component)
assert(/role="status"[^>]*data-explorer-status/.test(html), 'status region')

console.log(
	JSON.stringify({
		items: items.length,
		depth: Math.max(...items.map((item) => tree.getDepth(item.id))),
		satelliteComponents: tree.getChildren('satellite').length,
		instrumentComponents: tree.getChildren('instrument-components').length,
		checks: 'unique ids, single parent, reachable items, scene mapping, heading levels, list numbers and counts, kicker numbers, breadcrumbs, back links, status region',
	}),
)
