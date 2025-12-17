import { useWorkflow } from "../state/workflow";
import { STANDARD_MODEL } from "../constants/models";
import { stableStringify } from "../data/exporters/stableStringify";
import { buildRunCsv, buildRunJsonPayload } from "../data/exporters/buildRunPayload";

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function saveRunAsJson(metrics: any, extras: any, experiment?: any) {
  const { currentWire, currentStent } = useWorkflow.getState();

  const paramHash = await sha256(stableStringify(extras));
  const inputHash = experiment
    ? await sha256(stableStringify({ extras, experiment }))
    : paramHash;

  const payload = buildRunJsonPayload({
    schema: "openmed.run.v1",
    version: "0.4.0",
    runId: crypto.randomUUID(),
    nowISO: new Date().toISOString(),
    model: STANDARD_MODEL,
    device: { wire: currentWire, stent: currentStent },
    params: extras,
    paramHash,
    experiment: experiment || null,
    inputHash,
    metrics,
  });

  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export async function saveRunAsCsv(metrics: any, extras?: any, experiment?: any) {
  const { currentWire, currentStent } = useWorkflow.getState();

  const paramHash = extras ? await sha256(stableStringify(extras)) : "unknown";
  const inputHash = experiment ? await sha256(stableStringify({ extras, experiment })) : paramHash;

  const { csv } = buildRunCsv({
    runId: crypto.randomUUID(),
    nowISO: new Date().toISOString(),
    model: STANDARD_MODEL,
    device: { wire: currentWire, stent: currentStent },
    paramHash,
    inputHash,
    metrics,
    extras,
    experiment,
  });

  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

export function generateCitation(experiment?: any): string {
  const baseCitation = "Simulations were conducted using the OpenMedSandbox platform (v0.4, 2025).";
  if (experiment) return `${baseCitation} Experiment: ${experiment.name} (ID: ${experiment.id})`;
  return baseCitation;
}

export function copyCitationToClipboard(experiment?: any): Promise<void> {
  const citation = generateCitation(experiment);
  return navigator.clipboard.writeText(citation);
}
