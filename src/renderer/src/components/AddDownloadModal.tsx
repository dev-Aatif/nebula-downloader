import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ClipboardIcon, DownloadIcon, SettingsIcon } from './icons'

import { isValidVideoUrl, getUrlValidationMessage } from '../utils/urlValidator'
import PlaylistModal from './PlaylistModal'
import type { PlaylistItem } from '../../../main/types'
import {
  RESOLUTIONS,
  CONTAINERS,
  AUDIO_FORMATS,
  generateVideoFormat,
  generateAudioFormat,
  VideoFormatOptions,
  AudioFormatOptions
} from '../utils/formatGenerator'

interface AddDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (
    url: string,
    formatId?: string,
    options?: { isAudioExtract?: boolean; audioFormat?: string; formatOption?: string }
  ) => void
  initialUrl?: string
}

interface VideoMetadata {
  title: string
  thumbnail?: string
  duration?: string
}

const AddDownloadModal: React.FC<AddDownloadModalProps> = ({ isOpen, onClose, onAdd, initialUrl = '' }) => {
  const [url, setUrl] = useState(initialUrl)
  const [isPasting, setIsPasting] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [downloadSubtitles, setDownloadSubtitles] = useState(false)
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [isBatchMode, setIsBatchMode] = useState(false)

  // Format Selection State
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video')
  const [videoOptions, setVideoOptions] = useState<VideoFormatOptions>({
    resolution: 'best',
    container: 'mp4'
  })
  const [audioOptions, setAudioOptions] = useState<AudioFormatOptions>({
    format: 'mp3'
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchedUrlRef = useRef<string>('')

  // Playlist detection state
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])
  const [isCheckingPlaylist, setIsCheckingPlaylist] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)

  // Available resolutions from format fetch
  const [availableResolutions, setAvailableResolutions] = useState<string[] | null>(null)
  const [isFetchingFormats, setIsFetchingFormats] = useState(false)

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

  // Auto-fetch metadata
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
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    if (isUrlValid && url !== lastFetchedUrlRef.current && !isBatchMode) {
      fetchTimeoutRef.current = setTimeout(() => {
        fetchMetadata(url.trim())
      }, 800)
    }
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    }
  }, [url, isUrlValid, fetchMetadata, isBatchMode])

  // Fetch available formats when metadata is loaded
  useEffect(() => {
    if (!metadata || isBatchMode || !isUrlValid) {
      setAvailableResolutions(null)
      return
    }

    let cancelled = false
    const fetchFormats = async (): Promise<void> => {
      setIsFetchingFormats(true)
      try {
        const formats = await window.api.getFormats(url.trim())
        if (cancelled) return
        if (formats && formats.length > 0) {
          // Extract unique available heights from video formats
          const heights = new Set<string>()
          formats.forEach((f) => {
            if (f.vcodec && f.vcodec !== 'none' && f.resolution) {
              const match = f.resolution.match(/(\d+)x(\d+)/)
              if (match) {
                heights.add(match[2]) // height
              }
            }
          })
          setAvailableResolutions(heights.size > 0 ? Array.from(heights) : null)
        } else {
          setAvailableResolutions(null)
        }
      } catch {
        if (!cancelled) setAvailableResolutions(null)
      } finally {
        if (!cancelled) setIsFetchingFormats(false)
      }
    }
    fetchFormats()
    return () => { cancelled = true }
  }, [metadata, url, isUrlValid, isBatchMode])

  // Initial focus and clipboard check
  useEffect(() => {
    if (isOpen) {
      handlePasteFromClipboard()
      inputRef.current?.focus()
    } else {
      setUrl('')
      setIsAdding(false)
      setShowAdvanced(false)
      setMetadata(null)
      lastFetchedUrlRef.current = ''
      setPlaylistItems([])
    }
  }, [isOpen])

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

  if (!isOpen) return null

  const handleAdd = async (): Promise<void> => {
    if (!isUrlValid || isAdding || isCheckingPlaylist) return
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)

    // Check playlist (single URL mode only)
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

    setIsAdding(true)

    // Generate Format Options
    let formatResult
    let formatOptionLabel = ''
    if (activeTab === 'video') {
      formatResult = generateVideoFormat(videoOptions)
      formatOptionLabel = `${activeTab}-${videoOptions.resolution}-${videoOptions.container}`
    } else {
      formatResult = generateAudioFormat(audioOptions)
      formatOptionLabel = `${activeTab}-${audioOptions.format}`
    }

    const { formatId, isAudioExtract, audioFormat } = formatResult

    const options = {
      isAudioExtract,
      audioFormat,
      formatOption: formatOptionLabel
    }

    setTimeout(() => {
      if (isBatchMode && batchUrls.length > 0) {
        batchUrls.forEach((batchUrl) => {
          onAdd(batchUrl, formatId, options)
        })
      } else {
        onAdd(url, formatId, options)
      }
      setUrl('')
      setPlaylistItems([])
      setIsAdding(false)
      onClose()
    }, 150)
  }

  const handleDownloadPlaylistItems = (selectedUrls: string[]): void => {
    let formatResult
    if (activeTab === 'video') {
      formatResult = generateVideoFormat(videoOptions)
    } else {
      formatResult = generateAudioFormat(audioOptions)
    }

    const { formatId, isAudioExtract, audioFormat } = formatResult
    const options = {
      isAudioExtract,
      audioFormat,
      formatOption: 'playlist-batch'
    }

    selectedUrls.forEach((selectedUrl) => {
      onAdd(selectedUrl, formatId, options)
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
    if (isAdding) return `${baseClasses} bg-neon-green/20 text-neon-green border-neon-green/50 cursor-wait`
    if (isUrlValid) return `${baseClasses} primary hover:scale-105 hover:shadow-lg hover:shadow-neon-blue/30`
    return `${baseClasses} opacity-50 cursor-not-allowed bg-white/5 text-text-dim`
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal max-w-md" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add New Download</h2>
          <button
            type="button"
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${isBatchMode
              ? 'border-neon-blue bg-neon-blue/20 text-neon-blue'
              : 'border-border-glass text-text-dim hover:text-text-main'
              }`}
          >
            {isBatchMode ? '📋 Batch Mode' : 'Single URL'}
          </button>
        </div>

        <p className="text-sm text-text-dim mb-4">
          {isBatchMode
            ? 'Enter multiple URLs (one per line or comma-separated).'
            : 'Enter a video or playlist URL to start downloading.'}
        </p>

        {/* URL Input */}
        <div className="relative mb-4">
          {isBatchMode ? (
            <textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=...&#10;https://..."
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
                className={`w-full bg-bg-deep border rounded-md p-2 pr-12 text-sm focus:outline-none transition-colors ${url && !isUrlValid
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-border-glass focus:border-neon-blue'
                  }`}
              />
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isPasting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10 text-text-dim hover:text-neon-blue transition-colors disabled:opacity-50"
              >
                <ClipboardIcon className={`w-4 h-4 ${isPasting ? 'animate-pulse' : ''}`} />
              </button>
            </>
          )}
        </div>

        {/* Validation Check */}
        {!isBatchMode && url && !isUrlValid && (
          <p className="text-xs text-red-400 -mt-2 mb-4">
            {getUrlValidationMessage(url) || 'Please enter a valid video URL'}
          </p>
        )}

        {/* Metadata Preview */}
        {!isBatchMode && (isFetchingMetadata || metadata) && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg border border-border-glass animate-in fade-in">
            {isFetchingMetadata ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-10 bg-white/10 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-white/10 rounded w-1/4 animate-pulse" />
                </div>
              </div>
            ) : metadata ? (
              <div className="flex items-center gap-3">
                {metadata.thumbnail ? (
                  <img src={metadata.thumbnail} className="w-16 h-10 object-cover rounded bg-black" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                ) : (
                  <div className="w-16 h-10 bg-white/10 rounded flex items-center justify-center"><DownloadIcon className="w-5 h-5 text-text-dim" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-main font-medium truncate">{metadata.title}</p>
                  {metadata.duration && <p className="text-xs text-text-dim">{metadata.duration}</p>}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Format Selection Tabs */}
        <div className="mb-4">
          <div className="flex border-b border-border-glass mb-4">
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'video' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-text-dim hover:text-text-main'}`}
            >
              🎬 Video
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'audio' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-text-dim hover:text-text-main'}`}
            >
              🎧 Audio
            </button>
          </div>

          {/* Video Options */}
          {activeTab === 'video' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
              <div>
                <label className="text-xs text-text-dim block mb-1">
                  Resolution
                  {isFetchingFormats && <span className="ml-1 text-neon-blue animate-pulse">⟳</span>}
                </label>
                <select
                  value={videoOptions.resolution}
                  onChange={(e) => setVideoOptions({ ...videoOptions, resolution: e.target.value })}
                  className="w-full bg-white/5 border border-border-glass rounded p-2 text-sm focus:border-neon-blue focus:outline-none"
                >
                  {RESOLUTIONS
                    .filter(r => {
                      if (r.value === 'best') return true // Always show "Best Available"
                      if (!availableResolutions) return true // Show all if not fetched yet
                      return availableResolutions.includes(r.value)
                    })
                    .map(r => <option key={r.value} value={r.value}>{r.label}</option>)
                  }
                </select>
              </div>
              <div>
                <label className="text-xs text-text-dim block mb-1">Format</label>
                <select
                  value={videoOptions.container}
                  onChange={(e) => setVideoOptions({ ...videoOptions, container: e.target.value })}
                  className="w-full bg-white/5 border border-border-glass rounded p-2 text-sm focus:border-neon-blue focus:outline-none"
                >
                  {CONTAINERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Audio Options */}
          {activeTab === 'audio' && (
            <div className="animate-in fade-in">
              <label className="text-xs text-text-dim block mb-1">Format</label>
              <select
                value={audioOptions.format}
                onChange={(e) => setAudioOptions({ ...audioOptions, format: e.target.value })}
                className="w-full bg-white/5 border border-border-glass rounded p-2 text-sm focus:border-neon-blue focus:outline-none"
              >
                {AUDIO_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Collapsible Helper Options */}
        <div className="border-t border-border-glass pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-text-dim hover:text-text-main"
          >
            <SettingsIcon className="w-3 h-3" />
            {showAdvanced ? 'Hide Extras' : 'Extras...'}
          </button>

          {showAdvanced && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Download Subtitles</span>
                <input
                  type="checkbox"
                  checked={downloadSubtitles}
                  onChange={(e) => setDownloadSubtitles(e.target.checked)}
                  className="accent-neon-blue w-4 h-4"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions mt-6">
          <button onClick={onClose} className="tool-btn btn-lg">Cancel</button>
          <button
            onClick={handleAdd}
            className={getButtonClasses()}
            disabled={!isUrlValid || isAdding || isCheckingPlaylist}
          >
            <DownloadIcon className={`w-4 h-4 ${isAdding || isCheckingPlaylist ? 'animate-bounce' : ''}`} />
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
