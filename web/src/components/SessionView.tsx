import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Clock, Hash, DollarSign, Terminal } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../stores/useStore'
import { MessageRenderer } from './MessageRenderer'
import { BookmarkButton } from './BookmarkButton'

export function SessionView() {
  const { projectName: encodedProjectName, sessionId: encodedSessionId } = useParams()
  const navigate = useNavigate()
  const { selectedSession, setSelectedSession, bookmarks } = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Decode URL parameters (handle double encoding)
  const projectName = encodedProjectName ? decodeURIComponent(encodedProjectName) : null
  const sessionId = encodedSessionId ? decodeURIComponent(encodedSessionId) : null

  useEffect(() => {
    if (projectName && sessionId) {
      loadSession(projectName, sessionId)
    }
  }, [projectName, sessionId])

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
                <h1 className="text-xl font-bold text-claude-900">{selectedSession.id}</h1>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar p-4">
        <div className="max-w-5xl mx-auto space-y-4">
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

              <MessageRenderer message={message} />

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
  )
}
