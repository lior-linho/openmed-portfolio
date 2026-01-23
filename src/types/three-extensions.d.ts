// src/types/three-extensions.d.ts
import * as THREE from 'three'


declare module 'three' {
  interface BufferGeometry {
    computeBoundsTree?: () => void;
    disposeBoundsTree?: () => void;
    boundsTree?: any;
  }
  
  interface Mesh {
    raycast: (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void;
  }
}


declare global {
  interface Window {
    __THREE__: any;
  }
}


export interface ResistanceResult {
  R: number      
  d: number      
  n: THREE.Vector3  
}

export interface WorkflowMetrics {
  progress: number
  resistance: number
  dose: number
  pathLength: number
}

export interface WorkflowState {
  step: 'Navigate' | 'Cross' | 'Deploy'
  mode: '3d' | 'fluoro'
  metrics: WorkflowMetrics
  angles: { x: number; y: number }
  zoom: number
  collimation: { left: number; top: number; right: number; bottom: number }
}

export interface XRCanvasProps {
  onCanvasReady: (c: HTMLCanvasElement) => void
}

export interface EffectComposerRef {
  composer: any | null
  dispose: () => void
}


export interface VesselGeometry {
  curve: THREE.CatmullRomCurve3
  geometry: THREE.TubeGeometry
}


export interface PhysicsState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  resistance: number
  timestamp: number
}


export interface NoiseEffectConfig {
  premultiply?: boolean
  blendFunction?: any
}

export interface VignetteEffectConfig {
  darkness?: number
  offset?: number
  blendFunction?: any
}

export interface BloomEffectConfig {
  intensity?: number
  luminanceThreshold?: number
  luminanceSmoothing?: number
  blendFunction?: any
}


export interface PerformanceMetrics {
  resistanceUpdateTime: number
  renderTime: number
  frameRate: number
  memoryUsage?: number
}
