import { Building2, Calendar, MapPin, Bell, Users as UsersIcon, Clock, Save, Edit, StickyNote, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { clubService } from '@/services/clubService'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { useSeasonStore } from '@/stores/seasonStore'
import { isValidWeekRange } from '@/utils/weekUtils'
import { MOCK_SPACES, Space } from '@/types/spacesTypes'
import { SpaceModal } from '@/components/settings/SpaceModal'

type SectionId = 'club' | 'temporada' | 'espacios' | 'calendario' | 'usuarios' | 'notificaciones'

interface Section {
  id: SectionId
  name: string
  icon: React.ReactNode
  badge?: string
}

export function SettingsPage() {
  const { profile } = useAuthStore()
  const { isDT } = useCurrentUserRole()

  // Navigation state
  const [activeSection, setActiveSection] = useState<SectionId>('club')

  // Club Config State
  const [clubName, setClubName] = useState('')
  const [clubAcronym, setClubAcronym] = useState('')
  const [language, setLanguage] = useState('es')
  const [timezone, setTimezone] = useState('Europe/Madrid')
  const [loadingClub, setLoadingClub] = useState(false)
  const [savingClub, setSavingClub] = useState(false)

  // Season Config State
  const { startWeek, endWeek, setSeasonRange, clearSeasonRange } = useSeasonStore()
  const [localStartWeek, setLocalStartWeek] = useState(startWeek || '')
  const [localEndWeek, setLocalEndWeek] = useState(endWeek || '')
  const [seasonError, setSeasonError] = useState('')

  // Spaces Config State (mock)
  const [spaces, setSpaces] = useState<Space[]>(MOCK_SPACES)
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | undefined>(undefined)

  // Calendar preferences (mock)
  const [defaultView, setDefaultView] = useState<'month' | 'week'>('month')
  const [highlightSeason, setHighlightSeason] = useState(true)

  // Load club data
  useEffect(() => {
    if (isDT && profile?.club_id) {
      loadClubData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDT, profile?.club_id])

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
    { id: 'temporada', name: 'Temporada', icon: <Clock className="w-5 h-5" /> },
    { id: 'espacios', name: 'Espacios', icon: <MapPin className="w-5 h-5" /> },
    { id: 'calendario', name: 'Calendario', icon: <Calendar className="w-5 h-5" /> },
    { id: 'usuarios', name: 'Usuarios y permisos', icon: <UsersIcon className="w-5 h-5" />, badge: 'Pronto' },
    { id: 'notificaciones', name: 'Notificaciones', icon: <Bell className="w-5 h-5" />, badge: 'Pronto' }
  ]

  // Format week date helpers
  const formatWeekDate = (weekId: string, type: 'start' | 'end') => {
    if (!weekId) return ''
    const [year, week] = weekId.split('-W')
    const simple = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7)
    const dayOffset = type === 'start' ? 1 - simple.getDay() : 7 - simple.getDay()
    simple.setDate(simple.getDate() + dayOffset)
    return simple.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

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
                    {startWeek && endWeek ? `${startWeek} a ${endWeek}` : 'No configurada'}
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

      case 'temporada':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Temporada</h1>
              <p className="text-gray-400">Define el rango de la temporada deportiva</p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl">
              <div className="space-y-6">
                {/* Week Range Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Semana de inicio
                    </label>
                    <input
                      type="week"
                      value={localStartWeek}
                      onChange={(e) => {
                        setLocalStartWeek(e.target.value)
                        setSeasonError('')
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    {localStartWeek && (
                      <p className="text-xs text-gray-400 mt-1">
                        Lunes: {formatWeekDate(localStartWeek, 'start')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Semana de fin
                    </label>
                    <input
                      type="week"
                      value={localEndWeek}
                      onChange={(e) => {
                        setLocalEndWeek(e.target.value)
                        setSeasonError('')
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    {localEndWeek && (
                      <p className="text-xs text-gray-400 mt-1">
                        Domingo: {formatWeekDate(localEndWeek, 'end')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Validation Error */}
                {seasonError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-sm text-red-400">{seasonError}</p>
                  </div>
                )}

                {/* Current Season Info */}
                {(startWeek || endWeek) && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-sm text-blue-400">
                      {startWeek && endWeek
                        ? `Temporada actual: ${startWeek} a ${endWeek}`
                        : 'Configuración incompleta'}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="primary"
                    size="md"
                    icon={Save}
                    onClick={() => {
                      if (!localStartWeek || !localEndWeek) {
                        setSeasonError('Debes seleccionar ambas semanas')
                        return
                      }
                      if (!isValidWeekRange(localStartWeek, localEndWeek)) {
                        setSeasonError('La semana final no puede ser anterior a la semana inicial')
                        return
                      }
                      setSeasonRange(localStartWeek, localEndWeek)
                      setSeasonError('')
                      toast.success('Temporada configurada correctamente')
                    }}
                    disabled={!localStartWeek || !localEndWeek}
                  >
                    Guardar Temporada
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setLocalStartWeek('')
                      setLocalEndWeek('')
                      clearSeasonRange()
                      setSeasonError('')
                      toast.success('Temporada restablecida')
                    }}
                  >
                    Restablecer
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
                              const updated = spaces.map(s =>
                                s.id === space.id ? { ...s, isActive: !s.isActive } : s
                              )
                              setSpaces(updated)
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
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors cursor-not-allowed ${defaultView === 'month'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400'
                      }`}
                  >
                    Mes
                  </button>
                  <button
                    disabled
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors cursor-not-allowed ${defaultView === 'week'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400'
                      }`}
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
        onSave={(spaceData) => {
          if (editingSpace) {
            // Edit existing
            const updated = spaces.map(s =>
              s.id === editingSpace.id ? { ...s, ...spaceData } : s
            )
            setSpaces(updated)
            toast.success('Espacio actualizado (mock)')
          } else {
            // Add new
            const newSpace: Space = {
              id: Date.now().toString(),
              name: spaceData.name!,
              type: spaceData.type!,
              capacity: spaceData.capacity,
              notes: spaceData.notes,
              isActive: spaceData.isActive ?? true
            }
            setSpaces([...spaces, newSpace])
            toast.success('Espacio creado (mock)')
          }
        }}
      />
    </div>
  )
}
