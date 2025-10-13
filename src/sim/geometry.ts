import * as THREE from 'three'

export function makeCenterline(samples = 200): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1)
    const x = t * 3 - 1.5
    const y = Math.sin(t * Math.PI * 1.5) * 0.4
    const z = Math.cos(t * Math.PI) * 0.2
    pts.push(new THREE.Vector3(x, y, z))
  }
  return pts
}

export function accumulateArcLengths(points: THREE.Vector3[]): number[] {
  const L = [0]
  for (let i = 1; i < points.length; i++) {
    L[i] = L[i-1] + points[i].distanceTo(points[i-1])
  }
  return L
}

export function arcLenBetween(points: THREE.Vector3[], cum: number[], p0: number, p1: number): number {
  const i0 = Math.max(0, Math.min(points.length-1, Math.floor(p0*(points.length-1))))
  const i1 = Math.max(0, Math.min(points.length-1, Math.floor(p1*(points.length-1))))
  
  const baseLen = Math.abs(cum[i1] - cum[i0])
  
  const frac0 = p0 * (points.length - 1) - i0
  const frac1 = p1 * (points.length - 1) - i1
  
  let segmentLen = 0
  
  if (frac0 > 0 && i0 < points.length - 1) {
    const segLen = points[i0 + 1].distanceTo(points[i0])
    segmentLen += segLen * frac0
  }
  
  if (frac1 > 0 && i1 < points.length - 1) {
    const segLen = points[i1 + 1].distanceTo(points[i1])
    segmentLen += segLen * frac1
  }
  
  return baseLen + segmentLen
}

export function clipByProgress(points: THREE.Vector3[], progress: number): THREE.Vector3[] {
  const n = Math.max(2, Math.floor(points.length * Math.min(1, Math.max(0, progress))))
  return points.slice(0, n)
}

export function curvatureAt(points: THREE.Vector3[], t: number): number {
  const idx = Math.min(points.length - 2, Math.max(1, Math.floor(t * (points.length - 1))))
  const p0 = points[idx - 1], p1 = points[idx], p2 = points[idx + 1]
  
  const d10 = p1.distanceTo(p0), d21 = p2.distanceTo(p1)
  if (d10 < 1e-6 || d21 < 1e-6) return 0
  
  const v1 = new THREE.Vector3().subVectors(p1, p0).normalize()
  const v2 = new THREE.Vector3().subVectors(p2, p1).normalize()
  const dot = THREE.MathUtils.clamp(v1.dot(v2), -1, 1)
  const angle = Math.acos(dot)
  
  return Math.min(angle, Math.PI * 0.8)
}

export type Angles = { laoRaoDeg: number; cranialCaudalDeg: number }

export function makeXrayCamera(angles: Angles, aspect: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(45, aspect, 0.1, 100)
  const radius = 8
  const yaw = THREE.MathUtils.degToRad(angles.laoRaoDeg)
  const pitch = THREE.MathUtils.degToRad(angles.cranialCaudalDeg)

  const cx = Math.sin(yaw) * Math.cos(pitch) * radius
  const cy = Math.sin(pitch) * radius
  const cz = Math.cos(yaw) * Math.cos(pitch) * radius

  cam.position.set(cx, cy, cz)
  cam.lookAt(0, 0, 0)
  cam.up.set(0, 1, 0)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  return cam
}

export function projectTo2D(points: THREE.Vector3[], cam: THREE.PerspectiveCamera, w: number, h: number): [number, number][] {
  return points.map(p => {
    const v = p.clone().project(cam)
    const x = Math.max(0, Math.min(w, (v.x + 1) * 0.5 * w))
    const y = Math.max(0, Math.min(h, (1 - (v.y + 1) * 0.5) * h))
    return [x, y]
  })
}
