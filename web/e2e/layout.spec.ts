import { test, expect } from '@playwright/test'

test.describe('Layout', () => {
  test('should display sidebar with projects', async ({ page }) => {
    await page.goto('/')

    // Check sidebar is visible
    await expect(page.locator('h1', { hasText: 'Claude Dashboard' })).toBeVisible()

    // Check Projects section
    await expect(page.locator('h3', { hasText: 'Projects' })).toBeVisible()
  })

  test('should toggle sidebar', async ({ page }) => {
    await page.goto('/')

    // Click toggle button to collapse sidebar
    await page.click('header button')

    // Click again to expand
    await page.click('header button')

    // Sidebar should be visible again
    await expect(page.locator('h1', { hasText: 'Claude Dashboard' })).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    await page.goto('/')

    // Check search input exists
    const searchInput = page.locator('input[placeholder="Search sessions..."]')
    await expect(searchInput).toBeVisible()

    // Type in search
    await searchInput.fill('test query')
    await searchInput.press('Enter')

    // Should navigate to search page
    await expect(page).toHaveURL(/.*search.*/)
  })

  test('should navigate to bookmarks page', async ({ page }) => {
    await page.goto('/')

    // Click on Bookmarks
    await page.click('text=Bookmarks')

    // Should show bookmarks page
    await expect(page.locator('h1:has-text("Bookmarks")')).toBeVisible()
  })
})
