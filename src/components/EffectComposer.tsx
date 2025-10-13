import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import { EffectComposer as PostEffectComposer, RenderPass, EffectPass, NoiseEffect, VignetteEffect, BloomEffect } from 'postprocessing'
import { useWorkflow } from '../state/workflow'

export function EffectComposer({ onComposerReady }: { onComposerReady: (c: PostEffectComposer) => void }) {
  const { gl, scene, camera, size } = useThree()
  const { fluoroMode, metrics } = useWorkflow()
  const composerRef = useRef<PostEffectComposer | null>(null)
  const noiseRef = useRef<NoiseEffect | null>(null)
  const vignetteRef = useRef<VignetteEffect | null>(null)
  const bloomRef = useRef<BloomEffect | null>(null)

  const effects = useMemo(() => {
    const noise = new NoiseEffect({ premultiply: true })
    const vignette = new VignetteEffect({ darkness: 0.4, offset: 0.5 })
    const bloom = new BloomEffect({ intensity: 0.15, luminanceThreshold: 0.8, luminanceSmoothing: 0.3 })
    noiseRef.current = noise
    vignetteRef.current = vignette
    bloomRef.current = bloom
    return [noise, vignette, bloom]
  }, [])

  useEffect(() => {
    const composer = new PostEffectComposer(gl)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(camera, ...effects))
    composer.setSize(size.width, size.height)
    composerRef.current = composer
    onComposerReady(composer)
    return () => {
      composerRef.current?.dispose()
      composerRef.current = null
      effects.forEach((e: any) => e?.dispose?.())
    }
  }, [gl, scene, camera, effects, onComposerReady])

  // Keep composer size in sync with canvas size
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height)
  }, [size.width, size.height])

  useFrame(() => {
    const composer = composerRef.current
    if (!composer) return

    const doseIndex = metrics.doseIndex
    const baseNoise = 0.35
    const noiseIntensity = Math.max(0.05, baseNoise - doseIndex * 0.02)
    if (noiseRef.current) {
      // postprocessing: control via blend opacity (0–1)
      // @ts-ignore
      noiseRef.current.blendMode.opacity.value = noiseIntensity
    }

    if (vignetteRef.current && bloomRef.current) {
      if (fluoroMode === 'idle') {
        bloomRef.current.intensity = 0.05
        vignetteRef.current.darkness = 0.8
      } else if (fluoroMode === 'fluoro') {
        bloomRef.current.intensity = 0.1
        vignetteRef.current.darkness = 0.5
      } else {
        bloomRef.current.intensity = 0.2
        vignetteRef.current.darkness = 0.3
      }
    }

    composer.render()
  })

  return null
}
