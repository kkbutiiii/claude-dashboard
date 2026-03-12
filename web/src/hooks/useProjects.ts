import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import type { Project } from '../stores/projectStore'

// 获取项目列表
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const res = await fetch('/api/scanner/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      return data.projects || []
    },
  })
}

// 获取单个项目
export function useProject(projectName: string) {
  return useQuery<Project | null>({
    queryKey: queryKeys.project(projectName),
    queryFn: async () => {
      if (!projectName) return null
      const res = await fetch(`/api/scanner/projects/${encodeURIComponent(projectName)}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      const data = await res.json()
      return data.project || null
    },
    enabled: !!projectName,
  })
}

// 刷新项目列表
export function useRefreshProjects() {
  const queryClient = useQueryClient()

  return {
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
    refreshProject: (projectName: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectName) })
    },
  }
}
