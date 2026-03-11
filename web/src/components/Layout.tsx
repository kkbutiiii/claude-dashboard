import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FolderGit2, Search, Bookmark, Menu, X, Command } from 'lucide-react'
import { useStore } from '../stores/useStore'

interface LayoutProps {
  children: React.ReactNode
}

// Get display name from project - use sourcePath folder name or decoded name
function getProjectDisplayName(project: { name: string; displayName?: string; sourcePath?: string }): string {
  // If there's a custom displayName, use it
  if (project.displayName && project.displayName !== project.name) {
    return project.displayName
  }

  // Try to extract folder name from sourcePath (actual project location)
  if (project.sourcePath) {
    // Handle both Windows and Unix paths
    const parts = project.sourcePath.split(/[/\\]/)
    const lastPart = parts[parts.length - 1]
    if (lastPart) {
      return lastPart
    }
  }

  // Fallback: decode project name (handle path-like format like "C--Users-User-project")
  const name = project.name
  if (name.includes('--')) {
    const parts = name.split('--')
    return parts[parts.length - 1]
  }

  return name
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const { projects, selectedProject, setSelectedProject, fetchProjects } = useStore()

  useEffect(() => {
    // Fetch projects on mount (带防抖)
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    // WebSocket connection for real-time updates
    const ws = new WebSocket(`ws://${window.location.host}`)

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('WebSocket message:', message)

      // Refresh projects on session changes (使用带防抖的请求)
      if (message.type === 'session_created' || message.type === 'session_updated') {
        fetchProjects()
      }
    }

    return () => ws.close()
  }, [fetchProjects])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleProjectClick = (projectName: string) => {
    setSelectedProject(projectName)
    // Use double encoding to handle special characters in project names
    navigate(`/project/${encodeURIComponent(encodeURIComponent(projectName))}`)
  }

  const navItems = [
    { icon: FolderGit2, label: 'Projects', path: '/' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
  ]

  return (
    <div className="flex h-screen bg-claude-50">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-0'}
          bg-white border-r border-claude-200 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-claude-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Command className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-claude-900">Claude Dashboard</h1>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-claude-200">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-claude-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-accent"
              />
            </div>
          </form>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${location.pathname === item.path
                  ? 'bg-accent/10 text-accent'
                  : 'text-claude-600 hover:bg-claude-100'}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}

          {/* Projects */}
          <div className="mt-6">
            <h3 className="px-3 text-xs font-semibold text-claude-400 uppercase tracking-wider mb-2">
              Projects
            </h3>
            {projects.map(project => (
              <button
                key={project.name}
                onClick={() => handleProjectClick(project.name)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${selectedProject === project.name
                    ? 'bg-accent/10 text-accent'
                    : 'text-claude-600 hover:bg-claude-100'}`}
              >
                <FolderGit2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{getProjectDisplayName(project)}</span>
                <span className="ml-auto text-xs text-claude-400 bg-claude-100 px-2 py-0.5 rounded-full">
                  {project.sessionCount}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-claude-200 text-xs text-claude-400">
          <p>{projects.length} projects • {projects.reduce((acc, p) => acc + p.sessionCount, 0)} sessions</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-claude-200 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-claude-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-4 text-sm text-claude-500">
            <span>Claude Dashboard v1.0</span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
