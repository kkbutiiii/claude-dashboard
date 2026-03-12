import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import type { Session } from '../stores/projectStore'

interface SearchResult {
  session: Session
  matchedMessages: Array<{
    uuid: string
    type: string
    timestamp: string
    message?: {
      role: string
      content: string | unknown
    }
  }>
  matchCount: number
}

interface SearchFilters {
  project?: string
  role?: string
  dateFrom?: string
  dateTo?: string
}

// 搜索消息
export function useSearch(query: string, filters: SearchFilters = {}) {
  return useQuery<SearchResult[]>({
    queryKey: [...queryKeys.search(query), filters],
    queryFn: async () => {
      if (!query.trim()) return []

      const params = new URLSearchParams({ q: query })
      if (filters.project) params.set('project', filters.project)
      if (filters.role) params.set('role', filters.role)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const res = await fetch(`/api/scanner/search?${params.toString()}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      return data.results || []
    },
    enabled: !!query.trim(),
    // 搜索结果缓存 5 分钟
    staleTime: 1000 * 60 * 5,
  })
}

// 防抖搜索 hook
export function useDebouncedSearch(query: string, filters: SearchFilters = {}, delay = 300) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, delay)

    return () => clearTimeout(timer)
  }, [query, delay])

  return useSearch(debouncedQuery, filters)
}

import { useState, useEffect } from 'react'
