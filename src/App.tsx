import React, { useMemo, useState } from "react";
import DualViewPage from "./components/DualViewPage";
import type { Vec3 } from "./types/geom";
import ParameterPanel from "./components/ParameterPanel";
import { getCenterlineForVessel, VesselId } from "../assets/vessels/centerlines";
import { STANDARD_MODEL } from "./constants/models";
import WireDemo from "./features/WireDemo";
import { useParamsStore } from "./state/paramsStore";

const TEST_LINE: Vec3[] = Array.from({ length: 80 }, (_, i) => ({
  x: 0,
  y: 0,
  z: i * 1.5,
}));

type Mode = "dual" | "wire";

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>("dual");
  const [vesselId, setVesselId] = useState<VesselId>("cta_aorta");

  const safeLine = useMemo(() => {
    const line = getCenterlineForVessel(vesselId);
    console.log("[WireDemo] centerline len =", line?.length, "for", vesselId);
    return line && line.length >= 3 ? line : TEST_LINE;
  }, [vesselId]);

  return (
    <div
      className="w-full h-screen bg-slate-900 text-slate-50"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* 顶部切换按钮 + 模型信息 */}
      <header
        className="bg-slate-950 border-b border-slate-800"
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
        }}
      >
        <span className="text-sm text-slate-400">View:</span>

        <button
          onClick={() => setMode("dual")}
          className={
            "px-3 py-1 rounded text-sm " +
            (mode === "dual"
              ? "bg-sky-600 text-white"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700")
          }
        >
          Dual View (Model selection)
        </button>

        <button
          onClick={() => setMode("wire")}
          className={
            "px-3 py-1 rounded text-sm " +
            (mode === "wire"
              ? "bg-emerald-600 text-white"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700")
          }
        >
          Guidewire Demo
        </button>

        <div className="ml-4 text-xs text-slate-400">
          Current Blood Vessel:{" "}
          <span className="font-semibold">{vesselId}</span>
        </div>

        <div className="ml-auto text-xs text-slate-400">
          Model: <span className="font-semibold">{STANDARD_MODEL.name}</span>
          <span className="ml-2">Curv {STANDARD_MODEL.curvature}°</span>
          <span className="ml-2">Stenosis {STANDARD_MODEL.stenosis}%</span>
          <span className="ml-2">Ca {STANDARD_MODEL.calcification}%</span>
        </div>
      </header>

      {/* 主内容区域 */}
      <main
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {mode === "dual" ? (
          <DualViewPage
            vesselId={vesselId}
            onVesselChange={(id) => setVesselId(id as VesselId)}
          />
        ) : (
          // ✅ 强制左右布局：inline style 兜底，不怕 CSS 覆盖
          <div
            className="p-3"
            style={{
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "row",
              gap: 12,
              overflow: "hidden",
            }}
          >
            {/* 左：Wire demo */}
            <div
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                borderRadius: 16,
                border: "4px solid rgba(255,255,255,0.18)",
              }}
              className="bg-slate-950/40"
            >
              
              <WireDemo
  key={vesselId}
  vesselId={vesselId}
  centerline={safeLine}
  onProgress={(u) => {
  
    useParamsStore.getState().setSimProgress(u);
  }}
  onStateChange={(s) => {

    if (s === "success" || s === "fail") {
      useParamsStore.getState().setSimRunning(false);
    }
  }}
/>

            </div>

            {/* ParameterPanel */}
            <aside
              style={{
                width: 360,
                minWidth: 360,
                maxWidth: 360,
                height: "100%",
                minHeight: 0,
                overflow: "auto",
                borderRadius: 16,
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <ParameterPanel />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
