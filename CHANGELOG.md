# Changelog

All notable changes to `@axiomantic/llmlingua-2-js` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-05-19)


### Features

* initial v0.1.0 release of @axiomantic/llmlingua-2 ([b1d1b0a](https://github.com/axiomantic/llmlingua-2-js/commit/b1d1b0acf8c08ff5fa7e538b4f087790d2fefa78))
* initial v0.1.0 release of @axiomantic/llmlingua-2 ([c404375](https://github.com/axiomantic/llmlingua-2-js/commit/c404375e169fd4b0f3a9352600a8a1059f31d1fa))


### Bug Fixes

* **wrapper:** handle real Tensor logits + BigInt input_ids; cache specials ([aee3c83](https://github.com/axiomantic/llmlingua-2-js/commit/aee3c8360448a690b4f0d6ce15d20160d1c05ca8))

## [0.1.0] - 2026-05-18

### Added

- Initial release of `@axiomantic/llmlingua-2-js`.
- `LLMLingua2Wrapper` class implementing the pinned `LLMLinguaWrapper` contract.
- Lazy-loaded default singleton export (zero-config import).
- ESM-only Node ≥20 distribution.
- Sentence-boundary chunking (`splitForXlmR`) for inputs over ~480 source tokens.
- Versioned `reverseMap` (`v: 1`) carrying the original text for faithful `decompress` round-trips.
- Error hierarchy: `LLMLingua2Error` (base), `LLMLingua2NotAvailableError` (code `ENOT_AVAILABLE`), `LLMLingua2InvalidReverseMapError` (code `EINVALID_REVERSE_MAP`).
- Vitest unit suite with the transformers.js pipeline mocked at the `loadModel` seam.
- Env-gated integration test (`LLMLINGUA_INTEGRATION=1`) for real model round-trips.
- `scripts/convert.sh` operator helper for re-exporting and quantizing custom checkpoints.
- CI workflow (`.github/workflows/ci.yml`) running lint, typecheck, and unit tests on Node 20 and 22.
