// assets/vessels/centerlines.ts
import type { Vec3 } from "../../src/types/geom";

import curvedJson from "./vessel_curved_centerline.json";
import straightJson from "./vessel_straight_centerline.json";
import bifurcationJson from "./vessel_bifurcation_centerline.json";

/* ============================================================
    1) VesselId 统一定义（新增 standard_bend）
============================================================ */
export type VesselId =
  | "cta_aorta"
  | "coronary_lad"
  | "renal_demo"
  | "standard_bend";

/* ============================================================
    2) JSON → Vec3[] 工具
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
    3) JSON centerlines
============================================================ */
const CURVED_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(curvedJson);
const STRAIGHT_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(straightJson);
const BIFURCATION_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(bifurcationJson);

/* ============================================================
    4) standard_bend（procedural）
============================================================ */
export function makeStandardBendCenterline(samples = 200): Vec3[] {
  const pts: Vec3[] = [];

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);

    const x = t * 3 - 1.5;
    const y = Math.sin(t * Math.PI * 1.5) * 0.4;
    const z = Math.cos(t * Math.PI) * 0.2;

    pts.push({ x, y, z });
  }

  // 尺寸调整（让它和你的 demo 视觉尺度接近）
  return pts.map((p) => ({
    x: p.x * 100,
    y: p.y * 100,
    z: p.z * 100,
  }));
}

/* ============================================================
    5) 统一出口：centerline getter
============================================================ */
export function getCenterlineForVessel(id: VesselId): Vec3[] {
  switch (id) {
    case "cta_aorta":
      return CURVED_CENTERLINE;
    case "coronary_lad":
      return STRAIGHT_CENTERLINE;
    case "renal_demo":
      return BIFURCATION_CENTERLINE;
    case "standard_bend":
      return makeStandardBendCenterline();
    default:
      return CURVED_CENTERLINE;
  }
}

/* ============================================================
    6) 可选：统一 GLB URL（注意：standard_bend 没有 glb）
============================================================ */
export const VESSEL_GLB_URLS: Partial<Record<VesselId, string>> = {
  cta_aorta: "/assets/vessels/cta_aorta.glb",
  coronary_lad: "/assets/vessels/coronary_LAD.glb",
  renal_demo: "/assets/vessels/renal_demo.glb",
  // standard_bend: (no glb)
};
