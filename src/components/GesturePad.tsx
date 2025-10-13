import { useRef, useCallback } from 'react'
import { useWorkflow } from '../state/workflow'
import * as THREE from 'three'
import { arcLenBetween } from '../sim/geometry'

function clamp(v: number, lo: number, hi: number) { 
  return Math.max(lo, Math.min(hi, v)) 
}

type P = { x: number; y: number }

interface GesturePadProps {
  points: THREE.Vector3[];
  cum: number[];
}

export function GesturePad({ points, cum }: GesturePadProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const pointers = useRef<Map<number, P>>(new Map())
  const startPointers = useRef<Map<number, P>>(new Map())
  const primaryId = useRef<number | null>(null)
  const primaryStart = useRef<P | null>(null)
  const startAngles = useRef({ laoRaoDeg: 0, cranialCaudalDeg: 0 })
  const startProgress = useRef(0)
  const startZoom = useRef(1)
  const startBalloon = useRef(0)
  const pinchStartDist = useRef<number | null>(null)

  const setAngles = useWorkflow(s => s.setAngles)
  const setProgress = useWorkflow(s => s.setProgress)
  const setZoom = useWorkflow(s => s.setZoom)
  const setBalloon = useWorkflow(s => s.setBalloon)
  const addPath = useWorkflow(s => s.addPath)
  const startFluoro = useWorkflow(s => s.startFluoro)
  const stopFluoro = useWorkflow(s => s.stopFluoro)

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const p = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, p)
    startPointers.current.set(e.pointerId, p)
    if (primaryId.current === null) {
      primaryId.current = e.pointerId
      primaryStart.current = p
    }

    // record baselines at gesture start
    const s = useWorkflow.getState()
    startAngles.current = { ...s.angles }
    startProgress.current = s.metrics.progress
    startZoom.current = s.zoom
    startBalloon.current = s.balloonInflation

    if (pointers.current.size === 1 && e.button === 0) {
      // pedal style: press to start fluoroscopy
      startFluoro()
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values())
      const dx = a.x - b.x, dy = a.y - b.y
      pinchStartDist.current = Math.hypot(dx, dy)
    }
  }, [startFluoro])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const rect = elRef.current?.getBoundingClientRect()
    const h = rect?.height ?? 1

    // Desktop: right-button drag adjusts cranial/caudal
    if ((e.buttons & 2) === 2) {
      const start = primaryStart.current || { x: e.clientX, y: e.clientY }
      const dy = e.clientY - start.y
      const pitchDelta = -dy * 0.12 // deg per px
      const newPitch = clamp(startAngles.current.cranialCaudalDeg + pitchDelta, -60, 60)
      setAngles({ laoRaoDeg: startAngles.current.laoRaoDeg, cranialCaudalDeg: newPitch })
    } else if (pointers.current.size === 1 && primaryId.current !== null && e.pointerId === primaryId.current) {
      // single‑finger: progress (vertical) + LAO/RAO (horizontal)
      const start = primaryStart.current || { x: e.clientX, y: e.clientY }
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y

      const yawDelta = dx * 0.12 // deg per px
      const newYaw = clamp(startAngles.current.laoRaoDeg + yawDelta, -60, 60)
      setAngles({ laoRaoDeg: newYaw, cranialCaudalDeg: startAngles.current.cranialCaudalDeg })

      const sNow = useWorkflow.getState()
      if (sNow.step === 'Cross') {
        // Progress control with resistance scaling
        const progDeltaRaw = -dy / h * 0.01
        const resistance = sNow.metrics.resistance || 0
        const effectiveScale = 1 - 0.7 * resistance
        const progDelta = progDeltaRaw * Math.max(0.1, effectiveScale)
        const currentProgress = sNow.metrics.progress
        const newProg = clamp(currentProgress + progDelta, 0, 1)
        const dL = arcLenBetween(points, cum, currentProgress, newProg)
        setProgress(newProg)
        addPath(dL)
      } else if (sNow.step === 'Pre-dilate' || sNow.step === 'Post-dilate') {
        // Balloon inflation 0..1 (increase sensitivity)
        const infl = clamp(startBalloon.current + (-dy / h) * 1.6, 0, 1)
        setBalloon(infl)
      }
    }

    if (pointers.current.size >= 2) {
      // pinch for zoom
      const pts = Array.from(pointers.current.values())
      const [p0, p1] = pts
      const dist = Math.hypot(p0.x - p1.x, p0.y - p1.y)
      if (pinchStartDist.current) {
        const scale = clamp(dist / pinchStartDist.current, 0.5, 2.0)
        const z = clamp(startZoom.current * scale, 1.0, 3.0)
        setZoom(z)
      }
    }
  }, [setAngles, setProgress, setZoom, addPath, points, cum])

  const end = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    startPointers.current.delete(e.pointerId)
    if (primaryId.current === e.pointerId) {
      primaryId.current = null
      primaryStart.current = null
    }
    if (pointers.current.size === 0) {
      pinchStartDist.current = null
      stopFluoro()
    }
  }, [stopFluoro])

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    // Smooth zoom scaling for desktop
    const currentZoom = useWorkflow.getState().zoom
    const scale = Math.exp(-e.deltaY * 0.001)
    const newZoom = clamp(currentZoom * scale, 1.0, 3.0)
    setZoom(newZoom)
    e.preventDefault()
  }, [setZoom])

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={onWheel}
      style={{
        position: 'absolute', 
        inset: 0,
        // transparent capture layer
        background: 'transparent',
        touchAction: 'none', // allow pinch/drag
        zIndex: 4,
      }}
      aria-label="GesturePad"
    />
  )
}
