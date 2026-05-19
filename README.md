# @axiomantic/llmlingua-2-js

[![npm version](https://img.shields.io/npm/v/@axiomantic/llmlingua-2-js.svg)](https://www.npmjs.com/package/@axiomantic/llmlingua-2-js) [![npm downloads](https://img.shields.io/npm/dm/@axiomantic/llmlingua-2-js.svg)](https://www.npmjs.com/package/@axiomantic/llmlingua-2-js) [![CI](https://github.com/axiomantic/llmlingua-2-js/actions/workflows/ci.yml/badge.svg)](https://github.com/axiomantic/llmlingua-2-js/actions/workflows/ci.yml) [![License](https://img.shields.io/npm/l/@axiomantic/llmlingua-2-js.svg)](./LICENSE) [![Types](https://img.shields.io/npm/types/@axiomantic/llmlingua-2-js.svg)](https://www.npmjs.com/package/@axiomantic/llmlingua-2-js) [![Node](https://img.shields.io/node/v/@axiomantic/llmlingua-2-js.svg)](https://www.npmjs.com/package/@axiomantic/llmlingua-2-js)

Typed [LLMLingua-2](https://llmlingua.com/) prompt compression for Node, via [`@huggingface/transformers`](https://github.com/huggingface/transformers.js).

Dual ESM + CJS. Node ≥20. MIT-licensed. Bring-your-own `@huggingface/transformers@^3` (peer dependency).

## Install

```sh
npm install @axiomantic/llmlingua-2-js @huggingface/transformers
```

`@huggingface/transformers` is declared as a peer dependency. Pin the same major version your application uses; we develop against `^3`.

## Quick start

```ts
import lingua from "@axiomantic/llmlingua-2-js";

const text = "Long meeting transcript or RAG context here...";
const { compressed, reverseMap } = await lingua.compress(text, { targetRatio: 0.5 });

// Hand `compressed` to your downstream LLM. Stash `reverseMap` only if you
// need a faithful round-trip later (see "Decompression semantics").
const restored = await lingua.decompress(compressed, reverseMap);
console.assert(restored === text);
```

The default import is a lazy singleton: the constructor stores config only; the ONNX model is downloaded from the Hugging Face Hub on the first `compress` call. Subsequent calls reuse the same model in memory.

## API reference

### `LLMLingua2Wrapper`

```ts
class LLMLingua2Wrapper implements LLMLinguaWrapper {
  readonly modelId: string;
  readonly version: string;
  readonly available: boolean;
  constructor(options?: WrapperOptions);
  compress(text: string, opts?: CompressOptions):
    Promise<{ compressed: string; reverseMap: unknown }>;
  decompress(compressed: string, reverseMap: unknown): Promise<string>;
}
```

### `WrapperOptions`

| Field | Type | Default | Notes |
|---|---|---|---|
| `modelId` | `string` | `"atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank"` | Hugging Face repo id. Empty / non-string throws `TypeError` at construction. |
| `revision` | `string` | `undefined` | Recommended: pin to a specific commit hash. |
| `quantized` | `boolean` | `true` | `true` maps to `dtype: 'q8'` (~560 MB); `false` maps to `dtype: 'fp32'` (~2.2 GB). |
| `transformersOptions` | `Record<string, unknown>` | `{}` | Forwarded to `AutoTokenizer` / `AutoModelForTokenClassification` (e.g. `device`, `dtype`, `cache_dir`, `local_files_only`). Wins over `quantized`. |

### `CompressOptions`

| Field | Type | Default | Notes |
|---|---|---|---|
| `targetRatio` | `number` | `0.5` | Fraction of source tokens to retain. Clamped silently to `[0.05, 0.95]`. |

### `CompressResult`

```ts
interface CompressResult {
  compressed: string;
  reverseMap: unknown;   // opaque to consumers; pass back to decompress
}
```

### Error hierarchy

```ts
class LLMLingua2Error extends Error { readonly code: string }
class LLMLingua2NotAvailableError extends LLMLingua2Error    // code: "ENOT_AVAILABLE"
class LLMLingua2InvalidReverseMapError extends LLMLingua2Error  // code: "EINVALID_REVERSE_MAP"
```

| Condition | Surface | Error |
|---|---|---|
| Model load fails | `compress` rejects | `LLMLingua2NotAvailableError` (with `cause`) |
| Malformed `reverseMap` | `decompress` rejects | `LLMLingua2InvalidReverseMapError` |
| `text` not a string | `compress` throws sync | `TypeError` (caller bug) |
| Empty input | `compress` returns `{ compressed: "", reverseMap: {…} }` | (no error) |

Catch any library-originated error with `instanceof LLMLingua2Error`; switch on `.code` for stable identification.

## Decompression semantics

LLMLingua-2 is a **one-way lossy** compressor. The model predicts a per-token "preserve" probability and drops the lowest-scoring tokens; there is no learned decoder. To honor the `decompress(compressed, reverseMap) → original` contract, this library stashes the original text inside the `reverseMap` payload so `decompress` is a faithful round-trip.

Practical consequences:

- `decompress` does **not** load the model. It just reads `reverseMap.originalText`. You can call it without ever paying the model-download cost.
- If you don't need round-trip (you're only sending `compressed` to a downstream LLM), discard `reverseMap` immediately to free memory.
- `reverseMap` is JSON-serializable. You can persist it to disk or send it over the wire and `decompress` later in a different process.
- The name `decompress` is dictated by the pinned interface contract, not by the model's actual capabilities. This is documented behavior, not a bug.

## Model provenance

The default model is [`atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank`](https://huggingface.co/atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank) on the Hugging Face Hub: an ONNX export (int8 + fp32 variants) of Microsoft Research's [LLMLingua-2](https://github.com/microsoft/LLMLingua) trained on the MeetingBank dataset.

We strongly recommend pinning `revision` to a specific commit hash in production. The default behavior (no pin) follows the Hub's `main` branch and is subject to upstream changes.

A future minor release may re-host the ONNX weights under the `axiomantic/` namespace for supply-chain durability; the default `modelId` will change in a clearly-documented major or minor bump if it does.

## Limitations (v0.1)

- **English-biased sentence chunking.** The chunker splits on `.`, `!`, `?` followed by whitespace. CJK, Arabic, and other non-whitespace scripts may collapse into a single chunk and exceed the 512-token limit; transformers.js then truncates. The full original text remains accessible via `reverseMap.originalText` so `decompress` round-trips correctly.
- **No streaming compress.** `compress` accumulates per-chunk output into a single string.
- **`available` is a snapshot.** Reading `wrapper.available` immediately after construction returns `false`; await the first `compress` call to ensure the model is ready, or poll `available` after dispatching one compress.
- **No browser / WebGPU support in v0.1.** Designed for Node ≥20.
- **Integration test not on PR CI.** Real model load downloads ~560 MB; run `npm run test:integration` locally with `LLMLINGUA_INTEGRATION=1`. The same suite runs nightly (Mondays 07:00 UTC) and on `workflow_dispatch` via `.github/workflows/integration.yml`.

## CJS usage

This package ships both ESM (`dist/index.js`) and CJS (`dist/index.cjs`)
builds; Node's exports resolution selects the right one automatically.

```js
// CommonJS
const lingua = require("@axiomantic/llmlingua-2-js").default;
const out = await lingua.compress("...");

// or from an ESM-only consumer
const lingua = (await import("@axiomantic/llmlingua-2-js")).default;
```

## Contributing

Source: [github.com/axiomantic/llmlingua-2-js](https://github.com/axiomantic/llmlingua-2-js).

To re-export the ONNX model from a PyTorch checkpoint, see `scripts/convert.sh` (operator-runnable; not exercised in CI).

```sh
npm install
npm test            # unit tests, mocked transformers
npm run typecheck
npm run build
npm run test:integration   # downloads ~560 MB; opt-in
```

## License & attribution

MIT. Copyright (c) 2026 Axiomantic. See [LICENSE](./LICENSE).

This package wraps [Microsoft LLMLingua-2](https://github.com/microsoft/LLMLingua) (MIT) and the [atjsh ONNX export](https://huggingface.co/atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank) (see upstream for terms).

## Citation

If you use this library in academic work, please cite the underlying LLMLingua-2 paper:

```bibtex
@inproceedings{pan-etal-2024-llmlingua,
    title = "{LLML}ingua-2: Data Distillation for Efficient and Faithful Task-Agnostic Prompt Compression",
    author = "Pan, Zhuoshi  and
      Wu, Qianhui  and
      Jiang, Huiqiang  and
      Xia, Menglin  and
      Luo, Xufang  and
      Zhang, Jue  and
      Lin, Qingwei  and
      Ruhle, Victor  and
      Yang, Yuqing  and
      Lin, Chin-Yew  and
      Zhao, H. Vicky  and
      Qiu, Lili  and
      Zhang, Dongmei",
    editor = "Ku, Lun-Wei  and
      Martins, Andre  and
      Srikumar, Vivek",
    booktitle = "Findings of the Association for Computational Linguistics: ACL 2024",
    month = aug,
    year = "2024",
    address = "Bangkok, Thailand and virtual meeting",
    publisher = "Association for Computational Linguistics",
    url = "https://aclanthology.org/2024.findings-acl.57",
    doi = "10.18653/v1/2024.findings-acl.57",
    pages = "963--981",
}
```
