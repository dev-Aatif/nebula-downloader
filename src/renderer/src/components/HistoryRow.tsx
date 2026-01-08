import { formatBytes } from '../utils'
import ThreeDotMenu from './ThreeDotMenu'
import { FileIcon } from './icons'
import type { Download } from '../../../main/types'
import React from 'react'

interface HistoryRowProps {
  download: Download
  index: number
  isSelected?: boolean
  onToggleSelect?: () => void
  onOpenFile: (id: string) => void
  onShowInFolder: (id: string) => void
  onDelete: (id: string) => void
}

const HistoryRow: React.FC<HistoryRowProps> = ({
  download,
  isSelected = false,
  onToggleSelect,
  onOpenFile,
  onShowInFolder,
  onDelete
}) => {
  const { title, totalSizeInBytes, updatedAt, thumbnail, url } = download

  // Parse format extension from formatId or default to 'mp4'/unknown
  // FormatId from yt-dlp is often like '137+140' or '22'.
  // We can try to guess extension or just show formatId for now, or just use 'MP4' (default merge)
  const format = 'MP4' // Simplified for now as we merge to mp4

  return (
    <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all group">
      {/* Checkbox */}
      {onToggleSelect && (
        <div
          className="flex-shrink-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
        >
          <div
            className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
              isSelected
                ? 'border-neon-blue bg-neon-blue/20 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
                : 'border-white/20 bg-black/20 hover:border-white/40'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-neon-blue" viewBox="0 0 12 12" fill="currentColor">
                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div className="w-16 h-9 flex-shrink-0 bg-black/40 rounded overflow-hidden relative border border-white/10">
        {thumbnail ? (
          <img src={thumbnail} alt="thumb" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-dim">
            <FileIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="font-medium text-text-main truncate" title={title || url}>
          {title || url}
        </div>
        <div className="text-xs text-text-dim mt-0.5 flex items-center gap-2">
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">{format}</span>
          <span>{formatBytes(totalSizeInBytes)}</span>
        </div>
      </div>

      {/* Date */}
      <div className="w-32 text-right text-xs text-text-dim">
        {new Date(updatedAt).toLocaleDateString()}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ThreeDotMenu
          download={download}
          onOpenFile={onOpenFile}
          onShowInFolder={onShowInFolder}
          onDelete={onDelete}
          onPause={() => {}}
          onResume={() => {}}
        />
      </div>
    </div>
  )
}

export default HistoryRow
