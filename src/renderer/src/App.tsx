import React, { useState, useEffect, useRef, useCallback } from 'react'
import Downloads from './pages/downloads'
import Settings from './pages/settings'
import History from './pages/History'
import Help from './pages/Help'
import AddDownloadModal from './components/AddDownloadModal'
import DownloadDetails from './components/DownloadDetails'
import ClipboardToast from './components/ClipboardToast'
import DisclaimerModal from './components/DisclaimerModal'
import type { Download } from '../../main/types'
import { isValidVideoUrl } from './utils/urlValidator'
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  SearchIcon,
  SettingsIcon,
  ClockIcon,
  HelpIcon,
  DownloadIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  AlertCircleIcon,
  ListIcon,
  BanIcon
} from './components/icons'
import { formatBytes } from './utils'

type Page = 'Downloads' | 'History' | 'Settings' | 'Help'
type DownloadFilter = 'All' | 'Downloading' | 'Paused' | 'Completed' | 'Queued' | 'Error' | 'Cancelled'

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
    aria-label={title}
    className={`tool-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-blue/50 ${className} ${isActive ? 'active' : ''}`}
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
  const [isFooterExpanded, setFooterExpanded] = useState(false)

  // Copyright disclaimer state
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  // Clipboard detection state
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null)
  const lastCheckedClipboardRef = useRef<string>('')

  // Check settings on load for first-launch disclaimer
  useEffect(() => {
    window.api.getSettings().then((settings) => {
      if (!settings.hasSeenDisclaimer) {
        setShowDisclaimer(true)
      }
    })
  }, [])

  const handleAcceptDisclaimer = async (): Promise<void> => {
    await window.api.updateSettings({ hasSeenDisclaimer: true })
    setShowDisclaimer(false)
  }

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

  // Clipboard detection on focus
  const checkClipboard = useCallback(async () => {
    try {
      const text = await window.api.readClipboard()
      const trimmedText = text?.trim() || ''
      if (isValidVideoUrl(trimmedText) && trimmedText !== lastCheckedClipboardRef.current) {
        lastCheckedClipboardRef.current = trimmedText

        // Check if auto-download is enabled
        const settings = await window.api.getSettings()
        if (settings.autoDownload) {
          // Auto-download without showing modal
          window.api.addDownload(trimmedText)
        } else {
          // Show clipboard toast for manual action
          setClipboardUrl(trimmedText)
        }
      }
    } catch (err) {
      console.error('Clipboard read failed:', err)
    }
  }, [])

  useEffect(() => {
    // Check on mount (delayed to avoid synchronous setState)
    const timer = setTimeout(checkClipboard, 100)

    // Check when window gains focus
    window.addEventListener('focus', checkClipboard)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', checkClipboard)
    }
  }, [checkClipboard])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore if focus is in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setAddDownloadModalOpen(true)
      }

      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setActivePage('Settings')
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        setActivePage('History')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Network Loss Handling: auto-pause when offline, auto-resume when online
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const pausedByNetworkRef = useRef<string[]>([])

  useEffect(() => {
    const handleOffline = (): void => {
      setIsOnline(false)
      console.log('[Network] Connection lost - pausing active downloads')
      
      // Pause all active downloads
      const activeDownloads = downloads.filter(d => d.status === 'downloading')
      pausedByNetworkRef.current = activeDownloads.map(d => d.id)
      activeDownloads.forEach(d => {
        window.api.pauseDownload(d.id)
      })
    }

    const handleOnline = (): void => {
      setIsOnline(true)
      console.log('[Network] Connection restored - resuming downloads')
      
      // Resume downloads that were paused by network loss
      pausedByNetworkRef.current.forEach(id => {
        window.api.resumeDownload(id)
      })
      pausedByNetworkRef.current = []
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [downloads])

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

  // Calculations for active downloads (for ETA and live progress)
  const activeTotalSize = activeDownloads.reduce((acc, d) => acc + (d.totalSizeInBytes || 0), 0)
  const activeTotalDownloaded = activeDownloads.reduce((acc, d) => acc + d.downloadedSizeInBytes, 0)
  const activeOverallProgress =
    activeTotalSize > 0 ? (activeTotalDownloaded / activeTotalSize) * 100 : 0

  // Calculate counts for badges
  const activeCount = downloads.filter((d) => d.status === 'downloading').length
  const completedCount = downloads.filter((d) => d.status === 'completed').length
  const pausedCount = downloads.filter((d) => d.status === 'paused').length
  const queuedCount = downloads.filter((d) => d.status === 'queued').length
  const errorCount = downloads.filter((d) => d.status === 'error').length
  const cancelledCount = downloads.filter((d) => d.status === 'cancelled').length

  const activeRemainingBytes = activeTotalSize - activeTotalDownloaded
  const activeEtaSeconds = totalSpeed > 0 ? activeRemainingBytes / totalSpeed : 0

  const formatEta = (seconds: number): string => {
    if (seconds <= 0 || !isFinite(seconds)) return '—'
    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }


  return (
    <div className="flex flex-col h-screen bg-bg-deep text-text-main font-sans">
      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="bg-red-500/90 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>Network connection lost. Downloads are paused and will resume when online.</span>
        </div>
      )}

      {/* TOP BAR */}
      <div className="toolbar">
        <div className="app-brand">
          <div className="logo-dot"></div>
          <div className="app-name">NEBULA</div>
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

        <div className="spacer"></div>

        <div className="search-box">
          <SearchIcon className="w-4 h-4 text-text-dim" />
          <input
            type="text"
            placeholder="Search downloads..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <span className="text-xs text-text-dim whitespace-nowrap">
              {downloads.filter(d => 
                d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.url.toLowerCase().includes(searchTerm.toLowerCase())
              ).length} results
            </span>
          )}
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
            icon={<PlayIcon className="text-neon-blue" />}
            label="Downloading"
            isActive={activePage === 'Downloads' && activeFilter === 'Downloading'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('Downloading')
            }}
            count={activeCount}
          />
          <SidebarItem
            icon={<ListIcon className="text-text-dim" />}
            label="Queued"
            isActive={activePage === 'Downloads' && activeFilter === 'Queued'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('Queued')
            }}
            count={queuedCount}
          />
          <SidebarItem
            icon={<PauseIcon className="text-yellow-400" />}
            label="Paused"
            isActive={activePage === 'Downloads' && activeFilter === 'Paused'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('Paused')
            }}
             count={pausedCount}
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
          <SidebarItem
            icon={<AlertCircleIcon className="text-red-500" />}
            label="Errors"
            isActive={activePage === 'Downloads' && activeFilter === 'Error'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('Error')
            }}
            count={errorCount}
          />
          <SidebarItem
            icon={<BanIcon className="text-text-dim" />}
            label="Cancelled"
            isActive={activePage === 'Downloads' && activeFilter === 'Cancelled'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('Cancelled')
            }}
            count={cancelledCount}
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

          {/* Floating Action Button - Sticky Download CTA */}
          {activePage === 'Downloads' && (
            <button
              onClick={handleAddDownload}
              className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple shadow-lg shadow-neon-blue/30 hover:shadow-neon-blue/50 hover:scale-110 transition-all duration-200 flex items-center justify-center group"
              title="Add New Download (Ctrl+N)"
            >
              <PlusIcon className="w-6 h-6 text-white" />
              {/* Pulse ring animation */}
              <span className="absolute inset-0 rounded-full bg-neon-blue/30 animate-ping opacity-75"></span>
            </button>
          )}
        </div>
      </div>

      {/* FOOTER */}
      {/* FOOTER */}
      <div
        className={`footer transition-all duration-300 ease-in-out ${isFooterExpanded ? 'h-32' : 'h-10'}`}
      >
        <div className="flex items-center w-full h-10 px-4 gap-4">
          <button
            className="text-text-dim hover:text-text-main transition-colors"
            onClick={() => setFooterExpanded(!isFooterExpanded)}
          >
            <ChevronUpIcon
              className={`w-4 h-4 transform transition-transform ${isFooterExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          <div className="speed-box">↓ {formatBytes(totalSpeed)}/s</div>
          {activeDownloads.length > 0 && (
            <>
              <div className="footer-stat">
                <span className="text-text-dim mr-1">Progress:</span>
                <span>{activeOverallProgress.toFixed(1)}%</span>
              </div>
              <div className="footer-stat">
                <span className="text-text-dim mr-1">Downloaded:</span>
                <span>
                  {formatBytes(activeTotalDownloaded)} / {formatBytes(activeTotalSize)}
                </span>
              </div>
              <div className="footer-stat">
                <span className="text-text-dim mr-1">Remaining:</span>
                <span>{formatBytes(activeRemainingBytes)}</span>
              </div>
              <div className="footer-stat">
                <span className="text-text-dim mr-1">ETA:</span>
                <span>{formatEta(activeEtaSeconds)}</span>
              </div>
            </>
          )}
          <div className="footer-spacer"></div>
          <div className="speed-box">
            <div className="connection-dot"></div> Connected
          </div>
        </div>

        {/* Expanded Footer Content - List of Active Downloads */}
        {isFooterExpanded && activeDownloads.length > 0 && (
          <div className="flex px-4 pb-2 gap-3 h-20 overflow-x-auto overflow-y-hidden animate-in fade-in slide-in-from-bottom-2">
            {activeDownloads.map((download) => (
              <div
                key={download.id}
                className="flex gap-3 min-w-[280px] max-w-[320px] bg-bg-deep/50 rounded-lg p-2 border border-border-glass hover:border-neon-blue/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedDownloadId(download.id)
                  setActivePage('Downloads')
                }}
              >
                {download.thumbnail && (
                  <img
                    src={download.thumbnail}
                    alt="Thumbnail"
                    className="h-14 w-24 rounded object-cover bg-black flex-shrink-0"
                  />
                )}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-main line-clamp-1">
                    {download.title || download.url}
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neon-blue transition-all duration-300"
                      style={{ width: `${download.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-text-dim">
                    <span>{(download.progress || 0).toFixed(1)}%</span>
                    <span>{download.speed || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddDownloadModal
        isOpen={isAddDownloadModalOpen}
        onClose={() => setAddDownloadModalOpen(false)}
        onAdd={handleAddDownloadFromModal}
      />

      {/* Clipboard Detection Toast */}
      {clipboardUrl && (
        <ClipboardToast
          url={clipboardUrl}
          onDownload={(url) => {
            window.api.addDownload(url)
            setClipboardUrl(null)
          }}
          onDismiss={() => setClipboardUrl(null)}
        />
      )}

      {/* Copyright Disclaimer Modal - First Launch */}
      <DisclaimerModal isOpen={showDisclaimer} onAccept={handleAcceptDisclaimer} />
    </div>
  )
}

export default App
