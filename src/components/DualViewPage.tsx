// src/components/DualViewPage.tsx

import React, { useEffect, useMemo, useRef } from "react";

import { getCenterlineForVessel, VesselId } from "../../assets/vessels/centerlines";
import { useVesselStore } from "../store/vesselStore";

import View3D from "../components/View3D";
import View2D from "../components/View2D";

import ParameterPanel from "./ParameterPanel";
import "../styles/dualview.css";

import { useParamsStore } from "../state/paramsStore";
import { useWorkflow } from "../state/workflow";

// ====== 小工具：中心线弧长累计 ======
type Vec3 = { x: number; y: number; z: number };

function accumulateArcLengths(points: Vec3[]) {
  const cum = new Array(points.length).fill(0);
  let s = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const dz = points[i].z - points[i - 1].z;
    s += Math.sqrt(dx * dx + dy * dy + dz * dz);
    cum[i] = s;
  }
  return cum;
}

function arcLenBetween(points: Vec3[], cum: number[], u0: number, u1: number) {
  if (points.length < 2) return 0;
  const n = points.length;
  const clamp = (v: number) => Math.max(0, Math.min(0.999999, v));
  const a = clamp(u0);
  const b = clamp(u1);
  if (Math.abs(a - b) < 1e-9) return 0;

  const t0 = a * (n - 1);
  const t1 = b * (n - 1);

  const sAt = (t: number) => {
    const i = Math.floor(t);
    const frac = t - i;
    const iA = Math.max(0, Math.min(n - 1, i));
    const iB = Math.max(0, Math.min(n - 1, i + 1));
    const sA = cum[iA];
    const sB = cum[iB];
    return sA + (sB - sA) * frac;
  };

  return Math.abs(sAt(t1) - sAt(t0));
}

type DualViewPageProps = {
  vesselId: VesselId;
  onVesselChange: (id: VesselId) => void;
};

const models = [
  { key: "cta_aorta", name: "CTA Aorta", url: "/assets/vessels/cta_aorta.glb" },
  { key: "coronary_lad", name: "Coronary LAD", url: "/assets/vessels/coronary_LAD.glb" },
  { key: "renal_demo", name: "Renal Demo", url: "/assets/vessels/renal_demo.glb" },
];

export default function DualViewPage({ vesselId, onVesselChange }: DualViewPageProps) {
  const setCatalog = useVesselStore((s) => s.setCatalog);
  const currentKey = useVesselStore((s) => s.currentKey);
  const setCurrent = useVesselStore((s) => s.setCurrent);

  // 读面板速度（cm/s）
  const advanceSpeedCms = useParamsStore((s) => s.params.guidewire.advanceSpeed ?? 2.0);

  // workflow 的状态（注意：推进循环里我们不用这些值做闭包，而用 getState 读最新）
  const controlMode = useWorkflow((s) => s.controlMode); // 'auto' | 'manual'
  const paused = useWorkflow((s) => s.paused);
  const progress = useWorkflow((s) => s.metrics.progress);

  // 把可选模型列表同步进全局 store
  useEffect(() => {
    setCatalog(models);
  }, [setCatalog]);

  // 如果上层给了 vesselId，而 store 里还没有 currentKey，就用上层的
  useEffect(() => {
    if (!currentKey && vesselId) {
      setCurrent(vesselId);
    }
  }, [currentKey, vesselId, setCurrent]);

  useEffect(() => {
    if (currentKey && currentKey !== vesselId) {
      onVesselChange(currentKey as VesselId);
    }
  }, [currentKey, vesselId, onVesselChange]);

  const effectiveId: VesselId = (currentKey as VesselId) || vesselId;
  const centerline = getCenterlineForVessel(effectiveId) as unknown as Vec3[];

  console.log("[DualView] centerline len =", centerline?.length, "for", effectiveId);

  // 预计算弧长
  const cum = useMemo(() => {
    if (!centerline || centerline.length < 2) return [0];
    return accumulateArcLengths(centerline);
  }, [centerline]);

  const totalLen = cum[cum.length - 1] || 1;

  // ✅ 切换血管时：重置进度（不然你切完还在100%）
  const lastVesselRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastVesselRef.current !== effectiveId) {
      lastVesselRef.current = effectiveId;

      // 只重置 progress/pathLength（不动其它指标）
      const wf = useWorkflow.getState();
      wf.setProgress(0);
      // pathLength 没有 setPathLength，就用 reset() 也行，但会重置很多东西
      // 如果你想只清 pathLength，可以在 workflow 里加一个 setPathLength(0)
      // 这里用“减回去”的方式不安全，所以不强行改。
      // 你要清 pathLength 的话，我给你下一步加一个 action。
    }
  }, [effectiveId]);

  // ✅ rAF：只启动一次（中心线变化时重建），每帧从 getState() 读最新值
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!centerline || centerline.length < 2) return;

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;

      const wf = useWorkflow.getState();
      const ps = useParamsStore.getState();

      const isAuto = wf.controlMode === "auto";
      const isPaused = wf.paused;
      const curProgress = wf.metrics.progress;

      // ✅ 只有 auto 且没暂停 且还没到头 才推进
      if (isAuto && !isPaused && curProgress < 1) {
        const speedCms = ps.params.guidewire.advanceSpeed ?? 2.0; // 最新速度
        const speedWorldPerSec = speedCms * 10; // cm/s -> mm/s（如果你的世界单位不是mm也没关系，反正一致）
        const du = (speedWorldPerSec / totalLen) * dt;

        const next = Math.max(0, Math.min(1, curProgress + du));

        const dL = arcLenBetween(centerline, cum, curProgress, next);
        wf.setProgress(next);
        wf.addPath(dL);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [centerline, cum, totalLen]);

  return (
    <div className="dv-root">
      <div className="dv-toolbar">
  <label>Vessel Model:</label>
  <select
    value={currentKey || ""}
    onChange={(e) => setCurrent(e.target.value as VesselId)}
  >
    {models.map((m) => (
      <option key={m.key} value={m.key}>
        {m.name}
      </option>
    ))}
  </select>

  {/* ✅ Progress 控制按钮 */}
  <button
    onClick={() => useWorkflow.getState().setControlMode("auto")}
    className="dv-btn"
    title="Start auto progress"
  >
    ▶ Start
  </button>

  <button
    onClick={() => useWorkflow.getState().setControlMode("manual")}
    className="dv-btn"
    title="Stop (manual)"
  >
    ⏹ Stop
  </button>

  <button
    onClick={() => useWorkflow.getState().setProgress(0)}
    className="dv-btn"
    title="Reset progress"
  >
    ↺ Reset
  </button>

  {/* 你原来的状态显示 */}
  <span style={{ marginLeft: 12, opacity: 0.8 }}>
    mode: {controlMode} · paused: {String(paused)} · speed: {advanceSpeedCms.toFixed(2)} cm/s · progress: {(progress * 100).toFixed(1)}%
  </span>
</div>


      <div className="dv-main-grid">
        <div className="dv-pane">
          <View3D centerline={centerline as any} />
        </div>

        <div className="dv-pane">
          <View2D centerline={centerline as any} />
        </div>

        <div className="dv-params">
          <ParameterPanel />
          {/* 你现在要控制“什么时候跑”：去 ParameterPanel 加一个按钮切 controlMode auto/manual 最合适 */}
        </div>
      </div>
    </div>
  );
}
