import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { coachHistoryService } from '@/services/coachHistoryService'
import type { CoachSeasonHistory } from '@/types/Coach'

interface CoachHistorialEquiposProps {
    coachId: string
}

export function CoachHistorialEquipos({ coachId }: CoachHistorialEquiposProps) {
    const [history, setHistory] = useState<CoachSeasonHistory[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadHistory()
    }, [coachId])

    const loadHistory = async () => {
        setLoading(true)
        try {
            const data = await coachHistoryService.getCoachHistory(coachId)
            setHistory(data)
        } catch (error) {
            console.error('Error loading coach history:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
        )
    }

    if (history.length === 0) {
        return (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Sin historial</h3>
                <p className="text-gray-400">
                    Este entrenador no tiene equipos asignados en temporadas anteriores.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {history.map((season) => (
                <div key={season.season_id} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">{season.season_name}</h3>

                    <div className="space-y-3">
                        {season.teams.map((team, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                            >
                                <div>
                                    <p className="font-medium text-white">{team.team_name}</p>
                                    <p className="text-sm text-gray-400">
                                        Rol: {team.role_in_team === 'head' ? 'Entrenador Principal' :
                                            team.role_in_team === 'assistant' ? 'Asistente' :
                                                team.role_in_team === 'pf' ? 'Preparador Físico' : 'Otro'}
                                    </p>
                                </div>
                                {(team.date_from || team.date_to) && (
                                    <div className="text-sm text-gray-400">
                                        {team.date_from && new Date(team.date_from).toLocaleDateString('es-ES')}
                                        {team.date_from && team.date_to && ' - '}
                                        {team.date_to && new Date(team.date_to).toLocaleDateString('es-ES')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
