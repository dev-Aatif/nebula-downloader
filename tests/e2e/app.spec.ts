/* eslint-disable */
import { test, expect, _electron as electron } from '@playwright/test'

test.describe('App E2E', () => {
  let electronApp: any
  let window: any

  test.beforeEach(async () => {
    // Determine the path to the electron executable
    const electronAppPath = require('electron')
    // Launch Electron App using the bundled electron executable path
    // Pass headless environment flags for CI compatibility
    electronApp = await electron.launch({
      executablePath: electronAppPath as any,
      args: ['.', '--no-sandbox', '--disable-gpu']
    })
    // Get the main window
    window = await electronApp.firstWindow()
    // Wait for the app skeleton to load
    await window.waitForLoadState('domcontentloaded')

    // Dismiss disclaimer modal if it appears
    try {
      const acceptDisclaimerBtn = window.locator('text="I Understand & Accept"')
      await acceptDisclaimerBtn.waitFor({ state: 'visible', timeout: 3000 })
      await acceptDisclaimerBtn.click()
    } catch (e) {
      // Ignore if not present
    }

    // Dismiss setup modal (for initial dependencies) if it appears
    try {
      const skipSetupBtn = window.locator('text="Skip for now"')
      await skipSetupBtn.waitFor({ state: 'visible', timeout: 3000 })
      await skipSetupBtn.click()
    } catch (e) {
      // Ignore if not present
    }
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
    expect(title).toBe('Nebula Downloader')
  })

  test('navigation between side-panel tabs works', async () => {
    // Check initial tab
    await expect(window.locator('text=All Downloads').first()).toBeVisible()

    // Click Settings
    await window.locator('.sidebar >> text=Settings').click()

    // Check Settings view
    await expect(window.locator('text=Download Directory').first()).toBeVisible()
    await expect(window.locator('text=Simultaneous Downloads').first()).toBeVisible()

    // Click History
    await window.locator('.sidebar >> text=History').click()
    await expect(window.locator('text=No Downloads Yet').first()).toBeVisible()
  })

  test('basic video download input interaction', async () => {
    // Go to Downloads tab
    await window.locator('.sidebar >> text=All Downloads').click()

    // Open Add Download Modal (disambiguate from FAB by using .tool-btn)
    await window.locator('button.tool-btn[title="Add New Download (Ctrl+N)"]').click()

    // Type a URL
    const input = window.locator('input[placeholder="https://..."]')
    await expect(input).toBeVisible()
    await input.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // Find the Add Download button to submit URL
    const addButton = window.locator('button:has-text("Add Download")').first()
    await addButton.click()
    // We won't actually click it unless we have mocked backend in E2E since
    // it requires real yt-dlp. Or we can click it and verify the "Checking..." state.
    // For now we just verify the input took the value.
    await expect(input).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })
})
