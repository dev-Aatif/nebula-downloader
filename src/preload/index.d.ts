import { ElectronAPI } from '@electron-toolkit/preload'
import { Download, DownloadError, FormatInfo, PlaylistCheckResult, Settings, DownloadStatus } from '../main/types'

// Dependency management types
type DependencyInfo = {
  installed: boolean
  version: string | null
  path: string
  updateAvailable?: boolean
  latestVersion?: string
}

type DependencyStatus = {
  ytDlp: DependencyInfo
  ffmpeg: DependencyInfo
}

type UpdateCheckResult = {
  updateAvailable: boolean
  currentVersion: string | null
  latestVersion: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getDownloads: () => Promise<Download[]>
      addDownload: (
        url: string,
        formatId?: string,
        options?: { isAudioExtract?: boolean; audioFormat?: string; formatOption?: string }
      ) => void
      pauseDownload: (id: string) => void
      resumeDownload: (id: string) => void
      deleteDownload: (id: string) => void
      retryDownload: (id: string) => void
      openFile: (id: string) => void
      showInFolder: (id: string) => void
      pauseAllDownloads: () => void
      resumeAllDownloads: () => void
      getCompletedDownloads: () => Promise<Download[]>
      getSettings: () => Promise<Settings>
      updateSettings: (settings: Partial<Settings>) => Promise<void>
      openDirectoryDialog: () => Promise<string | undefined>
      openFileDialog: () => Promise<string | undefined>

      // Dependency Management
      getDependencyStatus: () => Promise<DependencyStatus>
      getFullDependencyStatus: () => Promise<DependencyStatus>
      installDependencies: () => Promise<boolean>
      checkYtDlpUpdate: () => Promise<UpdateCheckResult>
      checkFfmpegUpdate: () => Promise<UpdateCheckResult>
      updateYtDlp: () => Promise<{ success: boolean; version: string; error?: string }>
      runBackgroundUpdates: () => Promise<void>
      onSetupProgress: (callback: (percent: number) => void) => () => void
      onYtDlpUpdateProgress: (callback: (percent: number) => void) => () => void

      onDownloadProgress: (
        callback: (data: {
          id: string
          progress: number
          speed: string
          eta: string
          totalSize: string
          status?: DownloadStatus
          speedValue?: number
        }) => void
      ) => () => void
      onDownloadComplete: (callback: (data: { id: string }) => void) => () => void
      onDownloadError: (
        callback: (data: { id: string; error: DownloadError }) => void
      ) => () => void
      onDownloadPaused: (callback: (data: { id: string }) => void) => () => void
      onDownloadsLoaded: (callback: (downloads: Download[]) => void) => () => void
      onDownloadAdded: (callback: (download: Download) => void) => () => void
      onDownloadDeleted: (callback: (id: string) => void) => () => void
      setTheme: (theme: 'system' | 'light' | 'dark') => Promise<boolean>
      onThemeUpdated: (callback: (shouldUseDarkColors: boolean) => void) => () => void
      checkPlaylist: (url: string) => Promise<PlaylistCheckResult | null>
      readClipboard: () => Promise<string>
      fetchMetadata: (
        url: string
      ) => Promise<{ title: string; thumbnail?: string; duration?: string } | null>
      getFormats: (url: string) => Promise<FormatInfo[] | null>
      onUpdatesAvailable: (
        callback: (updates: { ytDlp?: string; ffmpeg?: string }) => void
      ) => () => void
    }
  }
}
