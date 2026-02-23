import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { getLatestYtDlpVersion, getLatestFfmpegVersion } from '../../../../src/main/dependencyManager/downloader'

describe('Dependency Downloader HTTP Fallbacks', () => {
  beforeEach(() => {
    nock.disableNetConnect() // Prevent actual API calls
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  describe('GitHub API Integration', () => {
    it('successfully parses yt-dlp version from GitHub API', async () => {
      nock('https://api.github.com')
        .get('/repos/yt-dlp/yt-dlp/releases/latest')
        .reply(200, { tag_name: '2024.03.10' })

      const version = await getLatestYtDlpVersion()
      expect(version).toBe('2024.03.10')
    })

    it('successfully parses ffmpeg version from GitHub API', async () => {
      nock('https://api.github.com')
        .get('/repos/BtbN/FFmpeg-Builds/releases/latest')
        .reply(200, { tag_name: 'autobuild-2024-03-10-12-34' })

      const version = await getLatestFfmpegVersion()
      expect(version).toBe('autobuild-2024-03-10-12-34')
    })

    it('safely handles GitHub API 403 Rate Limit errors without throwing uncaught rejections (yt-dlp)', async () => {
      nock('https://api.github.com')
        .get('/repos/yt-dlp/yt-dlp/releases/latest')
        .reply(403, { message: 'API rate limit exceeded' })

      // The original downloader would throw, but we patched it to catch and return null
      const version = await getLatestYtDlpVersion()
      expect(version).toBeNull()
    })

    it('safely handles GitHub API 403 Rate Limit errors without throwing uncaught rejections (ffmpeg)', async () => {
      nock('https://api.github.com')
        .get('/repos/BtbN/FFmpeg-Builds/releases/latest')
        .reply(403, { message: 'API rate limit exceeded' })

      const version = await getLatestFfmpegVersion()
      expect(version).toBeNull()
    })
  })
})
