---
title: Model provenance
description: What model runs by default, where it comes from, and how to pin a revision.
---

The default model is
[`atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank`](https://huggingface.co/atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank)
on the Hugging Face Hub: an ONNX export (int8 + fp32 variants) of Microsoft Research's
[LLMLingua-2](https://github.com/microsoft/LLMLingua) trained on the MeetingBank
dataset.

## Pinning a revision

We strongly recommend pinning `revision` to a specific commit hash in production.
The default (no pin) follows the Hub's `main` branch and is subject to upstream
changes.

```ts
import { LLMLingua2Wrapper } from "@axiomantic/llmlingua-2-js";

const wrapper = new LLMLingua2Wrapper({
  revision: "<git-sha-from-huggingface>",
});
```

## Quantization

| `quantized` | dtype | Approximate size |
|---|---|---|
| `true` (default) | `q8` | ~560 MB |
| `false` | `fp32` | ~2.2 GB |

For finer control, pass `transformersOptions.dtype` directly; it wins over
`quantized`.

## Future provenance changes

A future minor release may re-host the ONNX weights under the `axiomantic/`
namespace for supply-chain durability. The default `modelId` will change in a
clearly-documented major or minor bump if it does.
