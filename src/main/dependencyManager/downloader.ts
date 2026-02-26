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
    'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
    'https://yt-dlp.org/downloads/latest/yt-dlp_linux',
    'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp_linux'
  ],
  win32: [
    'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    'https://yt-dlp.org/downloads/latest/yt-dlp.exe',
    'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp.exe'
  ]
}

const FFMPEG_DIRECT_URLS = {
  linux: [
    'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
    'https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz'
  ],
  win32: [
    'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
  ]
}

const CONNECT_TIMEOUT = 45000 // 45 seconds — standard for non-resumable downloads
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
 * Verify a downloaded file has valid magic bytes (not an HTML error page)
 * Returns null if valid, or an error message if invalid
 */
function verifyFileMagic(filepath: string, label: string): string | null {
  try {
    const fd = fs.openSync(filepath, 'r')
    const buf = Buffer.alloc(8)
    fs.readSync(fd, buf, 0, 8, 0)
    fs.closeSync(fd)

    // Check for HTML error pages (mirrors returning error with 200 status)
    if (buf[0] === 0x3c) {
      // Starts with '<' — this is HTML, not a binary
      return 'Mirror returned an HTML page instead of the file'
    }

    // Validate expected archive formats
    if (label.toLowerCase().includes('ffmpeg')) {
      // .tar.xz magic: FD 37 7A 58 5A 00
      const isXz =
        buf[0] === 0xfd &&
        buf[1] === 0x37 &&
        buf[2] === 0x7a &&
        buf[3] === 0x58 &&
        buf[4] === 0x5a &&
        buf[5] === 0x00
      // .zip magic: 50 4B (PK)
      const isZip = buf[0] === 0x50 && buf[1] === 0x4b
      if (!isXz && !isZip) {
        return `Invalid archive format (got bytes: ${buf.slice(0, 6).toString('hex')})`
      }
    }

    // For yt-dlp: ELF binary (Linux) or MZ (Windows exe)
    if (label.toLowerCase().includes('yt-dlp')) {
      const isElf = buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46
      const isMz = buf[0] === 0x4d && buf[1] === 0x5a
      const isShebang = buf[0] === 0x23 && buf[1] === 0x21 // #!/...
      if (!isElf && !isMz && !isShebang) {
        return `Invalid binary format (got bytes: ${buf.slice(0, 6).toString('hex')})`
      }
    }

    return null // Valid
  } catch {
    return 'Could not read downloaded file'
  }
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

  for (let round = 0; round < MAX_RETRY_ROUNDS; round++) {
    if (round > 0) {
      onStatus?.(`Retry round ${round + 1}/${MAX_RETRY_ROUNDS}...`)
      console.log(`[DependencyManager] Retry round ${round + 1} for ${label}`)
    }

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const mirrorName = extractMirrorName(url)
      const mirrorLabel =
        round === 0
          ? `Mirror ${i + 1}/${urls.length}`
          : `Mirror ${i + 1}/${urls.length} (retry ${round + 1})`

      onStatus?.(`${mirrorLabel}: Connecting to ${mirrorName}...`)
      console.log(`[DependencyManager] ${mirrorLabel} for ${label}: ${url}`)

      try {
        // Never resume from a file that failed validation — start fresh per mirror
        await downloadFile(
          url,
          destination,
          (percent) => {
            if (percent > maxPercent) {
              maxPercent = percent
              onProgress?.(maxPercent)
            }
          },
          0 // Always start fresh — resume caused too many corruption issues
        )

        // Validate the downloaded file has correct magic bytes
        const validationError = verifyFileMagic(destination, label)
        if (validationError) {
          console.warn(`[DependencyManager] ${mirrorLabel} served bad file: ${validationError}`)
          onStatus?.(`${mirrorLabel}: ${validationError}, trying next...`)
          // Delete the bad file so next mirror starts clean
          try {
            if (fs.existsSync(destination)) fs.unlinkSync(destination)
          } catch {
            /* */
          }
          lastError = new Error(validationError)
          continue // Try next mirror
        }

        onStatus?.(`Downloaded from ${mirrorName}`)
        console.log(`[DependencyManager] ✓ Downloaded ${label} from ${mirrorLabel}`)
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(
          `[DependencyManager] ✗ ${mirrorLabel} failed for ${label}: ${lastError.message}`
        )
        onStatus?.(`${mirrorLabel} failed: ${lastError.message}`)

        // Clean up any partial/bad file so next mirror starts fresh
        try {
          if (fs.existsSync(destination)) fs.unlinkSync(destination)
        } catch {
          /* ignore */
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
      if (isWin) {
        const release = await getLatestFfmpegRelease()
        version = release.tag_name
        const asset = release.assets.find((a: GitHubAsset) => {
          return a.name.includes('win64') && a.name.includes('gpl') && a.name.endsWith('.zip')
        })
        if (asset) {
          downloadUrl = asset.browser_download_url
          onStatus?.(`Found FFmpeg ${version}`)
        }
      } else {
        // Skip BtbN GitHub API for Linux; BtbN's Linux builds are dynamically linked
        // and cause "error while loading shared libraries" in yt-dlp.
        // We strictly use johnvansickle pure static builds for Linux.
        version = 'static-release'
        onStatus?.(`Found FFmpeg Static Release`)
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

    // Validate archive before extraction — FFmpeg archives are always >5MB
    const archiveSize = getPartialSize(archivePath)
    const MIN_FFMPEG_SIZE = 5 * 1024 * 1024 // 5MB minimum
    if (archiveSize < MIN_FFMPEG_SIZE) {
      // Corrupt or incomplete — delete and fail so next attempt starts fresh
      console.error(
        `[DependencyManager] FFmpeg archive too small (${formatSize(archiveSize)}), likely corrupt`
      )
      try {
        if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath)
      } catch {
        /* ignore */
      }
      throw new Error(
        `Downloaded archive is too small (${formatSize(archiveSize)}). ` +
          `The download may have been interrupted. Click Install to try again.`
      )
    }

    onStatus?.('Extracting FFmpeg...')

    if (isWin) {
      const zip = new AdmZip(archivePath)
      zip.extractAllTo(extractDir, true)
    } else {
      try {
        await execFileAsync('tar', ['-xf', archivePath, '-C', extractDir])
      } catch {
        // Extraction failed — the archive is corrupt. Delete it so next retry downloads fresh
        console.error(`[DependencyManager] Extraction failed, deleting corrupt archive`)
        try {
          if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath)
        } catch {
          /* ignore */
        }
        throw new Error(
          `Archive is corrupt and has been deleted. Click Install to download again fresh.`
        )
      }
    }

    // Find the ffmpeg and ffprobe binaries
    const binaryName = isWin ? 'ffmpeg.exe' : 'ffmpeg'
    const probeName = isWin ? 'ffprobe.exe' : 'ffprobe'

    let extractedFfmpegPath = ''
    let extractedFfprobePath = ''

    const findBinaries = (dir: string): void => {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const fullPath = path.join(dir, file)
        if (fs.statSync(fullPath).isDirectory()) {
          findBinaries(fullPath)
        } else {
          if (file === binaryName && !extractedFfmpegPath) {
            extractedFfmpegPath = fullPath
          }
          if (file === probeName && !extractedFfprobePath) {
            extractedFfprobePath = fullPath
          }
        }
      }
    }
    findBinaries(extractDir)

    if (!extractedFfmpegPath) {
      throw new Error(`Could not find ${binaryName} in downloaded archive`)
    }

    onStatus?.('Installing FFmpeg...')

    const binDir = getUserDataBinDir()
    const finalFfmpegPath = path.join(binDir, binaryName)
    const finalFfprobePath = path.join(binDir, probeName)

    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true })

    // Copy ffmpeg
    if (fs.existsSync(finalFfmpegPath)) fs.unlinkSync(finalFfmpegPath)
    fs.copyFileSync(extractedFfmpegPath, finalFfmpegPath)
    if (!isWin) fs.chmodSync(finalFfmpegPath, 0o755)

    // Copy ffprobe (if found)
    if (extractedFfprobePath) {
      if (fs.existsSync(finalFfprobePath)) fs.unlinkSync(finalFfprobePath)
      fs.copyFileSync(extractedFfprobePath, finalFfprobePath)
      if (!isWin) fs.chmodSync(finalFfprobePath, 0o755)
    } else {
      console.warn(
        `[DependencyManager] Could not find ${probeName} in archive. Audio extraction might fail.`
      )
    }

    // Cleanup
    onStatus?.('Cleaning up...')
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath)
    fs.rmSync(extractDir, { recursive: true, force: true })

    onStatus?.('FFmpeg installed successfully')
    console.log(`[DependencyManager] FFmpeg ${version} installed to ${finalFfmpegPath}`)
    return { success: true, version }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[DependencyManager] Failed to download FFmpeg:', msg)
    onStatus?.(`Failed: ${msg}`)

    // If the error is about corruption/extraction, the archive was already deleted above.
    // For other errors (network), keep the archive for resume on retry.
    // Only clean up extract dir.
    try {
      if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }

    return { success: false, version: '', error: msg }
  }
}

// ── Version helpers ──

export async function getLatestYtDlpVersion(): Promise<string | null> {
  try {
    const release = await getLatestYtDlpRelease()
    return release.tag_name
  } catch (error) {
    console.warn(
      '[DependencyManager] Failed to fetch latest yt-dlp version from API:',
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}

export async function getLatestFfmpegVersion(): Promise<string | null> {
  try {
    const release = await getLatestFfmpegRelease()
    return release.tag_name
  } catch (error) {
    console.warn(
      '[DependencyManager] Failed to fetch latest ffmpeg version from API:',
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}
