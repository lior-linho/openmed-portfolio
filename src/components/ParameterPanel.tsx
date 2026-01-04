import React from "react";
import { useParamsStore } from "../state/paramsStore";
import { paramsToExperiment } from "../sim/interfaceAdapter";
import type { ExperimentMeta } from "../sim/experimentSchema";

/* ---------- UI Components ---------- */

interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

const Card: React.FC<CardProps> = ({ title, subtitle, children }) => (
  <div className="bg-white/90 p-5 rounded-2xl shadow-xl border border-white/40 space-y-4">
    <div>
      <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}) => (
  <div>
    <label className="text-sm text-gray-700">
      {label}:{" "}
      <span className="font-semibold">
        {Number.isFinite(value) ? value.toFixed(3) : "—"}
      </span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      className="w-full accent-blue-500 mt-1"
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

/* ---------- Main Component ---------- */

const ParameterPanel: React.FC = () => {
  const params = useParamsStore((s) => s.params);
  const setParam = useParamsStore((s) => s.setParam);

  /* ===== Build Experiment Record ===== */
  const buildExperimentRecord = () => {
    const now = new Date();
    const meta: ExperimentMeta = {
      id: `exp_${now.toISOString()}`,
      timestamp: now.toISOString(),
    };
    return paramsToExperiment(meta, params);
  };

  /* ===== Run Simulation ===== */
  const runSimulation = () => {
    const D = params.vessel.innerDiameter;
    const kappa = params.vessel.curvature;
    const S = params.guidewire.stiffness;
    const mu = params.friction.mu;
    const eta = params.blood.viscosity;

    const alpha = 0.5;
    const beta = 0.6;
    const gamma = 0.2;
    const delta = 0.1;

    const F_raw =
      1 / Math.max(D, 0.1) +
      alpha * kappa +
      beta * S * kappa +
      gamma * mu +
      delta * eta;

    const F_ref =
      1 / 1.5 +
      0.5 * 1 +
      0.6 * 100 * 1 +
      0.2 * 0.25 +
      0.1 * 4.0;

    const forceMean = Math.min(1, F_raw / F_ref);
    const completion = 1;

    const G =
      0.6 * Math.min(D / 5.5, 1) +
      0.4 * (1 - Math.min(Math.max(kappa, 0), 1));

    const R = 1 - forceMean;

    const patency = Math.max(0, Math.min(1, 0.5 * G + 0.3 * R + 0.2));

    useParamsStore.setState((state) => ({
      params: {
        ...state.params,
        display: {
          ...state.params.display,
          forceMean,
          completion,
          patency,
        },
      },
    }));
  };

  /* ===== Export JSON ===== */
  const handleExportJson = () => {
    const rec = buildExperimentRecord();
    const json = JSON.stringify(rec, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openmed_experiment_record.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ===== Export CSV ===== */
  const handleExportCsv = () => {
    const rec = buildExperimentRecord();
    const p = rec;

    const rows = [
      ["Parameter", "Value"],
      ["Inner Diameter D (mm)", p.vessel.innerDiameterMm],
      ["Curvature κ", p.vessel.curvature],
      ["Guidewire Stiffness S", p.guidewire.stiffness],
      ["Guidewire Advance Speed (cm/s)", p.guidewire.advanceSpeedCms],
      ["Friction μ", p.friction.mu],
      ["Viscosity η", p.blood.viscosityCp],
      ["Mean Force F_mean", p.metrics.forceMeanN],
      ["Patency", p.metrics.patency01],
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openmed_experiment_record.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ===== Copy Citation ===== */
  const handleCopyCitation = async () => {
    const rec = buildExperimentRecord();
    const p = rec;

    const text =
      `The guidewire advance speed was set to ${p.guidewire.advanceSpeedCms?.toFixed(2)} cm/s. ` +
      `The mean guidewire advancement force was computed as ` +
      `F_raw = 1/D + 0.5·κ + 0.6·S·κ + 0.2·μ + 0.1·η. ` +
      `Parameters: D=${p.vessel.innerDiameterMm.toFixed(2)} mm, ` +
      `κ=${p.vessel.curvature?.toFixed(2)}, ` +
      `S=${p.guidewire.stiffness}, ` +
      `μ=${p.friction.mu?.toFixed(3)}, ` +
      `η=${p.blood.viscosityCp.toFixed(2)}.`;

    await navigator.clipboard.writeText(text);
    alert("Citation text copied.");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">
        Physical Patency Simulation Panel
      </h2>

      <Card title="Vessel Geometry">
        <Slider
          label="Inner Diameter D (mm)"
          value={params.vessel.innerDiameter}
          min={1.5}
          max={5.5}
          step={0.1}
          onChange={(v) => setParam("vessel.innerDiameter", v)}
        />
        <Slider
          label="Curvature κ"
          value={params.vessel.curvature}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setParam("vessel.curvature", v)}
        />
      </Card>

      <Card title="Guidewire & Contact">
        <Slider
          label="Guidewire Stiffness S"
          value={params.guidewire.stiffness}
          min={10}
          max={100}
          step={1}
          onChange={(v) => setParam("guidewire.stiffness", v)}
        />

        {/* ✅ 新增：推进速度（唯一速度源） */}
        <Slider
          label="Guidewire Advance Speed (cm/s)"
          value={params.guidewire.advanceSpeed ?? 2.0}
          min={0.5}
          max={10}
          step={0.1}
          onChange={(v) => setParam("guidewire.advanceSpeed", v)}
        />

        <Slider
          label="Friction Coefficient μ"
          value={params.friction.mu}
          min={0.05}
          max={0.25}
          step={0.005}
          onChange={(v) => setParam("friction.mu", v)}
        />
      </Card>

      <Card title="Environment">
        <Slider
          label="Blood Viscosity η (cP)"
          value={params.blood.viscosity}
          min={3}
          max={4}
          step={0.01}
          onChange={(v) => setParam("blood.viscosity", v)}
        />
      </Card>

      <Card title="Results">
        <p>Mean Force F_mean (0–1): {params.display.forceMean.toFixed(3)}</p>
        <p>Patency: {(params.display.patency * 100).toFixed(1)}%</p>
      </Card>

      <button
        onClick={runSimulation}
        className="w-full py-3 bg-blue-600 text-white rounded-xl"
      >
        ▶ Run Simulation
      </button>

      <div className="flex gap-2">
        <button
          onClick={handleExportJson}
          className="flex-1 py-2 bg-blue-500 text-white rounded-xl"
        >
          Export JSON
        </button>
        <button
          onClick={handleExportCsv}
          className="flex-1 py-2 bg-cyan-500 text-white rounded-xl"
        >
          Export CSV
        </button>
      </div>

      <button
        onClick={handleCopyCitation}
        className="w-full py-2 border rounded-xl"
      >
        Copy Citation Text
      </button>
    </div>
  );
};

export default ParameterPanel;
