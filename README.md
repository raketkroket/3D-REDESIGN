# Nebula Xplorer Satellite

As part of the FDND program, we participated in the Hackathon 2026.
Our team consisted of Melissa, Iris, Nayome, and Viresh.

<img width="750" height="500" alt="cover" src="https://github.com/user-attachments/assets/20c9b7d8-5c4b-47cc-bf32-4f2f1568ad0b" />

[bekijk de website](https://xplorersatellite.netlify.app/)

### Project Overview

Our idea was to create an interactive satellite experience that guides users step by step through the different components of a satellite. The goal is to help users understand:

- What each component is
- What it does
- Why it is important

We aimed to make the experience informative, interactive, and engaging for users.

### Technology

To bring this concept to life, we used:

Three.js for the 3D interactive experience
Vite for fast development and performance
Goal

The main goal of this project is to make complex space technology more accessible and enjoyable by combining education with interactive design.


https://github.com/user-attachments/assets/48dab2d1-1ea3-45cf-8552-8d4928064c60


### Process

We started with research and inspiration. After several team discussions, we defined our concept and began designing the experience.
Once the design direction was clear, we divided the project into different features. Each team member took ownership of specific parts and worked on developing them.
For a more detailed overview of our process, you can visit our project board, issues and website

## Satellite explorer

The page opens on a fullscreen 3D model of the satellite. **Explore satellite** opens the explorer: a panel on the left on desktop, a bottom sheet with peek and expanded states on mobile. The page itself never scrolls; only the explorer content does.

The explorer is one continuous, nested list. Selecting an item expands it in place, showing its description and its own numbered parts underneath, while its parents stay visible:

```
01 X-Ray Instrument
   01 Instrument components
      01 Detector modules … 07 Support panel
   02 Optics
      01 Mirror and X-ray path
         01 Primary mirror … 06 X-ray path
      02 Individual CAD parts
02 Star Tracker Module
…
07 Solar Panel
```

Only the path to the selected item is expanded, so the list never turns into a long accordion; the selection scrolls into a comfortable position. Selecting the selected item again collapses it. The breadcrumb at the top of the panel is orientation and a shortcut, not the main way to move around.

There is one explorer state: the selected item. It determines the expanded path, the breadcrumb, the URL hash, camera framing, highlight, cutaway, which model is shown (satellite, detailed instrument, schematic or CAD part), the numbered markers and the contextual controls. Selecting an item in the explorer, clicking a marker or clicking the model produces the same state. On mobile the sheet collapses to peek after selecting an item without parts, so the camera movement is visible.

### Progressive enhancement and accessibility

All content lives in `index.html` as one nested semantic list: every item is an `<li data-explorer-item>` with a heading containing a real link, a body with its confirmed description, and a nested `<ol>` of its parts. Without JavaScript or WebGL the page is a normal, fully expanded scrolling document with the same hierarchy, numbering and links. Every item is deep-linkable through its id, for example `/#instrument-detectors`.

With JavaScript the same HTML becomes the explorer, and the 3D model enhances it:

- item links expose `aria-expanded` and `aria-controls`; collapsed parts are inert, so they are skipped by keyboard and screen readers
- the selected item is marked with `aria-current`, and selections are announced through a status message ("05, Sun Sensor, selected")
- the canvas is a single labelled image; the numbered markers on the model are hidden from assistive technology because the matching links carry the same action
- Escape moves up one level inside the explorer and closes it at the top level
- controls expose their state (`aria-expanded`, `aria-pressed`) and change their label where the action changes
- `prefers-reduced-motion` removes camera flights, the ambient orbit, expand animations and the X-ray animation

Only confirmed content is shown. An item without a confirmed description simply has no description paragraph; there are no placeholder texts.

### Camera behaviour

Selecting an item flies the camera to a good viewing angle for it. After the flight a slow, eased orbit continues around the selected component within a per-item range (narrower for the X-ray cutaway, none for the optics schematic). Dragging takes over immediately; the orbit resumes after a few seconds of inactivity. **Pause rotation** stops it.

### Adding or removing an item

1. Add or remove an `<li class="explorer-node" data-explorer-item>` in its parent's `.explorer-tree` with a unique `id`, `data-scene` (plus `data-component` where needed), a heading one level below its parent containing the numbered link, and a `.explorer-node-body`. Copy a sibling as a template.
2. Update the numbers of the following siblings and the parent's child count.
3. Run `node verify-explorer.mjs`. It reports any mismatch in nesting, numbers, counts, heading levels or scene mapping.

Supported scenes: `satellite`, `satellite-component`, `instrument`, `instrument-component`, `optics`, `optical-path`, `optical-component`, `cad-parts`, `cad-part`. Satellite component ids are defined in `src/scene/objects/Satellite.js`; instrument part ids in `src/scene/objects/InstrumentComponents.js`.

### Responsive design

Layout follows the available space: a bottom sheet below 720 px, a side panel from 720 px, and a docked layout on dual-screen devices (Viewport Segments API, as progressive enhancement). Components adapt with container queries, and the explorer respects reduced motion, reduced transparency, increased contrast, forced colours and reduced data. See [`docs/responsive-design.md`](docs/responsive-design.md) for the tests, decisions and remaining work.

## Project structure

See `CONVENTIONS.md`.

- `src/app/` – explorer tree and viewer state
- `src/ui/` – DOM bindings, explorer panel, markers, viewer controls and language
- `src/scene/` – renderer, camera, lighting, explorer scene logic and scene objects
- `src/assets/models/` – `satellite/` and `instrument/` hold the runtime viewer GLBs, `cad/` the individual CAD parts and `source/` the source models used to build them

## Replacing supplied CAD models

The viewer loads `src/assets/models/satellite/Satellite.viewer.glb` and `src/assets/models/instrument/Instrument.viewer.glb`. They are generated from the source-colour GLBs in `src/assets/models/source/` by the **Build viewer assets** workflow (`scripts/optimize-model.mjs`). Keep the source file names to preserve loading and interaction.

The satellite importer maps the component ids `xrayInstrument`, `starTrackerModule`, `dawn4UCubeDrive`, `sBandAntenna`, `sunSensor`, `magnetorquers` and `solarPanel` from the CAD hierarchy in `src/scene/objects/Satellite.js`. Keep the corresponding group-name prefixes in the export, or update that mapping after verifying click selection.

## Development and checks

```sh
npm install
npm run dev
```

Before committing:

```sh
npm run build
npm run format:check
npm run verify
```

`npm run verify` runs every verification script: viewer assets, models, optics, performance, motion detail, CAD transforms, the explorer hierarchy and the camera orbit.
