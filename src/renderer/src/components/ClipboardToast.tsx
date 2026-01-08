import React, { useEffect, useState } from 'react'
import { truncateUrl } from '../utils/urlValidator'
import { DownloadIcon, CloseIcon } from './icons'

interface ClipboardToastProps {
  url: string
  onDownload: (url: string) => void
  onDismiss: () => void
}

const ClipboardToast: React.FC<ClipboardToastProps> = ({ url, onDownload, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10)

    // Auto-dismiss after 8 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss()
    }, 8000)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(dismissTimer)
    }
  }, [])

  const handleDismiss = (): void => {
    setIsLeaving(true)
    setTimeout(() => {
      onDismiss()
    }, 300) // Match animation duration
  }

  const handleDownload = (): void => {
    onDownload(url)
    handleDismiss()
  }

  return (
    <div
      className={`
        fixed bottom-16 left-1/2 -translate-x-1/2 z-50
        bg-card/95 backdrop-blur-lg border border-border-glass
        rounded-xl shadow-2xl shadow-black/50
        px-4 py-3 flex items-center gap-4
        transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-neon-blue/20 flex items-center justify-center flex-shrink-0">
        <DownloadIcon className="w-5 h-5 text-neon-blue" />
      </div>

      {/* Content */}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-text-main">Video link detected</span>
        <span className="text-xs text-text-dim truncate max-w-[300px]" title={url}>
          {truncateUrl(url, 45)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <button
          onClick={handleDownload}
          className="px-4 py-1.5 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue text-sm font-medium rounded-lg transition-colors"
        >
          Download
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-text-dim hover:text-text-main"
          title="Dismiss"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default ClipboardToast
