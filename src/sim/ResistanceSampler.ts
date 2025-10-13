// src/sim/ResistanceSampler.ts
import * as THREE from 'three'
import { acceleratedRaycast } from 'three-mesh-bvh'
import { WirePreset, StentPreset } from '../constants/models'

// 在文件顶部添加更完整的类型扩展
declare global {
  namespace THREE {
    interface BufferGeometry {
      computeBoundsTree?: () => void;
      disposeBoundsTree?: () => void;
      boundsTree?: any;
    }
    
    interface Mesh {
      raycast: (raycaster: any, intersects: any[]) => void;
    }
    
    interface Intersection {
      distance: number;
      face: any | null;
      point: any;
      object: any;
    }
  }
}

// 阻力采样结果类型
interface ResistanceResult {
  R: number      // 阻力值 (0-1)
  d: number      // 距离血管壁的距离
  n: THREE.Vector3  // 法向量
}

// 改进的阻力模型参数
interface ResistanceModel {
  // 基础参数
  vesselRadius: number
  wireRadius: number
  
  // 物理参数
  frictionCoeff: number      // 摩擦系数
  bendingStiffness: number   // 弯曲刚度
  contactThreshold: number   // 接触阈值
  
  // 血管特性
  stenosisFactor: number     // 狭窄因子
  curvatureFactor: number    // 曲率因子
  
  // 支架特性
  stentOversize: number      // 支架oversize百分比
  stentDeployed: boolean     // 支架是否已部署
}

export class ResistanceSampler {
  private mesh: THREE.Mesh
  private bvhReady = false
  private tmpRay = new THREE.Ray()
  private tmpDir = new THREE.Vector3()
  private tmpPos = new THREE.Vector3()
  private tmpPrev = new THREE.Vector3()
  
  // 性能优化：缓存和重用对象
  private raycaster = new THREE.Raycaster()
  private hits: THREE.Intersection[] = []
  private lastSampleTime = 0
  private sampleCache = new Map<string, ResistanceResult>()
  private cacheMaxSize = 1000
  private cacheTimeout = 100 // 缓存100ms
  
  // 改进的阻力模型
  private model: ResistanceModel = {
    vesselRadius: 0.12,
    wireRadius: 0.02,
    frictionCoeff: 0.3,
    bendingStiffness: 0.8,
    contactThreshold: 0.05,
    stenosisFactor: 1.0,
    curvatureFactor: 1.0,
    stentOversize: 0,
    stentDeployed: false
  }

  constructor(vesselMesh: THREE.Mesh) {
    this.mesh = vesselMesh;
    
    try {
      // 安全地初始化BVH
      const geometry = this.mesh.geometry as THREE.BufferGeometry & {
        computeBoundsTree?: () => void;
      };
      
      if (geometry.computeBoundsTree) {
        geometry.computeBoundsTree();
        this.bvhReady = true;
        console.log('BVH initialized successfully');
      } else {
        console.warn('BVH not available - falling back to basic collision detection');
        this.bvhReady = false;
      }
    } catch (error) {
      console.error('Failed to initialize BVH:', error);
      this.bvhReady = false;
    }
  }

  // 计算弯曲角度阻力
  private calculateBendingResistance(tip: THREE.Vector3, dir: THREE.Vector3, prevDir?: THREE.Vector3): number {
    if (!prevDir) return 0
    
    const angle = dir.angleTo(prevDir)
    const maxAngle = Math.PI / 4 // 45度
    
    // 弯曲阻力随角度非线性增长
    const normalizedAngle = Math.min(angle / maxAngle, 1)
    return this.model.bendingStiffness * Math.pow(normalizedAngle, 2)
  }

  // 计算血管狭窄阻力
  private calculateStenosisResistance(distance: number): number {
    const normalizedDistance = distance / this.model.vesselRadius
    
    // 距离血管壁越近，狭窄阻力越大
    if (normalizedDistance > 0.8) return 0
    
    const stenosisIntensity = 1 - normalizedDistance / 0.8
    return this.model.stenosisFactor * stenosisIntensity
  }

  // 计算接触阻力
  private calculateContactResistance(distance: number, normal: THREE.Vector3, direction: THREE.Vector3): number {
    if (distance > this.model.contactThreshold) return 0
    
    // 接触面积随距离减小
    const contactArea = 1 - (distance / this.model.contactThreshold)
    
    // 法向量与运动方向的夹角影响阻力
    const angleToNormal = Math.abs(direction.dot(normal))
    
    return this.model.frictionCoeff * contactArea * angleToNormal
  }

  // 计算曲率阻力
  private calculateCurvatureResistance(points: THREE.Vector3[], currentIndex: number): number {
    if (currentIndex < 2 || currentIndex >= points.length - 2) return 0
    
    const prev = points[currentIndex - 1]
    const current = points[currentIndex]
    const next = points[currentIndex + 1]
    
    const v1 = current.clone().sub(prev)
    const v2 = next.clone().sub(current)
    
    if (v1.length() < 1e-6 || v2.length() < 1e-6) return 0
    
    v1.normalize()
    v2.normalize()
    
    const angle = v1.angleTo(v2)
    const curvature = angle / (v1.length() + v2.length()) * 0.5
    
    return this.model.curvatureFactor * Math.min(curvature, 1)
  }

  // 计算支架部署后的阻力影响
  private calculateStentResistance(distance: number, progress: number): number {
    if (!this.model.stentDeployed || this.model.stentOversize <= 0) return 0
    
    // 支架部署后，在支架区域会产生额外的阻力
    // 这里假设支架部署在进度0.6-0.8的区域
    const stentStart = 0.6
    const stentEnd = 0.8
    
    if (progress < stentStart || progress > stentEnd) return 0
    
    // 支架oversize越大，阻力越大
    const oversizeFactor = this.model.stentOversize / 100 // 转换为0-1范围
    const stentResistance = oversizeFactor * 0.3 // 最大30%的额外阻力
    
    // 距离血管壁越近，支架阻力越大
    const wallFactor = Math.max(0, (this.model.vesselRadius - distance) / this.model.vesselRadius)
    
    return stentResistance * wallFactor
  }

  sample(tip: THREE.Vector3, dir: THREE.Vector3, prevDir?: THREE.Vector3, pathPoints?: THREE.Vector3[], currentIndex?: number, progress?: number): ResistanceResult {
    const startTime = performance.now()
    
    try {
      if (!this.bvhReady) return { R: 0, d: Infinity, n: new THREE.Vector3() }
      
      // 性能优化：检查缓存
      const cacheKey = this.generateCacheKey(tip, dir)
      const now = performance.now()
      
      if (now - this.lastSampleTime < this.cacheTimeout) {
        const cached = this.sampleCache.get(cacheKey)
        if (cached) {
          return cached
        }
      }
      
      const MAX = 0.02
      this.tmpPos.copy(tip)
      this.tmpDir.copy(dir).normalize()
      this.tmpRay.set(this.tmpPos, this.tmpDir)

      // 性能优化：重用hits数组
      this.hits.length = 0
      this.raycaster.ray = this.tmpRay
      this.raycaster.intersectObject(this.mesh, false, this.hits)
      
      const hit = this.hits.find(h => h.distance <= MAX)
      if (!hit) {
        const result = { R: 0, d: MAX, n: new THREE.Vector3() }
        this.cacheResult(cacheKey, result)
        return result
      }

      const d = Math.max(1e-4, hit.distance)
      const n = hit.face?.normal?.clone()?.transformDirection(this.mesh.matrixWorld) ?? new THREE.Vector3()
      
      // 综合阻力计算
      const wallResistance = this.calculateWallResistance(d)
      const bendingResistance = this.calculateBendingResistance(tip, dir, prevDir)
      const stenosisResistance = this.calculateStenosisResistance(d)
      const contactResistance = this.calculateContactResistance(d, n, dir)
      const curvatureResistance = pathPoints && currentIndex !== undefined 
        ? this.calculateCurvatureResistance(pathPoints, currentIndex) 
        : 0
      const stentResistance = progress !== undefined 
        ? this.calculateStentResistance(d, progress) 
        : 0
      
      // 阻力组合（使用加权平均）
      const totalResistance = (
        wallResistance * 0.35 +
        bendingResistance * 0.2 +
        stenosisResistance * 0.2 +
        contactResistance * 0.15 +
        curvatureResistance * 0.05 +
        stentResistance * 0.05
      )
      
      const R = THREE.MathUtils.clamp(totalResistance, 0, 1)
      
      const result = { R, d, n }
      this.cacheResult(cacheKey, result)
      this.lastSampleTime = now
      
      // 性能监控
      const duration = performance.now() - startTime
      if (duration > 5) { // 如果采样时间超过5ms，记录警告
        console.warn(`Resistance sampling took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      console.error('Error in resistance sampling:', error);
      return { R: 0, d: Infinity, n: new THREE.Vector3() };
    }
  }

  // 性能优化：生成缓存键
  private generateCacheKey(tip: THREE.Vector3, dir: THREE.Vector3): string {
    // 将位置和方向量化以减少缓存键的数量
    const x = Math.round(tip.x * 100) / 100
    const y = Math.round(tip.y * 100) / 100
    const z = Math.round(tip.z * 100) / 100
    const dx = Math.round(dir.x * 10) / 10
    const dy = Math.round(dir.y * 10) / 10
    const dz = Math.round(dir.z * 10) / 10
    return `${x},${y},${z},${dx},${dy},${dz}`
  }

  // 性能优化：缓存结果
  private cacheResult(key: string, result: ResistanceResult): void {
    if (this.sampleCache.size >= this.cacheMaxSize) {
      // 删除最旧的缓存项
      const firstKey = this.sampleCache.keys().next().value
      if (firstKey !== undefined) {
        this.sampleCache.delete(firstKey)
      }
    }
    this.sampleCache.set(key, result)
  }

  // 基础贴壁阻力计算
  private calculateWallResistance(distance: number): number {
    const normalizedDistance = distance / this.model.vesselRadius
    const wallFactor = THREE.MathUtils.clamp((this.model.vesselRadius - distance) / this.model.vesselRadius, 0, 1)
    
    // 使用平滑的S形曲线
    return wallFactor * wallFactor * (3 - 2 * wallFactor)
  }

  // 更新阻力模型参数
  updateModel(newModel: Partial<ResistanceModel>): void {
    this.model = { ...this.model, ...newModel }
  }

  // 根据导丝预设更新模型参数 - 大幅增强差异效果
  updateFromWirePreset(wirePreset: WirePreset | null): void {
    if (!wirePreset) {
      // 默认参数
      this.model = {
        ...this.model,
        frictionCoeff: 0.3,
        bendingStiffness: 0.8,
        stenosisFactor: 1.0,
        curvatureFactor: 1.0
      };
      return;
    }
    
    // 大幅增强导丝参数差异效果
    this.model = {
      ...this.model,
      // 摩擦系数：柔顺性越高，摩擦系数越低（差异放大3倍）
      frictionCoeff: 0.1 + 0.8 * (1 - wirePreset.flexibility),
      
      // 弯曲刚度：推送性越强，弯曲刚度越高（差异放大2倍）
      bendingStiffness: 0.2 + 1.6 * wirePreset.pushability,
      
      // 狭窄阻力因子：柔顺性影响通过狭窄区域的能力（差异放大2倍）
      stenosisFactor: 0.5 + 1.5 * (1 - wirePreset.flexibility),
      
      // 曲率阻力因子：推送性影响通过弯曲的能力（差异放大2倍）
      curvatureFactor: 0.3 + 1.4 * wirePreset.pushability,
    };
    
    console.log(`导丝参数更新: ${wirePreset.name}`, {
      flexibility: wirePreset.flexibility,
      pushability: wirePreset.pushability,
      frictionCoeff: this.model.frictionCoeff,
      bendingStiffness: this.model.bendingStiffness,
      stenosisFactor: this.model.stenosisFactor,
      curvatureFactor: this.model.curvatureFactor
    });
  }

  // 根据支架预设更新模型参数
  updateFromStentPreset(stentPreset: StentPreset | null, step: string): void {
    if (!stentPreset) {
      this.model.stentOversize = 0
      this.model.stentDeployed = false
      return
    }
    
    // 根据手术步骤决定支架是否已部署
    const isDeployed = step === 'Deploy' || step === 'Post-dilate'
    
    this.model.stentOversize = stentPreset.oversize
    this.model.stentDeployed = isDeployed
    
    console.log(`支架参数更新: ${stentPreset.name}`, {
      oversize: stentPreset.oversize,
      deployed: isDeployed,
      step
    });
  }

  // 获取当前模型参数
  getModel(): ResistanceModel {
    return { ...this.model }
  }

  dispose(): void {
    // 清理缓存
    this.sampleCache.clear()
    
    // 清理BVH
    if (this.bvhReady) {
      try {
        const geometry = this.mesh.geometry as THREE.BufferGeometry & {
          disposeBoundsTree?: () => void;
        };
        geometry.disposeBoundsTree?.();
        this.bvhReady = false;
        console.log('BVH disposed successfully');
      } catch (error) {
        console.error('Failed to dispose BVH:', error);
      }
    }
    
    // 清理临时对象
    this.hits.length = 0
    this.lastSampleTime = 0
  }
}
