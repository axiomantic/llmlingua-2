---
editUrl: false
next: false
prev: false
title: "ReverseMapV1"
---

Defined in: [src/types.ts:35](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L35)

Versioned reverseMap shape produced by this library. Consumers see
`unknown` via the [LLMLinguaWrapper](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/) contract; this is the
concrete internal shape.

## Properties

### keepMask

> **keepMask**: `boolean`[]

Defined in: [src/types.ts:43](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L43)

One bool per source token; true = kept, false = dropped.
Diagnostic only — aligned to tokenizer tokens, NOT to characters
of `originalText`.

***

### originalText

> **originalText**: `string`

Defined in: [src/types.ts:37](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L37)

***

### v

> **v**: `1`

Defined in: [src/types.ts:36](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L36)
