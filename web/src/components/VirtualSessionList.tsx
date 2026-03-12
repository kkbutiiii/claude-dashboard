import { memo } from 'react'
import { List } from 'react-window'
import { formatDistanceToNow } from 'date-fns'
import { Hash, Clock, ChevronRight } from 'lucide-react'
import type { Session } from '../stores/useStore'

interface VirtualSessionListProps {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (session: Session) => void
  itemHeight?: number
  overscanCount?: number
  height?: number
}

interface RowProps {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (session: Session) => void
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
}: RowComponentProps) {
  const session = sessions[index] as Session | undefined
  if (!session) return null

  const isSelected = session.id === selectedSessionId

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Unknown'
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return 'Unknown'
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
      onClick={() => onSelectSession(session)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-claude-900 truncate text-sm">
              {session.id.slice(0, 8)}...
            </span>
          </div>
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
        <ChevronRight className="w-4 h-4 text-claude-400 flex-shrink-0" />
      </div>
    </div>
  )
})

// 虚拟列表组件
export function VirtualSessionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  itemHeight = 64,
  overscanCount = 5,
  height = 400,
}: VirtualSessionListProps) {
  const rowProps: RowProps = {
    sessions,
    selectedSessionId,
    onSelectSession,
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
