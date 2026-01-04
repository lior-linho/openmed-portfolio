// src/state/paramsStore.ts
import { create } from "zustand";
import { updateByPath } from "../domain/params/updater";
import { defaultParams } from "../domain/params/defaults";

/** 各模块参数类型 */
export interface VesselParams {
  innerDiameter: number;   // mm
  elasticity: number;      // MPa
  curvature: number;       // simplified curvature index, 0–1
}

export interface BloodParams {
  flowVelocity: number;    // cm/s
  viscosity: number;       // cP
  pulsatility: number;     // 0–1
}

export interface GuidewireParams {
  diameter: number;        // inch
  length: number;          // cm
  stiffness: number;       // arbitrary 10–100
  advanceSpeed: number;
}

export interface FrictionParams {
  catheter: number;
  stent: number;
  mu: number;              // simplified effective friction coefficient
}

export interface DisplayParams {
  // legacy / generic
  force: number;

  // simplified scoring core outputs
  forceMean: number;       // N
  completion: number;      // 0/1

  pathPoints: number;
  iterations: number;
  attempts: number;

  patency: number;         // 0–1
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

  /**
   * 通过 "vessel.innerDiameter" 这样的路径来更新参数
   * 例：setParam("blood.viscosity", 4.2)
   */
  setParam: (path: string, value: number) => void;
}

/** 全局参数 store（薄封装，可测逻辑已下沉到 domain） */
export const useParamsStore = create<ParamsState>()((set) => ({
  params: defaultParams,

  setParam: (path, value) => {
    set((state) => ({
      params: updateByPath(state.params, path, value),
    }));
  },
}));
