import React, { useEffect, useState } from 'react'

interface UndoToastProps {
  message: string
  duration?: number
  onUndo: () => void
  onTimeout: () => void
}

export default function UndoToast({
  message,
  duration = 5000,
  onUndo,
  onTimeout
}: UndoToastProps): React.JSX.Element {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        onTimeout()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration, onTimeout])

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-card border border-border-glass rounded-xl shadow-2xl overflow-hidden min-w-[300px]">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-sm text-text-main">{message}</span>
          <button
            onClick={onUndo}
            className="text-neon-blue font-medium text-sm hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-blue/50 rounded"
          >
            Undo
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-neon-blue transition-all duration-50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
