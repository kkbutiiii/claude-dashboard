import { create } from 'zustand'

export interface Project {
  name: string
  path: string
  sessionCount: number
  lastUpdated: string
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

export interface Bookmark {
  id: string
  messageUuid: string
  sessionId: string
  projectName: string
  note?: string
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
}

interface StoreState {
  projects: Project[]
  selectedProject: string | null
  selectedSession: Session | null
  bookmarks: Bookmark[]
  tags: Tag[]
  sessionTags: Record<string, string[]>
  searchQuery: string
  searchResults: Session[]
  isLoading: boolean
  error: string | null

  // Actions
  setProjects: (projects: Project[]) => void
  setSelectedProject: (name: string | null) => void
  setSelectedSession: (session: Session | null) => void
  setBookmarks: (bookmarks: Bookmark[]) => void
  addBookmark: (bookmark: Bookmark) => void
  removeBookmark: (id: string) => void
  setTags: (tags: Tag[]) => void
  addTag: (tag: Tag) => void
  removeTag: (id: string) => void
  setSessionTags: (sessionId: string, tagIds: string[]) => void
  setSearchQuery: (query: string) => void
  setSearchResults: (results: Session[]) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useStore = create<StoreState>((set) => ({
  projects: [],
  selectedProject: null,
  selectedSession: null,
  bookmarks: [],
  tags: [],
  sessionTags: {},
  searchQuery: '',
  searchResults: [],
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),
  setSelectedProject: (name) => set({ selectedProject: name }),
  setSelectedSession: (session) => set({ selectedSession: session }),
  setBookmarks: (bookmarks) => set({ bookmarks }),
  addBookmark: (bookmark) => set((state) => ({
    bookmarks: [...state.bookmarks, bookmark]
  })),
  removeBookmark: (id) => set((state) => ({
    bookmarks: state.bookmarks.filter(b => b.id !== id)
  })),
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((state) => ({
    tags: [...state.tags, tag]
  })),
  removeTag: (id) => set((state) => ({
    tags: state.tags.filter(t => t.id !== id)
  })),
  setSessionTags: (sessionId, tagIds) => set((state) => ({
    sessionTags: { ...state.sessionTags, [sessionId]: tagIds }
  })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))
