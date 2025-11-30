import type { Vec3 } from "../../src/features/WireDemo";


import curvedJson from "./vessel_curved_centerline.json";
import straightJson from "./vessel_straight_centerline.json";
import bifurcationJson from "./vessel_bifurcation_centerline.json";


export type VesselId = "cta_aorta" | "coronary_lad" | "renal_demo";


export function normalizeJsonToVec3Array(raw: any, scale = 1000): Vec3[] {
  if (!raw) return [];

  let base: Vec3[] = [];

  
  if (Array.isArray(raw) && Array.isArray(raw[0]) && Array.isArray(raw[0][0])) {
    base = (raw[0] as number[][]).map(([x, y, z]) => ({ x, y, z }));
  }
  
  else if (Array.isArray(raw) && raw.length > 0) {
    if (typeof (raw[0] as any).x === "number") {
      base = raw as Vec3[];
    } else if (Array.isArray(raw[0])) {
      base = (raw as number[][]).map(([x, y, z]) => ({ x, y, z }));
    }
  }
  
  else if (raw && Array.isArray(raw.points)) {
    return normalizeJsonToVec3Array(raw.points, scale);
  }

  
  return base.map((p) => ({
    x: p.x * scale,
    y: p.y * scale,
    z: p.z * scale,
  }));
}


const CURVED_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(curvedJson);
const STRAIGHT_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(straightJson);
const BIFURCATION_CENTERLINE: Vec3[] = normalizeJsonToVec3Array(bifurcationJson);


export function getCenterlineForVessel(id: VesselId): Vec3[] {
  switch (id) {
    case "cta_aorta":
      return CURVED_CENTERLINE;        // CTA = 弯曲
    case "coronary_lad":
      return STRAIGHT_CENTERLINE;      // LAD = 直线
    case "renal_demo":
      return BIFURCATION_CENTERLINE;   // Renal = Y 分叉
    default:
      return CURVED_CENTERLINE;
  }
}

