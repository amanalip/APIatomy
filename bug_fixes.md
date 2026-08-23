# APIatomy: Bug Fixes Log

This document tracks all bug fixes, UI/UX corrections, and performance adjustments made to APIatomy.

---

## Bug Fix Log

### Fix 1: Dark and Light Theme Toggle Support
- **Issue**: The dark mode toggle button in the header was toggling the `.dark` CSS class on `<html>`, but the UI did not respond because views were styled with hardcoded dark palette classes (`bg-slate-950`, `bg-slate-900`, `text-slate-100`) without light mode counterparts.
- **Root Cause**: Missing Tailwind light mode color variants across all components and missing `ThemeProvider` wrapper at the application root.
- **Resolution**:
  - Moved `<ThemeProvider>` to wrap `<App />` inside `src/main.tsx` for global context availability.
  - Added comprehensive light and dark classes across `Header.tsx`, `EndpointExplorer.tsx`, `EndpointDetails.tsx`, `SchemaViewer.tsx`, `DiagnosticsBar.tsx`, and `CurlGenerator.tsx`.
  - Added dynamic background color support to `index.html` body element.

### Fix 2: CodeMirror Dynamic Theme Switching
- **Issue**: The CodeMirror editor remained locked to OneDark even when switching to light theme.
- **Root Cause**: The theme extension was statically instantiated in `EditorState.create` without reconfigurable compartments.
- **Resolution**:
  - Added a CodeMirror `Compartment` in `src/ui/EditorPane.tsx`.
  - Configured a `useEffect` hook listening to the active `theme` to dynamically reconfigure the editor theme between OneDark and the default light theme.

### Fix 3: Topology Graph Palette and PNG Export Matching
- **Issue**: The React Flow canvas, node cards, and PNG exporter did not adapt to light mode.
- **Root Cause**: Hardcoded canvas dot colors, minimap background masks, and node backgrounds in `src/graph/TopologyGraph.tsx`, `EndpointNode.tsx`, `SchemaNode.tsx`, and `exportPng.ts`.
- **Resolution**:
  - Connected `TopologyGraph.tsx` to `useTheme()`.
  - Configured dynamic dot colors (`#334155` for dark, `#cbd5e1` for light) and minimap masks.
  - Updated custom node cards (`EndpointNode` and `SchemaNode`) with light/dark border, text, and surface styles.
  - Updated `exportPng.ts` to accept a dynamic background color parameter (`#020617` for dark, `#f8fafc` for light).

### Fix 4: Sample Specs Dropdown Dismissal
- **Issue**: Clicking outside the sample specification selector in the header did not close the dropdown menu.
- **Root Cause**: Missing click-outside event handler on the dropdown menu ref.
- **Resolution**: Added a `mousedown` event listener to `src/ui/Header.tsx` to dismiss the menu automatically when clicking elsewhere on the page.

### Fix 5: External Document Sync in CodeMirror Editor
- **Issue**: Selecting a sample spec or loading an uploaded file did not always reliably update the active CodeMirror document state if the editor was initialized.
- **Root Cause**: `EditorPane.tsx` initialized state on mount but did not listen for external `value` prop changes.
- **Resolution**: Added a document synchronization effect in `EditorPane.tsx` that checks whether the editor text matches the incoming prop and dispatches changes accordingly.

### Fix 6: Topology Edge Labels Day/Light Theme & Overlap
- **Issue**: The relationship badges on graph edges (e.g. `produces`, `consumes`) remained dark pills on the light canvas, and multiple edges converging on the same schema caused overlapping labels.
- **Root Cause**: Hardcoded dark background `bg-slate-900/90` in `src/graph/CustomEdge.tsx` and positioning all labels strictly at the exact 50% midpoint of the bezier curve.
- **Resolution**:
  - Updated `src/graph/CustomEdge.tsx` with light/dark theme classes and distinct color coding for `consumes` (blue) and `produces` (emerald).
  - Implemented smart curve offset positioning: `consumes` labels are placed at ~35% and `produces` labels are placed at ~65% along the edge curve, eliminating label collision when endpoints and schemas connect.

### Fix 7: Status Code Color Tokens for Light Mode
- **Issue**: Status code badge colors in `src/model/httpMethods.ts` were tuned only for high contrast against dark backgrounds and looked pale in light mode.
- **Root Cause**: Lack of dual-mode Tailwind classes in `getStatusCategory`.
- **Resolution**: Updated status category configurations with high-contrast text and border styles for both light and dark modes.

### Fix 8: Vertical Graph Layout Handle Orientation
- **Issue**: Switching the topology graph to Vertical (Top-to-Bottom) flow produced awkward horizontal connection loops because node handles remained anchored to Left/Right.
- **Root Cause**: Fixed `Position.Left` and `Position.Right` on `EndpointNode` and `SchemaNode` without orientation awareness.
- **Resolution**: Passed layout direction metadata to node data and dynamically switched handles to `Position.Top` (target) and `Position.Bottom` (source) when vertical layout (`TB`) is active.

### Fix 9: Server Variables Substitution in cURL Generator
- **Issue**: OpenAPI servers containing URL variable templates (e.g. `https://{environment}.example.com/v1`) were rendered literally in the cURL snippet.
- **Root Cause**: Missing server variable resolution logic in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Added automatic substitution of server variable default values into the base URL before constructing endpoint cURL commands.

### Fix 10: Multi-Tag Endpoint Filtering
- **Issue**: When an endpoint had multiple tags and the user filtered by a secondary tag, the endpoint was placed under its primary tag header or could be misplaced.
- **Root Cause**: Grouping logic defaulted strictly to `ep.tags[0]`.
- **Resolution**: Updated `groupedEndpoints` in `src/ui/EndpointExplorer.tsx` to group by the actively selected tag filter when one is chosen.

### Fix 11: Schema Viewer Active Schema Resilience
- **Issue**: If the active schema was removed or renamed during live spec edits, the viewer could get stuck in an unselected state.
- **Root Cause**: Missing synchronization check against the available schemas map.
- **Resolution**: Added automatic fallback to the first available schema key in `src/ui/SchemaViewer.tsx` when the previously active schema no longer exists.

### Fix 12: RFC 6901 Escaped and URI-Encoded JSON Pointer Resolution
- **Issue**: References targeting JSON Pointer paths with escaped characters (`~1` for `/`, `~0` for `~`) or URI percent-encoded segments (e.g. `#/paths/~1users~1%7Bid%7D` or spaces in schema names) failed resolution.
- **Root Cause**: Raw string lookup without unescaping and URI decoding.
- **Resolution**: Enhanced `resolveJsonPointer` and `extractRefTargetName` in `src/parser/refResolver.ts` to decode RFC 6901 tokens and URI components safely.

### Fix 13: Swagger 2.0 Global Parameters and Responses Conversion
- **Issue**: Swagger 2.0 specs defining top-level `parameters` or `responses` dictionaries did not migrate them into OpenAPI 3.0 `components.parameters` and `components.responses`.
- **Root Cause**: Conversion routine only mapped `definitions` and `securityDefinitions`.
- **Resolution**: Updated `src/parser/swaggerConverter.ts` to convert top-level `parameters` and `responses`, rewriting internal `$ref` pointers accordingly.

### Fix 14: Active Broken `$ref` Validation in Linter
- **Issue**: The validator's `findBrokenRefsInDoc` helper traversed objects without evaluating whether references actually pointed to valid targets in the root document.
- **Root Cause**: Missing pointer resolution check on `$ref` entries in `src/parser/validator.ts`.
- **Resolution**: Connected `resolveJsonPointer` to verify all `$ref` links across the document, highlighting broken references as actionable error diagnostics.

### Fix 15: Parameter Enum Badges and Response Headers in Endpoint Inspector
- **Issue**: Endpoint parameter enum constraints and response header specifications were not displayed in the Inspector drawer.
- **Root Cause**: Missing rendering blocks in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Added enum badges under parameter type cells and a response headers summary block for responses that define headers.

### Fix 16: Topology Graph Empty State Overlay
- **Issue**: When opening an empty or stripped specification with no endpoints or schemas, the topology graph view showed a blank canvas without user guidance.
- **Root Cause**: Missing empty node list conditional placeholder in `src/graph/TopologyGraph.tsx`.
- **Resolution**: Added an intuitive centered overlay explaining that no graphable endpoints or schemas were found in the current spec.

### Fix 17: Deep `$ref` Resolution on Parameters, Bodies, and Responses
- **Issue**: References to reusable components outside schemas (e.g. `#/components/parameters/...`, `#/components/responses/...`, or `#/components/requestBodies/...`) were rendered as raw references without expanding their schema and properties.
- **Root Cause**: Parameter, request body, and response AST parsers in `src/parser/normalizer.ts` only handled schema-level pointers.
- **Resolution**: Added pointer traversal and full model resolution for component parameter, request body, and response references.

### Fix 18: False Syntax Diagnostic Prevention on YAML Superset Parsing
- **Issue**: Specifications starting with curly braces that used relaxed YAML formatting were flagged with premature JSON parsing syntax errors even when successfully parsed by the YAML engine.
- **Root Cause**: Fast-path JSON check in `src/parser/yamlJson.ts` pushed errors to the diagnostic list before attempting YAML fallback.
- **Resolution**: Cleaned diagnostics during YAML parser fallback to ensure valid documents remain error-free.

### Fix 19: Viewport Centered Scrolling on Code Diagnostics Navigation
- **Issue**: Clicking a diagnostic entry jumped to the line but positioned it at the extreme top edge of the editor view.
- **Root Cause**: `scrollIntoView: true` without explicit vertical alignment parameter in `EditorPane.tsx`.
- **Resolution**: Added `EditorView.scrollIntoView(lineInfo.from, { y: 'center' })` effect to cleanly position the target line in the center of the viewport.

### Fix 20: Robust URL Hash Parameter Decompression
- **Issue**: Shared URL links containing extra hash fragments, raw LZ-compressed tokens, or encoded prefixes could fail extraction in certain browser environments.
- **Root Cause**: Strict regex dependency on `#spec=` without fallback for stripped or prefixed hashes.
- **Resolution**: Enhanced `decompressSpecFromHash` in `src/share/urlHash.ts` to handle direct, query-param, and raw hash string variations gracefully.

### Fix 21: Tailwind CSS Badge Padding Utilities Normalization
- **Issue**: Micro-badges across nodes, drawers, and headers used an unrendered utility token `py-0.2`, resulting in zero vertical padding on badges.
- **Root Cause**: Typo in utility class naming.
- **Resolution**: Standardized all micro-badges across `SchemaNode.tsx`, `DiagnosticsBar.tsx`, `EndpointDetails.tsx`, `EndpointExplorer.tsx`, `Header.tsx`, and `SchemaViewer.tsx` to `py-0.5`.

### Fix 22: Overlay Toolbar Filtering in PNG Image Export
- **Issue**: Exporting the topology diagram to PNG captured floating canvas UI controls including the search input box and filter buttons.
- **Root Cause**: PNG exporter captured all DOM children of the canvas container.
- **Resolution**: Tagged overlay toolbars with `data-export-ignore="true"` and configured the `html-to-image` node filter in `src/graph/exportPng.ts` to omit them from snapshots.

### Fix 23: Structured Array and Complex Schema Body Mocking in cURL Generator
- **Issue**: Endpoints expecting top-level array bodies or arrays with nested items rendered empty JSON `{}` in generated cURL snippets.
- **Root Cause**: Schema mocking generator in `src/ui/CurlGenerator.tsx` only handled top-level object schemas.
- **Resolution**: Added array item and primitive type traversal to produce realistic sample array payloads.
