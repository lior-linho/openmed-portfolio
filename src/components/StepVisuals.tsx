import { useMemo } from 'react'
import * as THREE from 'three'
import { Sphere, Torus } from '@react-three/drei'
import { useWorkflow } from '../state/workflow'
import { clipByProgress } from '../sim/geometry'

export function StepVisuals({ points }: { points: THREE.Vector3[] }){
  const step = useWorkflow(s=>s.step)
  const m = useWorkflow(s=>s.metrics)
  const balloon = useWorkflow(s=>s.balloonInflation)
  const stentDeployed = useWorkflow(s=>s.stentDeployed)

  const tip = useMemo(()=>{
    const wire = clipByProgress(points, m.progress)
    return wire.length ? wire[wire.length-1] : new THREE.Vector3()
  }, [points, m.progress])

  return (
    <group position={tip}>
      {step === 'Cross' && (
        <Sphere args={[0.12, 16, 16]}>
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} metalness={0.6} roughness={0.3}/>
        </Sphere>
      )}

      {step === 'Pre-dilate' && (
        <Sphere args={[0.12 + 0.18*balloon, 20, 20]}>
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.45} metalness={0.1} roughness={0.6}/>
        </Sphere>
      )}

      {step === 'Deploy' && (
        <Torus args={[0.14, 0.02, 12, 32]} rotation={[Math.PI/2,0,0]}>
          <meshStandardMaterial color={stentDeployed?"#facc15":"#fde68a"} emissive={stentDeployed?"#facc15":"#000000"} emissiveIntensity={stentDeployed?0.3:0} metalness={0.7} roughness={0.2}/>
        </Torus>
      )}

      {step === 'Post-dilate' && (
        <Sphere args={[0.12 + 0.22*balloon, 20, 20]}>
          <meshStandardMaterial color="#34d399" transparent opacity={0.45} metalness={0.1} roughness={0.6}/>
        </Sphere>
      )}
    </group>
  )
}


