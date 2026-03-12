import { QueryClient } from '@tanstack/react-query'

// 创建 QueryClient 实例
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据在 5 分钟内被视为新鲜，不会重新获取
      staleTime: 1000 * 60 * 5,
      // 缓存数据 10 分钟
      gcTime: 1000 * 60 * 10,
      // 失败时重试 2 次
      retry: 2,
      // 重试间隔递增
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 窗口重新聚焦时重新获取
      refetchOnWindowFocus: true,
      // 网络重连时重新获取
      refetchOnReconnect: true,
    },
  },
})

// 查询键常量
export const queryKeys = {
  projects: ['projects'] as const,
  project: (name: string) => ['project', name] as const,
  sessions: (projectName: string) => ['sessions', projectName] as const,
  session: (projectName: string, sessionId: string) =>
    ['session', projectName, sessionId] as const,
  search: (query: string) => ['search', query] as const,
  bookmarks: ['bookmarks'] as const,
  tags: ['tags'] as const,
  gitHistory: (projectName: string) => ['git-history', projectName] as const,
} as const
