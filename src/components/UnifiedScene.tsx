// =============================
// UnifiedScene.tsx (Final Version)
// =============================

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useEffect, useCallback } from "react";


import { useWorkflow } from "../state/workflow";
import { useParamsStore } from "../state/paramsStore";


import {
  makeCenterline,
  clipByProgress,
  accumulateArcLengths,
  arcLenBetween,
  makeXrayCamera,
} from "../sim/geometry";


import { ResistanceSampler } from "../sim/ResistanceSampler";
import { performanceMonitor, measurePerformance } from "../utils/performance";


import { CameraController } from "./CameraController";
import { StepVisuals } from "./StepVisuals";


// ==========================================================
export function UnifiedScene() {
  const points = useMemo(() => makeCenterline(200), []);
  const { angles, zoom } = useWorkflow();


  const cameraConfig = useMemo(() => {
    const aspect = 1.0;
    const camera = makeXrayCamera(angles, aspect);

    camera.fov = 45 / zoom;
    camera.updateProjectionMatrix();

    return {
      position: [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ] as [number, number, number],
      fov: camera.fov,
    };
  }, [angles, zoom]);

  return (
    <Canvas camera={cameraConfig}>
      <CameraController />
      <SceneContents points={points} />
    </Canvas>
  );
}


// ==========================================================
export function SceneContents({ points }: { points: THREE.Vector3[] }) {

  const vesselParams = useParamsStore((s) => s.params.vessel);
  const bloodParams = useParamsStore((s) => s.params.blood);

  const { addPath, setProgress } = useWorkflow();
  const cum = useMemo(() => accumulateArcLengths(points), [points]);


  // ==========================================================
  const tube = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points);

    // mm → world scale 
    const radius = vesselParams.innerDiameter * 0.05;

    console.log(
      "%c[Vessel Update] innerDiameter(mm):",
      "color: #4ade80; font-weight: bold;",
      vesselParams.innerDiameter,
      " → radius:",
      radius
    );

    return new THREE.TubeGeometry(curve, 300, radius, 16, false);
  }, [points, vesselParams.innerDiameter]);


  // ==========================================================
  const vesselRef = useRef<THREE.Mesh>(null!);
  const samplerRef = useRef<ResistanceSampler>();
  const resistanceRef = useRef(0);

  useEffect(() => {
    const m = vesselRef.current;
    if (m && !samplerRef.current) {
      const geometry = m.geometry as THREE.BufferGeometry;
      if ((geometry as any).computeBoundsTree) geometry.computeBoundsTree();
      samplerRef.current = new ResistanceSampler(m);
    }
    return () => {
      const m = vesselRef.current;
      if (m) {
        const geometry = m.geometry as THREE.BufferGeometry;
        if ((geometry as any).disposeBoundsTree) geometry.disposeBoundsTree();
      }
    };
  }, []);

  const { currentWire, currentStent, step } = useWorkflow();
  useEffect(() => {
    if (samplerRef.current) {
      samplerRef.current.updateFromWirePreset(currentWire);
      samplerRef.current.updateFromStentPreset(currentStent, step);
    }
  }, [currentWire, currentStent, step]);


  // ==========================================================
  const updateResistance = useCallback(() => {
    const { metrics } = useWorkflow.getState();

    const idx = Math.max(
      1,
      Math.floor(metrics.progress * (points.length - 1))
    );

    const tip = points[idx];
    const prev = points[idx - 1] ?? tip;

    const dir = tip.clone().sub(prev).normalize();
    const prevDir = prev.clone().sub(points[idx - 2] ?? prev).normalize();

    const res =
      samplerRef.current?.sample(
        tip,
        dir,
        prevDir,
        points,
        idx,
        metrics.progress
      ) ?? { R: 0 };


    const viscosityFactor = bloodParams.viscosity / 3.5;

    resistanceRef.current = res.R * viscosityFactor;

    useWorkflow.setState((s) => ({
      metrics: { ...s.metrics, resistance: resistanceRef.current },
    }));
  }, [points, bloodParams.viscosity]);

  useEffect(() => {
    const timer = setInterval(updateResistance, 50);
    return () => clearInterval(timer);
  }, [updateResistance]);


  // ==========================================================
  const { metrics } = useWorkflow();
  const progRef = useRef(metrics.progress);

  useEffect(() => {
    progRef.current = metrics.progress;
  }, [metrics.progress]);

  useFrame((_, dt) => {
    const { controlMode, step } = useWorkflow.getState();
    if (controlMode !== "auto") return;

    // FlowVelocity 
    const velocityFactor = (bloodParams.flowVelocity - 10) / 20 + 0.5;

    const base = step === "Cross" ? 0.15 : 0.05;
    const next = progRef.current + dt * base * velocityFactor * (1 - resistanceRef.current);

    const clamped = Math.min(1, next);
    const dL = arcLenBetween(points, cum, progRef.current, clamped);

    setProgress(clamped);
    addPath(dL);
    progRef.current = clamped;
  });


  // ==========================================================
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />

      {/* TubeGeometry） */}
      <mesh ref={vesselRef} geometry={tube}>
        <meshStandardMaterial
          color="#7dd3fc"
          metalness={0.1}
          roughness={0.6}
          transparent
          opacity={0.45}
        />
      </mesh>

      <DynamicWire points={points} />
      <WireTip points={points} />
      <StepVisuals points={points} />

      <OrbitControls enablePan={false} />
    </>
  );
}

// ==========================================================
// Dynamic Wire
// ==========================================================
function DynamicWire({ points }: { points: THREE.Vector3[] }) {
  const progress = useWorkflow((s) => s.metrics.progress);

  const wire = useMemo(
    () => clipByProgress(points, progress).map((p) => p.toArray()),
    [points, progress]
  );

  return <Line points={wire as any} lineWidth={4} color="#ffffff" />;
}

// ==========================================================
// Wire Tip
// ==========================================================
function WireTip({ points }: { points: THREE.Vector3[] }) {
  const progress = useWorkflow((s) => s.metrics.progress);
  const step = useWorkflow((s) => s.step);

  const tipPos = useMemo(() => {
    const arr = clipByProgress(points, progress);
    return arr[arr.length - 1] ?? new THREE.Vector3();
  }, [points, progress]);

  if (step !== "Cross") return null;

  return (
    <Sphere args={[0.12, 16, 16]} position={tipPos}>
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.35}
        metalness={0.8}
        roughness={0.2}
      />
    </Sphere>
  );
}
