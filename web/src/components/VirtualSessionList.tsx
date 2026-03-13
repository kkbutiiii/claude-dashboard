import { memo, useState, useCallback } from 'react'
import { List } from 'react-window'
import { formatDistanceToNow } from 'date-fns'
import { Hash, Clock, ChevronRight, Check, X, Edit2 } from 'lucide-react'
import type { Session } from '../stores/useStore'

interface VirtualSessionListProps {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (session: Session) => void
  onSessionUpdated?: (session: Session) => void
  itemHeight?: number
  overscanCount?: number
  height?: number
}

interface RowProps {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (session: Session) => void
  onSessionUpdated?: (session: Session) => void
  editingSessionId: string | null
  setEditingSessionId: (id: string | null) => void
  editValue: string
  setEditValue: (value: string) => void
  isSaving: boolean
  handleSaveDisplayName: (session: Session) => void
  handleCancelEdit: () => void
  handleStartEdit: (session: Session) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface RowComponentProps extends Record<string, any> {
  index: number
  style: React.CSSProperties
}

// 单行会话组件 - 使用 memo 避免不必要的重渲染
const SessionItem = memo(function SessionItem({
  index,
  style,
  sessions,
  selectedSessionId,
  onSelectSession,
  onSessionUpdated,
  editingSessionId,
  setEditingSessionId,
  editValue,
  setEditValue,
  isSaving,
  handleSaveDisplayName,
  handleCancelEdit,
  handleStartEdit,
}: RowComponentProps) {
  const session = sessions[index] as Session | undefined
  if (!session) return null

  const isSelected = session.id === selectedSessionId
  const isEditing = editingSessionId === session.id

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Unknown'
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const displayName = session.displayName || session.id.slice(0, 8)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveDisplayName(session)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div
      style={style}
      className={`px-3 py-2 cursor-pointer border-b border-claude-200 transition-colors ${
        isSelected
          ? 'bg-accent/10 border-l-4 border-l-accent'
          : 'hover:bg-claude-50 border-l-4 border-l-transparent'
      }`}
      onClick={() => !isEditing && onSelectSession(session)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-0 px-2 py-1 text-sm border border-accent rounded focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="输入会话名称"
                autoFocus
                disabled={isSaving}
              />
              <button
                onClick={() => handleSaveDisplayName(session)}
                disabled={isSaving}
                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 group">
                <span className="font-medium text-claude-900 truncate text-sm">
                  {displayName}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartEdit(session)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-claude-400 hover:text-accent hover:bg-accent/10 rounded transition-all"
                  title="编辑名称"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
              {!session.displayName && (
                <span className="text-xs text-claude-400">
                  {session.id.slice(0, 8)}...
                </span>
              )}
            </>
          )}
          <div className="flex items-center gap-3 text-xs text-claude-500 mt-1">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {session.messageCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(session.updatedAt)}
            </span>
          </div>
        </div>
        {!isEditing && <ChevronRight className="w-4 h-4 text-claude-400 flex-shrink-0" />}
      </div>
    </div>
  )
})

// 虚拟列表组件
export function VirtualSessionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  onSessionUpdated,
  itemHeight = 72,
  overscanCount = 5,
  height = 400,
}: VirtualSessionListProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleStartEdit = useCallback((session: Session) => {
    setEditingSessionId(session.id)
    setEditValue(session.displayName || '')
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingSessionId(null)
    setEditValue('')
  }, [])

  const handleSaveDisplayName = useCallback(async (session: Session) => {
    if (!editValue.trim() || editValue.trim() === session.displayName) {
      handleCancelEdit()
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(session.projectName)}/${encodeURIComponent(session.id)}/display-name`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: editValue.trim() }),
        }
      )

      if (response.ok) {
        const updatedSession = { ...session, displayName: editValue.trim() }
        onSessionUpdated?.(updatedSession)
        handleCancelEdit()
      } else {
        console.error('Failed to save display name')
        alert('保存失败，请重试')
      }
    } catch (error) {
      console.error('Error saving display name:', error)
      alert('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }, [editValue, handleCancelEdit, onSessionUpdated])

  const rowProps: RowProps = {
    sessions,
    selectedSessionId,
    onSelectSession,
    onSessionUpdated,
    editingSessionId,
    setEditingSessionId,
    editValue,
    setEditValue,
    isSaving,
    handleSaveDisplayName,
    handleCancelEdit,
    handleStartEdit,
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-claude-500">
        暂无会话
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <List<any>
        rowComponent={SessionItem as any}
        rowCount={sessions.length}
        rowHeight={itemHeight}
        rowProps={rowProps}
        overscanCount={overscanCount}
        className="scrollbar"
      />
    </div>
  )
}
