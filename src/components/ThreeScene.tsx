import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useWorkflow } from '../state/workflow'
import { makeCenterline, clipByProgress, accumulateArcLengths, arcLenBetween } from '../sim/geometry'

export function ThreeScene(){
  const points = useMemo(()=> makeCenterline(200), [])
  return (
    <Canvas camera={{ position:[3,2,5], fov:50 }}>
      <SceneContents points={points} />
    </Canvas>
  )
}

function SceneContents({ points }: { points: THREE.Vector3[] }) {
  const { step, addPath, setProgress } = useWorkflow()
  
  const cum = useMemo(()=> accumulateArcLengths(points), [points])

  // 自动推进
  const progRef = useRef(0)
  useFrame((_, dt) => {
    const speed = step === 'Cross' ? 0.15 : 0.05
    const nextP = Math.min(1, progRef.current + dt * speed * 0.1)
    const dL = arcLenBetween(points, cum, progRef.current, nextP)
    setProgress(nextP)
    addPath(dL)
    progRef.current = nextP
  })

  const tube = useMemo(()=>{
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, 300, 0.12, 16, false)
  }, [points])

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3,5,2]} intensity={1.2} />
      <mesh geometry={tube}>
        <meshStandardMaterial color={'#7dd3fc'} metalness={0.1} roughness={0.6} transparent opacity={0.35}/>
      </mesh>
      <DynamicWire points={points}/>
      <OrbitControls enablePan={false} />
    </>
  )
}

function DynamicWire({ points }: { points: THREE.Vector3[] }) {
  const progress = useWorkflow(s=>s.metrics.progress)
  const wire = useMemo(()=> clipByProgress(points, progress).map(p=>p.toArray()), [points, progress])
  return (
    <Line points={wire as any} lineWidth={2} color={'#ffffff'} />
  )
}
