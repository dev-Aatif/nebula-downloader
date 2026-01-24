# Nebula Downloader API Reference

This document describes the `window.api` object exposed to the renderer process via Electron's preload script.

## Download Management

### `getDownloads(): Promise<Download[]>`

Returns all downloads from the database.

### `getCompletedDownloads(): Promise<Download[]>`

Returns only completed downloads for the History view.

### `addDownload(url: string, formatId?: string): void`

Adds a new download to the queue.

- `url`: Video URL to download
- `formatId`: Optional yt-dlp format ID

### `pauseDownload(id: string): void`

Pauses an active download.

### `resumeDownload(id: string): void`

Resumes a paused download.

### `deleteDownload(id: string): void`

Deletes a download from the queue and database.

### `retryDownload(id: string): void`

Retries a failed download.

### `pauseAllDownloads(): void`

Pauses all active downloads.

### `resumeAllDownloads(): void`

Resumes all paused downloads.

---

## File Operations

### `openFile(id: string): void`

Opens the downloaded file with the system's default application.

### `showInFolder(id: string): void`

Opens the file explorer and highlights the downloaded file.

---

## Settings

### `getSettings(): Promise<Settings>`

Returns current application settings.

### `updateSettings(settings: Partial<Settings>): Promise<void>`

Updates settings (merged with existing).

### `openDirectoryDialog(): Promise<string | undefined>`

Opens a directory picker dialog. Returns selected path or undefined.

### `openFileDialog(): Promise<string | undefined>`

Opens a file picker dialog. Returns selected path or undefined.

---

## Metadata & Formats

### `getFormats(url: string): Promise<FormatInfo[] | null>`

Fetches available download formats for a video URL.

### `fetchMetadata(url: string): Promise<{ title, thumbnail?, duration? } | null>`

Fetches video metadata (title, thumbnail, duration).

### `checkPlaylist(url: string): Promise<PlaylistItem[] | null>`

Checks if URL is a playlist and returns playlist items.

---

## Event Listeners

All event listeners return an unsubscribe function.

### `onDownloadsLoaded(callback: (downloads: Download[]) => void): () => void`

Fired when downloads are loaded from database on startup.

### `onDownloadAdded(callback: (download: Download) => void): () => void`

Fired when a new download is added.

### `onDownloadProgress(callback: (data) => void): () => void`

Fired during download progress. Data includes:

- `id`, `progress`, `speed`, `eta`, `totalSize`, `speedValue`

### `onDownloadComplete(callback: ({ id }) => void): () => void`

Fired when a download completes successfully.

### `onDownloadError(callback: ({ id, error }) => void): () => void`

Fired when a download encounters an error.

### `onDownloadPaused(callback: ({ id }) => void): () => void`

Fired when a download is paused.

### `onDownloadDeleted(callback: (id: string) => void): () => void`

Fired when a download is deleted.

---

## Theme & Utilities

### `setTheme(theme: 'system' | 'light' | 'dark'): Promise<boolean>`

Sets the application theme.

### `onThemeUpdated(callback: (shouldUseDarkColors: boolean) => void): () => void`

Fired when system theme changes.

### `readClipboard(): Promise<string>`

Reads text from the system clipboard.

---

## Types

```typescript
interface Download {
  id: string
  url: string
  title: string
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled'
  progress: number
  speed?: string
  speedValue?: number
  eta?: string
  totalSizeInBytes: number
  downloadedSizeInBytes: number
  thumbnail?: string
  outputPath?: string
  formatId?: string
  errorLogs?: DownloadError[]
  createdAt: string
  updatedAt?: string
}

interface Settings {
  downloadDirectory: string
  maxConcurrentDownloads: number
  format: string
  autoDownload: boolean
  speedLimit: number
  ytdlpPath?: string
  ffmpegPath?: string
  hasSeenDisclaimer?: boolean
}

interface FormatInfo {
  format_id: string
  ext: string
  resolution: string
  fps?: number
  filesize?: number
  vcodec?: string
  acodec?: string
}

interface PlaylistItem {
  id: string
  title: string
  url: string
  thumbnail?: string
  duration?: string
}
```
