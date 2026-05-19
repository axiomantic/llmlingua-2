/**
 * `@axiomantic/llmlingua-2-js` — public entrypoint.
 *
 * Named exports give you the class, its options, the result shapes,
 * and the error hierarchy. The default export is a lazy singleton
 * (the model is loaded on first `compress` call), making zero-config
 * imports trivial.
 *
 * @example Named import
 * ```ts
 * import { LLMLingua2Wrapper } from "@axiomantic/llmlingua-2-js";
 * const w = new LLMLingua2Wrapper({ revision: "abc123" });
 * const { compressed, reverseMap } = await w.compress(text);
 * ```
 *
 * @example Default import (zero-config, shared instance)
 * ```ts
 * import lingua from "@axiomantic/llmlingua-2-js";
 * const { compressed, reverseMap } = await lingua.compress(text);
 * ```
 */

export {
  LLMLingua2Error,
  LLMLingua2InvalidReverseMapError,
  LLMLingua2NotAvailableError,
} from "./errors.js";
export type {
  CompressOptions,
  CompressResult,
  LLMLinguaWrapper,
  ReverseMapV1,
  WrapperOptions,
} from "./types.js";
export { DEFAULT_MODEL_ID, LLMLingua2Wrapper } from "./wrapper.js";

import { LLMLingua2Wrapper } from "./wrapper.js";

/**
 * Default lazy singleton. The constructor only stores config; the model
 * is loaded on the first `compress` call. Multiple default-import
 * consumers in the same process share this one instance (and the one
 * model load).
 */
const _default = new LLMLingua2Wrapper();
export default _default;
