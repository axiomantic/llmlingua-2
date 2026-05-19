/**
 * Public type contract for `@axiomantic/llmlingua-2`.
 *
 * The pinned {@link LLMLinguaWrapper} interface is the operator-supplied
 * contract that this library implements. It MUST NOT be modified except
 * with a major version bump and explicit operator approval.
 */

/**
 * Result of a `compress` call. The `reverseMap` is opaque to consumers
 * and must be passed back to `decompress` verbatim to recover the
 * original text.
 */
export interface CompressResult {
  compressed: string;
  reverseMap: unknown;
}

/**
 * Compression options.
 */
export interface CompressOptions {
  /**
   * Fraction of source tokens to retain. Clamped to [0.05, 0.95].
   * Defaults to 0.5.
   */
  targetRatio?: number;
}

/**
 * Versioned reverseMap shape produced by this library. Consumers see
 * `unknown` via the {@link LLMLinguaWrapper} contract; this is the
 * concrete internal shape.
 */
export interface ReverseMapV1 {
  v: 1;
  originalText: string;
  /**
   * One bool per source token; true = kept, false = dropped.
   * Diagnostic only — aligned to tokenizer tokens, NOT to characters
   * of `originalText`.
   */
  keepMask: boolean[];
}

/**
 * Options accepted by the {@link LLMLingua2Wrapper} constructor.
 */
export interface WrapperOptions {
  /**
   * HF repo id. Default: `"atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank"`.
   * Empty string or non-string throws `TypeError` at construction.
   */
  modelId?: string;
  /** Optional model revision / commit hash for pinning. */
  revision?: string;
  /**
   * If true (default), select the int8-quantized ONNX variant
   * (`dtype: 'q8'`); `false` maps to `dtype: 'fp32'`. Override via
   * `transformersOptions.dtype` for finer control.
   */
  quantized?: boolean;
  /**
   * Options forwarded to the underlying transformers.js loaders
   * (e.g. `device`, `dtype`, `cache_dir`, `local_files_only`).
   * Wins over `quantized` on conflict.
   */
  transformersOptions?: Record<string, unknown>;
}

/**
 * The pinned operator contract. {@link LLMLingua2Wrapper} implements this.
 */
export interface LLMLinguaWrapper {
  readonly modelId: string;
  readonly version: string;
  readonly available: boolean;
  compress(
    text: string,
    opts?: { targetRatio?: number },
  ): Promise<{
    compressed: string;
    reverseMap: unknown;
  }>;
  decompress(compressed: string, reverseMap: unknown): Promise<string>;
}
