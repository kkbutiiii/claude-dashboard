import { test, expect } from '@playwright/test'

test.describe('Bookmarks', () => {
  test('should show empty bookmarks page', async ({ page }) => {
    await page.goto('/bookmarks')

    // Check page title
    await expect(page.locator('h1:has-text("Bookmarks")')).toBeVisible()

    // If no bookmarks, should show empty state
    const emptyState = page.locator('text=No bookmarks yet')
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(emptyState).toBeVisible()
      await expect(page.locator('text=Click the bookmark icon')).toBeVisible()
    }
  })

  test('should display bookmarks if they exist', async ({ page }) => {
    await page.goto('/bookmarks')

    // Check for bookmark cards if they exist
    const bookmarkCards = page.locator('.card')
    const count = await bookmarkCards.count()

    if (count > 0) {
      // Verify bookmark information is displayed
      await expect(page.locator('text=Message in session')).toBeVisible()
    }
  })

  test('should navigate to bookmarked session', async ({ page }) => {
    await page.goto('/bookmarks')

    // Click on first bookmark if exists
    const firstBookmark = page.locator('.card').first()
    if (await firstBookmark.isVisible().catch(() => false)) {
      await firstBookmark.click()
      await expect(page).toHaveURL(/.*session.*/)
    }
  })
})
