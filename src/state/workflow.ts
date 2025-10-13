import { create } from 'zustand'
import { defaultLesion, defaultStent, coveragePct as covFn, residualStenosisPct as resFn } from '../sim/lesion'
import { DOSE_RATES } from '../constants/dose'
import { WirePreset, StentPreset, WIRE_PRESETS, STENT_PRESETS } from '../constants/models'

// 将模块级变量移至闭包内，避免全局污染
const createWorkflowStore = () => {
  let rafId: number | null = null;
  let lastTs: number | null = null;

  type Step = 'Cross' | 'Pre-dilate' | 'Deploy' | 'Post-dilate'
  type Angles = { laoRaoDeg: number; cranialCaudalDeg: number }
  type FluoroMode = 'idle' | 'fluoro' | 'cine'
  type ControlMode = 'auto' | 'manual'

  type Metrics = {
    startTime: number | null
    endTime: number | null
    attempts: number
    pathLength: number
    contrastCount: number
    doseIndex: number
    residualStenosisPct: number
    coveragePct: number
    progress: number
    resistance: number
  }

  type Experiment = {
    id: string
    name: string
    variables: {
      wireType: 'A' | 'B' | string
      lesionType: 'standard' | 'complex' | string
      operator: string
      notes?: string
    }
    createdAt: number
  }

  type Store = {
    step: Step
    paused: boolean
    angles: Angles
    fluoroMode: FluoroMode
    controlMode: ControlMode
    shootTick: number
    zoom: number
    collimation: { left: number; top: number; right: number; bottom: number }
    metrics: Metrics
    currentExperiment: Experiment | null
    currentWire: WirePreset | null
    currentStent: StentPreset | null
    balloonInflation: number
    stentDeployed: boolean
    stent: import('../sim/lesion').Stent
    complication: { type: 'perforation' | 'rupture' | 'dissection' | 'no-reflow' | 'migration'; at: number; note?: string } | null
    next: () => void
    prev: () => void
    pause: () => void
    resume: () => void
    reset: () => void
    addPath: (len: number) => void
    setProgress: (p: number) => void
    setAngles: (a: Angles) => void
    setZoom: (z: number) => void
    setCollimation: (c: { left: number; top: number; right: number; bottom: number }) => void
    shootContrast: () => void
    startFluoro: () => void
    stopFluoro: () => void
    startCine: (seconds?: number) => void
    setExperiment: (exp: Experiment | null) => void
    createExperiment: (name: string, variables: Experiment['variables']) => void
    setCurrentWire: (wireId: string) => void
    setCurrentStent: (stentId: string) => void
    setControlMode: (mode: ControlMode) => void
    toggleControlMode: () => void
    setBalloon: (v: number) => void
    deployStent: () => void
    setStent: (s: Partial<import('../sim/lesion').Stent>) => void
    setComplication: (c: Store['complication']) => void
    clearComplication: () => void
  }

  const STEPS: Step[] = ['Cross','Pre-dilate','Deploy','Post-dilate']



  // 面积因子计算
  const areaFactor = (c: { left: number; top: number; right: number; bottom: number }): number => {
    const a = (c.right - c.left) * (c.bottom - c.top)
    return Math.max(0.05, Math.min(1, a))
  }

  // 优化的基于时间的剂量积分函数
  const tickDose = (ratePerSec: number, get: () => Store, set: (partial: Partial<Store> | ((state: Store) => Partial<Store>)) => void) => {
    const now = performance.now()
    const s = get()
    
    // 时间稳定性检查
    if (lastTs == null) {
      lastTs = now
      rafId = requestAnimationFrame(() => tickDose(ratePerSec, get, set))
      return
    }
    
    const dt = (now - lastTs) / 1000
    
    // 防止异常时间间隔（如页面切换、系统休眠等）
    const MAX_DT = 0.1 // 最大允许100ms间隔
    const clampedDt = Math.min(dt, MAX_DT)
    
    lastTs = now

    const af = areaFactor(s.collimation)
    const z = s.zoom
    const doseDelta = ratePerSec * clampedDt * af * (z * z)

    set({
      shootTick: s.shootTick + 1,
      metrics: { ...s.metrics, doseIndex: s.metrics.doseIndex + doseDelta }
    })
    rafId = requestAnimationFrame(() => tickDose(ratePerSec, get, set))
  }

  // 优化的电影剂量计算
  const tickCineDose = (
    ratePerSec: number, 
    startTime: number, 
    duration: number,
    get: () => Store, 
    set: (partial: Partial<Store> | ((state: Store) => Partial<Store>)) => void
  ) => {
    const now = performance.now()
    const elapsed = (now - startTime) / 1000
    
    if (elapsed >= duration) {
      set({ fluoroMode: 'idle' })
      rafId && cancelAnimationFrame(rafId)
      rafId = null
      lastTs = null
      return
    }
    
    const s = get()
    
    // 时间稳定性检查
    if (lastTs == null) {
      lastTs = now
      rafId = requestAnimationFrame(() => tickCineDose(ratePerSec, startTime, duration, get, set))
      return
    }
    
    const dt = (now - lastTs) / 1000
    const MAX_DT = 0.1
    const clampedDt = Math.min(dt, MAX_DT)
    
    lastTs = now

    const af = areaFactor(s.collimation)
    const z = s.zoom
    const doseDelta = ratePerSec * clampedDt * af * (z * z)

    set({
      shootTick: s.shootTick + 1,
      metrics: { ...s.metrics, doseIndex: s.metrics.doseIndex + doseDelta }
    })
    rafId = requestAnimationFrame(() => tickCineDose(ratePerSec, startTime, duration, get, set))
  }

  return create<Store>((set, get) => ({
    step: 'Cross',
    paused: false,
    angles: { laoRaoDeg: 0, cranialCaudalDeg: 0 },
    fluoroMode: 'idle',
    controlMode: 'manual',
    shootTick: 0,
    zoom: 1.0,
    collimation: { left: 0, top: 0, right: 1, bottom: 1 },
    currentExperiment: null,
    currentWire: null,
    currentStent: null,
    balloonInflation: 0,
    stentDeployed: false,
    stent: { ...defaultStent },
    complication: null,
    metrics: {
      startTime: Date.now(),
      endTime: null,
      attempts: 0,
      pathLength: 0,
      contrastCount: 0,
      doseIndex: 0,
      residualStenosisPct: 40,
      coveragePct: 0,
      progress: 0,
      resistance: 0
    },
    next: () => set(s => {
      const idx = STEPS.indexOf(s.step)
      const nextStep = STEPS[Math.min(STEPS.length-1, idx+1)]
      let metrics = { ...s.metrics }
      let patch: Partial<Store> = {}

      if (nextStep === 'Pre-dilate') {
        patch = { balloonInflation: 0 }
      }
      if (nextStep === 'Deploy') {
        patch = { balloonInflation: 0, stentDeployed: false }
        const cov = covFn(defaultLesion, s.stent)
        metrics.coveragePct = Number(cov.toFixed(1))
        metrics.residualStenosisPct = Number(resFn(defaultLesion, s.stent, s.stent.oversize).toFixed(1))
      }
      if (nextStep === 'Post-dilate') {
        patch = { balloonInflation: 0 }
        metrics.residualStenosisPct = Number(resFn(defaultLesion, s.stent, Math.min(3, s.stent.oversize * 1.1)).toFixed(1))
      }

      const endTime = nextStep === 'Post-dilate' ? Date.now() : null
      return { step: nextStep, metrics: { ...metrics, endTime }, ...patch }
    }),
    prev: () => set(s => {
      const idx = STEPS.indexOf(s.step)
      const prevStep = STEPS[Math.max(0, idx-1)]
      return { step: prevStep }
    }),
    pause: () => set({ paused: true }),
    resume: () => set({ paused: false }),
    reset: () => set({
      step: 'Cross',
      paused: false,
      angles: { laoRaoDeg: 0, cranialCaudalDeg: 0 },
      fluoroMode: 'idle',
      controlMode: 'manual',
      shootTick: 0,
      zoom: 1.0,
      collimation: { left: 0, top: 0, right: 1, bottom: 1 },
      currentWire: null,
      currentStent: null,
      balloonInflation: 0,
      stentDeployed: false,
      stent: { ...defaultStent },
      complication: null,
      metrics: {
        startTime: Date.now(),
        endTime: null,
        attempts: 0,
        pathLength: 0,
        contrastCount: 0,
        doseIndex: 0,
        residualStenosisPct: 40,
        coveragePct: 0,
        progress: 0,
        resistance: 0
      }
    }),
    setExperiment: (exp) => set({ currentExperiment: exp }),
    createExperiment: (name, variables) => set({
      currentExperiment: {
        id: crypto.randomUUID(),
        name,
        variables,
        createdAt: Date.now()
      }
    }),
    addPath: (len) => set(s => {
      const newPathLength = s.metrics.pathLength + len
      // 性能优化：只在值真正改变时更新
      if (Math.abs(newPathLength - s.metrics.pathLength) < 1e-6) return s
      return { metrics: { ...s.metrics, pathLength: newPathLength }}
    }),
    setProgress: (p) => set(s => {
      const newProgress = Math.max(0, Math.min(1, p))
      // 性能优化：只在值真正改变时更新
      if (Math.abs(newProgress - s.metrics.progress) < 1e-6) return s
      return { metrics: { ...s.metrics, progress: newProgress }}
    }),
    setAngles: (a) => set(s => {
      // 性能优化：只在角度真正改变时更新
      if (Math.abs(s.angles.laoRaoDeg - a.laoRaoDeg) < 1e-6 && 
          Math.abs(s.angles.cranialCaudalDeg - a.cranialCaudalDeg) < 1e-6) {
        return s
      }
      return { angles: a }
    }),
    setZoom: (z) => set(s => {
      const newZoom = Math.max(1, Math.min(3, z))
      // 性能优化：只在缩放真正改变时更新
      if (Math.abs(s.zoom - newZoom) < 1e-6) return s
      return { zoom: newZoom }
    }),
    setCollimation: (c) => set(s => {
      const newCollimation = {
        left: Math.max(0, Math.min(1, c.left)),
        top: Math.max(0, Math.min(1, c.top)),
        right: Math.max(0, Math.min(1, c.right)),
        bottom: Math.max(0, Math.min(1, c.bottom)),
      }
      // 性能优化：只在collimation真正改变时更新
      if (Math.abs(s.collimation.left - newCollimation.left) < 1e-6 &&
          Math.abs(s.collimation.top - newCollimation.top) < 1e-6 &&
          Math.abs(s.collimation.right - newCollimation.right) < 1e-6 &&
          Math.abs(s.collimation.bottom - newCollimation.bottom) < 1e-6) {
        return s
      }
      return { collimation: newCollimation }
    }),
    shootContrast: () => set(s => ({
      shootTick: s.shootTick + 1,
      metrics: { ...s.metrics, contrastCount: s.metrics.contrastCount + 1, doseIndex: s.metrics.doseIndex + 0.5 }
    })),
    startFluoro: () => {
      const currentState = get();
      if (currentState.fluoroMode === 'fluoro' || rafId) return;
      
      set({ fluoroMode: 'fluoro' });
      lastTs = null;
      
      const tick = (now: number) => {
        if (lastTs === null) {
          lastTs = now;
          rafId = requestAnimationFrame(tick);
          return;
        }
        
        const dt = Math.min((now - lastTs) / 1000, 0.1); // 限制最大时间间隔
        lastTs = now;
        
        const s = get();
        if (s.fluoroMode !== 'fluoro') {
          // 模式已更改，停止循环
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          return;
        }
        
        const af = areaFactor(s.collimation);
        const z = s.zoom;
        const doseDelta = DOSE_RATES.FLUORO * dt * af * (z * z);
        
        set({
          shootTick: s.shootTick + 1,
          metrics: { ...s.metrics, doseIndex: s.metrics.doseIndex + doseDelta }
        });
        
        // 添加条件检查，确保只在fluoro模式下继续循环
        if (s.fluoroMode === 'fluoro') {
          rafId = requestAnimationFrame(tick);
        }
      };
      
      rafId = requestAnimationFrame(tick);
    },
    stopFluoro: () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTs = null;
      set({ fluoroMode: 'idle' });
    },
    startCine: (seconds = 3) => {
      const currentState = get();
      if (currentState.fluoroMode === 'cine' || rafId) return;
      
      const s0 = get();
      set({ 
        fluoroMode: 'cine', 
        metrics: { ...s0.metrics, contrastCount: s0.metrics.contrastCount + 1 } 
      });
      lastTs = null;
      const startTime = performance.now();
      
      const tick = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        
        if (elapsed >= seconds) {
          set({ fluoroMode: 'idle' });
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          lastTs = null;
          return;
        }
        
        if (lastTs === null) {
          lastTs = now;
          rafId = requestAnimationFrame(tick);
          return;
        }
        
        const dt = Math.min((now - lastTs) / 1000, 0.1);
        lastTs = now;
        
        const s = get();
        if (s.fluoroMode !== 'cine') {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          return;
        }
        
        const af = areaFactor(s.collimation);
        const z = s.zoom;
        const doseDelta = DOSE_RATES.CINE * dt * af * (z * z);
        
        set({
          shootTick: s.shootTick + 1,
          metrics: { ...s.metrics, doseIndex: s.metrics.doseIndex + doseDelta }
        });
        
        // 添加条件检查，确保只在cine模式下继续循环
        if (s.fluoroMode === 'cine') {
          rafId = requestAnimationFrame(tick);
        }
      };
      
      rafId = requestAnimationFrame(tick);
    },
    setCurrentWire: (wireId) => set({ 
      currentWire: WIRE_PRESETS.find(w => w.id === wireId) || null 
    }),
    setCurrentStent: (stentId) => set({ 
      currentStent: STENT_PRESETS.find(s => s.id === stentId) || null 
    }),
    setControlMode: (mode) => set({ controlMode: mode }),
    toggleControlMode: () => set(s => ({ 
      controlMode: s.controlMode === 'auto' ? 'manual' : 'auto' 
    })),
    setBalloon: (v) => set(s => {
      const val = Math.max(0, Math.min(1, v))
      let residual = s.metrics.residualStenosisPct
      if (s.step === 'Pre-dilate') {
        residual = Number(Math.max(0, defaultLesion.baselineStenosisPct * (1 - 0.4 * val)).toFixed(1))
      }
      if (s.step === 'Post-dilate') {
        residual = Number(Math.max(0, s.metrics.residualStenosisPct * (1 - 0.5 * val)).toFixed(1))
      }
      // Complication triggers (simple PoC thresholds)
      let complication: Store['complication'] | null = s.complication
      if (!complication && s.step !== 'Cross') {
        if (val >= 0.98) {
          complication = { type: 'rupture', at: Date.now(), note: 'Overexpansion' }
        } else if (val >= 0.88 && s.metrics.coveragePct < 80) {
          complication = { type: 'dissection', at: Date.now() }
        }
      }
      return { balloonInflation: val, metrics: { ...s.metrics, residualStenosisPct: residual }, complication }
    }),
    deployStent: () => set(s => {
      if (s.step !== 'Deploy') return {}
      const cov = Number(covFn(defaultLesion, s.stent).toFixed(1))
      const residual = Number(resFn(defaultLesion, s.stent, s.stent.oversize).toFixed(1))
      // Migration if oversize high
      let complication: Store['complication'] | null = s.complication
      if (!complication && s.stent.oversize >= 1.15) {
        complication = { type: 'migration', at: Date.now() }
      }
      return { stentDeployed: true, metrics: { ...s.metrics, coveragePct: cov, residualStenosisPct: residual }, complication }
    }),
    setStent: (part) => set(s => ({ stent: { ...s.stent, ...part } })),
    setComplication: (c) => set(() => ({ complication: c, fluoroMode: 'idle' })),
    clearComplication: () => set(() => ({ complication: null }))
  }));
};

export const useWorkflow = createWorkflowStore();

// 导出类型供其他文件使用
export type Step = 'Cross' | 'Pre-dilate' | 'Deploy' | 'Post-dilate'
export type Angles = { laoRaoDeg: number; cranialCaudalDeg: number }
export type FluoroMode = 'idle' | 'fluoro' | 'cine'
export type ControlMode = 'auto' | 'manual'
export type Experiment = {
  id: string
  name: string
  variables: {
    wireType: 'A' | 'B' | string
    lesionType: 'standard' | 'complex' | string
    operator: string
    notes?: string
  }
  createdAt: number
}
