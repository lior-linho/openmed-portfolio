// src/components/PerformanceMonitor.tsx
import { useEffect, useState, useRef } from 'react'
import { performanceMonitor } from '../utils/performance'
import { useWorkflow } from '../state/workflow'

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics())
  const [warnings, setWarnings] = useState<string[]>([])
  const { fluoroMode, metrics: workflowMetrics } = useWorkflow()
  const animationRef = useRef<number>()

  useEffect(() => {
    const update = () => {
      setMetrics(performanceMonitor.getMetrics())
      setWarnings(performanceMonitor.checkPerformanceWarnings())
      animationRef.current = requestAnimationFrame(update)
    }
    
    animationRef.current = requestAnimationFrame(update)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '13px',
      fontFamily: 'monospace',
      height: '100%',
      overflow: 'auto'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>System Monitor</div>
      <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>
        <div>Frame Rate: {metrics.frameRate.toFixed(1)} FPS</div>
        <div>Render Time: {metrics.renderTime.toFixed(2)}ms</div>
        <div>Resistance Sampling: {metrics.resistanceUpdateTime.toFixed(2)}ms</div>
      </div>
      
      <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>
        <div>Current Mode: {fluoroMode === 'fluoro' ? 'Fluoroscopy' : fluoroMode === 'cine' ? 'Cine' : 'Idle'}</div>
        <div>Cumulative Dose: {workflowMetrics.doseIndex.toFixed(2)} μGy</div>
        <div>Contrast Shots: {workflowMetrics.contrastCount}</div>
        <div>Instrument Resistance: {workflowMetrics.resistance.toFixed(2)}</div>
      </div>
      
      {warnings.length > 0 && (
        <div style={{ marginTop: '5px', color: '#ff6b6b' }}>
          <div style={{ fontWeight: 'bold' }}>Warnings:</div>
          {warnings.map((warning, index) => (
            <div key={index}>• {warning}</div>
          ))}
        </div>
      )}
    </div>
  )
}
