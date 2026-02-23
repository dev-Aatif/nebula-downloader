/* eslint-disable */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import {
  checkYtDlpUpdate,
  checkFfmpegUpdate,
  getCurrentYtDlpVersion,
  getCurrentFfmpegVersion,
  shouldAutoCheckUpdate
} from '../../../../src/main/dependencyManager/updater'

// We need to mock paths and downloader so it doesn't try to access real binaries or make web requests
vi.mock('../../../../src/main/dependencyManager/paths', () => ({
  getVersionFilePath: vi.fn(() => '/mock/userData/dependency-versions.json'),
  getYtDlpPath: vi.fn(() => '/mock/bin/yt-dlp'),
  getFfmpegPath: vi.fn(() => '/mock/bin/ffmpeg'),
  ytDlpExists: vi.fn(() => true),
  ffmpegExists: vi.fn(() => true)
}))

vi.mock('../../../../src/main/dependencyManager/downloader', () => ({
  getLatestYtDlpVersion: vi.fn(() => Promise.resolve('2024.03.11')),
  getLatestFfmpegVersion: vi.fn(() => Promise.resolve('autobuild-2024-03-11-12-34'))
}))

import { promisify } from 'util'

// Mock child_process execFile to simulate binary stdout
vi.mock('child_process', () => ({
  execFile: vi.fn((file, args, callback) => {
    if (file.includes('yt-dlp')) {
      callback(null, '2024.03.10\n', '')
    } else if (file.includes('ffmpeg')) {
      callback(
        null,
        'ffmpeg version autobuild-2024-03-10-12-34 Copyright (c) 2000-2024 the FFmpeg developers\n',
        ''
      )
    }
  })
}))

// We need to mock util.promisify globally because the updater uses `promisify(execFile)`
vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('util')>()
  return {
    ...actual,
    promisify: vi.fn((fn) => {
      // Return a function that directly resolves the mock stdout instead of using callbacks
      return async (file: string) => {
        if (file.includes('yt-dlp')) return { stdout: '2024.03.10\n' }
        if (file.includes('ffmpeg'))
          return {
            stdout:
              'ffmpeg version autobuild-2024-03-10-12-34 Copyright (c) 2000-2024 the FFmpeg developers\n'
          }
        return { stdout: '' }
      }
    })
  }
})

// Mock fs to simulate writing/reading the version tracker file
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()

  let mockFileContent = JSON.stringify({
    ytDlp: {
      version: '2024.03.10',
      lastChecked: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    }, // 2 days ago
    ffmpeg: { version: 'autobuild-2024-03-10-12-34', lastChecked: new Date().toISOString() } // Just now
  })

  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => mockFileContent),
      writeFileSync: vi.fn((path: any, data: any) => {
        mockFileContent = data as string
      })
    },
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => mockFileContent),
    writeFileSync: vi.fn((path: any, data: any) => {
      mockFileContent = data as string
    })
  }
})

describe('Dependency Updater Version Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Current Version Extraction', () => {
    it('correctly extracts yt-dlp version from binary stdout', async () => {
      const version = await getCurrentYtDlpVersion()
      expect(version).toBe('2024.03.10')
    })

    it('correctly extracts ffmpeg version from binary stdout', async () => {
      const version = await getCurrentFfmpegVersion()
      expect(version).toBe('autobuild-2024-03-10-12-34')
    })
  })

  describe('Auto Check Timing Rules', () => {
    it('requires update check for yt-dlp if more than 24 hours elapsed', () => {
      expect(shouldAutoCheckUpdate('ytDlp')).toBe(true)
    })

    it('skips update check for ffmpeg if checked less than 7 days ago', () => {
      expect(shouldAutoCheckUpdate('ffmpeg')).toBe(false)
    })
  })

  describe('Update Availability Checks', () => {
    it('detects yt-dlp update when latest > current', async () => {
      const result = await checkYtDlpUpdate()
      expect(result.updateAvailable).toBe(true)
      expect(result.currentVersion).toBe('2024.03.10')
      expect(result.latestVersion).toBe('2024.03.11')
    })

    it('detects ffmpeg update when latest != current', async () => {
      const result = await checkFfmpegUpdate()
      expect(result.updateAvailable).toBe(true)
      expect(result.currentVersion).toBe('autobuild-2024-03-10-12-34')
      expect(result.latestVersion).toBe('autobuild-2024-03-11-12-34')
    })
  })
})
