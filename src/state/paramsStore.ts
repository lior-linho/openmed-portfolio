// src/state/paramsStore.ts
import { create } from "zustand";

/** 各模块参数类型 */
export interface VesselParams {
  innerDiameter: number;   // mm
  elasticity: number;      // MPa
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
}

export interface FrictionParams {
  catheter: number;
  stent: number;
}

export interface DisplayParams {
  force: number;
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
  /** 通过 "vessel.innerDiameter" 这样的小路径来更新 */
  setParam: (path: string, value: number) => void;
}

/** 全局参数 store */
export const useParamsStore = create<ParamsState>()((set) => ({
  params: {
    vessel: {
      innerDiameter: 3.0,
      elasticity: 2.2,
    },
    blood: {
      flowVelocity: 20,
      viscosity: 3.5,
      pulsatility: 0.6,
    },
    guidewire: {
      diameter: 0.02,
      length: 260,
      stiffness: 60,
    },
    friction: {
      catheter: 0.12,
      stent: 0.045,
    },
    display: {
      force: 0,
      pathPoints: 0,
      iterations: 0,
      attempts: 0,
      patency: 1.0,
    },
  },

  setParam: (path, value) => {
    set((state) => {
      const keys = path.split(".");
      // 先深拷贝一份 params，保证 Zustand 能检测到变化
      const newParams: any = { ...state.params };

      let target = newParams as any;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        target[k] = { ...target[k] }; // 逐层复制
        target = target[k];
      }
      target[keys[keys.length - 1]] = value;

      return { params: newParams };
    });
  },
}));

