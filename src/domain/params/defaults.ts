import type { VesselParams, BloodParams, GuidewireParams, FrictionParams, DisplayParams } from "../../state/paramsStore";

export const defaultVessel: VesselParams = {
  innerDiameter: 3.0,
  elasticity: 2.2,
  curvature: 0.25,
};

export const defaultBlood: BloodParams = {
  flowVelocity: 20,
  viscosity: 3.5,
  pulsatility: 0.6,
};

export const defaultGuidewire: GuidewireParams = {
  diameter: 0.02,
  length: 260,
  stiffness: 60,
  advanceSpeed: 2.0,
};

export const defaultFriction: FrictionParams = {
  catheter: 0.12,
  stent: 0.045,
  mu: 0.12,
};

export const defaultDisplay: DisplayParams = {
  force: 0,
  forceMean: 0,
  completion: 1,
  pathPoints: 0,
  iterations: 0,
  attempts: 0,
  patency: 1.0,
};

export const defaultParams = {
  vessel: defaultVessel,
  blood: defaultBlood,
  guidewire: defaultGuidewire,
  friction: defaultFriction,
  display: defaultDisplay,
};
