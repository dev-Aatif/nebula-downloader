import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'
import { Download, Settings } from './types'

class DB {
  private static instance: DB
  private db: Database.Database | null = null

  private constructor() {
    // Empty constructor to enforce singleton
  }

  public static getInstance(): DB {
    if (!DB.instance) {
      DB.instance = new DB()
    }
    return DB.instance
  }

  public async init(): Promise<void> {
    if (this.db) {
      return
    }

    const dbPath = path.join(app.getPath('userData'), 'database.sqlite')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        downloadDirectory TEXT,
        concurrency INTEGER,
        defaultFormat TEXT,
        proxy TEXT,
        lastPreset TEXT,
        downloadSubtitles INTEGER,
        autoDownload INTEGER,
        hasSeenDisclaimer INTEGER,
        speedLimit INTEGER,
        apiServerEnabled INTEGER,
        apiServerPort INTEGER
      );

      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        url TEXT,
        title TEXT,
        status TEXT,
        progress REAL,
        speed TEXT,
        eta TEXT,
        totalSizeInBytes REAL,
        downloadedSizeInBytes REAL,
        outputPath TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        formatId TEXT,
        errorLogs TEXT,
        speedValue REAL,
        thumbnail TEXT,
        retryCount INTEGER,
        formatOption TEXT,
        isAudioExtract INTEGER,
        audioFormat TEXT
      );
    `)

    const row = this.db.prepare('SELECT count(*) as count FROM settings WHERE id = 1').get() as {
      count: number
    }
    if (row.count === 0) {
      const defaultSettings = {
        downloadDirectory: app.getPath('downloads'),
        concurrency: 3,
        defaultFormat: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        proxy: ''
      }

      this.db
        .prepare(
          `
        INSERT INTO settings (id, downloadDirectory, concurrency, defaultFormat, proxy)
        VALUES (1, @downloadDirectory, @concurrency, @defaultFormat, @proxy)
      `
        )
        .run(defaultSettings)
    }
  }

  private assertDbReady(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.')
    }
    return this.db
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDownloadFromDb(row: any): Download {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      status: row.status,
      progress: row.progress,
      speed: row.speed,
      eta: row.eta,
      totalSizeInBytes: row.totalSizeInBytes,
      downloadedSizeInBytes: row.downloadedSizeInBytes,
      outputPath: row.outputPath,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      formatId: row.formatId || undefined,
      errorLogs: row.errorLogs ? JSON.parse(row.errorLogs) : undefined,
      speedValue: row.speedValue || undefined,
      thumbnail: row.thumbnail || undefined,
      retryCount: row.retryCount || undefined,
      formatOption: row.formatOption || undefined,
      isAudioExtract: row.isAudioExtract ? Boolean(row.isAudioExtract) : undefined,
      audioFormat: row.audioFormat || undefined
    }
  }

  public getDownloads(): Download[] {
    const db = this.assertDbReady()
    const rows = db.prepare('SELECT * FROM downloads').all()
    return rows.map((row) => this.mapDownloadFromDb(row))
  }

  public async addDownload(download: Download): Promise<void> {
    const db = this.assertDbReady()
    db.prepare(
      `
      INSERT INTO downloads (
        id, url, title, status, progress, speed, eta, totalSizeInBytes, downloadedSizeInBytes,
        outputPath, createdAt, updatedAt, formatId, errorLogs, speedValue, thumbnail, retryCount,
        formatOption, isAudioExtract, audioFormat
      ) VALUES (
        @id, @url, @title, @status, @progress, @speed, @eta, @totalSizeInBytes, @downloadedSizeInBytes,
        @outputPath, @createdAt, @updatedAt, @formatId, @errorLogs, @speedValue, @thumbnail, @retryCount,
        @formatOption, @isAudioExtract, @audioFormat
      )
    `
    ).run({
      ...download,
      createdAt: download.createdAt.toISOString(),
      updatedAt: download.updatedAt.toISOString(),
      formatId: download.formatId || null,
      errorLogs: download.errorLogs ? JSON.stringify(download.errorLogs) : null,
      speedValue: download.speedValue || null,
      thumbnail: download.thumbnail || null,
      retryCount: download.retryCount ?? null,
      formatOption: download.formatOption || null,
      isAudioExtract: download.isAudioExtract ? 1 : 0,
      audioFormat: download.audioFormat || null
    })
  }

  public async updateDownload(id: string, updates: Partial<Download>): Promise<void> {
    const db = this.assertDbReady()
    const current = await this.getDownload(id)
    if (!current) return

    const updated = { ...current, ...updates, updatedAt: new Date() }
    db.prepare(
      `
      UPDATE downloads SET
        url = @url, title = @title, status = @status, progress = @progress, speed = @speed,
        eta = @eta, totalSizeInBytes = @totalSizeInBytes, downloadedSizeInBytes = @downloadedSizeInBytes,
        outputPath = @outputPath, createdAt = @createdAt, updatedAt = @updatedAt, formatId = @formatId,
        errorLogs = @errorLogs, speedValue = @speedValue, thumbnail = @thumbnail, retryCount = @retryCount,
        formatOption = @formatOption, isAudioExtract = @isAudioExtract, audioFormat = @audioFormat
      WHERE id = @id
    `
    ).run({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      formatId: updated.formatId || null,
      errorLogs: updated.errorLogs ? JSON.stringify(updated.errorLogs) : null,
      speedValue: updated.speedValue || null,
      thumbnail: updated.thumbnail || null,
      retryCount: updated.retryCount ?? null,
      formatOption: updated.formatOption || null,
      isAudioExtract: updated.isAudioExtract ? 1 : 0,
      audioFormat: updated.audioFormat || null
    })
  }

  public async updateDownloads(downloads: Download[]): Promise<void> {
    const db = this.assertDbReady()
    const truncate = db.prepare('DELETE FROM downloads')
    const insert = db.prepare(`
      INSERT INTO downloads (
        id, url, title, status, progress, speed, eta, totalSizeInBytes, downloadedSizeInBytes,
        outputPath, createdAt, updatedAt, formatId, errorLogs, speedValue, thumbnail, retryCount,
        formatOption, isAudioExtract, audioFormat
      ) VALUES (
        @id, @url, @title, @status, @progress, @speed, @eta, @totalSizeInBytes, @downloadedSizeInBytes,
        @outputPath, @createdAt, @updatedAt, @formatId, @errorLogs, @speedValue, @thumbnail, @retryCount,
        @formatOption, @isAudioExtract, @audioFormat
      )
    `)

    const transaction = db.transaction((dls: Download[]) => {
      truncate.run()
      for (const download of dls) {
        insert.run({
          ...download,
          createdAt: download.createdAt.toISOString(),
          updatedAt: download.updatedAt.toISOString(),
          formatId: download.formatId || null,
          errorLogs: download.errorLogs ? JSON.stringify(download.errorLogs) : null,
          speedValue: download.speedValue || null,
          thumbnail: download.thumbnail || null,
          retryCount: download.retryCount ?? null,
          formatOption: download.formatOption || null,
          isAudioExtract: download.isAudioExtract ? 1 : 0,
          audioFormat: download.audioFormat || null
        })
      }
    })
    transaction(downloads)
  }

  public async removeDownload(id: string): Promise<void> {
    const db = this.assertDbReady()
    db.prepare('DELETE FROM downloads WHERE id = ?').run(id)
  }

  public async getDownload(id: string): Promise<Download | undefined> {
    const db = this.assertDbReady()
    const row = db.prepare('SELECT * FROM downloads WHERE id = ?').get(id)
    return row ? this.mapDownloadFromDb(row) : undefined
  }

  public getSettings(): Settings {
    const db = this.assertDbReady()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any
    const defaultSettings: Settings = {
      downloadDirectory: app.getPath('downloads'),
      concurrency: 3,
      defaultFormat: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      proxy: ''
    }
    if (!row) return defaultSettings

    return {
      downloadDirectory: row.downloadDirectory,
      concurrency: row.concurrency,
      defaultFormat: row.defaultFormat,
      proxy: row.proxy,
      lastPreset: row.lastPreset || undefined,
      downloadSubtitles: row.downloadSubtitles ? Boolean(row.downloadSubtitles) : undefined,
      autoDownload: row.autoDownload ? Boolean(row.autoDownload) : undefined,
      hasSeenDisclaimer: row.hasSeenDisclaimer ? Boolean(row.hasSeenDisclaimer) : undefined,
      speedLimit: row.speedLimit || undefined,
      apiServerEnabled: row.apiServerEnabled ? Boolean(row.apiServerEnabled) : undefined,
      apiServerPort: row.apiServerPort || undefined
    }
  }

  public async updateSettings(updates: Partial<Settings>): Promise<void> {
    const db = this.assertDbReady()
    const current = this.getSettings()
    const updated = { ...current, ...updates }

    db.prepare(
      `
      UPDATE settings SET
        downloadDirectory = @downloadDirectory,
        concurrency = @concurrency,
        defaultFormat = @defaultFormat,
        proxy = @proxy,
        lastPreset = @lastPreset,
        downloadSubtitles = @downloadSubtitles,
        autoDownload = @autoDownload,
        hasSeenDisclaimer = @hasSeenDisclaimer,
        speedLimit = @speedLimit,
        apiServerEnabled = @apiServerEnabled,
        apiServerPort = @apiServerPort
      WHERE id = 1
    `
    ).run({
      ...updated,
      lastPreset: updated.lastPreset || null,
      downloadSubtitles: updated.downloadSubtitles ? 1 : 0,
      autoDownload: updated.autoDownload ? 1 : 0,
      hasSeenDisclaimer: updated.hasSeenDisclaimer ? 1 : 0,
      speedLimit: updated.speedLimit || null,
      apiServerEnabled: updated.apiServerEnabled ? 1 : 0,
      apiServerPort: updated.apiServerPort || null
    })
  }

  public async loadAndResumeDownloads(): Promise<Download[]> {
    const db = this.assertDbReady()
    db.prepare(
      `UPDATE downloads SET status = 'paused', updatedAt = ? WHERE status = 'downloading'`
    ).run(new Date().toISOString())
    return this.getDownloads()
  }
}

export const db = DB.getInstance()
