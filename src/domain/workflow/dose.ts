export type Collimation = { left: number; top: number; right: number; bottom: number };

export function areaFactor(c: Collimation): number {
  const a = (c.right - c.left) * (c.bottom - c.top);
  return Math.max(0.05, Math.min(1, a));
}

export function computeDoseDelta(ratePerSec: number, dtSec: number, c: Collimation, zoom: number): number {
  const MAX_DT = 0.1;
  const clampedDt = Math.min(Math.max(dtSec, 0), MAX_DT);
  const af = areaFactor(c);
  const z = Math.max(1, Math.min(3, zoom));
  return ratePerSec * clampedDt * af * (z * z);
}
