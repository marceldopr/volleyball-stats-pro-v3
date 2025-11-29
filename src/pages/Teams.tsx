import { useState, useEffect } from 'react'
import { Users, Plus, Search, Target, FileText, BookOpen, Edit, Trash2, UserCog, Loader2, Trophy } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { seasonService, SeasonDB } from '@/services/seasonService'
import { teamService, TeamDB } from '@/services/teamService'
import { clubService, ClubDB } from '@/services/clubService'
import { TeamRosterManager } from '@/components/teams/TeamRosterManager'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { toast } from 'sonner'
import { EntityCard } from '@/components/base/EntityCard'

export function Teams() {
  const { profile } = useAuthStore()
  const { isCoach, isDT, isAdmin, assignedTeamIds, loading: roleLoading } = useCurrentUserRole()
  const navigate = useNavigate()

  // State
  const [currentSeason, setCurrentSeason] = useState<SeasonDB | null>(null)
  const [teams, setTeams] = useState<TeamDB[]>([])
  const [club, setClub] = useState<ClubDB | null>(null)
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
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Season state
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonFormData, setSeasonFormData] = useState({
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    reference_date: new Date().toISOString().split('T')[0]
  })
  const [creatingSeason, setCreatingSeason] = useState(false)

  // Load initial data
  useEffect(() => {
    if (profile?.club_id) {
      loadData()
    }
  }, [profile?.club_id])

  const loadTeams = async (clubId: string, seasonId: string) => {
    try {
      setLoading(true)
      console.log('[Teams Debug] Loading teams for club:', clubId, 'season:', seasonId)
      const teamsData = await teamService.getTeamsByClubAndSeason(clubId, seasonId)
      console.log('[Teams Debug] Teams loaded:', teamsData)
      return teamsData
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
      // Get Club Details
      const clubData = await clubService.getClub(profile.club_id)
      setClub(clubData)

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

  const handleOpenModal = (team?: TeamDB) => {
    if (team) {
      setEditingTeam(team)
      setFormData({
        name: team.name,
        category: team.category,
        category_stage: team.category_stage || 'Sénior',
        gender: team.gender,
        competition_level: team.competition_level || '',
        notes: team.notes || ''
      })
    } else {
      setEditingTeam(null)
      setFormData({
        name: '',
        category: '',
        category_stage: 'Sénior',
        gender: 'female',
        competition_level: '',
        notes: ''
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
          ...formData,
          gender: formData.gender as any,
          category_stage: formData.category_stage as any
        })
        toast.success('Equipo actualizado')
      } else {
        await teamService.createTeam({
          club_id: profile.club_id,
          season_id: currentSeason.id,
          ...formData,
          gender: formData.gender as any,
          category_stage: formData.category_stage as any,
          category: formData.category_stage,
          division_name: null,
          team_suffix: null,
          head_coach_id: null,
          assistant_coach_id: null
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
        is_current: true
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

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'female': return 'Femenino'
      case 'male': return 'Masculino'
      case 'mixed': return 'Mixto'
      default: return gender
    }
  }


  console.log('[Teams Debug] Before filtering:', {
    isCoach,
    assignedTeamIds,
    assignedTeamIdsType: typeof assignedTeamIds,
    assignedTeamIdsIsArray: Array.isArray(assignedTeamIds),
    teamsCount: teams.length,
    roleLoading
  })

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.category_stage.toLowerCase().includes(searchTerm.toLowerCase())

    // Filter by season if selected
    const matchesSeason = !currentSeason || true // For now show all, or filter by active season relationship

    // Filter by role
    if (isCoach && !assignedTeamIds.includes(team.id)) {
      console.log('[Teams Debug] Filtering out team:', team.name, 'ID:', team.id, 'not in', assignedTeamIds)
      return false
    }

    return matchesSearch && matchesSeason
  })

  console.log('[Teams Debug] Filtering:', {
    totalTeams: teams.length,
    assignedIds: assignedTeamIds,
    isCoach,
    filteredCount: filteredTeams.length,
    teamsInList: teams.map(t => ({ id: t.id, name: t.name }))
  })

  if (loading || roleLoading) {
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
          <button
            className="btn-secondary"
            onClick={() => setShowSeasonModal(true)}
          >
            Configurar Temporada
          </button>
        </div>

        {/* Season Modal */}
        {showSeasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Nueva Temporada</h2>
                <button
                  onClick={() => setShowSeasonModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-xl text-gray-500 dark:text-gray-400">×</span>
                </button>
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
                  <button
                    type="button"
                    onClick={() => setShowSeasonModal(false)}
                    className="btn-secondary"
                    disabled={creatingSeason}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={creatingSeason}
                  >
                    {creatingSeason ? 'Creando...' : 'Crear Temporada'}
                  </button>
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
              <button
                onClick={() => handleOpenModal()}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Equipo</span>
              </button>
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
                  <EntityCard
                    key={team.id}
                    title={team.name}
                    subtitle={team.category_stage}
                    onClick={() => navigate(`/teams/${team.id}`)}
                    meta={
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {getGenderLabel(team.gender)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {team.competition_level || 'Nivel no especificado'}
                        </div>
                      </div>
                    }
                    actions={
                      <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-700/50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/teams/${team.id}?tab=roster`)
                          }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-blue-400"
                          title="Plantilla"
                        >
                          <Users className="w-5 h-5" />
                          <span className="text-[10px]">Plantilla</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/teams/${team.id}?tab=planning`)
                          }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-green-400"
                          title="Planificación"
                        >
                          <FileText className="w-5 h-5" />
                          <span className="text-[10px]">Plan</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/teams/${team.id}?tab=matches`)
                          }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-orange-400"
                          title="Partidos"
                        >
                          <Trophy className="w-5 h-5" />
                          <span className="text-[10px]">Partidos</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/teams/${team.id}?tab=context`)
                          }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-indigo-400"
                          title="Contexto"
                        >
                          <Target className="w-5 h-5" />
                          <span className="text-[10px]">Contexto</span>
                        </button>
                      </div>
                    }
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
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Género
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nivel
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTeams.map((team) => (
                      <tr
                        key={team.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => navigate(`/reports/team-plan/${team.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {team.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {team.category_stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {getGenderLabel(team.gender)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {team.competition_level || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/teams/${team.id}/context`)
                              }}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                              title="Contexto de Temporada"
                            >
                              <Target className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/reports/team-plan/${team.id}`)
                              }}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Planificación"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/teams/${team.id}/season/${currentSeason.id}/summary`)
                              }}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                              title="Resumen de Temporada"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setManagingRosterTeam(team)
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Gestionar Plantilla"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenModal(team)
                              }}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(team.id)
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar"
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
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-xl text-gray-500 dark:text-gray-400">×</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {editingTeam ? 'Nombre del Equipo' : 'Nombre del Equipo (Sufijo)'} *
                </label>
                <div className="flex items-center gap-2">
                  {!editingTeam && club?.name && (
                    <span className="text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                      {club.name}
                    </span>
                  )}
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    placeholder={editingTeam ? "Nombre completo" : "Ej: Juvenil A"}
                  />
                </div>
                {!editingTeam && club?.name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    El nombre completo será: {club.name} {formData.name}
                  </p>
                )}
              </div>

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
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
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
                onClose={() => setManagingRosterTeam(null)}
              />
            </div>
          </div>
        )
      }
    </div >
  )
}
