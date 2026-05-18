---
editUrl: false
next: false
prev: false
title: "LLMLingua2Wrapper"
---

Defined in: [src/wrapper.ts:124](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/wrapper.ts#L124)

`@axiomantic/llmlingua-2` — public entrypoint.

Named exports give you the class, its options, the result shapes,
and the error hierarchy. The default export is a lazy singleton
(the model is loaded on first `compress` call), making zero-config
imports trivial.

## Examples

```ts
import { LLMLingua2Wrapper } from "@axiomantic/llmlingua-2";
const w = new LLMLingua2Wrapper({ revision: "abc123" });
const { compressed, reverseMap } = await w.compress(text);
```

```ts
import lingua from "@axiomantic/llmlingua-2";
const { compressed, reverseMap } = await lingua.compress(text);
```

## Implements

- [`LLMLinguaWrapper`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/)

## Constructors

### Constructor

> **new LLMLingua2Wrapper**(`options?`): `LLMLingua2Wrapper`

Defined in: [src/wrapper.ts:141](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/wrapper.ts#L141)

#### Parameters

##### options?

[`WrapperOptions`](/llmlingua-2-js/reference/api/interfaces/wrapperoptions/)

#### Returns

`LLMLingua2Wrapper`

## Properties

### modelId

> `readonly` **modelId**: `string`

Defined in: [src/wrapper.ts:125](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/wrapper.ts#L125)

#### Implementation of

[`LLMLinguaWrapper`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/).[`modelId`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/#modelid)

***

### version

> `readonly` **version**: `string`

Defined in: [src/wrapper.ts:126](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/wrapper.ts#L126)

#### Implementation of

[`LLMLinguaWrapper`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/).[`version`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/#version)

## Accessors

### available

#### Get Signature

> **get** **available**(): `boolean`

Defined in: [src/wrapper.ts:137](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/wrapper.ts#L137)

Snapshot reader; flips to `true` once init has succeeded.

##### Returns

`boolean`

#### Implementation of

[`LLMLinguaWrapper`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/).[`available`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/#available)

## Methods

### compress()

> **compress**(`text`, `opts?`): `Promise`\<[`CompressResult`](/llmlingua-2-js/reference/api/interfaces/compressresult/)\>

Defined in: [src/wrapper.ts:155](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/wrapper.ts#L155)

#### Parameters

##### text

`string`

##### opts?

[`CompressOptions`](/llmlingua-2-js/reference/api/interfaces/compressoptions/)

#### Returns

`Promise`\<[`CompressResult`](/llmlingua-2-js/reference/api/interfaces/compressresult/)\>

#### Implementation of

[`LLMLinguaWrapper`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/).[`compress`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/#compress)

***

### decompress()

> **decompress**(`_compressed`, `reverseMap`): `Promise`\<`string`\>

Defined in: [src/wrapper.ts:280](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/wrapper.ts#L280)

#### Parameters

##### \_compressed

`string`

##### reverseMap

`unknown`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`LLMLinguaWrapper`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/).[`decompress`](/llmlingua-2-js/reference/api/interfaces/llmlinguawrapper/#decompress)
