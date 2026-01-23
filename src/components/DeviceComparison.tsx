import { useWorkflow } from '../state/workflow'
import { WIRE_PRESETS, STENT_PRESETS } from '../constants/models'

export function DeviceComparison() {
  const currentWire = useWorkflow(s => s.currentWire)
  const currentStent = useWorkflow(s => s.currentStent)

  const getWireFlexibilityColor = (flexibility: number) => {
    if (flexibility > 0.7) return '#10b981' 
    if (flexibility > 0.4) return '#f59e0b' 
    return '#ef4444' 
  }

  const getWirePushabilityColor = (pushability: number) => {
    if (pushability > 0.6) return '#10b981' 
    if (pushability > 0.3) return '#f59e0b' 
    return '#ef4444' 
  }

  const getStentOversizeColor = (oversize: number) => {
    if (oversize > 12) return '#10b981' 
    if (oversize > 7) return '#f59e0b' 
    return '#ef4444' 
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* Wire comparison */}
      <div style={{ 
        padding: '12px', 
        background: '#1f2937', 
        borderRadius: '8px',
        border: currentWire ? '2px solid #3b82f6' : '1px solid #374151'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9em', opacity: 0.8 }}>Wire Comparison</h4>
        <div style={{ display: 'grid', gap: '6px' }}>
          {WIRE_PRESETS.map(preset => (
            <div 
              key={preset.id}
              style={{ 
                padding: '6px 8px', 
                background: currentWire?.id === preset.id ? '#374151' : '#111827',
                borderRadius: '4px',
                border: currentWire?.id === preset.id ? '1px solid #3b82f6' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => useWorkflow.getState().setCurrentWire(preset.id)}
            >
              <div style={{ fontSize: '0.8em', fontWeight: 'bold', marginBottom: '4px' }}>
                {preset.name}
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.7em' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ opacity: 0.7 }}>Flexibility:</span>
                  <div style={{
                    width: '40px',
                    height: '4px',
                    background: '#374151',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${preset.flexibility * 100}%`,
                      height: '100%',
                      background: getWireFlexibilityColor(preset.flexibility),
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{ color: getWireFlexibilityColor(preset.flexibility) }}>
                    {(preset.flexibility * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ opacity: 0.7 }}>Pushability:</span>
                  <div style={{
                    width: '40px',
                    height: '4px',
                    background: '#374151',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${preset.pushability * 100}%`,
                      height: '100%',
                      background: getWirePushabilityColor(preset.pushability),
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{ color: getWirePushabilityColor(preset.pushability) }}>
                    {(preset.pushability * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stent comparison */}
      <div style={{ 
        padding: '12px', 
        background: '#1f2937', 
        borderRadius: '8px',
        border: currentStent ? '2px solid #3b82f6' : '1px solid #374151'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9em', opacity: 0.8 }}>Stent Comparison</h4>
        <div style={{ display: 'grid', gap: '6px' }}>
          {STENT_PRESETS.map(preset => (
            <div 
              key={preset.id}
              style={{ 
                padding: '6px 8px', 
                background: currentStent?.id === preset.id ? '#374151' : '#111827',
                borderRadius: '4px',
                border: currentStent?.id === preset.id ? '1px solid #3b82f6' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => useWorkflow.getState().setCurrentStent(preset.id)}
            >
              <div style={{ fontSize: '0.8em', fontWeight: 'bold', marginBottom: '4px' }}>
                {preset.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7em' }}>
                <span style={{ opacity: 0.7 }}>Oversize:</span>
                <div style={{
                  width: '60px',
                  height: '4px',
                  background: '#374151',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(100, preset.oversize * 5)}%`,
                    height: '100%',
                    background: getStentOversizeColor(preset.oversize),
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <span style={{ color: getStentOversizeColor(preset.oversize) }}>
                  {preset.oversize}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{ 
        padding: '8px', 
        background: '#1f2937', 
        borderRadius: '6px',
        fontSize: '0.7em',
        opacity: 0.8
      }}>
        <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>💡 Tips:</div>
        <div>• Higher flexibility passes bends easier, with less support.</div>
        <div>• Higher pushability gives better support, harder on bends.</div>
        <div>• Higher oversize improves expansion but may affect apposition.</div>
      </div>
    </div>
  )
}
