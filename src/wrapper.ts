/**
 * `LLMLingua2Wrapper` — the public class implementing the pinned
 * `LLMLinguaWrapper` contract.
 *
 * See `~/.local/spellbook/docs/.../2026-05-18-llmlingua-2-js-design.md`
 * § 3.1, § 4.2–4.5, § 5 for the full specification.
 */
import { softmax } from "@huggingface/transformers";
import { splitForXlmR } from "./chunking.js";
import { LLMLingua2InvalidReverseMapError, LLMLingua2NotAvailableError } from "./errors.js";
import { type LoadedModel, loadModel } from "./pipeline.js";
import type {
  CompressOptions,
  CompressResult,
  LLMLinguaWrapper,
  ReverseMapV1,
  WrapperOptions,
} from "./types.js";
import { PKG_VERSION } from "./version.js";

/** Default HF repo id for the LLMLingua-2 ONNX export. */
export const DEFAULT_MODEL_ID = "atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank";

const MIN_RATIO = 0.05;
const MAX_RATIO = 0.95;
const DEFAULT_RATIO = 0.5;

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/**
 * Returns the k-th largest value of `arr` (1-indexed; k=1 is the max).
 * Simple O(n log n) implementation — n is the tokens-per-chunk count
 * (<= ~480), so sort cost is negligible.
 */
function kthLargest(arr: number[], k: number): number {
  const sorted = [...arr].sort((a, b) => b - a);
  const idx = Math.min(Math.max(k - 1, 0), sorted.length - 1);
  return sorted[idx]!;
}

function validateReverseMap(v: unknown): ReverseMapV1 {
  if (typeof v !== "object" || v === null) {
    throw new LLMLingua2InvalidReverseMapError("reverseMap must be an object");
  }
  const o = v as Record<string, unknown>;
  if (o.v !== 1) {
    throw new LLMLingua2InvalidReverseMapError(`Unsupported reverseMap version: ${String(o.v)}`);
  }
  if (typeof o.originalText !== "string") {
    throw new LLMLingua2InvalidReverseMapError("reverseMap.originalText must be a string");
  }
  return {
    v: 1,
    originalText: o.originalText as string,
    keepMask: Array.isArray(o.keepMask) ? (o.keepMask as boolean[]) : [],
  };
}

/**
 * Extract `input_ids` as a plain `number[]` from a tokenizer encoding.
 *
 * Tokenizers in transformers.js return a Tensor whose `.data` is a
 * `BigInt64Array` (for int64 inputs). `Array.from(bigInt64Array)` yields
 * `bigint[]`, which silently breaks downstream numeric arithmetic and
 * `tokenizer.decode()` (which expects `number[]`). The `Number` mapper
 * coerces each element to a JS number. We accept plain arrays too so
 * test fakes stay trivial.
 */
function readInputIds(enc: unknown): number[] {
  const e = enc as {
    input_ids?: { data?: ArrayLike<number> | ArrayLike<bigint> | number[] };
  };
  const data = e.input_ids?.data;
  if (data == null) throw new TypeError("tokenizer encoding missing input_ids.data");
  if (Array.isArray(data)) return data.map((x) => Number(x));
  return Array.from(data as ArrayLike<number | bigint>, (x) => Number(x));
}

/**
 * Materialize the model's logits output into a `number[][]` of shape
 * `[seqLen, numLabels]`. Real transformers.js returns a Tensor of shape
 * `[batch, seq, labels]`; calling `tensor.tolist()` produces a nested
 * JS array (`number[][][]`) which we then index by batch=0. For test
 * fakes that already supply a nested array, we accept it as-is.
 */
function readLogitsMatrix(logits: unknown): number[][] {
  // Real path: Tensor with .tolist() — yields number[][][] of shape [B, S, L].
  if (
    typeof logits === "object" &&
    logits !== null &&
    typeof (logits as { tolist?: unknown }).tolist === "function"
  ) {
    const nested = (logits as { tolist: () => unknown }).tolist();
    if (Array.isArray(nested) && Array.isArray(nested[0])) {
      return nested[0] as number[][];
    }
    throw new TypeError("logits.tolist() returned unexpected shape");
  }
  // Test/fake path: already a nested array, possibly with row objects holding `.data`.
  if (Array.isArray(logits)) {
    const batch0 = logits[0] as unknown;
    if (!Array.isArray(batch0)) {
      throw new TypeError("logits[0] is not an array");
    }
    return (batch0 as unknown[]).map((row, j) => {
      if (Array.isArray(row)) return row as number[];
      if (
        row !== null &&
        typeof row === "object" &&
        "data" in row &&
        (row as { data?: ArrayLike<number> }).data
      ) {
        const d = (row as { data: ArrayLike<number> }).data;
        return Array.isArray(d) ? (d.slice() as number[]) : Array.from(d);
      }
      throw new TypeError(`logits[0][${j}] has unsupported shape`);
    });
  }
  throw new TypeError("logits is neither a Tensor nor a nested array");
}

export class LLMLingua2Wrapper implements LLMLinguaWrapper {
  readonly modelId: string;
  readonly version: string;

  private readonly _revision: string | undefined;
  private readonly _quantized: boolean;
  private readonly _transformersOptions: Record<string, unknown>;

  private _initPromise: Promise<void> | null = null;
  private _loaded: LoadedModel | null = null;
  private _available = false;

  /** Snapshot reader; flips to `true` once init has succeeded. */
  get available(): boolean {
    return this._available;
  }

  constructor(options?: WrapperOptions) {
    const opts = options ?? {};
    if (opts.modelId !== undefined) {
      if (typeof opts.modelId !== "string" || opts.modelId.length === 0) {
        throw new TypeError("WrapperOptions.modelId must be a non-empty string");
      }
    }
    this.modelId = opts.modelId ?? DEFAULT_MODEL_ID;
    this.version = PKG_VERSION;
    this._revision = opts.revision;
    this._quantized = opts.quantized ?? true;
    this._transformersOptions = opts.transformersOptions ?? {};
  }

  async compress(text: string, opts?: CompressOptions): Promise<CompressResult> {
    if (typeof text !== "string") {
      throw new TypeError("text must be a string");
    }

    const ratio = clamp(opts?.targetRatio ?? DEFAULT_RATIO, MIN_RATIO, MAX_RATIO);

    if (text.length === 0) {
      return {
        compressed: "",
        reverseMap: { v: 1, originalText: "", keepMask: [] },
      };
    }

    await this._ensureReady();
    const loaded = this._loaded!;
    const { tokenizer, model, preserveLabelIndex } = loaded;

    const chunks = splitForXlmR(text);
    const keptPieces: string[] = [];
    const fullKeepMask: boolean[] = [];

    const specials = loaded.specialIds;

    for (const chunk of chunks) {
      const enc = await (
        tokenizer as unknown as (t: string, o: Record<string, unknown>) => unknown
      )(chunk.text, {
        padding: false,
        truncation: true,
        return_tensor: true,
      });

      const inputIds = readInputIds(enc);
      const out = (await (model as unknown as (e: unknown) => Promise<unknown>)(enc)) as {
        logits: unknown;
      };

      // Materialize logits once as a [seq, labels] nested array. This
      // works for both the real Tensor return (via `.tolist()`) and the
      // test fakes (nested arrays). Softmax is applied per-row over a
      // small `labels`-length vector (typically 2), which is cheap and
      // monotonic (so does not change kth-largest selection, but kept
      // for downstream consumers of the score semantics).
      const matrix = readLogitsMatrix(out.logits);
      const seqLen = matrix.length;

      const scores: number[] = new Array(seqLen);
      for (let j = 0; j < seqLen; j++) {
        const row = matrix[j]!;
        // `softmax` from transformers.js returns the same shape as its
        // input (typed-array in -> typed-array out, number[] in ->
        // number[] out). We pass a plain `number[]` here, so the result
        // is also a `number[]`. We still defensively handle the
        // `.data`-bearing shape in case a future version returns a
        // Tensor-like wrapper.
        const probs = softmax(row) as number[] | ArrayLike<number> | { data: ArrayLike<number> };
        let p: number | undefined;
        if (Array.isArray(probs)) {
          p = probs[preserveLabelIndex];
        } else if (typeof probs === "object" && probs !== null && "data" in (probs as object)) {
          p = (probs as { data: ArrayLike<number> }).data[preserveLabelIndex];
        } else {
          p = (probs as ArrayLike<number>)[preserveLabelIndex];
        }
        scores[j] = p ?? 0;
      }

      // Special tokens skip the budget.
      const eligibleIdx: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        const id = inputIds[j];
        if (id !== undefined && !specials.has(id)) eligibleIdx.push(j);
      }

      if (eligibleIdx.length === 0) {
        // Nothing to keep; emit empty mask aligned to seqLen.
        for (let j = 0; j < seqLen; j++) fullKeepMask.push(false);
        continue;
      }

      const k = Math.max(1, Math.floor(eligibleIdx.length * ratio));
      const eligibleScores = eligibleIdx.map((j) => scores[j]!);
      const cutoff = kthLargest(eligibleScores, k);

      // Build keep decisions, then break ties by index so we keep
      // exactly k tokens.
      const decisions = new Array<boolean>(seqLen).fill(false);
      // Pick the indices with score >= cutoff, but cap at k.
      const candidates = eligibleIdx
        .map((j) => ({ j, s: scores[j]! }))
        .filter((x) => x.s >= cutoff)
        .sort((a, b) => b.s - a.s || a.j - b.j)
        .slice(0, k);
      for (const c of candidates) decisions[c.j] = true;

      for (let j = 0; j < seqLen; j++) fullKeepMask.push(decisions[j]!);

      const keptIds: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        if (decisions[j]) {
          const id = inputIds[j];
          if (id !== undefined) keptIds.push(id);
        }
      }
      if (keptIds.length > 0) {
        const decoded = (
          tokenizer as unknown as {
            decode: (ids: number[], opts: { skip_special_tokens?: boolean }) => string;
          }
        ).decode(keptIds, { skip_special_tokens: true });
        const trimmed = decoded.trim();
        if (trimmed.length > 0) keptPieces.push(trimmed);
      }
    }

    const compressed = keptPieces.join(" ").replace(/\s+/g, " ").trim();
    const reverseMap: ReverseMapV1 = {
      v: 1,
      originalText: text,
      keepMask: fullKeepMask,
    };
    return { compressed, reverseMap };
  }

  async decompress(_compressed: string, reverseMap: unknown): Promise<string> {
    // Intentional: decompress does NOT call _ensureReady and does NOT
    // depend on `available`. See design § 4.4 for rationale.
    const rm = validateReverseMap(reverseMap);
    return rm.originalText;
  }

  private async _ensureReady(): Promise<void> {
    if (this._available) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      try {
        const loaded = await loadModel({
          modelId: this.modelId,
          revision: this._revision,
          quantized: this._quantized,
          transformersOptions: this._transformersOptions,
        });
        this._loaded = loaded;
        this._available = true;
      } catch (e) {
        this._initPromise = null;
        throw new LLMLingua2NotAvailableError("Failed to load LLMLingua-2 model", {
          cause: e,
        });
      }
    })();
    return this._initPromise;
  }
}
