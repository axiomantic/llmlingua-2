---
editUrl: false
next: false
prev: false
title: "default"
---

> `const` **default**: [`LLMLingua2Wrapper`](/llmlingua-2-js/reference/api/classes/llmlingua2wrapper/)

Defined in: [src/index.ts:44](https://github.com/axiomantic/llmlingua-2-js/blob/7e087e04b284e13f15542365136a795e9d6ce3a6/src/index.ts#L44)

Default lazy singleton. The constructor only stores config; the model
is loaded on the first `compress` call. Multiple default-import
consumers in the same process share this one instance (and the one
model load).
