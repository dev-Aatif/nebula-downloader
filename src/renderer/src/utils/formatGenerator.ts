export type VideoFormatOptions = {
  resolution: string
  container: string
  fps?: string
  codec?: string
}

export type AudioFormatOptions = {
  format: string
  bitrate?: string
}

export type FormatGenerationResult = {
  formatId: string // The yt-dlp -f string
  isAudioExtract: boolean
  audioFormat?: string
  description: string
}

export const RESOLUTIONS = [
  { label: 'Best Available', value: 'best' },
  { label: '4K (2160p)', value: '2160' },
  { label: '1440p', value: '1440' },
  { label: '1080p', value: '1080' },
  { label: '720p', value: '720' },
  { label: '480p', value: '480' },
  { label: '360p', value: '360' }
]

export const CONTAINERS = [
  { label: 'MP4 (Compatible)', value: 'mp4' },
  { label: 'MKV (Best Quality)', value: 'mkv' },
  { label: 'WebM', value: 'webm' }
]

export const AUDIO_FORMATS = [
  { label: 'MP3', value: 'mp3' },
  { label: 'M4A (AAC)', value: 'm4a' },
  { label: 'FLAC (Lossless)', value: 'flac' },
  { label: 'WAV (Lossless)', value: 'wav' }
]

export function generateVideoFormat(options: VideoFormatOptions): FormatGenerationResult {
  const { resolution, container } = options
  let formatString = ''
  let description = ''

  if (resolution === 'best') {
    if (container === 'mp4') {
      // Best video (mp4) + best audio (m4a) OR best mp4
      formatString = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
      description = 'Best Quality (MP4)'
    } else if (container === 'mkv') {
      // YouTube doesn't serve MKV natively, so we fetch best generic streams and let backend ffmpeg merge them.
      // We embed `[ext=mkv]` as a dead-end fallback just so downloadWorker.ts detects the MKV container request.
      formatString = `bestvideo+bestaudio/bestvideo[ext=mkv]/best`
      description = `Best Quality (MKV)`
    } else {
      // Best video + best audio corresponding to the container
      const audioExt = container === 'webm' ? '[ext=webm]' : ''
      formatString = `bestvideo[ext=${container}]+bestaudio${audioExt}/best[ext=${container}]/best`
      description = `Best Quality (${container.toUpperCase()})`
    }
  } else {
    // Specific resolution
    if (container === 'mp4') {
      formatString = `bestvideo[height<=${resolution}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${resolution}][ext=mp4]/best[height<=${resolution}]`
    } else if (container === 'mkv') {
      formatString = `bestvideo[height<=${resolution}]+bestaudio/bestvideo[ext=mkv]/best[height<=${resolution}]`
    } else {
      const audioExt = container === 'webm' ? '[ext=webm]' : ''
      formatString = `bestvideo[height<=${resolution}][ext=${container}]+bestaudio${audioExt}/best[height<=${resolution}][ext=${container}]/best[height<=${resolution}]`
    }
    description = `${resolution}p (${container.toUpperCase()})`
  }

  return {
    formatId: formatString,
    isAudioExtract: false,
    description
  }
}

export function generateAudioFormat(options: AudioFormatOptions): FormatGenerationResult {
  const { format } = options
  // For audio, we strictly use bestaudio/best and rely on -x --audio-format to convert
  // This ensures we get the best source and convert it to the desired output
  const formatString = 'bestaudio/best'

  return {
    formatId: formatString,
    isAudioExtract: true,
    audioFormat: format,
    description: `Audio (${format.toUpperCase()})`
  }
}
