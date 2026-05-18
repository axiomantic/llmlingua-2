import { describe, it, expect } from "vitest";
import {
  LLMLingua2Error,
  LLMLingua2NotAvailableError,
  LLMLingua2InvalidReverseMapError,
} from "../src/errors.js";

describe("LLMLingua2Error", () => {
  it("base class carries code and message; name is LLMLingua2Error", () => {
    const e = new LLMLingua2Error("EX_CODE", "boom");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LLMLingua2Error);
    expect(e.code).toBe("EX_CODE");
    expect(e.message).toBe("boom");
    expect(e.name).toBe("LLMLingua2Error");
  });

  it("LLMLingua2NotAvailableError has fixed code, propagates cause, and sets name", () => {
    const inner = new Error("inner");
    const e = new LLMLingua2NotAvailableError("not loaded", { cause: inner });
    expect(e).toBeInstanceOf(LLMLingua2Error);
    expect(e).toBeInstanceOf(LLMLingua2NotAvailableError);
    expect(e.code).toBe("ENOT_AVAILABLE");
    expect(e.message).toBe("not loaded");
    expect(e.name).toBe("LLMLingua2NotAvailableError");
    expect(e.cause).toBe(inner);
  });

  it("LLMLingua2InvalidReverseMapError has fixed code and sets name", () => {
    const e = new LLMLingua2InvalidReverseMapError("bad map");
    expect(e).toBeInstanceOf(LLMLingua2Error);
    expect(e).toBeInstanceOf(LLMLingua2InvalidReverseMapError);
    expect(e.code).toBe("EINVALID_REVERSE_MAP");
    expect(e.message).toBe("bad map");
    expect(e.name).toBe("LLMLingua2InvalidReverseMapError");
  });

  it("subclasses are catchable as LLMLingua2Error and Error", () => {
    const e1: unknown = new LLMLingua2NotAvailableError("x");
    const e2: unknown = new LLMLingua2InvalidReverseMapError("y");
    expect(e1 instanceof LLMLingua2Error).toBe(true);
    expect(e1 instanceof Error).toBe(true);
    expect(e2 instanceof LLMLingua2Error).toBe(true);
    expect(e2 instanceof Error).toBe(true);
  });
});
