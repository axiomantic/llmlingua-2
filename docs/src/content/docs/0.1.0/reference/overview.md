---
title: Reference overview
description: How the reference docs are organized.
---

The pages under **Reference** are auto-generated from JSDoc comments in `src/`
via [TypeDoc](https://typedoc.org/) and the
[`starlight-typedoc`](https://starlight-typedoc.vercel.app/) plugin.

## Public surface

The package exposes a single class, `LLMLingua2Wrapper`, plus an error
hierarchy and a few type aliases. The default export is a lazy singleton
configured with sensible defaults; instantiate `LLMLingua2Wrapper` directly
when you need to pin `modelId`, `revision`, or forward custom
`transformersOptions`.

## Improving a doc page

To improve a reference page, edit the JSDoc on the corresponding symbol in
`src/` and re-run `just docs`. The TypeDoc-generated tree under
`reference/api/` is rebuilt on every docs build.

See the [API reference](/llmlingua-2/0.1.0/reference/api/readme/) for the full public surface.
