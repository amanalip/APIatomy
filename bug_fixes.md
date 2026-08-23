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
- **Issue**: When filtering the topology graph by node type (`endpoints` vs `schemas`), connecting edges remained rendered on the canvas across hidden nodes.
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
- **Resolution**: Added a `[key: string]: <type>` rendering row for schemas defining `additionalProperties`.

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

### Fix 74: Unused Root Tags Validation in Linter
- **Issue**: Tags defined in the root `tags` specification list that were never assigned to any endpoint operations were not surfaced to users.
- **Root Cause**: Missing tag usage tracking in `src/parser/validator.ts`.
- **Resolution**: Added a validation rule detecting unreferenced root tags and emitting informative linter diagnostics.

### Fix 75: Server URL Trailing Slash Normalization in cURL Snippets
- **Issue**: Servers ending with a trailing slash combined with leading slash endpoint paths produced malformed URLs containing duplicate slashes (`//`).
- **Root Cause**: Raw string concatenation without slash trimming in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Stripped trailing slashes from server URLs before concatenating endpoint paths.

### Fix 76: High-Contrast Parameter Schema Type Highlighting in Dark Mode
- **Issue**: Parameter schema types in the Endpoint Inspector used a muted dark-mode token (`dark:text-slate-400`), lowering visibility.
- **Root Cause**: Suboptimal Tailwind color token in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Updated parameter types to high-contrast `dark:text-blue-400`.

### Fix 77: Schemas Sidebar Header Title and Total Count Badge
- **Issue**: The left schema explorer in the Schema Viewer lacked a header title and count indicator showing the number of filtered vs total schemas.
- **Root Cause**: Missing header section in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added a header displaying `Schemas (filtered / total)` above the search input.

### Fix 78: Explicit Optional Request Body Badge
- **Issue**: Operations defining an optional request body had no visual badge distinguishing them from operations without specified bodies.
- **Root Cause**: Conditional rendering in `src/ui/EndpointDetails.tsx` only handled `required: true`.
- **Resolution**: Added an `Optional` status pill for request bodies when `required: false`.

### Fix 79: Empty Path Parameter Brackets Validation in Linter
- **Issue**: Malformed path strings containing empty parameter brackets like `/users/{}/items` were not flagged as invalid path syntax.
- **Root Cause**: Missing empty bracket regex matching in `src/parser/validator.ts`.
- **Resolution**: Added an error diagnostic rule flagging empty parameter brackets in paths.

### Fix 80: Active Tag Filter Reset Button in Endpoint Explorer
- **Issue**: When a tag filter was selected in the explorer, users had to reopen the dropdown and scroll to "All Tags" to reset the filter.
- **Root Cause**: Lack of dedicated reset control in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Added a one-click `Reset` button next to the tag selector when a tag filter is active.

### Fix 81: Renamed Mock Data View Mode Tab in Schema Inspector
- **Issue**: The inspector tab button was labeled "Mock JSON" despite supporting both JSON and YAML output formats.
- **Root Cause**: Legacy button label in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Renamed view mode button to "Mock Data".

### Fix 82: Type-Aware Query Parameter Value Defaults in cURL Generator
- **Issue**: Boolean and integer query parameters without explicit default values were populated with the string `'value'`.
- **Root Cause**: Generic string fallback in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Generated `true` for boolean parameters and `1` (or minimum constraint) for numeric parameters.

### Fix 83: Conditional Version Badge in Header
- **Issue**: Specs with undefined or missing versions rendered an empty or invalid `vundefined` badge in the application header.
- **Root Cause**: Unconditional `v{spec.version}` rendering in `src/ui/Header.tsx`.
- **Resolution**: Guarded version badge rendering behind `spec.version` existence.

### Fix 84: Blank Tag String Validation in Linter
- **Issue**: Operations containing empty or whitespace-only tag strings in `tags` were not flagged.
- **Root Cause**: Missing check for non-empty tag strings in `src/parser/validator.ts`.
- **Resolution**: Added a warning diagnostic rule detecting empty or blank tag entries.

### Fix 85: Security Scheme Type and Transport Location Badges
- **Issue**: Security requirements in the Endpoint Inspector only displayed the raw scheme name without indicating scheme type or location.
- **Root Cause**: Lack of metadata badge rendering in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Added badges indicating `apiKey (header)`, `http (bearer)`, or `oauth2` next to security names.

### Fix 86: Deprecated Schema Property Badges in Schema Inspector
- **Issue**: Schema properties flagged with `deprecated: true` did not show a deprecation indicator in the structure tree.
- **Root Cause**: Missing property deprecation rendering in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added an amber `deprecated` badge for properties marked as deprecated.

### Fix 87: Format-Aware Header Parameter Defaults in cURL Generator
- **Issue**: Header parameters expecting UUIDs or numeric formats defaulted to generic `'string'` values.
- **Root Cause**: Static string fallback in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Generated sample UUIDs and integer defaults based on header schema format and type.

### Fix 88: Method Filter Pill Total Endpoint Count Display
- **Issue**: The `ALL` method filter pill in the Endpoint Explorer did not display the total number of operations.
- **Root Cause**: Static button text in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Displayed `ALL (${endpoints.length})` on the all-methods filter pill.

### Fix 89: Duplicate Root Tag Declarations Validation in Linter
- **Issue**: Tag definitions duplicated multiple times in the root `tags` array were not flagged by the linter.
- **Root Cause**: Missing duplicate detection in `src/parser/validator.ts`.
- **Resolution**: Added a warning diagnostic rule detecting duplicate tag definitions in the root tags list.

### Fix 90: One-Click Copy Endpoint Path Action
- **Issue**: Users reviewing endpoints had no quick way to copy only the endpoint path string to clipboard.
- **Root Cause**: Lack of copy path action button in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Added a copy path button with temporary success feedback next to the path header.

### Fix 91: ReadOnly and WriteOnly Schema Property Badges
- **Issue**: Properties marked with `readOnly: true` or `writeOnly: true` omitted their access modifiers in the Schema Structure Tree.
- **Root Cause**: Missing modifier badge rendering in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added `readOnly` and `writeOnly` tags in schema property rows.

### Fix 92: SpaceDelimited and PipeDelimited Query Parameter Serialization in cURL
- **Issue**: Unexploded array query parameters were always formatted with comma delimiters regardless of `style: spaceDelimited` or `style: pipeDelimited` configurations.
- **Root Cause**: Hardcoded comma join in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Applied space (`%20`) and pipe (`|`) delimiters when specified by parameter serialization styles.

### Fix 93: Clean Success State Message in Diagnostics Drawer
- **Issue**: When an API specification had 0 errors, warnings, or info diagnostics, opening the diagnostics drawer presented a blank area without positive confirmation.
- **Root Cause**: Missing 0-diagnostics empty state check in `src/ui/DiagnosticsBar.tsx`.
- **Resolution**: Displayed an explicit green checkmark and "All checks passed!" message when the spec has 0 issues.

### Fix 94: Automatic Multipart Form-Data Mapping for File Uploads in Swagger Converter
- **Issue**: Swagger 2.0 operations defining `formData` parameters of `type: file` without explicit `consumes: ['multipart/form-data']` were converted to `application/x-www-form-urlencoded` request bodies.
- **Root Cause**: Strict check on `consumes.includes('multipart/form-data')` in `src/parser/swaggerConverter.ts`.
- **Resolution**: Detected `type: 'file'` parameters and defaulted to `multipart/form-data` request bodies.

### Fix 95: Escape Key Search Clear in Endpoint Explorer
- **Issue**: Pressing the `Escape` key inside the endpoint search input did not reset the active query.
- **Root Cause**: Missing keyboard listener in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Added `onKeyDown` listener clearing `searchQuery` when pressing `Escape`.

### Fix 96: Escape Key Search Clear in Schema Viewer
- **Issue**: Pressing the `Escape` key inside the schema search input did not reset the query.
- **Root Cause**: Missing keyboard listener in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added `onKeyDown` listener clearing `searchQuery` when pressing `Escape`.

### Fix 97: Mandatory Required Badge for Path Parameters
- **Issue**: In the Endpoint Inspector parameter table, path parameters without explicit `required: true` in the spec omitted the `req` badge despite being mandatory by OpenAPI definition.
- **Root Cause**: Condition only checked `p.required` in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Updated condition to `(p.required || p.in === 'path')`.

### Fix 98: Comprehensive cURL Generator Unit Test Suite
- **Improvement**: Added dedicated unit test suite in `tests/curlGenerator.test.ts` verifying cURL command synthesis across methods, servers, variables, delimiters (`spaceDelimited`, `pipeDelimited`), array explodes, parameter encodings, multipart forms, basic auth, and API keys.

### Fix 99: Invalid and Unsupported HTTP Method Verb Linter Diagnostic
- **Issue**: Specifications defining misspelled or non-standard HTTP method verbs in path items were not flagged with validation warnings.
- **Root Cause**: Missing verification against valid HTTP methods in `src/parser/validator.ts`.
- **Resolution**: Added a validation rule detecting invalid HTTP verbs and emitting warning diagnostics.

### Fix 100: Property Default and Example Value Badges in Schema Inspector
- **Issue**: Schema properties declaring `default` or `example` values did not show these annotations in structure tree rows.
- **Root Cause**: Lack of rendering elements in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added `default: <val>` and `example: <val>` badges under property rows.

### Fix 101: Global Keyboard Shortcut to Focus Endpoint Search
- **Issue**: Users navigating the Explorer had no quick keyboard shortcut to focus the endpoint search box.
- **Root Cause**: Lack of global key event handler in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Added `/` and `Cmd+K` / `Ctrl+K` key handlers focusing the search input.

### Fix 102: Quote Character Sanitization in cURL Header Values
- **Issue**: Header parameters containing quote characters broke generated cURL shell commands.
- **Root Cause**: Unescaped string interpolation in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Escaped internal double quotes in header values.

### Fix 103: Comprehensive AST Normalizer Unit Test Suite
- **Improvement**: Added dedicated AST normalizer test suite in `tests/normalizer.test.ts` verifying graph node schema reference tracking, response parsing, and server normalization.

### Fix 104: Escape Key Dismissal in Diagnostics Bar Drawer
- **Issue**: Pressing `Escape` while the diagnostics drawer was expanded did not collapse the drawer.
- **Root Cause**: Missing keyboard event listener in `src/ui/DiagnosticsBar.tsx`.
- **Resolution**: Added `useEffect` listening for `Escape` when `isOpen` is active.

### Fix 105: Escape Key Dismissal in Endpoint Details Panel
- **Issue**: Pressing `Escape` while inspecting an endpoint did not close the details drawer.
- **Root Cause**: Missing keyboard event listener in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Added `useEffect` invoking `onClose()` on `Escape` keypress.

### Fix 106: Escape Key Dismissal in Header Sample Dropdown and Navigation
- **Issue**: Pressing `Escape` while sample specs dropdown or mobile nav was open did not dismiss the menus.
- **Root Cause**: Click-outside handler in `src/ui/Header.tsx` did not listen for key events.
- **Resolution**: Added `keydown` listener dismissing open menus on `Escape`.

### Fix 107: Missing Root Paths Object Linter Validation
- **Issue**: Specifications completely missing the root `paths` object were not flagged with an actionable error diagnostic.
- **Root Cause**: Missing check for `rawDoc.paths` presence in `src/parser/validator.ts`.
- **Resolution**: Added error diagnostic rule when root `paths` is missing or invalid.

### Fix 108: Comprehensive Dagre Graph Layout Unit Test Suite
- **Improvement**: Added dedicated test suite in `tests/graphLayout.test.ts` verifying node positions, edge types (`produces`, `consumes`), schema reuse metrics, and direction configs (`LR`, `TB`).

### Fix 109: Query String in Path Template Linter Diagnostic
- **Issue**: Path items containing query parameters directly in the path template string (e.g. `/users?id={id}`) were not flagged with validation warnings.
- **Root Cause**: Missing query string check on path keys in `src/parser/validator.ts`.
- **Resolution**: Added a validation rule detecting `?` in path strings and recommending defining query parameters in `parameters`.

### Fix 110: Smooth Scroll Into View on Active Endpoint Selection
- **Issue**: Selecting an endpoint from the topology graph or diagnostics drawer did not scroll the item into view within the Explorer sidebar.
- **Root Cause**: Missing ref and scroll-into-view effect in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Attached dynamic ref to the active endpoint item with smooth scroll on selection change.

### Fix 111: Smooth Scroll Into View on Active Schema Selection
- **Issue**: Selecting a schema via reference navigation or graph click did not scroll the active schema row into view.
- **Root Cause**: Missing ref and scroll-into-view effect in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Attached dynamic ref to the active schema button with smooth scroll on selection change.

### Fix 112: Query Parameter Key and Value URL Encoding in cURL Generator
- **Issue**: Query parameter keys with special characters were not URL-encoded in generated cURL queries.
- **Root Cause**: Parameter names were interpolated directly in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Wrapped query parameter names in `encodeURIComponent`.

### Fix 113: Keyboard Shortcut for Code Editor Toggle
- **Issue**: Users lacked a fast keyboard shortcut to toggle the code editor pane on and off.
- **Root Cause**: Lack of keyboard listener in `src/ui/Header.tsx`.
- **Resolution**: Added `Alt+E` shortcut to toggle the editor pane and updated the button tooltip.

### Fix 114: Comprehensive OpenAPI Validator Unit Test Suite
- **Improvement**: Added dedicated test suite in `tests/validator.test.ts` testing path query string checks, missing paths objects, missing info objects, empty parameter brackets, and invalid HTTP verbs.

### Fix 115: Duplicate Path Parameter Placeholder Linter Validation
- **Issue**: Path strings containing repeated identical parameter placeholders like `/users/{id}/friends/{id}` were not flagged.
- **Root Cause**: Missing duplicate parameter check within path template strings in `src/parser/validator.ts`.
- **Resolution**: Added a validation rule detecting duplicate placeholder names and emitting warning diagnostics.

### Fix 116: Response Header Schema Format Badges in Endpoint Inspector
- **Issue**: Response header rows in the Endpoint Inspector displayed schema types but omitted schema format specifiers (e.g. `date-time`, `uuid`).
- **Root Cause**: Lack of format rendering in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Displayed format tags `<format>` alongside header types.

### Fix 117: Structured Details for Empty Schema Objects
- **Issue**: Schema definitions with no explicit properties or composition branches rendered an empty unstyled box.
- **Root Cause**: Minimal fallback branch in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added a styled container displaying type, format, descriptions, defaults, and examples for leaf schemas.

### Fix 118: Comprehensive YAML / JSON Parser Engine Unit Test Suite
- **Improvement**: Added dedicated test suite in `tests/yamlJson.test.ts` testing JSON object parsing, root array rejection, YAML parsing, syntax error positions, and empty document handling.

### Fix 119: Contact Email Format Linter Validation
- **Issue**: Malformed contact email addresses in `info.contact.email` were accepted without linting feedback.
- **Root Cause**: Missing email regex check in `src/parser/validator.ts`.
- **Resolution**: Added validation emitting informative diagnostics for invalid contact emails.

### Fix 120: Deprecated Parameter Tooltip for Accessibility
- **Issue**: The `dep` badge on deprecated parameters lacked descriptive tooltip text explaining its meaning.
- **Root Cause**: Missing title attribute on badge in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Added an explanatory title attribute on the deprecation badge.

### Fix 121: Upper-Bound Maximum Constraint Aware Defaults in cURL Generator
- **Issue**: Numeric parameters with `maximum < 1` (e.g. negative numbers or 0) defaulted to `1`, violating the maximum constraint.
- **Root Cause**: Hardcoded fallback to `1` in `src/ui/CurlGenerator.tsx`.
- **Resolution**: Checked `schema.maximum` when setting fallback sample numeric values.

### Fix 122: One-Click Copy Schema AST Action in Schema Viewer
- **Issue**: Developers reviewing schemas had to switch to mock data or code editor to inspect the full schema definition.
- **Root Cause**: Lack of copy AST button in `src/ui/SchemaViewer.tsx`.
- **Resolution**: Added a `Copy AST` action button in the Schema Viewer toolbar with temporary copied feedback.

### Fix 123: Comprehensive Built-in Sample Specifications Unit Test Suite
- **Improvement**: Added dedicated test suite in `tests/sampleSpecs.test.ts` verifying parsing, error free processing, polymorphic schema resolution, and diagnostics generation across Petstore, GitHub, Stripe, Minimal, and Broken sample specifications.

### Fix 124: Comprehensive HTTP Methods and Status Categories Test Suite
- **Improvement**: Added dedicated test suite in `tests/httpMethods.test.ts` testing method configurations, color tokens, and status code categorizations.

### Fix 125: Wildcard and Case-Insensitive Status Code Categorization
- **Issue**: Status strings such as `2XX`, `2xx`, `4XX`, and `4xx` in `getStatusCategory` fell back to default status formatting.
- **Root Cause**: Strict numeric parsing without wildcard mapping in `src/model/httpMethods.ts`.
- **Resolution**: Added pattern matching mapping wildcard status tokens to their respective categories.

### Fix 126: Info License Object Name Validation
- **Issue**: Info license objects lacking the required `name` property were not flagged.
- **Root Cause**: Missing license validation check in `src/parser/validator.ts`.
- **Resolution**: Added validation requiring `info.license.name` to be a non-empty string.

### Fix 127: License URL Protocol Validation
- **Issue**: License URLs with non-HTTP protocols or invalid URL schemes were accepted without linter feedback.
- **Root Cause**: Missing protocol check in `src/parser/validator.ts`.
- **Resolution**: Added validation checking that `info.license.url` uses valid `http://` or `https://` protocols.

### Fix 128: Clear All Filters Button in Explorer Empty State
- **Issue**: When search or tag filters yielded 0 results, users had to manually reset each individual filter.
- **Root Cause**: Lack of batch filter reset action in `src/ui/EndpointExplorer.tsx`.
- **Resolution**: Added a one-click `Clear all filters` button in the empty search view.

### Fix 129: Duplicate Operation Tag Declaration Linter Diagnostic
- **Issue**: Operations declaring identical tag names multiple times in `op.tags` were not flagged.
- **Root Cause**: Missing duplicate tag check per operation in `src/parser/validator.ts`.
- **Resolution**: Added a validation rule detecting duplicate operation tags.

### Fix 130: Logical Parameter Sorting by Transport Location
- **Issue**: Parameters in the Endpoint Inspector appeared in arbitrary specification order.
- **Root Cause**: Direct iteration of unordered array in `src/ui/EndpointDetails.tsx`.
- **Resolution**: Sorted parameters logically by location (`path` first, then `query`, `header`, `cookie`).

### Fix 131: One-Click Copy Diagnostics Action in Diagnostics Drawer
- **Issue**: Developers had no quick way to copy the full list of errors and warnings as text.
- **Root Cause**: Lack of batch copy control in `src/ui/DiagnosticsBar.tsx`.
- **Resolution**: Added a `Copy` diagnostics button with temporary copied feedback.

### Fix 132: Comprehensive PNG Graph Export Unit Test Suite
- **Improvement**: Added dedicated test suite in `tests/exportPng.test.ts` verifying graph canvas element targeting, anchor download triggers, and error recovery during image rendering.

### Fix 133: Comprehensive Schema Mock Data Generator Unit Test Suite
- **Improvement**: Extracted `generateMockData` into modular engine [`src/model/mockGenerator.ts`](file:///home/amanap/Documents/GitHub/APIatomy/src/model/mockGenerator.ts) and added dedicated test suite [`tests/mockGenerator.test.ts`](file:///home/amanap/Documents/GitHub/APIatomy/tests/mockGenerator.test.ts) testing format mock generation, arrays, compositions, and recursive reference resolution.

### Fix 134: Extended Schema Format Mock Support for IPv6, Time, Byte, and Binary
- **Issue**: Schema definitions specifying formats `ipv6`, `time`, `byte`, or `binary` fell back to generic strings in generated mock payloads.
- **Root Cause**: Missing format handlers in mock data generator.
- **Resolution**: Added realistic mock payload values for `ipv6`, `time`, `byte`, and `binary` formats.

### Fix 135: Alt+E Keyboard Shortcut Stale Closure in Header
- **Issue**: After toggling the editor via click, pressing `Alt+E` would not correctly toggle because the handler closed over initial `isEditorOpen` value due to empty dependency array in `src/ui/Header.tsx:58-66`.
- **Root Cause**: Handler used `setIsEditorOpen(!isEditorOpen)` with stale closure; effect had `[]` deps, never updating closure.
- **Resolution**: Introduced `isEditorOpenRef` updated via effect and changed handler to `setIsEditorOpen(!isEditorOpenRef.current)` with `setIsEditorOpen` in deps.

### Fix 136: cURL Generator Duplicate Placeholder Substitution for Repeated Path Params and Server Variables
- **Issue**: Path templates like `/{id}/friends/{id}` and server URLs with repeated variables (e.g. `https://{env}.example.com/{env}`) only substituted the first occurrence using `String.replace` in `src/ui/CurlGenerator.tsx:22-27,41`.
- **Root Cause**: `String.replace` replaces only first match without global flag.
- **Resolution**: Replaced via `split('{var}').join(value)` (equivalent to `replaceAll`) for both server variables and path parameters, ensuring all occurrences are substituted.

### Fix 137: HashChange Listener Stale RawText and Re-subscription in App
- **Issue**: `App.tsx:46-60` subscribed to `hashchange` with `[rawText]` deps, recreating listener on every keystroke and holding stale `rawText` closure, causing race conditions when URL hash changed while typing.
- **Root Cause**: Effect dependency on mutable `rawText` state.
- **Resolution**: Added `rawTextRef` synced via `useEffect` and changed listener to compare `decompressed !== rawTextRef.current` with empty deps, preventing stale closure and excessive re-subscriptions.

### Fix 138: Diagnostics Clipboard Fallback for Insecure Contexts
- **Issue**: `src/ui/DiagnosticsBar.tsx:27-35` used `navigator.clipboard.writeText` directly without await/catch, silently failing on `http` (non-secure) contexts; `src/share/urlHash.ts` already had fallback via `execCommand`.
- **Root Cause**: Inconsistent clipboard handling; no fallback to `copyTextToClipboard`.
- **Resolution**: Imported `copyTextToClipboard` and made `handleCopyDiagnostics` async with success check and feedback.

### Fix 139: PNG Export Anchor DOM Append for Firefox/Safari Compatibility
- **Issue**: `src/graph/exportPng.ts:30-33` created an anchor and called `click()` without appending to DOM, failing on Safari/Firefox; also retained `quality:0.95` ignored for PNG and leaked unremoved elements.
- **Root Cause**: Missing DOM append and cleanup guard.
- **Resolution**: Added conditional `style.display='none'`, `document.body.appendChild(link)` guard, click, and timed `removeChild` cleanup with safe try/catch; made code resilient to test mocks missing `body`.

### Fix 140: Topology Graph Supplemental References (`additionalProperties` and `not`) Missing in Dagre Edges
- **Issue**: Schema-to-schema edges omitted `additionalProperties` map refs and `not` composition refs, e.g. `Outer` with `additionalProperties: {$ref: '#/components/schemas/Inner'}` produced no edge in `src/layout/graphLayout.ts:187-212`.
- **Root Cause**: `collectChildSchemaNames` handled only `refTarget`, `properties`, `items`, `allOf/oneOf/anyOf`, missing `additionalProperties` and `not`.
- **Resolution**: Added typed handling for `additionalProperties` (object) and `not`, plus improved signature `SchemaModel | null` instead of `any`, importing `SchemaModel`.

### Fix 141: Mock Generator Depth Truncation Type Mismatch and Integer Max Bound
- **Issue**: `src/model/mockGenerator.ts:8` returned string `'...'` for any deep schema (`depth>4`), causing type mismatch when callers expected `object`/`array`; integer generation ignored `maximum <1` constraint (e.g. `maximum: -5` still returned `1`).
- **Root Cause**: Generic fallback without type awareness.
- **Resolution**: Depth guard now returns type-aware placeholder (`{}` for object, `[]` for array, `0`/`false` for numeric/boolean, `'...'` only for string); integer/number branches now respect `maximum <1`.

### Fix 142: ThemeContext Inconsistent Media Query Initialization
- **Issue**: Initial theme probe used `window.matchMedia('(prefers-color-scheme: light)').matches` while listener used `'(prefers-color-scheme: dark)'`, risking divergent logic and double negation confusion in `src/theme/ThemeContext.tsx:14-31`.
- **Root Cause**: Inconsistent query strings.
- **Resolution**: Unified both to `'(prefers-color-scheme: dark)'` with ternary `matches ? 'dark' : 'light'`.

### Fix 143: Vitest Environment Misconfigured as Node for DOM Tests
- **Issue**: `vitest.config.ts:7` set `environment: 'node'`, requiring manual `vi.stubGlobal('document')` mocks in `exportPng.test.ts`; hides real DOM failures and prevents `jsdom` APIs.
- **Root Cause**: Wrong environment for React/DOM project.
- **Resolution**: Changed to `environment: 'jsdom'` and installed `jsdom` devDependency.

### Fix 144: Header View Switcher Code Duplication (DRY Improvement)
- **Improvement**: Refactored `src/ui/Header.tsx:133-222` desktop and mobile view switcher from triplicated button blocks to single DRY mapped config array `[{id,label,Icon}]`, eliminating duplication and easing future method additions.

### Fix 145: Graph Layout Type Safety Improvement
- **Improvement**: Updated `src/layout/graphLayout.ts` to import `SchemaModel` and type `collectChildSchemaNames(schema: SchemaModel | null)` instead of `any`, improving strictness.

### Fix 146: Curl Sample JSON Generation DRY via MockGenerator Reuse
- **Improvement**: Refactored `src/ui/CurlGenerator.tsx:259-308` to delegate `generateSampleJsonFromSchema` to central `generateMockData` engine, removing duplicated string/array/object branching and ensuring consistent mock payloads across curl and schema viewer.

### Fix 147: EditorPane Debounce Stale onChange Closure
- **Issue**: `src/ui/EditorPane.tsx:66-73` debounce closure captured initial `onChange` prop; format toggle recreated editor with stale handler.
- **Root Cause**: Missing ref for `onChange`.
- **Resolution**: Added `onChangeRef` synced via effect and used `onChangeRef.current` inside debounce timer.

### Fix 148: Comprehensive Bug-Fix Verification Test Suite
- **Improvement**: Added `tests/bugFixVerification.test.ts` covering duplicate placeholder/server-variable replacement, graph additionalProperties/not edges, mockGenerator depth type-aware placeholders and integer max bounds, jsdom environment availability, diagnostics clipboard fallback, and header DRY view counts.

### Fix 149: Topology Graph Edge Visibility Stale Closure Race on Filtering
- **Issue**: Filtering the topology canvas by type (`endpoints` vs `schemas`) or tag left connecting edges visible because `hiddenNodeIds` was mutated inside the `setNodes` updater callback and read synchronously via `setEdges` before React had flushed the state update, causing edges to remain unhidden (`src/graph/TopologyGraph.tsx:86-141`).
- **Root Cause**: Shared mutable `Set` populated as side-effect inside `setNodes(prev => prev.map(...))` and immediately reused for `setEdges`, relying on updater execution order which is not guaranteed under concurrent rendering.
- **Resolution**: Recomputed `hiddenIds` deterministically from `initialNodes` (source of truth) before calling state setters, then applied the same set to both `setNodes` (via `prev => prev.map` with `hiddenIds.has`) and `setEdges`, eliminating the race and adding `initialNodes` to deps.

### Fix 150: cURL Generator Server URL Stale After Spec Change
- **Issue**: After loading a new spec with different `servers`, the selected server dropdown retained the previous spec's URL because `selectedServerUrl` was initialized once from `servers[0]` and never synchronized (`src/ui/CurlGenerator.tsx:12-16`).
- **Root Cause**: Missing effect to resync `selectedServerUrl` when `servers` prop changes.
- **Resolution**: Added `useEffect` syncing `selectedServerUrl` to `servers[0].url` when current selection no longer exists in the new servers list.

### Fix 151: Endpoint Details Path Copy Missing Clipboard Fallback
- **Issue**: Copying the endpoint path used `navigator.clipboard.writeText` directly, failing in insecure (`http`) contexts or when clipboard API is unavailable (`src/ui/EndpointDetails.tsx:41-45`).
- **Root Cause**: Inconsistent clipboard handling vs `DiagnosticsBar` and `CurlGenerator` which used `copyTextToClipboard`.
- **Resolution**: Imported `copyTextToClipboard` and made `handleCopyPath` async with success-guarded feedback.

### Fix 152: Graph Layout Ignoring LayoutOptions Dimensions
- **Issue**: `computeApiTopologyGraph` accepted `LayoutOptions {nodeWidth, nodeHeight}` but always called `dagreGraph.setNode(..., {width:280,height:90})` and `{width:240,height:80}` hardcoded, ignoring caller-provided sizes (`src/layout/graphLayout.ts:46-53,122`).
- **Root Cause**: Hardcoded literals instead of using `options.nodeWidth/nodeHeight`.
- **Resolution**: Derived `endpointWidth = options.nodeWidth`, `endpointHeight = options.nodeHeight`, `schemaWidth = max(180, nodeWidth-40)`, `schemaHeight = max(60, nodeHeight-10)` and used them for `setNode` and layout fallback, allowing callers (`TopologyGraph` passes `280x90`) and tests to control spacing.

### Fix 153: Validator Missing Duplicate Detection Across Path-Level and Operation-Level Parameters
- **Issue**: Duplicate parameter validation only inspected `opItem.parameters`, missing collisions where the same `name+in` appeared at both path-item and operation levels (e.g., path defines `id` in `path` and operation redefines same), leading to silent shadowing (`src/parser/validator.ts:296-323`).
- **Root Cause**: Check ignored `pathItem.parameters`.
- **Resolution**: Added `checkParams` helper iterating path-level params first then operation params into a shared `rawSeen` set, emitting duplicate diagnostics with source tag `path-level` / `path vs operation`.

### Fix 154: URL Hash Decompression Fails With Trailing Query Params
- **Issue**: `decompressSpecFromHash('#spec=<compressed>&foo=bar')` incorrectly sliced `specEncoded = cleanHash.slice(5)` which retained `&foo=bar` in the compressed payload, causing `decompressFromEncodedURIComponent` to fail and returning `null` (`src/share/urlHash.ts:9-26`).
- **Root Cause**: Manual `slice(5)` without stripping trailing `&`-delimited params.
- **Resolution**: Parse via `URLSearchParams` first when `spec=` present, falling back to `raw.split('&')[0]` when needed, ensuring extra params are ignored.

### Fix 155: cURL Generator Extracted to Pure Testable Helper (Code Quality)
- **Improvement**: Refactored `src/ui/CurlGenerator.tsx` to extract pure `buildCurlCommand(endpoint, selectedServerUrl, activeServer)` and `generateSampleJsonFromSchema` exports, reducing the `useMemo` closure to a single delegation, improving testability and reusability.

### Fix 156: Advanced Quality & Feature Test Suite
- **Improvement**: Added `tests/advancedQuality.test.ts` covering (1) server variable all-occurrences replacement, (2) duplicate path placeholder replacement, (3) space/pipe delimited array query serialization, (4) layout options width sensitivity, (5) validator cross-level duplicate detection, and (6) robust URL hash decompression with extra params.

### Fix 157: YAML Parser Format Mislabel on JSON Fallback
- **Issue**: When strict `JSON.parse` failed on JSON-looking content (e.g. relaxed JSON `{ a: 1 }`), the YAML fallback still returned `format: 'json'` based on `looksLikeJson`, misrepresenting actual parser used (`src/parser/yamlJson.ts:93-96`).
- **Root Cause**: Hardcoded ternary `looksLikeJson ? 'json' : 'yaml'` after YAML parse success.
- **Resolution**: Return `format: 'yaml'` for all YAML-fallback paths; strict JSON success remains the only `json` path, ensuring correct editor language and diagnostics.

### Fix 158: Reference Resolver Circular Detection Encoding Mismatch and Cache Mutation
- **Issue**: Circular check compared raw `$ref` (potentially URI-encoded like `#/components/schemas/My%20Schema`) against canonical `#/components/schemas/My Schema` via `extractRefTargetName` decoded value, missing circular detection; cache returned shallow `...cached` sharing `properties`/`items` refs allowing mutation to leak (`src/parser/refResolver.ts:68-88`).
- **Root Cause**: Missing `decodeURIComponent` normalization and deep clone of cached structures.
- **Resolution**: Added `normalizedRef = decodeURIComponent(ref)` check alongside raw and canonical, and clone `properties`/`items` on cache return.

### Fix 159: Normalizer VisitingPath Leak on Exception
- **Issue**: `visitingPath.delete(canonicalRef)` placed after `resolveSchema` without `finally`; if `resolveSchema` threw, the set retained stale entry causing false circular positives for subsequent schemas (`src/parser/normalizer.ts:92-98`).
- **Root Cause**: Missing try/finally guard.
- **Resolution**: Wrap in `try { resolve } catch { ... } finally { delete }` to guarantee cleanup.

### Fix 160: Swagger Converter Strict Version Check and Circular Rewrite Stack Overflow
- **Issue**: `isSwagger2` checked `swagger === '2.0' || '2.0.0'` only, missing numeric `2` and `2.x` variants; `rewriteSwaggerRefs` recursed without visited-set, causing `RangeError: Maximum call stack` on circular YAML anchors (`src/parser/swaggerConverter.ts:3-4,311-337`).
- **Root Cause**: Over-strict equality and unbounded recursion.
- **Resolution**: Updated `isSwagger2` to handle `number` and `startsWith('2.')`; added `WeakSet<object>` visited guard to `rewriteSwaggerRefs`.

### Fix 161: Validator False Positive on `x-` Extension Keys
- **Issue**: Path-level keys starting with `x-` (valid OpenAPI extensions) were flagged as `invalid-http-method` warnings (`src/parser/validator.ts:165`).
- **Root Cause**: `PATH_LEVEL_KEYS` omitted extension prefix check.
- **Resolution**: Added `if (opKey.startsWith('x-')) continue` before method validation.

### Fix 162: Mock Generator Shared Array Reference Mutation
- **Issue**: `generateMockData` for arrays created one `itemData` object and reused reference across `count` elements via `Array.from(() => itemData)`; mutating one element mutated all (`src/model/mockGenerator.ts:84-89`).
- **Root Cause**: Single instance reuse.
- **Resolution**: Generate per-element via `JSON.parse(JSON.stringify(item))` clone when object/array, ensuring distinct instances.

### Fix 163: Mock Generator OpenAPI 3.1 Nullable Array Type Support
- **Issue**: `schema.type` in OAS 3.1 can be `['string','null']` array; depth guard `schema.type === 'object'` failed, returning `'...'` string where `null` expected, and string/integer checks missed nullable variants (`src/model/mockGenerator.ts:8-14,53-88`).
- **Root Cause**: Strict string equality.
- **Resolution**: Added `normalizeType` helper extracting non-null type from array; depth guard and type branches use `normType`, supporting 3.1 union types.

### Fix 164: Graph Layout Dagre Multigraph Edge Overwrite and Layout Crash
- **Issue**: `new dagre.graphlib.Graph()` defaults `multigraph:false`; second `setEdge(endpoint, schema)` for `produces` overwrote `consumes` edge metadata and layout lost one edge; `dagre.layout` on circular graphs could throw uncaught (`src/layout/graphLayout.ts:16-20,172`).
- **Root Cause**: Missing `multigraph:true` and try/catch.
- **Resolution**: Instantiate with `{ multigraph:true }` and wrap `dagre.layout` in try/catch with warning fallback.

### Fix 165: PNG Export Filter Missed SVG Toolbars
- **Issue**: Export filter checked `node instanceof HTMLElement` only, missing `SVGElement` panels; SVG ReactFlow controls appeared in PNG, and toolbar SVGs not filtered (`src/graph/exportPng.ts:16-27`).
- **Root Cause**: Narrow instanceof check.
- **Resolution**: Broaden to `node instanceof Element` with `classList.contains` guard, handling both HTML and SVG elements.

### Fix 166: cURL Generator Header Shell Injection and Cookie Encoding Gaps
- **Issue**: Header sanitization only escaped `"`, missing `\`, `$`, `` ` `` shell metachars; cookie values not URL-encoded; security handling only emitted first `security[0]` ignoring multi-auth; content-type selection took first entry even when `application/xml` preceded `json` (`src/ui/CurlGenerator.tsx:179,185,198,210`).
- **Root Cause**: Incomplete escaping and single-scheme logic.
- **Resolution**: Escape `\\`, `"`, `$`, `` ` ``; `encodeURIComponent` cookie name/value; iterate all unique security schemes; prefer `json` content type via `find`.

### Fix 167: URL Hash Decoding Case-Sensitivity
- **Issue**: `decodeURIComponent` fallback checked `decoded.includes('openapi')` case-sensitively, missing `OpenAPI` capitalized specs and raw `{` JSON detection via `startsWith` whitespace (`src/share/urlHash.ts:50-57`).
- **Root Cause**: Case-sensitive string check.
- **Resolution**: Added `toLowerCase()` comparison and `trim().startsWith('{')` handling.

### Fix 168: Validator `default` Success Handling Preserved (Reverted)
- **Issue**: Attempted change to remove `default` from `hasSuccessResponse` conflicted with established Fix 49 which treats `default` as covering success to avoid false positives; reverted to original inclusive logic (`src/parser/validator.ts:264`).
- **Root Cause**: Previous edit introduced regression against Fix 49.
- **Resolution**: Restored `code === '2xx' || code === 'default'` as success, documented as intentional; test updated to verify 0 missing-2xx for default.

### Fix 169: Validator Empty Schema Check Missed `refTarget`
- **Issue**: `!schemaObj.$ref` check missed schemas already resolved where `refTarget` is set but `$ref` may be rewritten or missing, incorrectly flagging referenced schemas as empty (`src/parser/validator.ts:372-385`).
- **Root Cause**: Checked raw `$ref` not normalized `refTarget`.
- **Resolution**: Added `hasRef = !!(schemaObj.$ref || schemaObj.refTarget)` and updated primitive check to handle array type joins.

### Fix 170: ThemeContext Safari Compatibility (Light Class Preserved)
- **Issue**: `mediaQuery.addEventListener` fails on Safari <14 which uses `addListener` (`src/theme/ThemeContext.tsx:31-52`).
- **Root Cause**: Missing fallback.
- **Resolution**: Added `addListener/removeListener` fallback; preserved original `light` class addition on `theme === 'light'` to avoid regression (owner `amanalip` repo expects light class for styling).

### Fix 171: App Root `select-none` Blocked Copy and Resize Leak
- **Issue**: Root div had `select-none` preventing text selection/copy of endpoint paths and diagnostics; split-pane resize added `mousemove`/`mouseup` listeners but leaking if component unmounted mid-drag; `parseApiSpec` could throw unhandled crashing app (`src/App.tsx:34,67,114`).
- **Root Cause**: Overbroad CSS utility, missing cleanup and error boundary.
- **Resolution**: Removed `select-none` from root, added unmount `useEffect` cleanup for resizing flag, wrapped `parseApiSpec` in try/catch with fallback minimal spec.

### Fix 172: Editor Response Sort and Table Keys (Focus Guard Reverted)
- **Issue**: `EndpointDetails` response sort parsed `2XX` as `2` misordering, and table rows used `key={`${p.in}-${p.name}`}` colliding on duplicates (`src/ui/EndpointDetails.tsx:359-366,236`). Previous attempt added `hasFocus` guard in EditorPane which blocked sample/spec updates while focused, causing stale content (`src/ui/EditorPane.tsx:127`).
- **Root Cause**: Naive `parseInt` on wildcard codes, non-unique keys; over-eager focus guard introduced regression.
- **Resolution**: Reverted focus guard to original unconditional sync; normalized `2xx→200` and `default→9999` in sort comparator; changed row key to include index `${p.in}-${p.name}-${idx}`.

### Fix 173: Topology Graph FitView Timer Leak and Accessibility
- **Issue**: `setTimeout(() => fitView)` had no cleanup, calling `fitView` on unmounted component; toolbar inputs/buttons lacked `aria-label`/`aria-pressed`, and filter/search controls inaccessible to screen readers (`src/graph/TopologyGraph.tsx:78-84,181,241`).
- **Root Cause**: Missing `clearTimeout` and a11y attributes.
- **Resolution**: Stored timer and returned `clearTimeout` cleanup; added `aria-label` to search input, `aria-label/aria-pressed` to layout/export buttons.

### Fix 174: Endpoint Explorer Keyboard Accessibility & Normalizer AdditionalProperties Refs
- **Issue**: Endpoint cards used `<div onClick>` without `role="button"`, `tabIndex`, or key handlers blocking keyboard navigation (WCAG 2.1.1); `collectRefsFromSchema` in normalizer omitted `additionalProperties` and `not` refs, missing graph edges for map schemas (`src/ui/EndpointExplorer.tsx:265, src/parser/normalizer.ts:403`).
- **Root Cause**: Div-as-button anti-pattern and incomplete ref traversal.
- **Resolution**: Added `role="button" tabIndex=0 onKeyDown` (Enter/Space) and `aria-selected`; extended `collectRefsFromSchema` to traverse `additionalProperties` objects and `not`.

### Fix 175: Comprehensive Fix-Coverage Test Suite
- **Improvement**: Added `tests/fixCoverage.test.ts` with 11 tests verifying yamlJson format, Swagger 2 numeric version handling, circular rewrite safety, `x-` extension exemption, `default` not as 2xx, array mock distinct instances, OAS 3.1 nullable types, cURL sanitization/cookie encoding/multi-security, JSON-preferred body, multigraph edges, and empty-schema `refTarget` correctness.

### Fix 176: GitHub Link Ownership Preserved
- **Issue**: Previous edit incorrectly changed GitHub link to `anomalyco/APIatomy`; owner is `amanalip` per user clarification.
- **Resolution**: Reverted to `https://github.com/amanalip/APIatomy` and verified; added note that `anomalyco` is OpenCode contributor, not repo owner.

### Fix 177: TRACE Method Missing from Endpoint Explorer Filter Pills
- **Issue**: Explorer method filter pill bar defined `methodsList` as `['all','get','post','put','patch','delete','options','head']` omitting `trace` even though `src/model/httpMethods.ts` defines `TRACE` with accent `#ec4899` and `src/parser/normalizer.ts` accepts `trace` as valid method (`src/ui/EndpointExplorer.tsx:124`).
- **Root Cause**: Hardcoded truncated array after Fix 27 (which added options/head but missed trace).
- **Resolution**: Extended `methodsList` to `['all','get','post','put','patch','delete','options','head','trace']`; verified `parseApiSpec` parses `trace` and filter correctly returns 1 endpoint.

### Fix 178: Response Status Wildcard Sorting Incomplete in EndpointDetails
- **Issue**: Response sort comparator in `src/ui/EndpointDetails.tsx:359-368` only normalized `2xx` and `default`, so `1xx`/`3xx`/`4xx`/`5xx` fell through to `parseInt('4xx',10)=4` sorting before `200`, producing incorrect order `4xx < 200`.
- **Root Cause**: Incomplete `norm()` mapping after Fix 72 response sort.
- **Resolution**: Added explicit branches for `1xx→100, 3xx→300, 4xx→400, 5xx→500` alongside existing `2xx`/`default`, ensuring correct numeric ordering `1xx < 2xx < 3xx < 4xx < 5xx < default`.

### Fix 179: `collectSchemaRefs` Missing `additionalProperties` and `not` Traversal
- **Issue**: `src/parser/refResolver.ts:198-228` `collectSchemaRefs` traversed `properties`, `items`, `allOf/oneOf/anyOf` but omitted `additionalProperties` map refs and `not` composition, so analytics / reuse counts missed dictionary schemas (`Outer` with `additionalProperties: {$ref: '#/components/schemas/Inner'}`).
- **Root Cause**: Incomplete recursion parity with `src/layout/graphLayout.ts:214-228` and `src/parser/normalizer.ts:416-431` which already handle those fields.
- **Resolution**: Added `if (s.additionalProperties && typeof s.additionalProperties === 'object') collectSchemaRefs(s.additionalProperties)` and `if (s.not) collectSchemaRefs(s.not)` branches.

### Fix 180: Swagger Converter Over-Eager String Rewrite
- **Issue**: `rewriteSwaggerRefs` in `src/parser/swaggerConverter.ts:314-344` rewrote *any* string starting with `#/definitions/` regardless of context, mutating example string values like `example: "#/definitions/Foo"` into `#/components/schemas/Foo` (`src/parser/swaggerConverter.ts:315`).
- **Root Cause**: `typeof obj === 'string'` branch had no parent-key guard.
- **Resolution**: Added `parentKey` param threaded through array/object recursion; only rewrite when `parentKey === '$ref'`, preserving example data. Added WeakSet cycle guard already, retained.

### Fix 181: Server Variable Replacement `|| 'default'` Empty-String and Enum Fallback
- **Issue**: `src/ui/CurlGenerator.tsx:100-104` used `(varDef as any).default || 'default'` which treated empty-string default as falsy and ignored `enum` alternatives, producing `https://default.example.com` instead of using `enum[0]`.
- **Root Cause**: Logical OR without empty-string check and no enum fallback.
- **Resolution**: Compute `defVal = (varDef as any)?.default`; `replacement = defVal !== undefined && String(defVal).trim() !== '' ? String(defVal) : (varDef as any)?.enum?.[0] ?? 'default'`; ensures enum precedence and correct handling.

### Fix 182: Validator Empty-Schema False Positive for Map and `not` Schemas
- **Issue**: `src/parser/validator.ts:369-387` empty-schema rule checked `hasProps`, `hasComposition` (`allOf/oneOf/anyOf`), `hasItems`, primitives and `hasRef`, but flagged valid map schemas (`additionalProperties: {type: string}`) and `not: {type: string}` as empty (`src/parser/validator.ts:372`).
- **Root Cause**: Missing `hasAdditional` and `not` in composition check.
- **Resolution**: Added `hasAdditional = !!schemaObj.additionalProperties` and extended `hasComposition` to include `(schemaObj as any).not`; guard now `!hasProps && !hasComposition && !hasItems && !hasAdditional && !isPrimitive && !hasRef`.

### Fix 183: Code Quality — Mock Generator AdditionalProperties Sample Support
- **Improvement**: Enhanced `src/model/mockGenerator.ts:98-107` to generate realistic mock samples for `additionalProperties` dictionary schemas, returning `{ additionalProp: <mock> }` alongside normal properties and for pure map schemas.

### Fix 184: Code Quality — Editor Format Detection Dynamic
- **Improvement**: Updated `src/App.tsx:153-158` to pass `format` to `EditorPane` dynamically based on `spec.originalFormat` and `rawText.trim().startsWith('{')`, ensuring JSON specs get JSON syntax highlighting instead of forced YAML.

### Fix 185: Code Quality — Swagger Rewrite Parent-Key Context Typing
- **Improvement**: Refactored `rewriteSwaggerRefs` signature to `(obj, seen, parentKey?)` with explicit `string | undefined` typing and propagated through array/object branches, improving type safety and documenting intent.

### Fix 186: Code Quality — Endpoint Explorer Methods List as Constant with Trace
- **Improvement**: Centralized `methodsList` includes `trace` and is now used consistently for pill rendering and filtering, eliminating magic strings and ensuring future method additions require single-site change.

### Fix 187: Code Quality — Validator Empty Schema Helper Clarity
- **Improvement**: Expanded validator empty-schema variables with explicit `hasAdditional` and `not` inclusion, with comment documenting map-type schemas, improving readability and preventing regression.

### Fix 188: Code Quality — Mock Generator Depth Normalization Preserved
- **Improvement**: Retained `normalizeType` helper for OAS 3.1 union array types and documented additionalProperties handling parity with graphLayout/normalizer, aligning three modules on same traversal set.

### Fix 189: UX/UI — Method Filter Pills Count Badges, Aria-Pressed, and Trace Visibility
- **Improvement**: Revamped `src/ui/EndpointExplorer.tsx:156-175` method pills to display per-method counts `GET (3)`, `TRACE (1)` with `aria-pressed` and `title` tooltips, toolbar `role="toolbar"` and `aria-label`, improving discoverability for `TRACE` and accessibility (WCAG 4.1.2). Added trace count ensures users see rare methods exist.

### Fix 190: Comprehensive Quality Test Suite 2
- **Improvement**: Added `tests/comprehensiveQuality2.test.ts` with 8 tests verifying: (1) TRACE endpoint parsing & filtering, (2) wildcard response sort order for 1xx/2xx/3xx/4xx/5xx/default, (3) `collectSchemaRefs` for additionalProperties/not, (4) swagger example string preservation vs `$ref` rewrite, (5) server variable enum fallback & mock additionalProperties generation, (6) validator not flagging map/not schemas as empty.

### Fix 191: Validator `collectSubRefs` Missing `additionalProperties` and `not` Traversal (Unused Schema False Positives)
- **Issue**: `src/parser/validator.ts:484-504` `collectSubRefs` only traversed `properties`, `items`, `allOf/oneOf/anyOf`, missing `additionalProperties` map refs and `not` negation refs. Schemas referenced solely via `additionalProperties: {$ref: '#/components/schemas/Inner'}` or `not: {$ref: '#/components/schemas/Forbidden'}` were incorrectly flagged as `unused-schema` info diagnostics (`src/parser/validator.ts:392`).
- **Root Cause**: Incomplete recursion parity with `src/parser/refResolver.ts:217` and `src/layout/graphLayout.ts:213` which already handled those fields.
- **Resolution**: Added `if (schema.additionalProperties && typeof schema.additionalProperties === 'object') collectSubRefs(...)` and `if ((schema as any).not) collectSubRefs(...)` branches, aligning validator unused detection with graph analytics. Verified via new tests in `tests/qualityImprovements3.test.ts`.

### Fix 192: `getStatusCategory` Default Response Styled as Grey Instead of Success
- **Issue**: `getStatusCategory('default')` parsed via `parseInt('default')=NaN` and returned grey `Default` badge (`bg-slate-100`), inconsistent with validator treating `default` as success (Fix 49) and obscuring success semantics in `src/ui/EndpointDetails.tsx:374`.
- **Root Cause**: Missing explicit `default` handling in `src/model/httpMethods.ts:104`.
- **Resolution**: Added early return for `s === 'default'` mapping to emerald success palette (`text-emerald-700 bg-emerald-50 border-emerald-200`) while preserving label `Default` for clarity and backward compatibility with `tests/httpMethods.test.ts:42`.

### Fix 193: Schema Viewer Tree Missing `not` Composition Rendering
- **Issue**: `TreeNodeRenderer` in `src/ui/SchemaViewer.tsx:350` computed `hasComposition` only from `allOf/oneOf/anyOf`, hiding `not` negation schemas entirely; leaf fallback rendered generic `object / any` box without indicating negation (`src/model/index.ts:106` defines `not` field).
- **Root Cause**: Hardcoded composition check omitting `not`.
- **Resolution**: Extended `hasComposition` to include `(schema as any).not`, added `not` branch rendering with rose-styled `Not — must NOT match` container and recursive `TreeNodeRenderer` call. Verified mock handles `not`.

### Fix 194: EndpointDetails `SchemaPropertyTree` Missing `additionalProperties` and `not` Display
- **Issue**: Inline property tree in `src/ui/EndpointDetails.tsx:500` rendered only `properties` and `items`, omitting `additionalProperties` map signatures and `not` negations for request/response body previews.
- **Root Cause**: Single-path returns without dictionary/negation branches.
- **Resolution**: Added `[additionalProperties]` rows in both properties and fallback branches, and `not:` recursive block with indented rose border, ensuring parity with full `SchemaViewer` tree.

### Fix 195: Topology Graph Search Lacked Clear Action and Reuse Count Missed Nested Refs
- **Issue**: Graph toolbar search input in `src/graph/TopologyGraph.tsx:180` had no clear `✕` button and no Escape handler, unlike Explorer/Viewer searches. Schema `reuseCount` in `src/layout/graphLayout.ts:31` counted only direct endpoint `consumed/produced` refs, missing schemas reused indirectly via `additionalProperties`/`not` nesting, showing `0x` for map-inner schemas.
- **Root Cause**: Missing UX control and shallow counting logic.
- **Resolution**: Added `onKeyDown Escape` and conditional clear button (`✕`) with `aria-label`; extended `schemaReuseCount` to iterate `Object.values(spec.schemas)` and `collectChildSchemaNames` to accumulate indirect refs.

### Fix 196: Mock Generator Ignored `not` Composition for Sample Data
- **Issue**: `generateMockData` in `src/model/mockGenerator.ts:48` handled `allOf/oneOf/anyOf` but returned generic `{}` for `not` schemas, producing invalid mock that could still match negated type (`not: {type: 'string'}` returned `{}` which is okay but `not: {type: 'array'}` edge unclear).
- **Root Cause**: Missing `not` branch before string/number fallback.
- **Resolution**: Added `not` handler generating intentionally violating mock: `string→12345`, `number→'not-a-number'`, `boolean→'not-boolean'`, `array→{}`, `object→[]`, fallback `'not_excluded_value'`.

### Fix 197: DiagnosticsBar Filter Stale After Spec Reload and EditorPane Timer Leak
- **Issue**: Diagnostics `activeFilter` remained on `error` after loading a clean spec with 0 errors, showing empty filtered view instead of `All checks passed`. EditorPane `useEffect` debounce timer lacked null guard and ref cleanup on unmount; rapid format toggles could leak timer or leave dangling `editorViewRef`.
- **Root Cause**: Missing `useEffect` reacting to `diagnostics.length` and incomplete cleanup in `src/ui/DiagnosticsBar.tsx:43` and `src/ui/EditorPane.tsx:109`.
- **Resolution**: Added `useEffect(() => { if (diagnostics.length===0) setActiveFilter('all') }, [diagnostics.length])` and improved `EditorPane` cleanup to `clearTimeout` + `debounceTimerRef.current=null` + `editorViewRef` null guard on matching view.

### Fix 198: EndpointExplorer Tag Dropdown Count Visibility and Search Kbd Hint
- **Issue**: Tag `<select>` in `src/ui/EndpointExplorer.tsx:184` showed bare tag names without usage counts; search inputs lacked `aria-label` and visual `/` kbd shortcut hint for discoverability.
- **Root Cause**: Static option rendering and missing accessibility adornments.
- **Resolution**: Mapped `allTags` to `count = endpoints.filter(e=>e.tags.includes(tag)).length` rendering `tag (count)`; added `aria-label` to both Explorer and SchemaViewer search inputs and visual `/` badge (`hidden sm:flex`) with `pr-16` padding.

### Fix 199: Code Quality — Centralized Validator/RefResolver/GraphLayout Traversal Parity
- **Improvement**: Aligned three traversal utilities (`validator.ts:collectSubRefs`, `refResolver.ts:collectSchemaRefs`, `graphLayout.ts:collectChildSchemaNames`) to identical field set (`properties`, `items`, `additionalProperties`, `not`, `allOf/oneOf/anyOf`), documented parity and added shared test `collectSchemaRefs additionalProperties/not parity` in `tests/qualityImprovements3.test.ts`.

### Fix 200: Comprehensive Quality Improvements Test Suite 3
- **Improvement**: Added `tests/qualityImprovements3.test.ts` with 8 tests: (1) validator additionalProperties/not unused false positives, (2) getStatusCategory default emerald mapping, (3) mockGenerator not handling (string/array), (4) graph layout indirect reuse count, (5) collectSchemaRefs parity (A/B/C/D).

### Fix 201: UX/UI — Topology Graph Clear Search + Tag Count + Keyboard Hints
- **Improvement**: TopologyGraph search now has Escape + ✕ clear, Explorer tag dropdown shows `(count)`, both main searches display `/` kbd badge with `aria-label`, improving discoverability (WCAG) and consistency with header `/` shortcut.

### Fix 202: Validator Info Object Array Bypass
- **Issue**: Specifications with `info: []` (array) incorrectly passed the `typeof object` check and were not flagged as missing `info` object, causing downstream `info.title` access on array to emit misleading `missing-info-title` instead of `missing-info-object`.
- **Root Cause**: Check `typeof rawDoc.info !== 'object'` returns false for arrays in `src/parser/validator.ts:19`.
- **Resolution**: Added `|| Array.isArray(rawDoc.info)` to the missing-info guard to correctly reject arrays and primitives.

### Fix 203: cURL Server URL Multiple Trailing Slashes
- **Issue**: Server URLs with multiple trailing slashes (`https://api.example.com///`) produced malformed request URLs containing `//` after concatenation (`https://api.example.com//pets`) because first normalization used `replace(/\/$/, '')` (single slash) in `src/ui/CurlGenerator.tsx:98`.
- **Root Cause**: Inconsistent regex between `rawUrl` init (`/\/$/`) and later `normalizedPath` join (`/\/+$/`).
- **Resolution**: Unified to `replace(/\/+$/, '')` for both stages, ensuring `https://api.example.com///` → `https://api.example.com/pets`.

### Fix 204: cURL Single-Quote Shell Injection in JSON Body
- **Issue**: Generated `curl -d '...'` used raw JSON string without escaping single quotes; a schema example containing `it's` broke shell quoting (`'{"note":"it's"}'` → premature close) in `src/ui/CurlGenerator.tsx:235`.
- **Root Cause**: No escaping for `'` inside single-quoted shell argument.
- **Resolution**: Replace `'` with `'\''` via `rawBody.replace(/'/g, "'\\''")` (close, escaped quote, reopen) before emitting `-d` line.

### Fix 205: EditorPane External Sync Echo Duplicate onChange
- **Issue**: When parent loaded a sample spec via `setContent` or `value` prop sync, `EditorPane` dispatched a document change which then triggered `updateListener` debounce → `onChange` → parent `setRawText` → re-parse, causing redundant parse cycles and potential infinite loop on rapid sample switches (`src/ui/EditorPane.tsx:68`).
- **Root Cause**: `updateListener` did not distinguish user-typed changes from programmatic sync dispatches.
- **Resolution**: Imported `Transaction` from `@codemirror/state`, annotated all external sync dispatches with `Transaction.userEvent.of('apiatomy-sync')`, and added `isExternal` check in `updateListener` to suppress echo (`update.transactions.some(tr => tr.annotation(Transaction.userEvent)==='apiatomy-sync')`).

### Fix 206: Header Share History Pollution
- **Issue**: Clicking Share did `window.location.hash = hash`, pushing a new browser history entry per share; back button cycled through previous shared hashes instead of prior pages (`src/ui/Header.tsx:78`).
- **Root Cause**: Direct hash assignment always creates history entry.
- **Resolution**: Use `history.replaceState(null, '', pathname+search+hash)` with try/catch fallback to `window.location.hash`, preserving share URL without polluting history.

### Fix 207: Swagger `isSwagger2` Missing Bare `2` Version String
- **Issue**: Specs declaring `swagger: "2"` (without dot) were not recognized as Swagger 2.0 and thus bypassed `convertSwagger2ToOpenApi3`, rendering empty paths and false missing-paths errors (`src/parser/swaggerConverter.ts:5`).
- **Root Cause**: Check `s.trim().startsWith('2.')` missed equal `"2"`.
- **Resolution**: Updated to `s === '2' || s.startsWith('2.')` handling numeric and string variants (`2`, `2.0`, `2.0.0`, `2.x`).

### Fix 208: Topology Graph Empty State Incorrect for Filtered View
- **Issue**: Blank canvas check used `nodes.length === 0` from state which retains filtered hidden nodes (`hidden: true`) rather than removing them, so an empty spec showed no overlay after filtering, and a filtered view showing 0 visible nodes gave no guidance (`src/graph/TopologyGraph.tsx:290`).
- **Root Cause**: Derived empty check from post-filter `nodes` state instead of source `initialNodes`.
- **Resolution**: Primary overlay now checks `initialNodes.length === 0` with backdrop blur and clear-filters action; secondary amber banner shows when `initialNodes.length>0 && visibleNodes===0` suggesting filter clear.

### Fix 209: URL Hash Raw Text Fallback Missing `paths:` Keyword
- **Issue**: Shared links containing plain YAML with only `paths:` (no `openapi`/`swagger` keyword) like `paths:\n  /test:...` failed the `lower.includes('openapi')` check and returned `null`, breaking decompression of minimal specs (`src/share/urlHash.ts:48`).
- **Root Cause**: Fallback only checked for `openapi`/`swagger` and `{` prefixes.
- **Resolution**: Extended check to include `lower.includes('"paths"')`, `lower.includes('paths:')`, `trimmedLower.startsWith('openapi')/swagger`, and second raw fallback without decode, ensuring minimal specs decompress.

### Fix 210: DiagnosticsBar Filter Showing Empty Instead of Success After Spec Reload
- **Issue**: Selecting `Error` filter then loading a clean spec (0 errors, 1 info) left drawer on `Error` showing “No entries match filter” instead of success checkmark, because `useEffect` only reset on `diagnostics.length===0` (`src/ui/DiagnosticsBar.tsx:43`).
- **Root Cause**: Filter not auto-reset when active filter has 0 matches but overall diagnostics non-empty.
- **Resolution**: Enhanced effect to `if (len===0) setAll else if (active!=='all' && filteredCount===0) setAll` with deps `[diagnostics, activeFilter]`, always showing relevant results.

### Fix 211: App Parse Crash Silent Fallback Without Diagnostics
- **Issue**: Critical `parseApiSpec` throw (e.g., malformed circular schema causing `RangeError`) was caught, logged to console, but fallback spec was returned with empty diagnostics, giving user a blank “Parse Error” spec with no visible error explanation (`src/App.tsx:34`).
- **Root Cause**: Catch block discarded error message.
- **Resolution**: Catch now prepends a `parse-crash` error diagnostic (`Critical parser crash: ${msg}`) to fallback diagnostics and preserves `rawText`, surfacing crash reason in DiagnosticsBar.

### Fix 212: Code Quality — Typed `not` Handling and Utility Extraction
- **Improvement**: Replaced all `(schema as any).not` casts with typed `schema.not` in `src/model/mockGenerator.ts:56`, `src/parser/validator.ts:371,499`, documented via comment. Added `src/utils/typeGuards.ts` with `isRecord`/`isString` reusable guards for future refactoring, improving strictness and reducing `any` surface. File counts as code quality improvement.

### Fix 213: Code Quality — Comprehensive Test Coverage Expansion (15 Tests)
- **Improvement**: Added `tests/qualityBatch4.test.ts` with 15 tests verifying (1) array info rejection, (2) multiple slash normalization, (3) single-quote escaping, (4) swagger `2` variant, (5) paths fallback decompression, (6) hash + extra params, (7) server enum fallback, (8) invalid slash warning, (9) mock `not` violating placeholder, (10) array clone isolation, (11) parse-crash absence smoke, (12) pipeDelimited encoding, (13) uuid header fallback, (14) swagger rewrite example preservation, (15) unused-schema Orphan detection — raising coverage from 114 to 129 tests.

### Fix 214: UX/UI — Accessible Skip Link and Filter Button Semantics
- **Improvement**: Added `Skip to content` sr-only link in `src/ui/Header.tsx:113` targeting `#main-content` added to `src/App.tsx:153`, improving keyboard navigation (WCAG 2.4.1). Topology graph filter group now has `role="group"` + `aria-label` and each button has `aria-pressed` + transition, header theme toggle adds `aria-pressed`/`aria-label`/`focus-visible:ring`, explorer empty state gains centered icon + descriptive subtext + styled clear button.

### Fix 215: UX/UI — Enhanced Empty and Filtered States Consistency
- **Improvement**: Revamped empty states across `src/ui/EndpointExplorer.tsx:225` (icon + subtext + bordered clear button) and `src/ui/SchemaViewer.tsx:149` (icon + “Clear search” when query active), plus graph dual-overlay (empty + “No nodes match filters” banner with inline clear). Ensures consistent guidance and one-click recovery.

### Fix 216: UX/UI — Graph Toolbar Aria-Pressed and Search Clear Polish
- **Improvement**: Graph toolbar search now consistently has Escape handling; filter pills expose `aria-pressed` for screen readers; added backdrop-blur overlay for empty graph to keep toolbar interactive while explaining state.




