import React, { useState, useRef, useEffect } from 'react'
import type { Download } from '../../../main/types'

export default function ThreeDotMenu({
  download,
  onPause,
  onResume,
  onRetry,
  onDelete,
  onOpenFile,
  onShowInFolder
}: {
  download: Download
  onPause: (id: string) => void
  onResume: (id: string) => void
  onRetry: (id: string) => void
  onDelete: (id: string) => void
  onOpenFile: (id: string) => void
  onShowInFolder: (id: string) => void
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuRef])

  const menuItemClass =
    'px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors text-[13px] flex items-center gap-2'

  return (
    <div ref={menuRef} className="relative">
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-text-dim hover:text-text-main"
        onClick={(): void => setIsOpen(!isOpen)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 bg-[#161b22] border border-white/10 rounded-md shadow-2xl z-[100] w-48 overflow-hidden backdrop-blur-xl">
          {download.status === 'downloading' && (
            <div
              className={menuItemClass}
              onClick={(): void => {
                onPause(download.id)
                setIsOpen(false)
              }}
            >
              <PauseIcon /> Pause Download
            </div>
          )}
          {download.status === 'paused' && (
            <div
              className={menuItemClass}
              onClick={(): void => {
                onResume(download.id)
                setIsOpen(false)
              }}
            >
              <PlayIcon /> Resume Download
            </div>
          )}
          {download.status === 'error' && (
            <div
              className={`${menuItemClass} text-neon-blue hover:bg-neon-blue/10`}
              onClick={(): void => {
                onRetry(download.id)
                setIsOpen(false)
              }}
            >
              <RetryIcon /> Retry Download
            </div>
          )}

          <div className="h-px bg-white/5 mx-2 my-1" />

          <div
            className={menuItemClass}
            onClick={(): void => {
              onOpenFile(download.id)
              setIsOpen(false)
            }}
          >
            <OpenFileIcon /> Open File
          </div>
          <div
            className={menuItemClass}
            onClick={(): void => {
              onShowInFolder(download.id)
              setIsOpen(false)
            }}
          >
            <FolderOpenIcon /> Show in Folder
          </div>

          <div className="h-px bg-white/5 mx-2 my-1" />

          <div
            className={`${menuItemClass} text-[#f85149] hover:bg-red-500/10`}
            onClick={(): void => {
              onDelete(download.id)
              setIsOpen(false)
            }}
          >
            <TrashIcon /> Delete File
          </div>
        </div>
      )}
    </div>
  )
}

// Inline icons for the menu
const PauseIcon = (): React.JSX.Element => (
  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)
const PlayIcon = (): React.JSX.Element => (
  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
)
const OpenFileIcon = (): React.JSX.Element => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
)
const FolderOpenIcon = (): React.JSX.Element => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)
const TrashIcon = (): React.JSX.Element => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const RetryIcon = (): React.JSX.Element => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
)
