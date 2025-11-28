import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Loader2, Calendar, FileText, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { seasonService, SeasonDB } from '@/services/seasonService'
import { teamService, TeamDB } from '@/services/teamService'
import { clubService, ClubDB } from '@/services/clubService'
import { TeamRosterManager } from '@/components/teams/TeamRosterManager'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { toast } from 'sonner'

export function Teams() {
  const { profile } = useAuthStore()
  const { isCoach, assignedTeamIds, loading: roleLoading } = useCurrentUserRole()
  const navigate = useNavigate()

  // State
  const [currentSeason, setCurrentSeason] = useState<SeasonDB | null>(null)
  const [teams, setTeams] = useState<TeamDB[]>([])
  const [club, setClub] = useState<ClubDB | null>(null)
  const [loading, setLoading] = useState(true)

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

  // ... (Season state remains same)
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

  const loadData = async () => {
    if (!profile?.club_id) return
    setLoading(true)
    try {
      // 0. Get Club Details
      const clubData = await clubService.getClub(profile.club_id)
      setClub(clubData)

      // 1. Get current season
      const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
      setCurrentSeason(season)

      // 2. If season exists, get teams
      if (season) {
        const allTeams = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)

        // 3. Filter teams based on role
        if (isCoach) {
          // Coaches only see their assigned teams
          const filteredTeams = allTeams.filter(team => assignedTeamIds.includes(team.id))
          setTeams(filteredTeams)
        } else {
          // DT and Admin see all teams
          setTeams(allTeams)
        }
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
          category: formData.category_stage, // Sync legacy field
          division_name: null,
          team_suffix: null,
          head_coach_id: null,
          assistant_coach_id: null
        })
        toast.success('Equipo creado')
      }
      setShowModal(false)
      // Reload teams
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

  // ... (handleCreateSeason, handleDelete, getGenderLabel remain same)
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

  if (loading || roleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header & Grid ... (Keep as is until Modal) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <Calendar className="w-4 h-4" />
            <span>Temporada: {currentSeason ? currentSeason.name : 'No configurada'}</span>
          </div>
        </div>

        {currentSeason && !isCoach && (
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Equipo</span>
          </button>
        )}
      </div>

      {!currentSeason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">No hay temporada activa</h3>
          <p className="text-yellow-600 mb-4">
            Necesitas configurar una temporada actual para poder gestionar equipos.
          </p>
          <button
            className="btn-secondary"
            onClick={() => setShowSeasonModal(true)}
          >
            Configurar Temporada
          </button>
        </div>
      )}

      {currentSeason && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {team.name} <span className="text-gray-500 font-normal">- {team.category_stage}</span>
                  </h3>
                  <p className="text-sm text-gray-500">{getGenderLabel(team.gender)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/teams/${team.id}/context`)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Contexto de Temporada"
                  >
                    <Target className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/reports/team-plan/${team.id}`)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Planificación"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setManagingRosterTeam(team)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Gestionar Plantilla"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenModal(team)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{team.competition_level || 'Sin nivel asignado'}</span>
                </div>
                {team.notes && (
                  <p className="text-sm text-gray-500 italic border-t pt-2 mt-2">
                    "{team.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
          {/* Empty state ... */}
          {teams.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">
                {isCoach ? 'No tienes equipos asignados' : 'No hay equipos'}
              </h3>
              <p className="text-gray-500">
                {isCoach
                  ? 'Todavía no tienes equipos asignados en esta temporada. Contacta con Dirección Técnica.'
                  : 'Crea tu primer equipo para esta temporada'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingTeam ? 'Nombre del Equipo' : 'Nombre del Equipo (Sufijo)'} *
                </label>
                <div className="flex items-center gap-2">
                  {!editingTeam && club?.name && (
                    <span className="text-gray-500 font-medium bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                      {club.name}
                    </span>
                  )}
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder={editingTeam ? "Nombre completo" : "Ej: Juvenil A"}
                  />
                </div>
                {!editingTeam && club?.name && (
                  <p className="text-xs text-gray-500 mt-1">
                    El nombre completo será: {club.name} {formData.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select
                    value={formData.category_stage}
                    onChange={e => setFormData({ ...formData, category_stage: e.target.value })}
                    className="input w-full"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Género *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="input w-full"
                  >
                    <option value="female">Femenino</option>
                    <option value="male">Masculino</option>
                    <option value="mixed">Mixto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Competición</label>
                <input
                  type="text"
                  value={formData.competition_level}
                  onChange={e => setFormData({ ...formData, competition_level: e.target.value })}
                  className="input w-full"
                  placeholder="Ej: 1ª Catalana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="input w-full h-24 resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
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
      )}

      {/* Roster Manager Modal */}
      {managingRosterTeam && currentSeason && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <TeamRosterManager
              team={managingRosterTeam}
              season={currentSeason}
              onClose={() => setManagingRosterTeam(null)}
            />
          </div>
        </div>
      )}
      {/* Season Creation Modal */}
      {showSeasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Nueva Temporada</h2>
              <button
                onClick={() => setShowSeasonModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Temporada *</label>
                <input
                  type="text"
                  required
                  value={seasonFormData.name}
                  onChange={e => setSeasonFormData({ ...seasonFormData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Ej: 2024/2025"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={seasonFormData.start_date}
                    onChange={e => setSeasonFormData({ ...seasonFormData, start_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={seasonFormData.end_date}
                    onChange={e => setSeasonFormData({ ...seasonFormData, end_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Referencia (Cálculo de Edades)
                </label>
                <input
                  type="date"
                  required
                  value={seasonFormData.reference_date}
                  onChange={e => setSeasonFormData({ ...seasonFormData, reference_date: e.target.value })}
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fecha utilizada para calcular la categoría de los jugadores (ej: 31/12 del año de inicio).
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
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