import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProjectList } from './components/ProjectList'
import { SessionView } from './components/SessionView'
import { SearchResults } from './components/SearchResults'
import { BookmarksView } from './components/BookmarksView'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:projectName" element={<ProjectList />} />
        <Route path="/session/:projectName/:sessionId" element={<SessionView />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/bookmarks" element={<BookmarksView />} />
      </Routes>
    </Layout>
  )
}

export default App
