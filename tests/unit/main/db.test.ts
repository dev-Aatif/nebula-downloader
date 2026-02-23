import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/nebula-test-db'),
    isPackaged: false
  }
}))

// Mock native database module
vi.mock('better-sqlite3', async () => {
  const mod = await import('../../__mocks__/better-sqlite3.ts')
  return { default: mod.default, _resetMockStores: mod._resetMockStores }
})

// Import after mocking electron
import { db } from '../../../src/main/db'
import { Download } from '../../../src/main/types'

describe('Database (db.ts)', () => {
  const testDbDir = '/tmp/nebula-test-db'

  beforeEach(async () => {
    // Ensure clean state before each test
    vi.clearAllMocks()
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testDbDir, { recursive: true })

    // We need to re-init manually to ensure we get a fresh DB object
    // @ts-expect-error accessing private property for testing
    const dbInstance = db.constructor.getInstance()
    // @ts-expect-error accessing private property for testing
    if (dbInstance.db) {
      // @ts-expect-error accessing private property for testing
      dbInstance.db.close()
      // @ts-expect-error accessing private property for testing
      dbInstance.db = null
    }

    await dbInstance.init()
  })

  afterEach(() => {
    // @ts-expect-error accessing private constructor
    const dbInstance = db.constructor.getInstance()
    // @ts-expect-error accessing private property for testing
    if (dbInstance.db) {
      // @ts-expect-error accessing private property for testing
      dbInstance.db.close()
      // @ts-expect-error accessing private property for testing
      dbInstance.db = null
    }
    if (fs.existsSync(testDbDir)) {
      try {
        fs.rmSync(testDbDir, { recursive: true, force: true })
      } catch {
        // Ignore locked file errors on windows occasionally during teardwon
      }
    }
  })

  it('should initialize database and create tables', async () => {
    // @ts-expect-error accessing private property for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sqlDb = db['db'] as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tables = sqlDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]

    const tableNames = tables.map((t) => t.name)
    expect(tableNames).toContain('downloads')
    expect(tableNames).toContain('settings')
  })

  it('should implement singleton pattern', () => {
    // @ts-expect-error accessing private constructor
    const instance1 = db.constructor.getInstance()
    // @ts-expect-error accessing private constructor
    const instance2 = db.constructor.getInstance()
    expect(instance1).toBe(instance2)
  })

  describe('Settings Operations', () => {
    it('should return default settings initially', () => {
      const settings = db.getSettings()
      expect(settings).toBeDefined()
      expect(settings.concurrency).toBe(3)
      expect(settings.defaultFormat).toContain('bestvideo')
    })

    it('should update and retrieve settings', async () => {
      await db.updateSettings({ concurrency: 5, defaultFormat: 'mp4' })
      const settings = db.getSettings()
      expect(settings.concurrency).toBe(5)
      expect(settings.defaultFormat).toBe('mp4')
    })

    it('should merge partial updates with existing settings', async () => {
      await db.updateSettings({ concurrency: 2 })
      await db.updateSettings({ defaultFormat: 'ogg' })
      const settings = db.getSettings()
      expect(settings.concurrency).toBe(2)
      expect(settings.defaultFormat).toBe('ogg')
    })
  })

  describe('Download Operations', () => {
    const mockDownload1: Download = {
      id: 'test-dl-1',
      url: 'https://youtube.com/watch?v=123',
      title: 'Test Video 1',
      status: 'downloading',
      progress: 50,
      formatId: 'mp4',
      quality: '1080p',
      size: '100 MB',
      speed: '5 MB/s',
      eta: '20s',
      createdAt: new Date(),
      updatedAt: new Date(),
      error: undefined,
      thumbnail: 'https://thumbnail.com/1',
      totalSizeInBytes: 0,
      downloadedSizeInBytes: 0,
      outputPath: '/downloads/test.mp4',
      mergeProgress: 0
    }

    const mockDownload2: Download = {
      id: 'test-dl-2',
      url: 'https://youtube.com/watch?v=456',
      title: 'Test Video 2',
      status: 'completed',
      progress: 100,
      formatId: 'mp3',
      speed: '',
      eta: '',
      quality: '320kbps',
      size: '5 MB',
      createdAt: new Date(),
      updatedAt: new Date(),
      totalSizeInBytes: 0,
      downloadedSizeInBytes: 0,
      outputDirectory: '/downloads',
      outputPath: '/downloads/test2.mp3'
    }

    it('should add a download', async () => {
      await db.addDownload(mockDownload1)
      const downloads = db.getDownloads()
      expect(downloads.length).toBe(1)
      expect(downloads[0].id).toBe(mockDownload1.id)
      expect(downloads[0].title).toBe(mockDownload1.title)
      // verify default properties are loaded
      expect(downloads[0].progress).toBe(50)
      expect(downloads[0].formatId).toBe('mp4')
    })

    it('should retrieve a specific download by id', async () => {
      await db.addDownload(mockDownload1)
      const dl = await db.getDownload(mockDownload1.id)
      expect(dl).toBeDefined()
      expect(dl?.id).toBe(mockDownload1.id)

      const missingDl = await db.getDownload('non-existent')
      expect(missingDl).toBeUndefined()
    })

    it('should handle updating downloads', async () => {
      await db.addDownload(mockDownload1)
      const updatedMock = { ...mockDownload1, title: 'Updated Title' }
      await db.updateDownload(updatedMock.id, updatedMock)

      const downloads = db.getDownloads()
      expect(downloads.length).toBe(1)
      expect(downloads[0].title).toBe('Updated Title')
    })

    it('should update a download', async () => {
      await db.addDownload(mockDownload1)
      await db.updateDownload(mockDownload1.id, { progress: 75, status: 'paused' })

      const dl = await db.getDownload(mockDownload1.id)
      expect(dl?.progress).toBe(75)
      expect(dl?.status).toBe('paused')
      expect(dl?.title).toBe(mockDownload1.title) // untouched fields should remain
    })

    it('should update multiple downloads', async () => {
      await db.addDownload(mockDownload1)
      await db.addDownload(mockDownload2)

      const update1 = { id: mockDownload1.id, progress: 100, status: 'completed' as const }
      const update2 = { id: mockDownload2.id, status: 'error' as const, error: 'Failed' }

      await db.updateDownloads([
        { ...mockDownload1, ...update1 },
        { ...mockDownload2, ...update2 }
      ])

      const dl1 = await db.getDownload(mockDownload1.id)
      const dl2 = await db.getDownload(mockDownload2.id)

      expect(dl1?.status).toBe('completed')
      expect(dl2?.status).toBe('error')
    })

    it('should remove a download', async () => {
      await db.addDownload(mockDownload1)
      expect(db.getDownloads().length).toBe(1)

      await db.removeDownload(mockDownload1.id)
      expect(db.getDownloads().length).toBe(0)
    })

    it('should handle loadAndResumeDownloads by resetting downloading state to paused', async () => {
      await db.addDownload(mockDownload1) // status: 'downloading'
      await db.addDownload(mockDownload2) // status: 'completed'

      const resumed = await db.loadAndResumeDownloads()

      // 'downloading' should be paused, 'completed' should stay completed
      const dl1 = resumed.find((d) => d.id === mockDownload1.id)
      const dl2 = resumed.find((d) => d.id === mockDownload2.id)

      expect(dl1?.status).toBe('paused')
      expect(dl2?.status).toBe('completed')

      // Also verify db state is updated
      const dl1Db = await db.getDownload(mockDownload1.id)
      expect(dl1Db?.status).toBe('paused')
    })
  })
})
