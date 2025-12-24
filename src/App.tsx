import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Teams } from '@/pages/Teams'
import { TeamSeasonContext } from '@/pages/TeamSeasonContext'
import { Matches } from '@/pages/Matches'
import { MatchWizard } from '@/pages/MatchWizard'
import { MatchConvocation } from '@/components/matches/MatchConvocation'
import { LiveMatchScouting } from '@/pages/LiveMatchScouting'
import { MatchAnalysis } from '@/pages/MatchAnalysis'
import { Analytics } from '@/pages/Analytics'
import { SettingsPage } from '@/pages/Settings'
import { Exports } from '@/pages/Exports'
import { About } from '@/pages/About'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Players } from './pages/Players'
import { PlayerDetail } from './pages/PlayerDetail'
import { DTReportsPage } from './pages/DTReportsPage'
import { TeamSeasonPlanPage } from './pages/TeamSeasonPlanPage'
import { TeamSeasonSummaryPage } from '@/pages/TeamSeasonSummaryPage'
import { TeamPlansListPage } from '@/pages/TeamPlansListPage'
import { TeamDashboardPage } from '@/pages/TeamDashboardPage'
import { CoachReportsPage } from './pages/CoachReportsPage'
import { TrainingAttendancePage } from '@/pages/TrainingAttendancePage'
import { Coaches } from './pages/Coaches'
import { CoachDetail } from './pages/CoachDetail'
import { ClubDashboardPage } from '@/pages/ClubDashboardPage'
import { StatsPage } from '@/pages/StatsPage'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'
import { useThemeStore } from '@/stores/themeStore'
import { Toaster } from 'sonner'
import { RoleGuard } from '@/components/routing/RoleGuard'
import { Home } from './pages/Home'
import { CalendarioPage } from './pages/CalendarioPage'
import { SaludDisponibilidadPage } from './pages/SaludDisponibilidadPage'
import { NextSeasonPage } from './pages/NextSeasonPage'
import { CoachSignupPage } from './pages/CoachSignupPage'
import { V1BlockedRoute } from '@/components/routing/V1BlockedRoute'
import { useAuthStore } from './stores/authStore'


function App() {
  const { isDarkMode } = useThemeStore()

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup/coach" element={<CoachSignupPage />} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <AppLayout>
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
                  {/* Legacy route redirects */}
                  <Route path="/matches/new" element={<V1BlockedRoute />} />
                  <Route path="/matches/:id" element={<V1BlockedRoute />} />
                  <Route path="/matches/:id/live" element={<V1BlockedRoute />} />

                  {/* V2 Match System Routes */}
                  <Route path="/matches/create" element={
                    <RoleGuard allowedForDT allowedForCoach>
                      <MatchWizard />
                    </RoleGuard>
                  } />
                  <Route path="/matches/:matchId/convocation" element={
                    <RoleGuard allowedForDT allowedForCoach>
                      <MatchConvocation />
                    </RoleGuard>
                  } />
                  <Route path="/live-match/:matchId" element={
                    <RoleGuard allowedForDT allowedForCoach>
                      <LiveMatchScouting />
                    </RoleGuard>
                  } />
                  <Route path="/match-analysis/:matchId" element={
                    <RoleGuard allowedForDT allowedForCoach>
                      <MatchAnalysis />
                    </RoleGuard>
                  } />

                  <Route path="/analytics" element={
                    <RoleGuard allowedForDT allowedForCoach>
                      <Analytics />
                    </RoleGuard>
                  } />

                  {/* Admin Routes */}

                  <Route path="/coaches" element={
                    <RoleGuard allowedForDT>
                      <Coaches />
                    </RoleGuard>
                  } />
                  <Route path="/coaches/:id" element={
                    <RoleGuard allowedForDT>
                      <CoachDetail />
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
                  <Route path="/next-season" element={
                    <RoleGuard allowedForDT>
                      <NextSeasonPage />
                    </RoleGuard>
                  } />

                  {/* Public/Shared */}
                  <Route path="/about" element={<About />} />

                  {/* Placeholder Pages */}
                  <Route path="/calendario" element={
                    <RoleGuard allowedForDT allowedForCoach>
                      <CalendarioPage />
                    </RoleGuard>
                  } />
                  <Route path="/salud-disponibilidad" element={
                    <RoleGuard allowedForDT>
                      <SaludDisponibilidadPage />
                    </RoleGuard>
                  } />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </>
    ),
    {
      future: {
        v7_relativeSplatPath: true,
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
        v7_partialHydration: true,
        v7_skipActionErrorRevalidation: true,
      }
    }
  )

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <RouterProvider router={router} />
      <Toaster />
    </div>
  )
}

export default App