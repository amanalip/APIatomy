<p align="center">
  <img src="public/logo.svg" width="72" height="72" alt="APIatomy specimen logo" />
</p>

<h1 align="center">APIatomy</h1>

<p align="center">See inside your API.</p>

<p align="center">
  <img src="public/logo-horizontal.svg" width="360" alt="APIatomy horizontal logo" />
</p>

APIatomy is a client side visual explorer that turns OpenAPI 3.x and Swagger 2.0 specifications (YAML and JSON) into interactive endpoint explorers, recursive schema viewers, and dynamic topology graphs.

Zero backend, no accounts, no specs leaving your machine. The entire application runs directly in the browser and deploys as a static site on GitHub Pages.

---

## Core Features

- **Multi Spec Normalization**: Broad OpenAPI 3.0/3.1 support with automatic conversion of Swagger 2.0 specs including `host`/`basePath`/`schemes`, `collectionFormat`, file uploads and OAuth2 flow mapping. External file refs and full JSON Schema 2020-12 require bundling.
- **Interactive Topology Graph**: Powered by React Flow and Dagre with lazy loading. Maps relationships between HTTP endpoints, consumed request payloads, produced response models and nested component schemas with layout direction controls, tag filtering, PNG and SVG export and virtualized rendering for large specs.
- **Endpoint Explorer**: Color coded HTTP method badges, filterable by path, method and tag, with search, method pills and tag grouping, virtualized lists for hundreds of entries and detailed drawer with parameters, bodies, responses and security.
- **Schema Viewer**: Expandable tree view for component schemas with composition support (`allOf`, `oneOf`, `anyOf`, `not`), circular reference protection, clickable `$ref` navigation, additionalProperties maps, mock data generator with JSON and YAML toggle and virtualized list.
- **Diagnostics and Validation**: Syntax checking and spec linting for missing info and paths, invalid paths, duplicate operationIds, missing path params, broken refs, unused schemas and security schemes, tag checks and more, with click to jump navigation and how to fix guidance.
- **cURL Generator**: Builds copy ready cURL commands with server URL normalization including operation and path level servers, template variable substitution, path and query encoding, array explode and delimited styles, `allowReserved` handling, header and cookie support, object query serialization, auth aware headers with selector for OR alternatives and correct `multipart` and `urlencoded` bodies.
- **Zero Backend Sharing**: Private link sharing via URL hash with LZ String compression that does not pollute the address bar, share dialog with size display and warnings, compact link via minified normalization, file fallback for large specs, source URL sharing when loaded from URL, app state preservation, native system share and clipboard toast feedback.
- **Import and Workspaces**: Upload single or multiple files for multi file projects, load from public URL with CORS handling, optional IndexedDB workspaces for explicit saves, and onboarding for first use with privacy notice.
- **Mobile and UX**: Full screen drawer editor on phones, command palette via Ctrl or Cmd K, keyboard shortcut help via ?, theme toggle with system sync that persists only explicit choice.
- **Performance and Architecture**: Parsing, compression and Dagre layout can run off the main thread via workers, shared code extracted to hooks and services, strong TypeScript typing and reusable guards.
- **Dark and Light Theme**: Theme toggle with localStorage persistence for explicit preference and system preference sync.

---

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite 6
- **Graph Canvas**: `@xyflow/react` (React Flow) + `@dagrejs/dagre` lazily loaded
- **Code Editor**: CodeMirror 6 with YAML and JSON syntax support
- **Parsing**: `yaml` for YAML AST and native `JSON.parse` with optional worker
- **Sharing Codec**: `lz-string` URL hash compression with optional worker
- **Image Export**: `html-to-image` for PNG and native SVG export
- **Styling**: Tailwind CSS + Lucide Icons
- **Testing**: Vitest + jsdom, Playwright for E2E, Axe for accessibility, coverage thresholds
- **Quality**: ESLint + Prettier with `npm run check` for typecheck, lint, test and build
- **CI/CD**: GitHub Actions deploying static build to GitHub Pages with Dependabot and lint

---

## Architecture and Folder Structure

```
APIatomy/
├── .github/
│   ├── workflows/
│   │   └── deploy.yml           # CI/CD: build and deploy Vite static site to GitHub Pages
│   └── dependabot.yml           # Weekly dependency updates
├── src/
│   ├── model/                   # Normalized internal data types
│   │   ├── index.ts             # ApiSpec, Endpoint, Parameter, RequestBody, Response, Schema, SecurityScheme, Diagnostic
│   │   ├── httpMethods.ts       # Method badge colors and HTTP status categories
│   │   └── mockGenerator.ts     # Deterministic mock data generator for schemas
│   ├── parser/                  # Client side ingestion and resolution
│   │   ├── yamlJson.ts          # Safe YAML and JSON parser with diagnostics
│   │   ├── swaggerConverter.ts  # Swagger 2.0 to OpenAPI 3.0 converter
│   │   ├── refResolver.ts       # $ref resolver with RFC 6901 decoding, circular and external handling, sibling merge for 3.1
│   │   ├── normalizer.ts        # Maps OpenAPI and Swagger AST to internal ApiSpec model with server precedence and security groups
│   │   ├── validator.ts         # Diagnostics generator with how to fix hints
│   │   └── index.ts             # Main parser entry point
│   ├── layout/                  # Graph and view layout calculation
│   │   └── graphLayout.ts       # Dagre based auto layout for React Flow nodes and edges
│   ├── graph/                   # React Flow topology canvas
│   │   ├── TopologyGraph.tsx    # Canvas with pan, zoom, minimap, controls and tag filter, lazy imports
│   │   ├── EndpointNode.tsx     # Custom node for HTTP endpoints
│   │   ├── SchemaNode.tsx       # Custom node for schemas with reuse indicator
│   │   ├── CustomEdge.tsx       # Custom labeled relationship edge
│   │   ├── exportPng.ts         # PNG export helper via html-to-image
│   │   └── exportSvg.ts         # SVG export helper
│   ├── workers/                 # Web Workers for heavy work
│   │   ├── parserWorker.ts      # Off main thread spec parsing
│   │   ├── compressWorker.ts    # Off main thread URL compression
│   │   └── layoutWorker.ts      # Off main thread Dagre layout
│   ├── hooks/                   # Extracted App orchestration hooks
│   │   ├── useSpecState.ts      # Spec state with optional worker
│   │   ├── useResizableEditor.ts # Resizable editor logic
│   │   └── useDiagnosticNavigation.ts # Diagnostic jump logic
│   ├── ui/                      # Application UI components
│   │   ├── Header.tsx           # Navbar, theme toggle, sample selector, share, URL import and help
│   │   ├── EditorPane.tsx       # CodeMirror 6 YAML and JSON editor with sync
│   │   ├── EndpointExplorer.tsx # Grouped endpoint cards with virtualization
│   │   ├── EndpointDetails.tsx  # Drawer for parameters, bodies, responses, security and cURL with auth selector
│   │   ├── SchemaViewer.tsx     # Expandable schema tree with virtualization
│   │   ├── DiagnosticsBar.tsx   # Parse errors and warnings with fix guidance
│   │   ├── CurlGenerator.tsx    # Copy ready cURL builder with server and auth selector
│   │   ├── ShareDialog.tsx      # Share modal with size, compact link, file fallback and state
│   │   ├── UrlImportDialog.tsx  # Load from URL dialog
│   │   ├── Onboarding.tsx       # First use onboarding
│   │   ├── CommandPalette.tsx   # Ctrl K palette for navigation
│   │   ├── ShortcutHelp.tsx     # Keyboard shortcut help
│   │   ├── DiffView.tsx         # API diff view for added, removed and changed endpoints
│   │   ├── VirtualList.tsx      # Simple virtualization for large lists
│   │   ├── Toast.tsx            # In app toast notifications
│   │   └── ErrorBoundary.tsx    # React error boundary
│   ├── share/                   # Zero backend URL sharing
│   │   ├── urlHash.ts           # LZ String URL hash compression and decompression
│   │   └── shareService.ts      # Share size, compact, file fallback, native share and state handling
│   ├── samples/                 # Bundled OpenAPI and Swagger sample specs
│   │   ├── petstore.ts          # Classic OpenAPI 3.0
│   │   ├── github.ts            # Nested schemas and pagination
│   │   ├── stripe.ts            # Polymorphism with oneOf and anyOf
│   │   ├── ecommerce.ts         # Multi auth, complex CRUD and error schemas
│   │   ├── broken.ts            # Deliberate errors and warnings for diagnostics
│   │   ├── minimal.ts           # Minimal valid spec
│   │   └── index.ts             # Sample registry
│   ├── theme/                   # Theme provider and color tokens
│   │   └── ThemeContext.tsx     # Dark and light theme with explicit preference persistence
│   ├── utils/                   # Shared helpers
│   │   ├── serverUrl.ts         # Server URL normalization and header sanitization
│   │   ├── schemaRefs.ts        # Schema ref collection helpers
│   │   ├── typeGuards.ts        # Type guard utilities
│   │   ├── useCopy.ts           # Clipboard hook with timer cleanup
│   │   └── workspaceStore.ts    # IndexedDB optional workspaces
│   ├── App.tsx                  # Root component with split pane, palette, diff and mobile drawer
│   ├── main.tsx                 # Vite entry point with Theme and Toast providers
│   └── index.css                # Tailwind CSS and custom scrollbar and theme variables
├── tests/                       # Vitest unit test suites and Playwright E2E
│   ├── e2e/
│   │   ├── app.spec.ts          # Full workflow E2E
│   │   └── a11y.spec.ts         # Axe accessibility
│   ├── curlGenerator.test.ts
│   ├── normalizer.test.ts
│   └── ...                      # Additional suites
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts including lint, format and check
├── eslint.config.js             # ESLint flat config
├── .prettierrc                  # Prettier config
├── tailwind.config.js           # Tailwind design tokens and dark mode config
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration with base handling for GitHub Pages
├── playwright.config.ts         # Playwright config
└── vitest.config.ts             # Vitest config with coverage thresholds
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/amanalip/APIatomy.git
cd APIatomy

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Running Tests

```bash
# Run unit test suite
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run e2e
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# One command typecheck, lint, test and build
npm run check
```

### Production Build

```bash
npm run build
```

The production static files will be placed into the `dist/` directory, ready to be hosted on GitHub Pages or any static file server. When built on GitHub Actions the Vite `base` is set to `/APIatomy/` automatically, otherwise it uses `./` for local preview.

---

## License

See [LICENSE](LICENSE) for details.
