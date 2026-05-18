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
}

export interface LoadModelOptions {
  modelId: string;
  revision?: string | undefined;
  quantized?: boolean | undefined;
  transformersOptions?: Record<string, unknown> | undefined;
}

/**
 * Resolve the `preserve` label index from the model config. Looks for
 * an `id2label` value matching /preserve|keep|^LABEL_0$/i; falls back
 * to 0 with a console.warn when no match is found.
 */
export function resolvePreserveLabelIndex(id2label: unknown): number {
  if (typeof id2label !== "object" || id2label === null) {
    console.warn(
      "[llmlingua-2] model.config.id2label missing; defaulting preserveLabelIndex=0",
    );
    return 0;
  }
  const map = id2label as Record<string, string>;
  for (const [key, value] of Object.entries(map)) {
    if (typeof value !== "string") continue;
    if (/preserve|keep|^LABEL_0$/i.test(value)) {
      const idx = Number(key);
      if (Number.isFinite(idx)) return idx;
    }
  }
  console.warn(
    "[llmlingua-2] no 'preserve'-like label found in model.config.id2label; defaulting preserveLabelIndex=0",
  );
  return 0;
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

  return { tokenizer, model, preserveLabelIndex };
}
