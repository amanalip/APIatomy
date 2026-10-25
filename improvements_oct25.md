# User-facing improvements - October 25, 2026

This review prioritizes actionable changes that protect user work, improve correctness, and make API exploration more useful. All ten items below are pending implementation. The earlier review's completed fixes are recorded separately in `improvements_oct19.md`.

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

- [ ] Complete
- **Problem:** Refreshing returns to the sample unless the user saved or shared. Switching samples or projects replaces edits immediately.
- **Change:** Add local draft recovery, a visible unsaved-changes indicator, and protection before replacing edited content.
- **User benefit:** Users can recover their API edits after a refresh or accidental navigation and understand whether work is saved.
- **Acceptance criteria:** Restore the complete draft project, including dependencies and root filename; show saved versus unsaved state; allow users to save, discard, or cancel before replacing edited content; handle unavailable browser storage without blocking editing.
- **References:** `src/App.tsx`, `src/utils/workspaceStore.ts`, `src/share/project.ts`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-02: Reject invalid imports before replacing the current API

- [ ] Complete
- **Problem:** Confirmed that a file containing `this is not an API` is accepted by the import service. The upload caller replaces the current project and reports `Spec loaded`.
- **Change:** Validate syntax and the API root before committing an import. Display import errors while retaining the current project.
- **User benefit:** An incorrect file or URL response cannot unexpectedly replace useful work with an invalid document.
- **Acceptance criteria:** Reject malformed syntax and non-API roots for uploads, drops, project envelopes, and URL imports; preserve current content and dependencies on failure; show a useful error; keep superseded asynchronous imports from replacing newer work. Distinguish fatal import failures from nonfatal specification diagnostics so users can still inspect imperfect APIs.
- **References:** `src/share/importService.ts`, `src/ui/UrlImportDialog.tsx`, `src/App.tsx`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-03: Preserve comparisons when switching tabs

- [ ] Complete
- **Problem:** Entering an old specification, visiting Endpoints, and returning to Diff clears the baseline. The new comparison input also resets when the view remounts.
- **Change:** Retain both comparison inputs until the user explicitly clears or replaces them. Do not silently replace an independently selected new specification when the main editor changes.
- **User benefit:** Users can investigate endpoints and schemas without rebuilding their comparison.
- **Acceptance criteria:** Preserve both inputs and their project dependencies across view changes; retain independent comparison content during main-editor edits; provide explicit replacement and clear actions; keep old and new reference contexts isolated.
- **References:** `src/ui/DiffView.tsx`, `src/App.tsx`, `src/model/specDiff.ts`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-04: Make diff results explain what users must change

- [ ] Complete
- **Problem:** Confirmed that an empty baseline displays zero changes, which can look like a successful comparison. Actual changes show the endpoint and classification without identifying the affected field.
- **Change:** Show `Choose both specifications` before a comparison is ready. Add expandable field-level before/after details and a breaking-changes filter.
- **User benefit:** Users can identify required integration changes without manually searching two specifications.
- **Acceptance criteria:** Distinguish incomplete, parsing, invalid, unchanged, and changed comparisons; show field paths, before/after values, and reasons for compatibility classifications; support filtering to breaking changes; keep large result sets usable. For example, show `Response price: number -> string` under the affected endpoint.
- **References:** `src/ui/DiffView.tsx`, `src/model/specDiff.ts`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-05: Make generated requests usable for the selected payload type

- [ ] Complete
- **Problem:** Confirmed that generated JSON request bodies include `readOnly` properties. XML bodies receive the placeholder `field=value`, and users cannot select among supported request content types.
- **Change:** Add request content-type selection, omit read-only fields from generated request bodies, and clearly explain unsupported payload generation.
- **User benefit:** Copied requests better match the API contract and require fewer manual corrections.
- **Acceptance criteria:** Generate direction-aware examples, excluding read-only request fields and write-only fields from generated response examples; respect the selected media type in payloads and headers; offer useful handling or an explicit limitation for XML and binary bodies; preserve explicit examples and existing shell-quoting guarantees.
- **References:** `src/ui/CurlGenerator.tsx`, `src/model/mockGenerator.ts`, `src/ui/EndpointDetails.tsx`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-06: Protect saved workspaces from silent overwrite and deletion

- [ ] Complete
- **Problem:** Saving with an existing workspace name overwrites that workspace, and Delete removes it immediately.
- **Change:** Provide explicit `Update existing` and `Save as new` actions, plus undo for deletion.
- **User benefit:** Users can update a workspace intentionally without accidentally destroying another saved version.
- **Acceptance criteria:** Make overwrite intent explicit; reject unintended naming collisions; show clear save feedback; allow deleted workspaces to be restored with all dependencies; preserve atomic, collision-safe renames and compatibility with older records.
- **References:** `src/ui/WorkspaceDialog.tsx`, `src/utils/workspaceStore.ts`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-07: Make importing and editing multi-file APIs practical

- [ ] Complete
- **Problem:** The importer understands relative paths, but the upload picker lacks a folder workflow, and the editor exposes only the root document.
- **Change:** Add folder import that preserves directories, a project file tree, and navigation from unresolved references to the relevant file.
- **User benefit:** Users can explore and repair realistic API projects without flattening directories or editing dependencies elsewhere.
- **Acceptance criteria:** Preserve nested file paths and duplicate basenames in different directories; select or clearly identify the root; allow dependency editing; resolve references relative to their containing document; retain complete projects through save, export, share, and restore; offer a fallback where folder selection is unavailable.
- **References:** `src/ui/Header.tsx`, `src/ui/EditorPane.tsx`, `src/share/importService.ts`, `src/parser/fileMap.ts`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-08: Expose webhooks and callbacks instead of silently omitting them

- [ ] Complete
- **Problem:** Confirmed that the included Webhooks and Callbacks sample produces only the two `/subscriptions` operations. Callback operations are absent without an omission warning.
- **Change:** Add webhook and callback sections with payloads, responses, and graph connections. Clearly identify omitted content until supported.
- **User benefit:** Users can see the outbound event contract as well as the API's inbound operations.
- **Acceptance criteria:** Represent top-level webhooks and operation callbacks distinctly; preserve callback runtime expressions; expose request and response details; resolve local and uploaded references; include relevant graph relationships and diff changes; show clear limitations rather than silently dropping supported-document content.
- **References:** `src/parser/normalizer.ts`, `src/model/index.ts`, `src/ui/EndpointDetails.tsx`, `src/graph/TopologyGraph.tsx`, `src/samples/webhooks.ts`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-09: Show real request and response examples alongside schemas

- [ ] Complete
- **Problem:** Response examples are hidden when a schema exists, named examples lack a selector, and schema-less `false` or `0` examples disappear because of truthiness checks.
- **Change:** Add Schema and Examples tabs, named-example selection, and copy controls for request and response bodies.
- **User benefit:** Users can inspect realistic payloads and copy documented examples directly into integration work.
- **Acceptance criteria:** Show supplied examples alongside schemas; preserve `false`, `0`, empty strings, and null; expose named example summaries and descriptions; distinguish supplied examples from generated examples; support each media type; retain local-only handling of imported data and explain unresolved example references.
- **References:** `src/ui/EndpointDetails.tsx`, `src/model/index.ts`, `src/parser/normalizer.ts`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.

### OCT25-10: Give schema browsing a dedicated mobile flow

- [ ] Complete
- **Problem:** Schema navigation and details remain side by side, reducing the space available to inspect properties on narrow screens. Diff inputs and result grids also use fixed column layouts.
- **Change:** Use a searchable schema list followed by full-width details with Back navigation on mobile. Stack diff inputs and results on narrow screens.
- **User benefit:** Schema inspection and API comparisons become practical on phones and small windows.
- **Acceptance criteria:** Preserve search, selection, and list position when navigating back; retain direct schema navigation from endpoints and graph nodes; provide readable details and usable controls at narrow widths; stack comparison sections; verify keyboard focus, touch interaction, and desktop behavior.
- **References:** `src/ui/SchemaViewer.tsx`, `src/ui/DiffView.tsx`, `src/App.tsx`.
- **Commits:** Pending, minimum eight substantive commits.
- **Validation and pushed range:** Pending.
