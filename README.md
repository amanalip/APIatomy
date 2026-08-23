# APIatomy

> See inside your API.

APIatomy is a client-side visual explorer that turns OpenAPI 3.x and Swagger 2.0 specifications (YAML and JSON) into interactive endpoint explorers, recursive schema viewers, and dynamic topology graphs.

Zero backend, no accounts, no specs leaving your machine. The entire application runs directly in the browser and deploys as a static site on GitHub Pages.

---

## Core Features

- **Multi-Spec Normalization**: Full support for OpenAPI 3.0.x and 3.1.x, with automatic conversion of Swagger 2.0 specs.
- **Interactive Topology Graph**: Powered by React Flow and Dagre. Maps relationships between HTTP endpoints, consumed request payloads, produced response models, and nested component schemas.
- **Endpoint Explorer**: Color-coded HTTP method badges (GET = green, POST = blue, PUT = amber, DELETE = red, PATCH = cyan), filterable by path, method, and tag. Includes a detailed slide-out inspector with request/response schema previews, security requirements, and a copyable cURL snippet generator.
- **Schema Viewer**: Expandable tree view for component schemas with composition support (`allOf`, `oneOf`, `anyOf`), circular reference protection, clickable `$ref` navigation links, and an inline mock JSON generator.
- **Diagnostics and Validation**: Syntax checking and spec linting for missing documentation, broken `$ref` targets, empty responses, and unused component models with click-to-jump navigation into the CodeMirror editor.
- **Zero-Backend Sharing and Export**: URL hash state encoding with LZ-String compression for 1-click sharing, high-resolution PNG graph export, and normalized AST JSON copy.
- **Dark and Light Theme**: Sleek interface with theme toggle persisted to `localStorage`.

---

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Graph Canvas**: `@xyflow/react` (React Flow) + `@dagrejs/dagre`
- **Code Editor**: CodeMirror 6 with YAML and JSON syntax support
- **Parsing**: `yaml` for YAML AST and native `JSON.parse`
- **Sharing Codec**: `lz-string` URL hash compression
- **Image Export**: `html-to-image`
- **Styling**: Tailwind CSS + Lucide Icons
- **Testing**: Vitest
- **CI/CD**: GitHub Actions deploying static build to GitHub Pages

---

## Architecture and Folder Structure

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
│   │   ├── refResolver.ts       # $ref resolver & circular reference detection
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
│   ├── ui/                      # Application UI components
│   │   ├── Header.tsx           # App navbar, theme toggle, sample selector, share/export buttons
│   │   ├── EditorPane.tsx       # CodeMirror 6 YAML/JSON editor with sync & debounce
│   │   ├── EndpointExplorer.tsx # Grouped endpoint cards, method badges, search & filter
│   │   ├── EndpointDetails.tsx  # Detailed drawer (parameters, request bodies, responses, security, curl)
│   │   ├── SchemaViewer.tsx     # Expandable schema tree, $ref jump links, composition nodes
│   │   ├── DiagnosticsBar.tsx   # Parse errors, warnings, click-to-jump to editor line
│   │   ├── CurlGenerator.tsx    # Interactive copy-paste curl command builder
│   │   └── index.ts
│   ├── share/                   # Zero-backend URL sharing
│   │   └── urlHash.ts           # LZ-String URL hash compression & decompression
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
├── tests/                       # Vitest unit test suite
│   ├── parser.test.ts
│   ├── refResolver.test.ts
│   ├── swaggerConverter.test.ts
│   └── urlHash.test.ts
├── index.html                   # HTML template
├── package.json                 # Dependencies & scripts
├── tailwind.config.js           # Tailwind design tokens & dark mode config
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration with base: './' for GitHub Pages
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

The production static files will be placed into the `dist/` directory, ready to be hosted on GitHub Pages or any static file server.

---

## License

See [LICENSE](LICENSE) for details.
