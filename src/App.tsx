import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Library from './pages/Library'
import SearchPage from './pages/Search'
import Detail from './pages/Detail'
import AddManual from './pages/AddManual'
import Settings from './pages/Settings'
import { useLibrary } from './store/library'

export default function App() {
  const load = useLibrary((s) => s.load)
  useEffect(() => {
    load()
  }, [load])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Library />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="add" element={<AddManual />} />
        <Route path="entry/:id" element={<Detail />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
