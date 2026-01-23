
export const COMMON_STYLES = {
  overlay: {
    position: 'absolute' as const,
    background: 'rgba(0,0,0,0.8)',
    color: 'white',
    borderRadius: 6,
    fontSize: '0.75em',
    opacity: 0.9,
    zIndex: 3,
    padding: '8px 12px'
  },
  statusIndicator: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    background: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: '0.75em',
    opacity: 0.9,
    zIndex: 3,
    minWidth: '120px'
  },
  shortcutHint: {
    position: 'absolute' as const,
    bottom: 8,
    left: 8,
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: '0.7em',
    opacity: 0.8,
    zIndex: 3
  }
} as const
