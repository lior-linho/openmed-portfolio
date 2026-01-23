import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'

// ---------- Zustand ----------
type Store = {
  angle: number
  speed: number          
  running: boolean       
  color: string          
  tick: () => void
  setSpeed: (v: number) => void
  setColor: (c: string) => void
  toggleRunning: () => void
  reset: () => void
}

const useStore = create<Store>((set, get) => ({
  angle: 0,
  speed: 1,
  running: true,
  color: '#f59e0b', 
  tick: () => {
    const { running, speed } = get()
    if (running) set((s) => ({ angle: s.angle + 0.01 * speed }))
  },
  setSpeed: (v) => set({ speed: v }),
  setColor: (c) => set({ color: c }),
  toggleRunning: () => set((s) => ({ running: !s.running })),
  reset: () => set({ angle: 0, speed: 1, running: true, color: '#f59e0b' }),
}))

// ---------- 3D ----------
function RotatingBox() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const angle = useStore((s) => s.angle)
  const color = useStore((s) => s.color)

  useFrame(() => {
    useStore.getState().tick()
    if (meshRef.current) {
      meshRef.current.rotation.x = angle
      meshRef.current.rotation.y = angle
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// ---------- UI ----------
function Panel() {
  const { speed, running, color, setSpeed, setColor, toggleRunning, reset } = useStore()
  const box: React.CSSProperties = {
    position: 'absolute', top: 16, right: 16,
    background: 'rgba(0,0,0,.55)', color: '#fff',
    padding: 12, borderRadius: 12, width: 260, backdropFilter: 'blur(4px)'
  }
  const label: React.CSSProperties = { display: 'block', marginTop: 8, marginBottom: 4 }

  return (
    <div style={box}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Controls</div>

      <label style={label}>Speed: {speed.toFixed(2)}x</label>
      <input type="range" min={0} max={3} step={0.05}
        value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} />

      <label style={label}>Color</label>
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={toggleRunning} style={{ flex: 1, padding: 8, borderRadius: 8 }}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <button onClick={reset} style={{ flex: 1, padding: 8, borderRadius: 8 }}>
          Reset
        </button>
      </div>
    </div>
  )
}

// ---------- page ----------
export default function PrototypePage() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <Canvas camera={{ position: [2.2, 2.2, 2.2], fov: 60 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} />
        <RotatingBox />
        <OrbitControls />
      </Canvas>
      <Panel />
    </div>
  )
}

