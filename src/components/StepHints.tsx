import { useWorkflow } from '../state/workflow'

const HintRow = ({ k, v }: { k: string; v: string }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
    <code style={{ background: '#111827', padding: '2px 6px', borderRadius: 4 }}>{k}</code>
    <span style={{ opacity: 0.9 }}>{v}</span>
  </div>
)

export function StepHints(){
  const step = useWorkflow(s => s.step)
  const complication = useWorkflow(s => s.complication)

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 5,
        background: 'rgba(17,24,39,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '10px 12px',
        maxWidth: 320,
        color: '#e5e7eb',
        backdropFilter: 'blur(6px)'
      }}
      aria-label="Step Hints"
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{step} — Controls</div>
      {complication && (
        <div style={{
          marginBottom: 8,
          padding: '6px 8px',
          background: 'rgba(220,38,38,0.15)',
          border: '1px solid rgba(220,38,38,0.4)',
          borderRadius: 6,
          color: '#fecaca'
        }}>
          ⚠ Complication: {complication.type}
        </div>
      )}

      {step === 'Cross' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <HintRow k="One-finger ↑/↓" v="Advance / Withdraw wire" />
          <HintRow k="Arrow ↑/↓" v="Nudge advance / withdraw" />
          <HintRow k="One-finger ←/→" v="Rotate angle (LAO/RAO)" />
          <HintRow k="Pinch" v="Zoom 1.0×–3.0×" />
          <HintRow k="Hold F" v="Fluoro (pedal)" />
          <HintRow k="Space" v="Single contrast shot" />
          <div style={{ opacity: 0.8, marginTop: 4 }}>Use Previous/Next to change step</div>
        </div>
      )}

      {step === 'Pre-dilate' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <HintRow k="One-finger ↑/↓" v="Inflate / Deflate balloon (0–100%)" />
          <HintRow k="+ / -" v="Adjust inflation by 10%" />
          <HintRow k="Hold F" v="Observe under fluoro" />
          <HintRow k="Pinch" v="Zoom 1.0×–3.0×" />
          <div style={{ opacity: 0.8, marginTop: 4 }}>Click Next to enter Deploy</div>
        </div>
      )}

      {step === 'Deploy' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <HintRow k="Enter" v="Deploy stent (records Coverage/Residual)" />
          <HintRow k="One-finger ←/→" v="Adjust projection angle" />
          <HintRow k="Hold F" v="Observe deployment" />
          <div style={{ opacity: 0.8, marginTop: 4 }}>After deployment, click Next for Post-dilate</div>
        </div>
      )}

      {step === 'Post-dilate' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <HintRow k="One-finger ↑/↓" v="Re-inflate balloon to further reduce Residual" />
          <HintRow k="+ / -" v="Adjust inflation by 10%" />
          <HintRow k="Hold F" v="Observe changes" />
          <div style={{ opacity: 0.8, marginTop: 4 }}>Export JSON/CSV when done</div>
        </div>
      )}
    </div>
  )
}


