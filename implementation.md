# Implementation Plan: APIatomy

APIatomy is a client-side OpenAPI visual explorer that turns OpenAPI 3.x and Swagger 2.0 specifications (YAML/JSON) into interactive endpoint explorers, recursive schema viewers, and dynamic topology graphs.

## Proposed Architecture & Structure

```
APIatomy/
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD: build & deploy Vite static site to GitHub Pages
├── src/
│   ├── model/                   # Normalized internal data types
│   │   ├── index.ts             # ApiSpec, Endpoint, Parameter, RequestBody, ApiResponse, SchemaNode, Diagnostic
│   │   └── httpMethods.ts       # Method badge colors, tags, standard HTTP statuses
│   ├── parser/                  # Client-side ingestion & resolution
│   │   ├── yamlJson.ts          # Safe YAML / JSON parser with line mapping
│   │   ├── swaggerConverter.ts  # Swagger 2.0 to OpenAPI 3.0 converter
│   │   ├── refResolver.ts       # $ref resolver with RFC 6901, circular detection and basePath scoped external nested refs
│   │   ├── fileMap.ts           # In-memory multi-file map shared to Worker for external refs
│   │   ├── normalizer.ts        # Maps OpenAPI/Swagger AST to internal ApiSpec model
│   │   ├── validator.ts         # Diagnostics generator (unused schemas, missing docs, etc.)
│   │   └── index.ts             # Main parser entrypoint
│   ├── layout/                  # Graph & view layout calculation
│   │   └── graphLayout.ts       # Dagre-based auto-layout for React Flow nodes & edges
│   ├── graph/                   # React Flow topology canvas
│   │   ├── TopologyGraph.tsx    # React Flow canvas with pan, zoom, minimap, controls
│   │   ├── EndpointNode.tsx     # Custom node for HTTP endpoints (color-coded badges)
│   │   ├── SchemaNode.tsx       # Custom node for schemas with reuse indicator
│   │   ├── CustomEdge.tsx       # Custom animated/labeled relationship edge
│   │   └── exportPng.ts         # PNG export helper via html-to-image
│   ├── workers/                 # Web Workers for heavy work
│   │   ├── parserWorker.ts      # Off main thread spec parsing with fileMap sync and stale fallback fix
│   │   ├── compressWorker.ts    # Off main thread URL compression with stale URL clear
│   │   └── layoutWorker.ts      # Off main thread Dagre layout
│   ├── hooks/                   # Extracted App orchestration hooks
│   │   ├── useSpecState.ts      # Spec state with Worker and latest ref for fallback
│   │   ├── useResizableEditor.ts # Resizable editor logic
│   │   └── useDiagnosticNavigation.ts # Diagnostic jump logic
│   ├── ui/                      # Application UI components
│   │   ├── Header.tsx           # App navbar, theme toggle, sample selector, share/export buttons
│   │   ├── EditorPane.tsx       # CodeMirror 6 YAML/JSON editor with sync & debounce
│   │   ├── EndpointExplorer.tsx # Grouped endpoint cards, method badges, search & filter
│   │   ├── EndpointDetails.tsx  # Detailed drawer (parameters, request bodies, responses, security, curl)
│   │   ├── SchemaViewer.tsx     # Expandable schema tree, $ref jump links, composition nodes
│   │   ├── SchemaDetail.tsx     # Deep schema inspector with inline example generator
│   │   ├── DiagnosticsBar.tsx   # Parse errors, warnings, click-to-jump to editor line
│   │   ├── CurlGenerator.tsx    # Interactive copy-paste curl command builder
│   │   └── Common/              # Badges, Tabs, SplitPane, Modals, Tooltips
│   ├── share/                   # Zero-backend URL sharing
│   │   ├── urlHash.ts           # LZ-String URL hash compression & decompression
│   │   └── shareService.ts      # Share URL, size, state single-decode and large-spec Worker handling
│   ├── samples/                 # Bundled OpenAPI / Swagger sample specs
│   │   ├── petstore.ts          # Classic OpenAPI 3.0
│   │   ├── github.ts            # Nested schemas & pagination
│   │   ├── stripe.ts            # Polymorphism (oneOf / anyOf)
│   │   ├── ecommerce.ts         # Multi-auth, complex CRUD, error schemas
│   │   ├── broken.ts            # Deliberate errors & warnings for diagnostics
│   │   ├── minimal.ts           # Ultra-compact valid spec
│   │   └── index.ts             # Sample registry
│   ├── theme/                   # Theme provider & color tokens
│   │   └── ThemeContext.tsx     # Dark / light theme with localStorage persistence
│   ├── App.tsx                  # Root application component with split-pane & multi-tab views
│   ├── main.tsx                 # Vite entry point
│   └── index.css                # Tailwind CSS + custom scrollbar / theme variables
├── tests/
│   ├── parser.test.ts           # Vitest unit tests for parser & normalizer
│   ├── refResolver.test.ts      # Vitest unit tests for $ref resolution & circular refs
│   ├── swaggerConverter.test.ts # Vitest unit tests for Swagger 2.0 conversion
│   └── urlHash.test.ts          # Vitest unit tests for URL hash compression
├── index.html                   # HTML template
├── package.json                 # Dependencies & scripts
├── tailwind.config.js           # Tailwind design tokens & dark mode config
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration with base: './' for GitHub Pages
└── vitest.config.ts             # Vitest test runner configuration
```

---

## Architecture Decisions

- All parsing, ref-resolution, graph calculation, and share-link compression run 100% in the browser with **zero backend dependencies**.
- **Graph Layout Engine**: Uses `@xyflow/react` (React Flow) combined with `@dagrejs/dagre` for automated hierarchical layout of the API topology graph.
- **Sharing**: Uses `lz-string` to compress raw specs into URL hash fragments (`#spec=...`) so share links remain compact and serverless. App state is single-decoded via `URLSearchParams` and large spec compression clears stale `asyncUrl` and disables Copy while preparing.
- **Editor**: CodeMirror 6 with YAML and JSON language support, syntax highlighting, and line navigation on diagnostic clicks. `?` help does not trigger inside `.cm-content` and dark mode is correctly styled.
- **Parser Workers**: Spec parsing can run in a Worker. The main thread file map is sent to the Worker so external `$ref` still resolve; nested refs inside external files use a `basePath` scoped context so `#/components/schemas/Owner` inside `schemas.yaml` resolves against that file. Worker fallback uses latest text ref to avoid stale parse.
- **Keyboard**: `/` focuses search in Explorer and Schema Viewer; `Ctrl/Cmd+K` is reserved exclusively for the Command Palette and documented as `Open command palette`.

---

## Implementation Milestones

### Milestone 1: Project Initialization, Model & Parser Engine
- Initialize Vite React + TypeScript project with Tailwind CSS, Lucide icons, `@xyflow/react`, CodeMirror 6, `yaml`, `lz-string`, `html-to-image`, `dagre`, and `vitest`.
- Define TypeScript types in `src/model/index.ts`.
- Implement Swagger 2.0 to OpenAPI 3.0 normalizer.
- Implement robust recursive `$ref` resolver with cycle detection.
- Implement spec validator generating warnings (unused schemas, missing response codes, empty parameters).
- Create bundled sample specs in `src/samples/`.
- Write comprehensive Vitest unit tests covering specs, refs, and circular structures.

### Milestone 2: CodeMirror Editor & Endpoint Explorer UI
- Resizable split-pane layout (Editor on left/toggle, Visual explorer on right).
- CodeMirror 6 editor with theme support, debounced live-parse, file upload dropzone (`.yaml`, `.yml`, `.json`), and sample selector.
- Endpoint cards grouped by tag with color-coded HTTP method badges (GET=green, POST=blue, PUT=amber, DELETE=red, PATCH=cyan).
- Search, method filter, and tag filter.
- Click-to-expand details panel with parameters, request body schemas, response statuses, security schemes, and copyable curl preview.

### Milestone 3: Schema Viewer & Ref Navigation
- Expandable tree view for all components/schemas.
- Composition rendering (`allOf`, `oneOf`, `anyOf`, `not`).
- `$ref` jump links (clicking a reference immediately highlights and scrolls to the referenced schema).
- Circular reference badge and safe loop termination.
- Mock data / example generator rendered inline for schemas.

### Milestone 4: Interactive API Topology Graph
- React Flow canvas connecting Endpoints → Schemas → Child Schemas.
- Custom node types for Endpoints (with method badges, path) and Schemas (with property count and reuse badge).
- Color-coded edges by HTTP method and reference relationships.
- Auto-layout via Dagre with horizontal/vertical flow options.
- Zoom, pan, minimap, fullscreen, and node focus highlighting.

### Milestone 5: Polish, Sharing, PNG Export & Diagnostics
- Compression & URL hash encoding/decoding for instant 1-click sharing.
- PNG export for the active topology graph view via `html-to-image`.
- Copy normalized JSON / YAML to clipboard.
- Bottom diagnostics drawer showing syntax errors and semantic warnings with click-to-jump to editor line.
- Dark and light theme toggle saved to `localStorage`.

### Milestone 6: CI/CD, E2E & Production Build Verification
- Update `.github/workflows/deploy.yml` to build Vite static assets (`dist/`) and deploy to GitHub Pages.
- Ensure build succeeds cleanly (`npm run build`, `npm run test`).
- Update `README.md` with complete documentation, architecture diagram, and feature overview.

---

## Verification Plan

### Automated Tests
- Run `npm run test` (Vitest) to verify:
  - YAML and JSON parsing.
  - Swagger 2.0 conversion accuracy.
  - Deep `$ref` resolution and circular reference handling.
  - Diagnostics and lint rule generation.
  - URL hash compression round-trip.

### Build Verification
- Run `npm run build` to verify clean TypeScript compilation and static asset generation in `dist/`.
