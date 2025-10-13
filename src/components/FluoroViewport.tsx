import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useWorkflow } from '../state/workflow'
import { XRTarget } from './XRTarget'
import { SceneContents } from './UnifiedScene'
import { CameraController } from './CameraController'
import { GesturePad } from './GesturePad'
import { StepHints } from './StepHints'
import { makeCenterline, makeXrayCamera, accumulateArcLengths } from '../sim/geometry'
import { DOSE_RATE_LABELS } from '../constants/dose'
import { COMMON_STYLES } from '../constants/styles'

export function FluoroViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const contrastCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const contrastStartTimeRef = useRef<number | null>(null)
  
  const { collimation: col, metrics, fluoroMode, angles, zoom } = useWorkflow()
  const complication = useWorkflow(s=>s.complication)
  const points = useMemo(() => makeCenterline(200), [])
  const cum = useMemo(() => accumulateArcLengths(points), [points])
  
  // Create camera configuration based on angles and zoom
  const cameraConfig = useMemo(() => {
    const aspect = dimensions.width / dimensions.height
    const camera = makeXrayCamera(angles, aspect)
    camera.fov = 45 / zoom
    camera.updateProjectionMatrix()
    
    // Add debug information
    console.log('FluoroViewport camera config:', {
      angles,
      zoom,
      position: [camera.position.x, camera.position.y, camera.position.z],
      fov: camera.fov
    })
    
    return {
      position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
      fov: camera.fov
    }
  }, [angles, zoom, dimensions.width, dimensions.height])

  // Size monitoring
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      setDimensions(prev => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev))
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    return () => ro.disconnect()
  }, [])

  // Initialize contrast Canvas
  useEffect(() => {
    if (!contrastCanvasRef.current) {
      contrastCanvasRef.current = document.createElement('canvas')
    }
    contrastCanvasRef.current.width = dimensions.width
    contrastCanvasRef.current.height = dimensions.height
  }, [dimensions])

  // Noise effect - remove dependencies, pass required values through parameters
  const addNoise = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, doseIndex: number) => {
    const noiseLevel = Math.max(0, 0.15 - doseIndex * 0.02)
    if (noiseLevel <= 0) return
    
    const pixelCount = Math.floor(width * height * noiseLevel * 0.01)
    for (let i = 0; i < pixelCount; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const alpha = Math.random() * 0.4 * noiseLevel
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.fillRect(x, y, 1, 1)
    }
  }, []) // Remove dependencies, pass required values through parameters

  // Handle Canvas ready
  const handleCanvasReady = useCallback((c: HTMLCanvasElement) => {
    sourceCanvasRef.current = c
  }, [])

  // Contrast agent effect - simulate real contrast agent flow and decay
  const renderContrastEffect = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!contrastStartTimeRef.current) return

    const now = performance.now()
    const elapsed = (now - contrastStartTimeRef.current) / 1000 // seconds
    
    // Contrast agent decay model: enhance for first 0.5s, then gradually decay
    let contrastIntensity = 0
    if (elapsed < 0.5) {
      // Contrast agent reaches vessel, gradually intensifying
      contrastIntensity = Math.min(1, elapsed / 0.5)
    } else if (elapsed < 3.0) {
      // Contrast agent flows in vessel, maintaining intensity
      contrastIntensity = 1.0
    } else if (elapsed < 5.0) {
      // Contrast agent begins to decay
      contrastIntensity = Math.max(0, 1 - (elapsed - 3.0) / 2.0)
    } else {
      // Contrast agent completely disappears
      contrastIntensity = 0
      contrastStartTimeRef.current = null
    }

    if (contrastIntensity > 0) {
      // Draw contrast agent effect directly instead of overlaying images
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = contrastIntensity * 0.3 // Further reduce transparency
      
      // Draw contrast agent effect - use simple white highlight
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      
      ctx.restore()
    }
  }, []) // Remove dependencies, pass required values through parameters

  // Monitor contrast shots
  useEffect(() => {
    let isMounted = true;
    let lastShootTick = 0;

    const handleContrastShot = () => {
      // Set contrast agent start time directly, no need to copy images
      contrastStartTimeRef.current = performance.now()
    }

    const checkContrastShot = () => {
      if (!isMounted) return;
      
      try {
        const currentState = useWorkflow.getState();
        const currentShootTick = currentState.shootTick;
        const currentMode = currentState.fluoroMode;
        
        // Check if contrast effect needs to be triggered
        if (currentShootTick !== lastShootTick) {
          lastShootTick = currentShootTick;
          handleContrastShot();
        }
        
        // Special handling for Cine mode
        if (currentMode === 'cine' && !contrastStartTimeRef.current) {
          handleContrastShot();
        }
      } catch (error) {
        console.error('Error in contrast shot check:', error);
      }
    };

    const interval = setInterval(checkContrastShot, 50);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dimensions])

  // Render loop - use ref to store frequently changing values, reduce dependencies
  const doseIndexRef = useRef(0)
  const fluoroModeRef = useRef<'idle' | 'fluoro' | 'cine'>('idle')
  
  // Update ref values
  useEffect(() => {
    doseIndexRef.current = metrics.doseIndex
  }, [metrics.doseIndex])
  
  useEffect(() => {
    fluoroModeRef.current = fluoroMode
  }, [fluoroMode])

  useEffect(() => {
    let id = 0
    const tick = () => {
      const el = canvasRef.current
      if (!el) return
      const ctx = el.getContext('2d')!
      const w = el.width = dimensions.width
      const h = el.height = dimensions.height

      // Clear canvas - default black screen
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      // Draw base 3D scene (based on display mode)
      const src = sourceCanvasRef.current
      if (src) {
        // Get latest state from ref instead of relying on old values in closure
        const currentFluoroMode = fluoroModeRef.current
        
        // Adjust rendering based on fluoroscopy display mode
        if (currentFluoroMode === 'idle') {
          // Idle mode: very low dose, almost black, only show very faint instrument shadows
          ctx.globalAlpha = 0.15
          ctx.drawImage(src, 0, 0, w, h)
          ctx.globalAlpha = 1.0
        } else if (currentFluoroMode === 'fluoro') {
          // Fluoroscopy mode: normal dose, show instrument movement, but not vessels
          ctx.globalAlpha = 0.9
          ctx.drawImage(src, 0, 0, w, h)
          ctx.globalAlpha = 1.0
        } else if (currentFluoroMode === 'cine') {
          // Cine mode: high dose, show instruments and vessels, and contrast effects
          ctx.drawImage(src, 0, 0, w, h)
        }
        
        // Show contrast effects in all modes (if any)
        if (contrastStartTimeRef.current) {
          renderContrastEffect(ctx, w, h)
        }
        
        // Add noise - use latest values from ref
        addNoise(ctx, w, h, doseIndexRef.current)
      } else {
        // Initialization placeholder
        ctx.fillStyle = '#222'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#555'
        ctx.font = '14px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('Initializing...', w / 2, h / 2)
      }

      // Collimation effect — REMOVE heavy black bars (already scissored in XRTarget)
      // const L = col.left * w, T = col.top * h, R = col.right * w, B = col.bottom * h
      // ctx.fillStyle = '#000'
      // ctx.globalAlpha = 0.85
      // ctx.fillRect(0, 0, w, T)
      // ctx.fillRect(0, B, w, h-B)
      // ctx.fillRect(0, T, L, B-T)
      // ctx.fillRect(R, T, w-R, B-T)
      // ctx.globalAlpha = 1.0

      // Draw only a light ROI frame for orientation
      const L = col.left * w, T = col.top * h, R = col.right * w, B = col.bottom * h
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1
      ctx.strokeRect(L, T, R-L, B-T)

      // Complication visuals (simple PoC)
      if (complication) {
        if (complication.type === 'no-reflow') {
          ctx.fillStyle = 'rgba(0,0,0,0.25)'
          ctx.fillRect(0,0,w,h)
        }
        if (complication.type === 'perforation' || complication.type === 'rupture') {
          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          ctx.fillStyle = 'rgba(255,255,255,0.08)'
          for (let i=0;i<600;i++) {
            const x = (Math.random()*0.4+0.3)*w
            const y = (Math.random()*0.4+0.3)*h
            ctx.fillRect(x, y, 1, 1)
          }
          ctx.restore()
        }
        if (complication.type === 'dissection') {
          ctx.strokeStyle = 'rgba(255,200,0,0.35)'
          for (let y=0;y<h;y+=6) {
            ctx.beginPath()
            ctx.moveTo(0,y+Math.sin(y*0.05)*3)
            ctx.lineTo(w,y)
            ctx.stroke()
          }
        }
      }
      
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [dimensions, col]) // Remove frequently changing dependencies

  return (
    <div ref={containerRef} className="canvas-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Hidden 3D Canvas */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: dimensions.width, height: dimensions.height, overflow: 'hidden', visibility: 'hidden' }}>
        <Canvas
          dpr={[1, 1.5]} // cap devicePixelRatio for iPad
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={cameraConfig}
        >
          <CameraController />
          <SceneContents points={points} />
          <XRTarget onCanvasReady={handleCanvasReady} />
        </Canvas>
      </div>
      
      {/* 2D Display Canvas */}
      <canvas 
        ref={canvasRef} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%', 
          height: '100%', 
          borderRadius: 0,
          display: 'block',
          border: 'none',
          outline: 'none',
          background: '#0a0a0a',
          zIndex: 2
        }} 
      />
      
      {/* Enhanced status indicator */}
      <div style={{
        ...COMMON_STYLES.statusIndicator,
        color: fluoroMode === 'fluoro' ? '#00ff00' : fluoroMode === 'cine' ? '#ffaa00' : '#ffffff'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {fluoroMode === 'fluoro' ? 'Fluoroscopy Mode' : fluoroMode === 'cine' ? 'Cine Mode' : 'Idle Mode'}
        </div>
        <div style={{ fontSize: '0.7em', opacity: 0.8 }}>
          Dose Rate: {fluoroMode === 'fluoro' ? DOSE_RATE_LABELS.FLUORO : fluoroMode === 'cine' ? DOSE_RATE_LABELS.CINE : DOSE_RATE_LABELS.IDLE} μGy/s
        </div>
        <div style={{ fontSize: '0.7em', opacity: 0.8 }}>
          Cumulative Dose: {metrics.doseIndex.toFixed(2)} μGy
        </div>
        <div style={{ fontSize: '0.7em', opacity: 0.8 }}>
          Contrast Shots: {metrics.contrastCount}
        </div>
      </div>
      
      {/* GesturePad for interactive control */}
      <GesturePad points={points} cum={cum} />

      {/* Step-specific hints */}
      <StepHints />
    </div>
  )
}
