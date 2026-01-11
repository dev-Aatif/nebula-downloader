/* eslint-disable react/prop-types */
import type { Download } from '../../../main/types'
import ThreeDotMenu from './ThreeDotMenu'
import { CheckIcon } from './icons'
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
  index
}) => {
  const { title, totalSizeInBytes, downloadedSizeInBytes, progress, status, speedValue, createdAt, updatedAt, outputPath } =
    download

  const remainingBytes = totalSizeInBytes - downloadedSizeInBytes

  // Calculate average speed for completed items
  const averageSpeed =
    status === 'completed' && updatedAt && createdAt
      ? totalSizeInBytes / ((new Date(updatedAt).getTime() - new Date(createdAt).getTime()) / 1000)
      : 0

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
      className={`grid-row download-row ${isSelected ? 'selected' : ''}`}
      onClick={(): void => onSelect(download.id)}
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
          className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
            isMultiSelected
              ? 'border-neon-blue bg-neon-blue/20 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
              : 'border-white/20 bg-black/20 hover:border-white/40'
          }`}
        >
          {isMultiSelected && <CheckIcon className="w-3 h-3 text-neon-blue" />}
        </div>
      </div>
      <div className="flex justify-center font-mono text-text-dim text-xs">
        {index + 1}
      </div>
      <div
        className="name-col truncate font-medium hover:text-neon-blue cursor-pointer transition-colors flex flex-col justify-center"
        onClick={() => onSelect(download.id)} // Click title to open details
      >
        <div className="truncate">{title}</div>
        <div className="text-[10px] text-text-dim truncate font-normal opacity-70" title={outputPath}>
          {outputPath || 'Location pending...'}
        </div>
        {status === 'error' && download.errorLogs && download.errorLogs.length > 0 && (
          <div className="text-[10px] text-neon-red truncate font-medium mt-0.5">
            Error: {download.errorLogs[download.errorLogs.length - 1].message}
          </div>
        )}
      </div>
      <div className="justify-center">
        <span className={`status-pill ${status}`}>
          {status === 'downloading' ? `${Math.floor(progress)}% ${eta ? `· ${eta}` : ''}` : status}
        </span>
      </div>
      <div className="justify-center text-neon-blue font-mono text-[11px]">
        {status === 'completed'
          ? averageSpeed && isFinite(averageSpeed) && averageSpeed > 0
            ? `${formatBytes(averageSpeed)}/s (avg)`
            : '—'
          : speedValue && speedValue > 0
            ? `${formatBytes(speedValue)}/s`
            : '—'}
      </div>
      <div
        className="justify-center font-mono text-[11px]"
        title={`Remaining: ${formatBytes(remainingBytes)}`}
      >
        {status === 'completed'
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
