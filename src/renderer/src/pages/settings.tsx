import React, { useState, useEffect, useRef } from 'react'
import type { Settings } from '@main/types'
import SettingsRow from '../components/SettingsRow'
import ToggleSwitch from '../components/ToggleSwitch'
import { CheckCircleIcon, ChevronDownIcon } from '../components/icons'

const FORMAT_PRESETS = [
  { label: 'Best Video (MP4)', value: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' },
  { label: 'Best Video (MKV)', value: 'bestvideo+bestaudio/best' },
  { label: 'Best Audio (MP3)', value: 'bestaudio/best' },
  { label: 'MP4 (Simple)', value: 'mp4' },
  { label: 'Custom', value: 'custom' }
]

type DependencyInfo = {
  installed: boolean
  version: string | null
  path: string
  updateAvailable?: boolean
  latestVersion?: string
}

type DependencyStatus = {
  ytDlp: DependencyInfo
  ffmpeg: DependencyInfo
}

export default function SettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings>({
    downloadDirectory: '',
    concurrency: 3,
    ytDlpPath: '',
    ffmpegPath: '',
    defaultFormat: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    proxy: ''
  })
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [formatMode, setFormatMode] = useState('custom')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const initialLoadRef = useRef(true)

  // Dependency status state
  const [depStatus, setDepStatus] = useState<DependencyStatus | null>(null)
  const [isCheckingYtDlp, setIsCheckingYtDlp] = useState(false)
  const [isCheckingFfmpeg, setIsCheckingFfmpeg] = useState(false)
  const [isUpdatingYtDlp, setIsUpdatingYtDlp] = useState(false)
  const [ytDlpUpdateProgress, setYtDlpUpdateProgress] = useState(0)

  // Helper for notifications
  const showNotification = (msg: string): void => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  // Load dependency status on mount
  useEffect(() => {
    window.api.getFullDependencyStatus().then(setDepStatus)

    // Listen for update progress
    const unlistenProgress = window.api.onYtDlpUpdateProgress((percent) => {
      setYtDlpUpdateProgress(percent)
      if (percent >= 100) {
        setTimeout(() => {
          setIsUpdatingYtDlp(false)
          window.api.getFullDependencyStatus().then(setDepStatus)
          showNotification('Update complete')
        }, 500)
      }
    })

    return () => unlistenProgress()
  }, [])

  // Handlers for dependency updates
  const handleCheckYtDlpUpdate = async (): Promise<void> => {
    setIsCheckingYtDlp(true)
    try {
      const result = await window.api.checkYtDlpUpdate()
      setDepStatus((prev) =>
        prev
          ? {
              ...prev,
              ytDlp: {
                ...prev.ytDlp,
                updateAvailable: result.updateAvailable,
                latestVersion: result.latestVersion
              }
            }
          : null
      )
      if (result.updateAvailable) {
        showNotification(`Update available: v${result.latestVersion}`)
      } else {
        showNotification('yt-dlp is up to date')
      }
    } catch (err) {
      console.error('Failed to check yt-dlp update:', err)
      showNotification('Check failed')
    } finally {
      setIsCheckingYtDlp(false)
    }
  }

  const handleCheckFfmpegUpdate = async (): Promise<void> => {
    setIsCheckingFfmpeg(true)
    try {
      const result = await window.api.checkFfmpegUpdate()
      setDepStatus((prev) =>
        prev
          ? {
              ...prev,
              ffmpeg: {
                ...prev.ffmpeg,
                updateAvailable: result.updateAvailable,
                latestVersion: result.latestVersion
              }
            }
          : null
      )
      if (result.updateAvailable) {
        showNotification(`Update available: v${result.latestVersion}`)
      } else {
        showNotification('FFmpeg is up to date')
      }
    } catch (err) {
      console.error('Failed to check ffmpeg update:', err)
      showNotification('Check failed')
    } finally {
      setIsCheckingFfmpeg(false)
    }
  }

  const handleUpdateYtDlp = async (): Promise<void> => {
    setIsUpdatingYtDlp(true)
    setYtDlpUpdateProgress(0)
    try {
      await window.api.updateYtDlp()
    } catch (err) {
      console.error('Failed to update yt-dlp:', err)
      setIsUpdatingYtDlp(false)
      showNotification('Update failed')
    }
  }

  useEffect(() => {
    window.api.getSettings().then((loadedSettings: Settings) => {
      setSettings(loadedSettings)
      const found = FORMAT_PRESETS.find((p) => p.value === loadedSettings.defaultFormat)
      if (found) {
        setFormatMode(found.value)
      } else {
        setFormatMode('custom')
      }
      // Mark initial load complete after a tick
      setTimeout(() => {
        initialLoadRef.current = false
      }, 100)
    })
  }, [])

  // Debounced auto-save effect
  useEffect(() => {
    // Skip auto-save on initial load
    if (initialLoadRef.current) return

    setHasChanges(true)
    const debounceTimer = setTimeout(async () => {
      setSaving(true)
      try {
        await window.api.updateSettings(settings)
        showNotification('Settings saved')
        setHasChanges(false)
      } catch (error) {
        console.error('Failed to auto-save settings:', error)
      } finally {
        setSaving(false)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(debounceTimer)
  }, [settings])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target
    const type = e.target.getAttribute('type')
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: type === 'number' ? parseInt(value) : value
    }))
  }

  const handleFormatModeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const mode = e.target.value
    setFormatMode(mode)
    if (mode !== 'custom') {
      setSettings((prev) => ({ ...prev, defaultFormat: mode }))
    }
  }

  const handleBrowseDirectory = async (name: keyof Settings): Promise<void> => {
    const selectedPath = await window.api.openDirectoryDialog()
    if (selectedPath) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        [name]: selectedPath
      }))
    }
  }

  const handleBrowseFile = async (name: keyof Settings): Promise<void> => {
    const selectedPath = await window.api.openFileDialog()
    if (selectedPath) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        [name]: selectedPath
      }))
    }
  }

  const renderInput = (
    name: keyof Settings,
    type = 'text',
    readOnly = false,
    placeholder = ''
  ): React.ReactElement => (
    <input
      type={type}
      name={name as string}
      value={settings[name] as string | number}
      onChange={handleChange}
      readOnly={readOnly}
      placeholder={placeholder}
      className="bg-[#0d111a] border border-white/10 rounded-md p-2 text-sm w-full focus:border-neon-blue focus:outline-none transition-colors"
    />
  )

  return (
    <div className="flex flex-col h-full bg-bg-deep relative">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-8 pb-24">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-text-main">Settings</h2>
            <p className="text-text-dim text-sm mt-1">
              Manage application preferences and configurations.
            </p>
          </div>

          {/* Groups */}
          <div className="space-y-6">
            {/* Behavior */}
            <section className="bg-card/30 border border-border-glass rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-neon-blue flex items-center gap-2">
                Behavior
              </h3>
              <SettingsRow
                label="Auto-Download"
                description="Skip modal and download immediately when URL is detected"
              >
                <ToggleSwitch
                  checked={settings.autoDownload || false}
                  onChange={(checked) => setSettings((s) => ({ ...s, autoDownload: checked }))}
                />
              </SettingsRow>
            </section>

            {/* Downloads */}
            <section className="bg-card/30 border border-border-glass rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-neon-blue">Downloads</h3>

              <SettingsRow label="Download Directory" description="Where files will be saved.">
                <div className="flex gap-2 w-full">
                  {renderInput('downloadDirectory', 'text', true, 'Select a folder...')}
                  <button
                    onClick={() => handleBrowseDirectory('downloadDirectory')}
                    className="tool-btn primary px-4"
                  >
                    Browse
                  </button>
                </div>
              </SettingsRow>

              <SettingsRow label="Max Concurrency" description="Simultaneous downloads allowed.">
                <div className="w-24">{renderInput('concurrency', 'number')}</div>
              </SettingsRow>

              <SettingsRow
                label="Speed Limit"
                description="Limit download bandwidth (0 = unlimited)"
              >
                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <input
                      type="number"
                      name="speedLimit"
                      value={settings.speedLimit || 0}
                      onChange={handleChange}
                      min="0"
                      className="bg-[#0d111a] border border-white/10 rounded-md p-2 text-sm w-full focus:border-neon-blue focus:outline-none transition-colors"
                    />
                  </div>
                  <span className="text-text-dim text-sm">KB/s</span>
                </div>
              </SettingsRow>

              <SettingsRow
                label="Preferred Format"
                description="Select a preset or define a custom yt-dlp format string."
              >
                <div className="flex flex-col gap-2 w-full">
                  <select
                    className="bg-[#0d111a] border border-white/10 rounded-md p-2 text-sm text-text-main focus:border-neon-blue focus:outline-none w-full"
                    value={formatMode}
                    onChange={handleFormatModeChange}
                  >
                    {FORMAT_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {formatMode === 'custom' &&
                    renderInput('defaultFormat', 'text', false, 'e.g., bestvideo+bestaudio/best')}
                </div>
              </SettingsRow>
            </section>

            {/* Advanced - Collapsible */}
            <section className="bg-card/30 border border-border-glass rounded-lg overflow-hidden">
              <button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-lg font-semibold text-neon-blue flex items-center gap-2">
                  Advanced
                  <span className="text-xs font-normal text-text-dim bg-white/10 px-2 py-0.5 rounded">
                    {isAdvancedOpen ? 'Click to collapse' : 'Click to expand'}
                  </span>
                </h3>
                <ChevronDownIcon
                  className={`w-5 h-5 text-text-dim transition-transform duration-200 ${
                    isAdvancedOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isAdvancedOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-6 pt-0 space-y-4">
                  <SettingsRow
                    label="yt-dlp Path"
                    description="Manual override for yt-dlp executable (advanced only)."
                  >
                    <div className="flex gap-2 w-full">
                      {renderInput('ytDlpPath', 'text', true, 'Default (Auto-managed)')}
                      <button
                        onClick={() => handleBrowseFile('ytDlpPath')}
                        className="tool-btn primary px-4"
                      >
                        Browse
                      </button>
                    </div>
                  </SettingsRow>

                  <SettingsRow
                    label="FFmpeg Path"
                    description="Manual override for FFmpeg executable (advanced only)."
                  >
                    <div className="flex gap-2 w-full">
                      {renderInput('ffmpegPath', 'text', true, 'Default (Bundled)')}
                      <button
                        onClick={() => handleBrowseFile('ffmpegPath')}
                        className="tool-btn primary px-4"
                      >
                        Browse
                      </button>
                    </div>
                  </SettingsRow>

                  <SettingsRow label="Proxy" description="HTTP/HTTPS/SOCKS proxy URL.">
                    {renderInput('proxy', 'text', false, 'http://user:pass@host:port')}
                  </SettingsRow>
                </div>
              </div>
            </section>

            {/* Dependencies */}
            <section className="bg-card/30 border border-border-glass rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-neon-blue">Dependencies</h3>

              <div className="space-y-3">
                {/* yt-dlp Card */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-blue/20 flex items-center justify-center">
                      <span className="text-lg">📥</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">yt-dlp</div>
                      <div className="text-xs text-text-dim">Download engine</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {depStatus?.ytDlp.installed ? (
                      <>
                        <span className="text-xs text-neon-green bg-neon-green/10 px-2 py-1 rounded">
                          v{depStatus.ytDlp.version}
                        </span>
                        {isUpdatingYtDlp ? (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-neon-blue transition-all"
                                style={{ width: `${ytDlpUpdateProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-dim w-8">
                              {ytDlpUpdateProgress}%
                            </span>
                          </div>
                        ) : depStatus.ytDlp.updateAvailable ? (
                          <button
                            onClick={handleUpdateYtDlp}
                            className="tool-btn primary text-xs px-3 py-1.5"
                          >
                            Update to v{depStatus.ytDlp.latestVersion}
                          </button>
                        ) : (
                          <button
                            onClick={handleCheckYtDlpUpdate}
                            disabled={isCheckingYtDlp}
                            className="tool-btn text-xs px-3 py-1.5"
                          >
                            {isCheckingYtDlp ? '...' : 'Check'}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-red-400">Not installed</span>
                    )}
                  </div>
                </div>

                {/* FFmpeg Card */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <span className="text-lg">🎬</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">FFmpeg</div>
                      <div className="text-xs text-text-dim">Media processing</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {depStatus?.ffmpeg.installed ? (
                      <>
                        <span className="text-xs text-neon-green bg-neon-green/10 px-2 py-1 rounded">
                          v{depStatus.ffmpeg.version?.split('-')[0] || 'unknown'}
                        </span>
                        {depStatus.ffmpeg.updateAvailable ? (
                          <>
                            <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                              v{depStatus.ffmpeg.latestVersion}
                            </span>
                            <a
                              href="https://ffmpeg.org/download.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tool-btn primary text-xs px-3 py-1.5"
                            >
                              Download
                            </a>
                          </>
                        ) : (
                          <button
                            onClick={handleCheckFfmpegUpdate}
                            disabled={isCheckingFfmpeg}
                            className="tool-btn text-xs px-3 py-1.5"
                          >
                            {isCheckingFfmpeg ? '...' : 'Check'}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-red-400">Not found</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-text-dim mt-3">
                yt-dlp updates automatically. FFmpeg is bundled with the app.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Sticky Footer - Auto-save status */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#0d111a]/95 backdrop-blur border-t border-border-glass p-4 flex items-center justify-end z-20">
        <div className="text-sm px-4 flex items-center gap-2">
          {saving && (
            <span className="text-neon-blue flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          )}
          {!saving && showToast && (
            <span className="text-neon-green flex items-center gap-2 animate-in fade-in">
              <CheckCircleIcon className="w-4 h-4" /> {toastMessage || 'Saved'}
            </span>
          )}
          {!saving && !showToast && hasChanges && (
            <span className="text-text-dim flex items-center gap-2">Unsaved changes</span>
          )}
          {!saving && !showToast && !hasChanges && (
            <span className="text-text-dim/50 flex items-center gap-2">
              All changes saved automatically
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
