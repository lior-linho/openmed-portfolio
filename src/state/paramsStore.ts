// src/state/paramsStore.ts
import { create } from "zustand";
import { updateByPath } from "../domain/params/updater";
import { defaultParams } from "../domain/params/defaults";


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


export interface SimState {
  progress: number; // 0..1
  running: boolean;
}


export interface ParamsState {
  params: {
    vessel: VesselParams;
    blood: BloodParams;
    guidewire: GuidewireParams;
    friction: FrictionParams;
    display: DisplayParams;
  };


  sim: SimState;


  setParam: (path: string, value: number) => void;


  setSimProgress: (p: number) => void;
  setSimRunning: (r: boolean) => void;
  resetSim: () => void;
}


export const useParamsStore = create<ParamsState>()((set) => ({
  params: defaultParams,


  sim: {
    progress: 0,
    running: false,
  },

  setParam: (path, value) => {
    set((state) => ({
      params: updateByPath(state.params, path, value),
    }));
  },


  setSimProgress: (p) =>
    set((state) => ({
      sim: {
        ...state.sim,
        progress: Math.max(0, Math.min(1, p)),
      },
    })),


  setSimRunning: (r) =>
    set((state) => ({
      sim: {
        ...state.sim,
        running: r,
      },
    })),


  resetSim: () =>
    set(() => ({
      sim: { progress: 0, running: false },
    })),
}));
