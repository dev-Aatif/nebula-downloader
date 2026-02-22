/**
 * Dependency Downloader
 * Downloads yt-dlp and ffmpeg with multi-mirror fallback, resume, and status reporting
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { getYtDlpPath, getTempDir, getUserDataBinDir } from './paths'
import { GitHubRelease, GitHubAsset } from './types'

// GitHub API URLs (primary)
const YTDLP_RELEASES_URL = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'
const FFMPEG_RELEASES_URL = 'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest'

// Direct download URLs — stable "latest" redirect URLs that bypass the API
const YTDLP_DIRECT_URLS = {
  linux: [
    'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
    'https://mirror.ghproxy.com/https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
    'https://gh-proxy.com/https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
    'https://ghproxy.net/https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'
  ],
  win32: [
    'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    'https://mirror.ghproxy.com/https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    'https://gh-proxy.com/https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    'https://ghproxy.net/https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  ]
}

const FFMPEG_DIRECT_URLS = {
  linux: [
    'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    'https://mirror.ghproxy.com/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    'https://gh-proxy.com/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
    'https://ghproxy.net/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz'
  ],
  win32: [
    'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    'https://mirror.ghproxy.com/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    'https://gh-proxy.com/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    'https://ghproxy.net/https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
  ]
}

const CONNECT_TIMEOUT = 15000 // 15 seconds
const MAX_RETRY_ROUNDS = 3 // Retry all mirrors up to 3 times

/** Status callback for UI feedback */
export type StatusCallback = (message: string) => void

/**
 * Make a GET request with timeout and redirect support
 */
function httpGet(url: string, timeout = CONNECT_TIMEOUT): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const client = parsed.protocol === 'https:' ? https : http

    const req = client.get(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: { 'User-Agent': 'Nebula-Downloader' },
        timeout
      },
      (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          httpGet(res.headers.location, timeout).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
          return
        }
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
        res.on('error', reject)
      }
    )
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`Connection timed out (${timeout / 1000}s)`))
    })
    req.on('error', reject)
  })
}

/**
 * Download a file with progress, timeout, and resume support (Range header)
 */
function downloadFile(
  url: string,
  destination: string,
  onProgress?: (percent: number, downloaded: number, total: number) => void,
  resumeFrom = 0,
  timeout = CONNECT_TIMEOUT
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl: string): void => {
      const parsed = new URL(reqUrl)
      const client = parsed.protocol === 'https:' ? https : http
      const headers: Record<string, string> = { 'User-Agent': 'Nebula-Downloader' }
      if (resumeFrom > 0) {
        headers['Range'] = `bytes=${resumeFrom}-`
      }

      const req = client.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers,
          timeout
        },
        (res) => {
          // Handle redirects
          if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
            doRequest(res.headers.location)
            return
          }

          // 206 Partial Content (resume) or 200 OK
          if (res.statusCode !== 200 && res.statusCode !== 206) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
            return
          }

          // Calculate total bytes
          let totalBytes: number
          let downloadedBytes: number

          if (res.statusCode === 206) {
            // Resume: content-range header gives full size
            const range = res.headers['content-range']
            totalBytes = range ? parseInt(range.split('/')[1] || '0', 10) : 0
            downloadedBytes = resumeFrom
          } else {
            totalBytes = parseInt(res.headers['content-length'] || '0', 10)
            downloadedBytes = 0
          }

          const flags = res.statusCode === 206 ? 'a' : 'w' // append vs write
          const fileStream = fs.createWriteStream(destination, { flags })

          res.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length
            if (onProgress && totalBytes > 0) {
              onProgress(
                Math.round((downloadedBytes / totalBytes) * 100),
                downloadedBytes,
                totalBytes
              )
            }
          })

          res.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close()
            resolve()
          })
          fileStream.on('error', (err) => {
            fs.unlink(destination, () => {})
            reject(err)
          })
          res.on('error', (err) => {
            // Don't delete on error — we may want to resume
            reject(err)
          })
        }
      )

      req.on('timeout', () => {
        req.destroy()
        reject(new Error(`Download timed out (${timeout / 1000}s)`))
      })
      req.on('error', reject)
    }

    doRequest(url)
  })
}

/**
 * Get the size of a partially downloaded file (for resume)
 */
function getPartialSize(filepath: string): number {
  try {
    if (fs.existsSync(filepath)) {
      return fs.statSync(filepath).size
    }
  } catch {
    // ignore
  }
  return 0
}

/**
 * Download from multiple mirrors with resume support.
 * If a mirror fails midway, the next mirror resumes from where the previous left off.
 * After exhausting all mirrors, retries the full list up to MAX_RETRY_ROUNDS times.
 */
async function downloadWithMirrors(
  urls: string[],
  destination: string,
  onProgress?: (percent: number) => void,
  onStatus?: StatusCallback,
  label = 'file'
): Promise<void> {
  let lastError: Error | null = null
  let maxPercent = 0

  // Check for existing partial download (from a previous failed/cancelled attempt)
  const existingPartial = getPartialSize(destination)
  if (existingPartial > 0) {
    onStatus?.(`Found cached download (${formatSize(existingPartial)}), resuming...`)
    console.log(`[DependencyManager] Found cached partial for ${label}: ${existingPartial} bytes`)
  }

  for (let round = 0; round < MAX_RETRY_ROUNDS; round++) {
    if (round > 0) {
      onStatus?.(`Retry round ${round + 1}/${MAX_RETRY_ROUNDS}...`)
      console.log(`[DependencyManager] Retry round ${round + 1} for ${label}`)
    }

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const mirrorName = extractMirrorName(url)
      const mirrorLabel = round === 0
        ? `Mirror ${i + 1}/${urls.length}`
        : `Mirror ${i + 1}/${urls.length} (retry ${round + 1})`

      onStatus?.(`${mirrorLabel}: Connecting to ${mirrorName}...`)
      console.log(`[DependencyManager] ${mirrorLabel} for ${label}: ${url}`)

      try {
        const resumeFrom = getPartialSize(destination)
        if (resumeFrom > 0) {
          onStatus?.(`${mirrorLabel}: Resuming from ${formatSize(resumeFrom)}...`)
          console.log(`[DependencyManager] Resuming ${label} from ${resumeFrom} bytes`)
        }

        await downloadFile(
          url,
          destination,
          (percent) => {
            if (percent > maxPercent) {
              maxPercent = percent
              onProgress?.(maxPercent)
            }
          },
          resumeFrom
        )

        onStatus?.(`Downloaded from ${mirrorName}`)
        console.log(`[DependencyManager] ✓ Downloaded ${label} from ${mirrorLabel}`)
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`[DependencyManager] ✗ ${mirrorLabel} failed for ${label}: ${lastError.message}`)
        onStatus?.(`${mirrorLabel} failed: ${lastError.message}`)

        // Keep partial downloads for resume, only clean up tiny files (<1KB)
        const partialSize = getPartialSize(destination)
        if (partialSize < 1024) {
          try {
            if (fs.existsSync(destination)) fs.unlinkSync(destination)
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  throw new Error(
    `All mirrors failed after ${MAX_RETRY_ROUNDS} rounds for ${label}. Last error: ${lastError?.message || 'unknown'}`
  )
}

/** Extract a short human-readable name from a URL */
function extractMirrorName(url: string): string {
  try {
    const hostname = new URL(url).hostname
    if (hostname.includes('github.com')) return 'GitHub'
    if (hostname.includes('ghproxy')) return 'GHProxy'
    if (hostname.includes('gh-proxy')) return 'GH-Proxy'
    if (hostname.includes('johnvansickle')) return 'JohnVanSickle'
    return hostname
  } catch {
    return 'mirror'
  }
}

/** Format bytes to human-readable */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── GitHub API helpers ──

export async function getLatestYtDlpRelease(): Promise<GitHubRelease> {
  const response = await httpGet(YTDLP_RELEASES_URL)
  return JSON.parse(response) as GitHubRelease
}

import { execFile } from 'child_process'
import { promisify } from 'util'
import AdmZip from 'adm-zip'

const execFileAsync = promisify(execFile)

export async function getLatestFfmpegRelease(): Promise<GitHubRelease> {
  const response = await httpGet(FFMPEG_RELEASES_URL)
  return JSON.parse(response) as GitHubRelease
}

// ── Download functions ──

/**
 * Download yt-dlp with multi-mirror fallback and status reporting
 */
export async function downloadYtDlp(
  onProgress?: (percent: number) => void,
  onStatus?: StatusCallback
): Promise<{ success: boolean; version: string; error?: string }> {
  const assetName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  const tempDir = getTempDir()
  const tempPath = path.join(tempDir, `${assetName}.tmp`)
  const finalPath = getYtDlpPath()

  try {
    // Try GitHub API first for exact version + URL
    let downloadUrl: string | null = null
    let version = 'latest'

    onStatus?.('Checking for latest version...')

    try {
      const release = await getLatestYtDlpRelease()
      version = release.tag_name
      const asset = release.assets.find((a: GitHubAsset) => a.name === assetName)
      if (asset) {
        downloadUrl = asset.browser_download_url
        onStatus?.(`Found yt-dlp ${version}`)
      }
    } catch (apiErr) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
      console.warn(`[DependencyManager] GitHub API failed: ${msg}`)
      onStatus?.('GitHub API unavailable, trying direct mirrors...')
    }

    // Build URL list
    const platform = process.platform === 'win32' ? 'win32' : 'linux'
    const urls: string[] = []
    if (downloadUrl) urls.push(downloadUrl)
    urls.push(...YTDLP_DIRECT_URLS[platform])

    // Download with fallback
    await downloadWithMirrors(urls, tempPath, onProgress, onStatus, 'yt-dlp')

    // Verify and move to final location
    if (!fs.existsSync(tempPath)) {
      throw new Error('Download file not found after completion')
    }

    onStatus?.('Installing yt-dlp...')

    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath)
    fs.copyFileSync(tempPath, finalPath)
    fs.unlinkSync(tempPath)

    if (process.platform !== 'win32') {
      fs.chmodSync(finalPath, 0o755)
    }

    if (!fs.existsSync(finalPath)) {
      throw new Error('Installation verification failed')
    }

    onStatus?.('yt-dlp installed successfully')
    console.log(`[DependencyManager] yt-dlp ${version} installed`)
    return { success: true, version }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[DependencyManager] Failed to download yt-dlp:', msg)
    onStatus?.(`Failed: ${msg}`)

    // DON'T delete tempPath on failure — keep it so re-clicking Install resumes
    // The partial file at tempPath persists between install attempts

    return { success: false, version: '', error: msg }
  }
}

/**
 * Download FFmpeg with multi-mirror fallback and status reporting
 */
export async function downloadFfmpeg(
  onProgress?: (percent: number) => void,
  onStatus?: StatusCallback
): Promise<{ success: boolean; version: string; error?: string }> {
  const isWin = process.platform === 'win32'
  const tempDir = getTempDir()
  const archivePath = path.join(tempDir, isWin ? 'ffmpeg.zip' : 'ffmpeg.tar.xz')
  const extractDir = path.join(tempDir, 'ffmpeg-extract')

  try {
    // Try GitHub API first
    let downloadUrl: string | null = null
    let version = 'latest'

    onStatus?.('Checking for latest version...')

    try {
      const release = await getLatestFfmpegRelease()
      version = release.tag_name
      const asset = release.assets.find((a: GitHubAsset) => {
        if (isWin) {
          return a.name.includes('win64') && a.name.includes('gpl') && a.name.endsWith('.zip')
        }
        return a.name.includes('linux64') && a.name.includes('gpl') && a.name.endsWith('.tar.xz')
      })
      if (asset) {
        downloadUrl = asset.browser_download_url
        onStatus?.(`Found FFmpeg ${version}`)
      }
    } catch (apiErr) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
      console.warn(`[DependencyManager] GitHub API failed: ${msg}`)
      onStatus?.('GitHub API unavailable, trying direct mirrors...')
    }

    // Build URL list
    const platform = isWin ? 'win32' : 'linux'
    const urls: string[] = []
    if (downloadUrl) urls.push(downloadUrl)
    urls.push(...FFMPEG_DIRECT_URLS[platform])

    // Clean up previous extractions
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true })
    fs.mkdirSync(extractDir, { recursive: true })

    // Download with fallback
    await downloadWithMirrors(urls, archivePath, onProgress, onStatus, 'FFmpeg')

    onStatus?.('Extracting FFmpeg...')

    if (isWin) {
      const zip = new AdmZip(archivePath)
      zip.extractAllTo(extractDir, true)
    } else {
      try {
        await execFileAsync('tar', ['-xf', archivePath, '-C', extractDir])
      } catch (err) {
        throw new Error(`Failed to extract archive: ${err}`)
      }
    }

    // Find the ffmpeg binary
    const binaryName = isWin ? 'ffmpeg.exe' : 'ffmpeg'
    let extractedBinaryPath = ''

    const findBinary = (dir: string): void => {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const fullPath = path.join(dir, file)
        if (fs.statSync(fullPath).isDirectory()) {
          findBinary(fullPath)
        } else if (file === binaryName && !extractedBinaryPath) {
          extractedBinaryPath = fullPath
        }
      }
    }
    findBinary(extractDir)

    if (!extractedBinaryPath) {
      throw new Error(`Could not find ${binaryName} in downloaded archive`)
    }

    onStatus?.('Installing FFmpeg...')

    const binDir = getUserDataBinDir()
    const finalPath = path.join(binDir, binaryName)

    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true })
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath)
    fs.copyFileSync(extractedBinaryPath, finalPath)

    if (!isWin) fs.chmodSync(finalPath, 0o755)

    // Cleanup
    onStatus?.('Cleaning up...')
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath)
    fs.rmSync(extractDir, { recursive: true, force: true })

    onStatus?.('FFmpeg installed successfully')
    console.log(`[DependencyManager] FFmpeg ${version} installed to ${finalPath}`)
    return { success: true, version }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[DependencyManager] Failed to download FFmpeg:', msg)
    onStatus?.(`Failed: ${msg}`)

    // Keep archivePath for resume on retry — only clean up extract dir
    try {
      if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }

    return { success: false, version: '', error: msg }
  }
}

// ── Version helpers ──

export async function getLatestYtDlpVersion(): Promise<string> {
  const release = await getLatestYtDlpRelease()
  return release.tag_name
}

export async function getLatestFfmpegVersion(): Promise<string> {
  const release = await getLatestFfmpegRelease()
  return release.tag_name
}
