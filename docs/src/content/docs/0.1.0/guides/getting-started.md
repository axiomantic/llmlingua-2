---
title: Getting started
description: Install and use llmlingua-2 in three lines.
---

## Install

```sh
npm install @axiomantic/llmlingua-2 @huggingface/transformers
```

`@huggingface/transformers` is a peer dependency. Pin the same major version your
application uses; this package develops against `^3`.

## Compress + decompress

```ts
import lingua from "@axiomantic/llmlingua-2";

const text = "Long meeting transcript or RAG context here...";
const { compressed, reverseMap } = await lingua.compress(text, { targetRatio: 0.5 });

// Hand `compressed` to your downstream LLM.
// Stash `reverseMap` if you need a faithful round-trip later.
const restored = await lingua.decompress(compressed, reverseMap);
console.assert(restored === text);
```

The default import is a lazy singleton. The model (~560 MB int8) is downloaded
from the Hugging Face Hub on the first `compress` call and reused thereafter.

## Tuning the compression ratio

`targetRatio` is the fraction of source tokens to retain. It is clamped to
`[0.05, 0.95]`. Lower values yield more aggressive compression at the cost of
losing more low-importance content.

```ts
// Keep ~30% of tokens
const { compressed } = await lingua.compress(text, { targetRatio: 0.3 });
```

## Next steps

- [Decompression semantics](/guides/decompression-semantics/) — why `decompress` doesn't need the model.
- [Model provenance](/guides/model-provenance/) — what model runs by default and how to pin a revision.
- [Chunking and limitations](/guides/chunking/) — sentence chunker assumptions and v0.1 caveats.
- [API reference](/llmlingua-2/reference/api/) — the full public surface.
