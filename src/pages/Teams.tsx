import { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit, Trash2, UserCog, Loader2, X } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { seasonService, SeasonDB } from '@/services/seasonService'
import { teamService, TeamDB } from '@/services/teamService'
import { Button } from '@/components/ui/Button'

import { TeamRosterManager } from '@/components/teams/TeamRosterManager'
import { TeamIdentifierDot } from '@/components/teams/TeamIdentifierDot'
import { useRoleScope } from '@/hooks/useRoleScope'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { toast } from 'sonner'
import { CoachTeamCard } from '@/components/teams/CoachTeamCard'
import { coachAssignmentService } from '@/services/coachAssignmentService'
import { teamStatsService } from '@/services/teamStatsService'
import { identifierService, IdentifierDB } from '@/services/identifierService'

interface EnrichedTeam extends TeamDB {
  coach_name?: string | null
  active_players_count?: number
  attendance_30d?: number | null
  wins?: number
  losses?: number
}

export function Teams() {
  const { profile } = useAuthStore()
  const { isCoach, isDT, assignedTeamIds, loading: roleLoading } = useRoleScope()
  const navigate = useNavigate()

  // State
  const [currentSeason, setCurrentSeason] = useState<SeasonDB | null>(null)
  const [teams, setTeams] = useState<EnrichedTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<TeamDB | null>(null)
  const [managingRosterTeam, setManagingRosterTeam] = useState<TeamDB | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    category_stage: 'Sénior',
    gender: 'female',
    competition_level: '',
    notes: '',
    identifier_id: '' as string
  })
  const [submitting, setSubmitting] = useState(false)
  const [identifiers, setIdentifiers] = useState<IdentifierDB[]>([])
  const [useIdentifier, setUseIdentifier] = useState(false)

  // Season state
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonFormData, setSeasonFormData] = useState({
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    reference_date: new Date().toISOString().split('T')[0]
  })
  const [creatingSeason, setCreatingSeason] = useState(false)

  // Load initial data - wait for role loading to complete
  useEffect(() => {
    if (!roleLoading && profile?.club_id) {
      loadData()
    }
  }, [profile?.club_id, isCoach, isDT, assignedTeamIds, roleLoading])

  const loadTeams = async (clubId: string, seasonId: string) => {
    try {
      setLoading(true)
      console.log('[Teams Debug] Loading teams for club:', clubId, 'season:', seasonId)

      let teamsData: TeamDB[] = []

      if (isDT) {
        // DT sees all teams
        teamsData = await teamService.getTeamsByClubAndSeason(clubId, seasonId)
      } else if (isCoach) {
        // Coach sees only assigned teams
        const allTeams = await teamService.getTeamsByClubAndSeason(clubId, seasonId)
        teamsData = allTeams.filter(team => assignedTeamIds.includes(team.id))
      }

      // Enriched teams with operational data
      const enrichedTeams = await Promise.all(
        teamsData.map(async (team) => {
          const [coachName, activePlayers, attendance, winLoss] = await Promise.all([
            coachAssignmentService.getPrimaryCoachForTeam(team.id, seasonId),
            teamStatsService.getActivePlayersCount(team.id, seasonId),
            teamStatsService.getAttendanceLast30Days(team.id, seasonId),
            teamStatsService.getWinLossRecord(team.id, seasonId)
          ])

          return {
            ...team,
            coach_name: coachName,
            active_players_count: activePlayers,
            attendance_30d: attendance,
            ...winLoss
          }
        })
      )

      console.log('[Teams Debug] Teams loaded:', enrichedTeams)
      return enrichedTeams
    } catch (error) {
      console.error('Error loading teams:', error)
      toast.error('Error al cargar los equipos')
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    if (!profile?.club_id) return
    setLoading(true)
    try {
      // Get current season
      const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
      setCurrentSeason(season)

      // If season exists, get teams
      if (season) {
        const teamsToSet = await loadTeams(profile.club_id, season.id)
        setTeams(teamsToSet)
      } else {
        setTeams([])
      }
    } catch (error) {
      console.error('Error loading teams data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = async (team?: TeamDB) => {
    // Load identifiers when opening modal
    if (profile?.club_id) {
      try {
        const ids = await identifierService.getActiveIdentifiers(profile.club_id)
        setIdentifiers(ids)
      } catch (e) {
        console.error('Error loading identifiers:', e)
      }
    }

    if (team) {
      setEditingTeam(team)
      const hasIdentifier = !!team.identifier_id
      setUseIdentifier(hasIdentifier)
      setFormData({
        name: team.custom_name || '',
        category: team.category,
        category_stage: team.category_stage || 'Sénior',
        gender: team.gender,
        competition_level: team.competition_level || '',
        notes: team.notes || '',
        identifier_id: team.identifier_id || ''
      })
    } else {
      setEditingTeam(null)
      setUseIdentifier(false)
      setFormData({
        name: '',
        category: '',
        category_stage: 'Sénior',
        gender: 'female',
        competition_level: '',
        notes: '',
        identifier_id: ''
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile?.club_id) {
      toast.error('Error: No se ha identificado el club del usuario')
      return
    }
    if (!currentSeason) {
      toast.error('Error: No hay temporada seleccionada')
      return
    }

    setSubmitting(true)
    try {
      if (editingTeam) {
        await teamService.updateTeam(editingTeam.id, {
          custom_name: useIdentifier ? null : formData.name,
          gender: formData.gender as any,
          category_stage: formData.category_stage as any,
          category: formData.category_stage,
          division_name: null,
          team_suffix: null,
          competition_level: formData.competition_level,
          notes: formData.notes,
          head_coach_id: null,
          assistant_coach_id: null,
          identifier_id: useIdentifier && formData.identifier_id ? formData.identifier_id : null
        })
        toast.success('Equipo actualizado')
      } else {
        await teamService.createTeam({
          club_id: profile.club_id,
          season_id: currentSeason.id,
          custom_name: useIdentifier ? null : formData.name,
          gender: formData.gender as any,
          category_stage: formData.category_stage as any,
          category: formData.category_stage,
          division_name: null,
          team_suffix: null,
          head_coach_id: null,
          assistant_coach_id: null,
          competition_level: formData.competition_level,
          notes: formData.notes,
          identifier_id: useIdentifier && formData.identifier_id ? formData.identifier_id : null
        })
        toast.success('Equipo creado')
      }
      setShowModal(false)
      const updatedTeams = await teamService.getTeamsByClubAndSeason(profile.club_id, currentSeason.id)
      setTeams(updatedTeams)
    } catch (error) {
      console.error('Error saving team:', error)
      const errorMessage = (error as Error).message
      toast.error('Error al guardar el equipo: ' + errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.club_id) return

    setCreatingSeason(true)
    try {
      const newSeason = await seasonService.createSeason({
        club_id: profile.club_id,
        ...seasonFormData,
        is_current: true,
        status: 'active'
      })
      setCurrentSeason(newSeason)
      setShowSeasonModal(false)
      toast.success('Temporada creada y establecida como actual')
      loadData()
    } catch (error) {
      toast.error('Error al crear la temporada')
    } finally {
      setCreatingSeason(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este equipo?')) return
    if (!profile?.club_id || !currentSeason) return

    try {
      await teamService.deleteTeam(id)
      toast.success('Equipo eliminado')
      const updatedTeams = await teamService.getTeamsByClubAndSeason(profile.club_id, currentSeason.id)
      setTeams(updatedTeams)
    } catch (error) {
      toast.error('Error al eliminar el equipo')
    }
  }




  console.log('[Teams Debug] Before filtering:', {
    isCoach,
    assignedTeamIds,
    assignedTeamIdsType: typeof assignedTeamIds,
    assignedTeamIdsIsArray: Array.isArray(assignedTeamIds),
    teamsCount: teams.length
  })

  const filteredTeams = teams.filter(team => {
    const matchesSearch = (team.custom_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.category_stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.coach_name && team.coach_name.toLowerCase().includes(searchTerm.toLowerCase()))

    // Filter by season if selected
    const matchesSeason = !currentSeason || true // For now show all, or filter by active season relationship

    // Filter by role
    if (isCoach && !assignedTeamIds.includes(team.id)) {
      console.log('[Teams Debug] Filtering out team:', team.custom_name, 'ID:', team.id, 'not in', assignedTeamIds)
      return false
    }

    return matchesSearch && matchesSeason
  })

  console.log('[Teams Debug] Filtering:', {
    totalTeams: teams.length,
    assignedIds: assignedTeamIds,
    isCoach,
    filteredCount: filteredTeams.length,
    teamsInList: teams.map(t => ({ id: t.id, custom_name: t.custom_name }))
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando equipos...</p>
        </div>
      </div>
    )
  }

  // No season warning
  if (!currentSeason) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Gestión de Equipos</h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">No hay temporada activa</h3>
          <p className="text-yellow-600 dark:text-yellow-300 mb-4">
            Necesitas configurar una temporada actual para poder gestionar equipos.
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowSeasonModal(true)}
          >
            Configurar Temporada
          </Button>
        </div>

        {/* Season Modal */}
        {showSeasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Nueva Temporada</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => setShowSeasonModal(false)}
                  className="p-2"
                >
                  {''}
                </Button>
              </div>

              <form onSubmit={handleCreateSeason} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Temporada *</label>
                  <input
                    type="text"
                    required
                    value={seasonFormData.name}
                    onChange={e => setSeasonFormData({ ...seasonFormData, name: e.target.value })}
                    className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    placeholder="Ej: 2024/2025"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                    <input
                      type="date"
                      required
                      value={seasonFormData.start_date}
                      onChange={e => setSeasonFormData({ ...seasonFormData, start_date: e.target.value })}
                      className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                    <input
                      type="date"
                      required
                      value={seasonFormData.end_date}
                      onChange={e => setSeasonFormData({ ...seasonFormData, end_date: e.target.value })}
                      className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Referencia (Cálculo de Edades)
                  </label>
                  <input
                    type="date"
                    required
                    value={seasonFormData.reference_date}
                    onChange={e => setSeasonFormData({ ...seasonFormData, reference_date: e.target.value })}
                    className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Fecha utilizada para calcular la categoría de los jugadores (ej: 31/12 del año de inicio).
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setShowSeasonModal(false)}
                    disabled={creatingSeason}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={creatingSeason}
                  >
                    {creatingSeason ? 'Creando...' : 'Crear Temporada'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isCoach ? 'Mis Equipos' : 'Gestión de Equipos'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Temporada {currentSeason.name}</p>
            </div>
            {!isCoach && (
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => handleOpenModal()}
              >
                Nuevo Equipo
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isCoach ? (
          // Coach View: Direct grid without wrapper
          <>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar equipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Teams Grid or Empty State */}
            {filteredTeams.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 dark:bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700/50 dark:border-gray-700/50">
                <Users className="w-16 h-16 text-gray-500 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-200 dark:text-white mb-2">
                  No tienes equipos asignados
                </h3>
                <p className="text-gray-400 dark:text-gray-400 mb-4">
                  {searchTerm
                    ? 'Intenta con otra búsqueda'
                    : 'Todavía no tienes equipos asignados en esta temporada. Contacta con Dirección Técnica para que te asignen equipos.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map((team) => (
                  <CoachTeamCard
                    key={team.id}
                    team={team}
                    seasonId={currentSeason?.id || ''}
                    onClick={() => navigate(`/teams/${team.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          // DT/Admin View: Table with wrapper
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar equipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Table or Empty State */}
            {filteredTeams.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 dark:bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700/50 dark:border-gray-700/50">
                <Users className="w-16 h-16 text-gray-500 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-200 dark:text-white mb-2">
                  No hay equipos
                </h3>
                <p className="text-gray-400 dark:text-gray-400 mb-4">
                  {searchTerm ? 'Intenta con otra búsqueda' : 'Crea tu primer equipo para esta temporada'}
                </p>
                {!searchTerm && (
                  <Link
                    to="/entrenadores"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <UserCog className="w-4 h-4" />
                    Gestionar Asignaciones de Entrenadores
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Equipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nivel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Entrenador/a
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Jugadoras
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Asistencia (30d)
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTeams.map((team) => (
                      <tr
                        key={team.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/teams/${team.id}?tab=home`)}
                      >
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                            <TeamIdentifierDot identifier={team.identifier} size="sm" />
                            <span className="truncate">{getTeamDisplayName(team)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">
                          {team.competition_level || '-'}
                        </td>
                        <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">
                          {team.coach_name || <span className="text-gray-400 dark:text-gray-600 italic">Sin asignar</span>}
                        </td>
                        <td className="px-6 py-2.5 whitespace-nowrap text-center text-sm text-gray-400 dark:text-gray-500">
                          {team.active_players_count || 0}
                        </td>
                        <td className="px-6 py-2.5 whitespace-nowrap text-center text-sm text-gray-400 dark:text-gray-500">
                          {team.attendance_30d !== null ? (
                            `${team.attendance_30d}%`
                          ) : (
                            <span className="text-gray-500 dark:text-gray-600 italic text-xs">Sin entrenos</span>
                          )}
                        </td>
                        <td className="px-6 py-2.5 whitespace-nowrap text-center text-sm text-gray-400 dark:text-gray-500">
                          {team.wins !== undefined ? (
                            <span className={team.wins > (team.losses || 0) ? 'text-green-600 dark:text-green-500 font-medium' : ''}>
                              {team.wins}V – {team.losses}D
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-600 italic text-xs">Sin partidos</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenModal(team)
                              }}
                              className="p-1.5 text-gray-400 hover:text-primary-400 hover:bg-gray-700/50 rounded transition-colors"
                              title="Editar equipo"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(team.id)
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                              title="Eliminar equipo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Team Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => setShowModal(false)}
                className="p-2"
              >
                {''}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría *</label>
                  <select
                    value={formData.category_stage}
                    onChange={e => setFormData({ ...formData, category_stage: e.target.value })}
                    className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    <option value="Benjamín">Benjamín</option>
                    <option value="Alevín">Alevín</option>
                    <option value="Infantil">Infantil</option>
                    <option value="Cadete">Cadete</option>
                    <option value="Juvenil">Juvenil</option>
                    <option value="Júnior">Júnior</option>
                    <option value="Sénior">Sénior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Género *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    <option value="female">Femenino</option>
                    <option value="male">Masculino</option>
                    <option value="mixed">Mixto</option>
                  </select>
                </div>
              </div>

              {/* Identifier Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Usar Identificador de Línea
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseIdentifier(!useIdentifier)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useIdentifier ? 'bg-primary-600' : 'bg-gray-600'
                      }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${useIdentifier ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                  </button>
                </div>

                {useIdentifier && (
                  <div className="space-y-3">
                    <select
                      value={formData.identifier_id}
                      onChange={e => setFormData({ ...formData, identifier_id: e.target.value })}
                      className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    >
                      <option value="">Seleccionar identificador</option>
                      {identifiers.map(id => (
                        <option key={id.id} value={id.id}>
                          {id.name} {id.type === 'letter' ? `(${id.code || id.name.charAt(0)})` : ''}
                        </option>
                      ))}
                    </select>

                    {identifiers.length === 0 && (
                      <p className="text-xs text-gray-500">
                        No hay identificadores. Créalos en Configuración → Estructura Deportiva.
                      </p>
                    )}
                  </div>
                )}

                {!useIdentifier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre personalizado (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                      placeholder="Ej: A, Negro, SF..."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nivel de Competición</label>
                <input
                  type="text"
                  value={formData.competition_level}
                  onChange={e => setFormData({ ...formData, competition_level: e.target.value })}
                  className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  placeholder="Ej: 1ª Catalana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="input w-full h-24 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )
      }

      {/* Roster Manager Modal */}
      {
        managingRosterTeam && currentSeason && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <TeamRosterManager
                team={managingRosterTeam}
                season={currentSeason}
                onClose={() => {
                  setManagingRosterTeam(null)
                  loadData()
                }}
              />
            </div>
          </div>
        )
      }
    </div >
  )
}
