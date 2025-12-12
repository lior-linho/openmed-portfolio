import type { Vec3 } from "../../src/features/WireDemo";

import curvedJson from "./vessel_curved_centerline.json";
import straightJson from "./vessel_straight_centerline.json";
import bifurcationJson from "./vessel_bifurcation_centerline.json";

/* ============================================================
    1) 血管 ID（新增一个 standard_bend）
============================================================ */
export type VesselId =
  | "cta_aorta"
  | "coronary_lad"
  | "renal_demo"
  | "standard_bend";   // ← 新增：标准弯（来自 research）



/* ============================================================
    2) JSON → Vec3[] 工具函数（你的原逻辑）
============================================================ */
export function normalizeJsonToVec3Array(raw: any, scale = 1000): Vec3[] {
  if (!raw) return [];

  let base: Vec3[] = [];

  if (Array.isArray(raw) && Array.isArray(raw[0]) && Array.isArray(raw[0][0])) {
    base = (raw[0] as number[][]).map(([x, y, z]) => ({ x, y, z }));
  } else if (Array.isArray(raw) && raw.length > 0) {
    if (typeof (raw[0] as any).x === "number") {
      base = raw as Vec3[];
    } else if (Array.isArray(raw[0])) {
      base = (raw as number[][]).map(([x, y, z]) => ({ x, y, z }));
    }
  } else if (raw && Array.isArray(raw.points)) {
    return normalizeJsonToVec3Array(raw.points, scale);
  }

  return base.map((p) => ({
    x: p.x * scale,
    y: p.y * scale,
    z: p.z * scale,
  }));
}

/* ============================================================
    3) 现有血管（JSON 提供）
============================================================ */
const CURVED_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(curvedJson);
const STRAIGHT_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(straightJson);
const BIFURCATION_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(bifurcationJson);



/* ============================================================
    4) ⭐ 新增：标准弯曲血管（来自 research 的 makeCenterline）
============================================================ */

export function makeStandardBendCenterline(samples = 200): Vec3[] {
  const pts: Vec3[] = [];

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);

    // 直接搬运 research 的数学公式
    const x = t * 3 - 1.5;
    const y = Math.sin(t * Math.PI * 1.5) * 0.4;
    const z = Math.cos(t * Math.PI) * 0.2;

    pts.push({ x, y, z });
  }

  return pts.map(p => ({
    x: p.x * 100,    // scale 保持和其它血管类似大小（默认 JSON ×1000 太大，这里乘100更合适）
    y: p.y * 100,
    z: p.z * 100
  }));
}



/* ============================================================
    5) 返回血管中心线（接入新的 standard_bend）
============================================================ */
export function getCenterlineForVessel(id: VesselId): Vec3[] {
  switch (id) {
    case "cta_aorta":
      return CURVED_CENTERLINE;

    case "coronary_lad":
      return STRAIGHT_CENTERLINE;

    case "renal_demo":
      return BIFURCATION_CENTERLINE;

    case "standard_bend":               // ← ⭐ 新增的血管
      return makeStandardBendCenterline();

    default:
      return CURVED_CENTERLINE;
  }
}
