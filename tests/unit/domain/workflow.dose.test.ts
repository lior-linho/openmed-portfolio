import { describe, it, expect } from "vitest";
import { areaFactor, computeDoseDelta } from "../../../src/domain/workflow/dose";

describe("workflow dose", () => {
  it("areaFactor is clamped to [0.05, 1]", () => {
    expect(areaFactor({ left: 0, top: 0, right: 0, bottom: 0 })).toBe(0.05);
    expect(areaFactor({ left: 0, top: 0, right: 1, bottom: 1 })).toBe(1);
  });

  it("computeDoseDelta respects dt clamp and zoom clamp", () => {
    const d = computeDoseDelta(10, 10, { left: 0, top: 0, right: 1, bottom: 1 }, 10);
    // dt clamped to 0.1, zoom clamped to 3 => 10 * 0.1 * 1 * 9 = 9
    expect(d).toBe(9);
  });
});
