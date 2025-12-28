// src/tests/unit/features/wireMath.test.ts

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
    expect(last.z).toBeGreaterThan(5); // 肯定往后走了
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
    const rBase = builtInRadiusAt(straight, 0); // 入口
    const rStenosis = builtInRadiusAt(straight, 0.55); // 狭窄中心附近

    expect(rStenosis).toBeLessThan(rBase);
    expect(rStenosis).toBeGreaterThan(0.6); // 不会低于模型里设置的最小值
  });

  it("任意位置半径都被 clamp 到 >= 0.6", () => {
    const us = [0, 0.2, 0.5, 0.7, 0.9, 1];
    for (const u of us) {
      const r = builtInRadiusAt(straight, u);
      expect(r).toBeGreaterThanOrEqual(0.6);
    }
  });
});
