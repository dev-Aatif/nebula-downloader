import React from 'react'

interface SetupModalProps {
  isOpen: boolean
  progress: number
  status: 'downloading' | 'complete' | 'error'
  error?: string
}

/**
 * SetupModal - First-run setup modal for downloading yt-dlp
 * Shows a clean, minimal progress indicator while yt-dlp downloads
 */
function SetupModal({
  isOpen,
  progress,
  status,
  error
}: SetupModalProps): React.ReactElement | null {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 shadow-2xl border border-gray-700/50">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-white mb-2">
          {status === 'error' ? 'Setup Failed' : 'Setting up Nebula Downloader'}
        </h2>

        {/* Subtitle */}
        <p className="text-gray-400 text-center text-sm mb-8">
          {status === 'downloading' && 'Downloading yt-dlp... This only happens once.'}
          {status === 'complete' && 'Setup complete! Starting app...'}
          {status === 'error' &&
            (error || 'Failed to download yt-dlp. Please check your internet connection.')}
        </p>

        {/* Progress Bar */}
        {status === 'downloading' && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Downloading...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Complete State */}
        {status === 'complete' && (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Helpful note */}
        {status === 'downloading' && (
          <p className="text-gray-500 text-xs text-center mt-6">
            yt-dlp is required for downloading videos. Size: ~18 MB
          </p>
        )}
      </div>
    </div>
  )
}

export default SetupModal
