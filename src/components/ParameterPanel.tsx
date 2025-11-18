import React from "react";
import { useParamsStore } from "../state/paramsStore";

/* ---------- 类型定义 ---------- */

interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface SliderProps {
  label: string;
  value: number;              // 实际用于 <input> 的数值
  displayValue?: string;      // 显示在 label 上的字符串（可选）
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
      {subtitle && (
        <span className="text-sm text-gray-400">{subtitle}</span>
      )}
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

  return (
    <div className="w-full h-full overflow-y-auto space-y-6">
      {/* 顶部标题 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white drop-shadow">
          Parameter Panel
        </h2>
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
        <Card title="Guidewire / Catheter / Stent" >
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

          <button
            className="
              w-full py-2.5 
              bg-gradient-to-r from-blue-500 to-blue-700 
              hover:from-blue-400 hover:to-blue-600
              text-white font-semibold 
              rounded-xl shadow-lg
              transition-all duration-200
            "
          >
            Export Current Parameters JSON
          </button>

          <button
            className="
              w-full py-2.5 
              border border-white/60 
              text-white 
              rounded-xl
              hover:bg-white/10 
              transition-all duration-200
            "
          >
            Reset
          </button>

          <button
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

