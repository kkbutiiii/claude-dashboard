import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronRight, Hash, Clock, Filter, X, Calendar, User, ArrowLeft, Download, Terminal } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { MessageRenderer } from './MessageRenderer'
import { BookmarkButton } from './BookmarkButton'
import type { Message } from '../stores/useStore'

interface SearchFilters {
  project: string
  role: string
  dateFrom: string
  dateTo: string
}

interface SearchResult {
  session: {
    id: string
    projectName: string
    messageCount: number
    createdAt: string
    updatedAt: string
    totalTokens: number
    estimatedCost: number
  }
  matchedMessages: Array<{
    uuid: string
    type: string
    timestamp: string
    message?: {
      role: string
      content: string | unknown
    }
  }>
  matchCount: number
}

interface SessionDetail {
  id: string
  projectName: string
  messages: Message[]
  messageCount: number
  createdAt: string
  updatedAt: string
  totalTokens: number
  estimatedCost: number
}

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [projectOptions, setProjectOptions] = useState<string[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [bookmarks, setBookmarks] = useState<Array<{ messageUuid: string }>>([])

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>(({
    project: searchParams.get('project') || '',
    role: searchParams.get('role') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  }))

  // Load bookmarks
  useEffect(() => {
    fetch('/api/bookmarks')
      .then(res => res.json())
      .then(data => setBookmarks(data.bookmarks || []))
      .catch(() => setBookmarks([]))
  }, [isDrawerOpen])

  // Load project options on mount
  useEffect(() => {
    fetch('/api/scanner/projects')
      .then(res => res.json())
      .then(data => {
        if (data.projects) {
          setProjectOptions(data.projects.map((p: { name: string }) => p.name).sort())
        }
      })
      .catch(err => console.error('Failed to load projects:', err))
  }, [])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (filters.project) params.set('project', filters.project)
    else params.delete('project')
    if (filters.role) params.set('role', filters.role)
    else params.delete('role')
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    else params.delete('dateFrom')
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    else params.delete('dateTo')
    setSearchParams(params)
  }, [filters, setSearchParams, searchParams])

  // Check if any filters are active
  const hasActiveFilters = filters.project || filters.role || filters.dateFrom || filters.dateTo

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({ project: '', role: '', dateFrom: '', dateTo: '' })
  }, [])

  // Load session detail
  const loadSession = useCallback(async (projectName: string, sessionId: string) => {
    setIsLoadingSession(true)
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(projectName)}/${encodeURIComponent(sessionId)}`)
      if (!response.ok) throw new Error('Failed to load session')
      const data = await response.json()
      setSelectedSession(data.session)
      setIsDrawerOpen(true)
    } catch (err) {
      console.error('Error loading session:', err)
    } finally {
      setIsLoadingSession(false)
    }
  }, [])

  // Close drawer
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setTimeout(() => setSelectedSession(null), 300) // Clear after animation
  }, [])

  // Search function
  const performSearch = useCallback(async () => {
    if (!query) {
      setResults([])
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsSearching(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('q', query)
      if (filters.project) params.set('project', filters.project)
      if (filters.role) params.set('role', filters.role)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const response = await fetch(`/api/scanner/search?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Search error:', err)
        setError('搜索失败，请稍后重试')
      }
    } finally {
      setIsSearching(false)
    }
  }, [query, filters])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [performSearch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Safe date formatting
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Unknown time'
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (e) {
      return 'Unknown time'
    }
  }

  // Simple text highlight
  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0)
    if (terms.length === 0) return text

    const maxLength = 300
    const displayText = text.length > maxLength ? text.slice(0, maxLength) + '...' : text

    let highlighted = displayText
    terms.forEach(term => {
      const index = highlighted.toLowerCase().indexOf(term.toLowerCase())
      if (index !== -1) {
        const before = highlighted.slice(0, index)
        const match = highlighted.slice(index, index + term.length)
        const after = highlighted.slice(index + term.length)
        highlighted = before + '{{MARK}}' + match + '{{/MARK}}' + after
      }
    })

    const parts = highlighted.split(/(\{\{MARK\}\}|\{\{\/MARK\}\})/)
    let inMark = false

    return parts.map((part, i) => {
      if (part === '{{MARK}}') {
        inMark = true
        return null
      }
      if (part === '{{/MARK}}') {
        inMark = false
        return null
      }
      if (inMark) {
        return <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{part}</mark>
      }
      return <span key={i}>{part}</span>
    }).filter(Boolean)
  }

  const isMessageBookmarked = (messageUuid: string) => {
    return bookmarks.some(b => b.messageUuid === messageUuid)
  }

  const handleExportMarkdown = () => {
    if (!selectedSession) return
    window.open(`/api/sessions/${encodeURIComponent(selectedSession.projectName)}/${encodeURIComponent(selectedSession.id)}/export/markdown`, '_blank')
  }

  const handleCopyResumeCommand = () => {
    if (!selectedSession) return
    const cmd = `claude --resume ${selectedSession.id}`
    navigator.clipboard.writeText(cmd)
    alert(`已复制: ${cmd}`)
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-accent hover:underline"
          >
            刷新页面
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto scrollbar p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-claude-900">
            {query ? `"${query}" 的搜索结果` : '搜索'}
          </h1>
        </div>

        {/* Search Filters */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasActiveFilters
                ? 'bg-accent text-white'
                : 'bg-claude-100 text-claude-700 hover:bg-claude-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
            {hasActiveFilters && (
              <span className="bg-white text-accent text-xs px-2 py-0.5 rounded-full">
                已启用
              </span>
            )}
          </button>

          {showFilters && (
            <div className="mt-4 bg-claude-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project Filter */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-claude-700 mb-2">
                    <Hash className="w-4 h-4" />
                    项目
                  </label>
                  <select
                    value={filters.project}
                    onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full px-3 py-2 border border-claude-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    <option value="">所有项目</option>
                    {projectOptions.map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                </div>

                {/* Role Filter */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-claude-700 mb-2">
                    <User className="w-4 h-4" />
                    角色
                  </label>
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-claude-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    <option value="">所有角色</option>
                    <option value="user">user</option>
                    <option value="assistant">assistant</option>
                    <option value="system">system</option>
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-claude-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-claude-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-claude-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-claude-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-sm text-claude-500 hover:text-claude-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  清除所有筛选
                </button>
              )}
            </div>
          )}
        </div>

        {isSearching ? (
          <div className="text-center py-12 text-claude-500">搜索中...</div>
        ) : !query ? (
          <div className="text-center py-12">
            <p className="text-claude-500 text-lg">输入关键词开始搜索</p>
            <p className="text-claude-400 mt-2">支持搜索消息内容、代码等</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-claude-500 text-lg">未找到结果</p>
            <p className="text-claude-400 mt-2">
              {hasActiveFilters ? '尝试调整筛选条件' : '尝试其他搜索词'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-claude-500 mb-4">
              找到 {results.length} 个相关会话
              {hasActiveFilters && ' (已应用筛选)'}
            </p>

            {results.map(({ session, matchedMessages, matchCount }) => (
              <div
                key={session.id}
                className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => loadSession(session.projectName, session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-claude-900 truncate">{session.id}</h3>
                      <span className="text-xs text-claude-500 whitespace-nowrap">in {session.projectName}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-claude-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Hash className="w-4 h-4" />
                        {matchCount} 个匹配
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(session.updatedAt)}
                      </span>
                    </div>

                    {/* Preview of matched messages with highlighted terms */}
                    <div className="space-y-2">
                      {matchedMessages.slice(0, 2).map((message) => {
                        const content = typeof message.message?.content === 'string'
                          ? message.message.content
                          : '[复杂内容]'

                        return (
                          <div key={message.uuid} className="text-sm text-claude-600 bg-claude-50 p-2 rounded">
                            <span className="font-medium text-claude-800">{message.message?.role}:</span>
                            {' '}
                            <span className="line-clamp-2">
                              {highlightText(content.slice(0, 200), query)}
                              {content.length >= 200 && '...'}
                            </span>
                          </div>
                        )
                      })}
                      {matchedMessages.length > 2 && (
                        <p className="text-xs text-claude-400">
                          + {matchedMessages.length - 2} 更多匹配
                        </p>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-claude-400 flex-shrink-0 ml-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-4xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {isLoadingSession ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-claude-500">加载中...</div>
          </div>
        ) : selectedSession ? (
          <div className="h-full flex flex-col">
            {/* Drawer Header */}
            <div className="bg-white border-b border-claude-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={closeDrawer}
                  className="p-2 hover:bg-claude-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-claude-900">{selectedSession.id}</h1>
                  <p className="text-sm text-claude-500">
                    {selectedSession.projectName} • {format(new Date(selectedSession.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyResumeCommand}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-claude-600 hover:bg-claude-100 rounded-lg transition-colors"
                >
                  <Terminal className="w-4 h-4" />
                  恢复会话
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-claude-600 hover:bg-claude-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              </div>
            </div>

            {/* Session Stats */}
            <div className="bg-claude-50 px-4 py-2 border-b border-claude-200">
              <div className="flex items-center gap-6 text-sm text-claude-500">
                <span className="flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  {selectedSession.messageCount} 条消息
                </span>
                {selectedSession.totalTokens > 0 && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    {selectedSession.totalTokens.toLocaleString()} tokens
                  </span>
                )}
                {selectedSession.estimatedCost > 0 && (
                  <span className="flex items-center gap-1">
                    ${selectedSession.estimatedCost.toFixed(4)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(selectedSession.updatedAt), 'MMM d, HH:mm')}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar p-4">
              <div className="space-y-4">
                {selectedSession.messages?.map((message) => (
                  <div
                    key={message.uuid}
                    className={`card p-4 ${message.type === 'user' ? 'bg-accent/5' : ''}`}
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
                      </div>
                      <BookmarkButton
                        messageUuid={message.uuid}
                        sessionId={selectedSession.id}
                        projectName={selectedSession.projectName}
                        isBookmarked={isMessageBookmarked(message.uuid)}
                      />
                    </div>

                    <MessageRenderer message={message} searchQuery={query} />

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
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
