/**
 * Integration tests: load the real LLMLingua-2 ONNX model and exercise
 * end-to-end compression + round-trip decompression.
 *
 * Gated by `LLMLINGUA_INTEGRATION=1` so that `npm test` (CI default)
 * does NOT download ~560 MB of model weights. Operator runs locally
 * via `npm run test:integration`.
 *
 * Once the model is cached under `~/.cache/huggingface/`, this suite
 * should run in well under 3 minutes.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LLMLingua2Error, LLMLingua2NotAvailableError } from "../src/errors.js";
import { DEFAULT_MODEL_ID, LLMLingua2Wrapper } from "../src/wrapper.js";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as { version: string };

const SHOULD_RUN = process.env.LLMLINGUA_INTEGRATION === "1";

// Shared wrapper across all `it` blocks so the model loads once. Each test
// re-asserts whatever invariants it needs; the wrapper has no per-call
// mutable state beyond the lazy-init latch.
const sharedWrapper = new LLMLingua2Wrapper();

const FACTUAL =
  "Microsoft developed the LLMLingua-2 prompt compression model using XLM-RoBERTa as the backbone architecture.";

const FILLER =
  "I just wanted to mention that, you know, the meeting was actually pretty productive overall, more or less.";

const RAG_CONTEXT =
  "The LLMLingua-2 model was trained on the MeetingBank dataset. It uses a token classification head over XLM-RoBERTa-Large. Each input token is scored independently for whether it should be preserved. Microsoft Research published the original paper in 2024.";

const LONG_INPUT = `
The Hugging Face Optimum library allows you to convert PyTorch models to the ONNX format and quantize them for efficient inference. LLMLingua-2 is a prompt compression model from Microsoft Research that uses a token classification head over XLM-RoBERTa-Large to predict, for each input token, whether it should be preserved or dropped from the compressed output. The atjsh repository on the Hugging Face Hub provides an ONNX export of LLMLingua-2 trained on the MeetingBank dataset, along with int8 and fp32 variants. The int8 variant weighs roughly 560 MB and runs acceptably on CPU. The fp32 variant is roughly 2.2 GB and is provided mostly for parity testing.

In production, prompt compression is most useful when you are paying per token for LLM inference and your prompts are dominated by retrieved context (RAG patterns) rather than the user's own short instructions. Achievable compression ratios depend heavily on the input domain: dense technical prose compresses less aggressively than chatty meeting transcripts. A reasonable starting point is targetRatio of 0.5, then tune down toward 0.3 if quality on your downstream task holds.

The token classification head emits a two-class softmax per token: preserve versus drop. The compressor sorts tokens by their preserve probability and keeps the top fraction equal to the requested targetRatio. Special tokens such as the CLS and SEP markers are excluded from the budget so that ratio arithmetic operates on content tokens only. Tied scores are broken by token index, which guarantees the kept count exactly equals floor(eligible * ratio).

For inputs longer than the model's 512-token context window, the wrapper splits on sentence boundaries before tokenization. Each chunk is processed independently and the kept pieces are joined with a single space. The reverseMap stores the full original text verbatim, so decompress always recovers the source regardless of how chunking carved up the input.
`.trim();

/** Approximate token count for asserting "within X% of targetRatio" comparisons. */
function approxRatio(compressed: string, original: string): number {
  return compressed.length / original.length;
}

/** Lowercase substring check that survives tokenizer quirks (e.g. dropped capitalization). */
function containsToken(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

describe.skipIf(!SHOULD_RUN)("integration: real model end-to-end", () => {
  describe("content-word survival on factual prose", () => {
    it("preserves named entities at targetRatio 0.7", async () => {
      const { compressed, reverseMap } = await sharedWrapper.compress(FACTUAL, {
        targetRatio: 0.7,
      });
      expect(compressed.length).toBeGreaterThan(0);
      expect(compressed.length).toBeLessThan(FACTUAL.length);
      // Named entities and key technical terms should survive at 0.7.
      expect(containsToken(compressed, "Microsoft")).toBe(true);
      expect(containsToken(compressed, "LLMLingua")).toBe(true);
      expect(containsToken(compressed, "RoBERTa")).toBe(true);
      // keepMask is aligned to tokenizer tokens, not chars; just assert it has entries.
      const rm = reverseMap as { keepMask: boolean[] };
      expect(rm.keepMask.length).toBeGreaterThan(0);
      expect(rm.keepMask.some((b) => b === true)).toBe(true);
      expect(rm.keepMask.some((b) => b === false)).toBe(true);
    }, 60_000);

    it("preserves at least one named entity even at targetRatio 0.4", async () => {
      const { compressed } = await sharedWrapper.compress(FACTUAL, { targetRatio: 0.4 });
      expect(compressed.length).toBeLessThan(FACTUAL.length);
      // At aggressive compression, at least the headline entity survives.
      const survivors = [
        containsToken(compressed, "Microsoft"),
        containsToken(compressed, "LLMLingua"),
        containsToken(compressed, "RoBERTa"),
      ].filter(Boolean).length;
      expect(survivors).toBeGreaterThanOrEqual(1);
    }, 60_000);
  });

  describe("filler drop on conversational prose", () => {
    it("drops filler words and keeps content words at targetRatio 0.4", async () => {
      const { compressed } = await sharedWrapper.compress(FILLER, { targetRatio: 0.4 });
      expect(compressed.length).toBeLessThan(FILLER.length);
      // Content words should survive.
      const contentSurvivors = [
        containsToken(compressed, "meeting"),
        containsToken(compressed, "productive"),
      ].filter(Boolean).length;
      expect(contentSurvivors).toBeGreaterThanOrEqual(1);
      // At least half of the typical fillers should be dropped.
      const fillers = ["just", "you know", "actually", "pretty", "more or less"];
      const droppedFillers = fillers.filter((f) => !containsToken(compressed, f)).length;
      expect(droppedFillers).toBeGreaterThanOrEqual(Math.ceil(fillers.length / 2));
    }, 60_000);
  });

  describe("targetRatio adherence on RAG-style context", () => {
    for (const ratio of [0.3, 0.5, 0.7] as const) {
      it(`compressed/original ratio is within +/-20% of targetRatio=${ratio}`, async () => {
        const { compressed } = await sharedWrapper.compress(RAG_CONTEXT, {
          targetRatio: ratio,
        });
        const observed = approxRatio(compressed, RAG_CONTEXT);
        // Character-length ratio is a proxy for token-count ratio; allow
        // +/-20% deviation since token-to-char mapping is not uniform
        // (e.g. punctuation, subword splits, and the join-with-space
        // reassembly).
        expect(observed).toBeGreaterThan(ratio - 0.2);
        expect(observed).toBeLessThan(ratio + 0.2);
      }, 60_000);
    }
  });

  describe("round-trip via reverseMap", () => {
    it("decompress recovers the exact original text", async () => {
      const { compressed, reverseMap } = await sharedWrapper.compress(FACTUAL, {
        targetRatio: 0.5,
      });
      expect(compressed).not.toBe(FACTUAL);
      const restored = await sharedWrapper.decompress(compressed, reverseMap);
      expect(restored).toBe(FACTUAL);
    }, 60_000);
  });

  describe("chunking on long inputs", () => {
    it("compresses a multi-paragraph input without error and preserves content from each paragraph", async () => {
      const { compressed, reverseMap } = await sharedWrapper.compress(LONG_INPUT, {
        targetRatio: 0.5,
      });
      expect(compressed.length).toBeGreaterThan(0);
      expect(compressed.length).toBeLessThan(LONG_INPUT.length);
      // Each paragraph contributes at least one distinctive content word.
      // These markers come from paragraphs 1, 2, 3, 4 respectively.
      const markers = ["LLMLingua", "compression", "softmax", "chunk"];
      const hits = markers.filter((m) => containsToken(compressed, m)).length;
      // Soft assertion: chunking is approximate. At least 2 of 4 markers
      // should survive a 0.5-ratio compression.
      expect(hits).toBeGreaterThanOrEqual(2);
      // Length ratio should be roughly in the neighborhood of 0.5
      // (broader tolerance for long inputs because per-chunk rounding
      // accumulates).
      const observed = approxRatio(compressed, LONG_INPUT);
      expect(observed).toBeGreaterThan(0.25);
      expect(observed).toBeLessThan(0.75);
      // Round-trip still works through chunking.
      const restored = await sharedWrapper.decompress(compressed, reverseMap);
      expect(restored).toBe(LONG_INPUT);
    }, 120_000);
  });

  describe("wrapper state invariants", () => {
    it("fresh wrapper reports available=false, expected modelId and version", () => {
      const w = new LLMLingua2Wrapper();
      expect(w.available).toBe(false);
      expect(w.modelId).toBe(DEFAULT_MODEL_ID);
      expect(w.version).toBe(pkg.version);
    });

    it("available flips to true after first successful compress", async () => {
      // The shared wrapper may already be loaded from earlier tests in
      // this file. If this test happens to run first, drive the latch
      // with a small input.
      if (!sharedWrapper.available) {
        await sharedWrapper.compress("hello world", { targetRatio: 0.5 });
      }
      expect(sharedWrapper.available).toBe(true);
    }, 60_000);

    it("bogus modelId rejects with typed LLMLingua2NotAvailableError and leaves available=false", async () => {
      const w = new LLMLingua2Wrapper({
        modelId: "axiomantic/this-model-does-not-exist-zzz",
      });
      await expect(w.compress("hello", { targetRatio: 0.5 })).rejects.toBeInstanceOf(
        LLMLingua2NotAvailableError,
      );
      expect(w.available).toBe(false);
      // Also a LLMLingua2Error and has the stable code.
      try {
        await w.compress("hello", { targetRatio: 0.5 });
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(LLMLingua2Error);
        expect((e as LLMLingua2NotAvailableError).code).toBe("ENOT_AVAILABLE");
      }
    }, 60_000);
  });

  describe("regression snapshot", () => {
    it("FACTUAL @ targetRatio=0.5 produces stable output", async () => {
      const { compressed } = await sharedWrapper.compress(FACTUAL, {
        targetRatio: 0.5,
      });
      // Inline snapshot — vitest auto-writes on first run. If a future
      // model/code change shifts which tokens drop, this mismatch will
      // catch it. Update only after deliberately re-validating output.
      expect(compressed).toMatchInlineSnapshot(`"LLMLingua-2 compression XLM-RoBERTa"`);
    }, 60_000);
  });
});

if (!SHOULD_RUN) {
  describe("integration: real model end-to-end", () => {
    it.skip("skipped without LLMLINGUA_INTEGRATION=1", () => {});
  });
}
