import { useState } from 'react'
import { useWorkflow, Experiment } from '../state/workflow'

interface ExperimentSetupProps {
  onClose: () => void
}

export function ExperimentSetup({ onClose }: ExperimentSetupProps) {
  const createExperiment = useWorkflow(s => s.createExperiment)
  const currentExperiment = useWorkflow(s => s.currentExperiment)
  
  const [formData, setFormData] = useState({
    name: currentExperiment?.name || '',
    wireType: currentExperiment?.variables?.wireType || 'A',
    lesionType: currentExperiment?.variables?.lesionType || 'standard',
    operator: currentExperiment?.variables?.operator || '',
    notes: currentExperiment?.variables?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createExperiment(formData.name, {
      wireType: formData.wireType,
      lesionType: formData.lesionType,
      operator: formData.operator,
      notes: formData.notes
    })
    onClose()
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        minWidth: '400px',
        maxWidth: '600px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
          {currentExperiment ? 'Edit Experiment' : 'New Experiment'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
              Experiment Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              placeholder="e.g., Wire A vs Wire B Comparison"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
              Wire Type
            </label>
            <select
              value={formData.wireType}
              onChange={(e) => handleInputChange('wireType', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="A">Wire Type A</option>
              <option value="B">Wire Type B</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
              Lesion Type
            </label>
            <select
              value={formData.lesionType}
              onChange={(e) => handleInputChange('lesionType', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="standard">Standard Lesion</option>
              <option value="complex">Complex Lesion</option>
              <option value="bifurcation">Bifurcation</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
              Operator
            </label>
            <input
              type="text"
              value={formData.operator}
              onChange={(e) => handleInputChange('operator', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              placeholder="e.g., Dr. Smith"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="Additional notes about this experiment..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: 'white',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#3b82f6',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {currentExperiment ? 'Update' : 'Create'} Experiment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
