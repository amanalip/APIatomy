# Working on APIatomy

APIatomy is a browser-only React and TypeScript explorer for OpenAPI and Swagger specifications. Keep imported specifications local; parsing, sharing preparation, and graph layout run locally, with workers for expensive operations. URL import fetches only the source the user selects.

## Repository conventions

- There must be no em dashes at all in this repository. This includes code, comments, UI strings, documentation, configuration, and skill files. Use a hyphen, colon, comma, or parentheses instead. Run `npm run check:text` to enforce this rule.
- Keep TypeScript strict and follow the existing Prettier style.
- Reuse the production parser, diff engine, and share services in tests. Do not duplicate their algorithms in test helpers.
- Preserve backward compatibility for plain specification files, existing share links, and older IndexedDB workspace records.
- Use the project codec when saving, sharing, or restoring multiple files. Preserve the root filename and resolve nested references relative to their containing file.
- Quote complete shell arguments after serialization when generating cURL snippets.
- Cache schema targets independently of reference-specific sibling fields. Keep external reference scope attached to the containing document, including non-schema objects and local siblings.
- Route file selections and drops through `src/share/importService.ts`. Prepare and validate a complete import before replacing project state; cancel or ignore superseded asynchronous work.
- Use `src/share/projectLimits.ts` for size limits and store root text once in project envelopes. Check both encoding and decoding against the same limits.
- Treat specification names as arbitrary user data. Use `src/utils/dictionary.ts` and own-property lookups for input-keyed records, including records restored by structured cloning.
- Keep workspace renames collision-safe and atomic. Never implement a move as separate save and delete transactions.

## Validation

Use focused Vitest tests while editing, then `npm run check` for type checking, source text, lint, formatting, coverage, and a production build. Browser regressions live in `tests/e2e`; run `npm run e2e` for UI changes when browser prerequisites are available. Report any checks that could not run.

The reusable development skill is at [SKILL.md](.agents/skills/apiatomy-development/SKILL.md). Use it for deeper guidance on parser, project persistence, sharing, and diff changes. Follow the user's requested commit structure; do not assume permission to publish or deploy from these instructions.
