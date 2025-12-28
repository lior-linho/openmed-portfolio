export type Vec3 = { x: number; y: number; z: number };

export function vAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
export function vSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
export function vMul(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
export function vLen(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}
export function vLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return vAdd(a, vMul(vSub(b, a), t));
}

const USE_CATMULL = true;

export function catmullRom(
  p0: Vec3,
  p1: Vec3,
  p2: Vec3,
  p3: Vec3,
  t: number
): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      ((2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      ((2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    z:
      0.5 *
      ((2 * p1.z) +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

export function getPointOnCenterline(points: Vec3[], u: number): Vec3 {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };

  if (!USE_CATMULL) {
    const segFloat = Math.max(
      0,
      Math.min(points.length - 1.0001, u * (points.length - 1))
    );
    const i = Math.floor(segFloat);
    const t = segFloat - i;
    return vLerp(points[i], points[i + 1], t);
  }

  const n = points.length;
  const segFloat = Math.max(0, Math.min(n - 1.0001, u * (n - 1)));
  const i = Math.floor(segFloat);
  const t = segFloat - i;
  const i0 = Math.max(0, i - 1);
  const i1 = i;
  const i2 = Math.min(n - 1, i + 1);
  const i3 = Math.min(n - 1, i + 2);
  return catmullRom(points[i0], points[i1], points[i2], points[i3], t);
}

export function samplePolyline(
  points: Vec3[],
  uEnd: number,
  samples = 80
): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < samples; i++) {
    const u = (i / (samples - 1)) * Math.max(0.001, uEnd);
    out.push(getPointOnCenterline(points, u));
  }
  return out;
}

export function radiusAtBase(): number {
  return 2.8;
}

export function estimateCurvature(points: Vec3[], u: number): number {
  const e = 0.002;
  const p0 = getPointOnCenterline(points, Math.max(0, u - e));
  const p1 = getPointOnCenterline(points, u);
  const p2 = getPointOnCenterline(points, Math.min(0.999, u + e));
  const v01 = vSub(p1, p0);
  const v12 = vSub(p2, p1);
  const a = vLen(v01);
  const b = vLen(v12);
  if (a < 1e-5 || b < 1e-5) return 0;
  const dot = (v01.x * v12.x + v01.y * v12.y + v01.z * v12.z) / (a * b);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  return angle / e;
}

export function builtInRadiusAt(points: Vec3[], u: number): number {
  const base = radiusAtBase();
  const u0 = 0.55;
  const width = 0.06;
  const depth = 0.6;
  const stenosis = Math.exp(-((u - u0) * (u - u0)) / (2 * width * width));
  const radiusByStenosis = base * (1 - depth * stenosis);
  const kappa = estimateCurvature(points, u);
  const bendPenalty = Math.min(0.6, kappa * 0.15);
  return Math.max(0.6, radiusByStenosis * (1 - bendPenalty));
}
