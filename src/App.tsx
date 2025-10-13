import { useState, useEffect, useMemo } from 'react'
import { FluoroViewport } from './components/FluoroViewport'
import { UnifiedScene } from './components/UnifiedScene'
import { DataPanel } from './components/DataPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PerformanceMonitor } from './components/PerformanceMonitor'
import { PedalButton } from './components/PedalButton'
import { GesturePad } from './components/GesturePad'
import { ExperimentSetup } from './components/ExperimentSetup'
import { ComparisonPanel } from './components/ComparisonPanel'
import { DeviceComparison } from './components/DeviceComparison'
import { useWorkflow } from './state/workflow'
import { saveRunAsJson, saveRunAsCsv } from './utils/exporters'
import { defaultLesion, defaultStent } from './sim/lesion'
import { makeCenterline, accumulateArcLengths, arcLenBetween } from './sim/geometry'
import { logger } from './utils/logger'
import { WIRE_PRESETS, STENT_PRESETS } from './constants/models'

// Global error fallback component
const GlobalErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  return (
    <div style={{ padding: '20px', color: 'white', background: '#dc2626' }}>
      <h2>Application Error</h2>
      <pre style={{ fontSize: '12px', overflow: 'auto' }}>{error.stack}</pre>
      <button onClick={resetErrorBoundary} style={{ padding: '10px', marginTop: '10px' }}>
        Retry
      </button>
    </div>
  );
};

// Typical coronary angiography position presets
const PRESETS = [
  { label: 'AP', value: [0, 0] },
  { label: 'LAO30/CRA20 (LAD Common)', value: [30, 20] },
  { label: 'RAO30/CAU20 (LCx/Bifurcation)', value: [-30, -20] },
  { label: 'LAO45/CAU20 (Left Main)', value: [45, -20] },
  { label: 'RAO30/CRA20 (RCA)', value: [-30, 20] }
]

export default function App() {
  try {
    // Workflow state
    const step = useWorkflow(s => s.step)
    const next = useWorkflow(s => s.next)
    const prev = useWorkflow(s => s.prev)
    const pause = useWorkflow(s => s.pause)
    const resume = useWorkflow(s => s.resume)
    const isPaused = useWorkflow(s => s.paused)
    const metrics = useWorkflow(s => s.metrics)
    const reset = useWorkflow(s => s.reset)
    const angles = useWorkflow(s => s.angles)
    const setAngles = useWorkflow(s => s.setAngles)
    const zoom = useWorkflow(s => s.zoom)
    const setZoom = useWorkflow(s => s.setZoom)
    const col = useWorkflow(s => s.collimation)
    const setCollimation = useWorkflow(s => s.setCollimation)
    const shootContrast = useWorkflow(s => s.shootContrast)
    const startFluoro = useWorkflow(s => s.startFluoro)
    const stopFluoro = useWorkflow(s => s.stopFluoro)
    const startCine = useWorkflow(s => s.startCine)
    const currentWire = useWorkflow(s => s.currentWire)
    const currentStent = useWorkflow(s => s.currentStent)
    const setCurrentWire = useWorkflow(s => s.setCurrentWire)
    const setCurrentStent = useWorkflow(s => s.setCurrentStent)
    const addPath = useWorkflow(s => s.addPath)
    const setProgress = useWorkflow(s => s.setProgress)
    const controlMode = useWorkflow(s => s.controlMode)
    const toggleControlMode = useWorkflow(s => s.toggleControlMode)


    const [tab, setTab] = useState<'data'|'3d'|'monitor'|'devices'>('data')
    const [presetIndex, setPresetIndex] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [showExperimentSetup, setShowExperimentSetup] = useState(false)
    const [showComparisonPanel, setShowComparisonPanel] = useState(false)
    
    // Experiment state
    const currentExperiment = useWorkflow(s => s.currentExperiment)
    const setExperiment = useWorkflow(s => s.setExperiment)

    // Geometry for keyboard-driven progress/path updates
    const kbPoints = useMemo(() => makeCenterline(200), [])
    const kbCum = useMemo(() => accumulateArcLengths(kbPoints), [kbPoints])

    // Apply preset angles
    useEffect(() => {
      const preset = PRESETS[presetIndex]
      const newAngles = { laoRaoDeg: preset.value[0], cranialCaudalDeg: preset.value[1] }
      console.log('Setting angles:', { presetIndex, preset: preset.label, newAngles })
      setAngles(newAngles)
    }, [presetIndex, setAngles])

    // Global stop conditions and page visibility monitoring
    useEffect(() => {
      const stopAll = () => {
        stopFluoro()
      }
      
      window.addEventListener('pointerup', stopAll)
      window.addEventListener('blur', stopAll)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          stopAll()
        }
      })
      
      return () => {
        window.removeEventListener('pointerup', stopAll)
        window.removeEventListener('blur', stopAll)
        document.removeEventListener('visibilitychange', stopAll as any)
      }
    }, [stopFluoro])

    // Keyboard shortcut monitoring - simulate pedal interaction and add arrow controls
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        
        switch (e.key.toLowerCase()) {
          case 'f':
            e.preventDefault()
            // F key pressed: start fluoroscopy mode (simulate pedal press)
            startFluoro()
            break
          case 'c':
            e.preventDefault()
            // C key: start cine mode
            startCine()
            break
          case ' ':
            e.preventDefault()
            // Space key: single contrast shot
            shootContrast()
            break
          case 'escape':
            e.preventDefault()
            // ESC key: emergency stop all modes
            stopFluoro()
            break
          case 'arrowup': {
            e.preventDefault()
            const s = useWorkflow.getState()
            if (s.step !== 'Cross') {
              s.setBalloon(s.balloonInflation + 0.05)
              break
            }
            const current = s.metrics.progress
            const resistance = s.metrics.resistance || 0
            const stepSize = 0.005 * Math.max(0.1, 1 - 0.7 * resistance)
            const next = Math.min(1, current + stepSize)
            if (next !== current) {
              const dL = arcLenBetween(kbPoints, kbCum, current, next)
              setProgress(next)
              addPath(dL)
            }
            break
          }
          case 'arrowdown': {
            e.preventDefault()
            const s = useWorkflow.getState()
            if (s.step !== 'Cross') {
              s.setBalloon(s.balloonInflation - 0.05)
              break
            }
            const current = s.metrics.progress
            const resistance = s.metrics.resistance || 0
            const stepSize = 0.005 * Math.max(0.1, 1 - 0.7 * resistance)
            const next = Math.max(0, current - stepSize)
            if (next !== current) {
              const dL = arcLenBetween(kbPoints, kbCum, current, next)
              setProgress(next)
              addPath(dL)
            }
            break
          }
          case 'arrowleft': {
            e.preventDefault()
            const s = useWorkflow.getState()
            const yaw = Math.max(-60, Math.min(60, s.angles.laoRaoDeg - 1.5))
            setAngles({ laoRaoDeg: yaw, cranialCaudalDeg: s.angles.cranialCaudalDeg })
            break
          }
          case 'arrowright': {
            e.preventDefault()
            const s = useWorkflow.getState()
            const yaw = Math.max(-60, Math.min(60, s.angles.laoRaoDeg + 1.5))
            setAngles({ laoRaoDeg: yaw, cranialCaudalDeg: s.angles.cranialCaudalDeg })
            break
          }
          case '+':
          case '=': {
            e.preventDefault()
            const s = useWorkflow.getState()
            if (s.step !== 'Cross') {
              s.setBalloon(s.balloonInflation + 0.1)
            }
            break
          }
          case '-':
          case '_': {
            e.preventDefault()
            const s = useWorkflow.getState()
            if (s.step !== 'Cross') {
              s.setBalloon(s.balloonInflation - 0.1)
            }
            break
          }
          case 'enter': {
            e.preventDefault()
            const s = useWorkflow.getState()
            s.deployStent()
            break
          }
        }
      }

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault()
          // F key released: stop fluoroscopy, return to idle mode (simulate pedal release)
          const currentMode = useWorkflow.getState().fluoroMode
          if (currentMode === 'fluoro') {
            stopFluoro()
          }
        }
      }
      
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp) // Listen for key release!
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
      }
    }, [startFluoro, startCine, shootContrast, stopFluoro])

    const handleExportJSON = async () => {
      try {
        const extras = { angles, zoom, col, step, mode: 'idle', lesion: defaultLesion, stent: defaultStent }
        const blob = await saveRunAsJson(metrics, extras, currentExperiment)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `openmed_run_${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        logger.error('Export error:', err)
        setError('Export failed: ' + (err as Error).message)
      }
    }

    const handleExportCSV = async () => {
      try {
        const extras = { angles, zoom, col, step, mode: 'idle', lesion: defaultLesion, stent: defaultStent }
        const blob = await saveRunAsCsv(metrics, extras, currentExperiment)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `openmed_run_${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        logger.error('Export error:', err)
        setError('Export failed: ' + (err as Error).message)
      }
    }


    // Error display
    if (error) {
      return (
        <div style={{
          padding: 20,
          background: '#dc2626',
          color: 'white',
          borderRadius: 8,
          margin: 20
        }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Close</button>
        </div>
      )
    }

    return (
      <ErrorBoundary 
        fallback={<GlobalErrorFallback error={new Error('App crashed')} resetErrorBoundary={() => window.location.reload()} />}
        onError={(error) => console.error('Error caught by boundary:', error)}
      >
        <div className="main-container">
          {/* Left: 2D fluoroscopy main window */}
          <div className="left-panel">
            <div className="control-row">
              <div className="button-group">
                <button className="btn" onClick={prev} aria-label="Previous step">Previous</button>
                {isPaused ? <button className="btn" onClick={resume} aria-label="Resume">Resume</button> : <button className="btn" onClick={pause} aria-label="Pause">Pause</button>}
                <button className="btn" onClick={next} aria-label="Next step">Next</button>
              </div>

              <div className="spacer" />

              <span style={{opacity:.6, fontSize:'0.8em'}}>v0.4.1</span>

              <label>Angle:</label>
              <select
                value={presetIndex}
                onChange={e => setPresetIndex(Number(e.target.value))}>
                {PRESETS.map((preset, i) => (
                  <option key={i} value={i}>{preset.label}</option>
                ))}
              </select>

              <label>Zoom:</label>
              <div className="button-group">
                <button className="btn" onClick={()=>setZoom(1.0)} disabled={zoom===1.0} aria-label="Zoom 1.0x">1.0×</button>
                <button className="btn" onClick={()=>setZoom(1.5)} disabled={zoom===1.5} aria-label="Zoom 1.5x">1.5×</button>
                <button className="btn" onClick={()=>setZoom(2.0)} disabled={zoom===2.0} aria-label="Zoom 2.0x">2.0×</button>
              </div>

              <label>Collimation:</label>
              <button className="btn" onClick={()=>setCollimation({ left:0.1, top:0.1, right:0.9, bottom:0.9 })}>◧ Adjust</button>

              {/* Device selection */}
              <label>Wire:</label>
              <select 
                value={currentWire?.id || ''} 
                onChange={e => setCurrentWire(e.target.value)}
                style={{minWidth: '120px'}}
              >
                <option value="">-- Select Wire --</option>
                {WIRE_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>

              <label>Stent:</label>
              <select 
                value={currentStent?.id || ''} 
                onChange={e => setCurrentStent(e.target.value)}
                style={{minWidth: '140px'}}
              >
                <option value="">-- Select Stent --</option>
                {STENT_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>

              <div className="button-group">
                <button className="btn" onClick={shootContrast} aria-label="Shoot (Space key)">Shoot</button>
                <PedalButton label="Fluoro ⏵" onPress={startFluoro} onRelease={stopFluoro} aria-label="Fluoro (F key)" />
                <button className="btn" onClick={()=>startCine(3)} aria-label="Cine (C key)">Cine ⏺</button>
              </div>

              {/* Control mode toggle */}
              <button 
                className="btn" 
                onClick={toggleControlMode}
                style={{ 
                  background: controlMode === 'auto' ? '#10b981' : '#f59e0b',
                  color: 'white'
                }}
                aria-label="Toggle control mode"
              >
                {controlMode === 'auto' ? 'Auto' : 'Manual'}
              </button>

              <div className="button-group">
                <button className="btn" onClick={reset}>Reset</button>
                <button 
                  className="btn" 
                  onClick={() => setShowExperimentSetup(true)}
                  style={{ background: currentExperiment ? '#10b981' : '#3b82f6' }}
                >
                  {currentExperiment ? 'Edit Experiment' : 'New Experiment'}
                </button>
              </div>

              <span style={{opacity:.7}}>Step: {step}</span>
              {currentExperiment && (
                <div style={{opacity:.8, fontSize:'0.8em', marginTop:'4px'}}>
                  <strong>Experiment:</strong> {currentExperiment.name}
                  <br />
                  <span style={{opacity:.7}}>
                    Wire: {currentExperiment.variables.wireType} | 
                    Lesion: {currentExperiment.variables.lesionType} | 
                    Operator: {currentExperiment.variables.operator}
                  </span>
                </div>
              )}
            </div>

            <ErrorBoundary>
              <div className="panel" style={{height:'100%', overflow:'hidden', position:'relative'}}>
                <FluoroViewport/>
              </div>
            </ErrorBoundary>
          </div>

          {/* Right: Data panel + Tabs (switch between 3D background view and system monitoring) */}
          <div className="right-panel panel">
            <div className="row" style={{marginBottom: '8px'}}>
              <div className={`tab ${tab==='data'?'active':''}`} onClick={()=>setTab('data')}>Data Panel</div>
              <div className={`tab ${tab==='3d'?'active':''}`} onClick={()=>setTab('3d')}>3D Background</div>
              <div className={`tab ${tab==='devices'?'active':''}`} onClick={()=>setTab('devices')}>Devices</div>
              <div className={`tab ${tab==='monitor'?'active':''}`} onClick={()=>setTab('monitor')}>System Monitor</div>
            </div>
            
            <div className="panel-content" style={{flex: 1, marginBottom: '8px'}}>
              {tab === 'data' ? (
                <ErrorBoundary>
                  <div style={{display:'grid', gap:8}}>
                    <DataPanel />
                  </div>
                </ErrorBoundary>
              ) : tab === '3d' ? (
                <ErrorBoundary>
                  <div style={{height:'100%', borderRadius:12, overflow:'hidden'}}>
                    <UnifiedScene/>
                  </div>
                </ErrorBoundary>
              ) : tab === 'devices' ? (
                <ErrorBoundary>
                  <DeviceComparison />
                </ErrorBoundary>
              ) : tab === 'monitor' ? (
                <ErrorBoundary>
                  <div style={{height:'100%', borderRadius:12, overflow:'hidden'}}>
                    <PerformanceMonitor />
                  </div>
                </ErrorBoundary>
              ) : (
                <div style={{opacity:.6, padding: '20px'}}>Please select a tab</div>
              )}
            </div>
            
            <div className="row" style={{gap: '8px'}}>
              <button className="btn" onClick={handleExportJSON}>Export JSON</button>
              <button className="btn" onClick={handleExportCSV}>Export CSV</button>
              <button className="btn" onClick={() => setShowComparisonPanel(true)} style={{ background: '#f59e0b' }}>
                A/B Compare
              </button>
            </div>
          </div>
        </div>
        
        {showExperimentSetup && (
          <ExperimentSetup onClose={() => setShowExperimentSetup(false)} />
        )}
        
        {showComparisonPanel && (
          <ComparisonPanel onClose={() => setShowComparisonPanel(false)} />
        )}
        
      </ErrorBoundary>
    )
  } catch (err) {
    logger.error('App render error:', err)
    return (
      <div style={{
        padding: 20,
        background: '#dc2626',
        color: 'white',
        borderRadius: 8,
        margin: 20
      }}>
        <h3>Render Error</h3>
        <p>{(err as Error).message}</p>
        <pre style={{fontSize: '0.8em', overflow: 'auto'}}>{(err as Error).stack}</pre>
      </div>
    )
  }
}
