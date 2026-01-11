import React, { useEffect, useCallback } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    },
    [isOpen, onConfirm, onCancel]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
      : 'bg-neon-blue/20 text-neon-blue border-neon-blue/50 hover:bg-neon-blue/30'

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop with fade animation */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-[#0d111a] border border-white/10 rounded-lg shadow-2xl w-[400px] max-w-[90vw] animate-in zoom-in-95 fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-text-main">{title}</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-text-dim">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md bg-white/5 text-text-dim border border-white/10 hover:bg-white/10 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${confirmButtonClass}`}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
