---
name: apiatomy-development
description: Implement or review changes in the APIatomy repository, especially specification parsing, semantic diffs, multi-file persistence, sharing, and browser regressions. Use for this application rather than general OpenAPI API design.
---

# APIatomy development

Read the repository's `AGENTS.md` for shared conventions. Keep changes within the user's request and preserve the browser-only architecture.

## Track improvements through commits

When implementing a tracked improvement, create at least eight focused, substantive commits per improvement. This is a per-improvement minimum, not eight commits across the entire checklist. Plan useful increments before implementation, such as state handling, production behavior, UI integration, recovery, accessibility, regression coverage, browser verification fixes, and documentation. Adapt those increments to the actual change; do not create empty commits, artificial churn, or unrelated work to meet the count.

Every commit must have a descriptive subject identifying the improvement ID and a detailed body explaining the user-facing problem, what changed, why the approach was chosen, and validation performed with results or limitations. Record the commit hashes against the corresponding improvement in its tracking document, and mark it complete only after the requested behavior and required checks are verified. Preserve this history rather than squashing away the improvement's tracking commits unless the user requests a different structure.

When pushing is authorized by the user, push all of the improvement's commits to the intended branch and report the pushed commit range. These tracking instructions do not independently authorize pushing, publishing, or deployment. A documentation-only request records the plan and workflow without implementing the improvements or manufacturing their implementation commits. A later explicit user instruction about commit structure takes precedence.

## Choose the production path

- File imports: `src/share/importService.ts` prepares uploads and drops without mutating active state. Root selection uses parsed top-level version fields. Reject ambiguous roots and retain the old project on failure. Abort and suppress stale import results when users switch projects.
- Ingestion: `src/parser/index.ts` parses YAML or JSON and normalizes it into `src/model/index.ts`. Accept explicit project context when parsing independent inputs, such as two diff versions.
- References: `src/parser/refResolver.ts` scopes caches and nested external references by document path. Cache the target before applying occurrence-specific siblings; do not let one reference mutate another. `resolveReferenceObject` also resolves path items, bodies, responses, parameters, and headers. Preserve field origin when local siblings override an external object.
- Multi-file state: `src/parser/fileMap.ts` tracks uploaded files and root filename. `src/share/project.ts` captures, encodes, validates, and restores project envelopes. Preserve plain-spec and older-workspace compatibility. Encode root text once and apply the shared per-file and aggregate limits from `src/share/projectLimits.ts` to uploads, exports, and bounded link decompression.
- Sharing: `src/share/sharePreparation.ts` prepares both hashes once per project. `src/hooks/useSharePreparation.ts` uses a worker for large inputs. Derive URL sizes from prepared URLs and reuse hashes when view or selection changes.
- Diffs: `src/model/specDiff.ts` is the shared engine used by `DiffView`. Requests and responses have different compatibility directions. Keep uncertain structural changes conservative and test against the production engine. Strip model metadata only in model positions; user keys in properties and literal enum/example values must survive comparison.
- Input-keyed records: use `src/utils/dictionary.ts` for dictionaries and own-property reads. Test `__proto__`, `constructor`, and `toString` after worker or IndexedDB cloning as well as before it.
- Mock examples: UI callers use `generateMockExample` to expose unsupported or impossible constraints alongside best-effort data. Keep generation bounded; do not execute imported patterns as regular expressions. Preserve explicit false and zero examples.
- Explorer: pagination must retain access to every filtered endpoint and tag. Cover large groups and navigation after filtering.

## Verify observable behavior

Use focused tests for the changed path. Useful regression suites include `curlShellSafety`, `refResolver`, `specDiff`, `diffRegression`, `endpointPagination`, `projectPersistence`, `sharePreparation`, and `useSpecState` under `tests`.

Test generated shell arguments with a local stub rather than a network command. Exercise IndexedDB through `fake-indexeddb`, including rename collisions and rollback, and worker lifecycle through controlled worker doubles. Verify stale results, fallback, and cleanup for asynchronous hooks. Use browser tests for integrated import, save/reopen, share/reload, and accessibility behavior.

Before completing a change, run `npm run check` and relevant browser checks. Follow the no-em-dashes rule enforced by `npm run check:text`. Report validation limits explicitly and update the improvements checklist only for completed work.
