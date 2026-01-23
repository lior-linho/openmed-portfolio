import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createScene } from "../three/createScene";
import { loadVessel } from "../three/loadVessel";

import { useVesselStore } from "../store/vesselStore";
import { useParamsStore } from "../state/paramsStore";

type View3DProps = {
  centerline: { x: number; y: number; z: number }[];
};

export default function View3D({ centerline }: View3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentKey = useVesselStore((s) => s.currentKey);
  const catalog = useVesselStore((s) => s.catalog);
  const loadedMap = useVesselStore((s) => s.loadedMap);
  const setLoaded = useVesselStore((s) => s.setLoaded);

  const vesselParams = useParamsStore((s) => s.params.vessel);

  const vesselRef = useRef<THREE.Group | null>(null);


  const originalGeometries = useRef<WeakMap<THREE.Mesh, Float32Array>>(new WeakMap());


  // -------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current) return;

    const { scene, camera, renderer, dispose } = createScene(canvasRef.current, {
      initialCamPos: [1.2, 1.0, 1.2],
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    let vessel: THREE.Group | null = null;
    vesselRef.current = null;

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
      vesselRef.current = vessel;
      scene.add(vessel);


      vessel.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          const arr = obj.geometry.attributes.position.array as Float32Array;
          originalGeometries.current.set(obj, new Float32Array(arr)); // deep copy
        }
      });
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
  }, [canvasRef, currentKey, catalog, loadedMap, setLoaded]);


  // -------------------------------------------------------
  useEffect(() => {
    const vessel = vesselRef.current;
    if (!vessel) return;

    const baseDiameter = 3.0;
    const k = vesselParams.innerDiameter / baseDiameter;


    const box = new THREE.Box3().setFromObject(vessel);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    let axis = new THREE.Vector3();
    if (size.x >= size.y && size.x >= size.z) axis.set(1, 0, 0);
    else if (size.y >= size.x && size.y >= size.z) axis.set(0, 1, 0);
    else axis.set(0, 0, 1);


    vessel.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;

      const original = originalGeometries.current.get(obj);
      if (!original) return;

      const geo = obj.geometry;
      const pos = geo.attributes.position;
      const count = pos.count;

      const v = new THREE.Vector3();
      const proj = new THREE.Vector3();
      const origV = new THREE.Vector3();

      for (let i = 0; i < count; i++) {

        origV.set(
          original[i * 3 + 0],
          original[i * 3 + 1],
          original[i * 3 + 2]
        );


        const toV = origV.clone().sub(center);
        const d = toV.dot(axis);
        proj.copy(axis).multiplyScalar(d).add(center);


        const radial = origV.clone().sub(proj);


        const newV = proj.add(radial.multiplyScalar(k));

        pos.setXYZ(i, newV.x, newV.y, newV.z);
      }

      pos.needsUpdate = true;
      obj.geometry.computeVertexNormals();
    });

  }, [vesselParams.innerDiameter]);

  return <canvas className="dv-canvas" ref={canvasRef} />;
}
