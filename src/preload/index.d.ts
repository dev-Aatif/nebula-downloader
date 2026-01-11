import { ElectronAPI } from '@electron-toolkit/preload'
import { Download, DownloadError, FormatInfo, PlaylistCheckResult, Settings } from '../main/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getDownloads: () => Promise<Download[]>
      addDownload: (url: string, formatId?: string) => void
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
    }
  }
}
