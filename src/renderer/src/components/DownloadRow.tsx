/* eslint-disable react/prop-types */
import type { Download } from '../../../main/types'
import ThreeDotMenu from './ThreeDotMenu'
import { CheckIcon, PlayIcon, PauseIcon, AlertCircleIcon, ClockIcon } from './icons'
import { formatBytes } from '../utils'

interface DownloadRowProps {
  download: Download
  index: number
  isSelected: boolean
  isMultiSelected?: boolean
  onSelect: (id: string) => void
  onMultiSelect?: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onRetry: (id: string) => void
  onDelete: (id: string) => void
  onOpenFile: (id: string) => void
  onShowInFolder: (id: string) => void
  onContextMenu?: (e: React.MouseEvent) => void
  viewMode?: 'normal' | 'simple'
}

const DownloadRow: React.FC<DownloadRowProps> = ({
  download,
  isSelected,
  isMultiSelected = false,
  onSelect,
  onMultiSelect,
  onPause,
  onResume,
  onRetry,
  onDelete,
  onOpenFile,
  onShowInFolder,
  onContextMenu,
  index,
  viewMode = 'normal'
}) => {
  const {
    title,
    totalSizeInBytes,
    downloadedSizeInBytes,
    progress,
    status,
    speedValue
  } = download

  const remainingBytes = totalSizeInBytes - downloadedSizeInBytes


  const getEta = (): string => {
    if (!speedValue || speedValue === 0 || !totalSizeInBytes || progress === 100) return ''
    const remainingSeconds = remainingBytes / speedValue
    if (isNaN(remainingSeconds) || !isFinite(remainingSeconds)) return ''
    if (remainingSeconds < 60) return `${Math.floor(remainingSeconds)}s`
    if (remainingSeconds < 3600) return `${Math.floor(remainingSeconds / 60)}m`
    return `${Math.floor(remainingSeconds / 3600)}h`
  }

  const eta = getEta()

  return (
    <div
      className={`grid-row download-row ${isSelected ? 'selected' : ''} ${viewMode === 'simple' ? 'py-1 min-h-[40px]' : ''}`}
      onClick={(): void => onSelect(download.id)}
      onContextMenu={onContextMenu}
    >
      <div
        className="flex justify-center cursor-pointer"
        onClick={(e): void => {
          e.stopPropagation()
          if (onMultiSelect) {
            onMultiSelect(download.id)
          }
        }}
      >
        <div
          className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${isMultiSelected
              ? 'border-neon-blue bg-neon-blue/20 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
              : 'border-white/20 bg-black/20 hover:border-white/40'
            }`}
        >
          {isMultiSelected && <CheckIcon className="w-3 h-3 text-neon-blue" />}
        </div>
      </div>
      <div className="flex justify-center font-mono text-text-dim text-xs">{index + 1}</div>
      <div
        className="name-col truncate font-medium hover:text-neon-blue cursor-pointer transition-colors flex flex-col justify-center"
        onClick={() => onSelect(download.id)} // Click title to open details
      >
        <div className={`truncate ${viewMode === 'simple' ? 'text-sm' : ''}`}>{title}</div>
        {viewMode === 'normal' && (
          <div className="text-xs text-text-dim/70">{formatBytes(download.totalSizeInBytes)}</div>
        )}
        {viewMode === 'normal' && status === 'error' && download.errorLogs && download.errorLogs.length > 0 && (
          <div className="text-[10px] text-neon-red truncate font-medium mt-0.5">
            Error: {download.errorLogs[download.errorLogs.length - 1].message}
          </div>
        )}
      </div>
      <div className="justify-center">
        <span className={`status-pill ${status} flex items-center gap-1 ${viewMode === 'simple' ? 'text-[10px] px-1.5 py-0.5' : ''}`}>
          {status === 'downloading' && <PlayIcon className="w-3 h-3" />}
          {status === 'completed' && <CheckIcon className="w-3 h-3" />}
          {status === 'paused' && <PauseIcon className="w-3 h-3" />}
          {status === 'error' && <AlertCircleIcon className="w-3 h-3" />}
          {status === 'queued' && <ClockIcon className="w-3 h-3" />}
          {status === 'downloading' ? `${Math.floor(progress)}% ${eta ? `· ${eta}` : ''}` : status}
        </span>
      </div>
      <div
        className="justify-center font-mono text-[11px]"
        title={`Remaining: ${formatBytes(remainingBytes)}`}
      >
        {status === 'downloading'
          ? `${formatBytes(downloadedSizeInBytes)} / ${formatBytes(totalSizeInBytes)}`
          : status === 'completed'
            ? formatBytes(totalSizeInBytes)
            : `${formatBytes(downloadedSizeInBytes)} / ${formatBytes(totalSizeInBytes)}`}
      </div>
      <div className="justify-center text-[11px] opacity-60">
        {new Date(download.createdAt).toLocaleDateString()}
      </div>
      <div
        onClick={(e: React.MouseEvent): void => e.stopPropagation()}
        className="flex justify-center"
      >
        <ThreeDotMenu
          download={download}
          onPause={onPause}
          onResume={onResume}
          onRetry={onRetry}
          onDelete={onDelete}
          onOpenFile={onOpenFile}
          onShowInFolder={onShowInFolder}
        />
      </div>
    </div>
  )
}

export default DownloadRow
