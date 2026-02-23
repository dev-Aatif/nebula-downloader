/**
 * Dependency Updater
 * Manages version tracking and update checking for yt-dlp and ffmpeg
 */

import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getVersionFilePath, getYtDlpPath, getFfmpegPath, ytDlpExists, ffmpegExists } from './paths'
import { downloadYtDlp, getLatestYtDlpVersion, getLatestFfmpegVersion } from './downloader'
import { VersionFile, UpdateCheckResult } from './types'

const execFileAsync = promisify(execFile)

/**
 * Read the version tracking file
 */
function readVersionFile(): VersionFile {
  const filePath = getVersionFilePath()
  if (!fs.existsSync(filePath)) {
    return {}
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as VersionFile
  } catch {
    return {}
  }
}

/**
 * Write the version tracking file
 */
function writeVersionFile(data: VersionFile): void {
  const filePath = getVersionFilePath()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Update version info for a dependency
 */
export function updateVersionInfo(dependency: 'ytDlp' | 'ffmpeg', version: string): void {
  const versionFile = readVersionFile()
  const now = new Date().toISOString()

  versionFile[dependency] = {
    version,
    installedAt: now,
    lastChecked: now
  }

  writeVersionFile(versionFile)
}

/**
 * Get the currently installed yt-dlp version
 * Tries to get it from the binary, falls back to version file
 */
export async function getCurrentYtDlpVersion(): Promise<string | null> {
  if (!ytDlpExists()) {
    return null
  }

  try {
    const { stdout } = await execFileAsync(getYtDlpPath(), ['--version'])
    const version = stdout.trim()

    // Update version file with actual version
    const versionFile = readVersionFile()
    if (!versionFile.ytDlp || versionFile.ytDlp.version !== version) {
      updateVersionInfo('ytDlp', version)
    }

    return version
  } catch (error) {
    console.error('[DependencyManager] Failed to get yt-dlp version:', error)

    // Fall back to version file
    const versionFile = readVersionFile()
    return versionFile.ytDlp?.version || null
  }
}

/**
 * Get the currently installed ffmpeg version
 * Tries to get it from the binary, falls back to version file
 */
export async function getCurrentFfmpegVersion(): Promise<string | null> {
  if (!ffmpegExists()) {
    return null
  }

  try {
    const { stdout } = await execFileAsync(getFfmpegPath(), ['-version'])
    // Parse version from: "ffmpeg version 6.0-full_build-www.gyan.dev ..."
    const match = stdout.match(/ffmpeg version (\S+)/)
    const version = match ? match[1] : 'unknown'

    // Update version file
    const versionFile = readVersionFile()
    if (!versionFile.ffmpeg || versionFile.ffmpeg.version !== version) {
      updateVersionInfo('ffmpeg', version)
    }

    return version
  } catch (error) {
    console.error('[DependencyManager] Failed to get ffmpeg version:', error)

    // Fall back to version file
    const versionFile = readVersionFile()
    return versionFile.ffmpeg?.version || null
  }
}

/**
 * Check if a yt-dlp update is available
 */
export async function checkYtDlpUpdate(): Promise<UpdateCheckResult> {
  try {
    const currentVersion = await getCurrentYtDlpVersion()
    const latestVersion = await getLatestYtDlpVersion()

    // If latestVersion is null (e.g. Rate limit hit), no update can be performed
    if (!latestVersion) {
      return { updateAvailable: false, currentVersion, latestVersion: currentVersion || 'unknown' }
    }

    // yt-dlp versions are date-based: "2024.01.15"
    // Lexicographic comparison works correctly
    const updateAvailable = currentVersion ? latestVersion > currentVersion : true

    // Update last checked time
    const versionFile = readVersionFile()
    if (versionFile.ytDlp) {
      versionFile.ytDlp.lastChecked = new Date().toISOString()
      writeVersionFile(versionFile)
    }

    return {
      updateAvailable,
      currentVersion,
      latestVersion
    }
  } catch (error) {
    console.error('[DependencyManager] Failed to check yt-dlp update:', error)
    throw error
  }
}

/**
 * Check if an ffmpeg update is available
 */
export async function checkFfmpegUpdate(): Promise<UpdateCheckResult> {
  try {
    const currentVersion = await getCurrentFfmpegVersion()
    const latestVersion = await getLatestFfmpegVersion()

    // If latestVersion is null (e.g. Rate limit hit), no update can be performed
    if (!latestVersion) {
      return { updateAvailable: false, currentVersion, latestVersion: currentVersion || 'unknown' }
    }

    // For ffmpeg, we compare version strings
    // This is less precise but works for major updates
    const updateAvailable = currentVersion ? latestVersion !== currentVersion : false

    // Update last checked time
    const versionFile = readVersionFile()
    if (versionFile.ffmpeg) {
      versionFile.ffmpeg.lastChecked = new Date().toISOString()
      writeVersionFile(versionFile)
    }

    return {
      updateAvailable,
      currentVersion,
      latestVersion
    }
  } catch (error) {
    console.error('[DependencyManager] Failed to check ffmpeg update:', error)
    throw error
  }
}

/**
 * Update yt-dlp to the latest version
 */
export async function updateYtDlp(
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; version: string; error?: string }> {
  console.log('[DependencyManager] Starting yt-dlp update...')

  const result = await downloadYtDlp(onProgress)

  if (result.success) {
    updateVersionInfo('ytDlp', result.version)
  }

  return result
}

/**
 * Get the last time a dependency was checked for updates
 */
export function getLastCheckedTime(dependency: 'ytDlp' | 'ffmpeg'): string | null {
  const versionFile = readVersionFile()
  return versionFile[dependency]?.lastChecked || null
}

/**
 * Check if we should auto-check for updates (e.g., once per day)
 */
export function shouldAutoCheckUpdate(dependency: 'ytDlp' | 'ffmpeg'): boolean {
  const lastChecked = getLastCheckedTime(dependency)
  if (!lastChecked) return true

  const lastCheckedDate = new Date(lastChecked)
  const now = new Date()
  const hoursSinceCheck = (now.getTime() - lastCheckedDate.getTime()) / (1000 * 60 * 60)

  // Check once per day for yt-dlp (it updates frequently)
  // Check once per week for ffmpeg (it's stable)
  const threshold = dependency === 'ytDlp' ? 24 : 168

  return hoursSinceCheck > threshold
}
