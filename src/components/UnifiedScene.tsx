import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useWorkflow } from '../state/workflow'
import { makeCenterline, clipByProgress, accumulateArcLengths, arcLenBetween, makeXrayCamera } from '../sim/geometry'
import { ResistanceSampler } from '../sim/ResistanceSampler'
import { performanceMonitor, measurePerformance } from '../utils/performance'
import { CameraController } from './CameraController'
import { StepVisuals } from './StepVisuals'

// 将几何体创建移到组件外部，避免重复创建
const createVesselGeometry = (points: THREE.Vector3[]) => {
  const curve = new THREE.CatmullRomCurve3(points)
  return new THREE.TubeGeometry(curve, 300, 0.12, 16, false)
}

export function UnifiedScene() {
  const points = useMemo(() => makeCenterline(200), [])
  const { angles, zoom } = useWorkflow()
  
  // 根据角度和缩放创建相机配置
  const cameraConfig = useMemo(() => {
    const aspect = 1.0 // default aspect ratio
    const camera = makeXrayCamera(angles, aspect)
    camera.fov = 45 / zoom
    camera.updateProjectionMatrix()
    
    // Debug info
    console.log('UnifiedScene camera config:', {
      angles,
      zoom,
      position: [camera.position.x, camera.position.y, camera.position.z],
      fov: camera.fov
    })
    
    return {
      position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
      fov: camera.fov
    }
  }, [angles, zoom])
  
  return (
    <Canvas 
      camera={cameraConfig}
    >
      <CameraController />
      <SceneContents points={points} />
    </Canvas>
  )
}

export function SceneContents({ points }: { points: THREE.Vector3[] }) {
  const { addPath, setProgress, fluoroMode } = useWorkflow()
  const cum = useMemo(() => accumulateArcLengths(points), [points])

  // 阻力采样 - 完全解耦的状态管理
  const vesselRef = useRef<THREE.Mesh>(null!)
  const samplerRef = useRef<ResistanceSampler>()
  const resistanceRef = useRef(0)
  const lastResistanceUpdateRef = useRef(0)

  // 几何体只创建一次
  const tube = useMemo(() => createVesselGeometry(points), [points])

  useEffect(() => {
    const m = vesselRef.current
    if (m && !samplerRef.current) {
      // 更安全的类型断言 - 使用扩展的类型定义
      const geometry = m.geometry as THREE.BufferGeometry
      if (geometry.computeBoundsTree) {
        geometry.computeBoundsTree()
      }
      samplerRef.current = new ResistanceSampler(m)
    }
    return () => {
      const m = vesselRef.current
      if (m) {
        const geometry = m.geometry as THREE.BufferGeometry
        if (geometry.disposeBoundsTree) {
          geometry.disposeBoundsTree()
        }
      }
    }
  }, [])

  // 导丝和支架选择变化时立即更新阻力采样器参数
  const { currentWire, currentStent, step } = useWorkflow()
  useEffect(() => {
    if (samplerRef.current) {
      samplerRef.current.updateFromWirePreset(currentWire)
      samplerRef.current.updateFromStentPreset(currentStent, step)
    }
  }, [currentWire, currentStent, step])

  // 阻力采样逻辑 - 使用独立的间隔计时器，完全解耦
  const updateResistance = useCallback(
    measurePerformance(() => {
      const { metrics } = useWorkflow.getState()
      const pathPoints = points
      const idx = Math.max(1, Math.min(pathPoints.length - 1, Math.floor(metrics.progress * (pathPoints.length - 1))))
      const tip = pathPoints[idx] ?? new THREE.Vector3()
      const prevP = pathPoints[idx - 1] ?? tip
      const prevPrevP = pathPoints[Math.max(0, idx - 2)] ?? prevP
      const dir = tip.clone().sub(prevP).normalize()
      const prevDir = prevP.clone().sub(prevPrevP).normalize()

      const res = samplerRef.current?.sample(tip, dir, prevDir, pathPoints, idx, metrics.progress) ?? {R:0,d:1,n:new THREE.Vector3()}
      resistanceRef.current = res.R
      lastResistanceUpdateRef.current = performance.now()
      
      useWorkflow.setState(s => ({ 
        metrics: { ...s.metrics, resistance: res.R } 
      }))
    }, 'resistanceUpdate'),
    [points]
  )

  // 独立的阻力采样计时器 - 20fps，与渲染完全解耦
  useEffect(() => {
    const interval = setInterval(updateResistance, 50) // 20fps
    return () => clearInterval(interval)
  }, [updateResistance])

  // 自动推进 - 只处理推进逻辑，阻力采样已解耦
  const { metrics } = useWorkflow()
  const progRef = useRef(metrics.progress) // 从当前进度开始，而不是从0开始
  
  // 同步进度状态，确保 progRef 与当前进度保持一致
  useEffect(() => {
    progRef.current = metrics.progress
  }, [metrics.progress])
  
  useFrame(
    measurePerformance((_, dt) => {
      const { controlMode, step } = useWorkflow.getState()
      
      // 只在自动模式下推进
      if (controlMode === 'auto') {
        // 推进速度受阻力影响 - 使用clamp避免负值
        const resistance = resistanceRef.current
        const base = step === 'Cross' ? 0.15 : 0.05
        const slow = Math.max(0, base * (1 - 0.7 * resistance))
        const nextP = Math.min(1, progRef.current + dt * slow * 0.1)
        const dL = arcLenBetween(points, cum, progRef.current, nextP)
        
        setProgress(nextP)
        addPath(dL)
        progRef.current = nextP
      }
      
      // 更新性能监控
      performanceMonitor.updateFrameRate()
    }, 'render')
  )

  // 血管材质 - 在3D幕后视图中始终可见
  const vesselMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#7dd3fc",
      metalness: 0.1,
      roughness: 0.6,
      transparent: true,
      opacity: 0.5,
      visible: true
    })
  }, [])

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />
      
      <mesh ref={vesselRef} geometry={tube} material={vesselMaterial} />
      
      <DynamicWire points={points} />
      <WireTip points={points} />
      <StepVisuals points={points} />
      <OrbitControls enablePan={false} />
    </>
  )
}

function DynamicWire({ points }: { points: THREE.Vector3[] }) {
  const progress = useWorkflow(s => s.metrics.progress)
  const wire = useMemo(() => 
    clipByProgress(points, progress).map(p => p.toArray()), 
    [points, progress]
  )
  
  return (
    <Line points={wire as [number, number, number][]} lineWidth={4} color="#ffffff" />
  )
}

function WireTip({ points }: { points: THREE.Vector3[] }) {
  const progress = useWorkflow(s => s.metrics.progress)
  const step = useWorkflow(s => s.step)
  const tipPosition = useMemo(() => {
    const wirePoints = clipByProgress(points, progress)
    return wirePoints.length > 0 ? wirePoints[wirePoints.length - 1] : new THREE.Vector3()
  }, [points, progress])
  
  if (step !== 'Cross') return null
  return (
    <Sphere args={[0.12, 16, 16]} position={tipPosition}>
      <meshStandardMaterial 
        color="#ffffff" 
        emissive="#ffffff"
        emissiveIntensity={0.3}
        metalness={0.8}
        roughness={0.2}
      />
    </Sphere>
  )
}

// Step visuals moved to dedicated component
