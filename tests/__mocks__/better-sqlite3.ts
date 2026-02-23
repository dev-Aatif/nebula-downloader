/* eslint-disable */
import { vi } from 'vitest'

let store: Record<string, any> = {}
let downloadsStore: Record<string, any> = {}

export default function Database(filename: string, options?: any) {
  // Wipe on new instance creation for test isolation
  store = {}
  downloadsStore = {}

  const pragma = vi.fn()
  const exec = vi.fn()
  const close = vi.fn()

  const prepare = vi.fn((sql: string) => {
    // Basic mock implementation for settings and downloads table
    return {
      get: vi.fn((...args) => {
        if (sql.toLowerCase().includes('count(*)')) return { count: 0 }
        if (sql.includes('settings')) return Object.keys(store).length ? store : undefined

        if (sql.includes('downloads') && args.length) {
          const id = typeof args[0] === 'object' ? args[0].id : args[0]
          return downloadsStore[id]
        }
        return undefined
      }),
      all: vi.fn((...args) => {
        if (sql.includes('sqlite_master')) return [{ name: 'settings' }, { name: 'downloads' }]
        if (sql.includes('downloads')) return Object.values(downloadsStore)
        return []
      }),
      run: vi.fn((...args) => {
        const payload = args[0] || {}
        if (sql.includes('settings')) {
          store = { ...store, ...payload }
        }
        if (sql.includes('INSERT INTO downloads')) {
          const id = payload.id || 'test-id'
          downloadsStore[id] = { ...payload }
        }
        if (sql.includes("UPDATE downloads SET status = 'paused'")) {
          for (const id in downloadsStore) {
            if (downloadsStore[id].status === 'downloading') {
              downloadsStore[id].status = 'paused'
              downloadsStore[id].updatedAt = args[0]
            }
          }
        } else if (sql.includes('UPDATE downloads')) {
          const idStr =
            payload.id || args.find((a) => typeof a === 'string' && a.includes('-')) || 'test-id'
          if (downloadsStore[idStr]) {
            downloadsStore[idStr] = { ...downloadsStore[idStr], ...payload }
          }
        }
        if (sql.includes('DELETE FROM downloads')) {
          const id = typeof payload === 'object' ? payload.id : payload
          delete downloadsStore[id]
        }
        return { changes: 1, lastInsertRowid: 1 }
      }),
      pluck: vi.fn(() => ({ get: vi.fn() }))
    }
  })

  const transaction = vi.fn((fn) => {
    return (...args: any[]) => fn(...args)
  })

  return {
    pragma,
    exec,
    prepare,
    transaction,
    close,
    memory: filename === ':memory:'
  }
}

// Reset function for tests
export const _resetMockStores = () => {
  store = {}
  downloadsStore = {}
}
