import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../stores/useStore'
import { SessionContent } from './SessionContent'

export function SessionView() {
  const { projectName: encodedProjectName, sessionId: encodedSessionId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedSession, setSelectedSession } = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Decode URL parameters (handle double encoding)
  const projectName = encodedProjectName ? decodeURIComponent(encodedProjectName) : null
  const sessionId = encodedSessionId ? decodeURIComponent(encodedSessionId) : null

  // Get search query from URL for highlighting
  const urlSearchQuery = searchParams.get('q') || ''

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

  const handleExport = () => {
    if (!projectName || !sessionId) return
    window.open(`/api/sessions/${encodeURIComponent(projectName)}/${encodeURIComponent(sessionId)}/export/markdown`, '_blank')
  }

  const handleResume = () => {
    if (!sessionId) return
    const cmd = `claude --resume ${sessionId}`
    navigator.clipboard.writeText(cmd)
    alert(`Copied: ${cmd}`)
  }

  const handleClose = () => {
    navigate(-1)
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

  if (!selectedSession || !projectName) {
    return (
      <div className="flex items-center justify-center h-full text-claude-500">
        Session not found
      </div>
    )
  }

  return (
    <SessionContent
      session={selectedSession}
      projectName={projectName}
      initialSearchQuery={urlSearchQuery}
      drawerMode={false}
      onClose={handleClose}
      onExport={handleExport}
      onResume={handleResume}
    />
  )
}
