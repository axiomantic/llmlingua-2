import { beforeEach, describe, expect, it, vi } from "vitest";
import { LLMLingua2InvalidReverseMapError, LLMLingua2NotAvailableError } from "../src/errors.js";
import { PKG_VERSION } from "../src/version.js";

// Mock the pipeline seam BEFORE importing the wrapper.
vi.mock("../src/pipeline.js", () => ({
  loadModel: vi.fn(),
}));

import { loadModel } from "../src/pipeline.js";
import { LLMLingua2Wrapper } from "../src/wrapper.js";

const DEFAULT_MODEL_ID = "atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank";

/**
 * Build a fake tokenizer + model pair where each whitespace-separated
 * word becomes one input token, and logits alternate (preserve, drop,
 * preserve, drop, ...) so `targetRatio=0.5` keeps exactly the even-indexed
 * tokens.
 */
function makeFakeLoaded(): {
  tokenizer: any;
  model: any;
  preserveLabelIndex: number;
  specialIds: Set<number>;
} {
  return {
    tokenizer: Object.assign(
      function tokenize(text: string, _opts?: unknown) {
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const ids = words.map((_, i) => 1000 + i);
        return {
          input_ids: { data: ids, dims: [1, ids.length] },
        };
      },
      {
        decode(ids: number[] | { data: number[] }, _opts?: { skip_special_tokens?: boolean }) {
          const arr = Array.isArray(ids) ? ids : Array.from(ids.data);
          return arr.map((id) => `w${id - 1000}`).join(" ");
        },
        all_special_ids: [] as number[],
      },
    ),
    model: async function callModel(enc: { input_ids: { data: number[] } }) {
      const seqLen = enc.input_ids.data.length;
      // For each position, build [preserveLogit, dropLogit].
      // Even positions preserve > drop; odd positions drop > preserve.
      const rows: { data: number[] }[] = [];
      for (let j = 0; j < seqLen; j++) {
        if (j % 2 === 0) rows.push({ data: [5.0, -5.0] });
        else rows.push({ data: [-5.0, 5.0] });
      }
      const logits = [rows];
      // Attach dims for the wrapper's reader.
      (logits as unknown as { dims: number[] }).dims = [1, seqLen, 2];
      return { logits };
    },
    preserveLabelIndex: 0,
    specialIds: new Set<number>(),
  };
}

/**
 * Build a fake loaded model that mirrors the *real* transformers.js
 * shapes more faithfully:
 *  - `input_ids.data` is a `BigInt64Array` (the actual runtime type).
 *  - `model(...)` returns `{ logits }` where `logits` is a Tensor-like
 *    object exposing `.tolist()` (returns `[batch, seq, labels]`),
 *    `.dims`, and `.data` (Float32Array with stride math).
 *
 * This is the regression guard: the unit-tests-with-arrays mock let
 * Tensor-indexing bugs slip into v0.1; this Tensor-shaped mock
 * exercises the same code paths against the real API contract.
 */
function makeTensorShapedLoaded(): {
  tokenizer: any;
  model: any;
  preserveLabelIndex: number;
  specialIds: Set<number>;
} {
  return {
    tokenizer: Object.assign(
      function tokenize(text: string, _opts?: unknown) {
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const ids = new BigInt64Array(words.map((_, i) => BigInt(1000 + i)));
        return {
          input_ids: { data: ids, dims: [1, ids.length] },
        };
      },
      {
        decode(ids: number[] | { data: number[] }, _opts?: { skip_special_tokens?: boolean }) {
          // Real tokenizer.decode would throw on bigint[]; assert numbers.
          const arr = Array.isArray(ids) ? ids : Array.from(ids.data);
          for (const v of arr) {
            if (typeof v !== "number" || !Number.isFinite(v)) {
              throw new TypeError(`decode expected number[], got ${typeof v} (${String(v)})`);
            }
          }
          return arr.map((id) => `w${id - 1000}`).join(" ");
        },
        all_special_ids: [] as number[],
      },
    ),
    model: async function callModel(enc: { input_ids: { data: BigInt64Array | number[] } }) {
      const seqLen = enc.input_ids.data.length;
      const labels = 2;
      // Flat Float32Array, row-major [seq, labels].
      const flat = new Float32Array(seqLen * labels);
      for (let j = 0; j < seqLen; j++) {
        if (j % 2 === 0) {
          flat[j * labels + 0] = 5.0;
          flat[j * labels + 1] = -5.0;
        } else {
          flat[j * labels + 0] = -5.0;
          flat[j * labels + 1] = 5.0;
        }
      }
      // Tensor-like: `.data` + `.dims` + `.tolist()`. Crucially, indexing
      // it like `tensor[0][j]` does NOT work — only `.tolist()` or
      // `.data` with stride math do, matching real @huggingface/transformers.
      const logits = {
        data: flat,
        dims: [1, seqLen, labels],
        shape: [1, seqLen, labels],
        tolist(): number[][][] {
          const out: number[][][] = [[]];
          for (let j = 0; j < seqLen; j++) {
            const row: number[] = [];
            for (let l = 0; l < labels; l++) row.push(flat[j * labels + l]!);
            out[0]?.push(row);
          }
          return out;
        },
      };
      return { logits };
    },
    preserveLabelIndex: 0,
    specialIds: new Set<number>(),
  };
}

beforeEach(() => {
  vi.mocked(loadModel).mockReset();
});

describe("LLMLingua2Wrapper - construction", () => {
  it("uses default modelId, version is package version, available starts false", () => {
    const w = new LLMLingua2Wrapper();
    expect(w.modelId).toBe(DEFAULT_MODEL_ID);
    expect(w.version).toBe(PKG_VERSION);
    expect(w.available).toBe(false);
  });

  it("accepts a custom modelId", () => {
    const w = new LLMLingua2Wrapper({ modelId: "x/y" });
    expect(w.modelId).toBe("x/y");
  });

  it("rejects non-string modelId with TypeError", () => {
    expect(() => new LLMLingua2Wrapper({ modelId: 42 as unknown as string })).toThrow(TypeError);
  });

  it("rejects empty modelId with TypeError", () => {
    expect(() => new LLMLingua2Wrapper({ modelId: "" })).toThrow(TypeError);
  });

  it("does NOT load the model at construction time", () => {
    new LLMLingua2Wrapper();
    expect(vi.mocked(loadModel)).not.toHaveBeenCalled();
  });
});

describe("LLMLingua2Wrapper.compress", () => {
  it("loads the model on the first call and flips available to true", async () => {
    vi.mocked(loadModel).mockResolvedValueOnce(makeFakeLoaded());
    const w = new LLMLingua2Wrapper();
    expect(w.available).toBe(false);
    const result = await w.compress("a b c d");
    expect(w.available).toBe(true);
    expect(vi.mocked(loadModel)).toHaveBeenCalledTimes(1);
    // With alternating logits + ratio 0.5, even-indexed words are kept: "w0 w2".
    expect(result.compressed).toBe("w0 w2");
    expect(result.reverseMap).toEqual({
      v: 1,
      originalText: "a b c d",
      keepMask: [true, false, true, false],
    });
  });

  it("handles empty input without invoking the tokenizer/model", async () => {
    vi.mocked(loadModel).mockResolvedValueOnce(makeFakeLoaded());
    const w = new LLMLingua2Wrapper();
    const result = await w.compress("");
    expect(result).toEqual({
      compressed: "",
      reverseMap: { v: 1, originalText: "", keepMask: [] },
    });
  });

  it("on load failure rejects with LLMLingua2NotAvailableError and keeps available=false; next call retries", async () => {
    const inner = new Error("network down");
    vi.mocked(loadModel).mockRejectedValueOnce(inner).mockResolvedValueOnce(makeFakeLoaded());

    const w = new LLMLingua2Wrapper();
    await expect(w.compress("a b c d")).rejects.toMatchObject({
      name: "LLMLingua2NotAvailableError",
      code: "ENOT_AVAILABLE",
      cause: inner,
    });
    expect(w.available).toBe(false);

    // Second call retries init and succeeds.
    const ok = await w.compress("a b c d");
    expect(ok.compressed).toBe("w0 w2");
    expect(w.available).toBe(true);
    expect(vi.mocked(loadModel)).toHaveBeenCalledTimes(2);
  });

  it("rejects with TypeError synchronously when text is not a string", async () => {
    const w = new LLMLingua2Wrapper();
    await expect(w.compress(42 as unknown as string)).rejects.toBeInstanceOf(TypeError);
  });

  it("clamps targetRatio above 0.95 silently", async () => {
    vi.mocked(loadModel).mockResolvedValueOnce(makeFakeLoaded());
    const w = new LLMLingua2Wrapper();
    // With ratio clamped to 0.95 of 4 tokens, k = floor(4 * 0.95) = 3, so 3 of 4 tokens kept.
    // With our alternating logits, the kth-largest score selects all preserve-positives
    // (indices 0, 2; scores ~1.0) plus the highest drop-positive (indices 1 or 3; scores ~0.0).
    // Floor(4 * 0.95) = 3.
    const r = await w.compress("a b c d", { targetRatio: 5.0 });
    expect(r.reverseMap).toMatchObject({
      v: 1,
      originalText: "a b c d",
    });
    // keepMask should have exactly 3 trues
    const km = (r.reverseMap as { keepMask: boolean[] }).keepMask;
    expect(km.filter(Boolean).length).toBe(3);
  });

  it("works against a Tensor-shaped mock (regression guard for Tensor-indexing + BigInt64 input_ids)", async () => {
    // This test is the green-mirage guard: the v0.1 review found that
    // the array-shaped mocks were hiding real Tensor-indexing bugs.
    // The Tensor-shaped mock here uses `.tolist()` for logits and
    // `BigInt64Array` for input_ids, mirroring the actual
    // @huggingface/transformers runtime contract.
    vi.mocked(loadModel).mockResolvedValueOnce(makeTensorShapedLoaded());
    const w = new LLMLingua2Wrapper();
    const result = await w.compress("a b c d");
    // Same expected output as the array-shaped path — proves the two
    // mock shapes drive the wrapper to identical behavior.
    expect(result.compressed).toBe("w0 w2");
    expect(result.reverseMap).toEqual({
      v: 1,
      originalText: "a b c d",
      keepMask: [true, false, true, false],
    });
  });

  it("LLMLingua2NotAvailableError instances are catchable as LLMLingua2NotAvailableError", async () => {
    vi.mocked(loadModel).mockRejectedValueOnce(new Error("nope"));
    const w = new LLMLingua2Wrapper();
    try {
      await w.compress("hi");
      throw new Error("expected rejection");
    } catch (e) {
      expect(e).toBeInstanceOf(LLMLingua2NotAvailableError);
    }
  });
});

describe("LLMLingua2Wrapper.decompress", () => {
  it("returns reverseMap.originalText without loading the model", async () => {
    const w = new LLMLingua2Wrapper();
    const result = await w.decompress("ignored", {
      v: 1,
      originalText: "hello world",
      keepMask: [],
    });
    expect(result).toBe("hello world");
    expect(vi.mocked(loadModel)).not.toHaveBeenCalled();
    expect(w.available).toBe(false);
  });

  it("rejects on non-object reverseMap", async () => {
    const w = new LLMLingua2Wrapper();
    await expect(w.decompress("x", null)).rejects.toBeInstanceOf(LLMLingua2InvalidReverseMapError);
    await expect(w.decompress("x", "bad" as unknown as object)).rejects.toBeInstanceOf(
      LLMLingua2InvalidReverseMapError,
    );
  });

  it("rejects on wrong reverseMap version", async () => {
    const w = new LLMLingua2Wrapper();
    await expect(
      w.decompress("x", { v: 2, originalText: "hi", keepMask: [] }),
    ).rejects.toBeInstanceOf(LLMLingua2InvalidReverseMapError);
  });

  it("rejects when originalText is missing or non-string", async () => {
    const w = new LLMLingua2Wrapper();
    await expect(w.decompress("x", { v: 1, keepMask: [] })).rejects.toBeInstanceOf(
      LLMLingua2InvalidReverseMapError,
    );
    await expect(
      w.decompress("x", { v: 1, originalText: 42, keepMask: [] }),
    ).rejects.toBeInstanceOf(LLMLingua2InvalidReverseMapError);
  });
});
