// src/pages/WireDemoPage.tsx
import React, { useMemo, useState } from "react";
import WireDemo from "../features/WireDemo";

import type { VesselId } from "../../assets/vessels/centerlines";
import { getCenterlineForVessel } from "../../assets/vessels/centerlines";

import "../styles/dualview.css"; 

const DEMO_VESSELS: { id: VesselId; label: string }[] = [
  { id: "cta_aorta", label: "CTA Aorta" },
  { id: "coronary_lad", label: "Coronary LAD" },
  { id: "renal_demo", label: "Renal Demo" },
  { id: "standard_bend", label: "Standard Bend (math)" },
];

export default function WireDemoPage() {
  const [vesselId, setVesselId] = useState<VesselId>("cta_aorta");

  const centerline = useMemo(() => getCenterlineForVessel(vesselId), [vesselId]);

  return (
    <div className="dv-root">
      {/* ===== Unified Toolbar ===== */}
      <div className="dv-toolbar">
        <div className="dv-toolbar-left">
          <div className="dv-field">
            <span className="dv-label">Mode</span>
            <span className="dv-chip">Guidewire Demo</span>
          </div>

          <div className="dv-field">
            <span className="dv-label">Vessel</span>
            <select
              value={vesselId}
              onChange={(e) => setVesselId(e.target.value as VesselId)}
              className="dv-select"
            >
              {DEMO_VESSELS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dv-toolbar-right">
          <span className="dv-metric">Manual interaction</span>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="dv-main-grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="dv-pane dv-glass">
          <WireDemo vesselId={vesselId} centerline={centerline} />
        </div>
      </div>
    </div>
  );
}
