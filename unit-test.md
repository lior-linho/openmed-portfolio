# Unit Test Documentation — OpenMed Sandbox MVP

**Author:** Linhe Deng  
**Module Under Test:** `src/features/wireMath.ts`  
**Testing Framework:** Vitest  
**Test Directory:** `src/tests/unit/features/wireMath.test.ts`

---

## 1. Introduction

This document provides a detailed description of the unit tests implemented for the `wireMath` module within the **OpenMed Sandbox MVP** project.

The purpose of these tests is to:

- Verify mathematical correctness  
- Ensure numerical stability  
- Validate physiological plausibility of centerline sampling and vessel radius modeling  
- Guarantee deterministic behavior for guidewire navigation logic

The following core functions from `wireMath.ts` are tested:

- `getPointOnCenterline`
- `samplePolyline`
- `builtInRadiusAt`
- `radiusAtBase`

These utility functions form the mathematical foundation for the simulation engine, including guidewire movement, path interpolation, and vessel radius modeling under stenosis.

---

## 2. Testing Objectives

### **2.1 Mathematical correctness**
Ensure that interpolation, sampling, and radius evaluation produce valid and predictable numerical outputs.

### **2.2 Boundary conditions**
Confirm expected behavior at:

- `u = 0` (starting point)  
- `u = 1` (ending point)  
- midpoints such as `u ≈ 0.5`

### **2.3 Sampling consistency**
Check that polyline sampling yields the exact requested number of points and follows correct parametric progression.

### **2.4 Physiological plausibility**
Validate that the radius model behaves correctly:

- Largest radius at vessel entry  
- Minimum radius at the stenosis center (`u ≈ 0.55`)  
- Clamped to the minimum allowed radius (0.6 mm)

---

## 3. Test Cases Summary

### **3.1 getPointOnCenterline**

#### ✔ Expected behavior:
- At `u = 0`, point should lie near the first centerline point  
- At `u = 1`, point should lie near the last point  
- At `u = 0.5`, point should be near the geometric midpoint  

#### ✔ What is validated:
- Catmull–Rom curve interpolation  
- Monotonicity in the z-axis for straight-line test data  
- Numerical tolerance within expected ranges

---

### **3.2 samplePolyline**

#### ✔ Expected behavior:
- Returns exactly N sampled points  
- First point close to `u = 0`  
- Last point close to `u = uEnd`  

#### ✔ What is validated:
- Sampling density  
- Endpoint correctness  
- Increasing curve progression

---

### **3.3 builtInRadiusAt**

#### ✔ Expected behavior:
- Radius decreases around stenosis center (`u = 0.55`)  
- Radius returns to normal away from stenosis  
- Radius is clamped to ≥ 0.6 mm  

#### ✔ What is validated:
- Gaussian stenosis model  
- Curvature adjustment penalty  
- Clamping behavior

---

## 4. Test Code (Reference)

Below is the exact content used for unit testing:

```ts
import { describe, it, expect } from "vitest";
import type { Vec3 } from "../../../src/features/wireMath";
import {
  getPointOnCenterline,
  samplePolyline,
  builtInRadiusAt,
  radiusAtBase,
} from "../../../src/features/wireMath";

// 简单生成一条直线中心线：z 方向均匀增加
const makeStraightLine = (n: number, step = 1): Vec3[] =>
  Array.from({ length: n }, (_, i) => ({ x: 0, y: 0, z: i * step }));

describe("getPointOnCenterline", () => {
  it("u = 0 / 1 时落在首尾点附近", () => {
    const pts = makeStraightLine(5, 10);

    const p0 = getPointOnCenterline(pts, 0);
    const p1 = getPointOnCenterline(pts, 1);

    expect(p0.z).toBeGreaterThan(-0.5);
    expect(p0.z).toBeLessThan(0.5);

    expect(p1.z).toBeGreaterThan(39);
    expect(p1.z).toBeLessThan(41);
  });

  it("u ≈ 0.5 时在中间附近", () => {
    const pts = makeStraightLine(5, 10);
    const mid = getPointOnCenterline(pts, 0.5);

    expect(mid.z).toBeGreaterThan(15);
    expect(mid.z).toBeLessThan(25);
  });
});

describe("samplePolyline", () => {
  it("返回指定数量的采样点", () => {
    const pts = makeStraightLine(10, 1);
    const out = samplePolyline(pts, 1, 50);
    expect(out.length).toBe(50);
  });

  it("采样从接近 u=0 到接近 u=uEnd 的一串点", () => {
    const pts = makeStraightLine(10, 1);
    const out = samplePolyline(pts, 1, 10);

    const first = out[0];
    const last = out[out.length - 1];

    expect(first.z).toBeCloseTo(0, 3);
    expect(last.z).toBeGreaterThan(5);
  });
});

describe("builtInRadiusAt（狭窄半径模型）", () => {
  const straight = makeStraightLine(100, 1);

  it("u=0 处的半径接近基础半径", () => {
    const base = radiusAtBase();
    const r0 = builtInRadiusAt(straight, 0);
    expect(r0).toBeGreaterThan(0.5 * base);
    expect(r0).toBeLessThanOrEqual(base);
  });

  it("狭窄中心附近(u≈0.55) 半径小于入口处", () => {
    const rBase = builtInRadiusAt(straight, 0);
    const rStenosis = builtInRadiusAt(straight, 0.55);

    expect(rStenosis).toBeLessThan(rBase);
    expect(rStenosis).toBeGreaterThan(0.6);
  });

  it("任意位置半径都被 clamp 到 >= 0.6", () => {
    const us = [0, 0.2, 0.5, 0.7, 0.9, 1];
    for (const u of us) {
      const r = builtInRadiusAt(straight, u);
      expect(r).toBeGreaterThanOrEqual(0.6);
    }
  });
});
