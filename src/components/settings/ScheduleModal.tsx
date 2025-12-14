import { X, Clock, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { TrainingSchedule } from '@/types/trainingScheduleTypes'
import { Button } from '@/components/ui/Button'

interface ScheduleModalProps {
    isOpen: boolean
    onClose: () => void
    schedule?: TrainingSchedule
    preselectedTeam?: { id: string, name: string }
    onSave?: (schedule: Partial<TrainingSchedule>) => void
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MOCK_TEAMS = ['Cadete F', 'Cadete M', 'Junior F', 'Junior M', 'Senior F', 'Senior M']
const MOCK_SPACES = ['Pista 1', 'Pista 2', 'Pista 3', 'Gimnasio', 'Patio exterior']

export function ScheduleModal({ isOpen, onClose, schedule, preselectedTeam, onSave }: ScheduleModalProps) {
    const [teamName, setTeamName] = useState(schedule?.teamName || preselectedTeam?.name || '')
    const [selectedDays, setSelectedDays] = useState<number[]>(schedule?.days || [])
    const [startTime, setStartTime] = useState(schedule?.startTime || '18:00')
    const [endTime, setEndTime] = useState(schedule?.endTime || '19:30')
    const [preferredSpace, setPreferredSpace] = useState(schedule?.preferredSpace || '')
    const [alternativeSpaces, setAlternativeSpaces] = useState<string[]>(schedule?.alternativeSpaces || [])
    const [period, setPeriod] = useState<'season' | 'custom'>(schedule?.period || 'season')
    const [isActive, setIsActive] = useState(schedule?.isActive ?? true)

    // Update form state when schedule or preselectedTeam prop changes
    useEffect(() => {
        if (schedule) {
            setTeamName(schedule.teamName || '')
            setSelectedDays(schedule.days || [])
            setStartTime(schedule.startTime || '18:00')
            setEndTime(schedule.endTime || '19:30')
            setPreferredSpace(schedule.preferredSpace || '')
            setAlternativeSpaces(schedule.alternativeSpaces || [])
            setPeriod(schedule.period || 'season')
            setIsActive(schedule.isActive ?? true)
        } else if (preselectedTeam) {
            // New schedule for specific team
            setTeamName(preselectedTeam.name)
            setSelectedDays([])
            setStartTime('18:00')
            setEndTime('19:30')
            setPreferredSpace('')
            setAlternativeSpaces([])
            setPeriod('season')
            setIsActive(true)
        } else {
            // Reset form for new schedule (generic)
            setTeamName('')
            setSelectedDays([])
            setStartTime('18:00')
            setEndTime('19:30')
            setPreferredSpace('')
            setAlternativeSpaces([])
            setPeriod('season')
            setIsActive(true)
        }
    }, [schedule, preselectedTeam])

    if (!isOpen) return null

    const handleDayToggle = (dayIndex: number) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(selectedDays.filter(d => d !== dayIndex))
        } else {
            setSelectedDays([...selectedDays, dayIndex].sort())
        }
    }

    const handleAlternativeSpaceToggle = (space: string) => {
        if (alternativeSpaces.includes(space)) {
            setAlternativeSpaces(alternativeSpaces.filter(s => s !== space))
        } else {
            setAlternativeSpaces([...alternativeSpaces, space])
        }
    }

    const handleSave = () => {
        if (onSave) {
            onSave({
                teamName, // Will be correct from state
                days: selectedDays,
                startTime,
                endTime,
                preferredSpace,
                alternativeSpaces,
                period,
                isActive
            })
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary-500" />
                        <h2 className="text-xl font-semibold text-white">
                            {schedule ? 'Editar horario' : (preselectedTeam ? `Asignar horario a ${preselectedTeam.name}` : 'Añadir horario')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6">
                    {/* Team */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Equipo *
                        </label>
                        {preselectedTeam || schedule ? (
                            <input
                                type="text"
                                value={teamName}
                                disabled
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
                            />
                        ) : (
                            <select
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            >
                                <option value="">Selecciona un equipo</option>
                                {MOCK_TEAMS.map((team) => (
                                    <option key={team} value={team}>{team}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Days */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Días de la semana *
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DAY_NAMES.map((day, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleDayToggle(index)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedDays.includes(index)
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Hora inicio *
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Hora fin *
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {/* Preferred Space */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Espacio preferido *
                        </label>
                        <select
                            value={preferredSpace}
                            onChange={(e) => setPreferredSpace(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        >
                            <option value="">Selecciona un espacio</option>
                            {MOCK_SPACES.map((space) => (
                                <option key={space} value={space}>{space}</option>
                            ))}
                        </select>
                    </div>

                    {/* Alternative Spaces */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Espacios alternativos (opcional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {MOCK_SPACES.filter(s => s !== preferredSpace).map((space) => (
                                <button
                                    key={space}
                                    type="button"
                                    onClick={() => handleAlternativeSpaceToggle(space)}
                                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${alternativeSpaces.includes(space)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {space}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Period */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Periodo
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name="period"
                                    checked={period === 'season'}
                                    onChange={() => setPeriod('season')}
                                    className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 focus:ring-primary-500"
                                />
                                <span className="text-white">Temporada actual</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                                <input
                                    type="radio"
                                    name="period"
                                    disabled
                                    className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600"
                                />
                                <span className="text-gray-400">Fechas personalizadas</span>
                                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                                    Pronto
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Activo
                            </label>
                            <p className="text-xs text-gray-500">
                                Los horarios activos se usarán para generar entrenamientos
                            </p>
                        </div>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-primary-500' : 'bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Help Text */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-400">
                            <p className="font-medium mb-1">Generación automática próximamente</p>
                            <p className="text-blue-300/80">
                                Los horarios activos se usarán para generar entrenamientos automáticamente en el calendario.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-700 sticky bottom-0 bg-gray-800">
                    <Button variant="secondary" size="md" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleSave}
                        disabled={!teamName || selectedDays.length === 0 || !preferredSpace}
                    >
                        Guardar
                    </Button>
                </div>
            </div>
        </div>
    )
}
