import { Settings as SettingsIcon, Globe, Building2, Save, Loader2, Info, Trophy, Users, Clock, Award, Heart, Edit, StickyNote } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
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

export function SettingsPage() {
  const { isDarkMode, toggleDarkMode } = useThemeStore()
  const { profile } = useAuthStore()
  const { isDT } = useCurrentUserRole()

  const [language, setLanguage] = useState('es')
  const [autoSave, setAutoSave] = useState(true)

  // Club Config State
  const [clubName, setClubName] = useState('')
  const [clubAcronym, setClubAcronym] = useState('')
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

  useEffect(() => {
    if (isDT && profile?.club_id) {
      loadClubData()
    }
  }, [isDT, profile?.club_id])

  const loadClubData = async () => {
    if (!profile?.club_id) return
    setLoadingClub(true)
    try {
      const data = await clubService.getClubById(profile.club_id)
      if (data) {
        setClubName(data.name)
        setClubAcronym(data.acronym || '')
      }
    } catch (error) {
      console.error('Error loading club:', error)
      toast.error('Error al cargar datos del club')
    } finally {
      setLoadingClub(false)
    }
  }

  const handleSaveClub = async () => {
    if (!profile?.club_id) return

    // Validation
    const cleanName = clubName.trim()
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')

    if (!cleanName) {
      toast.error('El nombre del club no puede estar vacío')
      return
    }

    setSavingClub(true)
    try {
      const updated = await clubService.updateClubName(
        profile.club_id,
        cleanName,
        clubAcronym.trim().toUpperCase()
      )

      if (updated) {
        setClubName(updated.name)
        setClubAcronym(updated.acronym || '')
        toast.success('Configuración del club guardada')
      }
    } catch (error) {
      console.error('Error saving club:', error)
      const msg = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al guardar configuración: ' + msg)
    } finally {
      setSavingClub(false)
    }
  }

  const features = [
    {
      icon: Trophy,
      title: "Análisis Profesional",
      description: "Estadísticas detalladas y análisis táctico al nivel de software profesional"
    },
    {
      icon: Users,
      title: "Diseño Intuitivo",
      description: "Interfaz pensada para entrenadores, usable con una sola mano en la pista"
    },
    {
      icon: Clock,
      title: "Real Time",
      description: "Scouting en vivo con registro instantáneo de todas las acciones"
    },
    {
      icon: Award,
      title: "IA Táctica",
      description: "Recomendaciones inteligentes basadas en el análisis del partido"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-primary-500" />
          <h1 className="text-3xl font-bold text-white">Configuración</h1>
        </div>

        {/* Grid Layout for Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* =============== SECCIÓN 1: AJUSTES GENERALES =============== */}
          <div className="space-y-6">

            {/* Configuración del Club (Solo DT) */}
            {isDT && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2 text-white">
                  <Building2 className="w-5 h-5 text-primary-500" />
                  <span>Ajustes Generales - Configuración del Club</span>
                </h2>

                {loadingClub ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nombre del Club *
                        </label>
                        <input
                          type="text"
                          value={clubName}
                          onChange={(e) => setClubName(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Ej: Club Volei Tiana"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Se usará como prefijo para los equipos
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Acrónimo
                        </label>
                        <input
                          type="text"
                          value={clubAcronym}
                          onChange={(e) => setClubAcronym(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
                          placeholder="Ej: CVT"
                          maxLength={5}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="md"
                        icon={savingClub ? Loader2 : Save}
                        onClick={handleSaveClub}
                        disabled={savingClub || !clubName.trim()}
                        className={savingClub ? "" : ""}
                      >
                        Guardar Cambios
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Configuración General (Idioma, Dark Mode, etc.) */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2 text-white">
                <Globe className="w-5 h-5 text-primary-500" />
                <span>Preferencias Generales</span>
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Idioma</h3>
                    <p className="text-sm text-gray-400">Selecciona tu idioma preferido</p>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Modo Oscuro</h3>
                    <p className="text-sm text-gray-400">Activa el modo oscuro para reducir la fatiga visual</p>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDarkMode ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Guardado Automático</h3>
                    <p className="text-sm text-gray-400">Guarda automáticamente los cambios cada 30 segundos</p>
                  </div>
                  <button
                    onClick={() => setAutoSave(!autoSave)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSave ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSave ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Temporada (Solo DT) */}
            {isDT && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-2 flex items-center space-x-2 text-white">
                  <Clock className="w-5 h-5 text-primary-500" />
                  <span>Temporada</span>
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  Define el rango de semanas que forman la temporada. Se resaltará en el calendario.
                </p>

                <div className="space-y-4">
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
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
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
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  {seasonError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-sm text-red-400">{seasonError}</p>
                    </div>
                  )}

                  {(startWeek || endWeek) && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-sm text-blue-400">
                        {startWeek && endWeek
                          ? `Temporada actual: ${startWeek} a ${endWeek}`
                          : 'Configuración incompleta'}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
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
            )}

            {/* Espacios (Solo DT) */}
            {isDT && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold flex items-center space-x-2 text-white">
                    <Building2 className="w-5 h-5 text-primary-500" />
                    <span>Espacios</span>
                  </h2>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingSpace(undefined)
                      setIsSpaceModalOpen(true)
                    }}
                  >
                    Añadir espacio
                  </Button>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                  Define los espacios reservables del club (pistas, gimnasio, patio, etc.).
                </p>

                {spaces.length === 0 ? (
                  // Empty State
                  <div className="bg-gray-900 rounded-lg p-8 text-center">
                    <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Aún no has creado espacios
                    </h3>
                    <p className="text-gray-400 mb-4">
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
                  <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Nombre</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Estado</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Capacidad</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Notas</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {spaces.map((space) => (
                          <tr key={space.id} className="hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3 text-white font-medium">{space.name}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${space.type === 'interior'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
                                }`}>
                                {space.type === 'interior' ? 'Interior' : 'Exterior'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
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
                            <td className="px-4 py-3 text-gray-400">
                              {space.capacity || '—'}
                            </td>
                            <td className="px-4 py-3">
                              {space.notes ? (
                                <div title={space.notes}>
                                  <StickyNote className="w-4 h-4 text-gray-400" />
                                </div>
                              ) : (
                                <span className="text-gray-600">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
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
            )}

          </div>

        </div>

        {/* =============== SECCIÓN 4: SOBRE LA APP (Full Width) =============== */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
          <h2 className="text-2xl font-semibold mb-8 flex items-center space-x-2 text-white">
            <Info className="w-6 h-6 text-primary-500" />
            <span>Sobre la Aplicación</span>
          </h2>

          {/* App Info Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Volleyball Stats Pro V3
            </h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              La aplicación definitiva para el análisis de voleibol,
              superando en diseño, funcionalidad y usabilidad a las soluciones existentes.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  {feature.title}
                </h4>
                <p className="text-xs text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Version & Technical Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Información de Versión</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><strong className="text-gray-300">Versión actual:</strong> 1.0.0</li>
                <li><strong className="text-gray-300">Fecha de lanzamiento:</strong> Noviembre 2024</li>
                <li><strong className="text-gray-300">Plataforma:</strong> Web PWA</li>
                <li><strong className="text-gray-300">Idiomas:</strong> Español, Inglés</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Características Técnicas</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Funciona sin conexión (PWA)</li>
                <li>• Sincronización en tiempo real</li>
                <li>• Exportación múltiple formatos</li>
                <li>• Diseño responsive</li>
              </ul>
            </div>
          </div>

          {/* Team */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mb-6">
            <h4 className="text-lg font-semibold text-white mb-4">Equipo de Desarrollo</h4>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h5 className="text-base font-semibold text-white">Volleyball Stats Pro Team</h5>
                <p className="text-sm text-gray-400">Desarrollo & Diseño</p>
                <p className="text-sm text-gray-400">Equipo apasionado por el voleibol y la tecnología</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 Volleyball Stats Pro V3. Desarrollado con ❤️ para la comunidad del voleibol.</p>
          </div>
        </div>

      </div>

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
