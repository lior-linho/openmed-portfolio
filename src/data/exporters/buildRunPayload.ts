export type RunModel = {
  id: string;
  name: string;
  description?: string;
  curvature?: number;
  calcification?: number;
  stenosis?: number;
};

export type DeviceInfo = {
  wire: any | null;
  stent: any | null;
};

export type BuildRunJsonArgs = {
  schema: string;
  version: string;
  runId: string;
  nowISO: string;
  model: RunModel;
  device: DeviceInfo;
  params: any;
  paramHash: string;
  experiment: any | null;
  inputHash: string;
  metrics: any;
};

export function buildRunJsonPayload(args: BuildRunJsonArgs) {
  const { model } = args;
  return {
    schema: args.schema,
    version: args.version,
    runId: args.runId,
    model,
    device: args.device,
    params: args.params,
    paramHash: args.paramHash,
    experiment: args.experiment,
    inputHash: args.inputHash,
    metrics: args.metrics,
    citation: {
      en: `Simulations were conducted using the OpenMedSandbox (v${args.version}, 2025) with ${model.name}.`,
      zh: `This study used OpenMedSandbox (v${args.version}, 2025) with ${model.name}.`,
    },
    timestamp: args.nowISO,
  };
}

export const CSV_HEADERS = [
  "runId","modelId","modelName","modelDescription","modelCurvature","modelCalcification","modelStenosis",
  "wireId","wireName","wireFlexibility","wirePushability",
  "stentId","stentName","stentOversize",
  "paramHash","inputHash","timestamp",
  "experimentId","experimentName","wireType","lesionType","operator",
  "progress","pathLength","contrastCount","doseIndex",
  "coveragePct","residualStenosisPct",
  "angles_laoRao","angles_cranialCaudal","zoom",
  "collimation_left","collimation_top","collimation_right","collimation_bottom",
] as const;

export type BuildRunCsvArgs = {
  runId: string;
  nowISO: string;
  model: RunModel;
  device: DeviceInfo;
  paramHash: string;
  inputHash: string;
  metrics: any;
  extras?: any;
  experiment?: any;
};

export function buildRunCsv(args: BuildRunCsvArgs) {
  const m = args.model;
  const w = args.device.wire;
  const s = args.device.stent;
  const extras = args.extras ?? {};
  const exp = args.experiment ?? {};

  const row = [
    args.runId,
    m.id,
    m.name,
    m.description ?? "",
    m.curvature ?? "",
    m.calcification ?? "",
    m.stenosis ?? "",
    w?.id || "",
    w?.name || "",
    w?.flexibility || "",
    w?.pushability || "",
    s?.id || "",
    s?.name || "",
    s?.oversize || "",
    args.paramHash,
    args.inputHash,
    args.nowISO,
    exp?.id || "",
    exp?.name || "",
    exp?.variables?.wireType || "",
    exp?.variables?.lesionType || "",
    exp?.variables?.operator || "",
    args.metrics.progress,
    args.metrics.pathLength,
    args.metrics.contrastCount,
    args.metrics.doseIndex,
    args.metrics.coveragePct,
    args.metrics.residualStenosisPct,
    extras?.angles?.laoRaoDeg ?? 0,
    extras?.angles?.cranialCaudalDeg ?? 0,
    extras?.zoom ?? 1.0,
    extras?.collimation?.left ?? 0,
    extras?.collimation?.top ?? 0,
    extras?.collimation?.right ?? 1,
    extras?.collimation?.bottom ?? 1,
  ];

  const csv = CSV_HEADERS.join(",") + "\n" + row.join(",") + "\n";
  return { headers: CSV_HEADERS, row, csv };
}
