import { create } from 'zustand'

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

interface UIState {
  // 搜索状态
  searchQuery: string
  searchResults: string[] // sessionIds
  isSearching: boolean

  // UI 状态
  isSidebarOpen: boolean
  isDarkMode: boolean

  // 书签和标签
  bookmarks: Bookmark[]
  tags: Tag[]
  sessionTags: Map<string, string[]> // sessionId -> tagIds

  // 加载状态
  isLoading: boolean
  error: string | null

  // Actions
  setSearchQuery: (query: string) => void
  setSearchResults: (results: string[]) => void
  setIsSearching: (searching: boolean) => void

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void

  setBookmarks: (bookmarks: Bookmark[]) => void
  addBookmark: (bookmark: Bookmark) => void
  removeBookmark: (id: string) => void

  setTags: (tags: Tag[]) => void
  addTag: (tag: Tag) => void
  removeTag: (id: string) => void
  setSessionTags: (sessionId: string, tagIds: string[]) => void

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // 异步 actions
  fetchBookmarks: () => Promise<void>
  fetchTags: () => Promise<void>
  performSearch: (query: string, filters?: object) => Promise<void>
}

export const useUIStore = create<UIState>((set) => ({
  // 初始状态
  searchQuery: '',
  searchResults: [],
  isSearching: false,

  isSidebarOpen: true,
  isDarkMode: false,

  bookmarks: [],
  tags: [],
  sessionTags: new Map(),

  isLoading: false,
  error: null,

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (searching) => set({ isSearching: searching }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  toggleDarkMode: () => set((state) => {
    const newMode = !state.isDarkMode
    // 保存到 localStorage
    localStorage.setItem('darkMode', String(newMode))
    return { isDarkMode: newMode }
  }),

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

  setSessionTags: (sessionId, tagIds) => set((state) => {
    const newSessionTags = new Map(state.sessionTags)
    newSessionTags.set(sessionId, tagIds)
    return { sessionTags: newSessionTags }
  }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // 获取书签
  fetchBookmarks: async () => {
    try {
      const res = await fetch('/api/bookmarks')
      const data = await res.json()
      if (data.bookmarks) {
        set({ bookmarks: data.bookmarks })
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err)
    }
  },

  // 获取标签
  fetchTags: async () => {
    try {
      const res = await fetch('/api/tags')
      const data = await res.json()
      if (data.tags) {
        set({ tags: data.tags })
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err)
    }
  },

  // 执行搜索
  performSearch: async (query, filters = {}) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: '' })
      return
    }

    set({ isSearching: true, searchQuery: query, error: null })

    try {
      const params = new URLSearchParams({ q: query })

      // 添加过滤器
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, String(value))
      })

      const res = await fetch(`/api/scanner/search?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Search failed')
      }

      const data = await res.json()

      // 提取 session IDs
      const sessionIds = data.results?.map((r: { session: { id: string } }) => r.session.id) || []

      set({
        searchResults: sessionIds,
        isSearching: false
      })
    } catch (err) {
      console.error('Search error:', err)
      set({
        error: err instanceof Error ? err.message : 'Search failed',
        isSearching: false,
        searchResults: []
      })
    }
  },
}))

// 选择器 hooks
export const useSearchQuery = () => useUIStore((state) => state.searchQuery)
export const useSearchResults = () => useUIStore((state) => state.searchResults)
export const useIsSearching = () => useUIStore((state) => state.isSearching)
export const useIsSidebarOpen = () => useUIStore((state) => state.isSidebarOpen)
export const useIsDarkMode = () => useUIStore((state) => state.isDarkMode)
export const useBookmarks = () => useUIStore((state) => state.bookmarks)
export const useTags = () => useUIStore((state) => state.tags)
export const useSessionTags = (sessionId: string) =>
  useUIStore((state) => state.sessionTags.get(sessionId) || [])
