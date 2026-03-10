import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookmarkButton } from './BookmarkButton'
import { useStore } from '../stores/useStore'

// Mock fetch
global.fetch = vi.fn()

describe('BookmarkButton', () => {
  const mockAddBookmark = vi.fn()
  const mockRemoveBookmark = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      addBookmark: mockAddBookmark,
      removeBookmark: mockRemoveBookmark,
    })
  })

  it('renders bookmark icon when not bookmarked', () => {
    render(
      <BookmarkButton
        messageUuid="msg-1"
        sessionId="session-1"
        projectName="project-a"
        isBookmarked={false}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'Add bookmark')
  })

  it('renders filled bookmark icon when bookmarked', () => {
    render(
      <BookmarkButton
        messageUuid="msg-1"
        sessionId="session-1"
        projectName="project-a"
        isBookmarked={true}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'Remove bookmark')
  })

  it('shows note input when clicking unbookmarked button', async () => {
    render(
      <BookmarkButton
        messageUuid="msg-1"
        sessionId="session-1"
        projectName="project-a"
        isBookmarked={false}
      />
    )

    await userEvent.click(screen.getByRole('button'))

    expect(screen.getByPlaceholderText('Bookmark note...')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('hides note input when clicking cancel', async () => {
    render(
      <BookmarkButton
        messageUuid="msg-1"
        sessionId="session-1"
        projectName="project-a"
        isBookmarked={false}
      />
    )

    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByPlaceholderText('Bookmark note...')).not.toBeInTheDocument()
  })

  it('calls removeBookmark when clicking bookmarked button', async () => {
    const mockBookmarks = [{ id: 'bookmark-1', messageUuid: 'msg-1' }]
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ bookmarks: mockBookmarks }),
    } as any)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as any)

    render(
      <BookmarkButton
        messageUuid="msg-1"
        sessionId="session-1"
        projectName="project-a"
        isBookmarked={true}
      />
    )

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/bookmarks/bookmark-1', {
        method: 'DELETE',
      })
    })
  })
})
