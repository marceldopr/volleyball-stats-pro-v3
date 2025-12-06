import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Users, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { trainingService } from '@/services/trainingService'
import { teamService, TeamDB } from '@/services/teamService'
import { PlayerDB } from '@/services/playerService'
import { cn } from '@/lib/utils'

interface CreateTrainingModalProps {
    isOpen: boolean
    onClose: () => void
    activeTeamId?: string | null
    availableTeams: TeamDB[]
}

interface AttendanceState {
    status: 'present' | 'absent' | 'justified'
    reason: string
}

export function CreateTrainingModal({ isOpen, onClose, activeTeamId, availableTeams }: CreateTrainingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [time, setTime] = useState(() => {
        const now = new Date()
        const minutes = now.getMinutes()
        now.setMinutes(minutes < 30 ? 30 : 0)
        if (minutes >= 30) now.setHours(now.getHours() + 1)
        return now.toTimeString().slice(0, 5)
    })
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')

    // Attendance State
    const [players, setPlayers] = useState<PlayerDB[]>([])
    const [attendance, setAttendance] = useState<Record<string, AttendanceState>>({})
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)

    // Initialize selected team
    useEffect(() => {
        if (isOpen) {
            if (activeTeamId && activeTeamId !== 'club') {
                setSelectedTeamId(activeTeamId)
            } else if (availableTeams.length > 0) {
                setSelectedTeamId(availableTeams[0].id)
            }
        }
    }, [isOpen, activeTeamId, availableTeams])

    // Fetch players when team changes
    useEffect(() => {
        const fetchPlayers = async () => {
            if (!selectedTeamId) {
                setPlayers([])
                setAttendance({})
                return
            }

            setIsLoadingPlayers(true)
            try {
                const teamPlayers = await teamService.getTeamPlayers(selectedTeamId)
                setPlayers(teamPlayers)

                // Initialize attendance as 'present' for all
                const initialAttendance: Record<string, AttendanceState> = {}
                teamPlayers.forEach(p => {
                    initialAttendance[p.id] = { status: 'present', reason: '' }
                })
                setAttendance(initialAttendance)
            } catch (error) {
                console.error('Error fetching players:', error)
                toast.error('Error al cargar jugadoras')
            } finally {
                setIsLoadingPlayers(false)
            }
        }

        fetchPlayers()
    }, [selectedTeamId])

    if (!isOpen) return null

    const handleStatusChange = (playerId: string, status: 'present' | 'absent' | 'justified') => {
        setAttendance(prev => ({
            ...prev,
            [playerId]: { ...prev[playerId], status }
        }))
    }

    const handleReasonChange = (playerId: string, reason: string) => {
        setAttendance(prev => ({
            ...prev,
            [playerId]: { ...prev[playerId], reason }
        }))
    }

    const markAllPresent = () => {
        const newState = { ...attendance }
        players.forEach(p => {
            newState[p.id] = { status: 'present', reason: '' }
        })
        setAttendance(newState)
        toast.info('Todas marcadas como presentes')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTeamId) {
            toast.error('Debes seleccionar un equipo')
            return
        }

        setIsSubmitting(true)
        try {
            const startDateTime = new Date(`${date}T${time}`)

            // 1. Create Training
            const training = await trainingService.createTraining({
                team_id: selectedTeamId,
                date: startDateTime.toISOString()
            })

            // 2. Save Attendance
            const attendanceRecords = players.map(p => ({
                training_id: training.id,
                player_id: p.id,
                status: attendance[p.id].status,
                reason: attendance[p.id].reason || null
            }))

            await trainingService.upsertAttendance(attendanceRecords)

            toast.success('Entrenamiento y asistencia guardados correctamente')
            onClose()

        } catch (error) {
            console.error('Error creating training/attendance:', error)
            toast.error('Error al guardar el entrenamiento')
        } finally {
            setIsSubmitting(false)
        }
    }

    const isTeamLocked = !!(activeTeamId && activeTeamId !== 'club')

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary-500" />
                        Crear Entrenamiento
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Top Section: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Equipo
                            </label>
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                disabled={isTeamLocked}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <option value="" disabled>Selecciona un equipo</option>
                                {availableTeams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.category} {team.gender === 'male' ? 'Masc' : team.gender === 'female' ? 'Fem' : 'Mixto'} - {team.custom_name || 'Sin nombre'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    className="w-full pl-9 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Hora
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                    className="w-full pl-9 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Attendance Section */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Asistencia</h3>
                            {players.length > 0 && (
                                <button
                                    onClick={markAllPresent}
                                    className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium transition-colors"
                                >
                                    Marcar todas como presentes
                                </button>
                            )}
                        </div>

                        {!selectedTeamId ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                Selecciona un equipo para ver las jugadoras
                            </div>
                        ) : isLoadingPlayers ? (
                            <div className="py-8 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                            </div>
                        ) : players.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No hay jugadoras en este equipo
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {players.map(player => {
                                    const state = attendance[player.id] || { status: 'present', reason: '' }
                                    return (
                                        <div key={player.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-100 dark:border-gray-700">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {player.first_name} {player.last_name}
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                                <div className="flex bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                                    {(['present', 'absent', 'justified'] as const).map((status) => (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            onClick={() => handleStatusChange(player.id, status)}
                                                            className={cn(
                                                                "px-3 py-1 rounded-md text-sm font-medium transition-all",
                                                                state.status === status
                                                                    ? status === 'present'
                                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shadow-sm"
                                                                        : status === 'absent'
                                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shadow-sm"
                                                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 shadow-sm"
                                                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                            )}
                                                        >
                                                            {status === 'present' ? 'Presente' : status === 'absent' ? 'Ausente' : 'Justif.'}
                                                        </button>
                                                    ))}
                                                </div>

                                                {(state.status === 'absent' || state.status === 'justified') && (
                                                    <input
                                                        type="text"
                                                        placeholder="Motivo..."
                                                        value={state.reason}
                                                        onChange={(e) => handleReasonChange(player.id, e.target.value)}
                                                        className="w-full sm:w-48 text-sm px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-white dark:bg-gray-800 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Guardando...' : (
                            <>
                                <Check className="w-4 h-4" />
                                Guardar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
