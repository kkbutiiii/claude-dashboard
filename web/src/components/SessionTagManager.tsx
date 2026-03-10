import { useState, useEffect } from 'react'
import { Tag as TagIcon, Plus, X } from 'lucide-react'
import { useStore } from '../stores/useStore'

interface SessionTagManagerProps {
  sessionId: string
}

export function SessionTagManager({ sessionId }: SessionTagManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const { tags, sessionTags, setSessionTags, addTag } = useStore()

  useEffect(() => {
    // Load tags on mount
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => {
        useStore.setState({ tags: data.tags })
      })

    // Load session tags
    fetch(`/api/tags/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        const tagIds = data.tags.map((t: { id: string }) => t.id)
        setSessionTags(sessionId, tagIds)
      })
  }, [sessionId, setSessionTags])

  const assignedTagIds = sessionTags[sessionId] || []
  const assignedTags = tags.filter((t) => assignedTagIds.includes(t.id))
  const availableTags = tags.filter((t) => !assignedTagIds.includes(t.id))

  const handleAddTag = async (tagId: string) => {
    try {
      await fetch(`/api/tags/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      })
      setSessionTags(sessionId, [...assignedTagIds, tagId])
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      await fetch(`/api/tags/session/${sessionId}/${tagId}`, { method: 'DELETE' })
      setSessionTags(
        sessionId,
        assignedTagIds.filter((id) => id !== tagId)
      )
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName }),
      })

      if (response.ok) {
        const data = await response.json()
        addTag(data.tag)
        await handleAddTag(data.tag.id)
        setNewTagName('')
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="p-2 text-claude-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
        title="Manage tags"
      >
        <TagIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 z-20 bg-white border border-claude-200 rounded-lg shadow-lg p-3 w-64"
          onMouseLeave={() => setIsOpen(false)}
        >
          <h4 className="text-sm font-semibold text-claude-700 mb-2">Tags</h4>

          {/* Assigned Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {assignedTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:bg-white/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {assignedTags.length === 0 && (
              <span className="text-xs text-claude-400 italic">No tags assigned</span>
            )}
          </div>

          {/* Available Tags */}
          {availableTags.length > 0 && (
            <div className="border-t border-claude-100 pt-2 mb-3">
              <p className="text-xs text-claude-500 mb-1">Add existing tag:</p>
              <div className="flex flex-wrap gap-1">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.id)}
                    className="px-2 py-1 rounded-full text-xs text-white hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: tag.color }}
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Tag */}
          <div className="border-t border-claude-100 pt-2">
            <p className="text-xs text-claude-500 mb-1">Create new tag:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name..."
                className="input text-sm flex-1 py-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <button
                onClick={handleCreateTag}
                className="btn-primary py-1 px-2"
                disabled={!newTagName.trim()}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
