# APIatomy

> See inside your API.

APIatomy is a client side visual explorer that turns OpenAPI 3.x and Swagger 2.0 specifications (YAML and JSON) into interactive endpoint explorers, recursive schema viewers, and dynamic topology graphs.

Zero backend, no accounts, no specs leaving your machine. The entire application runs directly in the browser and deploys as a static site on GitHub Pages.

---

## Core Features

- **Multi Spec Normalization**: Broad OpenAPI 3.0/3.1 support with automatic conversion of Swagger 2.0 specs including `host`/`basePath`/`schemes`, `collectionFormat`, file uploads and OAuth2 flow mapping. External file refs and full JSON Schema 2020-12 require bundling.
- **Interactive Topology Graph**: Powered by React Flow and Dagre. Maps relationships between HTTP endpoints, consumed request payloads, produced response models and nested component schemas with layout direction controls, tag filtering and PNG export.
- **Endpoint Explorer**: Color coded HTTP method badges, filterable by path, method and tag, with search, method pills and tag grouping. Detailed drawer shows parameters, request bodies, responses, response headers and security requirements.
- **Schema Viewer**: Expandable tree view for component schemas with composition support (`allOf`, `oneOf`, `anyOf`, `not`), circular reference protection, clickable `$ref` navigation, additionalProperties maps and inline mock data generator with JSON and YAML toggle.
- **Diagnostics and Validation**: Syntax checking and spec linting for missing `info`/`paths`, invalid paths, duplicate operationIds, missing path params, broken `$ref` targets, unused schemas and security schemes, tag checks and more, with click to jump navigation into the CodeMirror editor.
- **cURL Generator**: Builds copy ready cURL commands with server URL normalization, template variable substitution, path and query encoding, array explode and delimited styles, `allowReserved` handling, header and cookie support, auth aware headers (`apiKey`, `http basic/bearer`, `oauth2`/`openIdConnect`) and correct `multipart/form-data` and `x-www-form-urlencoded` bodies.
- **Zero Backend Sharing and Export**: URL hash state encoding with LZ String compression for one click sharing, high resolution PNG graph export and normalized AST JSON copy.
- **Dark and Light Theme**: Theme toggle with `localStorage` persistence and system preference sync.

---

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite 6
- **Graph Canvas**: `@xyflow/react` (React Flow) + `@dagrejs/dagre`
- **Code Editor**: CodeMirror 6 with YAML and JSON syntax support
- **Parsing**: `yaml` for YAML AST and native `JSON.parse`
- **Sharing Codec**: `lz-string` URL hash compression
- **Image Export**: `html-to-image`
- **Styling**: Tailwind CSS + Lucide Icons
- **Testing**: Vitest + jsdom
- **CI/CD**: GitHub Actions deploying static build to GitHub Pages

---

## Architecture and Folder Structure

```
APIatomy/
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD: build and deploy Vite static site to GitHub Pages
├── src/
│   ├── model/                   # Normalized internal data types
│   │   ├── index.ts             # ApiSpec, Endpoint, Parameter, RequestBody, Response, Schema, SecurityScheme, Diagnostic
│   │   ├── httpMethods.ts       # Method badge colors and HTTP status categories
│   │   └── mockGenerator.ts     # Deterministic mock data generator for schemas
│   ├── parser/                  # Client side ingestion and resolution
│   │   ├── yamlJson.ts          # Safe YAML and JSON parser with diagnostics
│   │   ├── swaggerConverter.ts  # Swagger 2.0 to OpenAPI 3.0 converter
│   │   ├── refResolver.ts       # $ref resolver with RFC 6901 decoding and circular detection
│   │   ├── normalizer.ts        # Maps OpenAPI and Swagger AST to internal ApiSpec model
│   │   ├── validator.ts         # Diagnostics generator for lint rules
│   │   └── index.ts             # Main parser entry point
│   ├── layout/                  # Graph and view layout calculation
│   │   └── graphLayout.ts       # Dagre based auto layout for React Flow nodes and edges
│   ├── graph/                   # React Flow topology canvas
│   │   ├── TopologyGraph.tsx    # Canvas with pan, zoom, minimap, controls and tag filter
│   │   ├── EndpointNode.tsx     # Custom node for HTTP endpoints
│   │   ├── SchemaNode.tsx       # Custom node for schemas with reuse indicator
│   │   ├── CustomEdge.tsx       # Custom labeled relationship edge
│   │   └── exportPng.ts         # PNG export helper via html-to-image
│   ├── ui/                      # Application UI components
│   │   ├── Header.tsx           # Navbar, theme toggle, sample selector, share and export buttons
│   │   ├── EditorPane.tsx       # CodeMirror 6 YAML and JSON editor with sync and debounce
│   │   ├── EndpointExplorer.tsx # Grouped endpoint cards, badges, search and filters
│   │   ├── EndpointDetails.tsx  # Drawer for parameters, bodies, responses, security and cURL
│   │   ├── SchemaViewer.tsx     # Expandable schema tree and mock data preview
│   │   ├── DiagnosticsBar.tsx   # Parse errors and warnings with jump to line
│   │   ├── CurlGenerator.tsx    # Copy ready cURL command builder with server and auth handling
│   │   └── ErrorBoundary.tsx    # React error boundary
│   ├── share/                   # Zero backend URL sharing
│   │   └── urlHash.ts           # LZ String URL hash compression and decompression
│   ├── samples/                 # Bundled OpenAPI and Swagger sample specs
│   │   ├── petstore.ts          # Classic OpenAPI 3.0
│   │   ├── github.ts            # Nested schemas and pagination
│   │   ├── stripe.ts            # Polymorphism with oneOf and anyOf
│   │   ├── ecommerce.ts         # Multi auth, complex CRUD and error schemas
│   │   ├── broken.ts            # Deliberate errors and warnings for diagnostics
│   │   ├── minimal.ts           # Minimal valid spec
│   │   └── index.ts             # Sample registry
│   ├── theme/                   # Theme provider and color tokens
│   │   └── ThemeContext.tsx     # Dark and light theme with localStorage and media query sync
│   ├── utils/                   # Shared helpers
│   │   ├── serverUrl.ts         # Server URL normalization and header sanitization
│   │   ├── schemaRefs.ts        # Schema ref collection helpers
│   │   ├── typeGuards.ts        # Type guard utilities
│   │   └── useCopy.ts           # Clipboard hook with timer cleanup
│   ├── App.tsx                  # Root component with split pane and multi tab views
│   ├── main.tsx                 # Vite entry point
│   └── index.css                # Tailwind CSS and custom scrollbar and theme variables
├── tests/                       # Vitest unit test suites
│   ├── curlGenerator.test.ts
│   ├── normalizer.test.ts
│   ├── graphLayout.test.ts
│   ├── validator.test.ts
│   ├── refResolver.test.ts
│   ├── swaggerConverter.test.ts
│   ├── yamlJson.test.ts
│   ├── urlHash.test.ts
│   ├── mockGenerator.test.ts
│   ├── httpMethods.test.ts
│   └── ...                      # Additional quality and regression suites
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── tailwind.config.js           # Tailwind design tokens and dark mode config
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration with base handling for GitHub Pages
└── vitest.config.ts             # Vitest test runner configuration
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
```

### Production Build

```bash
npm run build
```

The production static files will be placed into the `dist/` directory, ready to be hosted on GitHub Pages or any static file server. When built on GitHub Actions the Vite `base` is set to `/APIatomy/` automatically, otherwise it uses `./` for local preview.

---

## License

See [LICENSE](LICENSE) for details.
