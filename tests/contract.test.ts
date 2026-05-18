/**
 * Compile-time contract conformance tests.
 *
 * These assertions run at typecheck time via `vitest`'s `expectTypeOf`
 * helper. They will fail the suite if `LLMLingua2Wrapper` ever drifts
 * from the pinned `LLMLinguaWrapper` interface.
 */
import { describe, it, expectTypeOf } from "vitest";
import type { LLMLinguaWrapper } from "../src/types.js";
import { LLMLingua2Wrapper } from "../src/wrapper.js";
import lingua from "../src/index.js";

describe("contract conformance", () => {
  it("LLMLingua2Wrapper instances satisfy LLMLinguaWrapper", () => {
    const w = new LLMLingua2Wrapper();
    expectTypeOf(w).toMatchTypeOf<LLMLinguaWrapper>();
  });

  it("default export is a LLMLinguaWrapper", () => {
    expectTypeOf(lingua).toMatchTypeOf<LLMLinguaWrapper>();
  });

  it("compress returns Promise<{ compressed: string; reverseMap: unknown }>", () => {
    const w = new LLMLingua2Wrapper();
    expectTypeOf(w.compress).returns.toEqualTypeOf<
      Promise<{ compressed: string; reverseMap: unknown }>
    >();
  });

  it("decompress returns Promise<string>", () => {
    const w = new LLMLingua2Wrapper();
    expectTypeOf(w.decompress).returns.toEqualTypeOf<Promise<string>>();
  });

  it("modelId / version / available are typed as readonly on the interface", () => {
    expectTypeOf<LLMLinguaWrapper["modelId"]>().toEqualTypeOf<string>();
    expectTypeOf<LLMLinguaWrapper["version"]>().toEqualTypeOf<string>();
    expectTypeOf<LLMLinguaWrapper["available"]>().toEqualTypeOf<boolean>();
  });
});
