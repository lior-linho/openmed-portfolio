// 剂量率常量
export const DOSE_RATES = {
  FLUORO: 0.18,  // 透视模式剂量率 (μGy/s)
  CINE: 0.72,    // 造影模式剂量率 (μGy/s)
  IDLE: 0.00     // 空闲模式剂量率 (μGy/s)
} as const

export const DOSE_RATE_LABELS = {
  FLUORO: '0.18',
  CINE: '0.72', 
  IDLE: '0.00'
} as const
