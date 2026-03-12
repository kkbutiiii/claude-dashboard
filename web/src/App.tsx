import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { Layout } from './components/Layout'

// 懒加载组件 - 使用包装文件以获得默认导出
const ProjectList = lazy(() => import('./components/ProjectList.lazy'))
const SessionView = lazy(() => import('./components/SessionView.lazy'))
const SearchResults = lazy(() => import('./components/SearchResults.lazy'))
const BookmarksView = lazy(() => import('./components/BookmarksView.lazy'))

// 加载占位符
function PageLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex items-center gap-3 text-claude-500">
        <div className="w-6 h-6 border-2 border-claude-300 border-t-accent rounded-full animate-spin" />
        加载中...
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/project/:projectName" element={<ProjectList />} />
            <Route path="/session/:projectName/:sessionId" element={<SessionView />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/bookmarks" element={<BookmarksView />} />
          </Routes>
        </Suspense>
      </Layout>
    </QueryClientProvider>
  )
}

export default App
