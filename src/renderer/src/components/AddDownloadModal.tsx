import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ClipboardIcon, DownloadIcon, ChevronDownIcon, SettingsIcon } from './icons'
import { InfoIcon } from './Tooltip'
import { isValidVideoUrl, getUrlValidationMessage } from '../utils/urlValidator'
import PlaylistModal from './PlaylistModal'
import type { PlaylistItem } from '../../../main/types'

interface AddDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (url: string, formatId?: string) => void
}

interface VideoMetadata {
  title: string
  thumbnail?: string
  duration?: string
}

// Format presets with user-friendly labels - optimized for Windows compatibility
const FORMAT_PRESETS = [
  {
    id: 'best',
    label: '🎬 Best Quality',
    value: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
    description: 'MP4 • Highest resolution',
    tooltip: 'Best for watching on TV or large screens. Larger file size but maximum quality.'
  },
  {
    id: 'quick',
    label: '🚀 Quick',
    value: 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
    description: 'MP4 • 720p max • Fast',
    tooltip: 'Faster download with smaller file size. Good for mobile devices or limited storage.'
  },
  {
    id: 'audio',
    label: '🎧 Audio',
    value: 'bestaudio[ext=m4a]/bestaudio/best',
    description: 'M4A/MP3 • Audio only',
    tooltip: 'Extract audio only. Perfect for music, podcasts, or listening offline.'
  },
  {
    id: 'default',
    label: '⚡ Smart',
    value: '',
    description: 'Uses app settings',
    tooltip: 'Uses your default format from Settings. Good for consistent downloads.'
  }
]

const AddDownloadModal: React.FC<AddDownloadModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [url, setUrl] = useState('')
  const [isPasting, setIsPasting] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('default')
  const [downloadSubtitles, setDownloadSubtitles] = useState(false)
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [isBatchMode, setIsBatchMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchedUrlRef = useRef<string>('')

  // Playlist detection state
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])
  const [isCheckingPlaylist, setIsCheckingPlaylist] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)

  // Extract URLs from batch input
  const batchUrls = isBatchMode
    ? url
        .split(/[\n,]/) // Split by newline or comma
        .map((u) => u.trim())
        .filter((u) => isValidVideoUrl(u))
    : []

  // Real-time URL validation
  const isUrlValid = isBatchMode
    ? batchUrls.length > 0
    : url.trim().length > 0 && isValidVideoUrl(url.trim())

  // Auto-fetch metadata when valid URL is entered (debounced)
  const fetchMetadata = useCallback(async (videoUrl: string) => {
    if (!videoUrl || !isValidVideoUrl(videoUrl) || videoUrl === lastFetchedUrlRef.current) {
      return
    }

    setIsFetchingMetadata(true)
    lastFetchedUrlRef.current = videoUrl

    try {
      const result = await window.api.fetchMetadata(videoUrl)
      if (result) {
        setMetadata(result)
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err)
    } finally {
      setIsFetchingMetadata(false)
    }
  }, [])

  // Debounce metadata fetch
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    if (isUrlValid && url !== lastFetchedUrlRef.current) {
      fetchTimeoutRef.current = setTimeout(() => {
        fetchMetadata(url.trim())
      }, 800)
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [url, isUrlValid, fetchMetadata])

  // Load saved preferences when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load last used preferences
      window.api.getSettings().then((settings) => {
        if (settings.lastPreset && FORMAT_PRESETS.some((p) => p.id === settings.lastPreset)) {
          setSelectedPreset(settings.lastPreset)
        }
        if (settings.downloadSubtitles !== undefined) {
          setDownloadSubtitles(settings.downloadSubtitles)
        }
      })
      handlePasteFromClipboard()
      inputRef.current?.focus()
    } else {
      // Save preferences when modal closes (only if user made a selection)
      if (selectedPreset !== 'default' || downloadSubtitles) {
        window.api.updateSettings({
          lastPreset: selectedPreset,
          downloadSubtitles: downloadSubtitles
        })
      }
      setUrl('')
      setIsAdding(false)
      setShowAdvanced(false)
      setMetadata(null)
      lastFetchedUrlRef.current = ''
    }
  }, [isOpen, selectedPreset, downloadSubtitles])

  const handlePasteFromClipboard = async (): Promise<void> => {
    setIsPasting(true)
    try {
      const text = await window.api.readClipboard()
      if (text?.startsWith('http')) {
        setUrl(text.trim())
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    } finally {
      setIsPasting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  const handleAdd = async (): Promise<void> => {
    if (!isUrlValid || isAdding || isCheckingPlaylist) return

    // Clear any pending metadata fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    // Check if it's a playlist first (only for single URL mode)
    if (!isBatchMode && !playlistItems.length) {
      setIsCheckingPlaylist(true)
      try {
        const items = await window.api.checkPlaylist(url.trim())
        if (items && items.length > 1) {
          setPlaylistItems(items)
          setShowPlaylistModal(true)
          setIsCheckingPlaylist(false)
          return
        }
      } catch (err) {
        console.error('Playlist check failed:', err)
      }
      setIsCheckingPlaylist(false)
    }

    // Proceed with regular download
    setIsAdding(true)
    const preset = FORMAT_PRESETS.find((p) => p.id === selectedPreset)
    const formatId = preset?.value || undefined

    setTimeout(() => {
      if (isBatchMode && batchUrls.length > 0) {
        batchUrls.forEach((batchUrl) => {
          onAdd(batchUrl, formatId)
        })
      } else {
        onAdd(url, formatId)
      }
      setUrl('')
      setPlaylistItems([])
      setIsAdding(false)
      onClose()
    }, 150)
  }

  const handleDownloadPlaylistItems = (selectedUrls: string[]): void => {
    const preset = FORMAT_PRESETS.find((p) => p.id === selectedPreset)
    const formatId = preset?.value || undefined
    selectedUrls.forEach((selectedUrl) => {
      onAdd(selectedUrl, formatId)
    })
    setShowPlaylistModal(false)
    setPlaylistItems([])
    setUrl('')
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && isUrlValid && !isAdding && !isCheckingPlaylist) {
      handleAdd()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const getButtonClasses = (): string => {
    const baseClasses = 'tool-btn btn-lg transition-all duration-200 flex items-center gap-2'
    if (isAdding) {
      return `${baseClasses} bg-neon-green/20 text-neon-green border-neon-green/50 cursor-wait`
    }
    if (isUrlValid) {
      return `${baseClasses} primary hover:scale-105 hover:shadow-lg hover:shadow-neon-blue/30`
    }
    return `${baseClasses} opacity-50 cursor-not-allowed bg-white/5 text-text-dim`
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal max-w-md"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add New Download</h2>
          <button
            type="button"
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${isBatchMode ? 'border-neon-blue bg-neon-blue/20 text-neon-blue' : 'border-border-glass text-text-dim hover:text-text-main'}`}
          >
            {isBatchMode ? '📋 Batch Mode' : 'Single URL'}
          </button>
        </div>
        <p className="text-sm text-text-dim mb-4">
          {isBatchMode
            ? 'Enter multiple URLs (one per line or comma-separated).'
            : 'Enter a video or playlist URL to start downloading.'}
        </p>

        {/* Input with inline paste button */}
        <div className="relative">
          {isBatchMode ? (
            <textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=...&#10;https://vimeo.com/...&#10;https://..."
              rows={4}
              className="w-full bg-bg-deep border border-border-glass rounded-md p-2 text-sm focus:outline-none focus:border-neon-blue resize-none font-mono text-xs"
            />
          ) : (
            <>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className={`w-full bg-bg-deep border rounded-md p-2 pr-12 text-sm focus:outline-none transition-colors ${
                  url && !isUrlValid
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-border-glass focus:border-neon-blue'
                }`}
              />
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isPasting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10 text-text-dim hover:text-neon-blue transition-colors disabled:opacity-50"
                title="Paste from clipboard"
              >
                <ClipboardIcon className={`w-4 h-4 ${isPasting ? 'animate-pulse' : ''}`} />
              </button>
            </>
          )}
        </div>

        {/* Batch URL count or Validation hint */}
        {isBatchMode ? (
          <p
            className={`text-xs mt-1.5 ${batchUrls.length > 0 ? 'text-neon-blue' : 'text-text-dim'}`}
          >
            {batchUrls.length > 0
              ? `✓ ${batchUrls.length} valid URL${batchUrls.length > 1 ? 's' : ''} detected`
              : 'Paste URLs separated by new lines or commas'}
          </p>
        ) : (
          url &&
          !isUrlValid && (
            <p className="text-xs text-red-400 mt-1.5">
              {getUrlValidationMessage(url) || 'Please enter a valid video URL'}
            </p>
          )
        )}

        {/* Metadata Preview */}
        {(isFetchingMetadata || metadata) && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-border-glass animate-in fade-in">
            {isFetchingMetadata ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-10 bg-white/10 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-white/10 rounded w-1/4 animate-pulse" />
                </div>
              </div>
            ) : (
              metadata && (
                <div className="flex items-center gap-3">
                  {metadata.thumbnail ? (
                    <img
                      src={metadata.thumbnail}
                      alt=""
                      className="w-16 h-10 object-cover rounded bg-black"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-16 h-10 bg-white/10 rounded flex items-center justify-center">
                      <DownloadIcon className="w-5 h-5 text-text-dim" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-main font-medium truncate">{metadata.title}</p>
                    {metadata.duration && (
                      <p className="text-xs text-text-dim">{metadata.duration}</p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Expandable Advanced Options */}
        <div className="mt-4 border border-border-glass rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm text-text-dim">
              <SettingsIcon className="w-4 h-4" />
              Advanced Options
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 text-text-dim transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${showAdvanced ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Format Presets */}
              <div>
                <label className="text-xs text-text-dim uppercase tracking-wide mb-2 block">
                  Quality Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FORMAT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`p-2 rounded-lg border text-left transition-all relative ${
                        selectedPreset === preset.id
                          ? 'border-neon-blue bg-neon-blue/10 text-text-main'
                          : 'border-border-glass hover:border-white/30 text-text-dim hover:text-text-main'
                      }`}
                    >
                      <div className="absolute top-1 right-1">
                        <InfoIcon tooltip={preset.tooltip} />
                      </div>
                      <div className="text-sm font-medium pr-4">{preset.label}</div>
                      <div className="text-xs opacity-60">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtitles Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-text-main">Download Subtitles</div>
                  <div className="text-xs text-text-dim">Include captions if available</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDownloadSubtitles(!downloadSubtitles)}
                  className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    downloadSubtitles ? 'bg-neon-blue' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      downloadSubtitles ? 'translate-x-6' : 'translate-x-1'
                    }`}
                    style={{ marginTop: '4px' }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="tool-btn btn-lg">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className={getButtonClasses()}
            disabled={!isUrlValid || isAdding || isCheckingPlaylist}
          >
            <DownloadIcon
              className={`w-4 h-4 ${isAdding || isCheckingPlaylist ? 'animate-bounce' : ''}`}
            />
            {isCheckingPlaylist ? 'Checking...' : isAdding ? 'Adding...' : 'Add Download'}
          </button>
        </div>
      </div>

      {/* Playlist Selection Modal */}
      {showPlaylistModal && playlistItems.length > 0 && (
        <PlaylistModal
          playlistItems={playlistItems}
          onClose={() => {
            setShowPlaylistModal(false)
            setPlaylistItems([])
          }}
          onDownloadSelected={handleDownloadPlaylistItems}
        />
      )}
    </div>
  )
}

export default AddDownloadModal
