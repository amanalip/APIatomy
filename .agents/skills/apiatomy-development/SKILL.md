---
name: apiatomy-development
description: Implement or review changes in the APIatomy repository, especially specification parsing, semantic diffs, multi-file persistence, sharing, and browser regressions. Use for this application rather than general OpenAPI API design.
---

# APIatomy development

Read the repository's `AGENTS.md` for shared conventions. Keep changes within the user's request and preserve the browser-only architecture.

## Choose the production path

- Ingestion: `src/parser/index.ts` parses YAML or JSON and normalizes it into `src/model/index.ts`. Accept explicit project context when parsing independent inputs, such as two diff versions.
- References: `src/parser/refResolver.ts` scopes caches and nested external references by document path. Cache the target before applying occurrence-specific siblings; do not let one reference mutate another.
- Multi-file state: `src/parser/fileMap.ts` tracks uploaded files and root filename. `src/share/project.ts` captures, encodes, validates, and restores project envelopes. Preserve plain-spec and older-workspace compatibility.
- Sharing: `src/share/sharePreparation.ts` prepares both hashes once per project. `src/hooks/useSharePreparation.ts` uses a worker for large inputs. Derive URL sizes from prepared URLs and reuse hashes when view or selection changes.
- Diffs: `src/model/specDiff.ts` is the shared engine used by `DiffView`. Requests and responses have different compatibility directions. Keep uncertain structural changes conservative and test against the production engine.
- Explorer: pagination must retain access to every filtered endpoint and tag. Cover large groups and navigation after filtering.

## Verify observable behavior

Use focused tests for the changed path. Useful regression suites include `curlShellSafety`, `refResolver`, `specDiff`, `diffRegression`, `endpointPagination`, `projectPersistence`, `sharePreparation`, and `useSpecState` under `tests`.

Test generated shell arguments with a local stub rather than a network command. Exercise IndexedDB through `fake-indexeddb` and worker lifecycle through controlled worker doubles. Verify stale results, fallback, and cleanup for asynchronous hooks. Use browser tests for integrated import, save/reopen, share/reload, and accessibility behavior.

Before completing a change, run `npm run check` and relevant browser checks. Follow the no-em-dashes rule enforced by `npm run check:text`. Report validation limits explicitly and update the improvements checklist only for completed work.
