// ===========================================
// ThreeScene.tsx (Final parameter-linked version)
// ===========================================

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";

// workflow 状态
import { useWorkflow } from "../state/workflow";

// 参数 store（关键：让内径控制血管半径）
import { useParamsStore } from "../state/paramsStore";

// 几何函数
import {
  makeCenterline,
  clipByProgress,
  accumulateArcLengths,
  arcLenBetween,
} from "../sim/geometry";


// ==============================
// 外层封装 Canvas
// ==============================
export function ThreeScene() {
  const points = useMemo(() => makeCenterline(200), []);

  return (
    <Canvas camera={{ position: [3, 2, 5], fov: 50 }}>
      <SceneContents points={points} />
    </Canvas>
  );
}


// ==============================
// 主要 3D 内容（几何联动在这里实现）
// ==============================
function SceneContents({ points }: { points: THREE.Vector3[] }) {
  const { step, addPath, setProgress } = useWorkflow();

  // ========== 读取参数（关键） ==========
  const vesselParams = useParamsStore((s) => s.params.vessel);

  const cum = useMemo(() => accumulateArcLengths(points), [points]);
  const progRef = useRef(0);

  // ======================================================
  // 🚀 TubeGeometry：根据参数面板实时改变血管半径
  // ======================================================
  const tube = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points);

    // innerDiameter mm → Three.js radius
    const radius = vesselParams.innerDiameter * 0.05;

    console.log(
      "%c[ThreeScene] Vessel innerDiameter:",
      "color: #4ade80; font-weight: bold;",
      vesselParams.innerDiameter,
      "mm → radius:",
      radius
    );

    return new THREE.TubeGeometry(curve, 300, radius, 16, false);
  }, [points, vesselParams.innerDiameter]);



  // ==============================
  useFrame((_, dt) => {

  const speedCmPerSec = useParamsStore.getState().params.guidewire.advanceSpeed;


  const MM_TO_WORLD = 0.05;
  const CM_TO_MM = 10;

  // cm/s -> world/s
  const speedWorldPerSec = speedCmPerSec * CM_TO_MM * MM_TO_WORLD;


  const totalLenWorld = cum[cum.length - 1] ?? 1;


  const dProgress = (speedWorldPerSec * dt) / totalLenWorld;

  const next = Math.min(1, progRef.current + dProgress);


  const dLWorld = arcLenBetween(points, cum, progRef.current, next);
  const dLMm = dLWorld / MM_TO_WORLD;

  setProgress(next);
  addPath(dLMm);

  progRef.current = next;
});




  // ==============================
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />

      <mesh geometry={tube}>
        <meshStandardMaterial
          color={"#7dd3fc"}
          metalness={0.1}
          roughness={0.6}
          transparent
          opacity={0.35}
        />
      </mesh>

 
      <DynamicWire points={points} />

      <OrbitControls enablePan={false} />
    </>
  );
}



// ==============================
function DynamicWire({ points }: { points: THREE.Vector3[] }) {
  const progress = useWorkflow((s) => s.metrics.progress);

  const wire = useMemo(() => {
    return clipByProgress(points, progress).map((p) => p.toArray());
  }, [points, progress]);

  return <Line points={wire as any} lineWidth={2} color={"#ffffff"} />;
}
