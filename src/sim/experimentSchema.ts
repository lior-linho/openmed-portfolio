// src/sim/experimentSchema.ts

export type DataSource = "simulation" | "phantom" | "clinical";

export interface VesselParamsExt {
  innerDiameterMm: number;
  elasticityMPa: number;
  curvature?: number;          // ✅ simplified curvature index (0–1)
}

export interface BloodParamsExt {
  flowVelocityCms: number;
  viscosityCp: number;
  pulsatility: number;
}

export interface GuidewireParamsExt {
  diameterInch: number;
  lengthCm: number;
  stiffness: number;
  advanceSpeedCms?: number;
}

export interface FrictionParamsExt {
  catheterCoeff: number;
  stentCoeff: number;
  mu?: number;                 // ✅ simplified effective friction coefficient
}

export interface SimulationMetrics {
  forceN: number;              // legacy / generic force (kept)
  forceMeanN?: number;         // ✅ mean force used by simplified R
  completion01?: number;       // ✅ 0/1 success used by simplified C

  pathPoints: number;
  iterations: number;
  attempts: number;
  patency01: number;
}

export interface ExperimentMeta {
  id: string;
  timestamp: string;
  operator?: string;
  vesselModelKey?: string;
  note?: string;
}

export interface ExperimentRecord {
  meta: ExperimentMeta;
  source: DataSource;
  vessel: VesselParamsExt;
  blood: BloodParamsExt;
  guidewire: GuidewireParamsExt;
  friction: FrictionParamsExt;
  metrics: SimulationMetrics;
}
