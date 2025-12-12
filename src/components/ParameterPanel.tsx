// src/components/ParameterPanel.tsx
import React from "react";
import { useParamsStore } from "../state/paramsStore";
import { paramsToExperiment } from "../sim/interfaceAdapter";
import type { ExperimentMeta } from "../sim/experimentSchema";

// ⭐ 新增：引入当前使用的模型（Standard Calcified Bend v1）
import { STANDARD_MODEL } from "../constants/models";

/* ---------- 类型定义 ---------- */

interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface SliderProps {
  label: string;
  value: number;
  displayValue?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

/* ---------- 复用组件 ---------- */

const Card: React.FC<CardProps> = ({ title, subtitle, children }) => (
  <div
    className="
      bg-white/90 
      backdrop-blur-xl 
      p-5 
      rounded-2xl 
      shadow-xl 
      border border-white/40 
      space-y-4
    "
  >
    <div className="flex justify-between items-center">
      <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
      {subtitle && <span className="text-sm text-gray-400">{subtitle}</span>}
    </div>
    {children}
  </div>
);

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
}) => (
  <div className="mb-2">
    <label className="text-sm text-white/80">
      {label} — {displayValue ?? value}
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      className="w-full accent-blue-400 mt-1"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

/* ---------- 主面板组件 ---------- */

const ParameterPanel: React.FC = () => {
  const params = useParamsStore((s) => s.params);
  const setParam = useParamsStore((s) => s.setParam);

  /** 小工具：从当前 params 构造一个标准 ExperimentRecord */
  const buildExperimentRecord = () => {
    const now = new Date();
    const meta: ExperimentMeta = {
      id: `exp_${now.toISOString()}`,
      timestamp: now.toISOString(),
      // ⭐ 这里把当前使用的“使用者模型”写进记录里
      vesselModelKey: STANDARD_MODEL.id,
    };
    return paramsToExperiment(meta, params);
  };

  /* ===== 导出 JSON (基于 ExperimentRecord) ===== */
  const handleExportJson = () => {
    const rec = buildExperimentRecord();
    const json = JSON.stringify(rec, null, 2);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openmed_experiment_record.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ===== 导出 CSV (基于 ExperimentRecord) ===== */
  const handleExportCsv = () => {
    const rec = buildExperimentRecord();
    const p = rec;

    // [category, key, label, value, unit]
    const rows: (string | number)[][] = [
      ["category", "key", "label", "value", "unit"],

      // meta
      ["Meta", "meta.id", "Experiment ID", p.meta.id, ""],
      ["Meta", "meta.timestamp", "Timestamp", p.meta.timestamp, ""],
      ["Meta", "meta.vesselModelKey", "Vessel Model Key", p.meta.vesselModelKey ?? "", ""],

      // Vessel
      ["Vessel", "vessel.innerDiameterMm", "Inner Diameter", p.vessel.innerDiameterMm, "mm"],
      ["Vessel", "vessel.elasticityMPa", "Elasticity E", p.vessel.elasticityMPa, "MPa"],

      // Blood
      ["Blood", "blood.flowVelocityCms", "Flow Velocity", p.blood.flowVelocityCms, "cm/s"],
      ["Blood", "blood.viscosityCp", "Viscosity μ", p.blood.viscosityCp, "cP"],
      ["Blood", "blood.pulsatility", "Pulsatility", p.blood.pulsatility, "-"],

      // Device
      ["Device", "guidewire.diameterInch", "Guidewire Diameter", p.guidewire.diameterInch, "inch"],
      ["Device", "guidewire.lengthCm", "Guidewire Length", p.guidewire.lengthCm, "cm"],
      ["Device", "guidewire.stiffness", "Guidewire Stiffness", p.guidewire.stiffness, "-"],
      ["Device", "friction.catheterCoeff", "Catheter Friction Coeff.", p.friction.catheterCoeff, "-"],
      ["Device", "friction.stentCoeff", "Stent Friction Coeff.", p.friction.stentCoeff, "-"],

      // Metrics
      ["Metrics", "metrics.forceN", "Force", p.metrics.forceN, "N"],
      ["Metrics", "metrics.pathPoints", "Path Points", p.metrics.pathPoints, "-"],
      ["Metrics", "metrics.iterations", "Iterations", p.metrics.iterations, "-"],
      ["Metrics", "metrics.attempts", "Attempts", p.metrics.attempts, "-"],
      ["Metrics", "metrics.patency01", "Patency", p.metrics.patency01, "0-1"],
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openmed_experiment_record.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ===== 一键生成 & 复制 引用文本 (基于 ExperimentRecord) ===== */
  const handleCopyCitation = async () => {
    const rec = buildExperimentRecord();
    const p = rec;
    const date = p.meta.timestamp.slice(0, 10);

    const citationText =
      `OpenMed cardiovascular intervention sandbox (GitLab: openmed1/openmed-research), ` +
      `simulation parameters on ${date}: ` +
      `vessel inner diameter ${p.vessel.innerDiameterMm.toFixed(2)} mm, ` +
      `wall elasticity E ${p.vessel.elasticityMPa.toFixed(2)} MPa; ` +
      `blood flow velocity ${p.blood.flowVelocityCms.toFixed(0)} cm/s, ` +
      `viscosity μ ${p.blood.viscosityCp.toFixed(2)} cP, ` +
      `pulsatility ${p.blood.pulsatility.toFixed(2)}; ` +
      `guidewire diameter ${p.guidewire.diameterInch.toFixed(3)} inch, ` +
      `length ${p.guidewire.lengthCm.toFixed(0)} cm, stiffness ${p.guidewire.stiffness.toFixed(
        0
      )}; ` +
      `catheter friction coefficient ${p.friction.catheterCoeff.toFixed(3)}, ` +
      `stent friction coefficient ${p.friction.stentCoeff.toFixed(3)}. ` +
      `Resulting display values: force ${p.metrics.forceN.toFixed(
        2
      )} N, path points ${p.metrics.pathPoints}, ` +
      `iterations ${p.metrics.iterations}, attempts ${p.metrics.attempts}, ` +
      `patency ${(p.metrics.patency01 * 100).toFixed(1)}%.`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(citationText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = citationText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      alert("引用文本已复制到剪贴板，可以直接粘贴到论文/实验记录中。");
    } catch (err) {
      console.error("Failed to copy citation text", err);
      alert("复制失败，可以打开控制台手动复制日志中的引用文本。");
      console.log(citationText);
    }
  };

  /* ===== Reset / Apply（占位） ===== */
  const handleReset = () => {
    useParamsStore.setState({
      params: {
        vessel: { innerDiameter: 3.0, elasticity: 2.2 },
        blood: { flowVelocity: 20, viscosity: 3.5, pulsatility: 0.6 },
        guidewire: { diameter: 0.02, length: 260, stiffness: 60 },
        friction: { catheter: 0.12, stent: 0.045 },
        display: {
          force: 0,
          pathPoints: 0,
          iterations: 0,
          attempts: 0,
          patency: 1.0,
        },
      },
    });
  };

  const handleApply = () => {
    console.log("Apply parameters (raw params):", params);
    const rec = buildExperimentRecord();
    console.log("Apply ExperimentRecord:", rec);
    // 将来在这里触发 Three.js / 仿真回调，可以直接把 rec 发送给后端 / 模型
  };

  return (
    <div className="w-full h-full overflow-y-auto space-y-6">
      {/* 顶部标题 + 当前模型信息 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text白 drop-shadow">
            Parameter Panel
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            Current Model: {STANDARD_MODEL.name} · Curv {STANDARD_MODEL.curvature}° ·
            Stenosis {STANDARD_MODEL.stenosis}% · Ca {STANDARD_MODEL.calcification}%
          </p>
        </div>
        <span className="text-sm text-blue-200">Simulation / Ready</span>
      </div>

      <div className="space-y-6">
        {/* ===== Vessel ===== */}
        <Card title="Vessel" subtitle="Inner Diameter · Elasticity">
          <Slider
            label="Inner Diameter (mm)"
            value={params.vessel.innerDiameter}
            displayValue={params.vessel.innerDiameter.toFixed(2)}
            min={1.5}
            max={5.5}
            step={0.1}
            onChange={(v) => setParam("vessel.innerDiameter", v)}
          />
          <Slider
            label="Elasticity (MPa)"
            value={params.vessel.elasticity}
            displayValue={params.vessel.elasticity.toFixed(2)}
            min={1.5}
            max={3.8}
            step={0.1}
            onChange={(v) => setParam("vessel.elasticity", v)}
          />
        </Card>

        {/* ===== Blood ===== */}
        <Card title="Blood" subtitle="Flow Velocity · Viscosity · Pulsatility">
          <Slider
            label="Flow Velocity (cm/s)"
            value={params.blood.flowVelocity}
            min={10}
            max={40}
            step={1}
            onChange={(v) => setParam("blood.flowVelocity", v)}
          />
          <Slider
            label="Viscosity μ (cP)"
            value={params.blood.viscosity}
            displayValue={params.blood.viscosity.toFixed(2)}
            min={3}
            max={4}
            step={0.01}
            onChange={(v) => setParam("blood.viscosity", v)}
          />
          <Slider
            label="Pulsatility"
            value={params.blood.pulsatility}
            displayValue={params.blood.pulsatility.toFixed(2)}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setParam("blood.pulsatility", v)}
          />
        </Card>

        {/* ===== Guidewire / Catheter / Stent ===== */}
        <Card title="Guidewire / Catheter / Stent" subtitle="">
          <Slider
            label="Guidewire Diameter (inch)"
            value={params.guidewire.diameter}
            displayValue={params.guidewire.diameter.toFixed(3)}
            min={0.014}
            max={0.038}
            step={0.001}
            onChange={(v) => setParam("guidewire.diameter", v)}
          />
          <Slider
            label="Guidewire Length (cm)"
            value={params.guidewire.length}
            min={80}
            max={450}
            step={1}
            onChange={(v) => setParam("guidewire.length", v)}
          />
          <Slider
            label="Catheter Friction"
            value={params.friction.catheter}
            displayValue={params.friction.catheter.toFixed(3)}
            min={0.05}
            max={0.25}
            step={0.005}
            onChange={(v) => setParam("friction.catheter", v)}
          />
          <Slider
            label="Stent Friction"
            value={params.friction.stent}
            displayValue={params.friction.stent.toFixed(3)}
            min={0.03}
            max={0.06}
            step={0.001}
            onChange={(v) => setParam("friction.stent", v)}
          />
          <Slider
            label="Guidewire Stiffness"
            value={params.guidewire.stiffness}
            min={10}
            max={100}
            step={1}
            onChange={(v) => setParam("guidewire.stiffness", v)}
          />
        </Card>

        {/* ===== Display Panel ===== */}
        <Card title="Display Parameters" subtitle="Live Values">
          <p className="text-gray-700">
            Force (N): {params.display.force.toFixed(2)}
          </p>
          <p className="text-gray-700">
            Path Points: {params.display.pathPoints}
          </p>
          <p className="text-gray-700">
            Iterations: {params.display.iterations}
          </p>
          <p className="text-gray-700">
            Attempts: {params.display.attempts}
          </p>
          <p className="text-gray-700">
            Patency: {(params.display.patency * 100).toFixed(1)}%
          </p>
        </Card>

        {/* ===== Buttons ===== */}
        <div className="space-y-3 pt-2">
          {/* 第一行：JSON & CSV 导出 */}
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="
                flex-1 py-2.5 
                bg-gradient-to-r from-blue-500 to-blue-700 
                hover:from-blue-400 hover:to-blue-600
                text-white font-semibold 
                rounded-xl shadow-lg
                transition-all duration-200
              "
            >
              Export JSON
            </button>

            <button
              onClick={handleExportCsv}
              className="
                flex-1 py-2.5 
                bg-gradient-to-r from-cyan-500 to-sky-600 
                hover:from-cyan-400 hover:to-sky-500
                text-white font-semibold 
                rounded-xl shadow-lg
                transition-all duration-200
              "
            >
              Export CSV
            </button>
          </div>

          {/* 第二行：复制引用文本 */}
          <button
            onClick={handleCopyCitation}
            className="
              w-full py-2.5 
              bg-white/10 
              text-white 
              rounded-xl
              border border-white/50
              hover:bg-white/20 
              transition-all duration-200
            "
          >
            Copy Citation Text
          </button>

          {/* Reset / Apply */}
          <button
            onClick={handleReset}
            className="
              w-full py-2.5 
              border border白/60 
              text-white 
              rounded-xl
              hover:bg-white/10 
              transition-all duration-200
            "
          >
            Reset
          </button>

          <button
            onClick={handleApply}
            className="
              w-full py-2.5 
              border border-white/60 
              text-white 
              rounded-xl
              hover:bg-white/10 
              transition-all duration-200
            "
          >
            Apply (Callback)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParameterPanel;
