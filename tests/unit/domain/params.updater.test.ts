import { describe, it, expect } from "vitest";
import { updateByPath } from "../../../src/domain/params/updater";

describe("updateByPath", () => {
  it("updates deep value without mutating other branches", () => {
    const obj = { a: { b: 1 }, x: { y: 2 } };
    const out = updateByPath(obj, "a.b", 42);

    expect(out).not.toBe(obj);
    expect(out.a).not.toBe(obj.a);
    expect(out.x).toBe(obj.x); // structural sharing
    expect(out.a.b).toBe(42);
    expect(obj.a.b).toBe(1);
  });

  it("throws on invalid path", () => {
    const obj = { a: { b: 1 } };
    expect(() => updateByPath(obj, "a.c", 1)).toThrow();
  });
});
