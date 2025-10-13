import { useState, useRef } from 'react'

interface RunData {
  runId: string
  experimentId?: string
  experimentName?: string
  wireType?: string
  lesionType?: string
  operator?: string
  metrics: {
    progress: number
    pathLength: number
    contrastCount: number
    doseIndex: number
    coveragePct: number
    residualStenosisPct: number
  }
  params: {
    angles: { laoRaoDeg: number; cranialCaudalDeg: number }
    zoom: number
    collimation: { left: number; top: number; right: number; bottom: number }
  }
  timestamp: string
}

interface ComparisonPanelProps {
  onClose: () => void
}

export function ComparisonPanel({ onClose }: ComparisonPanelProps) {
  const [runA, setRunA] = useState<RunData | null>(null)
  const [runB, setRunB] = useState<RunData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputA = useRef<HTMLInputElement>(null)
  const fileInputB = useRef<HTMLInputElement>(null)

  const handleFileUpload = (file: File, setRun: (run: RunData | null) => void) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        
        // Validate the data structure
        if (!data.metrics || !data.params) {
          throw new Error('Invalid file format: missing metrics or params')
        }
        
        setRun(data)
        setError(null)
      } catch (err) {
        setError(`Failed to parse file: ${(err as Error).message}`)
        setRun(null)
      }
    }
    reader.readAsText(file)
  }

  const handleFileAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, setRunA)
    }
  }

  const handleFileBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, setRunB)
    }
  }

  const formatValue = (value: number, decimals: number = 2) => {
    return typeof value === 'number' ? value.toFixed(decimals) : 'N/A'
  }

  const calculateDifference = (a: number, b: number) => {
    if (typeof a !== 'number' || typeof b !== 'number') return 'N/A'
    const diff = a - b
    const percent = b !== 0 ? ((diff / b) * 100) : 0
    return `${diff > 0 ? '+' : ''}${diff.toFixed(2)} (${percent > 0 ? '+' : ''}${percent.toFixed(1)}%)`
  }

  const getBetterValue = (a: number, b: number, lowerIsBetter: boolean = false) => {
    if (typeof a !== 'number' || typeof b !== 'number') return null
    if (lowerIsBetter) {
      return a < b ? 'A' : b < a ? 'B' : 'Tie'
    } else {
      return a > b ? 'A' : b > a ? 'B' : 'Tie'
    }
  }

  const handleExportComparison = () => {
    if (!runA || !runB) return

    const comparisonData = {
      timestamp: new Date().toISOString(),
      runA: {
        experimentId: runA.experimentId,
        experimentName: runA.experimentName,
        wireType: runA.wireType,
        lesionType: runA.lesionType,
        operator: runA.operator,
        metrics: runA.metrics,
        params: runA.params
      },
      runB: {
        experimentId: runB.experimentId,
        experimentName: runB.experimentName,
        wireType: runB.wireType,
        lesionType: runB.lesionType,
        operator: runB.operator,
        metrics: runB.metrics,
        params: runB.params
      },
      comparison: {
        betterPathEfficiency: getBetterValue(runA.metrics.pathLength, runB.metrics.pathLength, true),
        lowerRadiationDose: getBetterValue(runA.metrics.doseIndex, runB.metrics.doseIndex, true),
        betterCoverage: getBetterValue(runA.metrics.coveragePct, runB.metrics.coveragePct),
        lowerResidualStenosis: getBetterValue(runA.metrics.residualStenosisPct, runB.metrics.residualStenosisPct, true)
      }
    }

    const blob = new Blob([JSON.stringify(comparisonData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comparison_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        minWidth: '800px',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>A/B Experiment Comparison</h2>
            <button
              onClick={onClose}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
          
          {error && (
            <div style={{
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Run A</h3>
              <input
                ref={fileInputA}
                type="file"
                accept=".json"
                onChange={handleFileAChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
              {runA && (
                <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#6b7280' }}>
                  <div><strong>Experiment:</strong> {runA.experimentName || 'N/A'}</div>
                  <div><strong>Wire Type:</strong> {runA.wireType || 'N/A'}</div>
                  <div><strong>Operator:</strong> {runA.operator || 'N/A'}</div>
                  <div><strong>Timestamp:</strong> {new Date(runA.timestamp).toLocaleString()}</div>
                </div>
              )}
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Run B</h3>
              <input
                ref={fileInputB}
                type="file"
                accept=".json"
                onChange={handleFileBChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
              {runB && (
                <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#6b7280' }}>
                  <div><strong>Experiment:</strong> {runB.experimentName || 'N/A'}</div>
                  <div><strong>Wire Type:</strong> {runB.wireType || 'N/A'}</div>
                  <div><strong>Operator:</strong> {runB.operator || 'N/A'}</div>
                  <div><strong>Timestamp:</strong> {new Date(runB.timestamp).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {runA && runB && (
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, color: '#1f2937' }}>Comparison Results</h3>
              <button
                onClick={handleExportComparison}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Export Comparison
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {/* Performance Metrics */}
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#f9fafb',
                  padding: '12px 16px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Performance Metrics
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr auto',
                    gap: '12px',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontWeight: '500', color: '#1f2937' }}>Metric</div>
                    <div style={{ fontWeight: '500', textAlign: 'center', color: '#1f2937' }}>Run A</div>
                    <div style={{ fontWeight: '500', textAlign: 'center', color: '#1f2937' }}>Run B</div>
                    <div style={{ fontWeight: '500', textAlign: 'center', color: '#1f2937' }}>Difference</div>
                    
                    <div style={{ color: '#374151' }}>Progress (%)</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runA.metrics.progress * 100, 1)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runB.metrics.progress * 100, 1)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{calculateDifference(runA.metrics.progress * 100, runB.metrics.progress * 100)}</div>
                    
                    <div style={{ color: '#374151' }}>Path Length</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runA.metrics.pathLength)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runB.metrics.pathLength)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{calculateDifference(runA.metrics.pathLength, runB.metrics.pathLength)}</div>
                    
                    <div style={{ color: '#374151' }}>Contrast Shots</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{runA.metrics.contrastCount}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{runB.metrics.contrastCount}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{calculateDifference(runA.metrics.contrastCount, runB.metrics.contrastCount)}</div>
                    
                    <div style={{ color: '#374151' }}>Dose Index</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runA.metrics.doseIndex)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runB.metrics.doseIndex)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{calculateDifference(runA.metrics.doseIndex, runB.metrics.doseIndex)}</div>
                    
                    <div style={{ color: '#374151' }}>Coverage (%)</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runA.metrics.coveragePct, 1)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runB.metrics.coveragePct, 1)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{calculateDifference(runA.metrics.coveragePct, runB.metrics.coveragePct)}</div>
                    
                    <div style={{ color: '#374151' }}>Residual Stenosis (%)</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runA.metrics.residualStenosisPct, 1)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{formatValue(runB.metrics.residualStenosisPct, 1)}</div>
                    <div style={{ textAlign: 'center', color: '#1f2937' }}>{calculateDifference(runA.metrics.residualStenosisPct, runB.metrics.residualStenosisPct)}</div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#f9fafb',
                  padding: '12px 16px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Summary
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ color: '#1f2937' }}>
                      <strong style={{ color: '#374151' }}>Better Path Efficiency:</strong> {getBetterValue(runA.metrics.pathLength, runB.metrics.pathLength, true) || 'N/A'}
                    </div>
                    <div style={{ color: '#1f2937' }}>
                      <strong style={{ color: '#374151' }}>Lower Radiation Dose:</strong> {getBetterValue(runA.metrics.doseIndex, runB.metrics.doseIndex, true) || 'N/A'}
                    </div>
                    <div style={{ color: '#1f2937' }}>
                      <strong style={{ color: '#374151' }}>Better Coverage:</strong> {getBetterValue(runA.metrics.coveragePct, runB.metrics.coveragePct) || 'N/A'}
                    </div>
                    <div style={{ color: '#1f2937' }}>
                      <strong style={{ color: '#374151' }}>Lower Residual Stenosis:</strong> {getBetterValue(runA.metrics.residualStenosisPct, runB.metrics.residualStenosisPct, true) || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
