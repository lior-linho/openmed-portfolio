import React, { useState } from "react";
import DualViewPage from "./components/DualViewPage";
import WireDemo, { Vec3 } from "./features/WireDemo";
import {
  getCenterlineForVessel,
  VesselId,
} from "../assets/vessels/centerlines";

// 引入标准模型
import { STANDARD_MODEL } from "./constants/models";

const TEST_LINE: Vec3[] = Array.from({ length: 80 }, (_, i) => ({
  x: 0,
  y: 0,
  z: i * 1.5,
}));

type Mode = "dual" | "wire";

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>("dual");
  const [vesselId, setVesselId] = useState<VesselId>("cta_aorta");

  return (
    <div className="w-full h-screen bg-slate-900 text-slate-50 flex flex-col">
      {/* 顶部切换按钮 + 模型信息 */}
      <header className="flex items-center gap-3 px-4 py-2 bg-slate-950 border-b border-slate-800">
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

        {/* 使用者模型信息栏 */}
        <div className="ml-auto text-xs text-slate-400">
          Model:{" "}
          <span className="font-semibold">{STANDARD_MODEL.name}</span>
          <span className="ml-2">
            Curv {STANDARD_MODEL.curvature}°
          </span>
          <span className="ml-2">
            Stenosis {STANDARD_MODEL.stenosis}%
          </span>
          <span className="ml-2">
            Ca {STANDARD_MODEL.calcification}%
          </span>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden">
        {mode === "dual" ? (
          <DualViewPage
            vesselId={vesselId}
            onVesselChange={(id) => setVesselId(id as VesselId)}
          />
        ) : (
          (() => {
            const wireVesselId: VesselId = "standard_bend";
            const line = getCenterlineForVessel(vesselId);
            console.log(
              "[WireDemo] centerline len =",
              line?.length,
              "for",
              vesselId
            );

            const safeLine = line && line.length >= 3 ? line : TEST_LINE;

            return (
              <WireDemo
                key={vesselId}
                vesselId={vesselId}
                centerline={safeLine}
              />
            );
          })()
        )}
      </main>
    </div>
  );
};

export default App;
