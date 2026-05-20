---
editUrl: false
next: false
prev: false
title: "ReverseMapV1"
---

Defined in: [src/types.ts:35](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L35)

Versioned reverseMap shape produced by this library. Consumers see
`unknown` via the [LLMLinguaWrapper](/llmlingua-2/0.1.0/reference/api/interfaces/llmlinguawrapper/) contract; this is the
concrete internal shape.

## Properties

### keepMask

> **keepMask**: `boolean`[]

Defined in: [src/types.ts:43](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L43)

One bool per source token; true = kept, false = dropped.
Diagnostic only — aligned to tokenizer tokens, NOT to characters
of `originalText`.

***

### originalText

> **originalText**: `string`

Defined in: [src/types.ts:37](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L37)

***

### v

> **v**: `1`

Defined in: [src/types.ts:36](https://github.com/axiomantic/llmlingua-2/blob/eb33f3e72d36902ceb7dc32489fd50f561de6ecb/src/types.ts#L36)
