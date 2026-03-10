# Claude Dashboard - Testing Guide

## Test Suite Overview

This project includes both **Unit Tests** (Vitest) and **E2E Tests** (Playwright).

## Test Structure

```
web/
├── src/
│   ├── components/
│   │   ├── MessageRenderer.test.tsx    # Component tests
│   │   └── BookmarkButton.test.tsx
│   ├── stores/
│   │   └── useStore.test.ts            # State management tests
│   └── test/
│       ├── setup.ts                    # Test setup
│       └── utils.tsx                   # Test utilities
├── e2e/
│   ├── layout.spec.ts                  # Layout tests
│   ├── project-list.spec.ts            # Project list tests
│   ├── bookmarks.spec.ts               # Bookmarks tests
│   └── pages/                          # Page Object Models (if needed)
├── vitest.config.ts                    # Vitest configuration
└── playwright.config.ts                # Playwright configuration
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm run test

# Run with coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run e2e

# Run with UI mode (for debugging)
npm run e2e:ui

# Run with headed browser (see the browser)
npm run e2e:headed
```

## Test Coverage

### Unit Tests (19 tests)

| Component | Tests | Description |
|-----------|-------|-------------|
| `MessageRenderer` | 6 | Renders text, array content, thinking, tool_use, tool_result |
| `BookmarkButton` | 5 | Toggle bookmark, show/hide note input, API calls |
| `useStore` | 8 | State management, projects, bookmarks, tags |

### E2E Tests (11 tests)

| Feature | Tests | Description |
|---------|-------|-------------|
| Layout | 4 | Sidebar visibility, toggle, search, navigation |
| Project List | 4 | Display projects, navigate to sessions, session info |
| Bookmarks | 3 | Empty state, display bookmarks, navigation |

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should do something', async ({ page }) => {
  await page.goto('/')
  await page.click('button')
  await expect(page.locator('text=Success')).toBeVisible()
})
```

## Best Practices

1. **Unit Tests**: Test component logic, state changes, and utilities
2. **E2E Tests**: Test user flows and critical paths
3. Use `data-testid` for stable selectors in E2E tests
4. Mock external API calls in unit tests
5. Use Page Object Model for complex E2E tests

## CI Integration

Add to your CI workflow:

```yaml
- name: Run Unit Tests
  run: npm run test:run

- name: Install Playwright
  run: npx playwright install chromium

- name: Run E2E Tests
  run: npm run e2e
```
