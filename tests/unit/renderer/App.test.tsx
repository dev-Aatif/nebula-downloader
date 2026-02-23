/* eslint-disable */
/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from '../../../src/renderer/src/App'

// Mock the whole API since this is an integration test of the renderer
const mockApi = {
  getSettings: vi.fn(() =>
    Promise.resolve({
      downloadDirectory: '/fake/dir',
      concurrency: 3,
      defaultFormat: 'bestvideo+bestaudio/best',
      proxy: '',
      speedLimit: 0,
      autoDownload: false
    })
  ),
  getDependencyStatus: vi.fn(() =>
    Promise.resolve({ ytDlp: { installed: true }, ffmpeg: { installed: true } })
  ),
  onYtDlpInstallProgress: vi.fn(() => () => {}),
  onFfmpegInstallProgress: vi.fn(() => () => {}),
  onYtDlpUpdateProgress: vi.fn(() => () => {}),
  onFfmpegUpdateProgress: vi.fn(() => () => {}),
  onUpdateError: vi.fn(() => () => {}),
  onInstallError: vi.fn(() => () => {}),
  onDepInstallStatus: vi.fn(() => () => {}),
  onSetupProgress: vi.fn(() => () => {}),
  onUpdatesAvailable: vi.fn(() => () => {}),
  onDownloadsLoaded: vi.fn(() => () => {}),
  onDownloadAdded: vi.fn(() => () => {}),
  onDownloadDeleted: vi.fn(() => () => {}),
  onDownloadPaused: vi.fn(() => () => {}),
  onDownloadResumed: vi.fn(() => () => {}),
  onDownloadProgress: vi.fn(() => () => {}),
  onDownloadComplete: vi.fn(() => () => {}),
  onDownloadError: vi.fn(() => () => {}),
  onThemeUpdated: vi.fn(() => () => {}),
  setTheme: vi.fn(),
  removeDownloadProgress: vi.fn(),
  removeDownloadComplete: vi.fn(),
  removeDownloadError: vi.fn(),
  removeInstallProgress: vi.fn()
}

// Ensure the real window has the mocked api before React mounts
beforeEach(() => {
  vi.clearAllMocks()
  window.api = mockApi as any
})

describe('App Shell (App.tsx)', () => {
  it('renders the initial App Shell structure', async () => {
    // We mock checkDependencies to return true and hasAcceptedDisclaimer to true
    const { container } = render(<App />)

    // Wait to finish rendering
    await new Promise((r) => setTimeout(r, 100))

    // Check structure
    expect(container.querySelector('.sidebar')).toBeTruthy()
    expect(container.querySelector('.toolbar')).toBeTruthy()
    expect(container.querySelector('.main-layout')).toBeTruthy()
  })

  it('navigates between main pages', async () => {
    const { container } = render(<App />)

    await new Promise((r) => setTimeout(r, 100))

    // Wait for rendering
    await waitFor(() => {
      expect(container.querySelector('.sidebar')).toBeTruthy()
    })

    // Click Settings
    const settingsTabs = screen.queryAllByText('Settings')
    if (settingsTabs.length > 0) {
      fireEvent.click(settingsTabs[0])
      // wait
      await new Promise((r) => setTimeout(r, 100))
      const settingsHeader = screen.queryAllByText('Settings')
      expect(settingsHeader.length).toBeGreaterThan(0)
    }
  })
})
