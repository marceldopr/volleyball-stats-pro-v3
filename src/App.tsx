import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { Teams } from '@/pages/Teams'
import { Matches } from '@/pages/Matches'
import { LiveMatch } from '@/pages/LiveMatch'
import { MatchAnalysis } from '@/pages/MatchAnalysis'
import { Analytics } from '@/pages/Analytics'
import { SettingsPage } from '@/pages/Settings'
import { NewMatch } from '@/pages/NewMatch'
import { Exports } from '@/pages/Exports'
import { About } from '@/pages/About'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Players } from './pages/Players'
import { PlayerDetail } from './pages/PlayerDetail'
import PlayerReports from './pages/PlayerReports'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'
import { useThemeStore } from '@/stores/themeStore'
import { Toaster } from 'sonner'

function App() {
  const { isDarkMode } = useThemeStore()

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Router>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          <Sidebar />
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/teams" element={<Teams />} />
                      <Route path="/players" element={<Players />} /> {/* Added players route */}
                      <Route path="/players/:id" element={<PlayerDetail />} />
                      <Route path="/players/:playerId/reports" element={<PlayerReports />} />
                      <Route path="/matches" element={<Matches />} />
                      <Route path="/matches/new" element={<NewMatch />} />
                      <Route path="/matches/:id" element={<Matches />} />
                      <Route path="/matches/:id/live" element={<LiveMatch />} />
                      <Route path="/matches/:id/analysis" element={<MatchAnalysis />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/exports" element={<Exports />} />
                      <Route path="/about" element={<About />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </div>
      </Router>
      <Toaster />
    </div>
  )
}

export default App