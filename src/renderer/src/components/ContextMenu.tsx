import React, { useEffect, useRef } from 'react'
import type { Download } from '../../../main/types'

interface ContextMenuProps {
  x: number
  y: number
  download: Download
  onClose: () => void
  onPause: () => void
  onResume: () => void
  onRetry: () => void
  onDelete: () => void
  onOpenFile: () => void
  onShowInFolder: () => void
  onCopyUrl: () => void
}

export default function ContextMenu({
  x,
  y,
  download,
  onClose,
  onPause,
  onResume,
  onRetry,
  onDelete,
  onOpenFile,
  onShowInFolder,
  onCopyUrl
}: ContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const MenuItem = ({
    label,
    onClick,
    disabled = false,
    danger = false
  }: {
    label: string
    onClick: () => void
    disabled?: boolean
    danger?: boolean
  }): React.JSX.Element => (
    <button
      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
        disabled
          ? 'text-text-dim/50 cursor-not-allowed'
          : danger
            ? 'text-red-400 hover:bg-red-500/10'
            : 'text-text-main hover:bg-white/10'
      }`}
      onClick={() => {
        if (!disabled) {
          onClick()
          onClose()
        }
      }}
      disabled={disabled}
    >
      {label}
    </button>
  )

  const isDownloading = download.status === 'downloading'
  const isPaused = download.status === 'paused'
  const isQueued = download.status === 'queued'
  const isError = download.status === 'error'
  const isCompleted = download.status === 'completed'

  return (
    <div
      ref={menuRef}
      className="fixed bg-card border border-border-glass rounded-lg shadow-xl py-1 min-w-[160px] z-50 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
    >
      {/* Pause/Resume */}
      {(isDownloading || isQueued) && (
        <MenuItem label="Pause" onClick={onPause} />
      )}
      {isPaused && <MenuItem label="Resume" onClick={onResume} />}
      {isError && <MenuItem label="Retry" onClick={onRetry} />}

      {/* File operations */}
      {isCompleted && (
        <>
          <MenuItem label="Open File" onClick={onOpenFile} />
          <MenuItem label="Show in Folder" onClick={onShowInFolder} />
        </>
      )}

      {/* Common actions */}
      <MenuItem label="Copy URL" onClick={onCopyUrl} />

      {/* Divider */}
      <div className="border-t border-border-glass my-1" />

      {/* Delete */}
      <MenuItem label="Delete" onClick={onDelete} danger />
    </div>
  )
}
