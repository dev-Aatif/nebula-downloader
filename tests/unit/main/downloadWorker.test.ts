import { describe, it, expect, vi } from 'vitest'
import { parseYtDlpError } from '../../../src/main/downloadWorker'

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn()
  }))
}))

vi.mock('../../../src/main/db', () => ({
  db: {
    addDownload: vi.fn(),
    updateDownload: vi.fn(),
    getSettings: vi.fn(() => ({ 
      outputDirectory: '/tmp/downloads',
      concurrentDownloads: 3
    })),
    getDownloads: vi.fn(() => [])
  }
}))

vi.mock('../../../src/main/dependencyManager', () => ({
  getYtDlpPath: vi.fn(() => '/mock/yt-dlp')
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp')
  },
  BrowserWindow: vi.fn(),
  Notification: vi.fn(() => ({ show: vi.fn() }))
}))

describe('Download Worker', () => {
  describe('parseYtDlpError', () => {
    it('should identify geo-restriction errors', () => {
      const errorMsg = 'ERROR: Video unavailable in your country'
      const result = parseYtDlpError(errorMsg)
      
      expect(result.userMessage).toContain('unavailable')
      expect(result.isRetryable).toBe(false)
    })

    it('should identify private video errors', () => {
      const errorMsg = 'ERROR: Private video'
      const result = parseYtDlpError(errorMsg)
      
      expect(result.userMessage).toContain('private')
      expect(result.isRetryable).toBe(false)
    })

    it('should identify network errors as retryable', () => {
      const errorMsg = 'ERROR: Unable to download webpage: <urlopen error [Errno 110] Connection timed out>'
      const result = parseYtDlpError(errorMsg)
      
      expect(result.userMessage).toContain('Network error')
      expect(result.isRetryable).toBe(true)
    })

    it('should identify throttle/rate limit errors as retryable', () => {
      const errorMsg = 'Sign in to confirm you’re not a bot'
      const result = parseYtDlpError(errorMsg)
      
      expect(result.userMessage).toContain('Download failed')
      expect(result.isRetryable).toBe(true)
    })

    it('should identify generic errors as retryable', () => {
      const errorMsg = 'Some random ffmpeg failing thing'
      const result = parseYtDlpError(errorMsg)
      
      expect(result.userMessage).toContain('Media processing failed')
      expect(result.isRetryable).toBe(false)
    })
  })
})
