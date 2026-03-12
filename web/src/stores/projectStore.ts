import { create } from 'zustand'
import { shallow } from 'zustand/shallow'

export interface Project {
  name: string
  displayName: string
  path: string
  sourcePath?: string
  sessionCount: number
  lastUpdated: string
  description?: string
  avatar?: string
  markdownFiles?: Array<{
    name: string
    path: string
    relativePath: string
  }>
  sessions?: Session[]
}

export interface Session {
  id: string
  projectName: string
  filePath: string
  messageCount: number
  createdAt: string
  updatedAt: string
  totalTokens?: number
  estimatedCost?: number
  messages?: Message[]
}

export interface Message {
  uuid: string
  parentUuid?: string
  sessionId: string
  timestamp: string
  type: 'user' | 'assistant' | 'system' | 'summary' | 'progress'
  message: {
    role: 'user' | 'assistant'
    content: string | ContentItem[]
    model?: string
    usage?: {
      input_tokens?: number
      output_tokens?: number
    }
  }
  toolUse?: {
    name?: string
    id?: string
  }
  costUSD?: number
}

export interface ContentItem {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result'
  text?: string
  thinking?: string
  name?: string
  content?: string
}

interface ProjectState {
  // 数据
  projects: Project[]
  selectedProject: string | null

  // 加载状态
  isLoading: boolean
  error: string | null
  lastFetched: number

  // Actions
  setProjects: (projects: Project[]) => void
  setSelectedProject: (name: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // 异步 actions
  fetchProjects: () => Promise<void>
  refreshProjects: () => Promise<void>
}

const CACHE_TTL = 30000 // 30秒缓存

export const useProjectStore = create<ProjectState>((set, get) => ({
  // 初始状态
  projects: [],
  selectedProject: null,
  isLoading: false,
  error: null,
  lastFetched: 0,

  // Actions
  setProjects: (projects) => set({ projects, lastFetched: Date.now() }),
  setSelectedProject: (name) => set({ selectedProject: name }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // 获取项目列表（带缓存）
  fetchProjects: async () => {
    const { isLoading, lastFetched } = get()

    // 如果正在加载，直接返回
    if (isLoading) return

    // 如果30秒内已经请求过，直接返回
    if (Date.now() - lastFetched < CACHE_TTL) return

    set({ isLoading: true, error: null })

    try {
      const res = await fetch('/api/scanner/projects')
      const data = await res.json()

      if (data.projects) {
        set({
          projects: data.projects,
          lastFetched: Date.now(),
          isLoading: false
        })
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch projects',
        isLoading: false
      })
    }
  },

  // 强制刷新项目列表
  refreshProjects: async () => {
    set({ isLoading: true, error: null, lastFetched: 0 })

    try {
      const res = await fetch('/api/scanner/projects')
      const data = await res.json()

      if (data.projects) {
        set({
          projects: data.projects,
          lastFetched: Date.now(),
          isLoading: false
        })
      }
    } catch (err) {
      console.error('Failed to refresh projects:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to refresh projects',
        isLoading: false
      })
    }
  },
}))

// 选择器 hooks - 用于精确订阅，避免不必要的重渲染
export const useProjects = () => useProjectStore((state) => state.projects)
export const useSelectedProject = () => useProjectStore((state) => state.selectedProject)
export const useProjectsLoading = () => useProjectStore((state) => state.isLoading)
export const useProjectsError = () => useProjectStore((state) => state.error)

// 获取项目列表（浅比较）
export const useProjectsShallow = () => useProjectStore((state) => state.projects, shallow)
