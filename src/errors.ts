/**
 * Error hierarchy for `@axiomantic/llmlingua-2`.
 *
 * All errors thrown or rejected by the library are subclasses of
 * {@link LLMLingua2Error}. Consumers can `instanceof` check the root class
 * to catch any library-originated error; the `code` field is the stable
 * machine-readable identifier.
 */
export class LLMLingua2Error extends Error {
  /** Stable string identifier (e.g. "ENOT_AVAILABLE"). */
  readonly code: string;

  constructor(code: string, message: string, opts?: { cause?: unknown }) {
    super(message, opts);
    this.name = new.target.name;
    this.code = code;
  }
}

/**
 * Thrown when the underlying transformers.js pipeline failed to load.
 * Carries the original failure as `cause`.
 */
export class LLMLingua2NotAvailableError extends LLMLingua2Error {
  constructor(message: string, opts?: { cause?: unknown }) {
    super("ENOT_AVAILABLE", message, opts);
  }
}

/**
 * Thrown by `decompress` when the supplied `reverseMap` is missing,
 * malformed, or of an unsupported version.
 */
export class LLMLingua2InvalidReverseMapError extends LLMLingua2Error {
  constructor(message: string, opts?: { cause?: unknown }) {
    super("EINVALID_REVERSE_MAP", message, opts);
  }
}
