/**
 * Dependency Manager Paths
 * Centralized path resolution for yt-dlp and ffmpeg binaries
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'

/**
 * Get the user data bin directory where yt-dlp is stored
 * Creates the directory if it doesn't exist
 */
export function getUserDataBinDir(): string {
  const binDir = path.join(app.getPath('userData'), 'bin')
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true })
  }
  return binDir
}

/**
 * Get the path to yt-dlp executable
 * yt-dlp is stored in userData/bin/ and downloaded on first run
 */
export function getYtDlpPath(): string {
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return path.join(getUserDataBinDir(), binaryName)
}

/**
 * Get the path to ffmpeg executable
 * ffmpeg is bundled with the app in resources/bin/
 */
export function getFfmpegPath(): string {
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', binaryName)
  }
  // Development: use resources/bin (updated from bin/window)
  return path.join(process.cwd(), 'resources', 'bin', binaryName)
}

/**
 * Get the path to the version tracking file
 */
export function getVersionFilePath(): string {
  return path.join(app.getPath('userData'), 'dependency-versions.json')
}

/**
 * Check if yt-dlp exists and is accessible
 */
export function ytDlpExists(): boolean {
  const ytdlpPath = getYtDlpPath()
  return fs.existsSync(ytdlpPath)
}

/**
 * Check if ffmpeg exists and is accessible
 */
export function ffmpegExists(): boolean {
  const ffmpegPath = getFfmpegPath()
  return fs.existsSync(ffmpegPath)
}

/**
 * Get temp directory for downloads
 */
export function getTempDir(): string {
  const tempDir = path.join(app.getPath('temp'), 'nebula-downloader')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  return tempDir
}
