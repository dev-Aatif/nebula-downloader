/**
 * Human-readable codec labels for video and audio codecs
 * Converts technical codec names to user-friendly labels
 */

const VIDEO_CODEC_LABELS: Record<string, string> = {
  // H.264 / AVC
  avc1: 'H.264 (Best Compatibility)',
  h264: 'H.264 (Best Compatibility)',
  'h.264': 'H.264 (Best Compatibility)',

  // H.265 / HEVC
  hvc1: 'H.265 (Smaller Files)',
  hevc: 'H.265 (Smaller Files)',
  hev1: 'H.265 (Smaller Files)',
  'h.265': 'H.265 (Smaller Files)',

  // VP9
  vp9: 'VP9 (YouTube HD)',
  vp09: 'VP9 (YouTube HD)',

  // AV1
  av01: 'AV1 (Best Quality)',
  av1: 'AV1 (Best Quality)',

  // Legacy
  vp8: 'VP8 (Legacy)',
  mp4v: 'MPEG-4',

  // None
  none: 'No Video'
}

const AUDIO_CODEC_LABELS: Record<string, string> = {
  // AAC
  mp4a: 'AAC (Best Compatibility)',
  aac: 'AAC (Best Compatibility)',
  'mp4a.40.2': 'AAC',

  // Opus
  opus: 'Opus (High Quality)',

  // Vorbis
  vorbis: 'Vorbis',

  // MP3
  mp3: 'MP3 (Universal)',

  // FLAC
  flac: 'FLAC (Lossless)',

  // None
  none: 'No Audio'
}

/**
 * Get human-readable label for a video codec
 */
export function getVideoCodecLabel(codec: string): string {
  if (!codec) return 'Unknown'
  const normalized = codec.toLowerCase().split('.')[0]
  return VIDEO_CODEC_LABELS[normalized] || codec.toUpperCase()
}

/**
 * Get human-readable label for an audio codec
 */
export function getAudioCodecLabel(codec: string): string {
  if (!codec) return 'Unknown'
  const normalized = codec.toLowerCase().split('.')[0]
  return AUDIO_CODEC_LABELS[normalized] || codec.toUpperCase()
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Format resolution with quality tier label
 */
export function formatResolution(resolution: string): string {
  if (!resolution) return 'Unknown'
  if (resolution === 'audio only') return '🎧 Audio Only'

  // Extract height from resolution
  const match = resolution.match(/(\d+)x(\d+)/)
  if (match) {
    const height = parseInt(match[2])
    if (height >= 2160) return `4K Ultra HD (${resolution})`
    if (height >= 1440) return `2K QHD (${resolution})`
    if (height >= 1080) return `Full HD (${resolution})`
    if (height >= 720) return `HD (${resolution})`
    if (height >= 480) return `SD (${resolution})`
    return `Low (${resolution})`
  }

  return resolution
}
