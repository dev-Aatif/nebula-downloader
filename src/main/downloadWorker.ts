import { BrowserWindow, Notification } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import { db } from './db'
import { Download, Settings, DownloadError } from './types'

const downloadQueue: Download[] = []
const activeProcesses = new Map<string, ChildProcess>()
let activeDownloadCount = 0
let mainWindowRef: BrowserWindow | null = null

export function initializeWorker(downloads: Download[], window: BrowserWindow): void {
  console.log('Download worker initialized.')
  mainWindowRef = window
  downloads
    .filter((d) => d.status === 'paused' || d.status === 'queued')
    .forEach((d) => {
      if (!downloadQueue.some((queuedD) => queuedD.id === d.id)) {
        downloadQueue.push(d)
      }
    })
  processQueue()
}

function processQueue(): void {
  const settings: Settings = db.getSettings()
  if (!mainWindowRef) {
    console.warn('mainWindowRef is not set in processQueue. Cannot send progress updates.')
    return
  }

  while (activeDownloadCount < settings.concurrency && downloadQueue.length > 0) {
    const nextDownload = downloadQueue.shift()
    if (nextDownload) {
      activeDownloadCount++
      _runDownload(nextDownload, mainWindowRef)
    }
  }
}

async function _runDownload(download: Download, window: BrowserWindow): Promise<void> {
  const settings: Settings = db.getSettings()

  const downloadsPath = settings.downloadDirectory
  const outputPath = path.join(downloadsPath, `${download.id}.%(ext)s`)

  const formatSelection = download.formatId ? download.formatId : settings.defaultFormat

  const ytDlpPath =
    settings.ytDlpPath ||
    (process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'bin', 'yt-dlp')
      : path.join(process.resourcesPath, 'bin', 'yt-dlp'))

  // First, get video info to get total size
  try {
    const infoArgs = ['--dump-json', '-f', formatSelection, download.url]
    if (settings.proxy) infoArgs.push('--proxy', settings.proxy)

    const ytDlpInfo = spawn(ytDlpPath, infoArgs)
    let infoJson = ''
    ytDlpInfo.stdout.on('data', (data) => (infoJson += data.toString()))
    ytDlpInfo.stderr.on('data', (data) =>
      console.error(`yt-dlp info stderr for ${download.id}: ${data}`)
    )

    ytDlpInfo.on('close', async (code) => {
      if (code === 0) {
        try {
          const videoInfo = JSON.parse(infoJson)
          const totalSizeInBytes = videoInfo.filesize || videoInfo.filesize_approx
          if (totalSizeInBytes) {
            await db.updateDownload(download.id, { totalSizeInBytes })
            window.webContents.send('download-progress', {
              id: download.id,
              totalSizeInBytes
            })
          }
        } catch (e) {
          console.error(`Failed to parse video info JSON for ${download.id}: ${e}`)
        }
      } else {
        console.error(`yt-dlp info process for ${download.id} exited with code ${code}`)
      }
      // Now proceed with the download
      startActualDownload()
    })
  } catch (error) {
    console.error(`Failed to spawn yt-dlp info process for ${download.id}:`, error)
    // If getting info fails, still try to download
    startActualDownload()
  }

  function startActualDownload(): void {
    const args = [
      '--progress',
      '--progress-template',
      '%(progress)j',
      '--no-warnings',
      '-f',
      formatSelection,
      '--output',
      outputPath,
      '--merge-output-format',
      'mp4',
      download.url
    ]

    if (settings.proxy) args.push('--proxy', settings.proxy)
    if (settings.ffmpegPath) args.push('--ffmpeg-location', settings.ffmpegPath)

    let fullStderr = ''

    try {
      const ytDlp = spawn(ytDlpPath, args)
      activeProcesses.set(download.id, ytDlp)
      db.updateDownload(download.id, { status: 'downloading' })
      window.webContents.send('download-progress', { id: download.id, status: 'downloading' })

      ytDlp.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split(/\r?\n|\r/)
        lines.forEach(async (line) => {
          if (line.trim().startsWith('{')) {
            try {
              const progress = JSON.parse(line)

              if (progress.title && download.title !== progress.title) {
                await db.updateDownload(download.id, { title: progress.title })
              }

              const updateData: Partial<Download> = {
                progress: progress.percent || 0,
                speed: progress.speed_str || '0',
                eta: progress.eta_str || '0',
                downloadedSizeInBytes: progress.downloaded_bytes || 0,
                status: 'downloading',
                speedValue: progress.speed || 0
              }

              if (progress.filename) {
                updateData.outputPath = progress.filename
              }

              await db.updateDownload(download.id, updateData)
              window.webContents.send('download-progress', { id: download.id, ...updateData })
            } catch (e) {
              console.error(`Failed to parse progress JSON: ${e}`)
            }
          }
        })
      })

      ytDlp.stderr.on('data', async (data) => {
        const errorString = data.toString()
        fullStderr += errorString
        console.error(`yt-dlp stderr for ${download.id}: ${errorString}`)

        if (window.isDestroyed()) return

        const currentDownload = await db.getDownload(download.id)
        if (currentDownload) {
          const errorLog: DownloadError = {
            timestamp: new Date(),
            message: `yt-dlp error: ${errorString.substring(0, 200)}...`,
            type: 'yt-dlp',
            details: errorString
          }
          const updatedErrorLogs = [...(currentDownload.errorLogs || []), errorLog]
          await db.updateDownload(download.id, { status: 'error', errorLogs: updatedErrorLogs })
          window.webContents.send('download-error', { id: download.id, error: errorLog })
        }
      })

      ytDlp.on('close', async (code) => {
        activeProcesses.delete(download.id)
        activeDownloadCount--

        const currentDownload = await db.getDownload(download.id)
        if (currentDownload?.status === 'paused') {
          console.log(`Download for ${download.id} paused.`)
        } else if (code === 0) {
          if (window.isDestroyed()) return

          // Final attempt to verify outputPath before completing
          let finalPath = currentDownload?.outputPath
          if (!finalPath || !fs.existsSync(finalPath)) {
            // If outputPath is not set or file missing, attempt to find it by ID prefix
            const files = fs.readdirSync(downloadsPath)
            const found = files.find((f) => f.startsWith(download.id))
            if (found) {
              finalPath = path.join(downloadsPath, found)
            }
          }

          await db.updateDownload(download.id, {
            status: 'completed',
            progress: 100,
            outputPath: finalPath
          })
          window.webContents.send('download-complete', { id: download.id, outputPath: finalPath })

          console.log(`Download ${download.id} completed. Path: ${finalPath}`)
          new Notification({
            title: 'Download Complete!',
            body: `${currentDownload?.title || currentDownload?.url} has finished.`
          }).show()
        } else {
          if (currentDownload?.status !== 'error') {
            if (window.isDestroyed()) return
            const errorLog: DownloadError = {
              timestamp: new Date(),
              message: `yt-dlp exited with code ${code}.`,
              type: 'yt-dlp',
              details: fullStderr
            }
            const updatedErrorLogs = [...(currentDownload?.errorLogs || []), errorLog]
            await db.updateDownload(download.id, { status: 'error', errorLogs: updatedErrorLogs })
            window.webContents.send('download-error', { id: download.id, error: errorLog })
          }
        }
        processQueue()
      })
    } catch (error: unknown) {
      console.error(`Failed to spawn yt-dlp process for ${download.id}:`, error)
      if (window.isDestroyed()) return
      ;(async () => {
        const currentDownload = await db.getDownload(download.id)
        if (currentDownload) {
          const errorLog: DownloadError = {
            timestamp: new Date(),
            message: `Failed to spawn process: ${(error as Error).message}`,
            type: 'process-spawn',
            details: String(error)
          }
          const updatedErrorLogs = [...(currentDownload.errorLogs || []), errorLog]
          await db.updateDownload(download.id, { status: 'error', errorLogs: updatedErrorLogs })
          window.webContents.send('download-error', { id: download.id, error: errorLog })
        }
      })()

      activeDownloadCount--
      processQueue()
    }
  }
}

export function startDownload(download: Download, window: BrowserWindow): void {
  if (!mainWindowRef) mainWindowRef = window
  downloadQueue.push(download)
  db.updateDownload(download.id, { status: 'queued' })
  mainWindowRef?.webContents.send('download-progress', { id: download.id, status: 'queued' })
  processQueue()
}

export function pauseDownload(id: string): void {
  const process = activeProcesses.get(id)
  if (process) {
    process.kill()
    activeProcesses.delete(id)
  }
}

export function pauseAllDownloads(): void {
  activeProcesses.forEach((process) => process.kill())
  activeProcesses.clear()
  while (downloadQueue.length > 0) {
    const queuedDownload = downloadQueue.shift()
    if (queuedDownload) {
      db.updateDownload(queuedDownload.id, { status: 'paused' })
      mainWindowRef?.webContents.send('download-paused', queuedDownload.id)
    }
  }
}

export async function resumeAllDownloads(window: BrowserWindow): Promise<void> {
  if (!mainWindowRef) mainWindowRef = window
  const allDownloads = await db.getDownloads()
  const pausedDownloads = allDownloads.filter((d) => d.status === 'paused')
  while (downloadQueue.length > 0) downloadQueue.pop()
  for (const download of pausedDownloads) resumeDownload(download, window)
}

export async function resumeDownload(download: Download, window: BrowserWindow): Promise<void> {
  if (!mainWindowRef) mainWindowRef = window
  downloadQueue.push(download)
  db.updateDownload(download.id, { status: 'queued' })
  mainWindowRef?.webContents.send('download-progress', { id: download.id, status: 'queued' })
  processQueue()
}
