import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './useStore'

describe('useStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStore.setState({
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
    })
  })

  it('should have correct initial state', () => {
    const state = useStore.getState()

    expect(state.projects).toEqual([])
    expect(state.selectedProject).toBeNull()
    expect(state.bookmarks).toEqual([])
    expect(state.tags).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should set projects', () => {
    const mockProjects = [
      { name: 'Project A', sessionCount: 5, lastUpdated: new Date().toISOString() },
    ]

    useStore.getState().setProjects(mockProjects as any)

    expect(useStore.getState().projects).toEqual(mockProjects)
  })

  it('should set selected project', () => {
    useStore.getState().setSelectedProject('Project A')

    expect(useStore.getState().selectedProject).toBe('Project A')
  })

  it('should add and remove bookmarks', () => {
    const mockBookmark = {
      id: 'bookmark-1',
      messageUuid: 'msg-1',
      sessionId: 'session-1',
      projectName: 'Project A',
      createdAt: new Date().toISOString(),
    }

    useStore.getState().addBookmark(mockBookmark)
    expect(useStore.getState().bookmarks).toContainEqual(mockBookmark)

    useStore.getState().removeBookmark('bookmark-1')
    expect(useStore.getState().bookmarks).not.toContainEqual(mockBookmark)
  })

  it('should add and remove tags', () => {
    const mockTag = {
      id: 'tag-1',
      name: 'Important',
      color: '#ff0000',
      createdAt: new Date().toISOString(),
    }

    useStore.getState().addTag(mockTag)
    expect(useStore.getState().tags).toContainEqual(mockTag)

    useStore.getState().removeTag('tag-1')
    expect(useStore.getState().tags).not.toContainEqual(mockTag)
  })

  it('should set session tags', () => {
    useStore.getState().setSessionTags('session-1', ['tag-1', 'tag-2'])

    expect(useStore.getState().sessionTags['session-1']).toEqual(['tag-1', 'tag-2'])
  })

  it('should update loading state', () => {
    useStore.getState().setIsLoading(true)
    expect(useStore.getState().isLoading).toBe(true)

    useStore.getState().setIsLoading(false)
    expect(useStore.getState().isLoading).toBe(false)
  })

  it('should set error', () => {
    useStore.getState().setError('Something went wrong')
    expect(useStore.getState().error).toBe('Something went wrong')

    useStore.getState().setError(null)
    expect(useStore.getState().error).toBeNull()
  })
})
