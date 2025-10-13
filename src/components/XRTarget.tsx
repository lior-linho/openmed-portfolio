// src/components/XRTarget.tsx
import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useCallback } from 'react'
import { useWorkflow } from '../state/workflow'
import { makeXrayCamera } from '../sim/geometry'
import { EffectComposer as EffectComposerComponent } from './EffectComposer'
import * as THREE from 'three'

// 类型定义
interface XRCanvasProps {
  onCanvasReady: (c: HTMLCanvasElement) => void
}

export function XRTarget({ onCanvasReady }: XRCanvasProps) {
  const { gl, scene, size } = useThree()
  const { angles, zoom, collimation } = useWorkflow()
  const camRef = useRef<THREE.PerspectiveCamera>()
  const composerRef = useRef<any>(null)

  // 把 r3f 的 canvas 作为"视频源"交给上层
  useEffect(() => { 
    onCanvasReady(gl.domElement) 
  }, [gl, onCanvasReady])

  // 相机设置 - 当角度或缩放改变时更新相机
  useEffect(() => {
    const cam = makeXrayCamera(angles, size.width/size.height)
    cam.fov = 45 / zoom
    cam.updateProjectionMatrix()
    camRef.current = cam
  }, [angles, zoom, size])

  // 处理EffectComposer准备就绪
  const handleComposerReady = useCallback((composer: any) => {
    composerRef.current = composer
  }, [])

  // 渲染函数 - 使用新的EffectComposer
  const renderFrame = useCallback(() => {
    if (!composerRef.current) return
    
    // Collimation：用 scissor 裁剪渲染区域
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

  // 渲染循环 - 使用 requestAnimationFrame
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
