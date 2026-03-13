import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar,
  MessageSquare,
  Hash,
  DollarSign,
  Clock,
  ChevronRight,
  Terminal,
  FolderOpen,
  FileText,
  Edit2,
  Save,
  X,
  ArrowLeft,
  Folder,
  Image,
  Type,
  GitBranch,
  GitCommit,
  ChevronDown,
  ChevronUp,
  User,
  Plus,
  Minus,
  Search,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useStore, type Session } from '../stores/useStore'
import { SessionTagManager } from './SessionTagManager'
import { SessionContent } from './SessionContent'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ProjectInfo {
  name: string
  displayName: string
  path: string
  sourcePath?: string  // Actual project source code path (from session cwd)
  sessionCount: number
  lastUpdated: string
  description: string
  avatar?: string
  markdownFiles: Array<{
    name: string
    path: string
    relativePath: string
  }>
}

interface MarkdownFile {
  name: string
  relativePath: string
  content: string
}

interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
  shortHash: string
  filesChanged?: number
  insertions?: number
  deletions?: number
}

interface GitHistory {
  isGitRepo: boolean
  branch?: string
  commits: GitCommit[]
  totalCommits?: number
  error?: string
}

// Generate avatar color based on project name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    'bg-rose-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Get initials from project name
function getInitials(name: string): string {
  return name
    .split(/[-_\s]/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Get display name from project - extract from project folder name
function getProjectDisplayName(project: { name: string; displayName?: string; sourcePath?: string }): string {
  // Extract project name from storage folder name
  // Handle format like "C--Users-11639-Documents-trae-projects-ClaudeDashboard"
  // or "C--Users-11639-Documents-trae-projects-20260310-Claude-Dashboard"
  let name = project.name

  // Remove C-- prefix if present
  if (name.startsWith('C--')) {
    name = name.substring(3)
  }

  // The format is: Users-11639-Documents-trae-projects-PROJECT_NAME
  // We need to extract the project name after "trae-projects-"
  const traefikIndex = name.indexOf('trae-projects-')
  if (traefikIndex !== -1) {
    return name.substring(traefikIndex + 'trae-projects-'.length)
  }

  // Fallback: try to find the last meaningful segment
  // If it's something like "Users-11639--claude-skills", return the part after "Users-11639--"
  const userPrefixIndex = name.indexOf('Users-11639--')
  if (userPrefixIndex !== -1) {
    return name.substring(userPrefixIndex + 'Users-11639--'.length)
  }

  return name
}

// Code block component for markdown
function CodeBlock({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''

  if (inline) {
    return (
      <code className="bg-claude-100 text-claude-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  }

  return (
    <SyntaxHighlighter
      language={language || 'text'}
      style={oneDark}
      customStyle={{
        margin: '0.5rem 0',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
      }}
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  )
}

// GitInfo component
function GitInfo({
  gitHistory,
  isExpanded,
  onToggle,
  isLoading,
}: {
  gitHistory: GitHistory | null
  isExpanded: boolean
  onToggle: () => void
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="card p-4 mt-4">
        <div className="flex items-center gap-2 text-claude-500">
          <div className="w-4 h-4 border-2 border-claude-300 border-t-accent rounded-full animate-spin" />
          Loading git history...
        </div>
      </div>
    )
  }

  if (!gitHistory || !gitHistory.isGitRepo) {
    return null
  }

  if (gitHistory.error) {
    return (
      <div className="card p-4 mt-4">
        <div className="flex items-center gap-2 text-claude-500">
          <GitBranch className="w-4 h-4" />
          <span>Git repository (unable to load history)</span>
        </div>
      </div>
    )
  }

  const { branch, commits, totalCommits } = gitHistory

  return (
    <div className="card mt-4 overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-claude-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 bg-git-bg rounded text-git-text text-sm font-medium">
            <GitBranch className="w-4 h-4" />
            {branch || 'main'}
          </div>
          <span className="text-sm text-claude-600">
            {totalCommits?.toLocaleString() || commits.length} commits
          </span>
        </div>
        <div className="flex items-center gap-2 text-claude-400">
          <span className="text-sm">{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-claude-200">
          <div className="max-h-96 overflow-y-auto">
            {commits.map((commit, index) => (
              <div
                key={commit.hash}
                className={`p-4 ${index !== commits.length - 1 ? 'border-b border-claude-100' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-git-bg flex items-center justify-center">
                      <GitCommit className="w-4 h-4 text-git-text" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-claude-900 break-words">
                      {commit.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-claude-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {commit.author}
                      </span>
                      <span className="font-mono text-claude-400">
                        {commit.shortHash || commit.hash.substring(0, 7)}
                      </span>
                      <span>{new Date(commit.date).toLocaleDateString()}</span>
                    </div>
                    {(commit.filesChanged !== undefined ||
                      commit.insertions !== undefined ||
                      commit.deletions !== undefined) && (
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {commit.filesChanged !== undefined && (
                          <span className="text-claude-500">
                            {commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}
                          </span>
                        )}
                        {commit.insertions !== undefined && (
                          <span className="flex items-center gap-0.5 text-green-600">
                            <Plus className="w-3 h-3" />
                            {commit.insertions}
                          </span>
                        )}
                        {commit.deletions !== undefined && (
                          <span className="flex items-center gap-0.5 text-red-600">
                            <Minus className="w-3 h-3" />
                            {commit.deletions}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {commits.length >= 20 && (
            <div className="p-3 text-center text-xs text-claude-400 border-t border-claude-100">
              Showing last 20 commits
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ProjectList() {
  const { projectName: encodedProjectName } = useParams()
  const navigate = useNavigate()
  const { projects, selectedProject, setSelectedProject, tags, sessionTags } = useStore()
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [projectSessions, setProjectSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Drawer state for markdown files
  const [isMarkdownDrawerOpen, setIsMarkdownDrawerOpen] = useState(false)
  const [selectedMarkdownFile, setSelectedMarkdownFile] = useState<MarkdownFile | null>(null)
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(false)

  // Edit states
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [isSavingDescription, setIsSavingDescription] = useState(false)

  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false)
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false)

  // Avatar upload
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Git history
  const [gitHistory, setGitHistory] = useState<GitHistory | null>(null)
  const [isGitExpanded, setIsGitExpanded] = useState(false)
  const [isLoadingGit, setIsLoadingGit] = useState(false)

  // Session drawer
  const [isSessionDrawerOpen, setIsSessionDrawerOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)

  // Session search within project
  const [sessionSearchQuery, setSessionSearchQuery] = useState('')

  // Session display name editing
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editSessionName, setEditSessionName] = useState('')
  const [isSavingSessionName, setIsSavingSessionName] = useState(false)

  // Decode URL parameter
  const projectName = encodedProjectName ? decodeURIComponent(encodedProjectName) : null

  useEffect(() => {
    if (projectName) {
      setSelectedProject(projectName)
      loadProjectData(projectName)
      loadGitHistory(projectName)
    }
  }, [projectName, setSelectedProject])

  const loadProjectData = async (name: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/scanner/projects/${encodeURIComponent(name)}`)
      const data = await response.json()
      if (data.project) {
        setProjectInfo({
          name: data.project.name,
          displayName: data.project.displayName || data.project.name,
          path: data.project.path,
          sourcePath: data.project.sourcePath,
          sessionCount: data.project.sessionCount,
          lastUpdated: data.project.lastUpdated,
          description: data.project.description || '',
          avatar: data.project.avatar,
          markdownFiles: data.project.markdownFiles || [],
        })
        setProjectSessions(data.project.sessions || [])
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadGitHistory = async (name: string) => {
    setIsLoadingGit(true)
    try {
      const response = await fetch(`/api/scanner/projects/${encodeURIComponent(name)}/git-history?limit=20`)
      const data = await response.json()
      setGitHistory(data)
    } catch (error) {
      console.error('Failed to load git history:', error)
      setGitHistory({ isGitRepo: false, commits: [], error: 'Failed to load git history' })
    } finally {
      setIsLoadingGit(false)
    }
  }

  const handleSessionClick = (session: Session) => {
    setIsSessionDrawerOpen(true)
    loadSession(session.projectName, session.id)
  }

  const loadSession = async (projectName: string, sessionId: string) => {
    setIsLoadingSession(true)
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(projectName)}/${encodeURIComponent(sessionId)}`)
      if (!response.ok) throw new Error('Failed to load session')
      const data = await response.json()
      setSelectedSession(data.session)
    } catch (error) {
      console.error('Failed to load session:', error)
    } finally {
      setIsLoadingSession(false)
    }
  }

  const closeSessionDrawer = () => {
    setIsSessionDrawerOpen(false)
    setTimeout(() => setSelectedSession(null), 300)
  }

  const handleResumeSession = (sessionId: string) => {
    const resumeCommand = `claude --resume ${sessionId}`
    navigator.clipboard.writeText(resumeCommand)
    alert(`Resume command copied to clipboard: ${resumeCommand}`)
  }

  // Session display name editing handlers
  const handleStartEditSessionName = (session: Session) => {
    setEditingSessionId(session.id)
    setEditSessionName(session.displayName || '')
  }

  const handleCancelEditSessionName = () => {
    setEditingSessionId(null)
    setEditSessionName('')
  }

  const handleSaveSessionName = async (session: Session) => {
    const trimmedName = editSessionName.trim()
    if (!trimmedName || trimmedName === session.displayName) {
      handleCancelEditSessionName()
      return
    }

    setIsSavingSessionName(true)
    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(session.projectName)}/${encodeURIComponent(session.id)}/display-name`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: trimmedName }),
        }
      )

      if (response.ok) {
        // Update local state
        setProjectSessions((prev) =>
          prev.map((s) =>
            s.id === session.id ? { ...s, displayName: trimmedName } : s
          )
        )
        // Also update selected session if open
        if (selectedSession?.id === session.id) {
          setSelectedSession({ ...selectedSession, displayName: trimmedName })
        }
        handleCancelEditSessionName()
      } else {
        console.error('Failed to save session display name')
        alert('保存失败，请重试')
      }
    } catch (error) {
      console.error('Error saving session display name:', error)
      alert('保存失败，请重试')
    } finally {
      setIsSavingSessionName(false)
    }
  }

  const getSessionTagsList = (sessionId: string) => {
    const tagIds = sessionTags[sessionId] || []
    return tags.filter((tag) => tagIds.includes(tag.id))
  }

  // Open folder via backend API
  const handleOpenFolder = async () => {
    if (!projectName) return
    try {
      const response = await fetch(`/api/scanner/projects/${encodeURIComponent(projectName)}/open-folder`, {
        method: 'POST',
      })
      if (!response.ok) {
        alert('Failed to open folder')
      }
    } catch (error) {
      console.error('Error opening folder:', error)
      alert('Failed to open folder')
    }
  }

  // Load markdown file content
  const loadMarkdownFile = useCallback(async (relativePath: string) => {
    if (!projectName) return

    setIsLoadingMarkdown(true)
    try {
      const response = await fetch(
        `/api/scanner/projects/${encodeURIComponent(projectName)}/markdown?path=${encodeURIComponent(relativePath)}`
      )
      const data = await response.json()
      if (data.content !== undefined) {
        setSelectedMarkdownFile({
          name: relativePath.split('/').pop() || relativePath,
          relativePath,
          content: data.content,
        })
      }
    } catch (error) {
      console.error('Failed to load markdown:', error)
    } finally {
      setIsLoadingMarkdown(false)
    }
  }, [projectName])

  // Open markdown drawer
  const openMarkdownDrawer = (file: { name: string; relativePath: string }) => {
    setIsMarkdownDrawerOpen(true)
    loadMarkdownFile(file.relativePath)
  }

  // Close markdown drawer
  const closeMarkdownDrawer = () => {
    setIsMarkdownDrawerOpen(false)
    setTimeout(() => setSelectedMarkdownFile(null), 300)
  }

  // Description editing
  const startEditDescription = () => {
    setDescriptionDraft(projectInfo?.description || '')
    setIsEditingDescription(true)
  }

  const saveDescription = async () => {
    if (!projectName) return

    setIsSavingDescription(true)
    try {
      const response = await fetch(`/api/scanner/projects/${encodeURIComponent(projectName)}/description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descriptionDraft }),
      })

      if (response.ok) {
        setProjectInfo((prev) => (prev ? { ...prev, description: descriptionDraft } : null))
        setIsEditingDescription(false)
      } else {
        alert('Failed to save description')
      }
    } catch (error) {
      console.error('Error saving description:', error)
      alert('Failed to save description')
    } finally {
      setIsSavingDescription(false)
    }
  }

  const cancelEditDescription = () => {
    setIsEditingDescription(false)
    setDescriptionDraft('')
  }

  // Display name editing
  const startEditDisplayName = () => {
    setDisplayNameDraft(projectInfo?.displayName || '')
    setIsEditingDisplayName(true)
  }

  const saveDisplayName = async () => {
    if (!projectName) return

    setIsSavingDisplayName(true)
    try {
      const response = await fetch(`/api/scanner/projects/${encodeURIComponent(projectName)}/display-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayNameDraft }),
      })

      if (response.ok) {
        setProjectInfo((prev) => (prev ? { ...prev, displayName: displayNameDraft } : null))
        setIsEditingDisplayName(false)
      } else {
        alert('Failed to save display name')
      }
    } catch (error) {
      console.error('Error saving display name:', error)
      alert('Failed to save display name')
    } finally {
      setIsSavingDisplayName(false)
    }
  }

  const cancelEditDisplayName = () => {
    setIsEditingDisplayName(false)
    setDisplayNameDraft('')
  }

  // Avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !projectName) return

    setIsUploadingAvatar(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        if (base64) {
          const response = await fetch(`/api/scanner/projects/${encodeURIComponent(projectName)}/avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: base64 }),
          })

          if (response.ok) {
            setProjectInfo((prev) => (prev ? { ...prev, avatar: base64 } : null))
          } else {
            alert('Failed to upload avatar')
          }
        }
        setIsUploadingAvatar(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar')
      setIsUploadingAvatar(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-claude-500">Loading project...</div>
      </div>
    )
  }

  // Show project sessions view
  if (selectedProject && projectInfo) {
    return (
      <div className="h-full overflow-y-auto scrollbar p-6">
        <div className="max-w-none">
          {/* Project Header Card */}
          <div className="card p-6 mb-6">
            <div className="flex items-start gap-4">
              {/* Project Avatar - Clickable for upload */}
              <div
                onClick={handleAvatarClick}
                className={`relative w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 cursor-pointer overflow-hidden group ${
                  projectInfo.avatar ? '' : getAvatarColor(projectInfo.name)
                }`}
              >
                {projectInfo.avatar ? (
                  <img src={projectInfo.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(getProjectDisplayName(projectInfo))
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Image className="w-6 h-6" />
                </div>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />

              <div className="flex-1 min-w-0">
                {/* Project Display Name - Editable */}
                {isEditingDisplayName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={displayNameDraft}
                      onChange={(e) => setDisplayNameDraft(e.target.value)}
                      placeholder="Enter display name..."
                      className="flex-1 px-3 py-2 border border-claude-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-xl font-bold"
                      autoFocus
                    />
                    <button
                      onClick={saveDisplayName}
                      disabled={isSavingDisplayName}
                      className="flex items-center gap-1 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEditDisplayName}
                      className="flex items-center gap-1 px-3 py-2 bg-claude-100 text-claude-600 rounded-lg hover:bg-claude-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2 group">
                    <h1 className="text-2xl font-bold text-claude-900">{getProjectDisplayName(projectInfo)}</h1>
                    <button
                      onClick={startEditDisplayName}
                      className="opacity-0 group-hover:opacity-100 p-1 text-claude-400 hover:text-accent transition-opacity"
                    >
                      <Type className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Storage Path (shown when different from display) */}
                {(() => {
                  const displayName = getProjectDisplayName(projectInfo)
                  const storagePath = projectInfo.name
                  // Only show storage path if display name is different from storage path
                  if (displayName !== storagePath) {
                    return <p className="text-xs text-claude-400 mb-2">Storage: {storagePath}</p>
                  }
                  return null
                })()}

                {/* Project Path with Open Folder Button */}
                <div className="flex items-center gap-2 text-sm text-claude-500 mb-3">
                  <Folder className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate" title={projectInfo.sourcePath || projectInfo.path}>
                    {projectInfo.sourcePath || projectInfo.path}
                  </span>
                  <button
                    onClick={handleOpenFolder}
                    className="flex items-center gap-1 px-2 py-1 bg-claude-100 hover:bg-claude-200 rounded text-claude-600 transition-colors flex-shrink-0"
                    title="Open in file explorer"
                  >
                    <FolderOpen className="w-3 h-3" />
                    Open
                  </button>
                </div>

                {/* Project Description (Editable) */}
                <div className="mb-3">
                  {isEditingDescription ? (
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        placeholder="Enter project description..."
                        className="flex-1 px-3 py-2 border border-claude-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm"
                        autoFocus
                      />
                      <button
                        onClick={saveDescription}
                        disabled={isSavingDescription}
                        className="flex items-center gap-1 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {isSavingDescription ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditDescription}
                        className="flex items-center gap-1 px-3 py-2 bg-claude-100 text-claude-600 rounded-lg hover:bg-claude-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <p className="text-claude-600 text-sm">
                        {projectInfo.description || 'No description'}
                      </p>
                      <button
                        onClick={startEditDescription}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-claude-500 hover:text-accent transition-opacity"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Stats */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-claude-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {projectInfo.sessionCount} sessions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Updated {formatDistanceToNow(new Date(projectInfo.lastUpdated), { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(projectInfo.lastUpdated), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>

                {/* Markdown Files */}
                {projectInfo.markdownFiles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-claude-200">
                    <h3 className="text-sm font-medium text-claude-700 mb-2 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Documentation ({projectInfo.markdownFiles.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {projectInfo.markdownFiles.slice(0, 5).map((file) => (
                        <button
                          key={file.relativePath}
                          onClick={() => openMarkdownDrawer(file)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-claude-50 hover:bg-claude-100 rounded-lg text-sm text-claude-600 hover:text-claude-800 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          {file.name}
                        </button>
                      ))}
                      {projectInfo.markdownFiles.length > 5 && (
                        <button
                          onClick={() => openMarkdownDrawer(projectInfo.markdownFiles[0])}
                          className="px-3 py-1.5 text-sm text-claude-400 hover:text-claude-600"
                        >
                          +{projectInfo.markdownFiles.length - 5} more
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Git History */}
          <GitInfo
            gitHistory={gitHistory}
            isExpanded={isGitExpanded}
            onToggle={() => setIsGitExpanded(!isGitExpanded)}
            isLoading={isLoadingGit}
          />

          {/* Sessions List */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-claude-900">Sessions</h2>
            <span className="text-sm text-claude-500">
              {projectSessions.length} total
            </span>
          </div>

          {/* Session Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-400" />
              <input
                type="text"
                value={sessionSearchQuery}
                onChange={(e) => setSessionSearchQuery(e.target.value)}
                placeholder="搜索会话名称或 ID..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-claude-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
              {sessionSearchQuery && (
                <button
                  onClick={() => setSessionSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-claude-400 hover:text-claude-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {sessionSearchQuery && (
              <p className="text-xs text-claude-500 mt-1">
                找到 {projectSessions.filter(s =>
                  (s.displayName || s.id).toLowerCase().includes(sessionSearchQuery.toLowerCase())
                ).length} 个匹配
              </p>
            )}
          </div>

          <div className="space-y-3">
            {projectSessions
              .filter((session) => {
                if (!sessionSearchQuery) return true
                const searchLower = sessionSearchQuery.toLowerCase()
                const displayName = (session.displayName || session.id).toLowerCase()
                return displayName.includes(searchLower)
              })
              .map((session) => (
              <div
                key={session.id}
                className="card p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleSessionClick(session)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {editingSessionId === session.id ? (
                        <div
                          className="flex items-center gap-2 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editSessionName}
                            onChange={(e) => setEditSessionName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveSessionName(session)
                              } else if (e.key === 'Escape') {
                                handleCancelEditSessionName()
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-accent rounded focus:outline-none focus:ring-2 focus:ring-accent/50"
                            placeholder="输入会话名称"
                            autoFocus
                            disabled={isSavingSessionName}
                          />
                          <button
                            onClick={() => handleSaveSessionName(session)}
                            disabled={isSavingSessionName}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEditSessionName}
                            disabled={isSavingSessionName}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold text-claude-900 truncate">{session.displayName || session.id}</h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEditSessionName(session)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-claude-400 hover:text-accent hover:bg-accent/10 rounded transition-all"
                            title="编辑名称"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
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
                        </>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {getSessionTagsList(session.id).map((tag) => (
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

        {/* Markdown Files Drawer */}
        {isMarkdownDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={closeMarkdownDrawer}
          />
        )}

        <div
          className={`fixed top-0 right-0 h-full w-full max-w-6xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
            isMarkdownDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {isLoadingMarkdown ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-claude-500">Loading...</div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Drawer Header */}
              <div className="bg-white border-b border-claude-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={closeMarkdownDrawer}
                    className="p-2 hover:bg-claude-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-claude-900">Documentation</h2>
                    <p className="text-sm text-claude-500">
                      {selectedMarkdownFile?.relativePath || 'Select a file'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* File List Sidebar */}
                <div className="w-80 border-r border-claude-200 overflow-y-auto bg-claude-50">
                  <div className="p-2">
                    <h3 className="text-xs font-semibold text-claude-400 uppercase tracking-wider px-2 py-2">
                      Markdown Files
                    </h3>
                    {projectInfo.markdownFiles.map((file) => (
                      <button
                        key={file.relativePath}
                        onClick={() => loadMarkdownFile(file.relativePath)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedMarkdownFile?.relativePath === file.relativePath
                            ? 'bg-accent text-white'
                            : 'text-claude-600 hover:bg-claude-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${
                          selectedMarkdownFile?.relativePath === file.relativePath
                            ? 'text-white/70'
                            : 'text-claude-400'
                        }`}>
                          {file.relativePath}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedMarkdownFile ? (
                    <article className="prose prose-claude max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: CodeBlock,
                        }}
                      >
                        {selectedMarkdownFile.content}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <div className="h-full flex items-center justify-center text-claude-400">
                      Select a markdown file to view
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Session Drawer */}
        {isSessionDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={closeSessionDrawer}
          />
        )}

        <div
          className={`fixed top-0 right-0 h-full w-full max-w-4xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
            isSessionDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {isLoadingSession ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-claude-500">Loading session...</div>
            </div>
          ) : selectedSession ? (
            <SessionContent
              session={selectedSession}
              projectName={selectedSession.projectName}
              drawerMode={true}
              onClose={closeSessionDrawer}
              onExport={() => {
                window.open(`/api/sessions/${encodeURIComponent(selectedSession.projectName)}/${encodeURIComponent(selectedSession.id)}/export/markdown`, '_blank')
              }}
              onResume={() => {
                const cmd = `claude --resume ${selectedSession.id}`
                navigator.clipboard.writeText(cmd)
                alert(`Copied: ${cmd}`)
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-claude-400">
              Failed to load session
            </div>
          )}
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
          {projects.map((project) => (
            <div
              key={project.name}
              onClick={() => navigate(`/project/${encodeURIComponent(encodeURIComponent(project.name))}`)}
              className="card p-5 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3 mb-3">
                {/* Project Avatar */}
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden ${
                    project.avatar ? '' : getAvatarColor(project.name)
                  }`}
                >
                  {project.avatar ? (
                    <img src={project.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(getProjectDisplayName(project))
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-claude-900 text-lg group-hover:text-accent transition-colors truncate">
                    {getProjectDisplayName(project)}
                  </h3>
                  <span className="badge bg-claude-100 text-claude-600 text-xs">
                    {project.sessionCount} sessions
                  </span>
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <p className="text-sm text-claude-500 mb-3 line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-claude-500">
                <Calendar className="w-4 h-4" />
                <span className="truncate">
                  Updated {formatDistanceToNow(new Date(project.lastUpdated), { addSuffix: true })}
                </span>
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
