import React, { useState, useEffect } from 'react'
import type { Download, PlaylistItem } from '../../../main/types'
import DownloadRow from '../components/DownloadRow'
import PlaylistModal from '../components/PlaylistModal'
import AdvancedDownloadOptionsModal from '../components/AdvancedDownloadOptionsModal'
import { ChevronUpIcon, ChevronDownIcon, DownloadIcon } from '../components/icons'

type DownloadFilter = 'All' | 'Downloading' | 'Paused' | 'Completed'

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
  setDownloads
}: {
  filter?: DownloadFilter
  setFilter?: React.Dispatch<React.SetStateAction<DownloadFilter>>
  selectedDownloadId?: string | null
  setSelectedDownloadId?: (id: string | null) => void
  searchTerm?: string
  downloads: Download[]
  setDownloads: React.Dispatch<React.SetStateAction<Download[]>>
}): React.ReactElement {
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [currentPlaylistItems, setCurrentPlaylistItems] = useState<PlaylistItem[]>([])
  const [isAdvancedOptionsModalOpen, setIsAdvancedOptionsModalOpen] = useState(false)
  const [advancedOptionsVideoUrl] = useState('')
  const [selectedFormatId, setSelectedFormatId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const unlistenLoaded = window.api.onDownloadsLoaded((loadedDownloads) => {
      setDownloads(loadedDownloads)
    })
    return () => unlistenLoaded()
  }, [setDownloads])

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
    if (window.confirm('Are you sure you want to delete this download?')) {
      window.api.deleteDownload(id)
    }
  }

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

  const sortedDownloads = [...downloads]
    .filter((d) => {
      if (filter === 'All') return true
      if (filter === 'Downloading') return d.status === 'downloading' || d.status === 'queued'
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
      <div className="grid-header">
        <div className="flex justify-center">
          <div className="w-3 h-3 border border-border-glass rounded-sm opacity-50"></div>
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
        {sortedDownloads.length === 0 ? (
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
              onSelect={handleSelect}
              onPause={window.api.pauseDownload}
              onResume={window.api.resumeDownload}
              onDelete={handleDelete}
              onOpenFile={window.api.openFile}
              onShowInFolder={window.api.showInFolder}
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
    </>
  )
}
