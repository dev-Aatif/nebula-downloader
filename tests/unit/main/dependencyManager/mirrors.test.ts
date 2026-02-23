import { describe, it, expect, vi } from 'vitest'
import https from 'https'
import http from 'http'

// These are directly matching the URLs inside downloader.ts
const YTDLP_DIRECT_URLS = {
  linux: [
    'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
    'https://yt-dlp.org/downloads/latest/yt-dlp',
    'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp'
  ],
  win32: [
    'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    'https://yt-dlp.org/downloads/latest/yt-dlp.exe',
    'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp.exe'
  ]
}

const FFMPEG_DIRECT_URLS = {
  linux: [
    'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz'
  ],
  win32: [
    'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
  ]
}

// Bypasses Vitest mocks to reach real networking
vi.unmock('https')
vi.unmock('http')

/**
 * Checks if a URL is accessible by following redirects
 * Aborts the download once stable 200 OK headers are received to save bandwidth.
 */
function checkUrlAccessible(url: string, maxRedirects = 3): Promise<boolean> {
  return new Promise((resolve) => {
    if (maxRedirects < 0) return resolve(false)
    const client = url.startsWith('https') ? https : http
    
    // We do a GET instead of HEAD since some static hosts (like Github Releases) can behave strictly with HEAD
    const req = client.get(
      url,
      { headers: { 'User-Agent': 'Nebula-Downloader-Test' }, timeout: 15000 },
      (res) => {
        if (res.statusCode === 200) {
          req.destroy() // Stop downloading the file
          resolve(true)
          return
        }
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) && res.headers.location) {
          req.destroy()
          checkUrlAccessible(res.headers.location, maxRedirects - 1).then(resolve)
          return
        }
        req.destroy()
        resolve(false)
      }
    )
    
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

describe('Dependency Mirrors Accessibility', () => {
  it.concurrent.each(YTDLP_DIRECT_URLS.linux)(
    'Linux yt-dlp mirror should be accessible: %s',
    async (url) => {
      const isAlive = await checkUrlAccessible(url)
      expect(isAlive).toBe(true)
    },
    20000 // 20s timeout per test
  )

  it.concurrent.each(YTDLP_DIRECT_URLS.win32)(
    'Windows yt-dlp mirror should be accessible: %s',
    async (url) => {
      const isAlive = await checkUrlAccessible(url)
      expect(isAlive).toBe(true)
    },
    20000
  )

  it.concurrent.each(FFMPEG_DIRECT_URLS.linux)(
    'Linux ffmpeg mirror should be accessible: %s',
    async (url) => {
      const isAlive = await checkUrlAccessible(url)
      expect(isAlive).toBe(true)
    },
    20000
  )

  it.concurrent.each(FFMPEG_DIRECT_URLS.win32)(
    'Windows ffmpeg mirror should be accessible: %s',
    async (url) => {
      const isAlive = await checkUrlAccessible(url)
      expect(isAlive).toBe(true)
    },
    20000
  )
})
