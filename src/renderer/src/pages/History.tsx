import React, { useState, useEffect } from 'react'
import type { Download } from '@main/types'
import HistoryRow from '../components/HistoryRow'

export default function History({ searchTerm = '' }: { searchTerm?: string }): React.JSX.Element {
  const [completedDownloads, setCompletedDownloads] = useState<Download[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchHistory = async (): Promise<void> => {
      try {
        setLoading(true)
        const history = await window.api.getCompletedDownloads()
        setCompletedDownloads(history)
      } catch (error) {
        console.error('Failed to fetch download history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()

    // This is just to keep the style consistent, history is not updated in real time
    const unlistenDeleted = window.api.onDownloadDeleted((id) => {
      setCompletedDownloads((prev) => prev.filter((d) => d.id !== id))
    })

    return () => {
      unlistenDeleted()
    }
  }, [])

  const filteredDownloads = completedDownloads
    .filter(
      (download) =>
        download.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        download.url.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <>
      <div className="grid-header" style={{ gridTemplateColumns: '40px 3fr 1fr 2fr 1fr' }}>
        <div>#</div>
        <div>Name</div>
        <div>Size</div>
        <div>Path</div>
        <div>Date</div>
      </div>

      {loading ? (
        <p className="text-text-dim text-center p-4">Loading history...</p>
      ) : filteredDownloads.length === 0 ? (
        <p className="text-text-dim text-center p-4">
          No completed downloads found or matching your search.
        </p>
      ) : (
        <div className="grid-container" style={{ background: 'transparent' }}>
          {filteredDownloads.map((download, index) => (
            <HistoryRow key={download.id} download={download} index={index} />
          ))}
        </div>
      )}
      <div style={{ flex: 1 }}></div>
    </>
  )
}
