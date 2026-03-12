import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import type { Session } from '../stores/projectStore'

// 获取项目的会话列表
export function useSessions(projectName: string) {
  return useQuery<Session[]>({
    queryKey: queryKeys.sessions(projectName),
    queryFn: async () => {
      if (!projectName) return []
      const res = await fetch(`/api/scanner/projects/${encodeURIComponent(projectName)}`)
      if (!res.ok) throw new Error('Failed to fetch sessions')
      const data = await res.json()
      return data.project?.sessions || []
    },
    enabled: !!projectName,
  })
}

// 获取单个会话详情
export function useSession(projectName: string, sessionId: string) {
  return useQuery<Session | null>({
    queryKey: queryKeys.session(projectName, sessionId),
    queryFn: async () => {
      if (!projectName || !sessionId) return null
      const res = await fetch(`/api/sessions/${encodeURIComponent(projectName)}/${encodeURIComponent(sessionId)}`)
      if (!res.ok) throw new Error('Failed to fetch session')
      const data = await res.json()
      return data.session || null
    },
    enabled: !!projectName && !!sessionId,
    // 会话数据不经常变化，设置更长的 staleTime
    staleTime: 1000 * 60 * 10, // 10 分钟
  })
}

// 刷新会话
export function useRefreshSessions() {
  const queryClient = useQueryClient()

  return {
    refreshSessions: (projectName: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions(projectName) })
    },
    refreshSession: (projectName: string, sessionId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session(projectName, sessionId) })
    },
  }
}
