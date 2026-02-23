/* eslint-disable */
/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import Settings from '../../../../src/renderer/src/pages/settings'
import type { Settings as SettingsType } from '../../../../src/main/types'

let mockApi: any

beforeEach(() => {
  mockApi = {
    getSettings: vi.fn(() =>
      Promise.resolve({
        downloadDirectory: '/fake/dir',
        concurrency: 3,
        defaultFormat: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        proxy: '',
        speedLimit: 0,
        autoDownload: false
      } as SettingsType)
    ),
    updateSettings: vi.fn(() => Promise.resolve()),
    openDirectoryDialog: vi.fn(() => Promise.resolve('/new/fake/dir')),
    getDependencyStatus: vi.fn(() =>
      Promise.resolve({
        ytDlp: { installed: true, version: '1.0' },
        ffmpeg: { installed: true, version: '1.0' }
      })
    ),
    installYtDlp: vi.fn(),
    installFfmpeg: vi.fn(),
    checkYtDlpUpdate: vi.fn(),
    checkFfmpegUpdate: vi.fn(),
    updateYtDlp: vi.fn(),
    onYtDlpInstallProgress: vi.fn(() => () => {}),
    onFfmpegInstallProgress: vi.fn(() => () => {}),
    onYtDlpUpdateProgress: vi.fn(() => () => {}),
    onDepInstallStatus: vi.fn(() => () => {})
  }
  window.api = mockApi as any
})

afterEach(() => {
  cleanup()
})

describe('Settings Component (settings.tsx)', () => {
  it('renders correctly and loads initial settings', async () => {
    render(<Settings />)
    expect(await screen.findByText('/fake/dir')).toBeTruthy()
  })

  it('allows changing the output directory', async () => {
    render(<Settings />)
    expect(await screen.findByText('/fake/dir')).toBeTruthy()

    // Wait 150ms to bypass the initialLoadRef protection window
    await new Promise((resolve) => setTimeout(resolve, 150))

    const changeBtn = screen.getByText('Change')
    fireEvent.click(changeBtn)

    expect(mockApi.openDirectoryDialog).toHaveBeenCalled()

    await waitFor(
      () => {
        expect(mockApi.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ downloadDirectory: '/new/fake/dir' })
        )
      },
      { timeout: 2000 }
    )
  })

  it('allows changing auto-download setting', async () => {
    render(<Settings />)
    expect(await screen.findByText('/fake/dir')).toBeTruthy()

    // Wait 150ms to bypass the initialLoadRef protection window
    await new Promise((resolve) => setTimeout(resolve, 150))

    const autoDownloadCheckbox = screen.getByRole('checkbox')
    fireEvent.click(autoDownloadCheckbox)

    await waitFor(
      () => {
        expect(mockApi.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ autoDownload: true })
        )
      },
      { timeout: 2000 }
    )
  })
})
