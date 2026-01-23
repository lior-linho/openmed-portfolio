// src/constants/models.ts
export interface VascularModel {
  id: string;
  name: string;
  description: string;
  curvature: number; 
  calcification: number; 
  length: number; 
  stenosis: number; 
}

export interface WirePreset {
  id: string;
  name: string;
  flexibility: number; 
  pushability: number; 
}

export interface StentPreset {
  id: string;
  name: string;
  oversize: number; 
}

// Standard model
export const STANDARD_MODEL: VascularModel = {
  id: 'CL-Ca70-B90-001',
  name: 'OpenMed Standard Calcified Bend (v1)', // keep English name
  description: 'Standardized heavy calcified bend lesion',
  curvature: 90, // 90-degree bend
  calcification: 70,
  length: 30, // 30mm
  stenosis: 60, // 60% stenosis
};

// Wire presets - enhanced differences
export const WIRE_PRESETS: WirePreset[] = [
  { id: 'wire-a', name: 'Wire A (Ultra-flexible)', flexibility: 0.95, pushability: 0.2 },
  { id: 'wire-b', name: 'Wire B (High support)', flexibility: 0.3, pushability: 0.9 },
  { id: 'wire-c', name: 'Wire C (Balanced)', flexibility: 0.7, pushability: 0.6 },
];

// Stent presets
export const STENT_PRESETS: StentPreset[] = [
  { id: 'stent-5', name: 'Stent fit (5% oversize)', oversize: 5 },
  { id: 'stent-10', name: 'Stent fit (10% oversize)', oversize: 10 },
  { id: 'stent-15', name: 'Stent fit (15% oversize)', oversize: 15 },
];
