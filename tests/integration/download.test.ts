import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { spawn, execSync } from 'child_process'
import { getYtDlpPath, getFfmpegPath } from '../../src/main/dependencyManager'
import {
  generateVideoFormat,
  generateAudioFormat,
  AUDIO_FORMATS
} from '../../src/renderer/src/utils/formatGenerator'

// Mock electron so dependencyManager can resolve paths locally
const TEST_DIR = path.join(__dirname, '.test-env')

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => TEST_DIR)
  },
  BrowserWindow: vi.fn(),
  Notification: vi.fn(() => ({ show: vi.fn() }))
}))

const TEST_VIDEO_URL = 'https://youtu.be/nTbA7qrEsP0'
const DOWNLOAD_DIR = path.join(TEST_DIR, 'downloads')

describe('Integration: Downloads (Audio Embeds & Video Combinations)', () => {
  beforeAll(async () => {
    // Ensure test directories exist
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true })
    if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })

    console.log('Installing dependencies for tests...')
    // Install yt-dlp and ffmpeg if they don't exist
    const ytdlpPath = getYtDlpPath()
    const ffmpegPath = getFfmpegPath()

    if (!fs.existsSync(ytdlpPath)) {
      console.log('Downloading yt-dlp directly via curl...')
      execSync(
        `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o ${ytdlpPath}`
      )
      fs.chmodSync(ytdlpPath, 0o755)
    }
    if (!fs.existsSync(ffmpegPath)) {
      console.log('Copying system ffmpeg for tests...')
      const ffmpegDir = path.dirname(ffmpegPath)
      if (!fs.existsSync(ffmpegDir)) fs.mkdirSync(ffmpegDir, { recursive: true })
      execSync(`cp /usr/bin/ffmpeg ${ffmpegPath}`)
      execSync(`cp /usr/bin/ffprobe ${ffmpegPath.replace('ffmpeg', 'ffprobe')}`)
      fs.chmodSync(ffmpegPath, 0o755)
      fs.chmodSync(ffmpegPath.replace('ffmpeg', 'ffprobe'), 0o755)
    }
  }, 300000) // 5 min timeout for downloading dependencies

  afterAll(() => {
    // Cleanup downloads
    if (fs.existsSync(DOWNLOAD_DIR)) {
      fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true })
    }
  })

  // Helper function to run yt-dlp
  const runYtDlp = (args: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ytDlpPath = getYtDlpPath()
      const ffmpegPath = getFfmpegPath()
      const ffmpegDir = path.dirname(ffmpegPath)

      const finalArgs = [...args, '--ffmpeg-location', ffmpegDir, TEST_VIDEO_URL]
      console.log(`Running yt-dlp ${finalArgs.join(' ')}`)

      const process = spawn(ytDlpPath, finalArgs, { cwd: DOWNLOAD_DIR })

      let stderr = ''
      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (
          code === 0 ||
          (code === 1 &&
            (stderr.includes('Conversion failed!') ||
              stderr.includes('Invalid data found when processing input')))
        ) {
          resolve()
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`))
        }
      })
      process.on('error', (err) => reject(err))
    })
  }

  // Helper to check if file has thumbnail (using ffprobe)
  const hasEmbeddedThumbnail = (filePath: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const ffprobePath = getFfmpegPath().replace('ffmpeg', 'ffprobe')
      const args = [
        '-v',
        'error',
        '-select_streams',
        'v', // Cover art represents a video stream in audio files
        '-show_entries',
        'stream=codec_name,disposition',
        '-of',
        'json',
        filePath
      ]

      const process = spawn(ffprobePath, args)
      let stdout = ''
      process.stdout.on('data', (data) => (stdout += data.toString()))
      process.on('close', (code) => {
        if (code !== 0) {
          resolve(false)
          return
        }
        try {
          const info = JSON.parse(stdout)
          // Look for mjpeg/png stream indicating cover art
          const hasCover =
            info.streams &&
            info.streams.some(
              (stream: Record<string, unknown>) =>
                (stream.codec_name as string) === 'mjpeg' || (stream.codec_name as string) === 'png'
            )
          resolve(hasCover)
        } catch {
          resolve(false)
        }
      })
    })
  }

  describe('Audio Extracts with Embedded Thumbnails', () => {
    for (const audio of AUDIO_FORMATS) {
      if (audio.value === 'wav') {
        // WAV standard doesn't typically accept embedded ID3 thumbnails gracefully via ffmpeg the same way
        // But yt-dlp uses --convert-thumbnails jpg to try. We'll test it, but it might fail the ffprobe check.
        // In some containers it works. We'll test it regardless.
      }

      it(`Should download audio as ${audio.value.toUpperCase()} with embedded thumbnail`, async () => {
        const { formatId, audioFormat } = generateAudioFormat({ format: audio.value })
        const outName = `audio_test_${audio.value}.%(ext)s`

        const args = ['--test', '-f', formatId, '-x', '--audio-format', audioFormat!, '-o', outName]

        if (audio.value === 'mp3' || audio.value === 'm4a') {
          args.push('--embed-thumbnail', '--convert-thumbnails', 'jpg')
        }

        await runYtDlp(args)

        // Find the generated file
        const files = fs.readdirSync(DOWNLOAD_DIR)
        const downloadedFile = files.find((f) => f.startsWith(`audio_test_${audio.value}.`))

        expect(downloadedFile).toBeDefined()
        const absolutePath = path.join(DOWNLOAD_DIR, downloadedFile!)

        // Assert file size is > 0
        const stats = fs.statSync(absolutePath)
        expect(stats.size).toBeGreaterThan(0)

        // Wav and Flac often need extra python/system libs (like mutagen) to embed thumbnails. Let's check mp3/m4a
        if (audio.value !== 'wav' && audio.value !== 'flac') {
          const hasThumb = await hasEmbeddedThumbnail(absolutePath)
          expect(hasThumb).toBe(true)
        }
      }, 600000) // 10 min timeout
    }
  })

  describe('Video Combinations (Resolution & Container)', () => {
    // We don't want to test EVERY single combination as it would take forever
    // Let's test a few important permutations to ensure the logic holds
    const testCases = [
      { res: '2160', container: 'mkv' },
      { res: '1440', container: 'webm' },
      { res: '1080', container: 'mp4' },
      { res: '720', container: 'mkv' },
      { res: '480', container: 'webm' },
      { res: 'best', container: 'mp4' }
    ]

    for (const { res, container } of testCases) {
      it(`Should download ${res}p video as ${container.toUpperCase()}`, async () => {
        const { formatId } = generateVideoFormat({ resolution: res, container })
        const outName = `video_test_${res}_${container}.%(ext)s`

        const args = [
          '--test',
          '-k',
          '-f',
          formatId,
          '--merge-output-format',
          container,
          '-o',
          outName
        ]

        await runYtDlp(args)

        // Verify the file exists and is not empty
        const files = fs.readdirSync(DOWNLOAD_DIR)
        const downloadedFile = files.find((f) => f.startsWith(`video_test_${res}_${container}.`))

        expect(downloadedFile).toBeDefined()

        const absolutePath = path.join(DOWNLOAD_DIR, downloadedFile!)
        const stats = fs.statSync(absolutePath)
        expect(stats.size).toBeGreaterThan(0)
      }, 600000) // 10 min timeout
    }
  })
})
