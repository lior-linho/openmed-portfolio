import React, { useState } from "react";
import WireDemo from "../features/WireDemo";

// 这个页面自己用的 demo 血管列表（和 DualView 里的一致）
// 主要是三根“标准血管”
const DEMO_VESSELS = [
  { id: "std_curved", label: "Standard Curved (vessel_curved)" },
  { id: "std_straight", label: "Standard Straight (vessel_straight)" },
  { id: "std_bifurcation", label: "Standard Bifurcation (vessel_bifurcation)" },
];

export default function WireDemoPage() {
  // 默认用标准弯血管
  const [vesselId, setVesselId] = useState("std_curved");

  return (
    <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center">
      <h2 className="text-white text-lg mb-3">
        Week 5 · Guidewire Interaction Demo（标准血管 + 导丝）
      </h2>

      {/* 顶部血管选择，下拉改动会传给 WireDemo */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-slate-200">Vessel:</span>
        <select
          value={vesselId}
          onChange={(e) => setVesselId(e.target.value)}
          className="px-2 py-1 rounded bg-slate-800 text-slate-100 border border-slate-700"
        >
          {DEMO_VESSELS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* 这里的 WireDemo 会根据 vesselId 加载对应的中心线 + 血管 GLB */}
      <div className="w-[900px] max-w-full">
        <WireDemo vesselId={vesselId} />
      </div>
    </div>
  );
}
