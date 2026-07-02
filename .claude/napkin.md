# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-07-02] `save.js` only checked top-level `typeof` on save fields, not content**
   `REQUIRED_FIELDS` verified e.g. `itemsFoundByItem: 'object'` but never that the values inside
   were finite numbers — a manipulated/imported save could smuggle a string (incl. HTML) into any
   `id -> number` map or nested map and pass validation.
   Do instead: when adding a new persisted field to `GameState` (`packages/engine/src/state.js`),
   also add a content-level check to `validateDeepContent()` in `packages/engine/src/save.js` —
   numeric maps must be `Number.isFinite` per value, boolean maps `typeof === 'boolean'`, arrays
   must have their element shape checked, not just `Array.isArray`. Top-level `typeof` alone is not
   enough for any field the UI will later interpolate.

## Domain Behavior Guardrails
1. **[2026-07-02] `state`-derived values interpolated into `innerHTML` via `|| 0` are an XSS vector**
   `const x = state.someMap[id] || 0;` followed by `` `${x}` `` inside an `innerHTML` template does
   NOT coerce to a number — `|| 0` only replaces falsy values, so a non-empty malicious string
   survives and gets injected raw (found live in `CollectionView.js`, `PrestigeView.js`,
   `ShopView.js`, `AutomationView.js`, fixed in `fix/xss-save-collection`).
   Do instead: any numeric value read from `state` and interpolated into an `innerHTML` template
   must be `Number(x) || 0`, not `x || 0`. Any free-string value from `state` (like an id inside an
   array/object field, e.g. `autoProcessing[].containerId`) must be resolved against a known/static
   allow-list (e.g. `allContainers.find(...)`) before interpolation, never shown raw. Validation in
   `save.js` covers *type*, not HTML-safety — the UI sink still needs its own coercion/allow-list as
   defense in depth.

## User Directives
1. **[2026-07-02] Security fixes go through the CLAUDE.md engine/UI boundary too**
   Do instead: even a security-only fix (`agentes/*.md` one-off prompts) still respects
   engine-does-validation / UI-does-defense-in-depth split, gets a Vitest regression test, and gets
   documented in `agentes/HANDOFF.md` under its own section — not folded into an unrelated phase's
   block.
