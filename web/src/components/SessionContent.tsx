import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { ArrowLeft, X, Search, ChevronUp, ChevronDown, Download, Terminal } from 'lucide-react'
import { format } from 'date-fns'
import { useStore, type Session, type Message } from '../stores/useStore'
import { MessageRenderer } from './MessageRenderer'
import { BookmarkButton } from './BookmarkButton'

interface SessionContentProps {
  session: Session
  projectName: string
  initialSearchQuery?: string
  drawerMode?: boolean
  onClose?: () => void
  onExport?: () => void
  onResume?: () => void
}

export function SessionContent({
  session,
  projectName: _projectName,
  initialSearchQuery = '',
  drawerMode = false,
  onClose,
  onExport,
  onResume,
}: SessionContentProps) {
  const { bookmarks } = useStore()

  // Local search state
  const [localSearchQuery, setLocalSearchQuery] = useState(initialSearchQuery)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sync with initial search query
  useEffect(() => {
    setLocalSearchQuery(initialSearchQuery)
    if (initialSearchQuery) {
      setCurrentMatchIndex(0)
    }
  }, [initialSearchQuery])

  // Search logic
  const matchedMessages = useMemo(() => {
    if (!session?.messages || !localSearchQuery.trim()) return []

    const query = localSearchQuery.toLowerCase()
    return session.messages.filter((message) => {
      const content = typeof message.message?.content === 'string'
        ? message.message.content
        : JSON.stringify(message.message?.content)
      return content.toLowerCase().includes(query)
    })
  }, [session?.messages, localSearchQuery])

  // Auto-scroll to current match
  useEffect(() => {
    if (matchedMessages.length > 0 && currentMatchIndex < matchedMessages.length) {
      const targetMessage = matchedMessages[currentMatchIndex]
      const element = messageRefs.current.get(targetMessage.uuid)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentMatchIndex, matchedMessages])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearchQuery(value)
    setCurrentMatchIndex(0)
  }

  const handleClearSearch = () => {
    setLocalSearchQuery('')
    setCurrentMatchIndex(0)
    searchInputRef.current?.focus()
  }

  const handlePrevMatch = useCallback(() => {
    if (matchedMessages.length === 0) return
    setCurrentMatchIndex((prev) => (prev > 0 ? prev - 1 : matchedMessages.length - 1))
  }, [matchedMessages.length])

  const handleNextMatch = useCallback(() => {
    if (matchedMessages.length === 0) return
    setCurrentMatchIndex((prev) => (prev < matchedMessages.length - 1 ? prev + 1 : 0))
  }, [matchedMessages.length])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if search is active
      if (!localSearchQuery) return

      if (e.key === 'Enter') {
        if (e.shiftKey) {
          handlePrevMatch()
        } else {
          handleNextMatch()
        }
      } else if (e.key === 'Escape') {
        handleClearSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [localSearchQuery, handlePrevMatch, handleNextMatch])

  const isMessageBookmarked = (messageUuid: string) => {
    return bookmarks.some(b => b.messageUuid === messageUuid)
  }

  const displayTitle = session.displayName || session.id

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-claude-200 p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {drawerMode ? (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-claude-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-claude-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-claude-900">{displayTitle}</h1>
                <p className="text-sm text-claude-500">
                  {session.projectName} • {format(new Date(session.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onResume && (
                <button
                  onClick={onResume}
                  className="btn-ghost text-sm"
                  title="Copy resume command"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Resume
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="btn-secondary text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm text-claude-500">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 text-claude-400">#</span>
              {session.messageCount} messages
            </span>
            {session.totalTokens ? (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 text-claude-400">#</span>
                {session.totalTokens.toLocaleString()} tokens
              </span>
            ) : null}
            {session.estimatedCost ? (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 text-claude-400">$</span>
                ${session.estimatedCost.toFixed(4)}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 text-claude-400">⏱</span>
              {format(new Date(session.updatedAt), 'MMM d, HH:mm')}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-claude-50 border-b border-claude-200 px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={localSearchQuery}
                onChange={handleSearchChange}
                placeholder="搜索消息内容... (Enter: 下一个, Shift+Enter: 上一个, Esc: 清除)"
                className="w-full pl-9 pr-8 py-2 text-sm border border-claude-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
              {localSearchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-claude-400 hover:text-claude-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {localSearchQuery && (
              <>
                <span className="text-sm text-claude-500">
                  {matchedMessages.length > 0 ? (
                    <>{currentMatchIndex + 1} / {matchedMessages.length}</>
                  ) : (
                    '无匹配'
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMatch}
                    disabled={matchedMessages.length === 0}
                    className="p-1.5 text-claude-600 hover:bg-claude-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="上一个 (Shift+Enter)"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    disabled={matchedMessages.length === 0}
                    className="p-1.5 text-claude-600 hover:bg-claude-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="下一个 (Enter)"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          {session.messages?.map((message) => {
            const isMatched = matchedMessages.some(m => m.uuid === message.uuid)
            const isCurrentMatch = matchedMessages[currentMatchIndex]?.uuid === message.uuid

            return (
              <MessageItem
                key={message.uuid}
                message={message}
                session={session}
                isMatched={isMatched}
                isCurrentMatch={isCurrentMatch}
                searchQuery={localSearchQuery}
                isBookmarked={isMessageBookmarked(message.uuid)}
                messageRef={(el) => {
                  if (el) messageRefs.current.set(message.uuid, el)
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Message item component
interface MessageItemProps {
  message: Message
  session: Session
  isMatched: boolean
  isCurrentMatch: boolean
  searchQuery: string
  isBookmarked: boolean
  messageRef: (el: HTMLDivElement | null) => void
}

function MessageItem({
  message,
  session,
  isMatched,
  isCurrentMatch,
  searchQuery,
  isBookmarked,
  messageRef,
}: MessageItemProps) {
  return (
    <div
      ref={messageRef}
      className={`card p-4 ${message.type === 'user' ? 'bg-accent/5' : ''} ${
        isCurrentMatch ? 'ring-2 ring-accent ring-offset-2' : ''
      } ${isMatched ? 'border-accent/30' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${
            message.type === 'user' ? 'text-accent' : 'text-claude-700'
          }`}>
            {message.message?.role === 'user' ? 'You' : 'Claude'}
          </span>
          <span className="text-xs text-claude-400">
            {format(new Date(message.timestamp), 'HH:mm:ss')}
          </span>
          {message.message?.model && (
            <span className="text-xs text-claude-400 bg-claude-100 px-2 py-0.5 rounded">
              {message.message.model}
            </span>
          )}
          {isMatched && (
            <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
              匹配
            </span>
          )}
        </div>
        <BookmarkButton
          messageUuid={message.uuid}
          sessionId={session.id}
          projectName={session.projectName}
          isBookmarked={isBookmarked}
        />
      </div>

      <MessageRenderer message={message} searchQuery={searchQuery} />

      {message.toolUse?.name && (
        <div className="mt-2 text-sm text-claude-500 flex items-center gap-1">
          <span className="text-accent">🔧</span> Tool: {message.toolUse.name}
        </div>
      )}

      {message.costUSD && (
        <div className="mt-2 text-xs text-claude-400">
          Cost: ${message.costUSD.toFixed(6)}
        </div>
      )}
    </div>
  )
}
