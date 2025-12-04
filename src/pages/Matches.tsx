import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MatchWizard } from '../components/MatchWizard'
// MatchDetail component removed - using only MatchAnalysis now
import { ConvocationManager } from '../components/ConvocationManager'
import { useMatchStore } from '../stores/matchStore'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useAuthStore } from '../stores/authStore'
import { seasonService } from '../services/seasonService'
import { teamService } from '../services/teamService'
import { matchService } from '../services/matchService'
import { matchConvocationService } from '../services/matchConvocationService'
import { useRoleScope } from '@/hooks/useRoleScope'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { Plus, Trophy, Trash2, Users, Play } from 'lucide-react'


export function Matches({ teamId }: { teamId?: string } = {}) {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<any>(null)
  const { deleteMatch } = useMatchStore()
  const { profile } = useAuthStore()
  const { isCoach, assignedTeamIds, loading: roleLoading } = useRoleScope()

  const [currentSeason, setCurrentSeason] = useState<any>(null)
  const [availableTeams, setAvailableTeams] = useState<any[]>([])
  const [supabaseMatches, setSupabaseMatches] = useState<any[]>([])
  const [matchesWithConvocations, setMatchesWithConvocations] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Convocation Manager state
  const [convocationManagerOpen, setConvocationManagerOpen] = useState(false)
  const [selectedMatchForConvocation, setSelectedMatchForConvocation] = useState<any>(null)

  const navigate = useNavigate()

  // Load season, teams, and matches
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.club_id) return
      try {
        setLoading(true)
        const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
        setCurrentSeason(season)
        if (season) {
          const teams = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)
          setAvailableTeams(teams)

          // Load matches from Supabase
          const allMatches = await matchService.getMatchesByClubAndSeason(profile.club_id, season.id)

          // Filter matches based on role and prop
          let filteredMatches = allMatches

          // 1. Filter by teamId prop if provided
          if (teamId) {
            filteredMatches = filteredMatches.filter(match => match.team_id === teamId)
          }

          // 2. Filter by role (Coach)
          if (isCoach) {
            // Coaches only see matches from their assigned teams
            filteredMatches = filteredMatches.filter(match =>
              assignedTeamIds.includes(match.team_id)
            )
          }

          setSupabaseMatches(filteredMatches)
        }
      } catch (err) {
        console.error('Error loading season/teams/matches', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [profile?.club_id, isCoach, assignedTeamIds, teamId, refreshKey])

  // Reload matches when page becomes visible (e.g., returning from live match)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible, refreshing matches...')
        setRefreshKey(prev => prev + 1)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Check which matches have convocations
  useEffect(() => {
    const checkConvocations = async () => {
      const convocationsMap: Record<string, boolean> = {}

      for (const match of supabaseMatches) {
        try {
          const convocations = await matchConvocationService.getConvocationsByMatch(match.id)
          const hasConvocated = convocations.some((c: any) => c.status === 'convocado')
          convocationsMap[match.id] = hasConvocated
        } catch (err) {
          console.error(`Error checking convocations for match ${match.id}:`, err)
          convocationsMap[match.id] = false
        }
      }

      setMatchesWithConvocations(convocationsMap)
    }

    if (supabaseMatches.length > 0) {
      checkConvocations()
    }
  }, [supabaseMatches])

  // Map team IDs to names for quick lookup
  const teamMap = availableTeams.reduce((acc, team) => {
    acc[team.id] = getTeamDisplayName(team)
    return acc
  }, {} as Record<string, string>)

  // transformMatchForDetail function removed - no longer needed

  const handleDeleteClick = (match: any) => {
    setMatchToDelete(match)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (matchToDelete) {
      try {
        // Delete from Supabase
        await matchService.deleteMatch(matchToDelete.id)

        // Also delete from local store if it exists there
        deleteMatch(matchToDelete.id)

        // Reload matches from Supabase
        if (profile?.club_id && currentSeason) {
          const matches = await matchService.getMatchesByClubAndSeason(profile.club_id, currentSeason.id)
          setSupabaseMatches(matches)
        }

        // selectedMatch state removed - no longer needed
      } catch (error) {
        console.error('Error deleting match:', error)
        alert('No se ha podido eliminar el partido. Inténtalo de nuevo.')
      }
    }
    setDeleteConfirmOpen(false)
    setMatchToDelete(null)
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setMatchToDelete(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-red-100 text-red-800'
      case 'finished': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planned': return 'Próximo'
      case 'in_progress': return 'En Vivo'
      case 'finished': return 'Finalizado'
      case 'completed': return 'Finalizado'
      default: return 'Desconocido'
    }
  }

  const handleOpenConvocationManager = (match: any) => {
    if (match.status !== 'planned') {
      alert('No se puede modificar la convocatoria de un partido iniciado o finalizado.')
      return
    }
    setSelectedMatchForConvocation(match)
    setConvocationManagerOpen(true)
  }

  const handleCloseConvocationManager = () => {
    setConvocationManagerOpen(false)
    setSelectedMatchForConvocation(null)
    // Reload matches to update convocation status
    if (profile?.club_id && currentSeason) {
      matchService.getMatchesByClubAndSeason(profile.club_id, currentSeason.id)
        .then(matches => {
          let filteredMatches = matches
          if (teamId) {
            filteredMatches = filteredMatches.filter(m => m.team_id === teamId)
          }
          if (isCoach) {
            filteredMatches = filteredMatches.filter(m => assignedTeamIds.includes(m.team_id))
          }
          setSupabaseMatches(filteredMatches)
        })
    }
  }

  const handleStartMatch = async (match: any) => {
    // Check if match has convocation
    const hasConvocation = matchesWithConvocations[match.id]

    if (!hasConvocation) {
      alert('Este partido no tiene convocatoria. Gestiona la convocatoria antes de iniciar el partido.')
      return
    }

    try {
      // Verify we have at least 6 convocated players
      const convocations = await matchConvocationService.getConvocationsByMatch(match.id)
      const convocated = convocations.filter((c: any) => c.status === 'convocado')

      if (convocated.length < 6) {
        alert(`Solo hay ${convocated.length} jugadoras convocadas. Se necesitan al menos 6 para iniciar el partido.`)
        return
      }

      // Update match status to in_progress
      await matchService.updateMatch(match.id, {
        status: 'in_progress'
      })

      // Navigate directly to live match
      // LiveMatch will detect no starters and show StartersManagement modal automatically
      navigate(`/matches/${match.id}/live`)
    } catch (err) {
      console.error('Error starting match:', err)
      alert('Error al iniciar el partido.')
    }
  }





  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Partidos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona tu calendario y resultados</p>
        </div>
        {!isCoach && (
          <button onClick={() => setIsWizardOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Nuevo Partido</span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {(loading || roleLoading) && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Cargando partidos...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !roleLoading && supabaseMatches.length === 0 && (
        <div className="text-center py-12 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700/50">
          <Trophy className="w-12 h-12 text-gray-500 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-200 dark:text-gray-200 mb-2">
            {isCoach ? 'No tienes partidos asignados' : 'No hay partidos registrados'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-400">
            {isCoach
              ? 'Todavía no tienes equipos asignados. Contacta con Dirección Técnica.'
              : 'Crea tu primer partido usando el botón "Nuevo Partido"'
            }
          </p>
        </div>
      )}

      {/* Lista de partidos */}
      {!loading && supabaseMatches.length > 0 && (
        <div className="space-y-4">
          {supabaseMatches.map((match) => (
            <div key={match.id} className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex-1">
                  {/* Scoreboard: Team vs Opponent */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-white">
                      {teamMap[match.team_id] || 'Mi Equipo'}
                    </h3>
                    <span className="text-lg text-gray-400 font-medium">vs</span>
                    <h3 className="text-xl font-semibold text-gray-300">
                      {match.opponent_name}
                    </h3>
                  </div>

                  {/* Status badges and result */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${match.home_away === 'home'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                      {match.home_away === 'home' ? 'LOCAL' : 'VISITANTE'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(match.status)}`}>
                      {getStatusText(match.status).toUpperCase()}
                    </span>
                    {match.status === 'finished' && match.result && (
                      <span className="ml-auto text-lg font-bold text-white tabular-nums">
                        Resultado: {match.result}
                      </span>
                    )}
                  </div>

                  {/* Date, time, location in one line */}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{new Date(match.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                    <span>·</span>
                    <span>{new Date(match.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>·</span>
                    <span>{match.location || 'Por definir'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => handleDeleteClick(match)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Eliminar partido">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700/50 flex justify-end gap-3">

                {match.status === 'planned' && (
                  <>
                    <button
                      onClick={() => handleOpenConvocationManager(match)}
                      className="btn-secondary text-sm py-2 flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Gestionar Convocatoria
                    </button>

                    <button
                      onClick={() => handleStartMatch(match)}
                      disabled={!matchesWithConvocations[match.id]}
                      title={!matchesWithConvocations[match.id] ? 'Primero debes gestionar la convocatoria' : ''}
                      className={`btn-primary text-sm py-2 flex items-center gap-2 ${!matchesWithConvocations[match.id]
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                        }`}
                    >
                      <Play className="w-4 h-4" />
                      Iniciar Partido
                    </button>
                  </>
                )}

                {match.status === 'in_progress' && (
                  <Link to={`/matches/${match.id}/live`} className="btn-action-danger text-sm py-2 animate-pulse flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    Ver en Vivo
                  </Link>
                )}

                {match.status === 'finished' && (
                  <Link to={`/matches/${match.id}/analysis`} className="btn-outline text-sm py-2">
                    Ver Análisis
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Match Wizard Modal */}
      <MatchWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onMatchCreated={async () => {
          // Reload matches after creation
          if (profile?.club_id && currentSeason) {
            const allMatches = await matchService.getMatchesByClubAndSeason(profile.club_id, currentSeason.id)
            let filteredMatches = allMatches
            if (teamId) {
              filteredMatches = filteredMatches.filter(m => m.team_id === teamId)
            }
            if (isCoach) {
              filteredMatches = filteredMatches.filter(m => assignedTeamIds.includes(m.team_id))
            }
            setSupabaseMatches(filteredMatches)
          }
        }}
      />

      {/* Match Detail Modal removed - using only MatchAnalysis now */}

      {/* Convocation Manager Modal */}
      {convocationManagerOpen && selectedMatchForConvocation && (
        <ConvocationManager
          isOpen={convocationManagerOpen}
          onClose={handleCloseConvocationManager}
          matchId={selectedMatchForConvocation.id}
          teamId={selectedMatchForConvocation.team_id}
          seasonId={selectedMatchForConvocation.season_id}
          matchStatus={selectedMatchForConvocation.status}
          opponentName={selectedMatchForConvocation.opponent_name}
        />
      )}



      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Eliminar partido"
        message="¿Seguro que quieres eliminar este partido? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmButtonClassName="btn-primary bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  )
}
