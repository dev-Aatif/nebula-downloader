import React, { useState, useCallback } from 'react'
import type { Download, PlaylistItem } from '../../../main/types'
import DownloadRow from '../components/DownloadRow'
import PlaylistModal from '../components/PlaylistModal'
import AdvancedDownloadOptionsModal from '../components/AdvancedDownloadOptionsModal'
import { ChevronUpIcon, ChevronDownIcon, DownloadIcon } from '../components/icons'
import { Skeleton } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import ContextMenu from '../components/ContextMenu'
import UndoToast from '../components/UndoToast'

type DownloadFilter =
  | 'All'
  | 'Downloading'
  | 'Paused'
  | 'Completed'
  | 'Queued'
  | 'Error'
  | 'Cancelled'

const SortIndicator = ({
  field,
  sortField,
  sortOrder
}: {
  field: string
  sortField: string
  sortOrder: 'asc' | 'desc'
}): React.ReactElement | null => {
  if (sortField !== field) return null
  return sortOrder === 'asc' ? (
    <ChevronUpIcon className="w-3 h-3 ml-1 text-neon-blue" />
  ) : (
    <ChevronDownIcon className="w-3 h-3 ml-1 text-neon-blue" />
  )
}

export default function Downloads({
  filter = 'All',
  selectedDownloadId,
  setSelectedDownloadId,
  searchTerm,
  downloads,
  setDownloads,
  selectedIds,
  setSelectedIds,
  onMultiSelect
}: {
  filter?: DownloadFilter
  setFilter?: React.Dispatch<React.SetStateAction<DownloadFilter>>
  selectedDownloadId?: string | null
  setSelectedDownloadId?: (id: string | null) => void
  searchTerm?: string
  downloads: Download[]
  setDownloads: React.Dispatch<React.SetStateAction<Download[]>>
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  onMultiSelect: (id: string) => void
}): React.ReactElement {
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [currentPlaylistItems, setCurrentPlaylistItems] = useState<PlaylistItem[]>([])
  const [isAdvancedOptionsModalOpen, setIsAdvancedOptionsModalOpen] = useState(false)
  const [advancedOptionsVideoUrl] = useState('')
  const [selectedFormatId, setSelectedFormatId] = useState<string | undefined>(undefined)
  // selectedIds is now a prop
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    download: Download
  } | null>(null)

  // Undo delete state
  const [pendingDelete, setPendingDelete] = useState<{
    id: string
    title: string
  } | null>(null)

  // Derive loading state from downloads - no useEffect needed
  const isLoading = downloads.length === 0

  const handleDownloadPlaylistItems = (selectedUrls: string[]): void => {
    selectedUrls.forEach((selectedUrl) => {
      window.api.addDownload(selectedUrl, selectedFormatId)
    })
    setShowPlaylistModal(false)
    setCurrentPlaylistItems([])
    setSelectedFormatId(undefined)
  }

  const handleFormatSelection = (format: string): void => {
    setSelectedFormatId(format)
    setIsAdvancedOptionsModalOpen(false)
  }

  const handleSelect = (id: string): void => {
    if (setSelectedDownloadId) {
      setSelectedDownloadId(id === selectedDownloadId ? null : id)
    }
  }

  const handleDelete = (id: string): void => {
    const download = downloads.find((d) => d.id === id)
    if (!download) return

    // Hide item locally (soft delete)
    setDownloads((prev) => prev.filter((d) => d.id !== id))

    // Show undo toast
    setPendingDelete({ id, title: download.title || 'Download' })
  }

  const handleUndoDelete = useCallback(() => {
    // Restore item by refetching downloads
    window.api.getDownloads().then(setDownloads)
    setPendingDelete(null)
  }, [setDownloads])

  const handleConfirmDelete = useCallback(() => {
    if (pendingDelete) {
      window.api.deleteDownload(pendingDelete.id)
      setPendingDelete(null)
    }
  }, [pendingDelete])

  const [sortField, setSortField] = useState<keyof Download | 'added'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: keyof Download | 'added'): void => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSelectAll = (): void => {
    if (selectedIds.size === sortedDownloads.length && sortedDownloads.length > 0) {
      // Deselect all
      setSelectedIds(new Set())
    } else {
      // Select all visible downloads
      setSelectedIds(new Set(sortedDownloads.map((d) => d.id)))
    }
  }

  // handleToggleSelect is now passed as onMultiSelect prop
  // Bulk handlers (delete, pause, resume) moved to App.tsx toolbar


  const sortedDownloads = [...downloads]
    .filter((d) => {
      if (filter === 'All') return true
      if (filter === 'Downloading') return d.status === 'downloading'
      if (filter === 'Queued') return d.status === 'queued'
      return d.status.toLowerCase() === filter.toLowerCase()
    })
    .filter((d) => {
      if (!searchTerm) return true
      return (
        d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.url.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
    .sort((a, b) => {
      let valA, valB

      if (sortField === 'added') {
        valA = a.createdAt
        valB = b.createdAt
      } else {
        valA = a[sortField as keyof Download]
        valB = b[sortField as keyof Download]
      }

      // Handle cases where the value might be null or undefined
      const comparableA = valA ?? ''
      const comparableB = valB ?? ''

      if (comparableA < comparableB) return sortOrder === 'asc' ? -1 : 1
      if (comparableA > comparableB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  return (
    <>
      {/* Bulk actions removed as requested - moved to toolbar */}
      <div className="grid-header">
        <div className="flex justify-center">
          <button
            onClick={handleSelectAll}
            className="w-3 h-3 border border-border-glass rounded-sm hover:border-neon-blue transition-colors flex items-center justify-center"
            title="Select All"
          >
            {selectedIds.size > 0 && selectedIds.size === sortedDownloads.length ? (
              <svg className="w-2 h-2 text-neon-blue" viewBox="0 0 12 12" fill="currentColor">
                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            ) : selectedIds.size > 0 ? (
              <div className="w-1.5 h-0.5 bg-neon-blue" />
            ) : null}
          </button>
        </div>
        <div></div>
        <div className="header-clickable justify-start pl-3" onClick={() => handleSort('title')}>
          Name <SortIndicator field="title" sortField={sortField} sortOrder={sortOrder} />
        </div>
        <div className="header-clickable justify-center" onClick={() => handleSort('status')}>
          Status <SortIndicator field="status" sortField={sortField} sortOrder={sortOrder} />
        </div>
        <div className="header-clickable justify-center" onClick={() => handleSort('speedValue')}>
          Speed <SortIndicator field="speedValue" sortField={sortField} sortOrder={sortOrder} />
        </div>
        <div
          className="header-clickable justify-center"
          onClick={() => handleSort('totalSizeInBytes')}
        >
          Size{' '}
          <SortIndicator field="totalSizeInBytes" sortField={sortField} sortOrder={sortOrder} />
        </div>
        <div className="header-clickable justify-center" onClick={() => handleSort('createdAt')}>
          Added <SortIndicator field="createdAt" sortField={sortField} sortOrder={sortOrder} />
        </div>
        <div></div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-card/30 border border-border-glass rounded-lg"
              >
                <Skeleton className="w-5 h-5 rounded-sm" /> {/* Checkbox */}
                <Skeleton className="w-10 h-10 rounded-md" /> {/* Icon/Thumbnail */}
                <div className="flex-1 space-y-2">
                  <Skeleton height="1rem" width="60%" />
                  <Skeleton height="0.8rem" width="40%" />
                </div>
                <Skeleton width="80px" height="1rem" />
              </div>
            ))}
          </div>
        ) : sortedDownloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-dim space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <DownloadIcon className="w-8 h-8 opacity-20" />
            </div>
            <div className="text-sm font-medium">No files found</div>
            <div className="text-xs opacity-50">
              Try filtering for different categories or adding a new file.
            </div>
          </div>
        ) : (
          sortedDownloads.map((download, index) => (
            <DownloadRow
              key={download.id}
              download={download}
              index={index}
              isSelected={download.id === selectedDownloadId}
              isMultiSelected={selectedIds.has(download.id)}
              onSelect={handleSelect}
              onMultiSelect={onMultiSelect} // Use prop
              onPause={window.api.pauseDownload}
              onResume={window.api.resumeDownload}
              onRetry={window.api.retryDownload}
              onDelete={handleDelete}
              onOpenFile={window.api.openFile}
              onShowInFolder={window.api.showInFolder}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ x: e.clientX, y: e.clientY, download })
              }}
            />
          ))
        )}
      </div>

      {showPlaylistModal && (
        <PlaylistModal
          playlistItems={currentPlaylistItems}
          onClose={() => setShowPlaylistModal(false)}
          onDownloadSelected={handleDownloadPlaylistItems}
        />
      )}

      {isAdvancedOptionsModalOpen && (
        <AdvancedDownloadOptionsModal
          isOpen={isAdvancedOptionsModalOpen}
          onClose={() => setIsAdvancedOptionsModalOpen(false)}
          videoUrl={advancedOptionsVideoUrl}
          onSelectFormat={handleFormatSelection}
        />
      )}

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        variant="danger"
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          download={contextMenu.download}
          onClose={() => setContextMenu(null)}
          onPause={() => window.api.pauseDownload(contextMenu.download.id)}
          onResume={() => window.api.resumeDownload(contextMenu.download.id)}
          onRetry={() => window.api.retryDownload(contextMenu.download.id)}
          onDelete={() => handleDelete(contextMenu.download.id)}
          onOpenFile={() => window.api.openFile(contextMenu.download.id)}
          onShowInFolder={() => window.api.showInFolder(contextMenu.download.id)}
          onCopyUrl={() => navigator.clipboard.writeText(contextMenu.download.url)}
        />
      )}

      {pendingDelete && (
        <UndoToast
          message={`"${pendingDelete.title}" deleted`}
          onUndo={handleUndoDelete}
          onTimeout={handleConfirmDelete}
        />
      )}
    </>
  )
}
