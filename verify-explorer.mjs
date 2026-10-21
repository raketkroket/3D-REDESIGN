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

const items = [...html.matchAll(articlePattern)].map(([, attributes, body]) => {
	const list =
		body.match(/<ol class="explorer-list">([\s\S]*?)<\/ol>/)?.[1] ?? ''
	return {
		id: attribute(attributes, 'id'),
		scene: attribute(attributes, 'data-scene'),
		component: attribute(attributes, 'data-component'),
		category: attribute(attributes, 'data-category'),
		categoryNl: attribute(attributes, 'data-category-nl'),
		hasTitle: /class="explorer-title"/.test(body),
		childIds: [...list.matchAll(/href="#([^"]+)"/g)].map(([, id]) => id),
	}
})

assert(items.length > 0, 'No explorer items found')
assert.equal(new Set(items.map((item) => item.id)).size, items.length)
const ids = new Set(items.map((item) => item.id))
const parents = new Map()
for (const item of items) {
	assert(item.hasTitle, `${item.id} has no title`)
	assert(item.category && item.categoryNl, `${item.id} needs EN/NL category`)
	assert(explorerScenes.includes(item.scene), `${item.id}: unknown scene`)
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
for (const item of items.slice(1))
	assert(parents.has(item.id), `${item.id} is not reachable`)
assert.deepEqual(
	tree.getPath('instrument-detectors').map((item) => item.id),
	[
		'satellite',
		'xray-instrument',
		'instrument-components',
		'instrument-detectors',
	],
)
assert.equal(tree.getNumber('xray-instrument'), '01')
assert.equal(tree.getNumber('solar-panel'), '07')
assert.equal(tree.getNumber('instrument-support'), '07')
assert.equal(tree.getChildren('satellite').length, satelliteComponents.length)
for (const component of satelliteComponents)
	assert(tree.find('satellite-component', component), component)
for (const component of instrumentComponents)
	assert(tree.find('instrument-component', component), component)

console.log(
	JSON.stringify({
		items: items.length,
		depth: Math.max(...items.map((item) => tree.getDepth(item.id))),
		satelliteComponents: tree.getChildren('satellite').length,
		instrumentComponents: tree.getChildren('instrument-components').length,
		checks: 'unique ids, single parent, reachable items, valid scene mapping, numbering, EN/NL categories',
	}),
)
