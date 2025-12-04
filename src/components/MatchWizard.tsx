import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Calendar, Clock, MapPin, ChevronDown, Users } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { seasonService } from '../services/seasonService'
import { teamService } from '../services/teamService'
import { matchService } from '../services/matchService'
import { getTeamDisplayName } from '@/utils/teamDisplay'

// Helper functions for European date and time formatting
function formatDateForDisplay(isoDate: string): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function parseEuropeanDate(dateString: string): Date | null {
  const parts = dateString.split('/')
  if (parts.length !== 3) return null
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const year = parseInt(parts[2], 10)
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900) return null
  return new Date(year, month, day)
}

function formatTimeForDisplay(time24h: string): string {
  return time24h
}

function validateEuropeanDate(dateString: string): boolean {
  const date = parseEuropeanDate(dateString)
  return date !== null && !isNaN(date.getTime())
}

function validateEuropeanTime(timeString: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(timeString)
}

interface MatchWizardProps {
  isOpen: boolean
  onClose: () => void
  initialStep?: number
  matchId?: string
}

interface WizardData {
  opponent: string
  date: string
  time: string
  location: string
  teamId: string
  teamSide: 'local' | 'visitante'
}

export function MatchWizard({ isOpen, onClose }: MatchWizardProps) {
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Data fetching states
  const [currentSeason, setCurrentSeason] = useState<any>(null)
  const [availableTeams, setAvailableTeams] = useState<any[]>([])

  const [data, setData] = useState<WizardData>({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: '',
    teamId: '',
    teamSide: 'local',
  })

  // Display values for European format
  const [displayDate, setDisplayDate] = useState(formatDateForDisplay(data.date))
  const [displayTime, setDisplayTime] = useState(formatTimeForDisplay(data.time))
  const [dateError, setDateError] = useState('')
  const [timeError, setTimeError] = useState('')

  // Fetch current season and teams on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.club_id) return
      try {
        const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
        if (!season) {
          setError('No hay una temporada activa. Configura una temporada en la sección de Equipos.')
          return
        }
        setCurrentSeason(season)
        const teams = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)
        setAvailableTeams(teams)
        if (teams.length === 0) {
          setError('No hay equipos en la temporada actual. Crea un equipo primero.')
        }
      } catch (err) {
        console.error('Error fetching wizard data:', err)
        setError('Error al cargar datos. Por favor recarga la página.')
      }
    }
    fetchData()
  }, [profile?.club_id])

  // Sync display values when data changes
  useEffect(() => {
    setDisplayDate(formatDateForDisplay(data.date))
    setDisplayTime(formatTimeForDisplay(data.time))
  }, [data.date, data.time])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('')
      setCurrentStep(1)
      setData({
        opponent: '',
        date: new Date().toISOString().split('T')[0],
        time: '18:00',
        location: '',
        teamId: '',
        teamSide: 'local',
      })
    }
  }, [isOpen])

  const totalSteps = 2

  const handleNext = async () => {
    setError('')

    if (currentStep === 1) {
      if (!data.teamId) { setError('Debes seleccionar tu equipo para este partido.'); return }
      if (!data.teamSide) { setError('Debes seleccionar si tu equipo juega como local o visitante'); return }
      setCurrentStep(2)
      return
    }

    if (currentStep === 2) {
      // Validate Step 2
      if (!data.opponent.trim()) { setError('Debes ingresar el nombre del equipo contrario'); return }
      if (!data.location.trim()) { setError('Debes ingresar la ubicación del partido'); return }
      if (dateError) { setError(dateError); return }
      if (timeError) { setError(timeError); return }

      // Create Match and Exit
      await createMatchAndExit()
      return
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      setError('')
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDisplayDate(value)
    if (!value) { setDateError(''); return }
    if (!validateEuropeanDate(value)) { setDateError('Formato de fecha inválido (DD/MM/YYYY)'); return }
    const date = parseEuropeanDate(value)
    if (!date) { setDateError('Fecha inválida'); return }
    setDateError('')
    const isoDate = date.toISOString().split('T')[0]
    setData(prev => ({ ...prev, date: isoDate }))
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDisplayTime(value)
    if (!value) { setTimeError(''); return }
    if (!validateEuropeanTime(value)) { setTimeError('Formato de hora inválido (HH:MM, 24h)'); return }
    setTimeError('')
    setData(prev => ({ ...prev, time: value }))
  }

  const handleTeamSelection = (teamId: string) => {
    setData(prev => ({ ...prev, teamId }))
  }

  const handleTeamSideChange = (teamSide: 'local' | 'visitante') => {
    setData(prev => ({ ...prev, teamSide }))
  }

  const createMatchAndExit = async () => {
    setIsSubmitting(true)
    try {
      const selectedTeam = availableTeams.find(t => t.id === data.teamId)
      if (!selectedTeam) throw new Error('No se ha seleccionado un equipo válido')

      // Combine date and time for ISO string
      const dateTimeString = `${data.date}T${data.time}:00`
      const matchDate = new Date(dateTimeString).toISOString()

      // Create match in Supabase
      if (profile?.club_id && currentSeason?.id) {
        await matchService.createMatch({
          club_id: profile.club_id,
          season_id: currentSeason.id,
          team_id: data.teamId,
          opponent_name: data.opponent.trim(),
          match_date: matchDate,
          location: data.location.trim(),
          home_away: data.teamSide === 'local' ? 'home' : 'away',
          status: 'planned',
        })
      }

      // Close wizard and return to matches list
      onClose()
      navigate('/matches')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al crear el partido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExit = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="modal-header flex justify-between items-center">
          <h2 className="modal-title">Crear Nuevo Partido</h2>
          <button onClick={handleExit} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4 pb-2 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paso {currentStep} de {totalSteps}</span>
            <span className="text-xs font-bold text-primary-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary-600 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
          </div>
        </div>

        <div className="modal-body overflow-y-auto flex-1 p-6">
          {error && (
            <div className="mb-6 bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-start gap-3">
              <div className="w-1 h-1 bg-danger-500 rounded-full mt-2" />
              <p className="text-sm text-danger-800 font-medium">{error}</p>
            </div>
          )}

          {/* STEP 1: Team & Side */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tu equipo y condición</h3>
                  <p className="text-sm text-gray-500">Selecciona con qué equipo jugarás y si eres local o visitante.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Selector de mi equipo</label>
                  <div className="relative">
                    <select value={data.teamId} onChange={e => handleTeamSelection(e.target.value)} className="input-field w-full appearance-none pr-10">
                      <option value="">Selecciona un equipo...</option>
                      {availableTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {getTeamDisplayName(team)} ({team.player_team_season?.length || 0} jugadoras)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Posición de tu equipo</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div onClick={() => handleTeamSideChange('local')} className={`p-4 border-2 rounded-xl cursor-pointer transition-all text-center relative overflow-hidden group ${data.teamSide === 'local' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="relative z-10">
                        <div className="flex items-center justify-center mb-2">
                          <div className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center transition-colors ${data.teamSide === 'local' ? 'border-primary-600 bg-primary-600' : 'border-gray-300 group-hover:border-gray-400'}`}>
                            {data.teamSide === 'local' && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className="font-medium text-gray-600">Tu equipo es:</span>
                        </div>
                        <span className={`text-xl font-bold ${data.teamSide === 'local' ? 'text-primary-700' : 'text-gray-900'}`}>Local</span>
                      </div>
                    </div>
                    <div onClick={() => handleTeamSideChange('visitante')} className={`p-4 border-2 rounded-xl cursor-pointer transition-all text-center relative overflow-hidden group ${data.teamSide === 'visitante' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="relative z-10">
                        <div className="flex items-center justify-center mb-2">
                          <div className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center transition-colors ${data.teamSide === 'visitante' ? 'border-primary-600 bg-primary-600' : 'border-gray-300 group-hover:border-gray-400'}`}>
                            {data.teamSide === 'visitante' && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className="font-medium text-gray-600">Tu equipo es:</span>
                        </div>
                        <span className={`text-xl font-bold ${data.teamSide === 'visitante' ? 'text-primary-700' : 'text-gray-900'}`}>Visitante</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Match Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Información del Partido</h3>
                  <p className="text-sm text-gray-500">Define los detalles logísticos del encuentro.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Equipo Rival</label>
                  <input
                    type="text"
                    value={data.opponent}
                    onChange={e => setData(prev => ({ ...prev, opponent: e.target.value }))}
                    className="input-field w-full"
                    placeholder="Ej: CV Barcelona"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2"><Calendar className="w-4 h-4 inline mr-1 text-gray-500" /> Fecha</label>
                    <input type="text" value={displayDate} onChange={handleDateChange} placeholder="DD/MM/YYYY" className={`input-field w-full ${dateError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500' : ''}`} />
                    {dateError && <p className="text-danger-500 text-xs mt-1 font-medium">{dateError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2"><Clock className="w-4 h-4 inline mr-1 text-gray-500" /> Hora</label>
                    <input type="text" value={displayTime} onChange={handleTimeChange} placeholder="HH:MM" className={`input-field w-full ${timeError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500' : ''}`} />
                    {timeError && <p className="text-danger-500 text-xs mt-1 font-medium">{timeError}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2"><MapPin className="w-4 h-4 inline mr-1 text-gray-500" /> Ubicación</label>
                  <input type="text" value={data.location} onChange={e => setData(prev => ({ ...prev, location: e.target.value }))} className="input-field w-full" placeholder="Ej: Pabellón Municipal" />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 mt-4">
                <div className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5">ℹ️</div>
                <p className="text-sm text-blue-800">Al crear el partido, podrás gestionar la convocatoria desde la lista de partidos.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer flex justify-between items-center p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <button onClick={handlePrevious} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors" disabled={isSubmitting}>
                Atrás
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-lg text-white font-medium shadow-sm transition-all flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : 'hover:shadow-md'} bg-primary-600 hover:bg-primary-700`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                {currentStep === 1 && <span>Siguiente</span>}
                {currentStep === 2 && <span>Crear Partido</span>}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}