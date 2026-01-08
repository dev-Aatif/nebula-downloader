import electron from 'electron'
import { join } from 'path'
import fs from 'fs'
import crypto from 'crypto'
// import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initializeWorker,
  startDownload,
  pauseDownload,
  pauseAllDownloads,
  resumeAllDownloads,
  resumeDownload
} from './downloadWorker'
import { db } from './db'
import {
  Download,
  PlaylistItem,
  PlaylistCheckResult,
  FormatInfo,
  Settings,
  YTDLPFormat
} from './types'
import { spawn } from 'child_process'

let mainWindow: electron.BrowserWindow | null = null
let tray: electron.Tray | null = null

async function getVideoInfo(url: string): Promise<Partial<Download> | null> {
  return new Promise((resolve) => {
    const settings = db.getSettings()
    const ytdlpPath =
      settings.ytDlpPath ||
      (process.env.NODE_ENV === 'development'
        ? join(process.cwd(), 'bin', 'yt-dlp')
        : join(process.resourcesPath, 'bin', 'yt-dlp'))

    const formatProcess = spawn(ytdlpPath, ['--dump-json', url])
    let stdout = ''
    let stderr = ''

    formatProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    formatProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    formatProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const jsonOutput = JSON.parse(stdout)
          const info: Partial<Download> = {
            title: jsonOutput.title,
            totalSizeInBytes: jsonOutput.filesize || jsonOutput.filesize_approx || 0
          }
          resolve(info)
        } catch (error) {
          console.error('Failed to parse yt-dlp JSON output for video info:', error)
          resolve(null)
        }
      } else {
        console.error(`yt-dlp exited with code ${code} for get-video-info: ${stderr}`)
        resolve(null)
      }
    })
    formatProcess.on('error', (err) => {
      console.error('Failed to start yt-dlp process for get-video-info:', err)
      resolve(null)
    })
  })
}

electron.app.whenReady().then(async () => {
  // const { electronApp, optimizer, is } = await import('@electron-toolkit/utils')

  await db.init()

  function createWindow(): electron.BrowserWindow {
    const win = new electron.BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    win.on('closed', () => {
      mainWindow = null
    })

    win.webContents.setWindowOpenHandler((details) => {
      electron.shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    if (process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'))
    }
    return win
  }

  mainWindow = createWindow()

  // electronApp.setAppUserModelId('com.electron')

  const initialSettings = db.getSettings()
  const downloadsPath = initialSettings.downloadDirectory || electron.app.getPath('downloads')
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true })
  }

  console.log('='.repeat(60))
  console.log('Nebula Downloader - Ready')
  console.log('='.repeat(60))
  console.log(`Download Directory: ${downloadsPath}`)
  console.log('='.repeat(60))

  if (process.platform !== 'darwin') {
    const iconPath = join(__dirname, '../../resources/icon.png')
    tray = new electron.Tray(iconPath)
    tray.setToolTip('Nebula Downloader')

    const contextMenu = electron.Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
          } else {
            mainWindow = createWindow()
          }
        }
      },
      {
        label: 'Pause All Downloads',
        click: () => {
          pauseAllDownloads()
        }
      },
      {
        label: 'Resume All Downloads',
        click: () => {
          if (mainWindow) {
            resumeAllDownloads(mainWindow)
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Exit',
        click: () => {
          electron.app.quit()
        }
      }
    ])
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show()
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      } else {
        mainWindow = createWindow()
      }
    })
  }

  // app.on('browser-window-created', (_, window) => {
  //   optimizer.watchWindowShortcuts(window)
  // })

  electron.ipcMain.handle('theme:set', (_, theme: 'system' | 'light' | 'dark') => {
    electron.nativeTheme.themeSource = theme
    return electron.nativeTheme.shouldUseDarkColors
  })

  electron.ipcMain.handle('read-clipboard', () => {
    return electron.clipboard.readText()
  })

  const downloads = await db.loadAndResumeDownloads()

  if (mainWindow) {
    initializeWorker(downloads, mainWindow)
  }

  electron.ipcMain.handle('get-downloads', () => {
    return downloads
  })

  electron.ipcMain.handle('get-completed-downloads', () => {
    return db.getDownloads().filter((d) => d.status === 'completed')
  })

  electron.ipcMain.handle('get-settings', (): Settings => {
    return db.getSettings()
  })

  electron.ipcMain.handle(
    'update-settings',
    async (_, updates: Partial<Settings>): Promise<void> => {
      await db.updateSettings(updates)
    }
  )

  electron.ipcMain.handle('open-directory-dialog', async (): Promise<string | undefined> => {
    if (!mainWindow) return undefined
    const { canceled, filePaths } = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return canceled ? undefined : filePaths[0]
  })

  electron.ipcMain.handle('open-file-dialog', async (): Promise<string | undefined> => {
    if (!mainWindow) return undefined
    const { canceled, filePaths } = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ['openFile']
    })
    return canceled ? undefined : filePaths[0]
  })

  // Fetch video metadata for preview (before downloading)
  electron.ipcMain.handle(
    'fetch-metadata',
    async (
      _,
      url: string
    ): Promise<{
      title: string
      thumbnail?: string
      duration?: string
      isPlaylist?: boolean
      playlistItems?: { url: string; title: string }[]
    } | null> => {
      return new Promise((resolve) => {
        const settings = db.getSettings()
        const ytdlpPath =
          settings.ytDlpPath ||
          (process.env.NODE_ENV === 'development'
            ? join(process.cwd(), 'bin', 'yt-dlp')
            : join(process.resourcesPath, 'bin', 'yt-dlp'))

        const formatProcess = spawn(ytdlpPath, [
          '--dump-single-json',
          '--flat-playlist',
          '--no-download',
          url
        ])
        let stdout = ''

        formatProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        formatProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const jsonOutput = JSON.parse(stdout)

              if (jsonOutput._type === 'playlist') {
                // It's a playlist
                const playlistItems = jsonOutput.entries.map((entry: any) => ({
                  url:
                    entry.url ||
                    entry.original_url ||
                    `https://www.youtube.com/watch?v=${entry.id}`,
                  title: entry.title
                }))
                resolve({
                  title: jsonOutput.title,
                  isPlaylist: true,
                  playlistItems
                })
              } else {
                // It's a single video
                const duration = jsonOutput.duration
                  ? new Date(jsonOutput.duration * 1000).toISOString().substr(11, 8)
                  : undefined
                resolve({
                  title: jsonOutput.title,
                  thumbnail: jsonOutput.thumbnail,
                  duration,
                  isPlaylist: false
                })
              }
            } catch (e) {
              console.error('Error parsing yt-dlp output:', e)
              resolve(null)
            }
          } else {
            console.error('yt-dlp exited with code', code)
            resolve(null)
          }
        })
        formatProcess.on('error', () => resolve(null))
      })
    }
  )

  electron.ipcMain.handle('get-formats', async (_, url: string): Promise<FormatInfo[] | null> => {
    return new Promise((resolve) => {
      const settings = db.getSettings()
      const ytdlpPath =
        settings.ytDlpPath ||
        (process.env.NODE_ENV === 'development'
          ? join(process.cwd(), 'bin', 'yt-dlp')
          : join(process.resourcesPath, 'bin', 'yt-dlp'))

      if (process.platform === 'linux' || process.platform === 'darwin') {
        try {
          fs.chmodSync(ytdlpPath, '755')
        } catch (e) {
          console.warn(`Could not set execute permissions on ${ytdlpPath}:`, e)
        }
      }

      const formatProcess = spawn(ytdlpPath, ['--dump-json', url])
      let stdout = ''
      let stderr = ''

      formatProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      formatProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      formatProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const jsonOutput = JSON.parse(stdout)
            const formats: FormatInfo[] = (jsonOutput.formats || []).map((f: YTDLPFormat) => ({
              format_id: f.format_id,
              ext: f.ext,
              resolution: f.resolution || (f.vcodec === 'none' ? 'audio only' : 'unknown'),
              vcodec: f.vcodec || 'none',
              acodec: f.acodec || 'none',
              filesize: f.filesize || f.filesize_approx || undefined,
              fps: f.fps || undefined,
              tbr: f.tbr || undefined
            }))
            resolve(formats)
          } catch (error) {
            console.error('Failed to parse yt-dlp JSON output for formats:', error)
            resolve(null)
          }
        } else {
          console.error(`yt-dlp exited with code ${code} for get-formats: ${stderr}`)
          resolve(null)
        }
      })
      formatProcess.on('error', (err) => {
        console.error('Failed to start yt-dlp process for get-formats:', err)
        resolve(null)
      })
    })
  })

  electron.ipcMain.handle(
    'check-playlist',
    async (_, url: string): Promise<PlaylistCheckResult | null> => {
      return new Promise((resolve) => {
        const settings = db.getSettings()
        const ytdlpPath =
          settings.ytDlpPath ||
          (process.env.NODE_ENV === 'development'
            ? join(process.cwd(), 'bin', 'yt-dlp')
            : join(process.resourcesPath, 'bin', 'yt-dlp'))

        if (process.platform === 'linux' || process.platform === 'darwin') {
          try {
            fs.chmodSync(ytdlpPath, '755')
          } catch (e) {
            console.warn(`Could not set execute permissions on ${ytdlpPath}:`, e)
          }
        }

        const playlistProcess = spawn(ytdlpPath, ['--flat-playlist', '--print-json', url])
        let stdout = ''
        let stderr = ''

        playlistProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        playlistProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        playlistProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const lines = stdout.split('\n').filter(Boolean)
              const playlistItems: PlaylistItem[] = lines.map((line) => {
                const json = JSON.parse(line)
                return {
                  url: json.url,
                  title: json.title
                }
              })
              resolve(playlistItems)
            } catch (error) {
              console.error('Failed to parse yt-dlp JSON output:', error)
              resolve(null)
            }
          } else {
            console.error(`yt-dlp exited with code ${code}: ${stderr}`)
            resolve(null)
          }
        })
        playlistProcess.on('error', (err) => {
          console.error('Failed to start yt-dlp process:', err)
          resolve(null)
        })
      })
    }
  )

  electron.ipcMain.on('add-download', async (_, url: string, formatId?: string) => {
    const videoInfo = await getVideoInfo(url)

    const newDownload: Download = {
      id: crypto.randomUUID(),
      url,
      title: videoInfo?.title || 'Untitled',
      status: 'queued',
      progress: 0,
      speed: '',
      eta: '',
      totalSizeInBytes: videoInfo?.totalSizeInBytes || 0,
      downloadedSizeInBytes: 0,
      outputPath: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      formatId: formatId
    }
    await db.addDownload(newDownload)
    mainWindow?.webContents.send('download-added', newDownload)
    console.log(`Added download ${newDownload.id} to the queue.`)
    if (mainWindow) {
      startDownload(newDownload, mainWindow)
    }
  })

  electron.ipcMain.on('pause-download', async (_, downloadId: string) => {
    const download = await db.getDownload(downloadId)
    if (download && download.status === 'downloading') {
      console.log(`Pausing download ${downloadId}`)
      pauseDownload(downloadId)
      await db.updateDownload(downloadId, { status: 'paused' })
      mainWindow?.webContents.send('download-paused', { id: downloadId })
    }
  })

  electron.ipcMain.on('resume-download', async (_, downloadId: string) => {
    const download = await db.getDownload(downloadId)
    if (download && download.status === 'paused') {
      console.log(`Resuming download ${downloadId}`)
      await db.updateDownload(downloadId, { status: 'downloading' })
      if (mainWindow) {
        resumeDownload(download, mainWindow)
      }
    }
  })

  electron.ipcMain.on('pause-all-downloads', () => {
    pauseAllDownloads()
  })

  electron.ipcMain.on('resume-all-downloads', async () => {
    if (mainWindow) {
      resumeAllDownloads(mainWindow)
    }
  })

  electron.ipcMain.on('delete-download', async (_, downloadId: string) => {
    const download = await db.getDownload(downloadId)
    await db.removeDownload(downloadId)
    mainWindow?.webContents.send('download-deleted', downloadId)

    if (download && download.outputPath) {
      if (fs.existsSync(download.outputPath)) {
        fs.unlinkSync(download.outputPath)
      }
      const partFile = download.outputPath + '.part'
      if (fs.existsSync(partFile)) {
        fs.unlinkSync(partFile)
      }
    }
  })

  electron.ipcMain.on('open-file', async (_, downloadId: string) => {
    const download = await db.getDownload(downloadId)
    console.log(`Attempting to open file for ${downloadId}. Path: ${download?.outputPath}`)
    if (download && download.outputPath) {
      if (fs.existsSync(download.outputPath)) {
        await electron.shell.openPath(download.outputPath)
      } else {
        console.error(`File does not exist at path: ${download.outputPath}`)
        if (mainWindow) {
          electron.dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Error Opening File',
            message: `The file could not be found at: ${download.outputPath}`
          })
        }
      }
    } else {
      console.warn(`No output path found for download ${downloadId}`)
    }
  })

  electron.ipcMain.on('show-in-folder', async (_, downloadId: string) => {
    const download = await db.getDownload(downloadId)
    console.log(`Attempting to show in folder for ${downloadId}. Path: ${download?.outputPath}`)
    if (download && download.outputPath) {
      if (fs.existsSync(download.outputPath)) {
        electron.shell.showItemInFolder(download.outputPath)
      } else {
        console.error(`Item does not exist at path: ${download.outputPath}`)
        if (mainWindow) {
          electron.dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Error',
            message: `The file/folder could not be found at: ${download.outputPath}`
          })
        }
      }
    } else {
      console.warn(`No output path found for download ${downloadId}`)
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.webContents.send('downloads-loaded', downloads)
  })

  electron.nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme:updated', electron.nativeTheme.shouldUseDarkColors)
  })

  electron.app.on('activate', function () {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})

electron.app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    electron.app.quit()
  }
})
