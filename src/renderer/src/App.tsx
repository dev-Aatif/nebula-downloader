import React, { useState, useEffect } from 'react'
import Downloads from './pages/downloads'
import Settings from './pages/settings'
import History from './pages/History'
import Help from './pages/Help'
import AddDownloadModal from './components/AddDownloadModal'
import DownloadDetails from './components/DownloadDetails'
import type { Download } from '../../main/types'
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  FolderIcon,
  SearchIcon,
  SettingsIcon,
  ClockIcon,
  HelpIcon,
  DownloadIcon,
  CheckCircleIcon,
  ClockIcon as ActiveIcon
} from './components/icons'
import { formatBytes } from './utils'

type Page = 'Downloads' | 'History' | 'Settings' | 'Help'
type DownloadFilter = 'All' | 'Downloading' | 'Paused' | 'Completed'

const pages: Record<
  Page,
  React.FC<{
    filter?: DownloadFilter
    setFilter?: React.Dispatch<React.SetStateAction<DownloadFilter>>
    selectedDownloadId?: string | null
    setSelectedDownloadId?: (id: string | null) => void
    searchTerm?: string
    downloads: Download[]
    setDownloads: React.Dispatch<React.SetStateAction<Download[]>>
  }>
> = {
  Downloads,
  History,
  Settings,
  Help
}

const ToolbarButton: React.FC<{
  title: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
  isActive?: boolean
}> = ({ title, children, className = '', onClick, isActive }) => (
  <button
    title={title}
    className={`tool-btn ${className} ${isActive ? 'active' : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
)

const SidebarItem: React.FC<{
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
  count?: number
}> = ({ icon, label, isActive, onClick, count }) => (
  <div className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={onClick}>
    {icon}
    <span className="flex-1">{label}</span>
    {count !== undefined && count > 0 && (
      <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>
    )}
  </div>
)

function App(): React.ReactElement {
  const [activePage, setActivePage] = useState<Page>('Downloads')
  const [activeFilter, setActiveFilter] = useState<DownloadFilter>('All')
  const [selectedDownloadId, setSelectedDownloadId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isAddDownloadModalOpen, setAddDownloadModalOpen] = useState(false)
  const [downloads, setDownloads] = useState<Download[]>([])
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null)

  useEffect(() => {
    const unlistenLoaded = window.api.onDownloadsLoaded((loadedDownloads) => {
      setDownloads(loadedDownloads)
    })

    const unlistenAdded = window.api.onDownloadAdded((download) => {
      setDownloads((prev) => [download, ...prev])
      if (download.status === 'downloading') {
        setActiveDownloadId(download.id)
      }
    })

    const unlistenDeleted = window.api.onDownloadDeleted((id) => {
      setDownloads((prev) => prev.filter((d) => d.id !== id))
      if (activeDownloadId === id) setActiveDownloadId(null)
      if (selectedDownloadId === id) setSelectedDownloadId(null)
    })

    const unlistenProgress = window.api.onDownloadProgress((data) => {
      setDownloads((prev) => prev.map((d) => (d.id === data.id ? { ...d, ...data } : d)))
      if (data.status === 'downloading') {
        setActiveDownloadId(data.id)
      }
    })

    const unlistenComplete = window.api.onDownloadComplete(({ id }) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'completed', progress: 100 } : d))
      )
      if (activeDownloadId === id) setActiveDownloadId(null)
    })

    const unlistenError = window.api.onDownloadError(({ id, error }) => {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: 'error',
                errorLogs: d.errorLogs ? [...d.errorLogs, error] : [error]
              }
            : d
        )
      )
    })

    const unlistenPaused = window.api.onDownloadPaused(({ id }) => {
      setDownloads((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'paused' } : d)))
    })

    const removeListener = window.api.onThemeUpdated((shouldUseDarkColors) => {
      if (shouldUseDarkColors) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    })
    window.api.setTheme('system')

    return () => {
      unlistenLoaded()
      unlistenAdded()
      unlistenDeleted()
      unlistenProgress()
      unlistenComplete()
      unlistenError()
      unlistenPaused()
      removeListener()
    }
  }, [activeDownloadId, selectedDownloadId])

  const handleAddDownload = (): void => {
    setAddDownloadModalOpen(true)
  }

  const handleAddDownloadFromModal = (url: string): void => {
    if (url) {
      window.api.addDownload(url)
    }
  }

  const handleResume = (): void => {
    if (selectedDownloadId) {
      window.api.resumeDownload(selectedDownloadId)
    }
  }

  const handlePause = (): void => {
    if (selectedDownloadId) {
      window.api.pauseDownload(selectedDownloadId)
    }
  }

  const handleDelete = (): void => {
    if (selectedDownloadId) {
      window.api.deleteDownload(selectedDownloadId)
      setSelectedDownloadId(null)
    }
  }

  const handleShowInFolder = (): void => {
    if (selectedDownloadId) {
      window.api.showInFolder(selectedDownloadId)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value)
  }

  const ActivePageComponent = pages[activePage]
  const displayedDownload =
    downloads.find((d) => d.id === (selectedDownloadId || activeDownloadId)) ||
    downloads.find((d) => d.status === 'downloading') ||
    (downloads.length > 0 ? downloads[0] : null)

  const activeDownloads = downloads.filter((d) => d.status === 'downloading')
  const totalSpeed = activeDownloads.reduce((acc, d) => acc + (d.speedValue || 0), 0)
  const totalSize = downloads.reduce((acc, d) => acc + (d.totalSizeInBytes || 0), 0)
  const totalDownloaded = downloads.reduce(
    (acc, d) => acc + ((d.totalSizeInBytes || 0) * d.progress) / 100,
    0
  )
  const overallProgress = totalSize > 0 ? (totalDownloaded / totalSize) * 100 : 0
  const remainingBytes = totalSize - totalDownloaded
  const etaSeconds = totalSpeed > 0 ? remainingBytes / totalSpeed : 0

  const formatEta = (seconds: number): string => {
    if (seconds <= 0 || !isFinite(seconds)) return '—'
    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const activeCount = downloads.filter((d) => d.status === 'downloading').length
  const completedCount = downloads.filter((d) => d.status === 'completed').length

  return (
    <div className="flex flex-col h-screen bg-bg-deep text-text-main font-sans">
      {/* TOP BAR */}
      <div className="toolbar">
        <div className="app-brand">
          <div className="logo-dot"></div>
          <div className="app-name">NEBULA</div>
        </div>

        <div className="tool-group">
          <ToolbarButton title="Add File" className="primary" onClick={handleAddDownload}>
            <PlusIcon className="w-5 h-5" /> New File
          </ToolbarButton>
        </div>

        <div className="tool-group">
          <ToolbarButton title="Start" onClick={handleResume}>
            <PlayIcon className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton title="Pause" onClick={handlePause}>
            <PauseIcon className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton title="Delete" onClick={handleDelete}>
            <TrashIcon className="w-5 h-5" />
          </ToolbarButton>
        </div>

        <div className="tool-group">
          <ToolbarButton title="Open Folder" onClick={handleShowInFolder}>
            <FolderIcon className="w-5 h-5" />
          </ToolbarButton>
        </div>

        <div className="spacer"></div>

        <div className="search-box">
          <SearchIcon className="w-4 h-4 text-text-dim" />
          <input
            type="text"
            placeholder="Search downloads..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="tool-group">
          <ToolbarButton
            title="Settings"
            isActive={activePage === 'Settings'}
            onClick={() => setActivePage('Settings')}
          >
            <SettingsIcon className="w-5 h-5" />
          </ToolbarButton>
        </div>
      </div>

      <div className="main-layout">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-label">Downloads</div>
          <SidebarItem
            icon={<DownloadIcon />}
            label="All Downloads"
            isActive={activePage === 'Downloads' && activeFilter === 'All'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('All')
            }}
          />
          <SidebarItem
            icon={<ActiveIcon className="text-neon-blue" />}
            label="Active"
            isActive={activePage === 'Downloads' && activeFilter === 'Downloading'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('Downloading')
            }}
            count={activeCount}
          />
          <SidebarItem
            icon={<CheckCircleIcon className="text-neon-green" />}
            label="Completed"
            isActive={activePage === 'Downloads' && activeFilter === 'Completed'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('Completed')
            }}
            count={completedCount}
          />

          <div className="sidebar-label">Organization</div>
          <SidebarItem
            icon={<ClockIcon />}
            label="History"
            isActive={activePage === 'History'}
            onClick={() => setActivePage('History')}
          />

          <div className="spacer"></div>

          <SidebarItem
            icon={<HelpIcon />}
            label="Support & Help"
            isActive={activePage === 'Help'}
            onClick={() => setActivePage('Help')}
          />
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="grid-container overflow-hidden">
            <ActivePageComponent
              filter={activeFilter}
              setFilter={setActiveFilter}
              selectedDownloadId={selectedDownloadId}
              setSelectedDownloadId={setSelectedDownloadId}
              searchTerm={searchTerm}
              downloads={downloads}
              setDownloads={setDownloads}
            />
          </main>

          {/* DOWNLOAD DETAILS PANE */}
          {activePage === 'Downloads' && displayedDownload && (
            <DownloadDetails download={displayedDownload} />
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="footer">
        <div className="speed-box">↓ {formatBytes(totalSpeed)}/s</div>
        <div className="speed-box">↑ 0 KB/s</div>
        {activeDownloads.length > 0 && (
          <>
            <div className="footer-stat">
              <span>{overallProgress.toFixed(1)}%</span>
            </div>
            <div className="footer-stat">
              <span>
                {formatBytes(totalDownloaded)} / {formatBytes(totalSize)}
              </span>
            </div>
            <div className="footer-stat">
              <span>ETA: {formatEta(etaSeconds)}</span>
            </div>
          </>
        )}
        <div className="footer-spacer"></div>
        <div className="speed-box">
          <div className="connection-dot"></div> Connected
        </div>
      </div>

      <AddDownloadModal
        isOpen={isAddDownloadModalOpen}
        onClose={() => setAddDownloadModalOpen(false)}
        onAdd={handleAddDownloadFromModal}
      />
    </div>
  )
}

export default App
