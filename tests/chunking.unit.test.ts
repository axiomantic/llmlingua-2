import { describe, it, expect } from "vitest";
import { splitForXlmR, TARGET_CHUNK_CHARS } from "../src/chunking.js";

describe("splitForXlmR", () => {
  it("empty string returns a single empty chunk at offset 0", () => {
    expect(splitForXlmR("")).toEqual([{ text: "", offset: 0 }]);
  });

  it("short text returns a single chunk equal to the input", () => {
    const text = "Hello world. This is short.";
    expect(splitForXlmR(text)).toEqual([{ text, offset: 0 }]);
  });

  it("long multi-sentence text splits into multiple sentence-boundary chunks that concatenate back to the input", () => {
    // Build text well over TARGET_CHUNK_CHARS (1920) using many short sentences.
    const sentence = "Lorem ipsum dolor sit amet consectetur adipiscing elit. ";
    // ~57 chars per sentence; 50 sentences ≈ 2850 chars > 1920.
    const text = sentence.repeat(50).trimEnd();

    const chunks = splitForXlmR(text);
    expect(chunks.length).toBeGreaterThan(1);

    // Every chunk's text matches text.slice(offset, offset + text.length).
    for (const c of chunks) {
      expect(text.slice(c.offset, c.offset + c.text.length)).toBe(c.text);
    }

    // Chunks cover the input contiguously (first offset 0, each chunk
    // starts where the previous one ended).
    expect(chunks[0]!.offset).toBe(0);
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1]!;
      expect(chunks[i]!.offset).toBe(prev.offset + prev.text.length);
    }

    // Concatenating chunk texts in order reconstructs the input.
    const reconstructed = chunks.map((c) => c.text).join("");
    expect(reconstructed).toBe(text);
  });

  it("no-whitespace text longer than TARGET_CHUNK_CHARS falls into a single chunk (v0.1 limitation)", () => {
    const text = "x".repeat(TARGET_CHUNK_CHARS + 100);
    expect(splitForXlmR(text)).toEqual([{ text, offset: 0 }]);
  });
});
