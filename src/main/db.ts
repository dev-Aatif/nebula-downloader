import { app } from 'electron'
import path from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { Download, Settings } from './types'
import { Mutex } from './mutex'

type Schema = {
  downloads: Download[]
  settings: Settings
}

class DB {
  private static instance: DB
  private db: Low<Schema> | null = null
  private mutex = new Mutex()

  private constructor() {
    // Constructor is now empty
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

    const filePath = path.join(app.getPath('userData'), 'db.json')
    const adapter = new JSONFile<Schema>(filePath)
    const defaultData: Schema = {
      downloads: [],
      settings: {
        downloadDirectory: app.getPath('downloads'),
        concurrency: 3,
        ytDlpPath: '',
        ffmpegPath: '',
        defaultFormat: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        proxy: ''
      }
    }

    this.db = new Low<Schema>(adapter, defaultData)
    await this.db.read()
    this.db.data ||= defaultData
    await this.db.write()
  }

  private assertDbReady(): Low<Schema> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.')
    }
    return this.db
  }

  public getDownloads(): Download[] {
    const db = this.assertDbReady()
    return db.data?.downloads || []
  }

  public async addDownload(download: Download): Promise<void> {
    await this.mutex.run(async () => {
      const db = this.assertDbReady()
      db.data?.downloads.push(download)
      await db.write()
    })
  }

  public async updateDownload(id: string, updates: Partial<Download>): Promise<void> {
    await this.mutex.run(async () => {
      const db = this.assertDbReady()
      const download = db.data?.downloads.find((d) => d.id === id)
      if (download) {
        Object.assign(download, { ...updates, updatedAt: new Date() })
        await db.write()
      }
    })
  }

  public async updateDownloads(downloads: Download[]): Promise<void> {
    await this.mutex.run(async () => {
      const db = this.assertDbReady()
      if (db.data) {
        db.data.downloads = downloads
        await db.write()
      }
    })
  }

  public async removeDownload(id: string): Promise<void> {
    await this.mutex.run(async () => {
      const db = this.assertDbReady()
      if (db.data) {
        db.data.downloads = db.data.downloads.filter((d) => d.id !== id)
        await db.write()
      }
    })
  }

  public getDownload(id: string): Download | undefined {
    const db = this.assertDbReady()
    return db.data?.downloads.find((d) => d.id === id)
  }

  public getSettings(): Settings {
    const db = this.assertDbReady()
    return (
      db.data?.settings || {
        downloadDirectory: app.getPath('downloads'),
        concurrency: 3,
        ytDlpPath: '',
        ffmpegPath: '',
        defaultFormat: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        proxy: ''
      }
    )
  }

  public async updateSettings(updates: Partial<Settings>): Promise<void> {
    await this.mutex.run(async () => {
      const db = this.assertDbReady()
      if (db.data) {
        db.data.settings = { ...db.data.settings, ...updates }
        await db.write()
      }
    })
  }

  public async loadAndResumeDownloads(): Promise<Download[]> {
    const downloads = this.getDownloads()
    const updatedDownloads = downloads.map((d) => {
      if (d.status === 'downloading') {
        return { ...d, status: 'paused' as const, updatedAt: new Date() }
      }
      return d
    })

    await this.updateDownloads(updatedDownloads)
    return updatedDownloads
  }
}

export const db = DB.getInstance()
