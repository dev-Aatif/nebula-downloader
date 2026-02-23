/* eslint-disable */
import { test, expect, _electron as electron } from '@playwright/test'

test.describe('App E2E', () => {
  let electronApp: any
  let window: any

  test.beforeEach(async () => {
    // Launch Electron App
    electronApp = await electron.launch({ args: ['.'] })
    // Get the main window
    window = await electronApp.firstWindow()
    // Wait for the app skeleton to load
    await window.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    // Close the app if it's running
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('app window should open and have correct title', async () => {
    // Verify window properties
    const title = await window.title()
    expect(title).toBe('Nebula') // Or "Nebula Downloader", verifying correct generic title
  })

  test('navigation between side-panel tabs works', async () => {
    // Check initial tab
    await expect(window.locator('text=Downloads').first()).toBeVisible()

    // Click Settings
    await window.locator('nav >> text=Settings').click()

    // Check Settings view
    await expect(window.locator('text=Output Directory').first()).toBeVisible()
    await expect(window.locator('text=Theme').first()).toBeVisible()

    // Click History
    await window.locator('nav >> text=History').click()
    await expect(window.locator('text=No download history yet').first()).toBeVisible()
  })

  test('basic video download input interaction', async () => {
    // Go to Downloads tab
    await window.locator('nav >> text=Downloads').click()

    // Type a URL
    const input = window.locator('input[placeholder="Paste video URL here..."]')
    await expect(input).toBeVisible()
    await input.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // Find the "+" or Add button to submit URL. Typically aria-label="Add download"
    // Since we don't know the exact class or aria-label, we can look for the button next to input
    const addBtn = window.locator('button[aria-label="Add download"]')

    // We won't actually click it unless we have mocked backend in E2E since
    // it requires real yt-dlp. Or we can click it and verify the "Checking..." state.
    // For now we just verify the input took the value.
    await expect(input).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })
})
