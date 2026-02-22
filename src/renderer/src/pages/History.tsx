import React, { useState, useMemo, useEffect } from 'react'
import type { Download } from '../../../main/types'
import HistoryRow from '../components/HistoryRow'
import { formatBytes } from '../utils'
import { SearchIcon, DownloadIcon } from '../components/icons'
import { Skeleton } from '../components/Skeleton'

interface HistoryProps {
  downloads: Download[]
  setDownloads: React.Dispatch<React.SetStateAction<Download[]>>
  searchTerm?: string
  filter?: unknown
  setFilter?: unknown
  selectedDownloadId?: unknown
  setSelectedDownloadId?: unknown
}

export default function History({
  downloads,
  setDownloads
}: HistoryProps): React.JSX.Element {
  const [localSearch, setLocalSearch] = useState('')
  const [formatFilter, setFormatFilter] = useState('All Formats')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const completedDownloads = useMemo(
    () =>
      downloads.filter(
        (d) => d.status === 'completed' || d.status === 'error'
      ),
    [downloads]
  )

  // Stats
  const totalDownloads = completedDownloads.length
  const totalSize = completedDownloads.reduce(
    (acc, d) => acc + (d.totalSizeInBytes || 0),
    0
  )
  const successCount = completedDownloads.filter(
    (d) => d.status === 'completed'
  ).length
  const successRate =
    totalDownloads > 0
      ? Math.round((successCount / totalDownloads) * 100)
      : 0

  const sourceCounts = completedDownloads.reduce(
    (acc, d) => {
      try {
        const domain = new URL(d.url).hostname.replace('www.', '')
        acc[domain] = (acc[domain] || 0) + 1
      } catch {
        acc['Unknown'] = (acc['Unknown'] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )
  const topSource =
    Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Filtered list
  const filteredList = useMemo(() => {
    return completedDownloads
      .filter((d) => {
        const matchSearch = (d.title || d.url)
          .toLowerCase()
          .includes(localSearch.toLowerCase())
        const matchFormat = formatFilter === 'All Formats' ? true : true
        return matchSearch && matchFormat
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  }, [completedDownloads, localSearch, formatFilter])

  // Handlers
  const handleClearHistory = (): void => {
    if (
      confirm(
        'Are you sure you want to clear all history? This will delete records but keep files.'
      )
    ) {
      completedDownloads.forEach((d) => window.api.deleteDownload(d.id))
      setDownloads((prev) =>
        prev.filter(
          (d) => d.status !== 'completed' && d.status !== 'error'
        )
      )
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
            .concat(
              data.map(
                (d) =>
                  `"${d.title}","${d.url}",${d.size},"${d.date}","${d.path}"`
              )
            )
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
    if (
      selectedIds.size === filteredList.length &&
      filteredList.length > 0
    ) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredList.map((d) => d.id)))
    }
  }

  const handleToggleSelect = (id: string): void => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleBulkDelete = (): void => {
    if (selectedIds.size === 0) return
    if (
      window.confirm(
        `Delete ${selectedIds.size} item(s) from history?`
      )
    ) {
      selectedIds.forEach((id) => window.api.deleteDownload(id))
      setDownloads((prev) =>
        prev.filter((d) => !selectedIds.has(d.id))
      )
      setSelectedIds(new Set())
    }
  }

  const btnCls =
    'text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-dim border border-white/[0.06] transition-colors'

  return (
    <div className="flex flex-col h-full bg-bg-deep relative">
      <style>{`
        .history-scroll::-webkit-scrollbar { width: 6px; }
        .history-scroll::-webkit-scrollbar-track { background: transparent; }
        .history-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .history-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>

      <div className="flex-1 overflow-y-auto history-scroll p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-main tracking-tight">
                History
              </h2>
              <p className="text-text-dim text-sm mt-1">
                {totalDownloads} downloads &middot;{' '}
                {formatBytes(totalSize)} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-text-dim mr-1">
                    {selectedIds.size} selected
                  </span>
                  <button onClick={handleBulkDelete} className={`${btnCls} !text-red-400 !border-red-500/20`}>
                    Delete
                  </button>
                </>
              )}
              <button onClick={() => exportData('json')} className={btnCls}>
                JSON
              </button>
              <button onClick={() => exportData('csv')} className={btnCls}>
                CSV
              </button>
              {completedDownloads.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className={`${btnCls} !text-red-400 !border-red-500/20 hover:!bg-red-500/10`}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: 'Downloads',
                value: totalDownloads,
                color: 'text-neon-blue'
              },
              {
                label: 'Total Size',
                value: formatBytes(totalSize),
                color: 'text-purple-400'
              },
              {
                label: 'Success',
                value: `${successRate}%`,
                color: 'text-emerald-400'
              },
              {
                label: 'Top Source',
                value: topSource,
                color: 'text-yellow-400'
              }
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-dim mb-1">
                  {s.label}
                </div>
                <div
                  className={`text-xl font-bold ${s.color} truncate`}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
              <input
                type="text"
                placeholder="Search history..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-sm text-text-main placeholder-text-dim/40 focus:border-neon-blue/50 focus:outline-none focus:ring-1 focus:ring-neon-blue/20 transition-all"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            <select
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 text-sm text-text-main focus:border-neon-blue/50 focus:outline-none focus:ring-1 focus:ring-neon-blue/20 transition-all min-w-[130px]"
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
            >
              <option>All Formats</option>
              <option>MP4</option>
              <option>MP3</option>
            </select>
          </div>

          {/* List */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            {/* List Header */}
            {!isLoading && filteredList.length > 0 && (
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
                <button
                  onClick={handleSelectAll}
                  className="w-4 h-4 border border-white/[0.15] rounded hover:border-neon-blue transition-colors flex items-center justify-center"
                  title="Select All"
                >
                  {selectedIds.size > 0 &&
                    selectedIds.size === filteredList.length ? (
                    <svg
                      className="w-3 h-3 text-neon-blue"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  ) : selectedIds.size > 0 ? (
                    <div className="w-2 h-0.5 bg-neon-blue" />
                  ) : null}
                </button>
                <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">
                  {filteredList.length} item
                  {filteredList.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Content */}
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-lg border border-white/[0.04]"
                  >
                    <Skeleton className="w-16 h-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton height="1rem" width="30%" />
                      <Skeleton height="0.8rem" width="20%" />
                    </div>
                    <Skeleton width="100px" height="1rem" />
                  </div>
                ))}
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <div className="w-14 h-14 bg-white/[0.04] rounded-full flex items-center justify-center mb-4">
                  <DownloadIcon className="w-7 h-7 text-text-dim" />
                </div>
                <h3 className="text-lg font-semibold text-text-main mb-1">
                  No Downloads Yet
                </h3>
                <p className="text-text-dim text-sm">
                  Completed downloads will appear here
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-1.5">
                {filteredList.map((download, index) => (
                  <HistoryRow
                    key={download.id}
                    download={download}
                    index={index}
                    isSelected={selectedIds.has(download.id)}
                    onToggleSelect={() =>
                      handleToggleSelect(download.id)
                    }
                    onOpenFile={(id) => window.api.openFile(id)}
                    onShowInFolder={(id) =>
                      window.api.showInFolder(id)
                    }
                    onDelete={(id) =>
                      window.api.deleteDownload(id)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
