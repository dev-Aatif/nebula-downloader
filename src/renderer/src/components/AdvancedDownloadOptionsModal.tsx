import React, { useState, useEffect } from 'react'

// Define the FormatInfo type as it's used in the renderer
interface FormatInfo {
  format_id: string
  ext: string
  resolution: string
  vcodec: string
  acodec: string
  filesize?: number
  fps?: number
  tbr?: number
}

interface AdvancedDownloadOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  onSelectFormat: (formatId: string) => void
}

const AdvancedDownloadOptionsModal: React.FC<AdvancedDownloadOptionsModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  onSelectFormat
}) => {
  const [formats, setFormats] = useState<FormatInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideoFormat, setSelectedVideoFormat] = useState<FormatInfo | null>(null)
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<FormatInfo | null>(null)

  useEffect(() => {
    const fetchFormats = async (): Promise<void> => {
      if (isOpen && videoUrl) {
        setLoading(true)
        setError(null)
        setSelectedVideoFormat(null)
        setSelectedAudioFormat(null)
        try {
          const fetchedFormats: FormatInfo[] | null = await window.electron.ipcRenderer.invoke(
            'get-formats',
            videoUrl
          )
          if (fetchedFormats) {
            setFormats(fetchedFormats)
          } else {
            setError('Failed to fetch formats.')
          }
        } catch (err) {
          console.error('Error fetching formats:', err)
          setError('An error occurred while fetching formats.')
        } finally {
          setLoading(false)
        }
      }
    }
    fetchFormats()
  }, [isOpen, videoUrl])

  const handleConfirm = (): void => {
    let formatId: string
    if (
      selectedVideoFormat &&
      selectedAudioFormat &&
      selectedVideoFormat.vcodec !== 'none' &&
      selectedAudioFormat.acodec !== 'none'
    ) {
      // If both video and audio selected and both are not 'none' (i.e. not audio-only or video-only)
      formatId = `${selectedVideoFormat.format_id}+${selectedAudioFormat.format_id}`
    } else if (selectedVideoFormat && selectedVideoFormat.acodec === 'none') {
      // If only video with no audio selected
      formatId = selectedVideoFormat.format_id
    } else if (selectedAudioFormat && selectedAudioFormat.vcodec === 'none') {
      // If only audio with no video selected
      formatId = selectedAudioFormat.format_id
    } else if (selectedVideoFormat) {
      // Fallback to just video if selected
      formatId = selectedVideoFormat.format_id
    } else if (selectedAudioFormat) {
      // Fallback to just audio if selected
      formatId = selectedAudioFormat.format_id
    } else {
      // Should not happen if at least one is selected
      onClose()
      return
    }
    onSelectFormat(formatId)
    onClose()
  }

  const videoFormats = formats.filter((f) => f.vcodec !== 'none' && f.resolution !== 'audio only')
  const audioFormats = formats.filter((f) => f.acodec !== 'none')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-11/12 md:w-2/3 lg:w-1/2 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-white">Advanced Download Options</h2>
        {loading && <p className="text-white">Loading formats...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && (
          <div>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-2">Video Formats</h3>
              <select
                className="w-full p-2 rounded bg-zinc-700 text-white border border-zinc-600 focus:ring focus:ring-blue-500"
                onChange={(e) =>
                  setSelectedVideoFormat(
                    videoFormats.find((f) => f.format_id === e.target.value) || null
                  )
                }
                value={selectedVideoFormat?.format_id || ''}
              >
                <option value="">Select Video Format (Optional)</option>
                {videoFormats.map((f) => (
                  <option key={f.format_id} value={f.format_id}>
                    {f.resolution} ({f.ext}, {f.vcodec}) {f.fps ? `@${f.fps}fps` : ''}{' '}
                    {f.filesize ? `(${Math.round(f.filesize / (1024 * 1024))}MB)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">Audio Formats</h3>
              <select
                className="w-full p-2 rounded bg-zinc-700 text-white border border-zinc-600 focus:ring focus:ring-blue-500"
                onChange={(e) =>
                  setSelectedAudioFormat(
                    audioFormats.find((f) => f.format_id === e.target.value) || null
                  )
                }
                value={selectedAudioFormat?.format_id || ''}
              >
                <option value="">Select Audio Format (Optional)</option>
                {audioFormats.map((f) => (
                  <option key={f.format_id} value={f.format_id}>
                    {f.ext}, {f.acodec} {f.tbr ? `(${f.tbr}kbps)` : ''}{' '}
                    {f.filesize ? `(${Math.round(f.filesize / (1024 * 1024))}MB)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={handleConfirm}
                disabled={!selectedVideoFormat && !selectedAudioFormat}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdvancedDownloadOptionsModal
