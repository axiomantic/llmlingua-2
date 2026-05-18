/**
 * Integration tests: load the real LLMLingua-2 ONNX model and exercise
 * end-to-end compression + round-trip decompression.
 *
 * Gated by `LLMLINGUA_INTEGRATION=1` so that `npm test` (CI default)
 * does NOT download ~560 MB of model weights. Operator runs locally
 * via `npm run test:integration`.
 */
import { describe, it, expect } from "vitest";
import { LLMLingua2Wrapper } from "../src/wrapper.js";

const SHOULD_RUN = process.env["LLMLINGUA_INTEGRATION"] === "1";

const FIXTURE = `
The Hugging Face Optimum library allows you to convert PyTorch models to
the ONNX format and quantize them for efficient inference. LLMLingua-2 is
a prompt compression model from Microsoft Research that uses a token
classification head over XLM-RoBERTa-Large to predict, for each input
token, whether it should be preserved or dropped from the compressed
output. The atjsh repository on the Hugging Face Hub provides an ONNX
export of LLMLingua-2 trained on the MeetingBank dataset, along with int8
and fp32 variants. The int8 variant weighs roughly 560 MB and runs
acceptably on CPU. The fp32 variant is roughly 2.2 GB and is provided
mostly for parity testing. In production, prompt compression is most
useful when you are paying per token for LLM inference and your prompts
are dominated by retrieved context (RAG patterns) rather than the user's
own short instructions. Achievable compression ratios depend heavily on
the input domain: dense technical prose compresses less aggressively than
chatty meeting transcripts. A reasonable starting point is targetRatio of
0.5, then tune down toward 0.3 if quality on your downstream task holds.
`.trim();

describe.skipIf(!SHOULD_RUN)("integration: real model end-to-end", () => {
  it("compresses and round-trips a paragraph fixture", async () => {
    const w = new LLMLingua2Wrapper();
    expect(w.available).toBe(false);

    const { compressed, reverseMap } = await w.compress(FIXTURE, { targetRatio: 0.5 });

    expect(w.available).toBe(true);
    expect(compressed.length).toBeGreaterThan(0);
    expect(compressed.length).toBeLessThan(FIXTURE.length);

    const restored = await w.decompress(compressed, reverseMap);
    expect(restored).toBe(FIXTURE);
  }, 120_000);
});

if (!SHOULD_RUN) {
  describe("integration: real model end-to-end", () => {
    it.skip("skipped without LLMLINGUA_INTEGRATION=1", () => {});
  });
}
