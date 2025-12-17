import { describe, it, expect } from "vitest";
import { buildRunJsonPayload, buildRunCsv } from "../../../src/data/exporters/buildRunPayload";

describe("buildRun payloads", () => {
  it("buildRunJsonPayload is deterministic with injected ids/time", () => {
    const payload = buildRunJsonPayload({
      schema: "openmed.run.v1",
      version: "0.4.0",
      runId: "RUN123",
      nowISO: "2025-01-01T00:00:00.000Z",
      model: { id: "M1", name: "Model" },
      device: { wire: { id: "W1" }, stent: { id: "S1" } },
      params: { p: 1 },
      paramHash: "H1",
      experiment: null,
      inputHash: "H2",
      metrics: { progress: 0.1 },
    });

    expect(payload.runId).toBe("RUN123");
    expect(payload.timestamp).toBe("2025-01-01T00:00:00.000Z");
    expect(payload.paramHash).toBe("H1");
    expect(payload.inputHash).toBe("H2");
  });

  it("buildRunCsv contains stable headers and row length matches", () => {
    const { headers, row, csv } = buildRunCsv({
      runId: "RUN123",
      nowISO: "2025-01-01T00:00:00.000Z",
      model: { id: "M1", name: "Model" },
      device: { wire: null, stent: null },
      paramHash: "H1",
      inputHash: "H2",
      metrics: {
        progress: 0.2, pathLength: 1, contrastCount: 2, doseIndex: 3,
        coveragePct: 4, residualStenosisPct: 5
      },
      extras: {},
      experiment: {},
    });

    expect(row.length).toBe(headers.length);
    expect(csv.split("\n")[0]).toBe(headers.join(","));
  });
});
