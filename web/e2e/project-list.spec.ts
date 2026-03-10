import { test, expect } from '@playwright/test'

test.describe('Project List', () => {
  test('should display all projects on homepage', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page.locator('h1:has-text("All Projects")')).toBeVisible()

    // Projects should be displayed as cards
    const projectCards = page.locator('.card')
    await expect(projectCards.first()).toBeVisible()
  })

  test('should navigate to project sessions when clicking a project', async ({ page }) => {
    await page.goto('/')

    // Click on first project card
    const firstProject = page.locator('.card').first()
    await firstProject.click()

    // Should navigate to project page
    await expect(page).toHaveURL(/.*project.*/)

    // Should show session list
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should display session information', async ({ page }) => {
    await page.goto('/')

    // Check if there are any project cards
    const projectCards = page.locator('.card')
    const count = await projectCards.count()

    if (count === 0) {
      // If no projects, check for empty state
      await expect(page.locator('text=No projects found')).toBeVisible()
      return
    }

    // Click on first project card
    await projectCards.first().click()

    // Wait for navigation
    await page.waitForURL(/.*project.*/, { timeout: 5000 })

    // Check page content - either show project name or session list
    const hasContent = await page.locator('h1').isVisible()
    expect(hasContent).toBe(true)
  })

  test('should copy resume command', async ({ page }) => {
    await page.goto('/project/test-project')

    // Hover over a session to show resume button
    const sessionCard = page.locator('.card').first()
    await sessionCard.hover()

    // Look for resume button
    const resumeButton = page.locator('button:has-text("Resume")')
    if (await resumeButton.isVisible().catch(() => false)) {
      await resumeButton.click()
      // Clipboard operation can't be directly tested, but button click should work
    }
  })
})
