import { useRef } from 'react'

interface PedalButtonProps {
  label: string
  onPress: () => void
  onRelease: () => void
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

export function PedalButton({ 
  label, 
  onPress, 
  onRelease, 
  className = 'btn',
  disabled = false,
  'aria-label': ariaLabel 
}: PedalButtonProps) {
  const pressed = useRef(false)
  
  return (
    <button
      className={className}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={(e) => { 
        if (disabled) return
        pressed.current = true
        const target = e.target as HTMLElement
        target.setPointerCapture(e.pointerId)
        onPress()
      }}
      onPointerUp={(e) => { 
        if (!pressed.current || disabled) return
        pressed.current = false
        const target = e.target as HTMLElement
        target.releasePointerCapture(e.pointerId)
        onRelease()
      }}
      onPointerCancel={() => { 
        if (!pressed.current) return
        pressed.current = false
        onRelease()
      }}
    >
      {label}
    </button>
  )
}
