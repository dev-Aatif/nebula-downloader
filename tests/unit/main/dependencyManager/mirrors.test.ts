import { describe, it, expect, vi } from 'vitest'
import https from 'https'
import http from 'http'

// These are directly matching the URLs inside downloader.ts
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

// Bypasses Vitest mocks to reach real networking
vi.unmock('https')
vi.unmock('http')

/**
 * Checks if a URL is accessible by following redirects
 * Aborts the download once stable 200 OK headers are received to save bandwidth.
 */
async function checkUrlAccessible(url: string, maxRedirects = 5): Promise<boolean> {
  const controller = new AbortController()
  // We timeout fetch requests manually just in case
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'Nebula-Downloader-Test' },
      signal: controller.signal as any
    })
    const ok = res.status === 200 || res.status === 206 || res.status === 302 || res.ok

    clearTimeout(timeoutId)
    return ok
  } catch (error) {
    clearTimeout(timeoutId)
    return false
  }
}

describe('Dependency Mirrors Accessibility', () => {
  it.each(YTDLP_DIRECT_URLS.linux)(
    'Linux yt-dlp mirror should be accessible: %s',
    async (url) => {
      const isAlive = await checkUrlAccessible(url)
      expect(isAlive).toBe(true)
    },
    20000 // 20s timeout per test
  )

  it.each(YTDLP_DIRECT_URLS.win32)(
    'Windows yt-dlp mirror should be accessible: %s',
    async (url) => {
      const isAlive = await checkUrlAccessible(url)
      expect(isAlive).toBe(true)
    },
    20000
  )

  it.each(FFMPEG_DIRECT_URLS.linux)(
    'Linux ffmpeg mirror should be accessible: %s',
    async (url) => {
      const isAlive = await checkUrlAccessible(url)
      expect(isAlive).toBe(true)
    },
    20000
  )

  it.each(FFMPEG_DIRECT_URLS.win32)(
    'Windows ffmpeg mirror should be accessible: %s',
    async (url) => {
      const isAlive = await checkUrlAccessible(url)
      expect(isAlive).toBe(true)
    },
    20000
  )
})
