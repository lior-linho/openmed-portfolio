// src/sim/interfaceAdapter.ts
import type { ParamsState } from "../state/paramsStore";
import type { ExperimentRecord, ExperimentMeta } from "./experimentSchema";

export function paramsToExperiment(
  meta: ExperimentMeta,
  params: ParamsState["params"]
): ExperimentRecord {
  return {
    meta,
    source: "simulation",
    vessel: {
      innerDiameterMm: params.vessel.innerDiameter,
      elasticityMPa: params.vessel.elasticity,
      curvature: params.vessel.curvature, // ✅
    },
    blood: {
      flowVelocityCms: params.blood.flowVelocity,
      viscosityCp: params.blood.viscosity,
      pulsatility: params.blood.pulsatility,
    },
    guidewire: {
      diameterInch: params.guidewire.diameter,
      lengthCm: params.guidewire.length,
      stiffness: params.guidewire.stiffness,
    },
    friction: {
      catheterCoeff: params.friction.catheter,
      stentCoeff: params.friction.stent,
      mu: params.friction.mu, // ✅
    },
    metrics: {
      forceN: params.display.force,               // legacy
      forceMeanN: params.display.forceMean,       // ✅
      completion01: params.display.completion,    // ✅

      pathPoints: params.display.pathPoints,
      iterations: params.display.iterations,
      attempts: params.display.attempts,
      patency01: params.display.patency,
    },
  };
}

export function experimentToParams(rec: ExperimentRecord): ParamsState["params"] {
  return {
    vessel: {
      innerDiameter: rec.vessel.innerDiameterMm,
      elasticity: rec.vessel.elasticityMPa,
      curvature: rec.vessel.curvature ?? 0.25, // ✅ fallback
    },
    blood: {
      flowVelocity: rec.blood.flowVelocityCms,
      viscosity: rec.blood.viscosityCp,
      pulsatility: rec.blood.pulsatility,
    },
    guidewire: {
      diameter: rec.guidewire.diameterInch,
      length: rec.guidewire.lengthCm,
      stiffness: rec.guidewire.stiffness,
    },
    friction: {
      catheter: rec.friction.catheterCoeff,
      stent: rec.friction.stentCoeff,
      mu: rec.friction.mu ?? rec.friction.catheterCoeff, // ✅ fallback
    },
    display: {
      force: rec.metrics.forceN,
      forceMean: rec.metrics.forceMeanN ?? rec.metrics.forceN, // ✅ fallback
      completion: rec.metrics.completion01 ?? 1,              // ✅ fallback

      pathPoints: rec.metrics.pathPoints,
      iterations: rec.metrics.iterations,
      attempts: rec.metrics.attempts,
      patency: rec.metrics.patency01,
    },
  };
}
