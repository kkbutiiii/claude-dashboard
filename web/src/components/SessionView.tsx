import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, Clock, Hash, DollarSign, Terminal, Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../stores/useStore'
import { MessageRenderer } from './MessageRenderer'
import { BookmarkButton } from './BookmarkButton'

export function SessionView() {
  const { projectName: encodedProjectName, sessionId: encodedSessionId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedSession, setSelectedSession, bookmarks } = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Decode URL parameters (handle double encoding)
  const projectName = encodedProjectName ? decodeURIComponent(encodedProjectName) : null
  const sessionId = encodedSessionId ? decodeURIComponent(encodedSessionId) : null

  // Get search query from URL for highlighting
  const urlSearchQuery = searchParams.get('q') || ''

  // Local search state
  const [localSearchQuery, setLocalSearchQuery] = useState(urlSearchQuery)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (projectName && sessionId) {
      loadSession(projectName, sessionId)
    }
  }, [projectName, sessionId])

  // Sync local search with URL query
  useEffect(() => {
    setLocalSearchQuery(urlSearchQuery)
    if (urlSearchQuery) {
      setCurrentMatchIndex(0)
    }
  }, [urlSearchQuery])

  const loadSession = async (pName: string, sId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(pName)}/${encodeURIComponent(sId)}`)
      if (!response.ok) throw new Error('Failed to load session')
      const data = await response.json()
      setSelectedSession(data.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Search logic
  const matchedMessages = useMemo(() => {
    if (!selectedSession?.messages || !localSearchQuery.trim()) return []

    const query = localSearchQuery.toLowerCase()
    return selectedSession.messages.filter((message) => {
      const content = typeof message.message?.content === 'string'
        ? message.message.content
        : JSON.stringify(message.message?.content)
      return content.toLowerCase().includes(query)
    })
  }, [selectedSession?.messages, localSearchQuery])

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

    // Update URL
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set('q', value)
    } else {
      newParams.delete('q')
    }
    setSearchParams(newParams, { replace: true })
  }

  const handleClearSearch = () => {
    setLocalSearchQuery('')
    setCurrentMatchIndex(0)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('q')
    setSearchParams(newParams, { replace: true })
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

  const handleExportMarkdown = () => {
    if (!projectName || !sessionId) return
    window.open(`/api/sessions/${encodeURIComponent(projectName)}/${encodeURIComponent(sessionId)}/export/markdown`, '_blank')
  }

  const handleCopyResumeCommand = () => {
    if (!sessionId) return
    const cmd = `claude --resume ${sessionId}`
    navigator.clipboard.writeText(cmd)
    alert(`Copied: ${cmd}`)
  }

  const isMessageBookmarked = (messageUuid: string) => {
    return bookmarks.some(b => b.messageUuid === messageUuid)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-claude-500">Loading session...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <p>Error: {error}</p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-4">
          Go Back
        </button>
      </div>
    )
  }

  if (!selectedSession) {
    return (
      <div className="flex items-center justify-center h-full text-claude-500">
        Session not found
      </div>
    )
  }

  const displayTitle = selectedSession.displayName || selectedSession.id

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-claude-200 p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-claude-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-claude-900">{displayTitle}</h1>
                <p className="text-sm text-claude-500">
                  {selectedSession.projectName} • {format(new Date(selectedSession.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyResumeCommand}
                className="btn-ghost text-sm"
                title="Copy resume command"
              >
                <Terminal className="w-4 h-4 mr-2" />
                Resume
              </button>
              <button
                onClick={handleExportMarkdown}
                className="btn-secondary text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm text-claude-500">
            <span className="flex items-center gap-1">
              <Hash className="w-4 h-4" />
              {selectedSession.messageCount} messages
            </span>
            {selectedSession.totalTokens && (
              <span className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                {selectedSession.totalTokens.toLocaleString()} tokens
              </span>
            )}
            {selectedSession.estimatedCost && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ${selectedSession.estimatedCost.toFixed(4)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(selectedSession.updatedAt), 'MMM d, HH:mm')}
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
          {selectedSession.messages?.map((message, index) => {
            const isMatched = matchedMessages.some(m => m.uuid === message.uuid)
            const isCurrentMatch = matchedMessages[currentMatchIndex]?.uuid === message.uuid

            return (
              <div
                key={message.uuid}
                ref={(el) => {
                  if (el) messageRefs.current.set(message.uuid, el)
                }}
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
                    sessionId={selectedSession.id}
                    projectName={selectedSession.projectName}
                    isBookmarked={isMessageBookmarked(message.uuid)}
                  />
                </div>

                <MessageRenderer message={message} searchQuery={localSearchQuery} />

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
          })}
        </div>
      </div>
    </div>
  )
}
