import { contextBridge, ipcRenderer } from 'electron'
import { Settings, FormatInfo, Download, DownloadError, PlaylistItem } from '../main/types'

type DownloadProgressData = {
  id: string
  progress: number
  speed: string
  eta: string
  totalSize: string
  speedValue?: number
}

const api = {
  getDownloads: (): Promise<Download[]> => ipcRenderer.invoke('get-downloads'),
  getCompletedDownloads: (): Promise<Download[]> => ipcRenderer.invoke('get-completed-downloads'),
  addDownload: (url: string, formatId?: string): void =>
    ipcRenderer.send('add-download', url, formatId),
  pauseDownload: (id: string): void => ipcRenderer.send('pause-download', id),
  resumeDownload: (id: string): void => ipcRenderer.send('resume-download', id),
  deleteDownload: (id: string): void => ipcRenderer.send('delete-download', id),
  pauseAllDownloads: (): void => ipcRenderer.send('pause-all-downloads'),
  resumeAllDownloads: (): void => ipcRenderer.send('resume-all-downloads'),
  openFile: (id: string): void => ipcRenderer.send('open-file', id),
  showInFolder: (id: string): void => ipcRenderer.send('show-in-folder', id),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Partial<Settings>): Promise<void> =>
    ipcRenderer.invoke('update-settings', settings),
  openDirectoryDialog: (): Promise<string | undefined> =>
    ipcRenderer.invoke('open-directory-dialog'),
  openFileDialog: (): Promise<string | undefined> => ipcRenderer.invoke('open-file-dialog'),
  getFormats: (url: string): Promise<FormatInfo[] | null> => ipcRenderer.invoke('get-formats', url),
  onDownloadProgress: (callback: (data: DownloadProgressData) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: DownloadProgressData): void =>
      callback(data)
    ipcRenderer.on('download-progress', handler)
    return () => ipcRenderer.removeListener('download-progress', handler)
  },
  onDownloadComplete: (callback: (data: { id: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string }): void =>
      callback(data)
    ipcRenderer.on('download-complete', handler)
    return () => ipcRenderer.removeListener('download-complete', handler)
  },
  onDownloadError: (
    callback: (data: { id: string; error: DownloadError }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { id: string; error: DownloadError }
    ): void => callback(data)
    ipcRenderer.on('download-error', handler)
    return () => ipcRenderer.removeListener('download-error', handler)
  },
  onDownloadPaused: (callback: (data: { id: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string }): void =>
      callback(data)
    ipcRenderer.on('download-paused', handler)
    return () => ipcRenderer.removeListener('download-paused', handler)
  },
  onDownloadsLoaded: (callback: (downloads: Download[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: Download[]): void => callback(data)
    ipcRenderer.on('downloads-loaded', handler)
    return () => ipcRenderer.removeListener('downloads-loaded', handler)
  },
  onDownloadAdded: (callback: (download: Download) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: Download): void => callback(data)
    ipcRenderer.on('download-added', handler)
    return () => ipcRenderer.removeListener('download-added', handler)
  },
  onDownloadDeleted: (callback: (id: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string): void => callback(data)
    ipcRenderer.on('download-deleted', handler)
    return () => ipcRenderer.removeListener('download-deleted', handler)
  },
  setTheme: (theme: 'system' | 'light' | 'dark'): Promise<boolean> =>
    ipcRenderer.invoke('theme:set', theme),
  onThemeUpdated: (callback: (shouldUseDarkColors: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, shouldUseDarkColors: boolean): void =>
      callback(shouldUseDarkColors)
    ipcRenderer.on('theme:updated', handler)
    return () => ipcRenderer.removeListener('theme:updated', handler)
  },
  readClipboard: (): Promise<string> => ipcRenderer.invoke('read-clipboard'),
  checkPlaylist: (url: string): Promise<PlaylistItem[] | null> =>
    ipcRenderer.invoke('check-playlist', url)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
