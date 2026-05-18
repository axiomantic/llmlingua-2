/**
 * Sentence-boundary chunking for XLM-RoBERTa-large.
 *
 * Splits a long input into chunks whose approximate token count fits
 * comfortably under the model's 512-token limit. The heuristic is
 * char-count based (4 chars per token, target 480 tokens, ~1920 chars)
 * and intentionally conservative: real BPE token counts vary by
 * language, so we leave headroom.
 *
 * Known v0.1 limitations:
 * - English-biased: regex uses `.`, `!`, `?` as sentence terminators,
 *   so CJK / Arabic / no-whitespace scripts may collapse into a single
 *   chunk and exceed 512 tokens. The underlying tokenizer truncates;
 *   `reverseMap.originalText` preserves the full input either way.
 * - Single sentences longer than {@link TARGET_CHUNK_CHARS} are NOT
 *   re-split; they pass through as one oversize chunk.
 */
export interface Chunk {
  /** Substring of the input text. */
  text: string;
  /** Absolute character index of `text[0]` within the full input. */
  offset: number;
}

const APPROX_CHARS_PER_TOKEN = 4;
/** Target maximum characters per chunk (~480 tokens at 4 chars/token). */
export const TARGET_CHUNK_CHARS = 480 * APPROX_CHARS_PER_TOKEN;

const SENTENCE_END = /(?<=[.!?])\s+/g;

/**
 * Splits text into sentence-boundary chunks. Each chunk's substring is
 * exactly `text.slice(offset, offset + chunk.text.length)`. The
 * concatenation of all chunks' `text` in order reconstructs the input.
 */
export function splitForXlmR(text: string): Chunk[] {
  if (text.length <= TARGET_CHUNK_CHARS) {
    return [{ text, offset: 0 }];
  }

  // Find every sentence boundary as an absolute index `cutAt` such that
  // sentences ending at or before `cutAt` belong to the current chunk
  // (including the whitespace they were separated by).
  const boundaries: number[] = [];
  const re = new RegExp(SENTENCE_END);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    boundaries.push(m.index + m[0].length);
    if (m[0].length === 0) re.lastIndex++; // safety, shouldn't fire
  }
  boundaries.push(text.length);

  const chunks: Chunk[] = [];
  let chunkStart = 0;
  let lastBoundaryWithinBudget = -1;

  for (const b of boundaries) {
    if (b - chunkStart <= TARGET_CHUNK_CHARS) {
      lastBoundaryWithinBudget = b;
      continue;
    }
    // Boundary `b` would overflow. Close the current chunk at the last
    // boundary that fit. If none fit (a single sentence longer than
    // TARGET_CHUNK_CHARS), pass it through as one oversize chunk.
    const closeAt = lastBoundaryWithinBudget > chunkStart ? lastBoundaryWithinBudget : b;
    chunks.push({ text: text.slice(chunkStart, closeAt), offset: chunkStart });
    chunkStart = closeAt;
    // The current boundary `b` may itself still be within budget for
    // the new chunk; track it.
    lastBoundaryWithinBudget = b - chunkStart <= TARGET_CHUNK_CHARS ? b : -1;
  }

  if (chunkStart < text.length) {
    chunks.push({ text: text.slice(chunkStart), offset: chunkStart });
  }

  return chunks;
}
