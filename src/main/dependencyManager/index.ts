/**
 * Dependency Manager
 * Main entry point for managing yt-dlp and ffmpeg dependencies
 *
 * Strategy:
 * - ffmpeg: Bundled with the app (large, stable)
 * - yt-dlp: Downloaded on first run, auto-updated (small, frequently updated)
 */

import { getYtDlpPath, getFfmpegPath, ytDlpExists, ffmpegExists } from './paths'
import { downloadYtDlp } from './downloader'
import {
  getCurrentYtDlpVersion,
  getCurrentFfmpegVersion,
  checkYtDlpUpdate,
  checkFfmpegUpdate,
  shouldAutoCheckUpdate,
  updateVersionInfo
} from './updater'
import { DependencyStatus } from './types'

// Re-export everything for convenience
export * from './types'
export * from './paths'
export * from './downloader'
export * from './updater'

/**
 * Initialize dependencies and check status
 * Call this on app startup
 */
export async function initializeDependencies(): Promise<{
  needsSetup: boolean
  status: DependencyStatus
}> {
  console.log('[DependencyManager] Initializing dependencies...')

  const status = await getDependencyStatus()

  const needsSetup = !status.ytDlp.installed || !status.ffmpeg.installed

  console.log('[DependencyManager] Status:', {
    ytDlp: status.ytDlp.installed ? `v${status.ytDlp.version}` : 'Not installed',
    ffmpeg: status.ffmpeg.installed ? `v${status.ffmpeg.version}` : 'Not installed',
    needsSetup
  })

  return { needsSetup, status }
}

/**
 * Get the current status of all dependencies
 */
export async function getDependencyStatus(): Promise<DependencyStatus> {
  const [ytDlpVersion, ffmpegVersion] = await Promise.all([
    getCurrentYtDlpVersion(),
    getCurrentFfmpegVersion()
  ])

  return {
    ytDlp: {
      installed: ytDlpExists(),
      version: ytDlpVersion,
      path: getYtDlpPath()
    },
    ffmpeg: {
      installed: ffmpegExists(),
      version: ffmpegVersion,
      path: getFfmpegPath()
    }
  }
}

/**
 * Ensure yt-dlp is installed, downloading if necessary
 */
export async function ensureYtDlpInstalled(
  onProgress?: (percent: number) => void
): Promise<boolean> {
  if (ytDlpExists()) {
    console.log('[DependencyManager] yt-dlp already installed')
    return true
  }

  console.log('[DependencyManager] yt-dlp not found, downloading...')
  const result = await downloadYtDlp(onProgress)

  if (result.success) {
    updateVersionInfo('ytDlp', result.version)
  }

  return result.success
}

/**
 * Run background update checks for all dependencies
 * Only checks if enough time has passed since last check
 */
export async function runBackgroundUpdateChecks(): Promise<void> {
  console.log('[DependencyManager] Running background update checks...')

  // Check yt-dlp
  if (ytDlpExists() && shouldAutoCheckUpdate('ytDlp')) {
    try {
      const result = await checkYtDlpUpdate()
      if (result.updateAvailable) {
        console.log(
          `[DependencyManager] yt-dlp update available: ${result.currentVersion} -> ${result.latestVersion}`
        )
      }
    } catch (error) {
      console.warn('[DependencyManager] Failed to check yt-dlp:', error)
    }
  }

  // Check ffmpeg
  if (ffmpegExists() && shouldAutoCheckUpdate('ffmpeg')) {
    try {
      const result = await checkFfmpegUpdate()
      if (result.updateAvailable) {
        console.log(
          `[DependencyManager] ffmpeg update available: ${result.currentVersion} -> ${result.latestVersion}`
        )
      }
    } catch (error) {
      console.warn('[DependencyManager] Failed to check ffmpeg:', error)
    }
  }
}

/**
 * Get full dependency info including update status
 * Used for settings page
 */
export async function getFullDependencyStatus(): Promise<DependencyStatus> {
  const status = await getDependencyStatus()

  // Check for updates (cached if recently checked)
  try {
    if (status.ytDlp.installed) {
      const ytDlpUpdate = await checkYtDlpUpdate()
      status.ytDlp.updateAvailable = ytDlpUpdate.updateAvailable
      status.ytDlp.latestVersion = ytDlpUpdate.latestVersion
    }
  } catch {
    // Ignore update check failures
  }

  try {
    if (status.ffmpeg.installed) {
      const ffmpegUpdate = await checkFfmpegUpdate()
      status.ffmpeg.updateAvailable = ffmpegUpdate.updateAvailable
      status.ffmpeg.latestVersion = ffmpegUpdate.latestVersion
    }
  } catch {
    // Ignore update check failures
  }

  return status
}
