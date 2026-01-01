/* eslint-disable react/prop-types */
import type { Download } from '../../../main/types'
import ThreeDotMenu from './ThreeDotMenu'
import { FolderIcon, CheckIcon } from './icons'
import { formatBytes } from '../utils'

interface DownloadRowProps {
  download: Download
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onDelete: (id: string) => void
  onOpenFile: (id: string) => void
  onShowInFolder: (id: string) => void
}

const DownloadRow: React.FC<DownloadRowProps> = ({
  download,
  isSelected,
  onSelect,
  onPause,
  onResume,
  onDelete,
  onOpenFile,
  onShowInFolder
}) => {
  const { title, totalSizeInBytes, downloadedSizeInBytes, progress, status, speedValue } = download

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
      className={`grid-row download-row ${isSelected ? 'selected' : ''}`}
      onClick={(): void => onSelect(download.id)}
    >
      <div className="flex justify-center">
        <div
          className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-all ${
            isSelected
              ? 'border-neon-blue bg-neon-blue/20 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
              : 'border-white/10 bg-white/5'
          }`}
        >
          {isSelected && <CheckIcon className="w-2.5 h-2.5 text-neon-blue" />}
        </div>
      </div>
      <div className="flex justify-center">
        <FolderIcon className={`w-4 h-4 ${isSelected ? 'text-neon-blue' : 'text-text-dim'}`} />
      </div>
      <div className="name-col truncate font-medium">{title}</div>
      <div className="justify-center">
        <span className={`status-pill ${status}`}>
          {status === 'downloading' ? `${Math.floor(progress)}% ${eta ? `· ${eta}` : ''}` : status}
        </span>
      </div>
      <div className="justify-center text-neon-blue font-mono text-[11px]">
        {speedValue && speedValue > 0 ? `${formatBytes(speedValue)}/s` : '—'}
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
          onDelete={onDelete}
          onOpenFile={onOpenFile}
          onShowInFolder={onShowInFolder}
        />
      </div>
    </div>
  )
}

export default DownloadRow
