# User-facing improvements - October 25, 2026

This review prioritizes actionable changes that protect user work, improve correctness, and make API exploration more useful. All ten improvements are implemented and verified within the browser limits recorded below. Verification records for each implementation batch appear below. The earlier review's completed fixes are recorded separately in `improvements_oct19.md`.

Review evidence: source inspection and selected local browser exercises. All 311 unit tests passed. The full browser regression suite was not run during this review. Findings explicitly described as confirmed were exercised locally; other workflow gaps and proposed improvements were identified through source inspection.

## Implementation and commit tracking

- Implement in priority order unless a dependency or user instruction requires otherwise.
- Create at least eight focused, substantive commits for each improvement, not eight commits for the entire document. Plan meaningful increments and avoid empty commits or artificial churn.
- Include the improvement ID in every commit subject. Every commit must have a detailed body describing the user-facing problem, changes, rationale, and validation results or limitations.
- Record commit hashes under the relevant item. Keep its checkbox unchecked until its acceptance criteria and required validation are complete.
- When the user authorizes a push, push the improvement's commits to the intended branch and record the pushed range. This document does not independently authorize a push or deployment.
- Follow `.agents/skills/apiatomy-development/SKILL.md`, run focused tests during implementation, then `npm run check` and relevant browser checks. Report unavailable checks.

## Prioritized improvements

### OCT25-01: Prevent accidental loss of work

- [x] Complete
- **Problem:** Refreshing returns to the sample unless the user saved or shared. Switching samples or projects replaces edits immediately.
- **Change:** Add local draft recovery, a visible unsaved-changes indicator, and protection before replacing edited content.
- **User benefit:** Users can recover their API edits after a refresh or accidental navigation and understand whether work is saved.
- **Acceptance criteria:** Restore the complete draft project, including dependencies and root filename; show saved versus unsaved state; allow users to save, discard, or cancel before replacing edited content; handle unavailable browser storage without blocking editing.
- **References:** `src/App.tsx`, `src/utils/workspaceStore.ts`, `src/share/project.ts`.
- **Implementation:** Implemented complete-project IndexedDB recovery, immediate dirty tracking, visible persistence status, storage failure guidance, unload protection, and save/discard/cancel replacement decisions. Save-before-replacement backups reject collisions atomically. Shared links take precedence over local recovery, and newer edits or dependency revisions suppress stale recovery.
- **Commits:** `bf8fd06`, `2f5edbf`, `fdec834`, `4830da0`, `efb470d`, `9e0291a`, `08013c0`, `893d90a`, `1456ae5`, `c21b931`, `997d7eb`, `972fe63`, `3368cfc` (13 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions and the full repository checks passed. Browser coverage passed on Chromium, Firefox, and mobile Chrome; see the verification record below. Commits are local; no push was requested.

### OCT25-02: Reject invalid imports before replacing the current API

- [x] Complete
- **Problem:** Confirmed that a file containing `this is not an API` is accepted by the import service. The upload caller replaces the current project and reports `Spec loaded`.
- **Change:** Validate syntax and the API root before committing an import. Display import errors while retaining the current project.
- **User benefit:** An incorrect file or URL response cannot unexpectedly replace useful work with an invalid document.
- **Acceptance criteria:** Reject malformed syntax and non-API roots for uploads, drops, project envelopes, and URL imports; preserve current content and dependencies on failure; show a useful error; keep superseded asynchronous imports from replacing newer work. Distinguish fatal import failures from nonfatal specification diagnostics so users can still inspect imperfect APIs.
- **References:** `src/share/importService.ts`, `src/ui/UrlImportDialog.tsx`, `src/App.tsx`.
- **Implementation:** Implemented shared fatal validation for API roots, project-envelope roots, and dependency syntax before upload, drop, or URL replacement. Invalid inputs retain the current API; lint findings remain inspectable. URL cancellation remains effective while an unsaved-work decision is pending.
- **Commits:** `64889ab`, `ce540a0`, `8c66e5a`, `9266c94`, `d451295`, `64c1c41`, `853bbca`, `34d6448` (8 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions and the full repository checks passed. Browser coverage passed on Chromium, Firefox, and mobile Chrome; see the verification record below. Commits are local; no push was requested.

### OCT25-03: Preserve comparisons when switching tabs

- [x] Complete
- **Problem:** Entering an old specification, visiting Endpoints, and returning to Diff clears the baseline. The new comparison input also resets when the view remounts.
- **Change:** Retain both comparison inputs until the user explicitly clears or replaces them. Do not silently replace an independently selected new specification when the main editor changes.
- **User benefit:** Users can investigate endpoints and schemas without rebuilding their comparison.
- **Acceptance criteria:** Preserve both inputs and their project dependencies across view changes; retain independent comparison content during main-editor edits; provide explicit replacement and clear actions; keep old and new reference contexts isolated.
- **References:** `src/ui/DiffView.tsx`, `src/App.tsx`, `src/model/specDiff.ts`.
- **Implementation:** Moved independent old/new comparison snapshots into app-owned state. Added explicit current-project replacement, independent clear actions, labeled inputs, isolated multi-file uploads, and per-side cancellation of superseded reads. Main-editor changes and tab navigation no longer reset comparison inputs.
- **Commits:** `dfe562f`, `341ddd1`, `11df08f`, `b545d9f`, `c788fca`, `d124a37`, `e82057a`, `52adaa7`, `49be3e4` (9 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions and the full repository checks passed. Browser coverage passed on Chromium, Firefox, and mobile Chrome; see the verification record below. Commits are local; no push was requested.

### OCT25-04: Make diff results explain what users must change

- [x] Complete
- **Problem:** Confirmed that an empty baseline displays zero changes, which can look like a successful comparison. Actual changes show the endpoint and classification without identifying the affected field.
- **Change:** Show `Choose both specifications` before a comparison is ready. Add expandable field-level before/after details and a breaking-changes filter.
- **User benefit:** Users can identify required integration changes without manually searching two specifications.
- **Acceptance criteria:** Distinguish incomplete, parsing, invalid, unchanged, and changed comparisons; show field paths, before/after values, and reasons for compatibility classifications; support filtering to breaking changes; keep large result sets usable. For example, show `Response price: number -> string` under the affected endpoint.
- **References:** `src/ui/DiffView.tsx`, `src/model/specDiff.ts`.
- **Implementation:** Added incomplete, comparing, invalid, unchanged, and changed readiness states. Production semantic diff results now include bounded field paths, before/after values, and actionable reasons. Changed endpoints, schemas, and authentication definitions expose details; a breaking-endpoint filter and Show more controls support focused review.
- **Commits:** `321c37c`, `78c9e04`, `cd872c9`, `8813229`, `6eb6846`, `4bce1f6`, `c2a005f`, `0f1ba25`, `d05bfbd` (9 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions and the full repository checks passed. Browser coverage passed on Chromium, Firefox, and mobile Chrome; see the verification record below. Commits are local; no push was requested.

### OCT25-05: Make generated requests usable for the selected payload type

- [x] Complete
- **Problem:** Confirmed that generated JSON request bodies include `readOnly` properties. XML bodies receive the placeholder `field=value`, and users cannot select among supported request content types.
- **Change:** Add request content-type selection, omit read-only fields from generated request bodies, and clearly explain unsupported payload generation.
- **User benefit:** Copied requests better match the API contract and require fewer manual corrections.
- **Acceptance criteria:** Generate direction-aware examples, excluding read-only request fields and write-only fields from generated response examples; respect the selected media type in payloads and headers; offer useful handling or an explicit limitation for XML and binary bodies; preserve explicit examples and existing shell-quoting guarantees.
- **References:** `src/ui/CurlGenerator.tsx`, `src/model/mockGenerator.ts`, `src/ui/EndpointDetails.tsx`.
- **Implementation:** Added request content-type selection and matching payload headers, request/response schema projection, typed form examples, literal multipart handling, and explicit XML/binary payload-file limitations. Generated requests omit read-only fields, generated response mode omits write-only fields, and supplied examples remain literal data.
- **Commits:** `85b9eaf`, `7ed52bd`, `444e52b`, `fbf6a15`, `613326c`, `f92db3b`, `ceaaf17`, `47f7c12` (8 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions and the full repository checks passed. Browser coverage passed on Chromium, Firefox, and mobile Chrome; see the verification record below. Commits are local; no push was requested.

### OCT25-06: Protect saved workspaces from silent overwrite and deletion

- [x] Complete
- **Problem:** Saving with an existing workspace name overwrites that workspace, and Delete removes it immediately.
- **Change:** Provide explicit `Update existing` and `Save as new` actions, plus undo for deletion.
- **User benefit:** Users can update a workspace intentionally without accidentally destroying another saved version.
- **Acceptance criteria:** Make overwrite intent explicit; reject unintended naming collisions; show clear save feedback; allow deleted workspaces to be restored with all dependencies; preserve atomic, collision-safe renames and compatibility with older records.
- **References:** `src/ui/WorkspaceDialog.tsx`, `src/utils/workspaceStore.ts`.
- **Implementation:** Implemented insert-only Save as new, explicit Update existing confirmation, save/status feedback, and durable deletion undo. Complete records move between live and trash stores in one IndexedDB transaction. Restore collisions and write failures retain both live and deleted projects. The database upgrade retains older workspace records.
- **Commits:** `8685799`, `20225ce`, `c022319`, `dca800f`, `7e3e506`, `a3111ae`, `c12de6b`, `2a6ec7b`, `9fec0c4`, `b0af34b` (10 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions, full repository checks, and Chromium/Firefox/mobile Chrome browser workflows passed. See the batch verification record below. Commits are local; no push was requested.

### OCT25-07: Make importing and editing multi-file APIs practical

- [x] Complete
- **Problem:** The importer understands relative paths, but the upload picker lacks a folder workflow, and the editor exposes only the root document.
- **Change:** Add folder import that preserves directories, a project file tree, and navigation from unresolved references to the relevant file.
- **User benefit:** Users can explore and repair realistic API projects without flattening directories or editing dependencies elsewhere.
- **Acceptance criteria:** Preserve nested file paths and duplicate basenames in different directories; select or clearly identify the root; allow dependency editing; resolve references relative to their containing document; retain complete projects through save, export, share, and restore; offer a fallback where folder selection is unavailable.
- **References:** `src/ui/Header.tsx`, `src/ui/EditorPane.tsx`, `src/share/importService.ts`, `src/parser/fileMap.ts`.
- **Implementation:** Added feature-detected folder import with multi-file fallback, full-path project navigation with root identification, bounded dependency editing, and containing-file diagnostic navigation. Nested paths and duplicate basenames survive import; edits flow through the existing project codec into drafts, workspaces, downloads, and share links.
- **Commits:** `81accde`, `987a670`, `376c911`, `5ea4311`, `e4e333d`, `22acbbd`, `cec547f`, `95700e6`, `a841cd2`, `6354cc3` (10 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions, full repository checks, and Chromium/Firefox/mobile Chrome browser workflows passed. See the batch verification record below. Commits are local; no push was requested.

### OCT25-08: Expose webhooks and callbacks instead of silently omitting them

- [x] Complete
- **Problem:** Confirmed that the included Webhooks and Callbacks sample produces only the two `/subscriptions` operations. Callback operations are absent without an omission warning.
- **Change:** Add webhook and callback sections with payloads, responses, and graph connections. Clearly identify omitted content until supported.
- **User benefit:** Users can see the outbound event contract as well as the API's inbound operations.
- **Acceptance criteria:** Represent top-level webhooks and operation callbacks distinctly; preserve callback runtime expressions; expose request and response details; resolve local and uploaded references; include relevant graph relationships and diff changes; show clear limitations rather than silently dropping supported-document content.
- **References:** `src/parser/normalizer.ts`, `src/model/index.ts`, `src/ui/EndpointDetails.tsx`, `src/graph/TopologyGraph.tsx`, `src/samples/webhooks.ts`.
- **Implementation:** Normalized top-level webhooks and referenced operation callbacks through the shared path parser, preserving runtime expressions, parent identity, request/response details, and reference scopes. Added kind filtering, outbound destination guidance, topology origin edges, and distinct semantic diff identities. Bound recursive exploration with visible omission warnings and retained outbound schema usage in validation.
- **Commits:** `1096b17`, `c5334f9`, `c14f6af`, `c253c49`, `53809f1`, `a4a1a83`, `d0bb4d9`, `ee020a8`, `41409a3`, `1af0d29`, `0a8c2b5`, `bc37852` (12 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions, full repository checks, and Chromium/Firefox/mobile Chrome browser workflows passed. See the batch verification record below. Commits are local; no push was requested.

### OCT25-09: Show real request and response examples alongside schemas

- [x] Complete
- **Problem:** Response examples are hidden when a schema exists, named examples lack a selector, and schema-less `false` or `0` examples disappear because of truthiness checks.
- **Change:** Add Schema and Examples tabs, named-example selection, and copy controls for request and response bodies.
- **User benefit:** Users can inspect realistic payloads and copy documented examples directly into integration work.
- **Acceptance criteria:** Show supplied examples alongside schemas; preserve `false`, `0`, empty strings, and null; expose named example summaries and descriptions; distinguish supplied examples from generated examples; support each media type; retain local-only handling of imported data and explain unresolved example references.
- **References:** `src/ui/EndpointDetails.tsx`, `src/model/index.ts`, `src/parser/normalizer.ts`.
- **Implementation:** Added Schema and Examples tabs for every request/response media type, named example selection, summaries/descriptions, exact falsy values, media-aware copy controls, and supplied/generated labels. Example Object references resolve locally; unresolved references and externalValue URLs display explicit limitations without fetching content.
- **Commits:** `f3ed537`, `2f89465`, `205cef2`, `03bb67c`, `a14ed0c`, `cd4c87a`, `0e72551`, `d5293e9`, `be389fa` (9 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions, full repository checks, and Chromium/Firefox/mobile Chrome browser workflows passed. See the batch verification record below. Commits are local; no push was requested.

### OCT25-10: Give schema browsing a dedicated mobile flow

- [x] Complete
- **Problem:** Schema navigation and details remain side by side, reducing the space available to inspect properties on narrow screens. Diff inputs and result grids also use fixed column layouts.
- **Change:** Use a searchable schema list followed by full-width details with Back navigation on mobile. Stack diff inputs and results on narrow screens.
- **User benefit:** Schema inspection and API comparisons become practical on phones and small windows.
- **Acceptance criteria:** Preserve search, selection, and list position when navigating back; retain direct schema navigation from endpoints and graph nodes; provide readable details and usable controls at narrow widths; stack comparison sections; verify keyboard focus, touch interaction, and desktop behavior.
- **References:** `src/ui/SchemaViewer.tsx`, `src/ui/DiffView.tsx`, `src/App.tsx`.
- **Implementation:** Added full-width mobile schema detail navigation with Back, retained search, restored list scroll and focus, and direct-link support. Virtual windows synchronize before focus restoration and clamp after filtering. Increased row touch space, wrapped inspector controls, and stacked comparison inputs and summaries on narrow screens.
- **Commits:** `7926e82`, `8867280`, `aaca82b`, `48e8a31`, `44ea765`, `a708759`, `a2aaa2e`, `1c32ca9`, `b48d2d5`, `6a07fc3`, `a2bf2db`, `72f3dfb`, `ceb2515`, `1691e28` (14 focused commits, each with a detailed message).
- **Validation and pushed range:** Focused production regressions, full repository checks, and Chromium/Firefox/mobile Chrome browser workflows passed. See the batch verification record below. Commits are local; no push was requested.

## Implementation verification for OCT25-01 through OCT25-05

- `npm run check` passed: strict TypeScript, source text enforcement, lint, formatting, 340 unit tests across 48 files, coverage thresholds, and a production build. Configured line coverage is 84.39%.
- `npm run e2e -- --project=chromium --project=firefox --project='Mobile Chrome'` passed all 66 scenarios, including seven new scenarios on each browser configuration.
- New browser coverage includes edited draft recovery, cancelled replacement, save-before-replacement and backup reopening, multi-file dependency recovery, invalid upload preservation, comparison persistence and clearing, breaking-change evidence, and selected request media with unsupported-generation guidance.
- The five new workflow scenarios were also attempted in WebKit. Browser launch failed before execution because the host lacks `libicu74` and `libflite1`. Local Safari/WebKit behavior remains unverified; the existing Ubuntu CI workflow installs browser dependencies.
- The updated development skill passed its validator. `git diff --check` and `npm run check:text` passed.
- XML and arbitrary binary payload generation remains unsupported by design: commands identify the file to supply and show an explicit limitation. Compatibility classification remains conservative, and field explanations are capped at 200 per traversal with visible truncation guidance. Recovery requires browser storage and does not replace explicit backups.
- Each improvement has at least eight substantive commits with detailed messages, recorded above. No commits were pushed and no deployment was performed.

## Implementation verification for OCT25-06 through OCT25-10

- `npm run check` passed: strict TypeScript, source text enforcement, lint, formatting, 366 unit tests across 53 files, coverage thresholds, and a production build. Configured line coverage is 85.10%.
- The complete Chromium, Firefox, and mobile Chrome browser run passed 83 scenarios. Four desktop executions of the two mobile-only navigation tests were intentionally skipped. Folder import with nested duplicate basenames passed on all three browser configurations.
- After the final outbound validation adjustment, six focused webhook/callback and named-example browser scenarios passed again across Chromium, Firefox, and mobile Chrome.
- New browser workflows cover save collisions and explicit updates, durable deletion undo, dependency editing and draft recovery, actual folder selection, outbound filters and expressions, named falsy examples, mobile Back/search/focus, stacked comparisons, and virtual-list scroll restoration. The new scroll regression caught a real mismatch between DOM offsets and rendered virtual rows; the corrected workflow passed its targeted rerun and the full browser run.
- WebKit launch was attempted for the new workspace workflow but could not execute because the host lacks `libicu74` and `libflite1`. Local Safari/WebKit validation remains unavailable; the existing Ubuntu CI workflow installs browser prerequisites.
- The updated development skill passed its validator. `npm run check:text` and `git diff --check` passed.
- Deleted workspaces remain recoverable in this browser's storage; restoring a reused name requires renaming the newer live workspace first. Folder selection falls back to multi-file upload where unsupported. Only YAML and JSON files are imported from folders.
- Callback exploration is bounded to eight nested levels and 2000 outbound operations with explicit omission warnings. Structural outbound delivery changes are conservatively classified as breaking. Receiver URLs are integration-provided; runtime expressions are not treated as executable API server paths.
- Supplied Example Objects resolve only from local project content. External example URLs are never fetched, and cyclic values show a serialization limitation. Full JSON Schema 2020-12 validation remains outside the supported feature set.
- Each of the five improvements has at least eight focused commits with detailed messages, recorded above. No push or deployment was performed.
