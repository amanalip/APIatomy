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

### Fix 24: Combined Composition and Property Rendering in Schema Tree View
- **Issue**: Schemas combining inheritance or polymorphic composition (`allOf`, `oneOf`, `anyOf`) with direct properties hid the direct properties from view in the schema tree inspector.
- **Root Cause**: Early return statement in `TreeNodeRenderer` within `src/ui/SchemaViewer.tsx` when composition keywords were present.
- **Resolution**: Refactored `TreeNodeRenderer` to render both composition branch nodes and direct property trees in unified hierarchy.

### Fix 25: Dynamic OS System Theme Synchronization Listener
- **Issue**: When users changed their operating system dark/light preference while the application was open without an explicit manual theme override, the theme did not update dynamically.
- **Root Cause**: Missing media query listener for `(prefers-color-scheme: dark)` in `src/theme/ThemeContext.tsx`.
- **Resolution**: Added a reactive `change` event listener on `matchMedia` to update the application theme in real time.

### Fix 26: Responsive Master-Detail Split Pane on Compact Viewports
- **Issue**: Opening the endpoint details panel on compact or medium viewports alongside the open code editor compressed the endpoint list into an illegibly narrow width.
- **Root Cause**: Hardcoded 50/50 split width on all screen sizes in `App.tsx`.
- **Resolution**: Implemented responsive breakpoint layout (`hidden lg:block lg:w-1/2` and `w-full lg:w-1/2`) to present full-width detail view with close button on mobile and tablet screens while retaining side-by-side view on large screens.

### Fix 27: Comprehensive HTTP Method Filtering in Endpoint Explorer
- **Issue**: Endpoint explorer filter pill bar omitted `OPTIONS` and `HEAD` methods, preventing users from filtering specifically for those operation types.
- **Root Cause**: Truncated methods array constant in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Added `options` and `head` to the method filter array with corresponding color tokens and badges.

### Fix 28: Dangling Ghost Edge Prevention in Topology Graph Layout
- **Issue**: Specs with broken schema references created ghost edges in dagre to nonexistent nodes, causing layout positioning distortion.
- **Root Cause**: Missing schema existence validation before creating dagre edges in `src/layout/graphLayout.ts`.
- **Resolution**: Guarded all schema edge creation against `spec.schemas[targetRef]` existence.

### Fix 29: Composition and Default Value Integration in Mock JSON Generator
- **Issue**: Generating mock sample JSON for schemas using `allOf`, `oneOf`, or `anyOf` compositions or declaring schema-level `default` values resulted in incomplete or fallback sample payloads.
- **Root Cause**: `generateMockData` in `src/ui/SchemaViewer.tsx` lacked composition merging branches and default property evaluations.
- **Resolution**: Enhanced `generateMockData` to merge `allOf` properties, evaluate `oneOf`/`anyOf` targets, and prioritize schema `default` values.

### Fix 30: Diagnostics Navigation Fallback for Root-Level Syntax Errors
- **Issue**: Clicking general root-level diagnostics (e.g. document empty or root non-object) that lacked line numbers had no effect when the editor pane was closed.
- **Root Cause**: Diagnostic click handler required `diag.line` to be defined before opening the editor.
- **Resolution**: Updated `handleSelectDiagnostic` in `src/App.tsx` to unconditionally open the editor and navigate to line 1 as a fallback.

### Fix 31: Response Body Content-Type Badges and Raw Example Rendering
- **Issue**: Non-JSON responses or empty responses in the Endpoint Inspector lacked clear content-type badges and example previews.
- **Root Cause**: Conditional rendering in `src/ui/EndpointDetails.tsx` only supported objects with nested schemas.
- **Resolution**: Added explicit content-type badges, raw example code blocks, and clear empty-body notices.

### Fix 32: URL Normalization and Schema Default Substitution in cURL Generator
- **Issue**: Paths without leading slashes or servers with trailing slashes produced malformed URLs in cURL snippets, and parameter defaults were ignored.
- **Root Cause**: Direct string concatenation in `src/ui/CurlGenerator.tsx` without slash normalization and missing `param.schema.default` lookups.
- **Resolution**: Normalized URL paths and incorporated schema default value lookups across query, header, and path parameters.

### Fix 33: Edge Visibility Synchronization in Canvas Node Filtering
- **Issue**: When filtering the topology graph by node type (`endpoints` or `schemas`), connecting edges remained rendered on the canvas across hidden nodes.
- **Root Cause**: Edge state was not synchronized with `hidden` node ID changes in `src/graph/TopologyGraph.tsx`.
- **Resolution**: Added edge visibility synchronization to hide any edges whose source or target nodes are hidden by filter conditions.

### Fix 34: OAuth2 Flow Name Mapping and Root Security Conversion in Swagger Converter
- **Issue**: Converting Swagger 2.0 OAuth2 security definitions with `flow: 'application'` or `flow: 'accessCode'` mapped to invalid flow names in OpenAPI 3.0, and root-level security requirements were omitted.
- **Root Cause**: Missing translation of `application` to `clientCredentials` and `accessCode` to `authorizationCode`, and missing `openapi.security` copy in `src/parser/swaggerConverter.ts`.
- **Resolution**: Mapped Swagger 2.0 OAuth2 flow types to their OpenAPI 3 equivalents (`clientCredentials`, `authorizationCode`) and forwarded root `security` arrays.

### Fix 35: Path Slash Format Validation in Linter
- **Issue**: OpenAPI specification paths not starting with a leading slash `/` were accepted silently without surfacing validation feedback.
- **Root Cause**: Missing check on raw path strings in `src/parser/validator.ts`.
- **Resolution**: Added validation rule emitting a warning diagnostic for path entries lacking a leading slash.

### Fix 36: Deprecated Endpoint Pill and Strikethrough Display
- **Issue**: Endpoints flagged as deprecated did not display clear visual deprecation tags or strikethrough styling in the Explorer sidebar.
- **Root Cause**: Subtle indicator styling in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Added a high-contrast `Deprecated` badge and strikethrough styling on deprecated operation paths.

### Fix 37: Array Mock Generation Conformance to `minItems` Constraint
- **Issue**: Array schemas defining a `minItems` constraint (e.g. `minItems: 3`) only generated a 1-element array in mock sample JSON.
- **Root Cause**: Hardcoded 1-element return in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Updated `generateMockData` to produce `Math.min(schema.minItems, 5)` array elements.

### Fix 38: Top-Level Security Requirement Inheritance in Endpoints Normalizer
- **Issue**: Operations that did not explicitly define an operation-level `security` array lost their top-level security requirements and appeared unauthenticated.
- **Root Cause**: Endpoint parser in `src/parser/normalizer.ts` only evaluated `op.security` without falling back to `doc.security`.
- **Resolution**: Configured endpoint normalizer to inherit global document security requirements when operation-level security is not specified.

### Fix 39: Deprecated Parameter Badge in Endpoint Inspector
- **Issue**: Parameters marked with `deprecated: true` did not display a deprecation tag in the endpoint parameter table.
- **Root Cause**: Missing conditional rendering for `param.deprecated` in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Added an amber `dep` badge alongside parameter names when `deprecated: true` is configured.

### Fix 40: Header Deduplication in cURL Command Generator
- **Issue**: Operations with explicit `Authorization` or `Content-Type` header parameters received duplicate `-H` arguments in the generated cURL command.
- **Root Cause**: Synthetic security and request body headers were unconditionally appended in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Checked for existing explicit header parameters before appending default security or content-type headers.

### Fix 41: Path Template Parameter Mismatch Validation
- **Issue**: Path templates containing parameter placeholders (e.g. `/users/{userId}`) without corresponding `in: 'path'` parameters were not flagged by the validator.
- **Root Cause**: Missing path template regex matching in `src/parser/validator.ts`.
- **Resolution**: Added validation rule emitting error diagnostics when path template placeholders lack matching `in: 'path'` parameter declarations.

### Fix 42: Deep Property Searching in Schema Viewer
- **Issue**: Searching schemas in the Schema Viewer only matched schema root keys, ignoring internal property names, titles, and descriptions.
- **Root Cause**: Filter predicate in `src/ui/SchemaViewer.tsx` only checked `schemaName`.
- **Resolution**: Expanded schema search filter to evaluate schema titles, descriptions, and nested property keys.

### Fix 43: Swagger 2.0 Operation Schemes Conversion to OpenAPI 3.0 Servers
- **Issue**: Swagger 2.0 operation-level `schemes` overrides (e.g. `schemes: ['https']` on an individual endpoint) were ignored during conversion.
- **Root Cause**: Conversion routine in `src/parser/swaggerConverter.ts` only processed root schemes.
- **Resolution**: Mapped operation-level `op.schemes` into operation-scoped `newOp.servers` entries.

### Fix 44: Swagger 2.0 CollectionFormat Parameter Serialization Mapping
- **Issue**: Swagger 2.0 array parameters specifying `collectionFormat` (`multi`, `csv`, `pipes`, `ssv`) lost their serialization configurations during OpenAPI 3.0 conversion.
- **Root Cause**: Missing mapping of `collectionFormat` to OpenAPI 3 `style` and `explode` properties in `src/parser/swaggerConverter.ts`.
- **Resolution**: Mapped `multi` to `style: form, explode: true`, `csv` to `style: form, explode: false`, `pipes` to `style: pipeDelimited`, and `ssv` to `style: spaceDelimited`.

### Fix 45: Duplicate OperationId Linter Validation Rule
- **Issue**: OpenAPI documents with duplicated `operationId` values across multiple endpoints were not flagged by the linter.
- **Root Cause**: Missing uniqueness check in `src/parser/validator.ts`.
- **Resolution**: Added validation rule tracking all operationIds and emitting warning diagnostics for any duplicate declarations.

### Fix 46: Expand All and Collapse All Tags Toggle in Endpoint Explorer
- **Issue**: Specifications with numerous tag groups required manual expansion/collapse of each individual tag section.
- **Root Cause**: Lack of batch toggle control in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Added a toggle button switching all tag groups between expanded and collapsed states.

### Fix 47: URL-Encoding for Path Parameter Values in cURL Generator
- **Issue**: Path parameter sample values or defaults containing spaces, punctuation, or email addresses were inserted directly into cURL URLs without encoding.
- **Root Cause**: Missing `encodeURIComponent` wrapper around substituted path parameter values in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Applied `encodeURIComponent` to path parameter examples and defaults during URL template substitution.

### Fix 48: Subsystem Tag Filtering on Topology Graph Canvas
- **Issue**: The topology canvas only supported filtering by node type (`endpoints` vs `schemas`), without the ability to isolate specific feature tags.
- **Root Cause**: Missing tag selector and node filtering predicate in `src/graph/TopologyGraph.tsx`.
- **Resolution**: Added an interactive tag dropdown filter in the canvas toolbar to display only nodes belonging to selected subsystem tags.

### Fix 49: Wildcard and Case-Insensitive Success Status Code Validation
- **Issue**: Endpoints defining `2XX`, `2xx`, or `default` responses triggered false-positive `missing-2xx` diagnostic warnings.
- **Root Cause**: Strict numeric parsing without case-insensitive range checks in `src/parser/validator.ts`.
- **Resolution**: Updated validation logic to recognize `2xx`, `2XX`, and valid 200-299 HTTP response status strings.

### Fix 50: Raw Text and URL-Encoded Fallback in Spec URL Decompression
- **Issue**: Shared URLs containing plain-text or URL-encoded OpenAPI specs instead of LZ-compressed strings failed to decompress.
- **Root Cause**: Direct reliance on `LZString.decompressFromEncodedURIComponent` without text fallback in `src/share/urlHash.ts`.
- **Resolution**: Added fallback to parse and decode uncompressed or URI-encoded specification strings.

### Fix 51: Parameter Serialization Style and AllowReserved Metadata Display
- **Issue**: Parameter serialization configurations (`style`, `explode`, `allowReserved`) were omitted from the parameter table in the Endpoint Inspector.
- **Root Cause**: Lack of rendering elements in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Added metadata badges displaying parameter `style: <type> (explode)` and `allowReserved` flags.

### Fix 52: Numeric Range, Length, and Regex Pattern Badges in Schema Inspector
- **Issue**: Numeric range limits (`minimum`, `maximum`), length bounds (`minLength`, `maxLength`), and regex patterns (`pattern`) were not shown in schema tree rows.
- **Root Cause**: Tree node renderer in `src/ui/SchemaViewer.tsx` only rendered property type and enums.
- **Resolution**: Added constraint tags for minimum, maximum, length limits, and regex patterns in property rows.

### Fix 53: Cookie Parameter Support in cURL Command Generator
- **Issue**: Endpoints declaring cookie parameters (`in: 'cookie'`) omitted cookie flags in generated cURL commands.
- **Root Cause**: Parameter iteration in `src/ui/CurlGenerator.tsx` only checked `path`, `query`, and `header`.
- **Resolution**: Added cookie parameter processing to generate `-b "cookie1=val; cookie2=val"` flags.

### Fix 54: Unreferenced Security Schemes Validation in Linter
- **Issue**: Security schemes defined in components that were never referenced in root or operation security requirements were not surfaced to users.
- **Root Cause**: Missing security scheme reference tracking in `src/parser/validator.ts`.
- **Resolution**: Added a validation rule emitting informative diagnostics for unused security schemes.

### Fix 55: Numerical Ordering of Endpoint Response Status Codes
- **Issue**: Response status codes were presented in random object key order rather than structured ascending order.
- **Root Cause**: Direct mapping of `endpoint.responses` in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Sorted response status codes numerically (200, 201, 400, 404, 500, default) for consistent display.

### Fix 56: Comprehensive Mock String Format Generation
- **Issue**: Schemas with `format: date`, `format: ipv4`, and `format: hostname` generated generic placeholder strings in mock JSON.
- **Root Cause**: Incomplete format branching in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added realistic mock format generators for `date`, `ipv4`, and `hostname`.

### Fix 57: Multipart and URL-Encoded Body Generation in cURL Snippets
- **Issue**: Endpoints expecting `multipart/form-data` or `application/x-www-form-urlencoded` payloads rendered invalid or raw JSON bodies in cURL.
- **Root Cause**: Generic fallback body handler in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Implemented `-F "key=@path"` for multipart forms and `--data-urlencode` for urlencoded requests.

### Fix 58: Viewport Centering and Fit View Canvas Toolbar Control
- **Issue**: After panning or zooming far away in the topology graph, users had no quick way to re-center and fit the graph in view.
- **Root Cause**: Missing fitView trigger button in `src/graph/TopologyGraph.tsx` toolbar.
- **Resolution**: Added a dedicated `Fit View` action button in the floating toolbar.

### Fix 59: Duplicate Parameter Validation in Linter
- **Issue**: Operations containing duplicate parameter definitions with identical name and `in` locations were not flagged.
- **Root Cause**: Missing duplicate parameter check in `src/parser/validator.ts`.
- **Resolution**: Added validation rule detecting duplicate parameter declarations per operation.

### Fix 60: Filtered vs Total Endpoint Count Badges in Explorer
- **Issue**: Explorer tag headers displayed static counts when filtering by method or search term, creating confusion with visible endpoint counts.
- **Root Cause**: Header badge only rendered current grouped length in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Displayed active filtered count alongside total tag count `(filtered / total)`.

### Fix 61: Schema Inspector AdditionalProperties Map Rendering
- **Issue**: Schemas declaring `additionalProperties` (dynamic key-value maps/dictionaries) omitted the map signature from the tree view.
- **Root Cause**: Tree node renderer in `src/ui/SchemaViewer.tsx` only evaluated named properties.
- **Resolution**: Added `[key: string]: <type>` rendering row for schemas defining `additionalProperties`.

### Fix 62: Array Query Parameter Explode Formatting in cURL Snippets
- **Issue**: Array query parameters were serialized as single string values regardless of `explode` configuration.
- **Root Cause**: Direct value extraction without array iteration in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Formatted exploded array query parameters as repeated key-value pairs (`key=v1&key=v2`) and unexploded parameters as comma-separated values (`key=v1,v2`).

### Fix 63: Request Body Direct Reference Target Tracking in Graph Normalizer
- **Issue**: Operations referencing component request bodies directly did not always register top-level schema references in graph edge maps.
- **Root Cause**: Reference target extraction omitted direct pointer names in `src/parser/normalizer.ts`.
- **Resolution**: Captured direct request body schema reference targets into `consumedSchemaRefs`.

### Fix 64: Missing Info Severity Filter in Diagnostics Bar
- **Issue**: The diagnostics panel displayed info count in the status bar but lacked an `Info` tab button in the expanded filter drawer.
- **Root Cause**: Omission of info button in `src/ui/DiagnosticsBar.tsx` button list.
- **Resolution**: Added an `Info ({infoCount})` filter tab button.

### Fix 65: Distinct Response Header Schema Type and Description Formatting
- **Issue**: In the Endpoint Inspector, response headers that had both descriptions and schema types overrode the type with the description string.
- **Root Cause**: Single ternary fallback expression in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Separated header type badges and descriptions into distinct hierarchical rows.

### Fix 66: JSON and YAML Toggle for Mock Schema Payloads
- **Issue**: Developers reviewing schemas could only generate and copy mock data in JSON format.
- **Root Cause**: Hardcoded JSON formatting in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added a format toggle enabling real-time switching and copying between JSON and YAML mock data representations.

### Fix 67: Excessively Long Summary Linter Diagnostic
- **Issue**: OpenAPI endpoints declaring overly long summaries (> 120 chars) that belonged in description fields were not flagged.
- **Root Cause**: Missing summary length threshold in `src/parser/validator.ts`.
- **Resolution**: Emitted an `info` diagnostic recommending using `description` for detailed documentation.

### Fix 68: Spec Re-Upload Input Reset
- **Issue**: Uploading a specification file, making changes in an external editor, and attempting to re-upload the same file failed to trigger the upload handler.
- **Root Cause**: HTML file input preserved the previous file path in `src/ui/Header.tsx`.
- **Resolution**: Reset `e.target.value = ''` immediately following file processing.

### Fix 69: Required Info Object and Title/Version Validation in Linter
- **Issue**: Specifications missing the required root `info` object or `info.title` were not flagged with actionable error diagnostics.
- **Root Cause**: Missing check for `rawDoc.info` presence in `src/parser/validator.ts`.
- **Resolution**: Added validation requiring `info` object, non-empty `info.title`, and recommending `info.version`.

### Fix 70: Prominent Deprecation Banner in Endpoint Inspector
- **Issue**: When inspecting an endpoint marked with `deprecated: true`, no visual deprecation banner was presented at the top of the details drawer.
- **Root Cause**: Missing deprecation alert in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Added a styled deprecation warning banner at the top of the inspector panel.

### Fix 71: Security Scheme Awareness in cURL Command Generator
- **Issue**: Endpoints using API Key or Basic Authentication had generic `Authorization: Bearer` headers generated in cURL commands.
- **Root Cause**: Hardcoded bearer header generation in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Tailored cURL authentication flags to produce `-H "X-API-Key: ..."` for API key auth, `-u "username:password"` for Basic auth, and `-H "Authorization: Bearer ..."` for OAuth/Bearer.

### Fix 72: Search Clear Button in Endpoint Explorer
- **Issue**: Resetting a search filter in the Endpoint Explorer required manually deleting all text in the search input.
- **Root Cause**: Lack of clear button in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Added an instant one-click clear button (`X`) inside the endpoint search box.

### Fix 73: Search Clear Button in Schema Viewer
- **Issue**: Resetting a schema search required manually backspacing the query text in the Schema Viewer.
- **Root Cause**: Lack of clear button in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added an instant one-click clear button (`X`) inside the schema search box.
