import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Routes } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Teams } from '@/pages/Teams'
import { TeamSeasonContext } from '@/pages/TeamSeasonContext'
import { Matches } from '@/pages/Matches'
import { MatchWizardV2 } from '@/pages/MatchWizardV2'
import { MatchConvocationV2 } from '@/components/matches/MatchConvocationV2'
import { LiveMatchScoutingV2 } from '@/pages/LiveMatchScoutingV2'
import { MatchAnalysisV2 } from '@/pages/MatchAnalysisV2'
import { Analytics } from '@/pages/Analytics'
import { SettingsPage } from '@/pages/Settings'
import { NewMatch } from '@/pages/NewMatch'
import { Exports } from '@/pages/Exports'
import { About } from '@/pages/About'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Players } from './pages/Players'
import { PlayerDetail } from './pages/PlayerDetail'
// DEPRECATED: Flux A - import PlayerReports from './pages/PlayerReports'
import { DTReportsPage } from './pages/DTReportsPage'
import { TeamSeasonPlanPage } from './pages/TeamSeasonPlanPage'
import { TeamSeasonSummaryPage } from '@/pages/TeamSeasonSummaryPage'
import { TeamPlansListPage } from '@/pages/TeamPlansListPage'
import { TeamDashboardPage } from '@/pages/TeamDashboardPage'
import { CoachReportsPage } from './pages/CoachReportsPage'
import { TrainingAttendancePage } from '@/pages/TrainingAttendancePage'
import { CoachAssignments } from './pages/CoachAssignments'
import { ClubDashboardPage } from '@/pages/ClubDashboardPage'
import { StatsPage } from '@/pages/StatsPage'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'
import { useThemeStore } from '@/stores/themeStore'
import { Toaster } from 'sonner'
import { RoleGuard } from '@/components/routing/RoleGuard'
import { Home } from './pages/Home'

function App() {
  const { isDarkMode } = useThemeStore()

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  <Routes>
                    <Route path="/" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <Home />
                      </RoleGuard>
                    } />

                    {/* Shared Routes (DT & Coach) */}
                    <Route path="/teams" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <Teams />
                      </RoleGuard>
                    } />
                    <Route path="/teams/:teamId" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <TeamDashboardPage />
                      </RoleGuard>
                    } />
                    <Route path="/teams/:teamId/context" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <TeamSeasonContext />
                      </RoleGuard>
                    } />
                    <Route path="/reports/team-plans" element={
                      <RoleGuard allowedForDT>
                        <TeamPlansListPage />
                      </RoleGuard>
                    } />
                    <Route path="/reports/team-plan/:teamId" element={
                      <RoleGuard allowedForDT>
                        <TeamSeasonPlanPage />
                      </RoleGuard>
                    } />
                    <Route path="/teams/:teamId/season/:seasonId/summary" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <TeamSeasonSummaryPage />
                      </RoleGuard>
                    } />
                    <Route path="/trainings/:id/attendance" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <TrainingAttendancePage />
                      </RoleGuard>
                    } />

                    {/* DT Only Routes */}
                    <Route path="/club/dashboard" element={
                      <RoleGuard allowedForDT>
                        <ClubDashboardPage />
                      </RoleGuard>
                    } />
                    <Route path="/stats" element={
                      <RoleGuard allowedForDT>
                        <StatsPage />
                      </RoleGuard>
                    } />
                    <Route path="/players" element={
                      <RoleGuard allowedForDT>
                        <Players />
                      </RoleGuard>
                    } />
                    <Route path="/players/:id" element={
                      <RoleGuard allowedForDT>
                        <PlayerDetail />
                      </RoleGuard>
                    } />
                    {/* DEPRECATED: Flux A - Ruta de informes estructurados */}
                    {/* <Route path="/players/:playerId/reports" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <PlayerReports />
                      </RoleGuard>
                    } /> */}
                    <Route path="/reports/players" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <DTReportsPage />
                      </RoleGuard>
                    } />
                    <Route path="/reports/coaches" element={
                      <RoleGuard allowedForDT>
                        <CoachReportsPage />
                      </RoleGuard>
                    } />

                    {/* Matches Routes (Shared) */}
                    <Route path="/matches" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <Matches />
                      </RoleGuard>
                    } />
                    <Route path="/matches/new" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <NewMatch />
                      </RoleGuard>
                    } />
                    <Route path="/matches/:id" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <Matches />
                      </RoleGuard>
                    } />

                    {/* V2 Match System Routes */}
                    <Route path="/matches/create-v2" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <MatchWizardV2 />
                      </RoleGuard>
                    } />
                    <Route path="/matches/v2/:matchId/convocation" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <MatchConvocationV2 />
                      </RoleGuard>
                    } />
                    <Route path="/live-match-v2/:matchId" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <LiveMatchScoutingV2 />
                      </RoleGuard>
                    } />
                    <Route path="/match-analysis-v2/:matchId" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <MatchAnalysisV2 />
                      </RoleGuard>
                    } />

                    <Route path="/analytics" element={
                      <RoleGuard allowedForDT allowedForCoach>
                        <Analytics />
                      </RoleGuard>
                    } />

                    {/* Admin Routes */}
                    <Route path="/coach-assignments" element={
                      <RoleGuard allowedForDT>
                        <CoachAssignments />
                      </RoleGuard>
                    } />
                    <Route path="/settings" element={
                      <RoleGuard allowedForDT>
                        <SettingsPage />
                      </RoleGuard>
                    } />
                    <Route path="/exports" element={
                      <RoleGuard allowedForDT>
                        <Exports />
                      </RoleGuard>
                    } />

                    {/* Public/Shared */}
                    <Route path="/about" element={<About />} />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </>
    )
  )

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <RouterProvider router={router} />
      <Toaster />
    </div>
  )
}

export default App