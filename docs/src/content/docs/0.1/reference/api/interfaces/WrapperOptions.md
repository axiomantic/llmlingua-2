---
editUrl: false
next: false
prev: false
title: "WrapperOptions"
---

Defined in: [src/types.ts:49](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L49)

Options accepted by the [LLMLingua2Wrapper](/llmlingua-2/reference/api/classes/llmlingua2wrapper/) constructor.

## Properties

### modelId?

> `optional` **modelId?**: `string`

Defined in: [src/types.ts:54](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L54)

HF repo id. Default: `"atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank"`.
Empty string or non-string throws `TypeError` at construction.

***

### quantized?

> `optional` **quantized?**: `boolean`

Defined in: [src/types.ts:62](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L62)

If true (default), select the int8-quantized ONNX variant
(`dtype: 'q8'`); `false` maps to `dtype: 'fp32'`. Override via
`transformersOptions.dtype` for finer control.

***

### revision?

> `optional` **revision?**: `string`

Defined in: [src/types.ts:56](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L56)

Optional model revision / commit hash for pinning.

***

### transformersOptions?

> `optional` **transformersOptions?**: `Record`\<`string`, `unknown`\>

Defined in: [src/types.ts:68](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L68)

Options forwarded to the underlying transformers.js loaders
(e.g. `device`, `dtype`, `cache_dir`, `local_files_only`).
Wins over `quantized` on conflict.
