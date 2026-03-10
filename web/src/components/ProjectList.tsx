import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, MessageSquare, Hash, DollarSign, Clock, ChevronRight, Terminal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useStore, type Session } from '../stores/useStore'
import { SessionTagManager } from './SessionTagManager'

export function ProjectList() {
  const { projectName: encodedProjectName } = useParams()
  const navigate = useNavigate()
  const { projects, selectedProject, setSelectedProject, tags, sessionTags } = useStore()
  const [projectSessions, setProjectSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Decode URL parameter (handle double encoding)
  const projectName = encodedProjectName ? decodeURIComponent(encodedProjectName) : null

  useEffect(() => {
    if (projectName) {
      setSelectedProject(projectName)
      loadProjectSessions(projectName)
    }
  }, [projectName, setSelectedProject])

  const loadProjectSessions = async (name: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/scanner/projects/${encodeURIComponent(name)}`)
      const data = await response.json()
      if (data.project) {
        setProjectSessions(data.project.sessions || [])
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionClick = (session: Session) => {
    // Use double encoding to handle special characters in project names
    const encodedProject = encodeURIComponent(encodeURIComponent(session.projectName))
    const encodedSession = encodeURIComponent(session.id)
    navigate(`/session/${encodedProject}/${encodedSession}`)
  }

  const handleResumeSession = (sessionId: string) => {
    const resumeCommand = `claude --resume ${sessionId}`
    navigator.clipboard.writeText(resumeCommand)
    alert(`Resume command copied to clipboard: ${resumeCommand}`)
  }

  const getSessionTagsList = (sessionId: string) => {
    const tagIds = sessionTags[sessionId] || []
    return tags.filter(tag => tagIds.includes(tag.id))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-claude-500">Loading sessions...</div>
      </div>
    )
  }

  if (selectedProject && projectSessions.length > 0) {
    return (
      <div className="h-full overflow-y-auto scrollbar p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-claude-900">{selectedProject}</h1>
              <p className="text-claude-500 mt-1">{projectSessions.length} sessions</p>
            </div>
          </div>

          <div className="space-y-3">
            {projectSessions.map(session => (
              <div
                key={session.id}
                className="card p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleSessionClick(session)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-claude-900 truncate">{session.id}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResumeSession(session.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 bg-claude-100 hover:bg-claude-200 rounded text-xs text-claude-600 transition-opacity"
                      >
                        <Terminal className="w-3 h-3" />
                        Copy resume cmd
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {getSessionTagsList(session.id).map(tag => (
                        <span
                          key={tag.id}
                          className="badge text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-claude-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {session.messageCount} messages
                      </span>
                      {session.totalTokens && (
                        <span className="flex items-center gap-1">
                          <Hash className="w-4 h-4" />
                          {session.totalTokens.toLocaleString()} tokens
                        </span>
                      )}
                      {session.estimatedCost && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${session.estimatedCost.toFixed(4)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <SessionTagManager sessionId={session.id} />
                    <ChevronRight className="w-5 h-5 text-claude-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show all projects overview
  return (
    <div className="h-full overflow-y-auto scrollbar p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-claude-900 mb-6">All Projects</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <div
              key={project.name}
              onClick={() => navigate(`/project/${encodeURIComponent(encodeURIComponent(project.name))}`)}
              className="card p-5 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-claude-900 text-lg group-hover:text-accent transition-colors">
                  {project.name}
                </h3>
                <span className="badge bg-claude-100 text-claude-600">
                  {project.sessionCount}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-claude-500">
                <Calendar className="w-4 h-4" />
                Last updated {formatDistanceToNow(new Date(project.lastUpdated), { addSuffix: true })}
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-claude-400 text-lg mb-2">No projects found</div>
            <p className="text-claude-500">
              Make sure Claude Code is installed and has conversation history at ~/.claude/projects
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
