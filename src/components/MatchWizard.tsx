import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Calendar, Clock, MapPin, ChevronDown } from 'lucide-react'
import { useMatchStore } from '../stores/matchStore'
import { useAuthStore } from '../stores/authStore'
import { seasonService } from '../services/seasonService'
import { teamService } from '../services/teamService'
import { playerTeamSeasonService } from '../services/playerTeamSeasonService'
import { matchService } from '../services/matchService'
import { matchConvocationService } from '../services/matchConvocationService'
import { LiberoValidationModal } from './LiberoValidationModal'
import { POSITION_NAMES } from '@/constants'

// Helper functions for European date and time formatting
function formatDateForDisplay(isoDate: string): string {
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
  selectedPlayers: string[]
  sacadorInicialSet1: 'local' | 'visitor' | null
}

export function MatchWizard({ isOpen, onClose, initialStep = 1, matchId }: MatchWizardProps) {
  const navigate = useNavigate()
  const { createMatch, matches, setMatchDbId } = useMatchStore()
  const { profile } = useAuthStore()

  const [currentStep, setCurrentStep] = useState(initialStep)
  const [error, setError] = useState('')
  const [showLiberoValidationModal, setShowLiberoValidationModal] = useState(false)

  // Data fetching states
  const [currentSeason, setCurrentSeason] = useState<any>(null)
  const [availableTeams, setAvailableTeams] = useState<any[]>([])
  const [teamRoster, setTeamRoster] = useState<any[]>([])

  const [data, setData] = useState<WizardData>(() => {
    if (matchId) {
      const existingMatch = matches.find(m => m.id === matchId)
      if (existingMatch) {
        return {
          opponent: existingMatch.opponent,
          date: existingMatch.date,
          time: existingMatch.time,
          location: existingMatch.location,
          teamId: existingMatch.teamId || '',
          teamSide: existingMatch.teamSide,
          selectedPlayers: existingMatch.players?.map(p => p.playerId) || [],
          sacadorInicialSet1: existingMatch.sacadorInicialSet1,
        }
      }
    }
    return {
      opponent: '',
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      location: '',
      teamId: '',
      teamSide: 'local',
      selectedPlayers: [],
      sacadorInicialSet1: null,
    }
  })

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

  // Fetch roster when team changes
  useEffect(() => {
    const fetchRoster = async () => {
      if (!data.teamId || !currentSeason) return
      try {
        const roster = await playerTeamSeasonService.getRosterByTeamAndSeason(data.teamId, currentSeason.id)
        const filteredRoster = roster.filter((item: any) => item.player)
        setTeamRoster(filteredRoster)
        // Select all players by default when roster loads
        setData(prev => ({ ...prev, selectedPlayers: filteredRoster.map((item: any) => item.player.id) }))
      } catch (err) {
        console.error('Error fetching roster:', err)
        setError('Error al cargar la plantilla del equipo.')
      }
    }
    fetchRoster()
  }, [data.teamId, currentSeason])

  // Display values for European format
  const [displayDate, setDisplayDate] = useState(formatDateForDisplay(data.date))
  const [displayTime, setDisplayTime] = useState(formatTimeForDisplay(data.time))
  const [dateError, setDateError] = useState('')
  const [timeError, setTimeError] = useState('')

  // Sync display values when data changes
  useEffect(() => {
    setDisplayDate(formatDateForDisplay(data.date))
    setDisplayTime(formatTimeForDisplay(data.time))
  }, [data.date, data.time])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('')
    }
  }, [isOpen])

  const totalSteps = 3

  const handleNext = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 1) {
        if (!data.teamId) { setError('Debes seleccionar tu equipo para este partido.'); return }
        if (!data.teamSide) { setError('Debes seleccionar si tu equipo juega como local o visitante'); return }
      }
      if (currentStep === 2) {
        if (!data.opponent.trim()) { setError('Debes ingresar el nombre del equipo contrario'); return }
        if (!data.location.trim()) { setError('Debes ingresar la ubicación del partido'); return }
        if (dateError) { setError(dateError); return }
        if (timeError) { setError(timeError); return }
      }
      setCurrentStep(prev => prev + 1)
      setError('')
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

  const handleServeSelection = (weServeFirst: boolean) => {
    const miEquipo = data.teamSide
    const equipoContrario = miEquipo === 'local' ? 'visitante' : 'local'
    const startingServer = weServeFirst ? miEquipo : equipoContrario
    const startingServerForStore = startingServer === 'visitante' ? 'visitor' : startingServer
    setData(prev => ({ ...prev, sacadorInicialSet1: startingServerForStore }))
  }

  const handleTeamSelection = (teamId: string) => {
    setData(prev => ({ ...prev, teamId, selectedPlayers: [] }))
  }

  const handleTeamSideChange = (teamSide: 'local' | 'visitante') => {
    setData(prev => ({ ...prev, teamSide }))
  }

  const togglePlayerSelection = (playerId: string) => {
    setData(prev => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.includes(playerId)
        ? prev.selectedPlayers.filter(id => id !== playerId)
        : [...prev.selectedPlayers, playerId],
    }))
  }

  const selectAllPlayers = () => {
    const ids = teamRoster.map(item => item.player.id)
    setData(prev => ({ ...prev, selectedPlayers: ids }))
  }

  const deselectAllPlayers = () => {
    setData(prev => ({ ...prev, selectedPlayers: [] }))
  }

  const getLiberoCount = (): number => {
    return teamRoster.filter(p => data.selectedPlayers.includes(p.player.id) && (p.role === 'L' || p.player.main_position === 'L')).length
  }

  const hasExcessLiberos = (): boolean => getLiberoCount() >= 3

  const handleNavigateToTeams = () => {
    setShowLiberoValidationModal(false)
    onClose()
    navigate('/teams')
  }

  const handleCreateMatch = async () => {
    setError('')
    try {
      const selectedTeam = availableTeams.find(t => t.id === data.teamId)
      if (!selectedTeam) throw new Error('No se ha seleccionado un equipo válido')
      if (!data.opponent.trim()) throw new Error('Debes ingresar el nombre del equipo contrario')
      if (!data.location.trim()) throw new Error('Debes ingresar la ubicación del partido')
      if (data.selectedPlayers.length === 0) throw new Error('Debes seleccionar al menos una jugadora')

      const matchPlayers = teamRoster
        .filter(item => data.selectedPlayers.includes(item.player.id))
        .map(item => {
          // Determine position: ignore 'starter' role, prefer specific role or main_position
          const position = (item.role && item.role !== 'starter') ? item.role : (item.player.main_position || 'L')

          return {
            playerId: item.player.id,
            name: `${item.player.first_name} ${item.player.last_name}`,
            number: parseInt(item.jersey_number || '0'),
            position: position,
            starter: false,
            stats: {
              serves: 0,
              aces: 0,
              serveErrors: 0,
              receptions: 0,
              receptionErrors: 0,
              attacks: 0,
              kills: 0,
              attackErrors: 0,
              blocks: 0,
              blockErrors: 0,
              digs: 0,
              digsErrors: 0,
              sets: 0,
              setErrors: 0,
            },
          }
        })

      const newMatch = createMatch({
        opponent: data.opponent.trim(),
        date: data.date,
        time: data.time,
        location: data.location.trim(),
        status: 'upcoming',
        teamId: data.teamId,
        season_id: currentSeason?.id,
        teamSide: data.teamSide,
        currentSet: 1,
        setsWonLocal: 0,
        setsWonVisitor: 0,
        sacadorInicialSet1: data.sacadorInicialSet1,
        acciones: [],
        sets: [{ id: '1', number: 1, homeScore: 0, awayScore: 0, status: 'not_started' }],
        players: matchPlayers,
      })

      // Persist to Supabase (Silent)
      try {
        if (profile?.club_id && currentSeason?.id && selectedTeam) {
          // Combine date and time for ISO string
          const dateTimeString = `${data.date}T${data.time}:00`
          const matchDate = new Date(dateTimeString).toISOString()

          const supabaseMatch = await matchService.createMatch({
            club_id: profile.club_id,
            season_id: currentSeason.id,
            team_id: data.teamId,
            opponent_name: data.opponent.trim(),
            match_date: matchDate,
            location: data.location.trim(),
            home_away: data.teamSide === 'local' ? 'home' : 'away',
            status: 'planned',
          })

          // Link local match with Supabase ID
          setMatchDbId(newMatch.id, supabaseMatch.id)

          const convocations = teamRoster.map(item => ({
            player_id: item.player.id,
            status: data.selectedPlayers.includes(item.player.id) ? 'convocado' : 'no_convocado',
            reason_not_convoked: data.selectedPlayers.includes(item.player.id) ? undefined : 'decisión técnica',
            notes: undefined
          }))

          await matchConvocationService.setConvocationsForMatch({
            matchId: supabaseMatch.id,
            teamId: selectedTeam.id,
            seasonId: currentSeason.id,
            convocations
          })
        }
      } catch (err) {
        console.error('Error persisting match to Supabase:', err)
        // Silent fail - do not block UI flow
      }

      // Reset wizard state
      setCurrentStep(1)
      const newDate = new Date().toISOString().split('T')[0]
      setData({
        opponent: '',
        date: newDate,
        time: '18:00',
        location: '',
        teamId: availableTeams[0]?.id || '',
        teamSide: 'local',
        selectedPlayers: [],
        sacadorInicialSet1: null,
      })
      setDisplayDate(formatDateForDisplay(newDate))
      setDisplayTime(formatTimeForDisplay('18:00'))
      setDateError('')
      setTimeError('')
      setError('')

      onClose()
      navigate(`/matches/${newMatch.id}/live`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error al crear el partido. Inténtalo de nuevo.')
    }
  }

  if (!isOpen) return null

  const selectedTeam = availableTeams.find(t => t.id === data.teamId)

  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="modal-header flex justify-between items-center">
          <h2 className="modal-title">Crear Nuevo Partido</h2>
          <button onClick={() => { setError(''); onClose() }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pt-4 pb-2 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paso {currentStep} de {totalSteps}</span>
            <span className="text-xs font-bold text-primary-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary-600 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
          </div>
        </div>
        <div className="modal-body overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-start gap-3">
              <div className="w-1 h-1 bg-danger-500 rounded-full mt-2" />
              <p className="text-sm text-danger-800 font-medium">{error}</p>
            </div>
          )}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Tu equipo en este partido</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Selector de mi equipo</label>
                <div className="relative">
                  <select value={data.teamId} onChange={e => handleTeamSelection(e.target.value)} className="input-field w-full appearance-none pr-10">
                    <option value="">Selecciona un equipo...</option>
                    {availableTeams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.player_team_season?.length || 0} jugadoras)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Posición de tu equipo en este partido</h4>
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
          )}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Información del Partido</h3>
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2"><MapPin className="w-4 h-4 inline mr-1 text-gray-500" /> Ubicación</label>
                  <input type="text" value={data.location} onChange={e => setData(prev => ({ ...prev, location: e.target.value }))} className="input-field w-full" placeholder="Ej: Pabellón Municipal" />
                </div>
              </div>
            </div>
          )}
          {currentStep === 3 && selectedTeam && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">¿Quién saca primero?</h3>
                <div className="space-y-3">
                  <button onClick={() => handleServeSelection(true)} className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${data.sacadorInicialSet1 === (data.teamSide === 'local' ? 'local' : 'visitor') ? 'bg-primary-600 text-white shadow-md transform scale-[1.02]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {selectedTeam.name}
                  </button>
                  <button onClick={() => handleServeSelection(false)} className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${data.sacadorInicialSet1 === (data.teamSide === 'local' ? 'visitor' : 'local') ? 'bg-primary-600 text-white shadow-md transform scale-[1.02]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {data.opponent || 'Equipo Rival'}
                  </button>
                </div>
                {!data.sacadorInicialSet1 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">Debes seleccionar quién saca primero</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Seleccionar Jugadoras</h3>
                  <div className="flex space-x-2">
                    <button onClick={selectAllPlayers} className="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors">Seleccionar todas</button>
                    <button onClick={deselectAllPlayers} className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">Deseleccionar todas</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {teamRoster.map(item => {
                    const position = (item.role && item.role !== 'starter') ? item.role : (item.player.main_position || 'L')
                    return (
                      <div key={item.player.id} className={`p-2 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-1 relative group min-h-[110px] ${data.selectedPlayers.includes(item.player.id) ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`} onClick={() => togglePlayerSelection(item.player.id)} title={`Seleccionar ${item.player.first_name} ${item.player.last_name}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm border-2 border-white mb-1.5 transition-colors flex-shrink-0 ${data.selectedPlayers.includes(item.player.id) ? 'bg-primary-600' : 'bg-gray-900'}`}>{item.jersey_number || '0'}</div>
                        <span title={POSITION_NAMES[position]} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-1 ${position === 'L' ? 'bg-yellow-400 text-yellow-900' : position === 'S' ? 'bg-blue-100 text-blue-800' : position === 'OH' ? 'bg-green-100 text-green-800' : position === 'MB' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>{position}</span>
                        <p className="font-bold text-gray-900 text-xs truncate w-full text-center">{item.player.first_name}</p>
                        {data.selectedPlayers.includes(item.player.id) && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {data.selectedPlayers.length === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">Debes seleccionar al menos una jugadora para este partido</p>
                  </div>
                )}
                {hasExcessLiberos() && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0"><div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center"><span className="text-red-600 font-bold text-sm">!</span></div></div>
                      <div>
                        <p className="text-sm font-medium text-red-800">Demasiadas líberos convocadas</p>
                        <p className="text-sm text-red-700 mt-1">Has seleccionado {getLiberoCount()} líberos. Solo se pueden convocar 2 líberos por partido.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={handlePrevious} className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Anterior</button>
          {currentStep < totalSteps && (
            <button onClick={handleNext} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Siguiente</button>
          )}
          {currentStep === totalSteps && (
            <button onClick={handleCreateMatch} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Crear Partido</button>
          )}
        </div>
      </div>
      {showLiberoValidationModal && (
        <LiberoValidationModal
          isOpen={showLiberoValidationModal}
          liberoCount={getLiberoCount()}
          onClose={() => setShowLiberoValidationModal(false)}
          onNavigateToTeams={handleNavigateToTeams}
        />
      )}
    </div>
  )
}