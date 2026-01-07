// src/state/paramsStore.ts
import { create } from "zustand";
import { updateByPath } from "../domain/params/updater";
import { defaultParams } from "../domain/params/defaults";

/** 各模块参数类型 */
export interface VesselParams {
  innerDiameter: number; // mm
  elasticity: number; // MPa
  curvature: number; // simplified curvature index, 0–1
}

export interface BloodParams {
  flowVelocity: number; // cm/s
  viscosity: number; // cP
  pulsatility: number; // 0–1
}

export interface GuidewireParams {
  diameter: number; // inch
  length: number; // cm
  stiffness: number; // arbitrary 10–100
  advanceSpeed: number; // cm/s
}

export interface FrictionParams {
  catheter: number;
  stent: number;
  mu: number; // simplified effective friction coefficient
}

export interface DisplayParams {
  force: number;

  // simplified scoring core outputs
  forceMean: number; // 0–1
  completion: number; // 0/1

  pathPoints: number;
  iterations: number;
  attempts: number;

  patency: number; // 0–1
}

/** ✅ 新增：仿真进度状态（给 ParameterPanel / 顶部栏使用） */
export interface SimState {
  progress: number; // 0..1
  running: boolean;
}

/** 总的 store 结构 */
export interface ParamsState {
  params: {
    vessel: VesselParams;
    blood: BloodParams;
    guidewire: GuidewireParams;
    friction: FrictionParams;
    display: DisplayParams;
  };

  /** ✅ 新增：仿真进度 */
  sim: SimState;

  /**
   * 通过 "vessel.innerDiameter" 这样的路径来更新参数
   * 例：setParam("blood.viscosity", 4.2)
   */
  setParam: (path: string, value: number) => void;

  /** ✅ 新增：进度控制 */
  setSimProgress: (p: number) => void;
  setSimRunning: (r: boolean) => void;
  resetSim: () => void;
}

/** 全局参数 store（薄封装，可测逻辑已下沉到 domain） */
export const useParamsStore = create<ParamsState>()((set) => ({
  params: defaultParams,

  // ✅ 新增：sim 默认值
  sim: {
    progress: 0,
    running: false,
  },

  setParam: (path, value) => {
    set((state) => ({
      params: updateByPath(state.params, path, value),
    }));
  },

  // ✅ 新增：进度更新（自动 clamp 到 0..1）
  setSimProgress: (p) =>
    set((state) => ({
      sim: {
        ...state.sim,
        progress: Math.max(0, Math.min(1, p)),
      },
    })),

  // ✅ 新增：running 开关
  setSimRunning: (r) =>
    set((state) => ({
      sim: {
        ...state.sim,
        running: r,
      },
    })),

  // ✅ 新增：一键重置
  resetSim: () =>
    set(() => ({
      sim: { progress: 0, running: false },
    })),
}));
