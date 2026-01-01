export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error'

export type DownloadError = {
  timestamp: Date
  message: string
  type: 'yt-dlp' | 'process-spawn' | 'general'
  details?: string // More detailed error output, like stderr
}

export type Download = {
  id: string
  url: string
  title: string
  status: DownloadStatus
  progress: number
  speed: string
  eta: string
  totalSizeInBytes: number
  downloadedSizeInBytes: number
  outputPath: string
  createdAt: Date
  updatedAt: Date
  formatId?: string // New property to store the selected yt-dlp format string
  errorLogs?: DownloadError[] // Array to store detailed error logs
  speedValue?: number
}

export type PlaylistItem = {
  url: string
  title: string
}

export type PlaylistCheckResult = PlaylistItem[]

export type FormatInfo = {
  format_id: string
  ext: string
  resolution: string // e.g., "1920x1080" or "audio only"
  vcodec: string
  acodec: string
  filesize?: number // in bytes
  fps?: number
  tbr?: number // total bitrate
}

export type YTDLPFormat = {
  format_id: string
  ext: string
  resolution?: string
  vcodec?: string
  acodec?: string
  filesize?: number
  filesize_approx?: number
  fps?: number
  tbr?: number
  title?: string
}

export type Settings = {
  downloadDirectory: string
  concurrency: number
  ytDlpPath: string
  ffmpegPath: string
  defaultFormat: string
  proxy: string
}
