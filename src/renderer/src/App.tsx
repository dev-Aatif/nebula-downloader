import React, { useState, useEffect, useRef, useCallback } from 'react'
import Downloads from './pages/downloads'
import Settings from './pages/settings'
import History from './pages/History'
import Help from './pages/Help'
import AddDownloadModal from './components/AddDownloadModal'
import DownloadDetails from './components/DownloadDetails'
import ClipboardToast from './components/ClipboardToast'
import DisclaimerModal from './components/DisclaimerModal'
import SetupModal from './components/SetupModal'
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
  AlertCircleIcon,
  ListIcon,
  BanIcon
} from './components/icons'

type Page = 'Downloads' | 'History' | 'Settings' | 'Help'
type DownloadFilter =
  | 'All'
  | 'Downloading'
  | 'Paused'
  | 'Completed'
  | 'Queued'
  | 'Error'
  | 'Cancelled'

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
    selectedIds: Set<string>
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
    onMultiSelect: (id: string) => void
    onSelectAll?: () => void
    viewMode?: 'normal' | 'simple'
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
  collapsed?: boolean
}> = ({ icon, label, isActive, onClick, count, collapsed }) => (
  <div
    className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
    onClick={onClick}
    title={collapsed ? label : undefined}
  >
    {icon}
    {!collapsed && <span className="flex-1 animate-in fade-in slide-in-from-left-2 duration-200">{label}</span>}
    {!collapsed && count !== undefined && count > 0 && (
      <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>
    )}
    {collapsed && count !== undefined && count > 0 && (
      <div className="absolute top-2 right-2 w-2 h-2 bg-neon-blue rounded-full"></div>
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'normal' | 'simple'>('normal')

  // Selection handlers
  const handleToggleSelect = useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])


  // Bulk Handlers
  // Bulk Handlers
  const handleBulkPause = useCallback((): void => {
    if (selectedIds.size === 0) return
    selectedIds.forEach((id) => {
      const download = downloads.find((d) => d.id === id)
      if (download && (download.status === 'downloading' || download.status === 'queued')) {
        window.api.pauseDownload(id)
      }
    })
    setSelectedIds(new Set())
  }, [selectedIds, downloads])

  const handleBulkResume = useCallback((): void => {
    if (selectedIds.size === 0) return
    selectedIds.forEach((id) => {
      const download = downloads.find((d) => d.id === id)
      if (download && download.status === 'paused') {
        window.api.resumeDownload(id)
      }
    })
    setSelectedIds(new Set())
  }, [selectedIds, downloads])

  const handleBulkDelete = useCallback((): void => {
    if (selectedIds.size === 0) return
    // Show confirmation dialog logic would ideally be here or we just delete
    // For toolbar action, let's just delete for now or we need a global confirm dialog
    // User requested "remove those buttons that appear after selecting videos" and "use above icons"
    // So buttons should trigger these.
    selectedIds.forEach((id) => window.api.deleteDownload(id))
    setSelectedIds(new Set())
  }, [selectedIds])

  // Copyright disclaimer state
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  // Clipboard detection state
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null)
  const lastCheckedClipboardRef = useRef<string>('')

  // Setup modal state for first-run yt-dlp download
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupProgress, setSetupProgress] = useState(0)
  const [setupStatus, setSetupStatus] = useState<'downloading' | 'complete' | 'error'>(
    'downloading'
  )
  const [setupError, setSetupError] = useState<string | undefined>(undefined)

  // Check settings on load for first-launch disclaimer
  useEffect(() => {
    window.api.getSettings().then((settings) => {
      if (!settings.hasSeenDisclaimer) {
        setShowDisclaimer(true)
      }
    })
  }, [])

  // Check dependency status on load
  useEffect(() => {
    const checkDependencies = async (): Promise<void> => {
      try {
        const status = await window.api.getDependencyStatus()
        if (!status.ytDlp.installed) {
          setNeedsSetup(true)
          setSetupStatus('downloading')
          // Start installation
          const success = await window.api.installYtDlp()
          if (success) {
            setSetupStatus('complete')
            setTimeout(() => setNeedsSetup(false), 1500)
          } else {
            setSetupStatus('error')
            setSetupError('Failed to download yt-dlp. Please check your internet connection.')
          }
        } else {
          // Run background updates for existing installations
          window.api.runBackgroundUpdates()
        }
      } catch (err) {
        console.error('Failed to check dependencies:', err)
      }
    }
    checkDependencies()

    // Listen for setup progress
    const unlistenSetup = window.api.onSetupProgress((percent) => {
      setSetupProgress(percent)
    })

    // Listen for update availability notifications from main process
    const unlistenUpdates = window.api.onUpdatesAvailable((updates) => {
      const updateNames = Object.entries(updates)
        .map(([name, version]) => `${name}: v${version}`)
        .join(', ')
      console.log(`[Updates] Available: ${updateNames}`)
      // The system notification is already shown by main process
      // User can navigate to Settings to update
    })

    return () => {
      unlistenSetup()
      unlistenUpdates()
    }
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
      const activeDownloads = downloads.filter((d) => d.status === 'downloading')
      pausedByNetworkRef.current = activeDownloads.map((d) => d.id)
      activeDownloads.forEach((d) => {
        window.api.pauseDownload(d.id)
      })
    }

    const handleOnline = (): void => {
      setIsOnline(true)
      console.log('[Network] Connection restored - resuming downloads')

      // Resume downloads that were paused by network loss
      pausedByNetworkRef.current.forEach((id) => {
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





  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value)
  }

  const ActivePageComponent = pages[activePage]
  const displayedDownload =
    downloads.find((d) => d.id === (selectedDownloadId || activeDownloadId)) ||
    downloads.find((d) => d.status === 'downloading') ||
    (downloads.length > 0 ? downloads[0] : null)

  // Calculate counts for badges
  const activeCount = downloads.filter((d) => d.status === 'downloading').length
  const completedCount = downloads.filter((d) => d.status === 'completed').length
  const pausedCount = downloads.filter((d) => d.status === 'paused').length
  const queuedCount = downloads.filter((d) => d.status === 'queued').length
  const errorCount = downloads.filter((d) => d.status === 'error').length
  const cancelledCount = downloads.filter((d) => d.status === 'cancelled').length

  return (
    <div
      className="flex flex-col h-screen bg-bg-deep text-text-main font-sans overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-neon-blue/20 backdrop-blur-sm border-4 border-neon-blue border-dashed m-4 rounded-xl flex items-center justify-center animate-in fade-in cursor-copy pointer-events-none">
          <div className="bg-bg-deep p-6 rounded-xl border border-neon-blue shadow-2xl flex flex-col items-center gap-4">
            <div className="p-4 bg-neon-blue/20 rounded-full animate-bounce">
              <DownloadIcon className="w-12 h-12 text-neon-blue" />
            </div>
            <h2 className="text-2xl font-bold text-white">Drop URL to Download</h2>
            <p className="text-text-dim">Release to start adding this video</p>
          </div>
        </div>
      )}

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="bg-red-500/90 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>Network connection lost. Downloads are paused and will resume when online.</span>
        </div>
      )}

      {/* TOP BAR */}
      <div className="toolbar">
        <div className="app-brand flex items-center gap-3 pl-4">
          <span className="text-2xl font-black tracking-[0.2em] uppercase" style={{
            fontFamily: 'Orbitron, Inter, sans-serif',
            background: 'linear-gradient(135deg, var(--neon-blue) 0%, var(--neon-purple) 50%, var(--neon-blue) 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 30px rgba(0, 243, 255, 0.3)',
            animation: 'shimmer 3s linear infinite'
          }}>
            NEBULA
          </span>
        </div>

        <div className="tool-group">
          {/* View Mode Toggle */}
          <ToolbarButton
            title={viewMode === 'normal' ? "Switch to Simple View" : "Switch to Detailed View"}
            onClick={() => setViewMode(prev => prev === 'normal' ? 'simple' : 'normal')}
            isActive={viewMode === 'simple'}
          >
            <ListIcon className="w-5 h-5" />
          </ToolbarButton>

          <div className="w-px h-6 bg-white/10 mx-2"></div>

          {selectedIds.size > 0 ? (
            <>
              <ToolbarButton title="Resume Selected" onClick={handleBulkResume}>
                <PlayIcon className="w-5 h-5 text-neon-green" />
              </ToolbarButton>
              <ToolbarButton title="Pause Selected" onClick={handleBulkPause}>
                <PauseIcon className="w-5 h-5 text-yellow-500" />
              </ToolbarButton>
              <ToolbarButton title="Delete Selected" onClick={handleBulkDelete}>
                <TrashIcon className="w-5 h-5 text-red-500" />
              </ToolbarButton>
            </>
          ) : (
            <>
              <ToolbarButton title="Pause All" onClick={() => window.api.pauseAllDownloads()}>
                <PauseIcon className="w-5 h-5" />
              </ToolbarButton>
              <ToolbarButton title="Delete All" onClick={() => { }}>
                <TrashIcon className="w-5 h-5 opacity-50" />
              </ToolbarButton>
            </>
          )}
        </div>


        <div className="spacer"></div>

        {/* Add Download Button */}
        <button
          onClick={handleAddDownload}
          className="tool-btn primary flex items-center gap-2 px-4"
          title="Add New Download (Ctrl+N)"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Add</span>
        </button>

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
              {
                downloads.filter(
                  (d) =>
                    d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    d.url.toLowerCase().includes(searchTerm.toLowerCase())
                ).length
              }{' '}
              results
            </span>
          )}
        </div>


      </div>

      <div className="main-layout">
        {/* SIDEBAR */}
        <div className={`sidebar transition-all duration-300 ease-in-out flex flex-col border-r border-border-glass bg-bg-surface ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          {/* Collapse Toggle */}
          <div className="p-4 flex justify-end">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-text-dim hover:text-white transition-colors"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>

          <div className={`sidebar-label ${isSidebarCollapsed ? 'text-center text-[10px]' : ''}`}>
            {isSidebarCollapsed ? 'ALL' : 'Downloads'}
          </div>
          <SidebarItem
            icon={<DownloadIcon />}
            label="All Downloads"
            isActive={activePage === 'Downloads' && activeFilter === 'All'}
            onClick={() => {
              setActivePage('Downloads')
              setActiveFilter('All')
            }}
            collapsed={isSidebarCollapsed}
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
            collapsed={isSidebarCollapsed}
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
            collapsed={isSidebarCollapsed}
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
            collapsed={isSidebarCollapsed}
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
            collapsed={isSidebarCollapsed}
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
            collapsed={isSidebarCollapsed}
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
            collapsed={isSidebarCollapsed}
          />

          <div className={`sidebar-label ${isSidebarCollapsed ? 'text-center text-[10px]' : ''}`}>
            {isSidebarCollapsed ? 'ORG' : 'Organization'}
          </div>
          <SidebarItem
            icon={<ClockIcon />}
            label="History"
            isActive={activePage === 'History'}
            onClick={() => setActivePage('History')}
            collapsed={isSidebarCollapsed}
          />

          <div className="spacer"></div>

          <SidebarItem
            icon={<HelpIcon />}
            label="Support & Help"
            isActive={activePage === 'Help'}
            onClick={() => setActivePage('Help')}
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem
            icon={<SettingsIcon />}
            label="Settings"
            isActive={activePage === 'Settings'}
            onClick={() => setActivePage('Settings')}
            collapsed={isSidebarCollapsed}
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
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onMultiSelect={handleToggleSelect}
              viewMode={viewMode}
            // onSelectAll is handled in the page component to access sorted/filtered list
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
              className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple shadow-lg shadow-neon-blue/30 hover:shadow-neon-blue/50 hover:scale-110 transition-all duration-200 flex items-center justify-center group"
              title="Add New Download (Ctrl+N)"
            >
              <PlusIcon className="w-6 h-6 text-white" />
              {/* Pulse ring animation */}
              <span className="absolute inset-0 rounded-full bg-neon-blue/30 animate-ping opacity-75"></span>
            </button>
          )}
        </div>
      </div>



      <AddDownloadModal
        isOpen={isAddDownloadModalOpen}
        onClose={() => {
          setAddDownloadModalOpen(false)
          setDroppedUrl('')
        }}
        initialUrl={droppedUrl}
        onAdd={(url, formatId, options) => {
          window.api.addDownload(url, formatId, options)
          setAddDownloadModalOpen(false)
          setDroppedUrl('')
        }}
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

      {/* Setup Modal - First Run yt-dlp Download */}
      <SetupModal
        isOpen={needsSetup}
        progress={setupProgress}
        status={setupStatus}
        error={setupError}
      />
    </div>
  )
}

export default App
