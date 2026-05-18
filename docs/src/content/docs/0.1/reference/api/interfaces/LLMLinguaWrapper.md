---
editUrl: false
next: false
prev: false
title: "LLMLinguaWrapper"
---

Defined in: [src/types.ts:74](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L74)

The pinned operator contract. [LLMLingua2Wrapper](/llmlingua-2-js/reference/api/classes/llmlingua2wrapper/) implements this.

## Properties

### available

> `readonly` **available**: `boolean`

Defined in: [src/types.ts:77](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L77)

***

### modelId

> `readonly` **modelId**: `string`

Defined in: [src/types.ts:75](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L75)

***

### version

> `readonly` **version**: `string`

Defined in: [src/types.ts:76](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L76)

## Methods

### compress()

> **compress**(`text`, `opts?`): `Promise`\<\{ `compressed`: `string`; `reverseMap`: `unknown`; \}\>

Defined in: [src/types.ts:78](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L78)

#### Parameters

##### text

`string`

##### opts?

###### targetRatio?

`number`

#### Returns

`Promise`\<\{ `compressed`: `string`; `reverseMap`: `unknown`; \}\>

***

### decompress()

> **decompress**(`compressed`, `reverseMap`): `Promise`\<`string`\>

Defined in: [src/types.ts:85](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/types.ts#L85)

#### Parameters

##### compressed

`string`

##### reverseMap

`unknown`

#### Returns

`Promise`\<`string`\>
