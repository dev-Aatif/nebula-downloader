/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react'
import type { Settings } from '@main/types'
import ToggleSwitch from '../components/ToggleSwitch'
import { CheckCircleIcon } from '../components/icons'

const FORMAT_PRESETS = [
  {
    label: 'Best Video (MP4)',
    value: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
  },
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
    defaultFormat: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    proxy: ''
  })
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [formatMode, setFormatMode] = useState('custom')
  const [hasChanges, setHasChanges] = useState(false)
  const initialLoadRef = useRef(true)

  // Dependency status
  const [depStatus, setDepStatus] = useState<DependencyStatus | null>(null)
  const [isCheckingYtDlp, setIsCheckingYtDlp] = useState(false)
  const [isCheckingFfmpeg, setIsCheckingFfmpeg] = useState(false)

  // Individual install/update progress
  const [isInstallingYtDlp, setIsInstallingYtDlp] = useState(false)
  const [ytDlpProgress, setYtDlpProgress] = useState(0)
  const [ytDlpStatus, setYtDlpStatus] = useState('')
  const [ytDlpError, setYtDlpError] = useState('')
  const [isInstallingFfmpeg, setIsInstallingFfmpeg] = useState(false)
  const [ffmpegProgress, setFfmpegProgress] = useState(0)
  const [ffmpegStatus, setFfmpegStatus] = useState('')
  const [ffmpegError, setFfmpegError] = useState('')

  const showNotification = (msg: string): void => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const refreshStatus = (): void => {
    window.api.getDependencyStatus().then(setDepStatus)
  }

  // Load dependency status FAST (filesystem only)
  useEffect(() => {
    refreshStatus()

    const unsub1 = window.api.onYtDlpInstallProgress((p) => setYtDlpProgress(p))
    const unsub2 = window.api.onFfmpegInstallProgress((p) => setFfmpegProgress(p))
    const unsub3 = window.api.onYtDlpUpdateProgress((p) => {
      setYtDlpProgress(p)
      if (p >= 100) {
        setTimeout(() => {
          setIsInstallingYtDlp(false)
          refreshStatus()
          showNotification('yt-dlp updated')
        }, 500)
      }
    })
    const unsub4 = window.api.onDepInstallStatus((dep, msg) => {
      if (dep === 'ytdlp') setYtDlpStatus(msg)
      else setFfmpegStatus(msg)
    })

    return () => {
      unsub1()
      unsub2()
      unsub3()
      unsub4()
    }
  }, [])

  // ── Dependency handlers ──
  const handleInstallYtDlp = async (): Promise<void> => {
    setIsInstallingYtDlp(true)
    setYtDlpProgress(0)
    setYtDlpStatus('Starting...')
    setYtDlpError('')
    ;(window as any).__depInstallInProgress = true
    try {
      const result = await window.api.installYtDlp()
      if (result.success) {
        showNotification('yt-dlp installed')
        setYtDlpStatus('')
      } else {
        setYtDlpError(result.error || 'Installation failed')
        setYtDlpStatus('')
        showNotification('yt-dlp installation failed')
      }
      refreshStatus()
    } catch (e) {
      setYtDlpError(e instanceof Error ? e.message : 'Installation failed')
      setYtDlpStatus('')
    } finally {
      setIsInstallingYtDlp(false)
      if (!isInstallingFfmpeg) (window as any).__depInstallInProgress = false
    }
  }

  const handleInstallFfmpeg = async (): Promise<void> => {
    setIsInstallingFfmpeg(true)
    setFfmpegProgress(0)
    setFfmpegStatus('Starting...')
    setFfmpegError('')
    ;(window as any).__depInstallInProgress = true
    try {
      const result = await window.api.installFfmpeg()
      if (result.success) {
        showNotification('FFmpeg installed')
        setFfmpegStatus('')
      } else {
        setFfmpegError(result.error || 'Installation failed')
        setFfmpegStatus('')
        showNotification('FFmpeg installation failed')
      }
      refreshStatus()
    } catch (e) {
      setFfmpegError(e instanceof Error ? e.message : 'Installation failed')
      setFfmpegStatus('')
    } finally {
      setIsInstallingFfmpeg(false)
      if (!isInstallingYtDlp) (window as any).__depInstallInProgress = false
    }
  }

  const handleCheckYtDlpUpdate = async (): Promise<void> => {
    setIsCheckingYtDlp(true)
    try {
      const r = await window.api.checkYtDlpUpdate()
      setDepStatus((prev) =>
        prev
          ? {
              ...prev,
              ytDlp: {
                ...prev.ytDlp,
                updateAvailable: r.updateAvailable,
                latestVersion: r.latestVersion
              }
            }
          : null
      )
      showNotification(
        r.updateAvailable ? `Update available: v${r.latestVersion}` : 'yt-dlp is up to date'
      )
    } catch {
      showNotification('Check failed')
    } finally {
      setIsCheckingYtDlp(false)
    }
  }

  const handleCheckFfmpegUpdate = async (): Promise<void> => {
    setIsCheckingFfmpeg(true)
    try {
      const r = await window.api.checkFfmpegUpdate()
      setDepStatus((prev) =>
        prev
          ? {
              ...prev,
              ffmpeg: {
                ...prev.ffmpeg,
                updateAvailable: r.updateAvailable,
                latestVersion: r.latestVersion
              }
            }
          : null
      )
      showNotification(
        r.updateAvailable ? `Update available: v${r.latestVersion}` : 'FFmpeg is up to date'
      )
    } catch {
      showNotification('Check failed')
    } finally {
      setIsCheckingFfmpeg(false)
    }
  }

  const handleUpdateYtDlp = async (): Promise<void> => {
    setIsInstallingYtDlp(true)
    setYtDlpProgress(0)
    try {
      await window.api.updateYtDlp()
    } catch {
      setIsInstallingYtDlp(false)
      showNotification('Update failed')
    }
  }

  // ── Settings handlers ──
  useEffect(() => {
    window.api.getSettings().then((s: Settings) => {
      setSettings(s)
      const found = FORMAT_PRESETS.find((p) => p.value === s.defaultFormat)
      setFormatMode(found ? found.value : 'custom')
      setTimeout(() => {
        initialLoadRef.current = false
      }, 100)
    })
  }, [])

  useEffect(() => {
    if (initialLoadRef.current) return
    setHasChanges(true)
    const t = setTimeout(async () => {
      setSaving(true)
      try {
        await window.api.updateSettings(settings)
        showNotification('Settings saved')
        setHasChanges(false)
      } catch (e) {
        console.error('Failed to auto-save:', e)
      } finally {
        setSaving(false)
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [settings])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target
    const type = e.target.getAttribute('type')
    setSettings((p) => ({
      ...p,
      [name]: type === 'number' ? parseInt(value) : value
    }))
  }

  const handleFormatModeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const mode = e.target.value
    setFormatMode(mode)
    if (mode !== 'custom') {
      setSettings((p) => ({ ...p, defaultFormat: mode }))
    }
  }

  const handleBrowseDirectory = async (): Promise<void> => {
    const path = await window.api.openDirectoryDialog()
    if (path) setSettings((p) => ({ ...p, downloadDirectory: path }))
  }

  // ── Shared classes ──
  const inputCls =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text-main focus:border-neon-blue/50 focus:outline-none focus:ring-1 focus:ring-neon-blue/20 transition-all'
  const smallBtn =
    'text-[11px] px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-text-dim border border-white/[0.06] transition-colors'

  // ── Progress bar component ──
  const ProgressBar = ({
    percent,
    label
  }: {
    percent: number
    label: string
  }): React.ReactElement => (
    <div className="mt-2 px-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-text-dim">{label}</span>
        <span className="text-[10px] text-text-dim font-mono">{percent}%</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-neon-blue rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-bg-deep relative">
      <style>{`
        .settings-scroll::-webkit-scrollbar { width: 6px; }
        .settings-scroll::-webkit-scrollbar-track { background: transparent; }
        .settings-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 3px;
        }
        .settings-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>

      <div className="flex-1 overflow-y-auto settings-scroll p-6 md:p-8 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-2">
            <h2 className="text-2xl font-bold text-text-main tracking-tight">Settings</h2>
            <p className="text-text-dim text-sm mt-1">Configure your preferences</p>
          </div>

          {/* ── General ── */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                General
              </h3>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {/* Download Directory */}
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-main">Download Directory</div>
                  <div className="text-xs text-text-dim mt-0.5 truncate">
                    {settings.downloadDirectory || 'Not set'}
                  </div>
                </div>
                <button
                  onClick={handleBrowseDirectory}
                  className="shrink-0 px-4 py-1.5 text-xs font-medium rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-text-main transition-colors"
                >
                  Change
                </button>
              </div>

              {/* Auto-Download */}
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-text-main">Auto-Download</div>
                  <div className="text-xs text-text-dim mt-0.5">
                    Skip modal and download immediately
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.autoDownload || false}
                  onChange={(c) => setSettings((s) => ({ ...s, autoDownload: c }))}
                />
              </div>

              {/* Preferred Format */}
              <div className="px-5 py-4">
                <div className="mb-3">
                  <div className="text-sm font-medium text-text-main">Preferred Format</div>
                  <div className="text-xs text-text-dim mt-0.5">Default quality and format</div>
                </div>
                <select className={inputCls} value={formatMode} onChange={handleFormatModeChange}>
                  {FORMAT_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {formatMode === 'custom' && (
                  <input
                    type="text"
                    name="defaultFormat"
                    value={settings.defaultFormat}
                    onChange={handleChange}
                    placeholder="e.g., bestvideo+bestaudio/best"
                    className={`mt-2 ${inputCls}`}
                  />
                )}
              </div>
            </div>
          </section>

          {/* ── Downloads ── */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                Downloads
              </h3>
            </div>
            <div className="divide-y divide-white/[0.06]">
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-text-main">Simultaneous Downloads</div>
                  <div className="text-xs text-text-dim mt-0.5">Max parallel downloads</div>
                </div>
                <input
                  type="number"
                  name="concurrency"
                  value={settings.concurrency}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  className="w-16 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-text-main text-center focus:border-neon-blue/50 focus:outline-none focus:ring-1 focus:ring-neon-blue/20 transition-all"
                />
              </div>

              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-text-main">Speed Limit</div>
                  <div className="text-xs text-text-dim mt-0.5">0 = unlimited</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="speedLimit"
                    value={settings.speedLimit || 0}
                    onChange={handleChange}
                    min="0"
                    className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-text-main text-center focus:border-neon-blue/50 focus:outline-none focus:ring-1 focus:ring-neon-blue/20 transition-all"
                  />
                  <span className="text-xs text-text-dim">KB/s</span>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="mb-2">
                  <div className="text-sm font-medium text-text-main">Proxy</div>
                  <div className="text-xs text-text-dim mt-0.5">HTTP/HTTPS/SOCKS proxy URL</div>
                </div>
                <input
                  type="text"
                  name="proxy"
                  value={settings.proxy}
                  onChange={handleChange}
                  placeholder="http://user:pass@host:port"
                  className={`${inputCls} placeholder-text-dim/40`}
                />
              </div>
            </div>
          </section>

          {/* ── Dependencies ── */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                Dependencies
              </h3>
              <button
                onClick={refreshStatus}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-text-dim border border-white/[0.06] transition-colors"
                title="Re-check if dependencies exist (useful after manual install)"
              >
                Refresh
              </button>
            </div>
            <div className="p-5 space-y-3">
              {/* ── yt-dlp Card ── */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neon-blue/10 flex items-center justify-center text-base">
                      📥
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-main">yt-dlp</div>
                      <div className="text-[11px] text-text-dim">Download engine</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {depStatus?.ytDlp.installed ? (
                      <>
                        <span className="text-[11px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md font-mono">
                          v{depStatus.ytDlp.version}
                        </span>
                        {depStatus.ytDlp.updateAvailable ? (
                          <button
                            onClick={handleUpdateYtDlp}
                            disabled={isInstallingYtDlp}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/20 transition-colors"
                          >
                            Update to v{depStatus.ytDlp.latestVersion}
                          </button>
                        ) : (
                          <button
                            onClick={handleCheckYtDlpUpdate}
                            disabled={isCheckingYtDlp}
                            className={smallBtn}
                          >
                            {isCheckingYtDlp ? '...' : 'Check'}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-red-400/80 bg-red-400/10 px-2 py-0.5 rounded-md">
                          Not installed
                        </span>
                        {!isInstallingYtDlp && (
                          <button
                            onClick={handleInstallYtDlp}
                            className="text-[11px] px-3 py-1 rounded-md bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/20 transition-colors"
                          >
                            Install
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {isInstallingYtDlp && (
                  <div className="mt-3">
                    <ProgressBar percent={ytDlpProgress} label="Downloading yt-dlp..." />
                    {ytDlpStatus && (
                      <div
                        className="text-[10px] text-text-dim/70 mt-1.5 truncate"
                        title={ytDlpStatus}
                      >
                        {ytDlpStatus}
                      </div>
                    )}
                  </div>
                )}
                {ytDlpError && !isInstallingYtDlp && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20">
                    <div className="text-[11px] text-red-400 mb-2 leading-relaxed">
                      {ytDlpError}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleInstallYtDlp}
                        className="text-[10px] px-2.5 py-1 rounded-md bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/20 transition-colors"
                      >
                        Retry
                      </button>
                      <span className="text-[10px] text-text-dim/50">
                        or try a VPN/proxy · or{' '}
                        <button
                          onClick={() => (window as any).__setActivePage?.('Help')}
                          className="text-neon-blue hover:underline"
                        >
                          install manually
                        </button>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── FFmpeg Card ── */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-base">
                      🎬
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-main">FFmpeg</div>
                      <div className="text-[11px] text-text-dim">Media processing</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {depStatus?.ffmpeg.installed ? (
                      <>
                        <span className="text-[11px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md font-mono">
                          v{depStatus.ffmpeg.version?.split('-')[0] || 'unknown'}
                        </span>
                        {depStatus.ffmpeg.updateAvailable ? (
                          <span className="text-[11px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md">
                            v{depStatus.ffmpeg.latestVersion} available
                          </span>
                        ) : (
                          <button
                            onClick={handleCheckFfmpegUpdate}
                            disabled={isCheckingFfmpeg}
                            className={smallBtn}
                          >
                            {isCheckingFfmpeg ? '...' : 'Check'}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-red-400/80 bg-red-400/10 px-2 py-0.5 rounded-md">
                          Not installed
                        </span>
                        {!isInstallingFfmpeg && (
                          <button
                            onClick={handleInstallFfmpeg}
                            className="text-[11px] px-3 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-colors"
                          >
                            Install
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {isInstallingFfmpeg && (
                  <div className="mt-3">
                    <ProgressBar percent={ffmpegProgress} label="Downloading FFmpeg..." />
                    {ffmpegStatus && (
                      <div
                        className="text-[10px] text-text-dim/70 mt-1.5 truncate"
                        title={ffmpegStatus}
                      >
                        {ffmpegStatus}
                      </div>
                    )}
                  </div>
                )}
                {ffmpegError && !isInstallingFfmpeg && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20">
                    <div className="text-[11px] text-red-400 mb-2 leading-relaxed">
                      {ffmpegError}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleInstallFfmpeg}
                        className="text-[10px] px-2.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-colors"
                      >
                        Retry
                      </button>
                      <span className="text-[10px] text-text-dim/50">
                        or try a VPN/proxy · or{' '}
                        <button
                          onClick={() => (window as any).__setActivePage?.('Help')}
                          className="text-neon-blue hover:underline"
                        >
                          install manually
                        </button>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-text-dim/60 pt-1">
                Auto-managed. Click Refresh after manually placing binaries.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-bg-deep/95 backdrop-blur-sm border-t border-white/[0.06] px-6 py-3 flex items-center justify-end z-20">
        <div className="text-xs flex items-center gap-2">
          {saving && (
            <span className="text-neon-blue flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
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
              Saving…
            </span>
          )}
          {!saving && showToast && (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5" /> {toastMessage || 'Saved'}
            </span>
          )}
          {!saving && !showToast && hasChanges && (
            <span className="text-text-dim">Unsaved changes</span>
          )}
          {!saving && !showToast && !hasChanges && (
            <span className="text-text-dim/40">All changes saved automatically</span>
          )}
        </div>
      </div>
    </div>
  )
}
