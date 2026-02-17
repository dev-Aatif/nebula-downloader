/**
 * HTTP API Server for Nebula Downloader
 *
 * This module provides an HTTP API that allows browser extensions
 * (like nebula-extension) to queue downloads directly.
 *
 * API Endpoints:
 *   POST /api/download - Queue a new download
 *     Body: { url: string, formatId?: string }
 *     Response: { status: "success"|"error", message: string, downloadId?: string }
 *
 *   GET /api/formats?url=<video_url> - Get available formats for a video
 *     Response: { status: "success", formats: [...], title: string, thumbnail?: string }
 *
 *   GET /api/metadata?url=<video_url> - Get video metadata (title, thumbnail, duration)
 *     Response: { status: "success", title: string, thumbnail?: string, duration?: string }
 *
 *   GET /api/status - Check if server is running
 *     Response: { status: "success", message: "Nebula Downloader API is running" }
 */

import http from 'http'
import crypto from 'crypto'
import electron from 'electron'
import { Download, FormatInfo, YTDLPFormat } from './types'
import { db } from './db'
import { startDownload } from './downloadWorker'
import { getYtDlpPath } from './dependencyManager'
import { spawn } from 'child_process'
import url from 'url'

let server: http.Server | null = null
let isRunning = false

// Get video info using yt-dlp
async function getVideoInfo(videoUrl: string): Promise<Partial<Download> | null> {
  return new Promise((resolve) => {
    const settings = db.getSettings()
    const ytdlpPath = settings.ytDlpPath || getYtDlpPath()

    const formatProcess = spawn(ytdlpPath, ['--dump-json', '--no-playlist', videoUrl])
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
          console.error('[API Server] Failed to parse yt-dlp JSON output:', error)
          resolve(null)
        }
      } else {
        console.error(`[API Server] yt-dlp exited with code ${code}: ${stderr}`)
        resolve(null)
      }
    })
    formatProcess.on('error', (err) => {
      console.error('[API Server] Failed to start yt-dlp process:', err)
      resolve(null)
    })
  })
}

// Get available formats for a video
async function getFormats(
  videoUrl: string
): Promise<{ formats: FormatInfo[]; title: string; thumbnail?: string } | null> {
  return new Promise((resolve) => {
    const settings = db.getSettings()
    const ytdlpPath = settings.ytDlpPath || getYtDlpPath()

    const formatProcess = spawn(ytdlpPath, ['--dump-json', '--no-playlist', videoUrl])
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
          resolve({
            formats,
            title: jsonOutput.title || 'Unknown Title',
            thumbnail: jsonOutput.thumbnail
          })
        } catch (error) {
          console.error('[API Server] Failed to parse yt-dlp JSON output for formats:', error)
          resolve(null)
        }
      } else {
        console.error(`[API Server] yt-dlp exited with code ${code} for formats: ${stderr}`)
        resolve(null)
      }
    })
    formatProcess.on('error', (err) => {
      console.error('[API Server] Failed to start yt-dlp process for formats:', err)
      resolve(null)
    })
  })
}

// Get video metadata (lighter than full formats)
async function getMetadata(
  videoUrl: string
): Promise<{ title: string; thumbnail?: string; duration?: string } | null> {
  return new Promise((resolve) => {
    const settings = db.getSettings()
    const ytdlpPath = settings.ytDlpPath || getYtDlpPath()

    const formatProcess = spawn(ytdlpPath, [
      '--dump-json',
      '--no-download',
      '--no-playlist',
      videoUrl
    ])
    let stdout = ''

    formatProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    formatProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const jsonOutput = JSON.parse(stdout)
          const duration = jsonOutput.duration
            ? `${Math.floor(jsonOutput.duration / 60)}:${String(jsonOutput.duration % 60).padStart(2, '0')}`
            : undefined
          resolve({
            title: jsonOutput.title || 'Unknown Title',
            thumbnail: jsonOutput.thumbnail,
            duration
          })
        } catch {
          resolve(null)
        }
      } else {
        resolve(null)
      }
    })
    formatProcess.on('error', () => resolve(null))
  })
}

// Handle incoming HTTP requests
function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  mainWindow: electron.BrowserWindow | null
): void {
  // Set CORS headers for browser extension access
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const parsedUrl = url.parse(req.url || '', true)
  const pathname = parsedUrl.pathname

  // GET /api/status - Health check
  if (req.method === 'GET' && pathname === '/api/status') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', message: 'Nebula Downloader API is running' }))
    return
  }

  // GET /api/formats - Get available formats for a video
  if (req.method === 'GET' && pathname === '/api/formats') {
    const videoUrl = parsedUrl.query.url as string
    if (!videoUrl) {
      res.writeHead(400)
      res.end(JSON.stringify({ status: 'error', message: 'Missing url parameter' }))
      return
    }

    console.log(`[API Server] Fetching formats for: ${videoUrl}`)
    getFormats(videoUrl).then((result) => {
      if (result) {
        res.writeHead(200)
        res.end(JSON.stringify({ status: 'success', ...result }))
      } else {
        res.writeHead(500)
        res.end(JSON.stringify({ status: 'error', message: 'Failed to fetch formats' }))
      }
    })
    return
  }

  // GET /api/metadata - Get video metadata
  if (req.method === 'GET' && pathname === '/api/metadata') {
    const videoUrl = parsedUrl.query.url as string
    if (!videoUrl) {
      res.writeHead(400)
      res.end(JSON.stringify({ status: 'error', message: 'Missing url parameter' }))
      return
    }

    console.log(`[API Server] Fetching metadata for: ${videoUrl}`)
    getMetadata(videoUrl).then((result) => {
      if (result) {
        res.writeHead(200)
        res.end(JSON.stringify({ status: 'success', ...result }))
      } else {
        res.writeHead(500)
        res.end(JSON.stringify({ status: 'error', message: 'Failed to fetch metadata' }))
      }
    })
    return
  }

  // POST /api/download - Queue a new download
  if (req.method === 'POST' && pathname === '/api/download') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
      if (body.length > 1024 * 1024) {
        res.writeHead(413)
        res.end(JSON.stringify({ status: 'error', message: 'Request too large' }))
        req.destroy()
      }
    })

    req.on('end', async () => {
      try {
        const data = JSON.parse(body)

        if (!data.url || typeof data.url !== 'string') {
          res.writeHead(400)
          res.end(JSON.stringify({ status: 'error', message: 'Missing url field' }))
          return
        }

        const videoUrl = data.url.trim()
        const formatId = data.formatId as string | undefined

        console.log(`[API Server] Received download request for: ${videoUrl}`)
        if (formatId) {
          console.log(`[API Server] Format ID: ${formatId}`)
        }

        // Get video info
        const videoInfo = await getVideoInfo(videoUrl)

        // Create download entry
        const newDownload: Download = {
          id: crypto.randomUUID(),
          url: videoUrl,
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

        // Add to database
        await db.addDownload(newDownload)

        // Notify the renderer
        mainWindow?.webContents.send('download-added', newDownload)

        // Start the download
        if (mainWindow) {
          startDownload(newDownload, mainWindow)
        }

        console.log(`[API Server] Download queued: ${newDownload.id}`)

        res.writeHead(200)
        res.end(
          JSON.stringify({
            status: 'success',
            message: 'Download queued',
            downloadId: newDownload.id
          })
        )
      } catch (error) {
        console.error('[API Server] Error processing request:', error)
        res.writeHead(400)
        res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON body' }))
      }
    })

    req.on('error', (err) => {
      console.error('[API Server] Request error:', err)
      res.writeHead(500)
      res.end(JSON.stringify({ status: 'error', message: 'Internal server error' }))
    })
    return
  }

  // Not found
  res.writeHead(404)
  res.end(JSON.stringify({ status: 'error', message: 'Not found' }))
}

/**
 * Start the HTTP API server
 * @param port Port number to listen on (default: 5000)
 * @param mainWindow Reference to the main Electron window
 */
export function startApiServer(
  port: number = 5000,
  mainWindow: electron.BrowserWindow | null
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isRunning) {
      console.log('[API Server] Already running')
      resolve()
      return
    }

    server = http.createServer((req, res) => {
      handleRequest(req, res, mainWindow)
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[API Server] Port ${port} is already in use`)
      } else {
        console.error('[API Server] Server error:', err)
      }
      reject(err)
    })

    server.listen(port, '0.0.0.0', () => {
      isRunning = true
      console.log('='.repeat(60))
      console.log(`[API Server] V2 - Listening on http://0.0.0.0:${port} (All Interfaces)`)
      console.log('[API Server] Ready for extension connections')
      console.log('='.repeat(60))
      resolve()
    })
  })
}

/**
 * Stop the HTTP API server
 */
export function stopApiServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server || !isRunning) {
      resolve()
      return
    }

    server.close(() => {
      isRunning = false
      server = null
      console.log('[API Server] Stopped')
      resolve()
    })
  })
}

/**
 * Check if the API server is currently running
 */
export function isApiServerRunning(): boolean {
  return isRunning
}

