---
title: Chunking and limitations
description: How the sentence chunker works, and what to watch out for in v0.1.
---

LLMLingua-2's tokenizer (XLM-RoBERTa) has a 512-token input window. This
package splits long inputs into sentence-bounded chunks below that limit
and runs the model independently on each chunk before stitching the
output back together.

## v0.1 limitations

- **English-biased sentence chunking.** The chunker splits on `.`, `!`, `?`
  followed by whitespace. CJK, Arabic, and other non-whitespace scripts may
  collapse into a single chunk and exceed the 512-token limit; transformers.js
  then truncates. The full original text remains accessible via
  `reverseMap.originalText` so `decompress` round-trips correctly.

- **No streaming compress.** `compress` accumulates per-chunk output into a
  single string. There is no incremental API in v0.1.

- **`available` is a snapshot.** Reading `wrapper.available` immediately after
  construction returns `false`; await the first `compress` call to ensure the
  model is ready, or poll `available` after dispatching one compress.

- **No browser / WebGPU support in v0.1.** Designed for Node ≥20.

- **Integration test not on PR CI.** Real model load downloads ~560 MB; run
  `npm run test:integration` locally with `LLMLINGUA_INTEGRATION=1`. The same
  suite runs nightly (Mondays 07:00 UTC) and on `workflow_dispatch` via
  `.github/workflows/integration.yml`.

## CJS usage

This package is ESM-first. The CJS build is published as `dist/index.cjs` and
selected automatically by Node's exports resolution. From CommonJS:

```js
const lingua = require("@axiomantic/llmlingua-2-js").default;
```

Or with dynamic import from an ESM-only consumer:

```js
const lingua = (await import("@axiomantic/llmlingua-2-js")).default;
```
