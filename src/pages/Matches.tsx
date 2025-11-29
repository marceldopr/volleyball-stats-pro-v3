import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MatchWizard } from '../components/MatchWizard'
import { MatchDetail } from '../components/MatchDetail'
import { useMatchStore } from '../stores/matchStore'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useAuthStore } from '../stores/authStore'
import { seasonService } from '../services/seasonService'
import { teamService } from '../services/teamService'
import { matchService } from '../services/matchService'
import { useCurrentUserRole } from '../hooks/useCurrentUserRole'
import { Plus, Calendar, Trophy, Clock, Trash2, Eye } from 'lucide-react'


export function Matches() {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<any>(null)
  const { deleteMatch } = useMatchStore()
  const { profile } = useAuthStore()
  const { isCoach, assignedTeamIds, loading: roleLoading } = useCurrentUserRole()

  const [currentSeason, setCurrentSeason] = useState<any>(null)
  const [availableTeams, setAvailableTeams] = useState<any[]>([])
  const [supabaseMatches, setSupabaseMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

          // Filter matches based on role
          if (isCoach) {
            // Coaches only see matches from their assigned teams
            const filteredMatches = allMatches.filter(match =>
              assignedTeamIds.includes(match.team_id)
            )
            setSupabaseMatches(filteredMatches)
          } else {
            // DT and Admin see all matches
            setSupabaseMatches(allMatches)
          }
        }
      } catch (err) {
        console.error('Error loading season/teams/matches', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [profile?.club_id, isCoach, assignedTeamIds])

  // Map team IDs to names for quick lookup
  const teamMap = availableTeams.reduce((acc, team) => {
    acc[team.id] = team.name
    return acc
  }, {} as Record<string, string>)

  // Transform MatchDB to minimal Match for MatchDetail component
  const transformMatchForDetail = (dbMatch: any) => ({
    id: dbMatch.id,
    opponent: dbMatch.opponent_name,
    date: dbMatch.match_date,
    time: new Date(dbMatch.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    location: dbMatch.location || 'Por definir',
    teamSide: dbMatch.home_away === 'home' ? 'local' : 'visitante',
    status: dbMatch.status === 'planned' ? 'upcoming' : dbMatch.status === 'in_progress' ? 'live' : dbMatch.status === 'finished' ? 'completed' : dbMatch.status,
    result: dbMatch.result,
    team_id: dbMatch.team_id,
    season_id: dbMatch.season_id,
    players: [], // Empty, will be loaded by MatchDetail
    sets: []     // Empty, will be loaded by MatchDetail
  })

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

        if (selectedMatch?.id === matchToDelete.id) setSelectedMatch(null)
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
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planned': return 'Próximo'
      case 'in_progress': return 'En Vivo'
      case 'finished': return 'Finalizado'
      default: return 'Desconocido'
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
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-100 dark:text-white">{match.opponent_name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${match.home_away === 'home'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                      {match.home_away === 'home' ? 'Local' : 'Visitante'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                      <span>{new Date(match.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{new Date(match.match_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 flex items-center justify-center">📍</div>
                      <span>{match.location || 'Por definir'}</span>
                    </div>
                    {match.team_id && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">Equipo:</span>
                        <span>{teamMap[match.team_id] || 'Desconocido'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(match.status)}`}>
                      {getStatusText(match.status)}
                    </span>
                    {match.result && (
                      <div className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                        {match.result}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDeleteClick(match)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar partido">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedMatch(transformMatchForDetail(match))}
                  className="btn-secondary text-sm py-2"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalles
                </button>
                {match.status === 'planned' && (
                  <Link to={`/matches/${match.id}/live`} className="btn-primary text-sm py-2">
                    Comenzar Partido
                  </Link>
                )}
                {match.status === 'in_progress' && (
                  <Link to={`/matches/${match.id}/live`} className="btn-action-danger text-sm py-2 animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
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
      <MatchWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetail match={selectedMatch} onClose={() => setSelectedMatch(null)} />
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
