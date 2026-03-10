import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useStore } from '../stores/useStore'

interface BookmarkButtonProps {
  messageUuid: string
  sessionId: string
  projectName: string
  isBookmarked: boolean
}

export function BookmarkButton({
  messageUuid,
  sessionId,
  projectName,
  isBookmarked: initialIsBookmarked,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [note, setNote] = useState('')
  const { addBookmark, removeBookmark } = useStore()

  const handleBookmark = async () => {
    if (isBookmarked) {
      // Find and remove bookmark
      try {
        const response = await fetch('/api/bookmarks')
        const data = await response.json()
        const bookmark = data.bookmarks.find(
          (b: { messageUuid: string }) => b.messageUuid === messageUuid
        )
        if (bookmark) {
          await fetch(`/api/bookmarks/${bookmark.id}`, { method: 'DELETE' })
          removeBookmark(bookmark.id)
          setIsBookmarked(false)
        }
      } catch (error) {
        console.error('Failed to remove bookmark:', error)
      }
    } else {
      setShowNoteInput(true)
    }
  }

  const handleSaveBookmark = async () => {
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageUuid,
          sessionId,
          projectName,
          note: note || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        addBookmark(data.bookmark)
        setIsBookmarked(true)
        setShowNoteInput(false)
        setNote('')
      }
    } catch (error) {
      console.error('Failed to add bookmark:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleBookmark}
        className={`p-2 rounded-lg transition-colors ${
          isBookmarked
            ? 'text-accent bg-accent/10'
            : 'text-claude-400 hover:text-accent hover:bg-accent/10'
        }`}
        title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
      </button>

      {showNoteInput && (
        <div className="absolute right-0 top-full mt-2 z-10 bg-white border border-claude-200 rounded-lg shadow-lg p-3 w-64">
          <p className="text-sm text-claude-600 mb-2">Add a note (optional):</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Bookmark note..."
            className="input text-sm mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveBookmark}
              className="btn-primary text-sm flex-1"
            >
              Save
            </button>
            <button
              onClick={() => setShowNoteInput(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
