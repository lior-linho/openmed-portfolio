// src/components/DualViewPage.tsx

import {
  getCenterlineForVessel,
  VesselId,
} from "../../assets/vessels/centerlines";

import { useEffect } from "react";
import { useVesselStore } from "../store/vesselStore";
import View3D from "./View3D";
import View2D from "./View2D";
import "../styles/dualview.css";

type DualViewPageProps = {
  vesselId: VesselId;                    
  onVesselChange: (id: VesselId) => void; 
};

const models = [
  { key: "cta_aorta",    name: "CTA Aorta",    url: "/assets/vessels/cta_aorta.glb" },
  { key: "coronary_lad", name: "Coronary LAD", url: "/assets/vessels/coronary_LAD.glb" },
  { key: "renal_demo",   name: "Renal Demo",   url: "/assets/vessels/renal_demo.glb" },
];

export default function DualViewPage({ vesselId, onVesselChange }: DualViewPageProps) {
  const setCatalog = useVesselStore(s => s.setCatalog);
  const currentKey = useVesselStore(s => s.currentKey);
  const setCurrent = useVesselStore(s => s.setCurrent);

  
  useEffect(() => {
    setCatalog(models);
  }, [setCatalog]);

  
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

  
  const centerline = getCenterlineForVessel(effectiveId);
  console.log(
    "[DualView] centerline len =",
    centerline?.length,
    "for",
    effectiveId
  );

  return (
    <div className="dv-root">
      <div className="dv-toolbar">
        <label>Vessel Model：</label>
        <select
          value={currentKey || ""}
          onChange={(e) => setCurrent(e.target.value as VesselId)}
        >
          {models.map(m => (
            <option key={m.key} value={m.key}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="dv-split">
        <div className="dv-pane">
          <View3D centerline={centerline} />
        </div>
        <div className="dv-pane">
          <View2D centerline={centerline} />
        </div>
      </div>
    </div>
  );
}
