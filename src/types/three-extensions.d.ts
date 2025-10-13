// src/types/three-extensions.d.ts
import * as THREE from 'three'

// 扩展 Three.js 类型定义
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

// 添加全局类型扩展
declare global {
  interface Window {
    __THREE__: any;
  }
}

// 自定义类型定义
export interface ResistanceResult {
  R: number      // 阻力值 (0-1)
  d: number      // 距离血管壁的距离
  n: THREE.Vector3  // 法向量
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

// 几何体相关类型
export interface VesselGeometry {
  curve: THREE.CatmullRomCurve3
  geometry: THREE.TubeGeometry
}

// 物理模拟相关类型
export interface PhysicsState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  resistance: number
  timestamp: number
}

// 后处理效果相关类型
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

// 性能监控类型
export interface PerformanceMetrics {
  resistanceUpdateTime: number
  renderTime: number
  frameRate: number
  memoryUsage?: number
}
