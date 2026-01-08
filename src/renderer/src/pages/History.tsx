import React, { useState, useMemo, useEffect } from 'react'
import type { Download } from '../../../main/types'
import HistoryRow from '../components/HistoryRow'
import { formatBytes } from '../utils'
import { SearchIcon, DownloadIcon } from '../components/icons'
import { Skeleton } from '../components/Skeleton'

// Stats Card Component
const StatCard = ({
  title,
  value,
  subtext
}: {
  title: string
  value: string | number
  subtext?: string
}): React.ReactElement => (
  <div className="bg-card p-6 rounded-lg border border-border-glass flex flex-col items-center justify-center gap-2">
    <div className="text-xs font-bold text-text-dim uppercase tracking-wider">{title}</div>
    <div className="text-4xl font-bold text-text-main">{value}</div>
    {subtext && <div className="text-xs text-text-dim">{subtext}</div>}
  </div>
)

interface HistoryProps {
  downloads: Download[]
  setDownloads: React.Dispatch<React.SetStateAction<Download[]>>
  searchTerm?: string
  // Add other props from App's Page type to avoid type errors
  filter?: unknown
  setFilter?: unknown
  selectedDownloadId?: unknown
  setSelectedDownloadId?: unknown
}

export default function History({ downloads, setDownloads }: HistoryProps): React.JSX.Element {
  const [localSearch, setLocalSearch] = useState('')
  const [formatFilter, setFormatFilter] = useState('All Formats')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Simulate initial load for polish
    // Using simple timeout to simulate "fetching" feel even if local
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)

    // If we have data, we can stop loading - but delay slightly for smoothness if desired,
    // or just let the timer handle the "skeleton" experience.
    // For this "Polish" feature, enforcing the skeleton for 800ms looks nice.

    return () => clearTimeout(timer)
  }, [])

  // Filter completed downloads
  const completedDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'completed' || d.status === 'error'),
    [downloads]
  )

  // Calculate Stats
  const totalDownloads = completedDownloads.length
  const totalSize = completedDownloads.reduce((acc, d) => acc + (d.totalSizeInBytes || 0), 0)

  // Most Common Format
  const formatCounts = completedDownloads.reduce(
    (acc, d) => {
      const format = d.formatId ? 'MP4' : 'MP4'
      acc[format] = (acc[format] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const mostCommonFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  // Success Rate
  const successCount = completedDownloads.filter((d) => d.status === 'completed').length
  const successRate = totalDownloads > 0 ? Math.round((successCount / totalDownloads) * 100) : 0

  // Top Source (Domain)
  const sourceCounts = completedDownloads.reduce(
    (acc, d) => {
      try {
        const urlObj = new URL(d.url)
        const domain = urlObj.hostname.replace('www.', '')
        acc[domain] = (acc[domain] || 0) + 1
      } catch {
        acc['Unknown'] = (acc['Unknown'] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  // Filter List
  const filteredList = useMemo(() => {
    return completedDownloads
      .filter((d) => {
        const matchSearch = (d.title || d.url).toLowerCase().includes(localSearch.toLowerCase())
        // Format filter logic placeholder
        const matchFormat = formatFilter === 'All Formats' ? true : true
        return matchSearch && matchFormat
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [completedDownloads, localSearch, formatFilter])

  // Handlers
  const handleClearHistory = (): void => {
    if (
      confirm(
        'Are you sure you want to clear all history? This will delete records but keep files.'
      )
    ) {
      completedDownloads.forEach((d) => window.api.deleteDownload(d.id))
      // Optimistic update
      setDownloads((prev) => prev.filter((d) => d.status !== 'completed' && d.status !== 'error'))
    }
  }

  const exportData = (type: 'json' | 'csv'): void => {
    const data = completedDownloads.map((d) => ({
      title: d.title,
      url: d.url,
      size: d.totalSizeInBytes,
      date: d.createdAt,
      path: d.outputPath
    }))

    const blob = new Blob(
      [
        type === 'json'
          ? JSON.stringify(data, null, 2)
          : ['Title,URL,Size,Date,Path']
              .concat(data.map((d) => `"${d.title}","${d.url}",${d.size},"${d.date}","${d.path}"`))
              .join('\n')
      ],
      { type: 'text/plain' }
    )

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nebula_history.${type}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSelectAll = (): void => {
    if (selectedIds.size === filteredList.length && filteredList.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredList.map((d) => d.id)))
    }
  }

  const handleToggleSelect = (id: string): void => {
    const newSelectedIds = new Set(selectedIds)
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
    setSelectedIds(newSelectedIds)
  }

  const handleBulkDelete = (): void => {
    if (selectedIds.size === 0) return
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} item(s) from history?`)) {
      selectedIds.forEach((id) => window.api.deleteDownload(id))
      setDownloads((prev) => prev.filter((d) => !selectedIds.has(d.id)))
      setSelectedIds(new Set())
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-deep p-8 gap-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-main">Download History</h1>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            placeholder="Search by title or URL..."
            className="w-full bg-[#0d111a] border border-white/10 rounded-md pl-10 pr-4 py-2 text-text-main placeholder:text-text-dim focus:outline-none focus:border-neon-blue transition-colors"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-[#0d111a] border border-white/10 rounded-md px-4 py-2 text-text-main focus:outline-none focus:border-neon-blue transition-colors min-w-[150px]"
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
        >
          <option>All Formats</option>
          <option>MP4</option>
          <option>MP3</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Downloads" value={totalDownloads} />
        <StatCard title="Total Size" value={formatBytes(totalSize)} />
        <StatCard title="Success Rate" value={`${successRate}%`} />
        <StatCard title="Top Source" value={topSource} />
        <StatCard title="Top Format" value={mostCommonFormat} />
      </div>

      {/* Actions */}
      <div className="flex gap-4 items-center">
        {selectedIds.size > 0 && (
          <>
            <span className="text-sm text-text-dim">{selectedIds.size} selected</span>
            <button className="btn-secondary flex items-center gap-2" onClick={handleBulkDelete}>
              Delete Selected
            </button>
          </>
        )}
        <div className="flex gap-4 ml-auto">
          <button className="btn-secondary flex items-center gap-2" onClick={() => exportData('json')}>
            Export as JSON
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => exportData('csv')}>
            Export as CSV
          </button>
          <button
            className="bg-red-900/50 hover:bg-red-900/80 text-red-200 px-4 py-2 rounded-md font-medium transition-colors border border-red-900/50"
            onClick={handleClearHistory}
          >
            Clear All History
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 bg-card/30 rounded-lg border border-border-glass overflow-hidden flex flex-col">
        {/* List Header with Select All */}
        {!isLoading && filteredList.length > 0 && (
          <div className="flex items-center gap-4 p-4 border-b border-white/10 bg-card/20">
            <button
              onClick={handleSelectAll}
              className="w-4 h-4 border border-border-glass rounded-sm hover:border-neon-blue transition-colors flex items-center justify-center"
              title="Select All"
            >
              {selectedIds.size > 0 && selectedIds.size === filteredList.length ? (
                <svg className="w-3 h-3 text-neon-blue" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              ) : selectedIds.size > 0 ? (
                <div className="w-2 h-0.5 bg-neon-blue" />
              ) : null}
            </button>
            <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">
              Download History
            </span>
          </div>
        )}
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-card/50 rounded-lg border border-white/5"
              >
                <Skeleton className="w-16 h-10 rounded-md" /> {/* Thumbnail */}
                <div className="flex-1 space-y-2">
                  <Skeleton height="1rem" width="30%" />
                  <Skeleton height="0.8rem" width="20%" />
                </div>
                <Skeleton width="100px" height="1rem" />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-50">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <DownloadIcon className="w-8 h-8 text-text-dim" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">No Downloads Yet</h3>
            <p className="text-text-dim text-sm">Your completed downloads will appear here.</p>
          </div>
        ) : (
          <div className="p-4 space-y-2 overflow-y-auto">
            {filteredList.map((download, index) => (
              <HistoryRow
                key={download.id}
                download={download}
                index={index}
                isSelected={selectedIds.has(download.id)}
                onToggleSelect={() => handleToggleSelect(download.id)}
                onOpenFile={(id) => window.api.openFile(id)}
                onShowInFolder={(id) => window.api.showInFolder(id)}
                onDelete={(id) => window.api.deleteDownload(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
