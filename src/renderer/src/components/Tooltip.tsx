import React, { useState, useRef } from 'react'
import { HelpIcon } from './icons'

interface TooltipProps {
  content: string
  children?: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const handleMouseEnter = (): void => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2
      })
    }
    setIsVisible(true)
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help inline-flex"
      >
        {children || (
          <HelpIcon className="w-4 h-4 text-text-dim hover:text-neon-blue transition-colors" />
        )}
      </div>
      {isVisible && (
        <div
          className="fixed z-[9999] transform -translate-x-1/2 -translate-y-full pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{ top: position.top, left: position.left }}
        >
          <div className="bg-bg-deep border border-border-glass rounded-lg px-3 py-2 text-xs text-text-main shadow-2xl max-w-[220px] text-center whitespace-normal">
            {content}
          </div>
        </div>
      )}
    </>
  )
}

interface InfoIconProps {
  tooltip: string
  className?: string
}

export const InfoIcon: React.FC<InfoIconProps> = ({ tooltip, className = '' }) => (
  <Tooltip content={tooltip}>
    <HelpIcon
      className={`w-3.5 h-3.5 text-text-dim/60 hover:text-neon-blue transition-colors ${className}`}
    />
  </Tooltip>
)

export default Tooltip
