# APIatomy: Implementation Walkthrough

APIatomy is built and verified as a fully client-side OpenAPI and Swagger visual explorer with zero backend requirements.

---

## What Was Built

### 1. Architecture and Core Model (`src/model/`)
- Typed AST structures for OpenAPI 3.0, 3.1, and converted Swagger 2.0 specifications.
- Models for `EndpointModel`, `SchemaModel`, `ParameterModel`, `RequestBodyModel`, `ResponseModel`, `SecuritySchemeModel`, and `DiagnosticItem`.
- Standard HTTP method configuration and status code categorizer (`src/model/httpMethods.ts`).

### 2. Parser and Spec Normalizer (`src/parser/`)
- Safe YAML and JSON parser with line and column mapping for syntax errors (`yamlJson.ts`).
- Full Swagger 2.0 to OpenAPI 3.0 AST converter (`swaggerConverter.ts`).
- In-memory `$ref` resolver with circular reference detection and loop protection (`refResolver.ts`).
- Lint and validation engine checking for missing endpoint docs, broken references, empty responses, missing 2xx codes, and unused schemas (`validator.ts`).
- Spec normalizer mapping raw AST into the uniform `ApiSpecModel` (`normalizer.ts`).

### 3. Bundled Sample Specs (`src/samples/`)
- **Petstore**: Standard OpenAPI 3.0 with CRUD operations, parameters, tags, and OAuth2 security.
- **GitHub API (Subset)**: Real-world complexity with nested schemas and pagination parameters.
- **Stripe API (Subset)**: Polymorphic models (`oneOf`/`anyOf`), customer, and payment intents.
- **E-Commerce Platform**: Multi-auth, product catalogs, cart sessions, and checkout pipelines.
- **Broken / Warning-Heavy**: Deliberate lint warnings, broken references, and orphaned schemas.
- **Minimal**: Lightweight baseline spec.

### 4. Interactive Topology Graph (`src/graph/` & `src/layout/`)
- `@xyflow/react` (React Flow) canvas mapping relationships from Endpoints to Request Bodies and Responses to Component Schemas.
- Automated layout calculation using `@dagrejs/dagre` with horizontal (LR) and vertical (TB) flow options.
- Custom `EndpointNode` with method badge, path, summary, and tags.
- Custom `SchemaNode` with property count and reference reuse multiplier (`2x`, `3x`, etc.).
- Custom animated `CustomEdge` with relationship labels.
- Canvas search filter, MiniMap, zoom/pan controls, and PNG export via `html-to-image`.

### 5. UI and Explorer Suite (`src/ui/`)
- **Editor Pane**: CodeMirror 6 editor with YAML/JSON syntax highlighting, debounced live-parse, drag-and-drop file upload, and line jump support.
- **Endpoint Explorer**: Filterable cards grouped by tag with color-coded HTTP method badges.
- **Endpoint Details Panel**: Slide-over drawer detailing parameters, request body schemas, response codes, security schemes, and an interactive copyable cURL command builder.
- **Schema Viewer**: Expandable tree view for component schemas with composition support (`allOf`, `oneOf`, `anyOf`), circular reference badges, clickable `$ref` jump links, and an inline mock JSON generator.
- **Diagnostics Drawer**: Bottom bar showing errors and warnings with click-to-jump synchronization to editor lines.
- **Header**: Navigation bar with sample spec switcher, file upload, copy normalized JSON, theme toggle, and 1-click URL hash share button.

### 6. Zero-Backend Sharing (`src/share/urlHash.ts`)
- LZ-String compression encoding full specs into URL hash fragments (`#spec=...`).
- Automatic round-trip decompression on page load.

### 7. Theme & Persistence (`src/theme/ThemeContext.tsx`)
- Dark and light theme toggle saved to `localStorage`.

### 8. GitHub Actions CI/CD (`.github/workflows/deploy.yml`)
- Automated build and deployment to GitHub Pages on pushes to `main` with lint, format check, coverage and deploy steps.

---

## Verification Results

### Automated Tests
Vitest test suite covering parser, Swagger converter, ref resolver, URL hash codec, normalizer, validator, graph layout, curl generator, diff regression and more:
```bash
npm test
```
Result: **25 test files passed, 207 tests passed (100%)**.

### Code Quality
```bash
npm run lint
npm run format:check
npm run test:coverage
npm run build
```
Result: **Clean lint with max-warnings 0, Prettier formatted, coverage thresholds met and static assets produced in `dist/` with 0 errors**.

### Keyboard and Sharing
- `/` focuses search in Endpoint Explorer and Schema Viewer; `Ctrl/Cmd+K` opens Command Palette exclusively; `?` help is dark mode correct and does not trigger inside CodeMirror.
- Share state uses single percent decoding so `%` in IDs survives; large spec `Copy compact` clears stale Worker URL and disables while preparing; source URL clears after local edits; diff requires explicit old/new.

### Parser Workers
- Worker receives file map for external `$ref`; nested refs inside external files use `basePath` scoping; fallback parses latest text via ref.

### Diff
- Live semantic diff with 150 to 300 ms debounce across endpoints, schemas, security schemes, servers and global metadata; parse errors shown as banners.

### Production Build
```bash
npm run build
```
Result: **Clean compilation, static assets produced in `dist/` with 0 errors**.
