import React from 'react'
import { FileIcon, PauseIcon, XIcon, FolderIcon } from './icons' // Assuming you have these icons
import type { Download } from '../../../main/types'
import { formatBytes } from '../utils'

interface FloatingDownloadCardProps {
  download: Download | null
  onPause: (id: string) => void
  onCancel: (id: string) => void
  onOpenFolder: (id: string) => void
}

const FloatingDownloadCard: React.FC<FloatingDownloadCardProps> = ({
  download,
  onPause,
  onCancel,
  onOpenFolder
}) => {
  if (!download) {
    return null
  }

  const { id, title, progress, speed, totalSizeInBytes, downloadedSizeInBytes, speedValue } =
    download

  const getRemainingTime = (): string => {
    if (!speedValue || speedValue === 0 || !totalSizeInBytes || progress === 100) return '∞'
    const remainingBytes = totalSizeInBytes - downloadedSizeInBytes
    const seconds = remainingBytes / speedValue
    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  return (
    <div className="download-float">
      <div className="dl-thumb">
        <FileIcon className="w-9 h-9 text-neon-blue opacity-90" />
      </div>

      <div className="dl-center">
        <div className="dl-filename">{title}</div>

        <div className="dl-progress-row">
          <div className="dl-progress-track">
            <div className="dl-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="dl-percent">{Math.floor(progress)}%</div>
        </div>

        <div className="dl-meta">
          {speed || '...'} • {formatBytes(totalSizeInBytes)} • {getRemainingTime()} remaining
        </div>
      </div>

      <div className="dl-actions">
        <button title="Pause" onClick={() => onPause(id)}>
          <PauseIcon />
        </button>
        <button title="Cancel" onClick={() => onCancel(id)}>
          <XIcon />
        </button>
        <button title="Open Folder" onClick={() => onOpenFolder(id)}>
          <FolderIcon />
        </button>
      </div>
    </div>
  )
}

export default FloatingDownloadCard

// Add these styles to your main.css in a @layer components
/*
.download-float {
    position: fixed;
    right: 20px;
    bottom: 64px; 
    width: 420px;
    height: 96px;

    display: flex;
    gap: 14px;
    padding: 14px;

    background: linear-gradient(
        180deg,
        rgba(30,40,60,0.9),
        rgba(15,20,35,0.9)
    );

    border-radius: 14px;
    border: 1px solid rgba(0,243,255,0.25);
    backdrop-filter: blur(12px);

    box-shadow:
        0 10px 40px rgba(0,0,0,0.6),
        inset 0 0 0 1px rgba(255,255,255,0.05);
}

.dl-thumb {
    width: 64px;
    height: 64px;
    border-radius: 12px;

    display: flex;
    align-items: center;
    justify-content: center;

    background: rgba(0,243,255,0.08);
    border: 1px solid rgba(0,243,255,0.25);
}

.dl-thumb svg {
    width: 34px;
    height: 34px;
    fill: var(--neon-blue);
    opacity: 0.9;
}

.dl-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    min-width: 0;
}

.dl-filename {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dl-progress-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.dl-progress-track {
    flex: 1;
    height: 6px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    overflow: hidden;
}

.dl-progress-fill {
    height: 100%;
    background: linear-gradient(
        90deg,
        #7dd3ff,
        var(--neon-blue)
    );
    box-shadow: 0 0 10px var(--neon-blue);
}

.dl-percent {
    font-size: 12px;
    color: var(--text-dim);
    width: 32px;
    text-align: right;
}

.dl-meta {
    font-size: 11px;
    color: var(--text-dim);
}

.dl-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.dl-actions button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    cursor: pointer;

    background: rgba(255,255,255,0.08);
    color: var(--text-main);
    font-size: 14px;

    transition: 0.2s;
}

.dl-actions button:hover {
    background: rgba(0,243,255,0.2);
    color: var(--neon-blue);
}
*/
