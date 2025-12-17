import { describe, it, expect } from "vitest";
import { stableStringify } from "../../../src/data/exporters/stableStringify";

describe("stableStringify", () => {
  it("produces stable key order", () => {
    const a = { b: 1, a: 2 };
    const b = { a: 2, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });
});
