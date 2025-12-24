import { Building2, Calendar, MapPin, Bell, Users as UsersIcon, Clock, Save, Edit, StickyNote, ChevronRight, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { clubService } from '@/services/clubService'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { useSeasonStore } from '@/stores/seasonStore'
import { Space } from '@/types/spacesTypes'
import { SpaceModal } from '@/components/settings/SpaceModal'
import { useSpacesStore } from '@/stores/spacesStore'
import { TrainingSchedule } from '@/types/trainingScheduleTypes'
import { ScheduleModal } from '@/components/settings/ScheduleModal'
import { useTrainingStore } from '@/stores/trainingStore'
import { teamService, TeamDB } from '@/services/teamService'
import { seasonService } from '@/services/seasonService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { SportStructureSection } from '@/components/settings/SportStructureSection'
import { Layers } from 'lucide-react'

type SectionId = 'club' | 'categorias' | 'temporada' | 'espacios' | 'horarios' | 'calendario' | 'usuarios' | 'notificaciones'

interface Section {
  id: SectionId
  name: string
  icon: React.ReactNode
  badge?: string
}

export function SettingsPage() {
  const { profile } = useAuthStore()
  const { isDT } = useCurrentUserRole()
  const [searchParams] = useSearchParams()

  // Navigation state
  const [activeSection, setActiveSection] = useState<SectionId>('club')

  // Read section from URL on mount
  useEffect(() => {
    const sectionParam = searchParams.get('section')
    if (sectionParam && ['club', 'categorias', 'temporada', 'espacios', 'horarios', 'calendario', 'usuarios', 'notificaciones'].includes(sectionParam)) {
      setActiveSection(sectionParam as SectionId)
    }
  }, [searchParams])

  // Club Config State
  const [clubName, setClubName] = useState('')
  const [clubAcronym, setClubAcronym] = useState('')
  const [language, setLanguage] = useState('es')
  const [timezone, setTimezone] = useState('Europe/Madrid')
  const [loadingClub, setLoadingClub] = useState(false)
  const [savingClub, setSavingClub] = useState(false)

  // Season Config State
  const { setSeasonRange, seasons, activeSeasonId, selectedSeasonId, setSelectedSeasonId, loadSeasons } = useSeasonStore()

  // Spaces Config State (from Store)
  const { spaces, loadSpaces, addSpace, updateSpace, toggleSpaceActive } = useSpacesStore()
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | undefined>(undefined)

  // Season editing state
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null)
  const [editSeasonStart, setEditSeasonStart] = useState('')
  const [editSeasonEnd, setEditSeasonEnd] = useState('')


  // Training Schedules Config State (from Store)
  const { schedules, loadSchedules, addSchedule, updateSchedule, toggleScheduleActive } = useTrainingStore()
  const [teamsForSchedules, setTeamsForSchedules] = useState<TeamDB[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<TrainingSchedule | undefined>(undefined)
  const [preselectedTeam, setPreselectedTeam] = useState<{ id: string, name: string } | undefined>(undefined)

  // Calendar preferences (mock, read-only for now)
  const highlightSeason = true


  // Load club data, seasons, spaces, and schedules
  useEffect(() => {
    if (isDT && profile?.club_id) {
      loadClubData()
      loadSeasons(profile.club_id)
      loadSpaces(profile.club_id)
      loadSchedules(profile.club_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDT, profile?.club_id])

  // Load teams for Schedules section
  const loadTeamsForSchedules = async () => {
    if (!profile?.club_id) return
    setLoadingTeams(true)
    try {
      // Get current season first
      const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
      if (season) {
        const teamsData = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)
        setTeamsForSchedules(teamsData)
      } else {
        setTeamsForSchedules([])
      }
    } catch (error) {
      console.error('Error loading teams for schedules:', error)
      setTeamsForSchedules([])
    } finally {
      setLoadingTeams(false)
    }
  }

  const loadClubData = async () => {
    if (!profile?.club_id) return
    setLoadingClub(true)
    try {
      const data = await clubService.getClubById(profile.club_id)
      if (data) {
        setClubName(data.name || '')
        setClubAcronym(data.acronym || '')
      }
    } catch (error) {
      console.error('Error loading club:', error)
    } finally {
      setLoadingClub(false)
    }
  }

  const saveClubData = async () => {
    if (!profile?.club_id || !clubName.trim()) {
      toast.error('El nombre del club es obligatorio')
      return
    }

    setSavingClub(true)
    try {
      await clubService.updateClub(profile.club_id, {
        name: clubName,
        acronym: clubAcronym || null
      })
      toast.success('Configuración del club guardada')
    } catch (error) {
      console.error('Error saving club:', error)
      toast.error('Error al guardar la configuración')
    } finally {
      setSavingClub(false)
    }
  }

  // Sidebar sections
  const sections: Section[] = [
    { id: 'club', name: 'Club', icon: <Building2 className="w-5 h-5" /> },
    { id: 'categorias', name: 'Categorías', icon: <Layers className="w-5 h-5" /> },
    { id: 'temporada', name: 'Temporada', icon: <Clock className="w-5 h-5" /> },
    { id: 'espacios', name: 'Espacios', icon: <MapPin className="w-5 h-5" /> },
    { id: 'horarios', name: 'Horarios de entrenamiento', icon: <Clock className="w-5 h-5" /> },
    { id: 'calendario', name: 'Calendario', icon: <Calendar className="w-5 h-5" /> },
    { id: 'usuarios', name: 'Usuarios y permisos', icon: <UsersIcon className="w-5 h-5" />, badge: 'Pronto' },
    { id: 'notificaciones', name: 'Notificaciones', icon: <Bell className="w-5 h-5" />, badge: 'Pronto' }
  ]

  // Render active section content
  const renderContent = () => {
    switch (activeSection) {
      case 'club':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Club</h1>
              <p className="text-gray-400">Configuración general del club</p>
            </div>

            {loadingClub ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6 max-w-2xl">
                {/* Club Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre del club *
                  </label>
                  <input
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Ej: Club Voleibol Barcelona"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Club Acronym */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Acrónimo (opcional)
                  </label>
                  <input
                    type="text"
                    value={clubAcronym}
                    onChange={(e) => setClubAcronym(e.target.value)}
                    placeholder="Ej: CVB"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Idioma
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed opacity-60 outline-none"
                  >
                    <option value="es">Español</option>
                    <option value="ca">Català</option>
                    <option value="en">English</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Próximamente</p>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Zona horaria
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    disabled
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed opacity-60 outline-none"
                  >
                    <option value="Europe/Madrid">Europe/Madrid (GMT+1)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Próximamente</p>
                </div>

                {/* Active Season (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Temporada activa
                  </label>
                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-400">
                    {seasons.find(s => s.id === activeSeasonId)?.name || 'No configurada'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Configura en la sección Temporada</p>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Button
                    variant="primary"
                    size="md"
                    icon={Save}
                    onClick={saveClubData}
                    disabled={!clubName.trim() || savingClub}
                  >
                    {savingClub ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )

      case 'categorias':
        return profile?.club_id ? (
          <SportStructureSection clubId={profile.club_id} />
        ) : null

      case 'temporada':
        // Helper to format date as DD/MM/YY
        // Get active season name
        const activeSeason = seasons.find(s => s.status === 'active')

        // Status badge colors
        const getStatusBadge = (status: string) => {
          switch (status) {
            case 'active': return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Activa</span>
            case 'draft': return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Borrador</span>
            case 'archived': return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">Archivada</span>
            default: return null
          }
        }

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Gestión de Temporadas</h1>
              <p className="text-gray-400">
                {activeSeason
                  ? <span>Temporada activa: <strong className="text-white">{activeSeason.name}</strong></span>
                  : 'No hay temporada activa'}
              </p>
            </div>

            {/* Seasons List */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Todas las temporadas</h2>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const name = prompt('Nombre de la nueva temporada (ej: 2026/27):')
                    if (name && profile?.club_id) {
                      seasonService.createDraftSeason(profile.club_id, name)
                        .then(() => {
                          loadSeasons(profile.club_id)
                          toast.success('Temporada creada como borrador')
                        })
                        .catch(() => toast.error('Error al crear temporada'))
                    }
                  }}
                >
                  + Nueva temporada
                </Button>
              </div>

              {seasons.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400">
                  No hay temporadas configuradas para este club.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-700">
                      <th className="px-6 py-3">Nombre</th>
                      <th className="px-6 py-3">Inicio (Semana)</th>

                      <th className="px-6 py-3">Fin (Semana)</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {seasons.map(season => (
                      <tr key={season.id} className="hover:bg-gray-700/50">
                        <td className="px-6 py-4 font-medium text-white">{season.name}</td>
                        <td className="px-6 py-4 text-gray-300">
                          {editingSeasonId === season.id ? (
                            <input
                              type="week"
                              value={editSeasonStart}
                              onChange={(e) => setEditSeasonStart(e.target.value)}
                              className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                            />
                          ) : (
                            season.start_date || '—'
                          )}
                        </td>

                        <td className="px-6 py-4 text-gray-300">
                          {editingSeasonId === season.id ? (
                            <input
                              type="week"
                              value={editSeasonEnd}
                              onChange={(e) => setEditSeasonEnd(e.target.value)}
                              className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                            />
                          ) : (
                            season.end_date || '—'
                          )}
                        </td>

                        <td className="px-6 py-4">{getStatusBadge(season.status)}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {editingSeasonId === season.id ? (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  if (!editSeasonStart || !editSeasonEnd) {
                                    toast.error('Ambas semanas son requeridas')
                                    return
                                  }
                                  seasonService.updateSeason(season.id, {
                                    start_date: editSeasonStart,
                                    end_date: editSeasonEnd
                                  })
                                    .then(() => {
                                      loadSeasons(profile!.club_id)
                                      // Also update the calendar highlighting range
                                      setSeasonRange(editSeasonStart, editSeasonEnd)
                                      setEditingSeasonId(null)
                                      toast.success('Semanas actualizadas')
                                    })
                                    .catch(() => toast.error('Error al guardar'))
                                }}
                              >
                                Guardar
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingSeasonId(null)}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              {/* Edit button for ALL seasons */}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setEditingSeasonId(season.id)
                                  setEditSeasonStart(season.start_date || '')
                                  setEditSeasonEnd(season.end_date || '')
                                }}
                              >
                                Editar
                              </Button>
                              {season.status === 'draft' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    if (!season.start_date || !season.end_date) {
                                      toast.error('Define semanas de inicio y fin antes de activar')
                                      return
                                    }
                                    if (confirm(`¿Activar "${season.name}"? La temporada actual será archivada.`)) {
                                      seasonService.setActiveSeason(profile!.club_id!, season.id)
                                        .then(() => {
                                          loadSeasons(profile!.club_id)
                                          // Update calendar highlighting to new active season
                                          setSeasonRange(season.start_date!, season.end_date!)
                                          toast.success(`Temporada "${season.name}" activada`)
                                        })
                                        .catch((err) => toast.error(err.message || 'Error al activar'))
                                    }
                                  }}
                                >
                                  Activar
                                </Button>
                              )}
                              {season.status === 'active' && (
                                <span className="text-xs text-green-400 font-medium ml-2">En uso</span>
                              )}
                              {season.status === 'archived' && (
                                <span className="text-xs text-gray-500 ml-2">Archivada</span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div >
        )

      case 'espacios':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Espacios</h1>
                <p className="text-gray-400">Define los espacios de entrenamiento y competición del club</p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setEditingSpace(undefined)
                  setIsSpaceModalOpen(true)
                }}
              >
                Añadir espacio
              </Button>
            </div>

            {spaces.length === 0 ? (
              // Empty State
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center max-w-2xl">
                <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Aún no has creado espacios
                </h3>
                <p className="text-gray-400 mb-6">
                  Crea el primero para asignarlo en calendario y planificación.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setEditingSpace(undefined)
                    setIsSpaceModalOpen(true)
                  }}
                >
                  Añadir espacio
                </Button>
              </div>
            ) : (
              // Spaces Table
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Capacidad</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Notas</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {spaces.map((space) => (
                      <tr key={space.id} className="hover:bg-gray-900/50 transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{space.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${space.type === 'interior'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                            }`}>
                            {space.type === 'interior' ? 'Interior' : 'Exterior'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              toggleSpaceActive(space.id)
                              toast.success(`Espacio ${space.isActive ? 'desactivado' : 'activado'}`)
                            }}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${space.isActive ? 'bg-primary-500' : 'bg-gray-600'
                              }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${space.isActive ? 'translate-x-5' : 'translate-x-1'
                                }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {space.capacity || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {space.notes ? (
                            <div title={space.notes}>
                              <StickyNote className="w-4 h-4 text-gray-400" />
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setEditingSpace(space)
                              setIsSpaceModalOpen(true)
                            }}
                            className="text-primary-500 hover:text-primary-400 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )

      case 'horarios':
        // Lazy load teams if they haven't been loaded yet and we are in this section
        if (teamsForSchedules.length === 0 && !loadingTeams && isDT && profile?.club_id) {
          loadTeamsForSchedules()
        }

        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

        // Filter schedules by selected season
        const currentSeasonId = selectedSeasonId || activeSeasonId
        const filteredSchedules = currentSeasonId
          ? schedules.filter(s => s.seasonId === currentSeasonId)
          : schedules

        // Merge teams with their schedules (for this season)
        const teamRows = teamsForSchedules.map(team => {
          const schedule = filteredSchedules.find(s => s.teamId === team.id)
          return {
            id: team.id,
            name: getTeamDisplayName(team),
            schedule
          }
        })

        // Get selectable seasons (active + drafts)
        const selectableSeasons = seasons.filter(s => s.status === 'active' || s.status === 'draft')

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Horarios de entrenamiento</h1>
                <p className="text-gray-400">Planificación semanal para cada equipo</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Season Selector */}
                <select
                  value={selectedSeasonId || activeSeasonId || ''}
                  onChange={(e) => setSelectedSeasonId(e.target.value || null)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  {selectableSeasons.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.status === 'active' ? '(activa)' : '(borrador)'}
                    </option>
                  ))}
                </select>
                {/* Clone button for draft seasons */}
                {selectedSeasonId && selectedSeasonId !== activeSeasonId && activeSeasonId && profile?.club_id && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const { cloneSchedulesToSeason } = useTrainingStore.getState()
                      try {
                        await cloneSchedulesToSeason(activeSeasonId, selectedSeasonId, profile.club_id)
                        toast.success('Horarios clonados desde temporada activa')
                      } catch (error) {
                        toast.error('Error al clonar horarios')
                      }
                    }}
                  >
                    Clonar desde activa
                  </Button>
                )}
              </div>
            </div>

            {/* List */}
            {loadingTeams ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : teamRows.length > 0 ? (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-medium">
                    <tr>
                      <th className="px-6 py-3">Equipo</th>
                      <th className="px-6 py-3">Días</th>
                      <th className="px-6 py-3">Hora</th>
                      <th className="px-6 py-3">Espacio</th>
                      <th className="px-6 py-3">Periodo</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {teamRows.map((row) => {
                      const hasSchedule = !!row.schedule
                      const schedule = row.schedule

                      return (
                        <tr key={row.id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">
                            {row.name}
                          </td>

                          {hasSchedule && schedule ? (
                            <>
                              <td className="px-6 py-4 text-gray-300">
                                {schedule.days.map(d => dayNames[d]).join(' · ')}
                              </td>
                              <td className="px-6 py-4 text-gray-300">
                                {schedule.startTime}–{schedule.endTime}
                              </td>
                              <td className="px-6 py-4 text-gray-300">
                                {schedule.preferredSpace}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                                  {schedule.period === 'season' ? 'Temp. actual' : 'Personalizado'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => {
                                    toggleScheduleActive(schedule.id)
                                    toast.success(`Horario ${schedule.isActive ? 'desactivado' : 'activado'}`)
                                  }}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${schedule.isActive ? 'bg-primary-500' : 'bg-gray-600'
                                    }`}
                                >
                                  <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${schedule.isActive ? 'translate-x-5' : 'translate-x-1'
                                      }`}
                                  />
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => {
                                    setEditingSchedule(schedule)
                                    setPreselectedTeam(undefined)
                                    setIsScheduleModalOpen(true)
                                  }}
                                  className="text-primary-500 hover:text-primary-400 transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 text-gray-500">—</td>
                              <td className="px-6 py-4 text-gray-500">—</td>
                              <td className="px-6 py-4 text-gray-500">—</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  Sin asignación
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {/* No toggle for unassigned */}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSchedule(undefined)
                                    setPreselectedTeam({ id: row.id, name: row.name })
                                    setIsScheduleModalOpen(true)
                                  }}
                                  className="text-xs"
                                >
                                  Asignar horario
                                </Button>
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                <h3 className="text-xl font-medium text-white mb-2">No hay equipos</h3>
                <p className="text-gray-400">
                  Crea equipos en la sección "Club" para poder asignarles horarios.
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-400">
                <p className="font-medium mb-1">Visualización centralizada</p>
                <p className="text-blue-300/80">
                  Ahora puedes ver y gestionar la planificación de todos tus equipos desde esta única pantalla.
                </p>
              </div>
            </div>
          </div>
        )

      case 'calendario':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Calendario</h1>
              <p className="text-gray-400">Preferencias de visualización del calendario</p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl space-y-6">
              {/* Default View */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Vista por defecto
                </label>
                <div className="flex gap-2 bg-gray-900 rounded-lg p-1 opacity-60">
                  <button
                    disabled
                    className="flex-1 px-4 py-2 rounded-md font-medium transition-colors cursor-not-allowed bg-primary-600 text-white"
                  >
                    Mes
                  </button>
                  <button
                    disabled
                    className="flex-1 px-4 py-2 rounded-md font-medium transition-colors cursor-not-allowed text-gray-400"
                  >
                    Semana
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Próximamente</p>
              </div>

              {/* Week Start Day */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  La semana empieza en
                </label>
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-400">
                  Lunes
                </div>
                <p className="text-xs text-gray-500 mt-1">Estándar ISO 8601</p>
              </div>

              {/* Highlight Season */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Resaltar semanas de temporada
                  </label>
                  <p className="text-xs text-gray-500">
                    Aplica tinte visual a las semanas dentro de la temporada
                  </p>
                </div>
                <button
                  disabled
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors opacity-60 cursor-not-allowed ${highlightSeason ? 'bg-primary-500' : 'bg-gray-600'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${highlightSeason ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500">Actualmente activo por defecto</p>
            </div>
          </div>
        )

      case 'usuarios':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Usuarios y permisos</h1>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-medium">
                Pronto
              </span>
            </div>
            <p className="text-gray-400">Gestiona los usuarios y sus permisos en el sistema</p>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center max-w-2xl">
              <UsersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Gestión de usuarios próximamente
              </h3>
              <p className="text-gray-400 mb-6">
                Podrás invitar usuarios, asignar roles (DT, Entrenador, Jugador) y gestionar permisos.
              </p>

              {/* Mock Table Preview */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden text-left opacity-50">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Rol</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-gray-400">usuario@club.com</td>
                      <td className="px-4 py-2 text-gray-400">DT</td>
                      <td className="px-4 py-2 text-gray-400">Activo</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-400">entrenador@club.com</td>
                      <td className="px-4 py-2 text-gray-400">Entrenador</td>
                      <td className="px-4 py-2 text-gray-400">Activo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'notificaciones':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Notificaciones</h1>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-medium">
                Pronto
              </span>
            </div>
            <p className="text-gray-400">Configura cómo y cuándo recibir notificaciones</p>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Emails automáticos
                  </label>
                  <p className="text-xs text-gray-500">
                    Recibe resúmenes y actualizaciones por email
                  </p>
                </div>
                <button
                  disabled
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 opacity-60 cursor-not-allowed"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>

              {/* Training Reminders */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Recordatorios de entrenamientos
                  </label>
                  <p className="text-xs text-gray-500">
                    Avisos 24h antes de cada entrenamiento
                  </p>
                </div>
                <button
                  disabled
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 opacity-60 cursor-not-allowed"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>

              {/* Change Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Avisos de cambios
                  </label>
                  <p className="text-xs text-gray-500">
                    Notificaciones de cambios en calendario o equipos
                  </p>
                </div>
                <button
                  disabled
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 opacity-60 cursor-not-allowed"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>

              <p className="text-xs text-gray-500 pt-4">
                Estas opciones estarán disponibles próximamente
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!isDT) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h1>
          <p className="text-gray-400">Solo los DT pueden acceder a la configuración</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Internal Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">Configuración</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeSection === section.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              {section.icon}
              <span className="flex-1 font-medium">{section.name}</span>
              {section.badge && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                  {section.badge}
                </span>
              )}
              {activeSection === section.id && (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Space Modal */}
      <SpaceModal
        isOpen={isSpaceModalOpen}
        onClose={() => {
          setIsSpaceModalOpen(false)
          setEditingSpace(undefined)
        }}
        space={editingSpace}
        onSave={async (spaceData) => {
          if (!profile?.club_id) return

          try {
            if (editingSpace) {
              // Edit existing
              await updateSpace(editingSpace.id, spaceData)
              toast.success('Espacio actualizado')
            } else {
              // Add new
              await addSpace({
                clubId: profile.club_id,
                name: spaceData.name!,
                type: spaceData.type!,
                capacity: spaceData.capacity,
                notes: spaceData.notes,
                isActive: spaceData.isActive ?? true
              })
              toast.success('Espacio creado')
            }
          } catch (error) {
            console.error('Error saving space:', error)
            toast.error('Error al guardar el espacio')
          }
        }}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false)
          setEditingSchedule(undefined)
          setPreselectedTeam(undefined)
        }}
        schedule={editingSchedule}
        preselectedTeam={preselectedTeam}
        spaces={spaces.filter(s => s.isActive).map(s => ({ id: s.id, name: s.name }))}
        onSave={async (scheduleData) => {
          if (!profile?.club_id) return

          try {
            if (editingSchedule) {
              // Edit existing
              await updateSchedule(editingSchedule.id, scheduleData)
              toast.success('Horario actualizado')
            } else {
              // Add new
              await addSchedule({
                clubId: profile.club_id,
                seasonId: selectedSeasonId || activeSeasonId || 'unknown-season',
                teamId: preselectedTeam?.id || 'unknown',
                teamName: preselectedTeam?.name || scheduleData.teamName || 'Equipo',
                days: scheduleData.days || [],
                startTime: scheduleData.startTime || '18:00',
                endTime: scheduleData.endTime || '19:30',
                preferredSpace: scheduleData.preferredSpace!,
                alternativeSpaces: scheduleData.alternativeSpaces || [],
                period: scheduleData.period || 'season',
                isActive: scheduleData.isActive ?? true
              })
              toast.success('Horario creado')
            }
          } catch (error) {
            console.error('Error saving schedule:', error)
            toast.error('Error al guardar el horario')
          }
        }}
      />
    </div>
  )
}
