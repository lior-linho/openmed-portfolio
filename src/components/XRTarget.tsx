// src/components/XRTarget.tsx
import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useCallback } from 'react'
import { useWorkflow } from '../state/workflow'
import { makeXrayCamera } from '../sim/geometry'
import { EffectComposer as EffectComposerComponent } from './EffectComposer'
import * as THREE from 'three'


interface XRCanvasProps {
  onCanvasReady: (c: HTMLCanvasElement) => void
}

export function XRTarget({ onCanvasReady }: XRCanvasProps) {
  const { gl, scene, size } = useThree()
  const { angles, zoom, collimation } = useWorkflow()
  const camRef = useRef<THREE.PerspectiveCamera>()
  const composerRef = useRef<any>(null)


  useEffect(() => { 
    onCanvasReady(gl.domElement) 
  }, [gl, onCanvasReady])


  useEffect(() => {
    const cam = makeXrayCamera(angles, size.width/size.height)
    cam.fov = 45 / zoom
    cam.updateProjectionMatrix()
    camRef.current = cam
  }, [angles, zoom, size])


  const handleComposerReady = useCallback((composer: any) => {
    composerRef.current = composer
  }, [])


  const renderFrame = useCallback(() => {
    if (!composerRef.current) return
    

    const { left, top, right, bottom } = collimation
    const x = Math.floor(left * size.width)
    const y = Math.floor(top * size.height)
    const w = Math.floor((right-left) * size.width)
    const h = Math.floor((bottom-top)* size.height)
    
    gl.setScissorTest(true)
    gl.setScissor(x,y,w,h)
    gl.setViewport(x,y,w,h)
    composerRef.current.render()
    gl.setScissorTest(false)
    gl.setViewport(0,0,size.width,size.height)
  }, [gl, size, collimation])


  useEffect(() => {
    let raf = 0
    const loop = () => {
      renderFrame()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [renderFrame])

  return (
    <EffectComposerComponent onComposerReady={handleComposerReady} />
  )
}
