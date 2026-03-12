import { create } from 'zustand'
import type { Session, Message } from './projectStore'

interface SessionState {
  // 数据
  sessions: Map<string, Session> // sessionId -> Session
  selectedSessionId: string | null
  sessionMessages: Map<string, Message[]> // sessionId -> Messages

  // 加载状态
  isLoading: boolean
  isLoadingMessages: boolean
  error: string | null

  // Actions
  setSessions: (sessions: Session[]) => void
  setSelectedSession: (sessionId: string | null) => void
  setSessionMessages: (sessionId: string, messages: Message[]) => void
  setLoading: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
  setError: (error: string | null) => void

  // 获取器
  getSession: (sessionId: string) => Session | undefined
  getSessionMessages: (sessionId: string) => Message[] | undefined

  // 异步 actions
  fetchSession: (projectName: string, sessionId: string) => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // 初始状态
  sessions: new Map(),
  selectedSessionId: null,
  sessionMessages: new Map(),
  isLoading: false,
  isLoadingMessages: false,
  error: null,

  // Actions
  setSessions: (sessions) => {
    const sessionMap = new Map<string, Session>()
    for (const session of sessions) {
      sessionMap.set(session.id, session)
    }
    set({ sessions: sessionMap })
  },

  setSelectedSession: (sessionId) => set({ selectedSessionId: sessionId }),

  setSessionMessages: (sessionId, messages) => {
    const { sessionMessages } = get()
    const newMessages = new Map(sessionMessages)
    newMessages.set(sessionId, messages)
    set({ sessionMessages: newMessages })
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  setError: (error) => set({ error }),

  // 获取器
  getSession: (sessionId) => get().sessions.get(sessionId),

  getSessionMessages: (sessionId) => get().sessionMessages.get(sessionId),

  // 获取会话详情
  fetchSession: async (projectName, sessionId) => {
    const { sessions, sessionMessages } = get()

    // 如果已经加载过消息，不再重复加载
    if (sessionMessages.has(sessionId)) {
      set({ selectedSessionId: sessionId })
      return
    }

    set({ isLoadingMessages: true, error: null })

    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(projectName)}/${encodeURIComponent(sessionId)}`)

      if (!res.ok) {
        throw new Error('Failed to load session')
      }

      const data = await res.json()

      if (data.session) {
        // 更新会话信息
        const newSessions = new Map(sessions)
        newSessions.set(sessionId, data.session)

        // 更新消息
        const newMessages = new Map(sessionMessages)
        newMessages.set(sessionId, data.session.messages || [])

        set({
          sessions: newSessions,
          sessionMessages: newMessages,
          selectedSessionId: sessionId,
          isLoadingMessages: false
        })
      }
    } catch (err) {
      console.error('Failed to fetch session:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load session',
        isLoadingMessages: false
      })
    }
  },
}))

// 选择器 hooks
export const useSelectedSessionId = () => useSessionStore((state) => state.selectedSessionId)
export const useSessionsLoading = () => useSessionStore((state) => state.isLoading)
export const useSessionMessagesLoading = () => useSessionStore((state) => state.isLoadingMessages)
export const useSessionError = () => useSessionStore((state) => state.error)

// 获取特定会话
export const useSession = (sessionId: string) =>
  useSessionStore((state) => state.sessions.get(sessionId))

// 获取特定会话的消息
export const useSessionMessages = (sessionId: string) =>
  useSessionStore((state) => state.sessionMessages.get(sessionId))
