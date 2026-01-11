import React, { useState } from 'react'
import type { Download } from '../../../main/types'
import { FolderIcon, ExternalLinkIcon, FileIcon } from './icons'
import { formatBytes } from '../utils'

interface DownloadDetailsProps {
  download: Download
}

const DownloadDetails: React.FC<DownloadDetailsProps> = ({ download }) => {
  const [activeTab, setActiveTab] = useState<'General' | 'Progress' | 'Log'>('General')

  const {
    title,
    totalSizeInBytes,
    downloadedSizeInBytes,
    progress,
    speed,
    eta,
    url,
    outputPath,
    createdAt
  } = download

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString()
  }

  return (
    <div className="details-pane">
      <div className="details-tabs">
        {(['General', 'Progress', 'Log'] as const).map((tab) => (
          <div
            key={tab}
            className={`details-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={(): void => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
        <div className="spacer"></div>
        <div className="flex items-center gap-4 px-4 h-full border-l border-white/5 opacity-50 text-[10px] uppercase tracking-wider font-semibold">
          {download.status}
        </div>
      </div>

      <div className="details-content">
        {activeTab === 'General' && (
          <>
            <div className="details-thumb overflow-hidden bg-black/40">
              {download.thumbnail ? (
                <img src={download.thumbnail} alt={title} className="w-full h-full object-cover" />
              ) : (
                <FileIcon className="w-12 h-12 text-neon-blue/40" />
              )}
            </div>

            <div className="details-info">
              <div className="details-title select-text">{title}</div>
              <div className="flex items-center gap-4 mt-1 text-xs text-text-dim border-b border-white/5 pb-2 mb-2">
                <span className="uppercase font-bold tracking-wider">{download.status}</span>
                <span>•</span>
                <span>{formatBytes(totalSizeInBytes)}</span>
                {download.formatId && (
                  <>
                    <span>•</span>
                    <span className="font-mono bg-white/5 px-1.5 rounded">
                      {download.formatId}
                    </span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-text-dim font-bold tracking-tight">
                    Added On
                  </span>
                  <span className="text-xs text-text-main">{formatDate(createdAt)}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-text-dim font-bold tracking-tight">
                    Save Location
                  </span>
                  <span
                    className="text-xs flex items-center gap-1.5 text-text-main truncate hover:text-neon-blue cursor-pointer transition-colors"
                    title={outputPath}
                    onClick={() => window.api.showInFolder(download.id)}
                  >
                    <FolderIcon className="w-3.5 h-3.5 opacity-60" /> {outputPath || 'Pending...'}
                  </span>
                </div>

                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] uppercase text-text-dim font-bold tracking-tight">
                    Source URL
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="details-link truncate flex items-center gap-1.5 text-xs text-neon-blue hover:underline"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5" /> {url}
                  </a>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'Progress' && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] uppercase text-text-dim font-bold tracking-tight">
                  Transfer Progress
                </span>
                <span className="text-xs font-mono font-bold text-neon-blue">
                  {progress.toFixed(1)}%
                </span>
              </div>
              <div className="details-progress-bar h-2">
                <div
                  className="details-progress-fill bg-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.4)]"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <StatSquare
                label="Downloaded"
                value={downloadedSizeInBytes ? formatBytes(downloadedSizeInBytes) : 'N/A'}
              />
              <StatSquare label="Speed" value={speed || '0 KB/s'} />
              <StatSquare label="ETA" value={eta || 'Finished'} />
              <StatSquare label="Status" value={download.status} highlight />
            </div>
          </div>
        )}

        {activeTab === 'Log' && (
          <div className="flex-1 overflow-y-auto bg-black/20 rounded border border-white/5 p-3">
            <div className="font-mono text-[11px] space-y-1">
              {/* Download initialized - use createdAt */}
              <div className="text-text-dim">
                [{new Date(createdAt).toLocaleTimeString()}] Download initialized
              </div>
              
              {/* Show current status with updatedAt timestamp */}
              {download.status === 'downloading' && (
                <div className="text-neon-blue/80">
                  [{new Date(download.updatedAt || createdAt).toLocaleTimeString()}] Downloading... {download.progress.toFixed(1)}%
                </div>
              )}
              {download.status === 'paused' && (
                <div className="text-yellow-500/80">
                  [{new Date(download.updatedAt || createdAt).toLocaleTimeString()}] Download paused
                </div>
              )}
              {download.status === 'completed' && (
                <div className="text-neon-green/80">
                  [{new Date(download.updatedAt || createdAt).toLocaleTimeString()}] Download completed successfully
                </div>
              )}
              {download.status === 'queued' && (
                <div className="text-text-dim">
                  [{new Date(download.updatedAt || createdAt).toLocaleTimeString()}] Waiting in queue...
                </div>
              )}
              {download.status === 'cancelled' && (
                <div className="text-text-dim">
                  [{new Date(download.updatedAt || createdAt).toLocaleTimeString()}] Download cancelled
                </div>
              )}
              
              {/* Error logs with real timestamps */}
              {download.errorLogs?.map((log, i) => (
                <div key={i} className="text-neon-red/80">
                  [{new Date(log.timestamp).toLocaleTimeString()}] ERROR: {log.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatSquare({
  label,
  value,
  highlight
}: {
  label: string
  value: string
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded flex flex-col gap-1">
      <span className="text-[9px] uppercase text-text-dim font-bold tracking-wider">{label}</span>
      <span className={`text-sm font-mono truncate ${highlight ? 'text-neon-blue' : ''}`}>
        {value}
      </span>
    </div>
  )
}

export default DownloadDetails
