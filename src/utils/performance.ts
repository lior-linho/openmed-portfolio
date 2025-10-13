// src/utils/performance.ts
import { PerformanceMetrics } from '../types/three-extensions'

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    resistanceUpdateTime: 0,
    renderTime: 0,
    frameRate: 0
  }
  
  private frameCount = 0
  private lastFrameTime = performance.now()
  private resistanceUpdateTimes: number[] = []
  private renderTimes: number[] = []
  
  // 记录阻力采样时间
  recordResistanceUpdate(duration: number) {
    this.resistanceUpdateTimes.push(duration)
    if (this.resistanceUpdateTimes.length > 60) {
      this.resistanceUpdateTimes.shift()
    }
    this.metrics.resistanceUpdateTime = this.resistanceUpdateTimes.reduce((a, b) => a + b, 0) / this.resistanceUpdateTimes.length
  }
  
  // 记录渲染时间
  recordRenderTime(duration: number) {
    this.renderTimes.push(duration)
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift()
    }
    this.metrics.renderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
  }
  
  // 更新帧率
  updateFrameRate() {
    this.frameCount++
    const now = performance.now()
    const elapsed = now - this.lastFrameTime
    
    if (elapsed >= 1000) { // 每秒更新一次
      this.metrics.frameRate = this.frameCount * 1000 / elapsed
      this.frameCount = 0
      this.lastFrameTime = now
    }
  }
  
  // 获取性能指标
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }
  
  // 检查性能警告
  checkPerformanceWarnings(): string[] {
    const warnings: string[] = []
    
    if (this.metrics.frameRate < 30) {
      warnings.push(`帧率过低: ${this.metrics.frameRate.toFixed(1)} FPS`)
    }
    
    if (this.metrics.renderTime > 16) {
      warnings.push(`渲染时间过长: ${this.metrics.renderTime.toFixed(2)}ms`)
    }
    
    if (this.metrics.resistanceUpdateTime > 10) {
      warnings.push(`阻力采样时间过长: ${this.metrics.resistanceUpdateTime.toFixed(2)}ms`)
    }
    
    return warnings
  }
  
  // 重置监控器
  reset() {
    this.metrics = {
      resistanceUpdateTime: 0,
      renderTime: 0,
      frameRate: 0
    }
    this.frameCount = 0
    this.lastFrameTime = performance.now()
    this.resistanceUpdateTimes = []
    this.renderTimes = []
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor()

// 性能装饰器
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now()
    const result = fn(...args)
    const duration = performance.now() - start
    
    if (name === 'resistanceUpdate') {
      performanceMonitor.recordResistanceUpdate(duration)
    } else if (name === 'render') {
      performanceMonitor.recordRenderTime(duration)
    }
    
    return result
  }) as T
}
