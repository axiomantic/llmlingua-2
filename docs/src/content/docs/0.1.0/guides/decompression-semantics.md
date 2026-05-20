---
title: Decompression semantics
description: Why decompress is one-way lossy, and what reverseMap actually contains.
---

LLMLingua-2 is a **one-way lossy** compressor. The model predicts a per-token
"preserve" probability and drops the lowest-scoring tokens; there is no learned
decoder. To honor the `decompress(compressed, reverseMap) → original` contract,
this library stashes the original text inside the `reverseMap` payload so
`decompress` is a faithful round-trip.

## Practical consequences

- `decompress` does **not** load the model. It just reads `reverseMap.originalText`.
  You can call it without ever paying the model-download cost.
- If you don't need round-trip (you're only sending `compressed` to a downstream
  LLM), discard `reverseMap` immediately to free memory.
- `reverseMap` is JSON-serializable. You can persist it to disk or send it over
  the wire and `decompress` later in a different process.
- The name `decompress` is dictated by the pinned interface contract, not by the
  model's actual capabilities. This is documented behavior, not a bug.

## Shape

```ts
interface ReverseMapV1 {
  v: 1;
  originalText: string;
  keepMask: boolean[];   // optional; reserved for future use
}
```

## Validation errors

If you pass a malformed `reverseMap` to `decompress`, it rejects with
`LLMLingua2InvalidReverseMapError` (`code: "EINVALID_REVERSE_MAP"`). Catch via
`instanceof LLMLingua2Error` and switch on `.code` for stable identification.
