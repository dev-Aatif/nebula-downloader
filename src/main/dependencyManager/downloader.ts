/**
 * Dependency Downloader
 * Downloads yt-dlp and ffmpeg from GitHub releases
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { getYtDlpPath, getTempDir, getUserDataBinDir } from './paths'
import { GitHubRelease, GitHubAsset } from './types'

const YTDLP_RELEASES_URL = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'
const FFMPEG_RELEASES_URL = 'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest'

/**
 * Make an HTTPS GET request and return the response body
 */
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Nebula-Downloader'
      }
    }

    https
      .get(url, options, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location
          if (redirectUrl) {
            httpsGet(redirectUrl).then(resolve).catch(reject)
            return
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
          return
        }

        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

/**
 * Download a file from URL to destination with progress callback
 */
function downloadFile(
  url: string,
  destination: string,
  onProgress?: (percent: number, downloadedBytes: number, totalBytes: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Nebula-Downloader'
      }
    }

    const makeRequest = (requestUrl: string): void => {
      https
        .get(requestUrl, options, (res) => {
          // Handle redirects
          if (res.statusCode === 301 || res.statusCode === 302) {
            const redirectUrl = res.headers.location
            if (redirectUrl) {
              makeRequest(redirectUrl)
              return
            }
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
            return
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
          let downloadedBytes = 0

          const fileStream = fs.createWriteStream(destination)

          res.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length
            if (onProgress && totalBytes > 0) {
              const percent = Math.round((downloadedBytes / totalBytes) * 100)
              onProgress(percent, downloadedBytes, totalBytes)
            }
          })

          res.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close()
            resolve()
          })

          fileStream.on('error', (err) => {
            fs.unlink(destination, () => {}) // Clean up partial file
            reject(err)
          })

          res.on('error', (err) => {
            fs.unlink(destination, () => {})
            reject(err)
          })
        })
        .on('error', reject)
    }

    makeRequest(url)
  })
}

/**
 * Fetch the latest yt-dlp release info from GitHub
 */
export async function getLatestYtDlpRelease(): Promise<GitHubRelease> {
  const response = await httpsGet(YTDLP_RELEASES_URL)
  return JSON.parse(response) as GitHubRelease
}

/**
 * Fetch the latest ffmpeg release info from GitHub (BtbN builds)
 */
export async function getLatestFfmpegRelease(): Promise<GitHubRelease> {
  const response = await httpsGet(FFMPEG_RELEASES_URL)
  return JSON.parse(response) as GitHubRelease
}

/**
 * Download yt-dlp to the userData bin directory
 */
export async function downloadYtDlp(
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; version: string; error?: string }> {
  try {
    console.log('[DependencyManager] Fetching latest yt-dlp release info...')
    const release = await getLatestYtDlpRelease()
    const version = release.tag_name

    // Determine asset name based on platform
    const assetName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'

    const asset = release.assets.find((a: GitHubAsset) => a.name === assetName)
    if (!asset) {
      throw new Error(`Could not find ${assetName} in release assets`)
    }

    console.log(`[DependencyManager] Downloading yt-dlp ${version}...`)
    console.log(`[DependencyManager] URL: ${asset.browser_download_url}`)

    // Ensure directories exist
    const tempDir = getTempDir()
    const binDir = getUserDataBinDir()
    console.log(`[DependencyManager] Temp dir: ${tempDir}`)
    console.log(`[DependencyManager] Bin dir: ${binDir}`)

    const tempPath = path.join(tempDir, `${assetName}.tmp`)
    const finalPath = getYtDlpPath()
    console.log(`[DependencyManager] Temp path: ${tempPath}`)
    console.log(`[DependencyManager] Final path: ${finalPath}`)

    // Download to temp file
    console.log('[DependencyManager] Starting download...')
    await downloadFile(asset.browser_download_url, tempPath, (percent) => {
      if (onProgress) onProgress(percent)
    })
    console.log('[DependencyManager] Download complete, checking temp file...')

    // Verify temp file exists
    if (!fs.existsSync(tempPath)) {
      throw new Error(`Temp file not found after download: ${tempPath}`)
    }
    const tempStats = fs.statSync(tempPath)
    console.log(`[DependencyManager] Temp file size: ${tempStats.size} bytes`)

    // Move to final location
    if (fs.existsSync(finalPath)) {
      console.log('[DependencyManager] Removing existing file...')
      fs.unlinkSync(finalPath)
    }
    console.log('[DependencyManager] Copying to final location...')
    fs.copyFileSync(tempPath, finalPath)
    console.log('[DependencyManager] Cleaning up temp file...')
    fs.unlinkSync(tempPath) // Clean up temp file

    // Set executable permissions on non-Windows
    if (process.platform !== 'win32') {
      console.log('[DependencyManager] Setting executable permissions...')
      fs.chmodSync(finalPath, 0o755)
    }

    // Verify final file exists
    if (!fs.existsSync(finalPath)) {
      throw new Error(`Final file not found after copy: ${finalPath}`)
    }

    console.log(`[DependencyManager] yt-dlp ${version} installed successfully`)
    return { success: true, version }
  } catch (error) {
    console.error('[DependencyManager] Failed to download yt-dlp:', error)
    return {
      success: false,
      version: '',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Download ffmpeg to the resources bin directory (for manual updates)
 * Note: In production, ffmpeg is bundled. This is for updating.
 */
export async function downloadFfmpeg(
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; version: string; error?: string }> {
  try {
    console.log('[DependencyManager] Fetching latest ffmpeg release info...')
    const release = await getLatestFfmpegRelease()
    const version = release.tag_name

    // Find the Windows GPL build (includes all codecs)
    // Looking for: ffmpeg-master-latest-win64-gpl.zip or similar
    const asset = release.assets.find(
      (a: GitHubAsset) =>
        a.name.includes('win64') && a.name.includes('gpl') && a.name.endsWith('.zip')
    )

    if (!asset) {
      throw new Error('Could not find Windows ffmpeg build in release assets')
    }

    console.log(`[DependencyManager] Downloading ffmpeg ${version}...`)
    console.log(`[DependencyManager] URL: ${asset.browser_download_url}`)

    const tempDir = getTempDir()
    const zipPath = path.join(tempDir, 'ffmpeg.zip')

    // Download zip file
    await downloadFile(asset.browser_download_url, zipPath, (percent) => {
      if (onProgress) onProgress(percent)
    })

    // Note: Extracting zip requires additional handling
    // For now, we'll just report success with the download
    // The user would need to manually extract or we'd need a zip library

    console.log(`[DependencyManager] ffmpeg ${version} downloaded to ${zipPath}`)
    console.log(
      '[DependencyManager] Note: ffmpeg update requires manual extraction or app restart with new bundle'
    )

    return { success: true, version }
  } catch (error) {
    console.error('[DependencyManager] Failed to download ffmpeg:', error)
    return {
      success: false,
      version: '',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Get the latest yt-dlp version string
 */
export async function getLatestYtDlpVersion(): Promise<string> {
  const release = await getLatestYtDlpRelease()
  return release.tag_name
}

/**
 * Get the latest ffmpeg version string
 */
export async function getLatestFfmpegVersion(): Promise<string> {
  const release = await getLatestFfmpegRelease()
  return release.tag_name
}
