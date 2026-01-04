// src/pages/WireDemoPage.tsx
import React, { useMemo, useState } from "react";
import WireDemo from "../features/WireDemo";

import type { VesselId } from "../../assets/vessels/centerlines";
import { getCenterlineForVessel } from "../../assets/vessels/centerlines";

const DEMO_VESSELS: { id: VesselId; label: string }[] = [
  { id: "cta_aorta", label: "CTA Aorta" },
  { id: "coronary_lad", label: "Coronary LAD" },
  { id: "renal_demo", label: "Renal Demo" },
  { id: "standard_bend", label: "Standard Bend (math)" },
];

export default function WireDemoPage() {
  // ✅ 强类型：不再是 string
  const [vesselId, setVesselId] = useState<VesselId>("cta_aorta");

  // （可选）给 WireDemo 传 centerline：这样下拉切换时更稳定、也方便你 debug
  const centerline = useMemo(() => getCenterlineForVessel(vesselId), [vesselId]);

  return (
    <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center">
      <h2 className="text-white text-lg mb-3">
        Week 5 · Guidewire Interaction Demo
      </h2>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-slate-200">Vessel:</span>
        <select
          value={vesselId}
          onChange={(e) => setVesselId(e.target.value as VesselId)}
          className="px-2 py-1 rounded bg-slate-800 text-slate-100 border border-slate-700"
        >
          {DEMO_VESSELS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-[900px] max-w-full">
        <WireDemo vesselId={vesselId} centerline={centerline} />
      </div>
    </div>
  );
}
