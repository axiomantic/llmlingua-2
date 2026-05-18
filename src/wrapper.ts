/**
 * `LLMLingua2Wrapper` — the public class implementing the pinned
 * `LLMLinguaWrapper` contract.
 *
 * See `~/.local/spellbook/docs/.../2026-05-18-llmlingua-2-js-design.md`
 * § 3.1, § 4.2–4.5, § 5 for the full specification.
 */
import { softmax } from "@huggingface/transformers";
import { loadModel, type LoadedModel } from "./pipeline.js";
import { splitForXlmR } from "./chunking.js";
import {
  LLMLingua2NotAvailableError,
  LLMLingua2InvalidReverseMapError,
} from "./errors.js";
import { PKG_VERSION } from "./version.js";
import type {
  CompressOptions,
  CompressResult,
  LLMLinguaWrapper,
  ReverseMapV1,
  WrapperOptions,
} from "./types.js";

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
  if (o["v"] !== 1) {
    throw new LLMLingua2InvalidReverseMapError(
      `Unsupported reverseMap version: ${String(o["v"])}`,
    );
  }
  if (typeof o["originalText"] !== "string") {
    throw new LLMLingua2InvalidReverseMapError(
      "reverseMap.originalText must be a string",
    );
  }
  return {
    v: 1,
    originalText: o["originalText"] as string,
    keepMask: Array.isArray(o["keepMask"]) ? (o["keepMask"] as boolean[]) : [],
  };
}

/**
 * Extract `input_ids` as a plain `number[]` from a tokenizer encoding.
 * Tokenizers in transformers.js return a Tensor; `.data` is the
 * underlying typed array. We accept either typed-array or plain-array
 * payloads so test fakes are easy to build.
 */
function readInputIds(enc: unknown): number[] {
  const e = enc as { input_ids?: { data?: ArrayLike<number> | number[] } };
  const data = e.input_ids?.data;
  if (data == null) throw new TypeError("tokenizer encoding missing input_ids.data");
  return Array.isArray(data) ? data.slice() : Array.from(data);
}

/**
 * Read the per-token logits array out of a model forward pass. Real
 * transformers.js returns a Tensor whose layout is [batch, seq, labels];
 * indexing into `logits[0][j]` yields a slice whose `.data` is the
 * label scores. For tests we shape fake outputs the same way.
 */
function readLogitsRow(logits: unknown, j: number): number[] {
  // logits[0] is a [seq, labels] view; logits[0][j] is a [labels] view.
  const batch0 = (logits as ArrayLike<unknown>)[0] as ArrayLike<unknown>;
  const row = batch0[j] as { data?: ArrayLike<number> } | ArrayLike<number>;
  if (row == null) throw new TypeError(`logits[0][${j}] is null`);
  if ("data" in row && (row as { data?: ArrayLike<number> }).data) {
    const d = (row as { data: ArrayLike<number> }).data;
    return Array.isArray(d) ? d.slice() : Array.from(d);
  }
  return Array.from(row as ArrayLike<number>);
}

function readSeqLen(logits: unknown, fallback: number): number {
  const dims = (logits as { dims?: number[] }).dims;
  if (Array.isArray(dims) && typeof dims[1] === "number") return dims[1];
  return fallback;
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

    const specials = new Set<number>(
      Array.from(
        (tokenizer as unknown as { all_special_ids?: number[] }).all_special_ids ?? [],
      ),
    );

    for (const chunk of chunks) {
      const enc = await (tokenizer as unknown as (
        t: string,
        o: Record<string, unknown>,
      ) => unknown)(chunk.text, {
        padding: false,
        truncation: true,
        return_tensor: true,
      });

      const inputIds = readInputIds(enc);
      const out = (await (model as unknown as (e: unknown) => Promise<unknown>)(enc)) as {
        logits: unknown;
      };
      const seqLen = readSeqLen(out.logits, inputIds.length);

      const scores: number[] = new Array(seqLen);
      for (let j = 0; j < seqLen; j++) {
        const row = readLogitsRow(out.logits, j);
        const probs = softmax(row);
        scores[j] = probs[preserveLabelIndex] ?? 0;
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
        const decoded = (tokenizer as unknown as {
          decode: (ids: number[], opts: { skip_special_tokens?: boolean }) => string;
        }).decode(keptIds, { skip_special_tokens: true });
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
