import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { useWorkflow } from '../state/workflow'
import { makeXrayCamera } from '../sim/geometry'

export function CameraController() {
  const { camera, size, invalidate } = useThree()
  const { angles, zoom } = useWorkflow()

  useLayoutEffect(() => {
    if (!camera || size.width === 0 || size.height === 0) return
    const aspect = size.width / size.height
    const temp = makeXrayCamera(angles, aspect)

    // Copy pose & optics onto the existing default camera
    camera.position.copy(temp.position)
    camera.quaternion.copy(temp.quaternion)
    // update optics
    // @ts-ignore: R3F camera is PerspectiveCamera
    camera.fov = 45 / zoom
    // @ts-ignore
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    invalidate()
  }, [camera, angles, zoom, size.width, size.height, invalidate])

  return null
}
