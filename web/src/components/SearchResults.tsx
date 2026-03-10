import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronRight, Hash, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useStore } from '../stores/useStore'

// FlexSearch import handling for different module formats
import FlexSearch from 'flexsearch'
const Document = (FlexSearch as any).Document || (FlexSearch as any).default?.Document || (FlexSearch as any)

export function SearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { projects } = useStore()
  const [results, setResults] = useState<Array<{
    session: any
    matchedMessages: any[]
    matchCount: number
  }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build search index
  const searchIndex = useMemo(() => {
    try {
      if (!Document || typeof Document !== 'function') {
        console.error('FlexSearch Document is not available')
        return null
      }

      const index = new Document({
        tokenize: 'forward',
        document: {
          id: 'uuid',
          index: ['content'],
          store: ['sessionId', 'projectName', 'timestamp']
        }
      })

      // Add all messages to index
      projects.forEach(project => {
        project.sessions?.forEach(session => {
          session.messages?.forEach((message: any) => {
            const content = typeof message.message?.content === 'string'
              ? message.message.content
              : JSON.stringify(message.message?.content)

            if (content && message.uuid) {
              try {
                index.add({
                  uuid: message.uuid,
                  content: content.toLowerCase(),
                  sessionId: session.id,
                  projectName: project.name,
                  timestamp: message.timestamp
                })
              } catch (e) {
                console.warn('Failed to add message to index:', e)
              }
            }
          })
        })
      })

      return index
    } catch (e) {
      console.error('Failed to create search index:', e)
      return null
    }
  }, [projects])

  useEffect(() => {
    setError(null)

    if (!query || !searchIndex) {
      setResults([])
      return
    }

    setIsSearching(true)

    try {
      // Search
      const searchResults = searchIndex.search(query.toLowerCase(), {
        limit: 100,
        enrich: true
      })

      // Group by session
      const sessionMatches = new Map()

      searchResults.forEach((fieldResult: any) => {
        if (!fieldResult?.result) return

        fieldResult.result.forEach((match: any) => {
          if (!match?.doc) return

          const { sessionId, projectName } = match.doc
          if (!sessionId || !projectName) return

          const key = `${projectName}/${sessionId}`

          if (!sessionMatches.has(key)) {
            const project = projects.find(p => p.name === projectName)
            const session = project?.sessions?.find((s: any) => s.id === sessionId)

            if (session) {
              sessionMatches.set(key, {
                session,
                matchedMessages: [],
                matchCount: 0
              })
            }
          }

          const entry = sessionMatches.get(key)
          if (entry) {
            entry.matchCount++
            // Find full message
            const message = entry.session.messages?.find((m: any) => m.uuid === match.id)
            if (message && !entry.matchedMessages.some((m: any) => m.uuid === message.uuid)) {
              entry.matchedMessages.push(message)
            }
          }
        })
      })

      setResults(Array.from(sessionMatches.values()).sort((a, b) => b.matchCount - a.matchCount))
    } catch (e) {
      console.error('Search error:', e)
      setError('搜索时出错，请稍后重试')
    } finally {
      setIsSearching(false)
    }
  }, [query, searchIndex, projects])

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
            &quot;{query}&quot; 的搜索结果
          </h1>
        </div>

        {isSearching ? (
          <div className="text-center py-12 text-claude-500">搜索中...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-claude-500 text-lg">未找到结果</p>
            <p className="text-claude-400 mt-2">尝试其他搜索词</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-claude-500 mb-4">找到 {results.length} 个相关会话</p>

            {results.map(({ session, matchedMessages, matchCount }) => (
              <div
                key={session.id}
                className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/session/${encodeURIComponent(encodeURIComponent(session.projectName))}/${encodeURIComponent(session.id)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-claude-900">{session.id}</h3>
                      <span className="text-xs text-claude-500">in {session.projectName}</span>
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

                    {/* Preview of matched messages */}
                    <div className="space-y-2">
                      {matchedMessages.slice(0, 2).map((message: any) => {
                        const content = typeof message.message?.content === 'string'
                          ? message.message.content.slice(0, 150)
                          : '[复杂内容]'

                        return (
                          <div key={message.uuid} className="text-sm text-claude-600 bg-claude-50 p-2 rounded">
                            <span className="font-medium text-claude-800">{message.message?.role}:</span>
                            {' '}{content}{content.length >= 150 && '...'}
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

                  <ChevronRight className="w-5 h-5 text-claude-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
