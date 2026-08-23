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
