import { useEffect, useState } from 'react'
import { Bookmark, MessageSquare, Folder, ExternalLink, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useStore, type Bookmark as BookmarkType } from '../stores/useStore'

export function BookmarksView() {
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { removeBookmark } = useStore()

  useEffect(() => {
    loadBookmarks()
  }, [])

  const loadBookmarks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/bookmarks')
      const data = await response.json()
      setBookmarks(data.bookmarks)
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bookmark?')) return

    try {
      await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
      removeBookmark(id)
      setBookmarks(bookmarks.filter(b => b.id !== id))
    } catch (error) {
      console.error('Failed to delete bookmark:', error)
    }
  }

  const handleNavigate = (bookmark: BookmarkType) => {
    window.location.href = `/session/${encodeURIComponent(bookmark.projectName)}/${encodeURIComponent(bookmark.sessionId)}`
  }

  return (
    <div className="h-full overflow-y-auto scrollbar p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-claude-900">Bookmarks</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-claude-500">Loading bookmarks...</div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 text-claude-300 mx-auto mb-4" />
            <p className="text-claude-500 text-lg">No bookmarks yet</p>
            <p className="text-claude-400 mt-2">
              Click the bookmark icon on any message to save it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map(bookmark => (
              <div
                key={bookmark.id}
                className="card p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleNavigate(bookmark)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Bookmark className="w-4 h-4 text-accent fill-accent" />
                      <span className="text-sm text-claude-500">
                        Message in session
                      </span>
                    </div>

                    {bookmark.note && (
                      <p className="text-claude-800 font-medium mb-2">{bookmark.note}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-claude-500">
                      <span className="flex items-center gap-1">
                        <Folder className="w-4 h-4" />
                        {bookmark.projectName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {bookmark.sessionId.slice(0, 8)}...
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleNavigate(bookmark)}
                      className="p-2 text-claude-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title="Go to session"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(bookmark.id)}
                      className="p-2 text-claude-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
