# llmlingua-2-js — Project Instructions

## Project Philosophy

This project follows axiomantic standards: production-quality or nothing,
audit-driven tooling, no shortcuts. Read this file before making changes.

## Build & Test Commands

The justfile is the canonical command surface. Don't memorize `npm` invocations.

| Task | Command | Notes |
|---|---|---|
| Run unit tests | `just test` | vitest, mocks transformers |
| Run integration tests | `just integration` | ~560 MB model download on first run |
| Lint | `just lint` | biome check + tsc --noEmit |
| Auto-format | `just fmt` | biome check --write |
| Build docs | `just docs` | Astro Starlight dev server |
| Build dist | `just build` | tsup (ESM + CJS + .d.ts) |
| Pre-release smoke | `just release-preflight` | lint + test + build |

## Setup

1. Install Node `>=20` (e.g. via `nvm` or `mise`).
2. `npm ci`
3. `pre-commit install --install-hooks`   # requires Python's pre-commit; registers pre-commit AND pre-push hooks

## Key Conventions

- **Single public entry:** all public exports live in `src/index.ts`. New
  symbols must be re-exported there to appear in the TypeDoc API reference.
- **Tests mirror src:** `tests/<name>.unit.test.ts` mirrors `src/<name>.ts`.
- **Docstrings:** JSDoc; TypeDoc reads them for the docs API reference.
- **Type hints:** `strict: true`, `noUncheckedIndexedAccess: true`,
  `exactOptionalPropertyTypes: true`. No `any` without justification.
- **Formatting authority:** Biome. Do not hand-format.
- **Public API is frozen.** `LLMLingua2Wrapper`'s surface (and the
  `LLMLinguaWrapper` interface) is pinned by `tests/contract.test.ts`.
  Breaking it requires updating the contract test AND coordinating with
  upstream consumers (pi-mesh-g).

## Forbidden Patterns

- No `any` in production code without a one-line justification comment.
- No blanket `try { ... } catch (e: unknown) {}` swallowing errors silently.
- No commented-out code. Delete or fix.
- No `// @ts-ignore` / `// @ts-expect-error` without a comment explaining why.
- No `console.log` in production code (use a logger or rethrow). Tests are exempt.
- Never bump `version` in `package.json` by hand; release-please owns it.

## Operational Notes

### OPENROUTER_KEY (org secret) — REQUIRED for pr-agent
The pr-agent.yml workflow consumes `secrets.OPENROUTER_KEY` from the repo or
org level. Verify with `gh secret list -o axiomantic | grep OPENROUTER_KEY`
before opening the first PR. Without it, pr-agent.yml fails on the first PR
with no review output.

### `@devel` pin coupling — KNOWN LIVE RISK
`pr-agent.yml` inherits from `axiomantic/.github/.github/workflows/pr-agent.yml@devel`.
Breaking changes upstream propagate immediately. To pin this project to a
specific upstream SHA, replace `@devel` with the SHA in
`.github/workflows/pr-agent.yml`.

### npm publishing (OIDC + provenance)
`release.yml` runs `npm publish --provenance --access public` on tag push. Two
viable auth paths:

1. **Automation token (default):** set `NPM_TOKEN` repo secret to an npm
   automation token. The workflow's `id-token: write` permission still
   enables Sigstore provenance.
2. **npm trusted publisher (recommended long-term):** configure a trusted
   publisher at <https://www.npmjs.com/settings/axiomantic/packages/trusted-publishers>
   with workflow `release.yml` and environment `npm`. With trusted publisher
   configured, `NPM_TOKEN` is unnecessary.

### release-please flow
`release-please.yml` watches `main` for conventional commits and opens/updates
a release PR with the changelog + version bump. Merging the release PR creates
a git tag, which triggers `release.yml`.

### Integration suite is env-gated
`tests/integration.test.ts` self-gates on `process.env.LLMLINGUA_INTEGRATION`.
`npm test` collects it but skips. `npm run test:integration` (or
`just integration`) runs it. CI runs unit tests only on PRs; the integration
suite has its own nightly + manual workflow.

### Model: HuggingFace Hub default + revision pinning
The default model is `atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank`.
Pin `revision` in production usage. A future minor release may re-host weights
under the `axiomantic/` namespace; the default `modelId` will change in a
clearly-documented bump if so.

## Glossary

- **reverseMap** — JSON-serializable payload returned by `compress`; carries
  `originalText` so `decompress` can do a faithful round-trip without
  re-loading the model. The library is a one-way lossy compressor; the
  `decompress` name is dictated by the pinned interface contract.
- **chunk** — sentence-bounded slice of input fitting inside the XLM-RoBERTa
  512-token window. Produced by `splitForXlmR`.
- **integration suite** — `tests/integration.test.ts`; real-model smoke
  pulling ONNX weights from the HF Hub. NOT on PR CI.
