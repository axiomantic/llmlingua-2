---
title: Reference overview
description: How the reference docs are organized.
---

The pages under **Reference** in this versioned tree are a frozen snapshot
of the TypeDoc-generated docs (via [TypeDoc](https://typedoc.org/) +
[`starlight-typedoc`](https://starlight-typedoc.vercel.app/)) taken when
v0.1.0 was cut. The docs build only regenerates the latest tree at
`reference/api/`; this `0.1.0/` snapshot is intentionally static and is
edited by hand only to fix broken links or rewrite paths.

## Public surface

The package exposes a single class, `LLMLingua2Wrapper`, plus an error
hierarchy and a few type aliases. The default export is a lazy singleton
configured with sensible defaults; instantiate `LLMLingua2Wrapper` directly
when you need to pin `modelId`, `revision`, or forward custom
`transformersOptions`.

## Improving a doc page

To improve a reference page for the current development version, edit the
JSDoc on the corresponding symbol in `src/` and re-run `just docs`. That
regenerates the latest tree at `reference/api/`. The 0.1.0 snapshot here
is not regenerated and would need to be re-cut to pick up source changes.

See the [API reference](/llmlingua-2/0.1.0/reference/api/readme/) for the full public surface.
