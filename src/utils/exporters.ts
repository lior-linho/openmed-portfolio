import { useWorkflow } from '../state/workflow'
import { STANDARD_MODEL } from '../constants/models'

// Stable JSON stringification to ensure consistent key order
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']'
  const keys = Object.keys(obj).sort()
  return '{' + keys.map(k => JSON.stringify(k)+':'+stableStringify(obj[k])).join(',') + '}'
}

// SHA-256 hash calculation
async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function saveRunAsJson(metrics: any, extras: any, experiment?: any) {
  const { currentWire, currentStent } = useWorkflow.getState(); // 获取当前器械选择
  
  const payload = {
    schema: 'openmed.run.v1',
    version: '0.4.0',
    runId: crypto.randomUUID(),
    model: STANDARD_MODEL, // include model info
    device: {
      wire: currentWire,
      stent: currentStent,
    },
    params: extras,
    paramHash: await sha256(stableStringify(extras)),
    experiment: experiment || null,
    inputHash: experiment ? await sha256(stableStringify({extras, experiment})) : await sha256(stableStringify(extras)),
    metrics,
    citation: {
      en: `Simulations were conducted using the OpenMedSandbox (v0.4, 2025) with ${STANDARD_MODEL.name}.`,
      zh: `This study used OpenMedSandbox (v0.4, 2025) with ${STANDARD_MODEL.name}.`
    },
    timestamp: new Date().toISOString()
  }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

export async function saveRunAsCsv(metrics: any, extras?: any, experiment?: any) {
  const { currentWire, currentStent } = useWorkflow.getState(); // 获取当前器械选择
  
  const headers = [
    'runId', 'modelId', 'modelName', 'modelDescription', 'modelCurvature', 'modelCalcification', 'modelStenosis',
    'wireId', 'wireName', 'wireFlexibility', 'wirePushability',
    'stentId', 'stentName', 'stentOversize',
    'paramHash', 'inputHash', 'timestamp',
    'experimentId', 'experimentName', 'wireType', 'lesionType', 'operator',
    'progress', 'pathLength', 'contrastCount', 'doseIndex',
    'coveragePct', 'residualStenosisPct',
    'angles_laoRao', 'angles_cranialCaudal', 'zoom',
    'collimation_left', 'collimation_top', 'collimation_right', 'collimation_bottom'
  ]
  
  const paramHash = extras ? await sha256(stableStringify(extras)) : 'unknown'
  const inputHash = experiment ? await sha256(stableStringify({extras, experiment})) : paramHash
  const runId = crypto.randomUUID()
  
  const row = [
    runId,
    STANDARD_MODEL.id,
    STANDARD_MODEL.name,
    STANDARD_MODEL.description,
    STANDARD_MODEL.curvature,
    STANDARD_MODEL.calcification,
    STANDARD_MODEL.stenosis,
    currentWire?.id || '',
    currentWire?.name || '',
    currentWire?.flexibility || '',
    currentWire?.pushability || '',
    currentStent?.id || '',
    currentStent?.name || '',
    currentStent?.oversize || '',
    paramHash,
    inputHash,
    new Date().toISOString(),
    experiment?.id || '',
    experiment?.name || '',
    experiment?.variables?.wireType || '',
    experiment?.variables?.lesionType || '',
    experiment?.variables?.operator || '',
    metrics.progress,
    metrics.pathLength,
    metrics.contrastCount,
    metrics.doseIndex,
    metrics.coveragePct,
    metrics.residualStenosisPct,
    extras?.angles?.laoRaoDeg || 0,
    extras?.angles?.cranialCaudalDeg || 0,
    extras?.zoom || 1.0,
    extras?.collimation?.left || 0,
    extras?.collimation?.top || 0,
    extras?.collimation?.right || 1,
    extras?.collimation?.bottom || 1
  ]
  
  const csv = headers.join(',') + '\n' + row.join(',') + '\n'
  return new Blob([csv], { type:'text/csv;charset=utf-8;' })
}

export function generateCitation(experiment?: any): string {
  const baseCitation = "Simulations were conducted using the OpenMedSandbox platform (v0.4, 2025)."
  const chineseCitation = "Simulation performed on OpenMedSandbox (v0.4, 2025)."
  
  if (experiment) {
    const expInfo = `Experiment: ${experiment.name} (ID: ${experiment.id})`
    return `${baseCitation} ${expInfo}`
  }
  
  return baseCitation
}

export function copyCitationToClipboard(experiment?: any): Promise<void> {
  const citation = generateCitation(experiment)
  return navigator.clipboard.writeText(citation)
}
