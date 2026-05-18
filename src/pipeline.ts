/**
 * Pipeline loader for `@huggingface/transformers`.
 *
 * Wraps `AutoTokenizer.from_pretrained` + `AutoModelForTokenClassification.from_pretrained`
 * behind a single mockable seam. Unit tests mock this module wholesale
 * (`vi.mock("../src/pipeline.js", ...)`); the wrapper has no direct
 * compile-time dependency on the heavyweight transformers surface.
 *
 * The module name `pipeline.ts` is retained for path stability even
 * though we no longer use the high-level `pipeline()` constructor (see
 * design § 4.3: the v3 token-classification pipeline does not emit
 * per-token preserve scores, so we drop down to the lower-level APIs
 * that mirror Microsoft's reference algorithm).
 */
import {
  AutoTokenizer,
  AutoModelForTokenClassification,
  type PreTrainedTokenizer,
  type PreTrainedModel,
} from "@huggingface/transformers";

export interface LoadedModel {
  tokenizer: PreTrainedTokenizer;
  model: PreTrainedModel;
  /** Index in `id2label` that corresponds to the "preserve" class. */
  preserveLabelIndex: number;
  /**
   * Cached set of special token ids (CLS, SEP, PAD, etc.) computed
   * once at load time. Special tokens are excluded from the keep
   * budget on every chunk; recomputing the Set per `compress()` call
   * is wasted work, especially for short inputs.
   */
  specialIds: Set<number>;
}

export interface LoadModelOptions {
  modelId: string;
  revision?: string | undefined;
  quantized?: boolean | undefined;
  transformersOptions?: Record<string, unknown> | undefined;
}

/**
 * Resolve the `preserve` label index from the model config.
 *
 * The upstream LLMLingua-2 token-classification head uses two labels:
 *   - 0: "drop"     (token is removed from the compressed output)
 *   - 1: "preserve" (token survives compression)
 *
 * When `id2label` is present we search it for a /preserve|keep/i match.
 * When `id2label` is missing entirely (as in the ONNX export at
 * `atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank`), we fall back
 * to **1**, matching upstream's label order. Defaulting to 0 selects
 * the "drop" class and inverts the semantics — empirically verified
 * against the cached ONNX model: at low targetRatio the compressed
 * output retained fillers and dropped content words, which is the
 * signature of an inverted preserve index.
 */
export function resolvePreserveLabelIndex(id2label: unknown): number {
  if (typeof id2label !== "object" || id2label === null) {
    console.warn(
      "[llmlingua-2] model.config.id2label missing; defaulting preserveLabelIndex=1 (upstream LLMLingua-2 convention: 0=drop, 1=preserve)",
    );
    return 1;
  }
  const map = id2label as Record<string, string>;
  for (const [key, value] of Object.entries(map)) {
    if (typeof value !== "string") continue;
    if (/preserve|keep/i.test(value)) {
      const idx = Number(key);
      if (Number.isFinite(idx)) return idx;
    }
  }
  console.warn(
    "[llmlingua-2] no 'preserve'-like label found in model.config.id2label; defaulting preserveLabelIndex=1",
  );
  return 1;
}

/**
 * Load the tokenizer + token-classification model, returning a
 * resolved `preserveLabelIndex` from the model config.
 */
export async function loadModel(opts: LoadModelOptions): Promise<LoadedModel> {
  const { modelId, revision, quantized = true, transformersOptions = {} } = opts;

  const tokenizerOpts: Record<string, unknown> = { ...transformersOptions };
  if (revision !== undefined) tokenizerOpts["revision"] = revision;

  const modelOpts: Record<string, unknown> = {
    dtype: quantized ? "q8" : "fp32",
    ...transformersOptions, // transformersOptions wins (e.g. explicit dtype)
  };
  if (revision !== undefined) modelOpts["revision"] = revision;

  // The transformers.js type definitions for `from_pretrained` use a
  // typed options object; we widen via `as` because we forward arbitrary
  // user options (cache_dir, device, etc.) that aren't in the public type.
  const tokenizer = await AutoTokenizer.from_pretrained(
    modelId,
    tokenizerOpts as Parameters<typeof AutoTokenizer.from_pretrained>[1],
  );
  const model = await AutoModelForTokenClassification.from_pretrained(
    modelId,
    modelOpts as Parameters<typeof AutoModelForTokenClassification.from_pretrained>[1],
  );

  const id2label = (model as unknown as { config?: { id2label?: unknown } }).config?.id2label;
  const preserveLabelIndex = resolvePreserveLabelIndex(id2label);

  // Compute the special-token id set once at load time. Tokenizers in
  // transformers.js expose `all_special_ids` as a `number[]`; some
  // builds expose it as a typed array. Normalize via `Number()` to
  // survive either shape (including the BigInt64 case).
  const rawSpecials =
    (tokenizer as unknown as { all_special_ids?: ArrayLike<number | bigint> })
      .all_special_ids ?? [];
  const specialIds = new Set<number>(
    Array.from(rawSpecials as ArrayLike<number | bigint>, (x) => Number(x)),
  );

  return { tokenizer, model, preserveLabelIndex, specialIds };
}
