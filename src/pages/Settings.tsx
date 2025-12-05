import { Settings as SettingsIcon, Globe, Download, Upload, Building2, Save, Loader2, Info, Trophy, Users, Clock, Award, Heart } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { clubService } from '@/services/clubService'
import { toast } from 'sonner'

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
                      <button
                        onClick={handleSaveClub}
                        disabled={savingClub || !clubName.trim()}
                        className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingClub ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>Guardar Cambios</span>
                      </button>
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

          </div>

          {/* =============== SECCIÓN 2 & 3: IMPORTAR/EXPORTAR DATOS =============== */}
          <div className="space-y-6">

            {/* Importar Datos */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2 text-white">
                <Upload className="w-5 h-5 text-blue-500" />
                <span>Importar Datos</span>
                <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">Próximamente</span>
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Importa tus datos desde archivos JSON o CSV. Esta funcionalidad estará disponible próximamente.
              </p>
              <button
                disabled
                className="w-full bg-gray-700 text-gray-500 font-medium py-3 px-4 rounded-lg cursor-not-allowed opacity-60"
              >
                Importar Archivo
              </button>
            </div>

            {/* Exportar Datos */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2 text-white">
                <Download className="w-5 h-5 text-green-500" />
                <span>Exportar Datos</span>
                <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">Próximamente</span>
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Exporta todos tus datos en formato JSON o CSV. Esta funcionalidad estará disponible próximamente.
              </p>
              <button
                disabled
                className="w-full bg-gray-700 text-gray-500 font-medium py-3 px-4 rounded-lg cursor-not-allowed opacity-60"
              >
                Exportar Datos
              </button>
            </div>

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
    </div>
  )
}
