# Project Conventions

We follow the FDND agency conventions and our team agreements in [`CONTRIBUTING.md`](CONTRIBUTING.md). This file adds the technical conventions that are specific to this project.

## General

- Group files by responsibility:
  - `src/routes/` contains the page: `+page.server.js` loads the explorer content and `+page.svelte` composes the page from components only.
  - `src/lib/atoms/`, `src/lib/molecules/` and `src/lib/organisms/` contain the Svelte components, following atomic design. `src/lib/index.js` exports them.
  - `src/lib/state/` contains the explorer tree, navigation and panel state, viewer state and language.
  - `src/lib/server/` contains the explorer content (`explorerContent.js`). It is only loaded on the server.
  - `src/lib/scene/` contains Three.js setup, rendering, controls, lighting, camera behavior, scene objects, the markers and the viewer controller that connects the state to the scene.
  - `src/lib/styles/global.css` contains the styles.
  - `src/lib/assets/` contains application assets. Organize models under `src/lib/assets/models/` by role: `cad/`, `satellite/`, `instrument/`, or `source/`.
  - `scripts/` contains development and asset-processing scripts, not model binaries.
- Navigation and panel state live in `src/lib/state/explorer.svelte.js`; the connection between that state and the 3D scene lives in `src/lib/scene/viewerController.js`. Put reusable behavior in the module that owns that responsibility.
- Keep explorer content in `src/lib/server/explorerContent.js`, never as hard-coded markup in a component.
- Keep application state separate from DOM bindings and UI updates.
- Load optional view code and model assets on demand when they are only needed after a view is selected.
- Preserve existing behavior when moving or reorganizing files, and update all imports and asset paths affected by the move.
- Before completing JavaScript or model-path changes, run the production build and relevant verification scripts. The full project checks are:

  ```sh
  npm run build
  npm run format:check
  npm run verify
  ```

## JavaScript

### Formatting

Follow `.prettierrc.json`:

- Use single quotes.
- Omit optional statement-ending semicolons.
- Indent with tabs; the configured tab width is 4.
- Give statements room; do not place multiple instructions on one line.

Check formatting with:

```sh
npm run format:check
```

### Structure and naming

- Use descriptive, domain-specific names such as `viewerState`, `createViewerState`, `createDomBindings`, and `setViewerMode`.
- Use `camelCase` for variables and functions.
- Name functions for their action or result, following established verbs such as `create`, `load`, `show`, `update`, `set`, `get`, and `bind`.
- Keep functions focused on one responsibility; avoid adding unrelated work to the main orchestration module.
- Use `viewer` terminology for implementation identifiers and selectors. Reserve “experience” for ordinary user-facing prose.
- Use comments only to explain complicated code, as described in the FDND conventions.

### Assets and loading

- Store GLB files under `src/lib/assets/models/`, categorized by their role; do not put model binaries in `scripts/`.
- Resolve bundled model assets relative to the importing module with `new URL(path, import.meta.url)`.
- Use dynamic imports and asynchronous model loaders for optional modules and assets that are only needed after a view is selected.

## Svelte

- Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`). Shared reactive state lives in `*.svelte.js` modules in `src/lib/state/`.
- Name components in `PascalCase` (`ExplorerNode.svelte`), keep one responsibility per component and pass only the data a component needs. Use object destructuring to keep templates clean.
- Import from `$lib` (configured as an alias in `vite.config.js`, because SvelteKit 3 replaced it with `#lib`).
- `ExplorerNode` renders itself for every level of the explorer tree, so it is the one component that nests deeper than three levels.
- Render every piece of content on the server, so the prerendered page works without JavaScript. Browser-only code (the renderer, `window`, `localStorage`) runs in `onMount` or in modules that are imported from it.
- Keep Three.js code in `src/lib/scene/` free of Svelte, so it can be tested with the verification scripts in Node.
- Prettier formats `.svelte` files with `prettier-plugin-svelte` using the same settings.
