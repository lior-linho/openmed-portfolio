export type Lesion = { startT: number; endT: number; baselineStenosisPct: number }
export type Stent = { centerT: number; lengthT: number; oversize: number }

export const defaultLesion: Lesion = { startT: 0.35, endT: 0.52, baselineStenosisPct: 40 }
export const defaultStent: Stent = { centerT: 0.44, lengthT: 0.22, oversize: 1.00 }

export function coveragePct(l: Lesion, s: Stent): number {
  const s0 = s.centerT - s.lengthT/2, s1 = s.centerT + s.lengthT/2
  const inter = Math.max(0, Math.min(s1, l.endT) - Math.max(s0, l.startT))
  const denom = Math.max(1e-6, l.endT - l.startT)
  return (inter/denom)*100
}

export function residualStenosisPct(l: Lesion, s: Stent, oversize: number, k = 0.8): number {
  const s0 = s.centerT - s.lengthT/2, s1 = s.centerT + s.lengthT/2
  const inter = Math.max(0, Math.min(s1, l.endT) - Math.max(s0, l.startT))
  const denom = Math.max(1e-6, l.endT - l.startT)
  const cov = (inter/denom)*100
  
  // 大幅增强oversize参数的影响效果
  const oversizeEffect = 1 + (oversize / 100) * 2.0 // 将oversize效果放大2倍
  const v = l.baselineStenosisPct * Math.max(0, 1 - k * oversizeEffect * cov/100)
  return Math.max(0, Math.min(100, v))
}
