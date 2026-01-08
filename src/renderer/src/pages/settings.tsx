import React, { useState, useEffect } from 'react'
import type { Settings } from '@main/types'
import SettingsRow from '../components/SettingsRow'
import { CheckCircleIcon, ChevronDownIcon } from '../components/icons'

const FORMAT_PRESETS = [
  { label: 'Best Video (MP4)', value: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' },
  { label: 'Best Video (MKV)', value: 'bestvideo+bestaudio/best' },
  { label: 'Best Audio (MP3)', value: 'bestaudio/best' },
  { label: 'MP4 (Simple)', value: 'mp4' },
  { label: 'Custom', value: 'custom' }
]

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
  const [formatMode, setFormatMode] = useState('custom')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false) // Collapsed by default

  useEffect(() => {
    window.api.getSettings().then((loadedSettings: Settings) => {
      setSettings(loadedSettings)
      // Determine format mode
      const found = FORMAT_PRESETS.find((p) => p.value === loadedSettings.defaultFormat)
      if (found) {
        setFormatMode(found.value)
      } else {
        setFormatMode('custom')
      }
    })
  }, [])

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

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.updateSettings(settings)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert(`Failed to save settings: ${(error as Error).message}`)
    } finally {
      setSaving(false)
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

  const handleThemeChange = (theme: 'light' | 'dark' | 'system'): void => {
    window.api.setTheme(theme)
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
            {/* Appearance */}
            <section className="bg-card/30 border border-border-glass rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-neon-blue flex items-center gap-2">
                Appearance
              </h3>
              <SettingsRow label="Theme" description="Change the application theme">
                <select
                  onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
                  className="bg-[#0d111a] border border-white/10 rounded-md p-2 text-sm text-text-main focus:border-neon-blue focus:outline-none min-w-[150px]"
                  defaultValue="system"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </SettingsRow>
              <SettingsRow
                label="Auto-Download"
                description="Skip modal and download immediately when URL is detected"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({ ...s, autoDownload: !s.autoDownload }))
                  }
                  className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    settings.autoDownload ? 'bg-neon-blue' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.autoDownload ? 'translate-x-6' : 'translate-x-1'
                    }`}
                    style={{ marginTop: '4px' }}
                  />
                </button>
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
                  <SettingsRow label="yt-dlp Path" description="Path to yt-dlp executable (optional).">
                    <div className="flex gap-2 w-full">
                      {renderInput('ytDlpPath', 'text', true, 'Auto-detected')}
                      <button
                        onClick={() => handleBrowseFile('ytDlpPath')}
                        className="tool-btn primary px-4"
                      >
                        Browse
                      </button>
                    </div>
                  </SettingsRow>

                  <SettingsRow label="FFmpeg Path" description="Path to FFmpeg executable (optional).">
                    <div className="flex gap-2 w-full">
                      {renderInput('ffmpegPath', 'text', true, 'Auto-detected')}
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
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#0d111a]/95 backdrop-blur border-t border-border-glass p-4 flex items-center justify-between z-20">
        <div className="text-sm text-text-dim px-4">
          {showToast && (
            <span className="text-neon-green flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
              <CheckCircleIcon className="w-4 h-4" /> Settings saved successfully
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`
            bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/50 
            px-8 py-2.5 rounded-md font-medium transition-all
            ${saving ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

