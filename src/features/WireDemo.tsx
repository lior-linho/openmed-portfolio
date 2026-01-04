// src/features/WireDemo.tsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useParamsStore } from "../state/paramsStore";

// ✅ 统一从 assets 里拿 VesselId + GLB URL 映射（避免你在这里维护一份）
import type { VesselId } from "../../assets/vessels/centerlines";
import { VESSEL_GLB_URLS } from "../../assets/vessels/centerlines";

// ✅ Vec3 统一放在 shared types（避免 assets 反向 import features）
import type { Vec3 } from "../types/geom";

// ===== Types & helpers =====
export enum RunState {
  Idle = "idle",
  Navigating = "navigating",
  Success = "success",
  Fail = "fail",
}

type WireDemoProps = {
  vesselId: VesselId;
  centerline?: Vec3[]; // 中心线（不传则用内置）
  radiusAt?: (points: Vec3[], u: number) => number; // 有效半径函数（不传则用内置）
  wireRadius?: number; // (保留接口，不强用)
  forwardSpeed?: number; // 推进速度（cm/s）：prop 优先，否则读面板
  paused?: boolean; // 暂停推进（默认 false）
  cameraPose?: {
    position: [number, number, number];
    lookAt: [number, number, number];
  }; // 相机位姿（可选）
  zoom?: number; // 相机缩放（可选）
  onProgress?: (u: number) => void; // 进度回调 [0,1]
  onStateChange?: (s: RunState) => void; // 状态回调
};

function vAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function vSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function vMul(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
function vLen(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}
function vLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return vAdd(a, vMul(vSub(b, a), t));
}

const USE_CATMULL = true;
function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t,
    t3 = t2 * t;
  return {
    x:
      0.5 *
      ((2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      ((2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    z:
      0.5 *
      ((2 * p1.z) +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

function getPointOnCenterline(points: Vec3[], u: number): Vec3 {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  if (!USE_CATMULL) {
    const segFloat = Math.max(0, Math.min(points.length - 1.0001, u * (points.length - 1)));
    const i = Math.floor(segFloat),
      t = segFloat - i;
    return vLerp(points[i], points[i + 1], t);
  }
  const n = points.length;
  const segFloat = Math.max(0, Math.min(n - 1.0001, u * (n - 1)));
  const i = Math.floor(segFloat),
    t = segFloat - i;
  const i0 = Math.max(0, i - 1),
    i1 = i,
    i2 = Math.min(n - 1, i + 1),
    i3 = Math.min(n - 1, i + 2);
  return catmullRom(points[i0], points[i1], points[i2], points[i3], t);
}

function samplePolyline(points: Vec3[], uEnd: number, samples = 80): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < samples; i++) {
    const u = (i / (samples - 1)) * Math.max(0.001, uEnd);
    out.push(getPointOnCenterline(points, u));
  }
  return out;
}

// ===== Built-in demo centerlines =====
const STRAIGHT: Vec3[] = Array.from({ length: 80 }, (_, i) => ({ x: 0, y: 0, z: i * 2 }));
const CURVED: Vec3[] = Array.from({ length: 160 }, (_, i) => {
  const z = i * 1.2;
  return { x: Math.sin(i * 0.08) * 6, y: Math.cos(i * 0.04) * 2, z };
});

// ===== Built-in simplified radius model =====
function estimateCurvature(points: Vec3[], u: number): number {
  const e = 0.002;
  const p0 = getPointOnCenterline(points, Math.max(0, u - e));
  const p1 = getPointOnCenterline(points, u);
  const p2 = getPointOnCenterline(points, Math.min(0.999, u + e));
  const v01 = vSub(p1, p0);
  const v12 = vSub(p2, p1);
  const a = vLen(v01),
    b = vLen(v12);
  if (a < 1e-5 || b < 1e-5) return 0;
  const dot = (v01.x * v12.x + v01.y * v12.y + v01.z * v12.z) / (a * b);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  return angle / e;
}

function radiusAtBase(): number {
  return 2.8;
}
function builtInRadiusAt(points: Vec3[], u: number): number {
  const base = radiusAtBase();
  const u0 = 0.55,
    width = 0.06,
    depth = 0.6;
  const stenosis = Math.exp(-((u - u0) * (u - u0)) / (2 * width * width));
  const radiusByStenosis = base * (1 - depth * stenosis);
  const kappa = estimateCurvature(points, u);
  const bendPenalty = Math.min(0.6, kappa * 0.15);
  return Math.max(0.6, radiusByStenosis * (1 - bendPenalty));
}

// ===== Component =====
const WireDemo: React.FC<WireDemoProps> = ({
  vesselId,
  centerline: centerlineProp,
  radiusAt: radiusAtProp,
  // wireRadius: wireRadiusProp = 0.55, // 保留接口但此 demo 内固定视觉半径，不用 prop，避免 unused
  forwardSpeed: forwardSpeedProp,
  paused = false,
  cameraPose,
  zoom,
  onProgress,
  onStateChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<RunState>(RunState.Idle);
  const [u, setU] = useState(0);
  const [twist, setTwist] = useState(0);

  // 细导丝 + 独立球头（保留你原来的视觉）
  const wireRadius = 0.15;
  const tipRadius = 0.45;

  // ✅ 面板速度（cm/s）：prop 优先，否则读面板
  const panelSpeedCmPerSec = useParamsStore((s) => s.params.guidewire.advanceSpeed ?? 2.0);
  const forwardSpeed = forwardSpeedProp ?? panelSpeedCmPerSec;

  const keys = useRef<Record<string, boolean>>({});
  const [collision, setCollision] = useState<{ hit: boolean; clearance: number }>({
    hit: false,
    clearance: 0,
  });
  const overpushRef = useRef(0);

  const centerline = centerlineProp && centerlineProp.length >= 3 ? centerlineProp : CURVED;
  const radiusAt = radiusAtProp ?? builtInRadiusAt;

  const threeRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    wire?: THREE.Mesh;
    wireTip?: THREE.Mesh;
    vesselTube?: THREE.Mesh;
    loadedGlb?: THREE.Object3D;
    line?: THREE.Line;
    controls?: OrbitControls;
  }>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const div = mountRef.current!;
    const width = div.clientWidth || 800;
    const height = div.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    div.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 3000);
    camera.position.set(0, 0, 200);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.panSpeed = 0.8;
    controls.minDistance = 40;
    controls.maxDistance = 260;
    controls.target.set(0, 0, 0);
    controls.update();

    if (cameraPose) {
      camera.position.set(...cameraPose.position);
      const la = new THREE.Vector3(...cameraPose.lookAt);
      camera.lookAt(la);
    }
    if (zoom) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }

    const light1 = new THREE.DirectionalLight(0xffffff, 1.0);
    light1.position.set(20, 30, -10);
    scene.add(light1);
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(amb);

    // 中心线可视化
    const lineGeom = new THREE.BufferGeometry();
    const linePositions = new Float32Array(centerline.length * 3);
    centerline.forEach((p, i) => {
      linePositions[i * 3 + 0] = p.x;
      linePositions[i * 3 + 1] = p.y;
      linePositions[i * 3 + 2] = p.z;
    });
    lineGeom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ linewidth: 2, color: 0x6ea8fe }));
    scene.add(line);

    // 血管壳（Tube）
    const vesselCurve = new THREE.CatmullRomCurve3(centerline.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
    const midRadius = radiusAt(centerline, 0.5);
    const vesselRadius = midRadius * 1.0;

    const vesselGeometry = new THREE.TubeGeometry(vesselCurve, 240, vesselRadius, 32, false);
    const vesselMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.1,
      roughness: 0.5,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const vesselTube = new THREE.Mesh(vesselGeometry, vesselMaterial);
    scene.add(vesselTube);

    // 预加载 GLB（如果有）
    const vesselUrl = VESSEL_GLB_URLS[vesselId];
    if (vesselUrl) {
      const loader = new GLTFLoader();
      loader.load(
        vesselUrl,
        (gltf) => {
          const loaded = gltf.scene;

          // ✅ 关键：给 obj 显式类型，解决 “implicitly has any”
          loaded.traverse((obj: THREE.Object3D) => {
            const mesh = obj as THREE.Mesh;
            if ((mesh as any).isMesh) {
              mesh.castShadow = false;
              mesh.receiveShadow = false;
            }
          });

          loaded.scale.set(1000, 1000, 1000);
          // 你当前策略：不加到 scene，保持不变
          // scene.add(loaded);

          threeRef.current.loadedGlb = loaded;
        },
        undefined,
        (err) => console.error("[WireDemo] failed to load vessel GLB", vesselUrl, err)
      );
    } else {
      console.log("[WireDemo] no GLB for vesselId =", vesselId, "(skip load)");
    }

    // 导丝本体
    const wireCurvePoints = samplePolyline(centerline, Math.max(0.001, u), 60);
    const wireCurve = new THREE.CatmullRomCurve3(wireCurvePoints.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
    const wireGeo = new THREE.TubeGeometry(wireCurve, 120, wireRadius, 12, false);
    const wire = new THREE.Mesh(
      wireGeo,
      new THREE.MeshStandardMaterial({ color: 0x39e09b, metalness: 0.05, roughness: 0.45 })
    );
    scene.add(wire);

    // 导丝球头
    const tipPos = getPointOnCenterline(centerline, Math.max(0.001, u));
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(tipRadius, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x4ef3b5, metalness: 0.1, roughness: 0.35 })
    );
    tip.position.set(tipPos.x, tipPos.y, tipPos.z);
    scene.add(tip);

    // ✅ 注意：这里不要把 loadedGlb 覆盖掉
    threeRef.current = {
      renderer,
      scene,
      camera,
      wire,
      wireTip: tip,
      vesselTube,
      loadedGlb: threeRef.current.loadedGlb,
      line,
      controls,
    };

    const onResize = () => {
      const w = div.clientWidth || window.innerWidth;
      const h = div.clientHeight || 500;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (div.contains(renderer.domElement)) div.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerline, cameraPose?.position?.join(","), cameraPose?.lookAt?.join(","), zoom]);

  useEffect(() => {
    const { renderer, scene, camera, controls } = threeRef.current;
    if (!renderer || !scene || !camera) return;

    let lastTs: number | null = null;
    const SPEED_TO_U_PER_SEC = 0.12;

    let animId = 0;
    const step = (ts: number) => {
      if (lastTs == null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      let dir = 0;
      if (!paused) {
        if (keys.current["w"] || keys.current["arrowup"]) dir += 1;
        if (keys.current["s"] || keys.current["arrowdown"]) dir -= 1;
        if (keys.current["q"]) setTwist((t) => t - 0.03);
        if (keys.current["e"]) setTwist((t) => t + 0.03);
      }

      const effRadius = radiusAt(centerline, u);
      const clearance = effRadius - wireRadius;

      if (dir > 0 && clearance <= 0) {
        setCollision({ hit: true, clearance });
        overpushRef.current += 1;
      } else {
        setCollision({ hit: false, clearance });
        overpushRef.current = Math.max(0, overpushRef.current - 0.5);

        if (dir !== 0) {
          const uDelta = dir * forwardSpeed * SPEED_TO_U_PER_SEC * dt;
          setU((prev) => Math.max(0, Math.min(0.999, prev + uDelta)));
          if (state === RunState.Idle) setState(RunState.Navigating);
        }
      }

      if (overpushRef.current > 60 && state !== RunState.Success) setState(RunState.Fail);
      if (u > 0.995 && state === RunState.Navigating) setState(RunState.Success);

      const { wire, wireTip } = threeRef.current;
      if (wire && wireTip) {
        const pts = samplePolyline(centerline, Math.max(0.001, u), 80);
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
        const newGeo = new THREE.TubeGeometry(curve, 160, wireRadius, 14, false);
        wire.geometry.dispose();
        wire.geometry = newGeo;

        const tipP = pts[pts.length - 1];
        wireTip.position.set(tipP.x, tipP.y, tipP.z);
        wireTip.rotation.z = twist;
      }

      controls?.update();
      renderer.render(scene, camera);
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [centerline, u, twist, state, paused, forwardSpeed, wireRadius, radiusAt]);

  useEffect(() => onProgress?.(u), [u, onProgress]);
  useEffect(() => onStateChange?.(state), [state, onStateChange]);

  const [selectedLine, setSelectedLine] = useState<"straight" | "curved">("curved");
  useEffect(() => {
    if (!centerlineProp) setSelectedLine("curved");
  }, [centerlineProp]);

  const resetAll = () => {
    setState(RunState.Idle);
    setU(0);
    setTwist(0);
    setCollision({ hit: false, clearance: 0 });
    overpushRef.current = 0;
  };

  return (
    <div className="w-full h-[600px] relative rounded-2xl shadow-lg overflow-hidden bg-slate-900">
      <div className="absolute top-3 left-3 z-20 flex gap-2 items-center">
        <select
          className="px-2 py-1 rounded bg-slate-800 text-slate-100 border border-slate-700"
          value={selectedLine}
          onChange={(e) => {
            const val = e.target.value as "straight" | "curved";
            setSelectedLine(val);
            if (val === "straight") (window as any).__demo_centerline__ = STRAIGHT;
            else (window as any).__demo_centerline__ = CURVED;
            resetAll();
          }}
        >
          <option value="curved">Curved centerline</option>
          <option value="straight">Straight centerline</option>
        </select>

        <button onClick={resetAll} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white">
          Reset
        </button>

        <div className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-sm border border-slate-700">
          State: <span className="font-semibold text-slate-100">{state}</span>
        </div>
      </div>

      {collision.hit && (
        <div className="absolute top-3 right-3 z-20 px-3 py-2 rounded bg-rose-600 text-white shadow">
          Contact – advance blocked (clearance {collision.clearance.toFixed(2)})
        </div>
      )}

      {state === RunState.Success && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded bg-emerald-600 text-white shadow text-lg font-semibold">
          Success ✓
        </div>
      )}
      {state === RunState.Fail && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded bg-rose-600 text-white shadow text-lg font-semibold">
          Failed ✗
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-20 text-slate-300 text-xs bg-slate-800/60 rounded px-2 py-1">
        Controls: W/S or ↑/↓ advance/withdraw · Q/E twist · Reset to restart
      </div>

      <div ref={mountRef} className="absolute inset-0" />
    </div>
  );
};

export default WireDemo;
