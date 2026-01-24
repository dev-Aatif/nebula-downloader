/**
 * Dependency Manager Types
 * Types for managing yt-dlp and ffmpeg dependencies
 */

export type VersionInfo = {
  version: string
  installedAt: string
  lastChecked: string
}

export type VersionFile = {
  ytDlp?: VersionInfo
  ffmpeg?: VersionInfo
}

export type DependencyInfo = {
  installed: boolean
  version: string | null
  path: string
  updateAvailable?: boolean
  latestVersion?: string
}

export type DependencyStatus = {
  ytDlp: DependencyInfo
  ffmpeg: DependencyInfo
}

export type UpdateCheckResult = {
  updateAvailable: boolean
  currentVersion: string | null
  latestVersion: string
}

export type DownloadProgress = {
  percent: number
  downloadedBytes: number
  totalBytes: number
}

export type GitHubRelease = {
  tag_name: string
  name: string
  assets: GitHubAsset[]
}

export type GitHubAsset = {
  name: string
  browser_download_url: string
  size: number
}
