import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import http from 'http'
import { startApiServer, stopApiServer, isApiServerRunning } from '../../../src/main/apiServer'

// Mock Electron and other dependencies
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp'),
    isPackaged: false
  },
  dialog: {
    showErrorBox: vi.fn()
  }
}))

vi.mock('../../../src/main/db', () => ({
  db: {
    addDownload: vi.fn()
  }
}))

vi.mock('../../../src/main/dependencyManager', () => ({
  getYtDlpPath: vi.fn(() => '/mock/path/to/yt-dlp')
}))

describe('API Server (apiServer.ts)', () => {
  const mockMainWindow = {
    webContents: {
      send: vi.fn()
    }
  } as any

  beforeEach(async () => {
    vi.clearAllMocks()
    await stopApiServer() // Ensure clean state
  })

  afterEach(async () => {
    await stopApiServer()
  })

  it('should start and stop the server', async () => {
    expect(isApiServerRunning()).toBe(false)
    
    // We'll use a dynamic port to avoid conflicts
    const port = 5001 + Math.floor(Math.random() * 1000)
    await startApiServer(port, mockMainWindow)
    
    expect(isApiServerRunning()).toBe(true)
    
    await stopApiServer()
    expect(isApiServerRunning()).toBe(false)
  })

  it('should handle CORS preflight requests', async () => {
    const port = 5001 + Math.floor(Math.random() * 1000)
    await startApiServer(port, mockMainWindow)

    return new Promise<void>((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port,
        path: '/api/download',
        method: 'OPTIONS',
        headers: { 'Origin': 'chrome-extension://mock' }
      }, (res) => {
        try {
          expect(res.statusCode).toBe(204)
          expect(res.headers['access-control-allow-origin']).toBe('chrome-extension://mock')
          expect(res.headers['access-control-allow-methods']).toContain('POST')
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      req.on('error', reject)
      req.end()
    })
  })

  it('should reject non-POST requests to /api/download', async () => {
    const port = 5001 + Math.floor(Math.random() * 1000)
    await startApiServer(port, mockMainWindow)

    return new Promise<void>((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port,
        path: '/api/download',
        method: 'GET',
      }, (res) => {
        try {
          expect(res.statusCode).toBe(404) // Backend doesn't differentiate methods natively outside POST, returning 404 cleanly
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      req.on('error', reject)
      req.end()
    })
  })

  it('should return 400 when url is missing in /api/download POST', async () => {
    const port = 5001 + Math.floor(Math.random() * 1000)
    await startApiServer(port, mockMainWindow)

    return new Promise<void>((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port,
        path: '/api/download',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            expect(res.statusCode).toBe(400)
            expect(JSON.parse(data).status).toBe('error')
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      })
      req.on('error', reject)
      req.write(JSON.stringify({ url: '' })) // Missing url
      req.end()
    })
  })

})
