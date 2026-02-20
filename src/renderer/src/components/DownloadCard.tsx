import type { Download, DownloadError } from '../../../main/types' // Import DownloadError
import React, { useState } from 'react' // Import useState
import ProgressBar from './ProgressBar'
import ThreeDotMenu from './ThreeDotMenu'
import { formatBytes } from '../utils'

export default function DownloadCard({
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
  const { thumbnail, status, progress, speed, eta, totalSizeInBytes, downloadedSizeInBytes } = download
  const [showErrorDetails, setShowErrorDetails] = useState(false) // State to toggle error details visibility

  const remainingSizeInBytes = totalSizeInBytes - downloadedSizeInBytes

  return (
    <div className="bg-card rounded-lg p-4 flex flex-col gap-4 border border-border-glass">
      {' '}
      {/* Changed to flex-col to accommodate error details */}
      <div className="flex gap-4 items-center">
        <div className="w-[120px] h-[68px] bg-card-alt rounded flex-shrink-0 overflow-hidden">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <span className="text-2xl">🎬</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-2 overflow-hidden pl-4">
          <span
            className="font-bold whitespace-nowrap overflow-hidden text-ellipsis text-foreground"
            title={download.title}
          >
            {download.title || download.url}
          </span>

          {(status === 'downloading' || status === 'paused') && progress > 0 ? (
            <>
              <ProgressBar download={download} />
              <div className="text-xs text-muted-foreground">
                <span>{progress.toFixed(1)}%</span>
                <span className="float-right">
                  {formatBytes(downloadedSizeInBytes)} / {formatBytes(totalSizeInBytes)} (
                  {formatBytes(remainingSizeInBytes)} remaining) | {speed} | {eta} ETA
                </span>
              </div>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{status}</span>
          )}
        </div>
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
      {/* Error Details Section */}
      {status === 'error' && download.errorLogs && download.errorLogs.length > 0 && (
        <div className="mt-2 p-3 bg-red-900 bg-opacity-30 rounded-md">
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className="text-sm font-semibold text-red-400 hover:text-red-300 focus:outline-none"
          >
            {showErrorDetails ? 'Hide Error Details' : 'View Error Details'} (
            {download.errorLogs.length})
          </button>
          {showErrorDetails && (
            <div className="mt-2 text-xs text-red-200 max-h-48 overflow-y-auto">
              {download.errorLogs.map((error: DownloadError, index: number) => (
                <div
                  key={index}
                  className="border-t border-red-700 pt-2 mt-2 first:border-none first:pt-0 first:mt-0"
                >
                  <p>
                    <span className="font-bold">Time:</span>{' '}
                    {new Date(error.timestamp).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-bold">Type:</span> {error.type}
                  </p>
                  <p>
                    <span className="font-bold">Message:</span> {error.message}
                  </p>
                  {error.details && (
                    <div className="mt-1">
                      <span className="font-bold">Details:</span>
                      <pre className="whitespace-pre-wrap break-words bg-red-950 p-2 rounded mt-1 text-red-100">
                        {error.details}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
