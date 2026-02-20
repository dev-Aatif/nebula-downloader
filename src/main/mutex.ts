
/**
 * Simple Mutex to prevent race conditions in lowdb
 */
export class Mutex {
  private _queue: { resolve: () => void }[] = []
  private _isLocked = false

  lock(): Promise<void> {
    return new Promise((resolve) => {
      if (!this._isLocked) {
        this._isLocked = true
        resolve()
      } else {
        this._queue.push({ resolve })
      }
    })
  }

  unlock(): void {
    if (this._queue.length > 0) {
      const next = this._queue.shift()
      next?.resolve()
    } else {
      this._isLocked = false
    }
  }

  async run<T>(callback: () => Promise<T>): Promise<T> {
    await this.lock()
    try {
      return await callback()
    } finally {
      this.unlock()
    }
  }
}
