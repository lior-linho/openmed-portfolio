import React, { useEffect } from "react";
import { useVesselStore } from "../store/vesselStore";

import View3D from "../components/View3D";
import View2D from "../components/View2D";

import ParameterPanel from "./ParameterPanel";
import "../styles/dualview.css";

const models = [
  { key: "cta_aorta", name: "CTA Aorta", url: "/assets/vessels/cta_aorta.glb" },
  { key: "coronary_lad", name: "Coronary LAD", url: "/assets/vessels/coronary_LAD.glb" },
  { key: "renal_demo", name: "Renal Demo", url: "/assets/vessels/renal_demo.glb" },
];

export default function DualViewPage() {
  const setCatalog = useVesselStore((s) => s.setCatalog);
  const currentKey = useVesselStore((s) => s.currentKey);
  const setCurrent = useVesselStore((s) => s.setCurrent);

  useEffect(() => {
    setCatalog(models);
    if (!currentKey) setCurrent(models[0].key);
  }, []);

  return (
    <div className="dv-root">

      {/* Toolbar */}
      <div className="dv-toolbar">
        <label>Vessel Model:</label>
        <select
          value={currentKey || ""}
          onChange={(e) => setCurrent(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* 三栏布局：3D | 2D | ParameterPanel */}
      <div className="dv-main-grid">

        <div className="dv-pane">
          <View3D />
        </div>

        <div className="dv-pane">
          <View2D />
        </div>

        <div className="dv-params">
          <ParameterPanel />
        </div>
      </div>
    </div>
  );
}
