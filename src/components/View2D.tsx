import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createScene } from "../three/createScene";
import { loadVessel } from "../three/loadVessel";
import { useVesselStore } from "../store/vesselStore";

type View2DProps = {
  centerline: { x: number; y: number; z: number }[];
};

export default function View2D({ centerline }: View2DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentKey = useVesselStore(s => s.currentKey);
  const catalog   = useVesselStore(s => s.catalog);
  const loadedMap = useVesselStore(s => s.loadedMap);
  const setLoaded = useVesselStore(s => s.setLoaded);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { scene, camera, renderer, dispose } = createScene(canvasRef.current, {
      initialCamPos: [-1.8, 1.2, 1.8],
    });

    camera.lookAt(0, 0, 0);

    const matOverride = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });

    let vessel: THREE.Group | null = null;
    let stop = false;

    async function ensureModel() {
      if (!currentKey) return;
      const item = catalog.find(i => i.key === currentKey);
      if (!item) return;

      let proto = loadedMap[currentKey] ?? null;
      if (!proto) {
        proto = await loadVessel(item.url);
        setLoaded(currentKey, proto);
      }
      vessel = proto.clone(true);
      vessel.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          mesh.material = matOverride;
        }
      });
      scene.add(vessel);
    }

    function animate() {
      if (stop) return;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    (async () => {
      await ensureModel();
      animate();
    })();

    return () => {
      stop = true;
      if (vessel) scene.remove(vessel);
      dispose();
    };
  }, [canvasRef, currentKey]);

  return <canvas className="dv-canvas" ref={canvasRef} />;
}
