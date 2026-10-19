# Repository improvements - October 19, 2026

Review baseline: `npm run check` passed, including all 207 tests, TypeScript, lint, formatting, and the production build. Browser E2E tests were inspected but not run.

## High priority

- [x] **Quote all spec-derived arguments in generated cURL commands.**
  - Finding: server URLs are inserted directly into double quotes. A server URL containing `$(printf REVIEW_MARKER)` survives into the generated command and would be evaluated by a shell when pasted.
  - Improvement: apply consistent shell quoting to URLs, header names and values, form fields, and other spec-derived arguments.
  - Verification: add regression tests covering command substitution, backticks, quotes, and other shell metacharacters.
  - Reference: [src/ui/CurlGenerator.tsx:328](src/ui/CurlGenerator.tsx#L328).

- [x] **Prevent `$ref` sibling overrides from leaking through the resolver cache.**
  - Finding: the resolver caches results after applying reference-specific siblings. A description override on one reference appeared on a later reference with no override.
  - Improvement: cache the resolved target separately, then apply sibling fields independently for each reference occurrence.
  - Verification: test multiple references to the same target with different descriptions and constraints, in different resolution orders.
  - Reference: [src/parser/refResolver.ts:235](src/parser/refResolver.ts#L235).

- [x] **Correct breaking-change classification in API diffs.**
  - Finding: changing a response type from `string` to `integer` displayed “non-breaking.” Classification primarily checks required parameters and defaults other changes to non-breaking.
  - Improvement: extract a dedicated diff engine with explicit compatibility rules for request, response, and security changes. Review the rule that currently treats removing a required parameter as breaking.
  - Verification: exercise the production diff engine with response type changes, required request fields, parameter changes, removed responses, and authentication changes.
  - Reference: [src/ui/DiffView.tsx:13](src/ui/DiffView.tsx#L13).

## Medium priority

- [x] **Make every endpoint accessible in large endpoint lists.**
  - Finding: a spec with 101 endpoints under one tag rendered only 20 cards while claiming “Showing 100.” The implementation truncates both tag groups and endpoints within each group.
  - Improvement: replace the slices with virtualization or pagination, and display accurate counts.
  - Verification: confirm all endpoints remain accessible with more than 100 endpoints, more than 10 tags, and more than 20 endpoints under one tag.
  - Reference: [src/ui/EndpointExplorer.tsx:276](src/ui/EndpointExplorer.tsx#L276).

- [x] **Preserve multi-file dependencies when saving and sharing projects.**
  - Finding: workspaces persist only the root spec text, and share links encode only that text. Uploaded external files are lost when reopening or sharing the project.
  - Improvement: persist the file map and root filename in workspaces. Bundle external references or include the project files in the sharing format.
  - Verification: save, reopen, and share a multi-file project with nested external references; confirm the resolved schemas and endpoints remain intact.
  - References: [src/utils/workspaceStore.ts:16](src/utils/workspaceStore.ts#L16), [src/share/shareService.ts:27](src/share/shareService.ts#L27).

- [x] **Avoid repeated synchronous compression in the share dialog.**
  - Finding: rendering generates regular and compact URLs synchronously and repeats compression for size calculations before the compression worker runs.
  - Improvement: memoize preparation, derive size from the prepared URL, and use the worker for large inputs without first repeating the work on the main thread.
  - Verification: confirm opening the dialog and changing its options stay responsive for large specs, and that URL sizes match the generated links.
  - Reference: [src/ui/ShareDialog.tsx:42](src/ui/ShareDialog.tsx#L42).

- [x] **Strengthen tests around production behavior and uncovered modules.**
  - Finding: coverage excludes most UI, hooks, workers, and persistence. `shareService.ts` reported 0% coverage. Diff regression tests duplicate comparison logic rather than exercising the production implementation.
  - Improvement: add focused regression tests for the findings above, test shared production functions directly, and expand coverage to important orchestration and persistence paths.
  - Verification: ensure tests fail when the corresponding production behavior regresses; avoid relying on copies of implementation logic in tests.
  - References: [vitest.config.ts:18](vitest.config.ts#L18), [tests/diffRegression.test.ts:4](tests/diffRegression.test.ts#L4).

- [ ] **Run quality checks on pull requests before changes reach `main`.**
  - Finding: the deployment workflow runs lint, formatting, tests, and build only on pushes to `main` or manual dispatch. CodeQL has a separate pull-request trigger.
  - Improvement: add a pull-request validation workflow for type checking, lint, formatting, tests, and build. Run browser E2E tests there and keep deployment separate.
  - Verification: confirm a pull request runs the checks and a failing check is visible before merge.
  - Reference: [.github/workflows/deploy.yml:3](.github/workflows/deploy.yml#L3).

Recommended implementation order: cURL quoting, reference caching, and diff classification first, followed by the remaining checklist items.
