import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConvocationManager } from '../components/ConvocationManager'
import { ConvocationModal } from '../components/matches/ConvocationModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useAuthStore } from '../stores/authStore'
import { seasonService } from '../services/seasonService'
import { teamService } from '../services/teamService'
import { matchConvocationService } from '../services/matchConvocationService'
import { matchService } from '../services/matchService'
import { useRoleScope } from '@/hooks/useRoleScope'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { Plus, Trophy, Trash2, Users, Play, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'


export function Matches({ teamId }: { teamId?: string } = {}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<any>(null)
  const { profile } = useAuthStore()
  const { isCoach, assignedTeamIds, loading: roleLoading } = useRoleScope()

  const [currentSeason, setCurrentSeason] = useState<any>(null)
  const [availableTeams, setAvailableTeams] = useState<any[]>([])
  const [supabaseMatches, setSupabaseMatches] = useState<any[]>([])
  const [matchesWithConvocations, setMatchesWithConvocations] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Convocation Manager state (V1)
  const [convocationManagerOpen, setConvocationManagerOpen] = useState(false)
  const [selectedMatchForConvocation, setSelectedMatchForConvocation] = useState<any>(null)

  // Convocation Modal state (V2)
  const [convocationModalMatchId, setConvocationModalMatchId] = useState<string | null>(null)

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
          const allMatches = await matchService.listMatches(profile.club_id, season.id)

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

  // Calculate actual match result from V2 SET_END events or use result field
  const getActualMatchResult = (match: any): string | null => {

    // V2: Check for SET_END events
    if (match.actions && Array.isArray(match.actions)) {
      const setEndEvents = match.actions.filter((a: any) => a.type === 'SET_END')

      if (setEndEvents.length > 0) {
        // Count sets won by home and away teams
        let setsWonHome = 0
        let setsWonAway = 0
        const setScores: string[] = []

        // Sort by set number
        setEndEvents.sort((a: any, b: any) => (a.payload?.setNumber || 0) - (b.payload?.setNumber || 0))

        setEndEvents.forEach((event: any) => {
          // Get scores for display
          const homeScore = event.payload?.score?.home ?? event.payload?.homeScore ?? 0
          const awayScore = event.payload?.score?.away ?? event.payload?.awayScore ?? 0
          setScores.push(`${homeScore}-${awayScore}`)

          // Check for winner field first (standard V2)
          if (event.payload?.winner === 'home') {
            setsWonHome++
          } else if (event.payload?.winner === 'away') {
            setsWonAway++
          } else {
            // Fallback: Check score object or direct properties (legacy support)
            if (homeScore > awayScore) {
              setsWonHome++
            } else if (awayScore > homeScore) {
              setsWonAway++
            }
          }
        })

        const scoresString = setScores.length > 0 ? ` (${setScores.join(', ')})` : ''
        return `${setsWonHome}-${setsWonAway}${scoresString}`
      }
    }

    // Fallback to stored result - clean V2 format "Sets: X-Y (...)"
    if (match.result) {
      // Remove only "Sets:" prefix, keep the rest (including parentheses with set details)
      return match.result.replace(/^Sets:\s*/i, '')
    }


    return null
  }

  const handleDeleteClick = (match: any) => {
    setMatchToDelete(match)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (matchToDelete) {
      try {
        // Delete from Supabase
        await matchService.deleteMatch(matchToDelete.id)

        // Reload matches from Supabase
        if (profile?.club_id && currentSeason) {
          const matches = await matchService.listMatches(profile.club_id, currentSeason.id)
          let filteredMatches = matches

          // 1. Filter by teamId prop if provided
          if (teamId) {
            filteredMatches = filteredMatches.filter(match => match.team_id === teamId)
          }

          // 2. Filter by role (Coach)
          if (isCoach) {
            filteredMatches = filteredMatches.filter(match =>
              assignedTeamIds.includes(match.team_id)
            )
          }

          setSupabaseMatches(filteredMatches)
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
      matchService.listMatches(profile.club_id, currentSeason.id)
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
    <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-6 lg:pt-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Partidos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tu calendario y resultados
            {currentSeason && <span className="text-xs text-gray-400 ml-2">· Temporada: {currentSeason.name}</span>}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => navigate('/matches/create')}
        >
          Nuevo Partido
        </Button>
      </div>

      {/* Loading state */}
      {(loading || roleLoading) && (
        <div className="text-center py-12">
          <div className="text-sm text-gray-600 dark:text-gray-400">Cargando partidos...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !roleLoading && supabaseMatches.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            {isCoach ? 'No tienes partidos asignados' : 'No hay partidos registrados'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isCoach
              ? 'Todavía no tienes equipos asignados. Contacta con Dirección Técnica.'
              : 'Crea tu primer partido usando el botón "Nuevo Partido"'
            }
          </p>
        </div>
      )
      }

      {/* Lista de partidos */}
      {!loading && supabaseMatches.length > 0 && (() => {
        // Helper para crear DateTime combinado de match_date + match_time
        const getMatchDateTime = (match: any): Date => {
          // Si tiene match_time, combinar fecha + hora
          if (match.match_time) {
            return new Date(`${match.match_date}T${match.match_time}`)
          }
          // Fallback: solo fecha (asume 00:00)
          return new Date(match.match_date)
        }

        // 1. Separar en dos bloques
        const upcomingOrLiveMatches = supabaseMatches.filter(
          m => m.status === 'planned' || m.status === 'in_progress'
        )
        const finishedMatches = supabaseMatches.filter(
          m => m.status === 'finished'
        )

        // 2. Ordenar:
        // Upcoming/Live: ascendente (más próximo primero)
        upcomingOrLiveMatches.sort((a, b) => {
          const dateA = getMatchDateTime(a)
          const dateB = getMatchDateTime(b)
          return dateA.getTime() - dateB.getTime()
        })

        // Finished: descendente (más reciente primero)
        finishedMatches.sort((a, b) => {
          const dateA = getMatchDateTime(a)
          const dateB = getMatchDateTime(b)
          return dateB.getTime() - dateA.getTime()
        })

        // 3. Combinar: primero upcoming/live, luego finished
        const orderedMatches = [...upcomingOrLiveMatches, ...finishedMatches]

        return (
          <div className="space-y-3">
            {orderedMatches.map((match) => (
              <div
                key={match.id}
                className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex flex-col gap-2 hover:border-slate-700 transition-colors"
              >
                {/* ROW 1: Teams + Result + Buttons */}
                <div className="flex items-center justify-between gap-4">
                  {/* Teams */}
                  <div className="flex items-center gap-2 min-w-0">
                    {match.home_away === 'home' ? (
                      <>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {teamMap[match.team_id] || 'Mi Equipo'}
                        </h3>
                        <span className="text-gray-400 flex-shrink-0">vs</span>
                        <h3 className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {match.opponent_name}
                        </h3>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {match.opponent_name}
                        </h3>
                        <span className="text-gray-400 flex-shrink-0">vs</span>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {teamMap[match.team_id] || 'Mi Equipo'}
                        </h3>
                      </>
                    )}
                  </div>

                  {/* Primary Action Button + Delete */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Date/Time - Next to button */}
                    <div className="text-xs text-gray-400">
                      {(() => {
                        const matchDate = new Date(match.match_date)
                        if (isNaN(matchDate.getTime())) {
                          return 'Fecha no disponible'
                        }
                        const displayTime = match.match_time
                          ? match.match_time.substring(0, 5)
                          : matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                        return (
                          <>
                            {matchDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            {' · '}
                            {displayTime}
                          </>
                        )
                      })()}
                    </div>

                    {/* SINGLE PRIMARY BUTTON - Smart Logic */}
                    {(() => {
                      const hasConvocation = matchesWithConvocations[match.id]

                      // CASE 1: Planned without convocation
                      if (match.status === 'planned' && !hasConvocation) {
                        return (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Users}
                            onClick={() => {
                              if (match.engine === 'v2') {
                                setConvocationModalMatchId(match.id)
                              } else {
                                handleOpenConvocationManager(match)
                              }
                            }}
                          >
                            Convocatoria
                          </Button>
                        )
                      }

                      // CASE 2: Planned with convocation
                      if (match.status === 'planned' && hasConvocation) {
                        return (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Play}
                            onClick={async () => {
                              if (match.engine === 'v2') {
                                try {
                                  await matchService.startMatch(match.id)
                                  navigate(`/live-match/${match.id}`)
                                } catch (e) {
                                  console.error('Error starting V2 match:', e)
                                  alert('Error al iniciar el partido V2')
                                }
                              } else {
                                handleStartMatch(match)
                              }
                            }}
                          >
                            Iniciar Partido
                          </Button>
                        )
                      }

                      // CASE 3: In progress
                      if (match.status === 'in_progress') {
                        return (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Play}
                            onClick={() => {
                              if (match.engine === 'v2') {
                                navigate(`/live-match-v2/${match.id}`)
                              } else {
                                navigate(`/matches/${match.id}/live`)
                              }
                            }}
                            className="animate-pulse"
                          >
                            Ver en Vivo
                          </Button>
                        )
                      }

                      // CASE 4: Finished
                      if (match.status === 'finished') {
                        return (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={BarChart3}
                            onClick={() => {
                              navigate(`/match-analysis/${match.id}`)
                            }}
                          >
                            Ver Análisis
                          </Button>
                        )
                      }

                      return null
                    })()}

                    {/* Delete Button */}
                    {(!isCoach || (isCoach && match.status === 'planned')) && (
                      <button
                        onClick={() => handleDeleteClick(match)}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar partido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ROW 2: Result + Badges */}
                <div className="flex items-center justify-between gap-4">
                  {/* Sets Result - Score bold, details normal - Show for finished AND in_progress */}
                  {(match.status === 'finished' || match.status === 'in_progress') ? (() => {
                    const result = getActualMatchResult(match) || match.result || '-'
                    const match_result = result.match(/^(\d+-\d+)\s*(.*)$/)

                    if (match_result) {
                      const [, score, details] = match_result
                      return (
                        <div className="text-sm text-gray-900 dark:text-white tabular-nums">
                          <span className="font-semibold">{score}</span>
                          {details && <span className="font-normal"> {details}</span>}
                        </div>
                      )
                    }

                    return (
                      <div className="text-sm font-normal text-gray-900 dark:text-white tabular-nums">
                        {result}
                      </div>
                    )
                  })() : <div></div>}

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${match.engine === 'v2'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                      }`}>
                      {match.engine === 'v2' ? 'V2' : 'V1'}
                    </span>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${match.home_away === 'home'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      }`}>
                      {match.home_away === 'home' ? 'LOCAL' : 'VISITANTE'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${match.status === 'planned'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : match.status === 'in_progress'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-slate-700/50 border-slate-600 text-gray-300'
                      }`}>
                      {getStatusText(match.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Convocation Manager Modal */}
      {
        convocationManagerOpen && selectedMatchForConvocation && (
          <ConvocationManager
            isOpen={convocationManagerOpen}
            onClose={handleCloseConvocationManager}
            matchId={selectedMatchForConvocation.id}
            teamId={selectedMatchForConvocation.team_id}
            seasonId={selectedMatchForConvocation.season_id}
            matchStatus={selectedMatchForConvocation.status}
            opponentName={selectedMatchForConvocation.opponent_name}
          />
        )
      }

      {/* Convocation Modal V2 */}
      {convocationModalMatchId && (
        <ConvocationModal
          matchId={convocationModalMatchId}
          onClose={() => setConvocationModalMatchId(null)}
          onSave={() => {
            setConvocationModalMatchId(null)
            // Trigger refresh
            setRefreshKey(prev => prev + 1)
          }}
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
    </div >
  )
}
