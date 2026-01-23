import { useMemo } from 'react'
import { useWorkflow } from '../state/workflow'
import { curvatureAt, makeCenterline } from '../sim/geometry'
import { STANDARD_MODEL } from '../constants/models'

const centerline = makeCenterline(200)

const Row = ({label, value, color, progress}:{label:string, value:string|number, color?:string, progress?:number}) => (
  <div className="row" style={{justifyContent:'space-between'}}>
    <span style={{opacity:.7}}>{label}</span>
    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
      {progress !== undefined && (
        <div style={{
          width: '60px',
          height: '8px',
          background: '#374151',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            height: '100%',
            background: color || '#3b82f6',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
      <b style={{color: color || 'inherit'}}>{value}</b>
    </div>
  </div>
)

export function DataPanel(){
  const m = useWorkflow(s=>s.metrics)
  const step = useWorkflow(s=>s.step)
  const angles = useWorkflow(s=>s.angles)
  const col = useWorkflow(s=>s.collimation)
  const currentWire = useWorkflow(s=>s.currentWire)
  const currentStent = useWorkflow(s=>s.currentStent)
  const balloon = useWorkflow(s=>s.balloonInflation)
  const stentDeployed = useWorkflow(s=>s.stentDeployed)
  const stent = useWorkflow(s=>s.stent)
  const complication = useWorkflow(s=>s.complication)

  const geometryDifficulty = useMemo(()=>{
    const k = curvatureAt(centerline, m.progress)
    return Math.round((k / Math.PI) * 100)
  },[m.progress])

  const getResistanceColor = (resistance: number) => {
    if (resistance < 0.3) return '#10b981' 
    if (resistance < 0.6) return '#f59e0b' 
    return '#ef4444' 
  }

  const getWireFlexibilityColor = (flexibility?: number) => {
    if (!flexibility) return '#6b7280'
    if (flexibility > 0.7) return '#10b981' 
    if (flexibility > 0.4) return '#f59e0b' 
    return '#ef4444' 
  }

  const getWirePushabilityColor = (pushability?: number) => {
    if (!pushability) return '#6b7280'
    if (pushability > 0.6) return '#10b981' 
    if (pushability > 0.3) return '#f59e0b' 
    return '#ef4444' 
  }

  const getStentOversizeColor = (oversize?: number) => {
    if (!oversize) return '#6b7280'
    if (oversize > 12) return '#10b981'  
    if (oversize > 7) return '#f59e0b' 
    return '#ef4444' 
  }

  return (
    <div style={{display:'grid', gap:8}}>
      {/* Model info */}
      <div style={{ 
        marginBottom: '12px', 
        padding: '8px', 
        background: '#1f2937', 
        borderRadius: '8px',
        borderLeft: '4px solid #3b82f6'
      }}>
        <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Current Model</div>
        <div style={{ fontSize: '1em', fontWeight: 'bold' }}>{STANDARD_MODEL.name}</div>
        <div style={{ fontSize: '0.8em' }}>{STANDARD_MODEL.description}</div>
        <div style={{ fontSize: '0.8em', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span>Curvature: {STANDARD_MODEL.curvature}°</span>
          <span>Calcification: {STANDARD_MODEL.calcification}%</span>
          <span>Stenosis: {STANDARD_MODEL.stenosis}%</span>
        </div>
      </div>

      {/* Current device info */}
      <Row 
        label="Current Wire" 
        value={currentWire?.name || "Not selected"} 
        color={currentWire ? getWireFlexibilityColor(currentWire.flexibility) : undefined}
      />
      {currentWire && (
        <>
          <Row 
            label="Flexibility" 
            value={`${(currentWire.flexibility * 100).toFixed(0)}%`}
            color={getWireFlexibilityColor(currentWire.flexibility)}
            progress={currentWire.flexibility * 100}
          />
          <Row 
            label="Pushability" 
            value={`${(currentWire.pushability * 100).toFixed(0)}%`}
            color={getWirePushabilityColor(currentWire.pushability)}
            progress={currentWire.pushability * 100}
          />
        </>
      )}
      
      <Row 
        label="Current Stent" 
        value={currentStent?.name || "Not selected"} 
        color={currentStent ? getStentOversizeColor(currentStent.oversize) : undefined}
      />
      {currentStent && (
        <Row 
          label="Oversize" 
          value={`${currentStent.oversize}%`}
          color={getStentOversizeColor(currentStent.oversize)}
          progress={Math.min(100, currentStent.oversize * 5)} // map oversize to 0-100%
        />
      )}
      
      {/* Metrics */}
      <Row label="Current Step" value={step} />
      <Row label="Projection Angle" value={`LAO ${angles.laoRaoDeg} / CRA ${angles.cranialCaudalDeg}`} />
      <Row label="Wire Progress (%)" value={(m.progress*100).toFixed(0)} />
      <Row label="Path Length" value={m.pathLength.toFixed(2)} />
      <Row label="Contrast Shots" value={m.contrastCount} />
      <Row label="Dose Index" value={m.doseIndex.toFixed(2)} />
      <Row label="Collimation Area (%)" value={(((col.right-col.left)*(col.bottom-col.top))*100).toFixed(0)} />
      <Row 
        label="Resistance Index" 
        value={Math.round((m.resistance ?? 0)*100)} 
        color={getResistanceColor(m.resistance ?? 0)}
        progress={(m.resistance ?? 0) * 100}
      />
      <Row label="Geometry Difficulty" value={geometryDifficulty} />
      <Row label="Coverage (%)" value={m.coveragePct.toFixed(1)} />
      <Row label="Residual Stenosis (%)" value={m.residualStenosisPct.toFixed(1)} />
      <Row label="Balloon Inflation (%)" value={(balloon*100).toFixed(0)} />
      <Row label="Stent Deployed" value={stentDeployed ? 'Yes' : 'No'} />
      <Row label="Stent L/oversize" value={`${(stent.lengthT*100).toFixed(0)}% / ${(stent.oversize).toFixed(2)}×`} />
      {complication && (
        <Row label="Complication" value={complication.type} color="#ef4444" />
      )}
    </div>
  )
}
