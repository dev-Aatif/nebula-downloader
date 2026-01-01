import React, { useState, useEffect } from 'react'
import type { Settings } from '@main/types'
import SettingsRow from '../components/SettingsRow'

export default function SettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings>({
    downloadDirectory: '',
    concurrency: 3,
    ytDlpPath: '',
    ffmpegPath: '',
    defaultFormat: '',
    proxy: ''
  })

  useEffect(() => {
    window.api.getSettings().then((loadedSettings: Settings) => {
      setSettings(loadedSettings)
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

  const handleSave = async (): Promise<void> => {
    try {
      await window.api.updateSettings(settings)
      // You might want to add a toast notification here
      alert('Settings Saved!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert(`Failed to save settings: ${(error as Error).message}`)
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
    readOnly = false
  ): React.ReactElement => (
    <input
      type={type}
      name={name}
      value={settings[name]}
      onChange={handleChange}
      readOnly={readOnly}
      className="bg-bg-deep border border-border-glass rounded-md p-1.5 text-sm w-full"
    />
  )

  return (
    <div className="p-6 flex flex-col gap-5 text-text-main">
      <h2 className="text-xl font-bold mb-4 text-text-main">Settings</h2>

      <div className="flex flex-col">
        <h3 className="text-lg font-semibold mb-2 text-neon-blue">General</h3>
        <SettingsRow label="Theme" description="Change the application theme">
          <select
            onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
            className="bg-bg-deep border border-border-glass rounded-md p-1.5 text-sm"
            defaultValue="system"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </SettingsRow>

        <h3 className="text-lg font-semibold mb-2 mt-6 text-neon-blue">Downloads</h3>
        <SettingsRow
          label="Download Directory"
          description="The default location to save your downloads."
        >
          <div className="flex gap-2 w-full">
            {renderInput('downloadDirectory', 'text', true)}
            <button
              onClick={() => handleBrowseDirectory('downloadDirectory')}
              className="tool-btn primary btn-lg"
            >
              Browse
            </button>
          </div>
        </SettingsRow>
        <SettingsRow
          label="Max Concurrent Downloads"
          description="How many downloads can run at the same time."
        >
          {renderInput('concurrency', 'number')}
        </SettingsRow>
        <SettingsRow
          label="Default Download Format"
          description="The default yt-dlp format string."
        >
          {renderInput('defaultFormat')}
        </SettingsRow>

        <h3 className="text-lg font-semibold mb-2 mt-6 text-neon-blue">Advanced</h3>
        <SettingsRow label="yt-dlp Path" description="The path to your yt-dlp executable.">
          <div className="flex gap-2 w-full">
            {renderInput('ytDlpPath', 'text', true)}
            <button
              onClick={() => handleBrowseFile('ytDlpPath')}
              className="tool-btn primary btn-lg"
            >
              Browse
            </button>
          </div>
        </SettingsRow>
        <SettingsRow label="FFmpeg Path" description="The path to your FFmpeg executable.">
          <div className="flex gap-2 w-full">
            {renderInput('ffmpegPath', 'text', true)}
            <button
              onClick={() => handleBrowseFile('ffmpegPath')}
              className="tool-btn primary btn-lg"
            >
              Browse
            </button>
          </div>
        </SettingsRow>
        <SettingsRow
          label="Proxy"
          description="e.g., http://127.0.0.1:8080 or socks5://user:pass@host:port"
        >
          {renderInput('proxy')}
        </SettingsRow>
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={handleSave} className="tool-btn primary btn-lg">
          Save Settings
        </button>
      </div>
    </div>
  )
}
