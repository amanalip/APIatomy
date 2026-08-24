# Changelog

All notable changes to APIatomy will be documented here.

## [0.2.1] - 2026-08-24
- Fix keyboard shortcuts dark mode styling and CodeMirror `?` guard, reserve Ctrl/Cmd+K for palette and use `/` for search in Explorer and Schema Viewer, fix shortcut help docs
- Fix multi-file `$ref` worker file map, workspace stale state, root file selection and nested external `$ref` scoping via basePath
- Fix share compact URL vs copied URL, stale large-spec Worker URL, double percent decoding of UI state with `%` in IDs, and auto clear of source URL after edits
- Fix diff defaulting Old to Petstore and parser Worker stale fallback via latest ref
- Docs and bug log synced up to Fix 353

## [0.2.0] - 2026-08-24
- Share dialog with compact link, file fallback, source URL and app state
- Mobile drawer editor and onboarding with first use guide
- Load from URL and multi file support with file map
- cURL auth selector for security alternatives
- Workers for parsing, compression and layout
- Virtualized lists, lazy graph and SVG export
- Workspaces with IndexedDB, diff view with breaking classification
- Command palette, shortcut help and focus trap
- Toast notifications, coverage thresholds and CodeQL

## [0.1.0] - 2026-08-24
- Initial public release with OpenAPI 3.0/3.1 and Swagger 2.0 support
- Endpoint explorer, schema viewer and topology graph
- Diagnostics and cURL generation
- Sharing via URL hash
