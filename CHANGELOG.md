# Changelog

All notable changes to `@axiomantic/llmlingua-2` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-20

### Added

- Initial release of `@axiomantic/llmlingua-2`.
- `LLMLingua2Wrapper` class implementing the pinned `LLMLinguaWrapper` contract.
- Lazy-loaded default singleton export (zero-config import).
- Dual ESM + CJS distribution (`dist/index.js`, `dist/index.cjs`) with TypeScript declarations, built by tsup. Node ≥20.
- Peer dependency on `@huggingface/transformers@^4`.
- Sentence-boundary chunking (`splitForXlmR`) for inputs over ~480 source tokens.
- Versioned `reverseMap` (`v: 1`) carrying the original text for faithful `decompress` round-trips.
- Error hierarchy: `LLMLingua2Error` (base), `LLMLingua2NotAvailableError` (code `ENOT_AVAILABLE`), `LLMLingua2InvalidReverseMapError` (code `EINVALID_REVERSE_MAP`).
- Vitest unit suite with the transformers.js pipeline mocked at the `loadModel` seam (29 tests).
- Env-gated integration test (`LLMLINGUA_INTEGRATION=1`) for real model round-trips, including content-word-survival assertions and target-ratio adherence (±20%) across `{0.3, 0.5, 0.7}`.
- `scripts/convert.sh` operator helper for re-exporting and quantizing custom checkpoints.
- CI workflow (`.github/workflows/ci.yml`) running lint, typecheck, and unit tests on Node 20 and 22.
- Astro Starlight documentation site with TypeDoc-generated API reference and versioned docs.
- Release pipeline: tag-on-version-bump workflow + `release.yml` publishing to npm with Sigstore provenance.
