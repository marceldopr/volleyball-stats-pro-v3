import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { trainingService, TrainingDB } from '@/services/trainingService'
import { teamService } from '@/services/teamService'
import { PlayerDB } from '@/services/playerService'

import { cn } from '@/lib/utils'

interface TeamPlayer extends PlayerDB {
    number?: string | number
    position?: string
}

export function TrainingAttendancePage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [training, setTraining] = useState<TrainingDB | null>(null)
    const [players, setPlayers] = useState<TeamPlayer[]>([])
    const [attendance, setAttendance] = useState<Record<string, { status: 'present' | 'absent' | 'justified', reason: string }>>({})

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return

            try {
                setLoading(true)
                // 1. Get training details
                const trainingData = await trainingService.getTrainingById(id)
                if (!trainingData) {
                    toast.error('Entrenamiento no encontrado')
                    navigate('/')
                    return
                }
                setTraining(trainingData)

                // 2. Get team details (for name)
                // We don't have a direct getTeamById exposed in service easily, but we can fetch it or just rely on roster
                // Let's assume we can get players directly

                // 3. Get Players
                const playersData = await teamService.getTeamPlayers(trainingData.team_id)
                setPlayers((playersData as TeamPlayer[]).sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999)))

                // 4. Get existing attendance if any
                const existingAttendance = await trainingService.getAttendanceByTraining(id)

                // Initialize state
                const initialState: Record<string, any> = {}
                playersData.forEach(p => {
                    const existing = existingAttendance.find(a => a.player_id === p.id)
                    if (existing) {
                        initialState[p.id] = { status: existing.status, reason: existing.reason || '' }
                    } else {
                        // Default to present? Or absent? Let's default to present as requested "Marcar todas" option
                        initialState[p.id] = { status: 'present', reason: '' }
                    }
                })
                setAttendance(initialState)

            } catch (error) {
                console.error('Error loading training:', error)
                toast.error('Error al cargar datos del entrenamiento')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id, navigate])

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

    const handleSave = async () => {
        if (!id) return
        setSaving(true)
        try {
            const records = players.map(p => ({
                training_id: id,
                player_id: p.id,
                status: attendance[p.id].status,
                reason: attendance[p.id].reason || null
            }))

            await trainingService.upsertAttendance(records)
            toast.success('Asistencia guardada correctamente')

            // Optionally redirect back or stay
            // navigate('/') 
        } catch (error) {
            console.error('Error saving attendance:', error)
            toast.error('Error al guardar asistencia')
        } finally {
            setSaving(false)
        }
    }

    const markAllPresent = () => {
        const newState = { ...attendance }
        players.forEach(p => {
            newState[p.id] = { status: 'present', reason: '' }
        })
        setAttendance(newState)
        toast.info('Todas marcadas como presentes')
    }

    if (loading) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
    }

    if (!training) return null

    const trainingDate = new Date(training.date)

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold flex items-center gap-2">
                                Asistencia
                                <span className="text-gray-400 font-normal text-sm">|</span>
                                {training.title || 'Entrenamiento'}
                            </h1>
                            <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {trainingDate.toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {trainingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

                {/* Actions */}
                <div className="flex justify-end">
                    <button
                        onClick={markAllPresent}
                        className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                    >
                        Marcar todas como presentes
                    </button>
                </div>

                {/* Player List */}
                <div className="space-y-3">
                    {players.map(player => {
                        const state = attendance[player.id]
                        const isAbsent = state.status === 'absent'
                        const isJustified = state.status === 'justified'

                        return (
                            <div key={player.id} className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300">
                                        {player.number}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">
                                            {player.first_name} {player.last_name}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalise">{player.position}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:items-end gap-3">
                                    {/* Status Selector */}
                                    <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                        <button
                                            onClick={() => handleStatusChange(player.id, 'present')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                                                state.status === 'present'
                                                    ? "bg-green-500/20 text-green-400 shadow-sm"
                                                    : "text-gray-400 hover:text-gray-300"
                                            )}
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Presente
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(player.id, 'absent')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                                                state.status === 'absent'
                                                    ? "bg-red-500/20 text-red-400 shadow-sm"
                                                    : "text-gray-400 hover:text-gray-300"
                                            )}
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Ausente
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(player.id, 'justified')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                                                state.status === 'justified'
                                                    ? "bg-yellow-500/20 text-yellow-400 shadow-sm"
                                                    : "text-gray-400 hover:text-gray-300"
                                            )}
                                        >
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Justif.
                                        </button>
                                    </div>

                                    {/* Reason Input */}
                                    {(isAbsent || isJustified) && (
                                        <input
                                            type="text"
                                            placeholder="Motivo de ausencia..."
                                            value={state.reason}
                                            onChange={(e) => handleReasonChange(player.id, e.target.value)}
                                            className="w-full sm:w-64 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-primary-500 placeholder-gray-600"
                                        />
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
