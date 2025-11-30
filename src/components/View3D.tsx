import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createScene } from "../three/createScene";
import { loadVessel } from "../three/loadVessel";
import { useVesselStore } from "../store/vesselStore";

type View3DProps = {
  centerline: { x: number; y: number; z: number }[];
};

export default function View3D({ centerline }: View3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentKey = useVesselStore(s => s.currentKey);
  const catalog   = useVesselStore(s => s.catalog);
  const loadedMap = useVesselStore(s => s.loadedMap);
  const setLoaded = useVesselStore(s => s.setLoaded);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { scene, camera, renderer, dispose } = createScene(canvasRef.current, {
      initialCamPos: [1.2, 1.0, 1.2],
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

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
      scene.add(vessel);

      if (centerline && centerline.length >= 2) {
        const points = centerline.map(
          (p) => new THREE.Vector3(p.x, p.y, p.z)
        );
        const geom = new THREE.BufferGeometry().setFromPoints(points);

        const mat = new THREE.LineBasicMaterial({
          color: 0x6ea8fe,
          linewidth: 2,
        });

        const line = new THREE.Line(geom, mat);
        line.name = "centerline";

        scene.add(line);
      }
    }

    function animate() {
      if (stop) return;
      controls.update();
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
      controls.dispose();
      dispose();
    };
  }, [canvasRef, currentKey, centerline]);

  return <canvas className="dv-canvas" ref={canvasRef} />;
}
