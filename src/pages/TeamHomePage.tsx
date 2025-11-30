import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, TrendingUp, Users, Trophy, Plus, Loader2 } from 'lucide-react'
import { teamStatsService, CurrentPhaseInfo, RecentActivity, TeamStats } from '@/services/teamStatsService'
import { seasonService } from '@/services/seasonService'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

export function TeamHomePage() {
    const { teamId } = useParams<{ teamId: string }>()
    const navigate = useNavigate()
    const { profile } = useAuthStore()

    const [loading, setLoading] = useState(true)
    const [currentPhase, setCurrentPhase] = useState<CurrentPhaseInfo | null>(null)
    const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null)
    const [teamStats, setTeamStats] = useState<TeamStats | null>(null)

    useEffect(() => {
        loadHomeData()
    }, [teamId])

    const loadHomeData = async () => {
        if (!teamId || !profile?.club_id) return

        setLoading(true)
        try {
            // Get current season
            const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
            if (!season) {
                toast.error('No hay temporada activa')
                setLoading(false)
                return
            }

            // Load all data in parallel
            const [phaseData, activityData, statsData] = await Promise.all([
                teamStatsService.getCurrentPhase(teamId, season.id),
                teamStatsService.getRecentActivity(teamId, season.id),
                teamStatsService.getTeamStats(teamId, season.id)
            ])

            setCurrentPhase(phaseData)
            setRecentActivity(activityData)
            setTeamStats(statsData)
        } catch (error) {
            console.error('Error loading home data:', error)
            toast.error('Error al cargar los datos del equipo')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateMatch = () => {
        navigate('/matches/new')
    }

    const handleCreateTraining = () => {
        // TODO: Implement training creation flow
        toast.info('Funcionalidad de entrenamientos próximamente')
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    const getPhaseColor = (phase: number) => {
        switch (phase) {
            case 1: return 'emerald'
            case 2: return 'orange'
            case 3: return 'blue'
            default: return 'gray'
        }
    }

    const phaseColor = currentPhase ? getPhaseColor(currentPhase.phaseNumber) : 'gray'

    return (
        <div className="space-y-6">
            {/* 1️⃣ Current Phase Status */}
            {currentPhase && (
                <div className={`bg-${phaseColor}-500/10 border border-${phaseColor}-500/30 rounded-xl p-6`}>
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full bg-${phaseColor}-500/20 flex items-center justify-center flex-shrink-0`}>
                            <TrendingUp className={`w-6 h-6 text-${phaseColor}-400`} />
                        </div>
                        <div className="flex-1">
                            <h2 className={`text-xl font-bold text-${phaseColor}-400 mb-2`}>
                                🟢 Fase {currentPhase.phaseNumber} — {currentPhase.phaseName}
                            </h2>
                            <p className="text-gray-300 mb-1">
                                <span className="font-medium">Prioridad:</span> {currentPhase.technicalPriority}
                            </p>
                            <p className="text-gray-300">
                                <span className="font-medium">KPI:</span> {currentPhase.kpiTarget}
                                {currentPhase.kpiCurrent && (
                                    <span className="ml-2 text-sm text-gray-400">
                                        (Actual: {currentPhase.kpiCurrent}%)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 2️⃣ Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={handleCreateTraining}
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl p-6 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold mb-1">Crear Entrenamiento</h3>
                            <p className="text-sm text-blue-100">Registrar nueva sesión</p>
                        </div>
                        <Plus className="w-6 h-6 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>

                <button
                    onClick={handleCreateMatch}
                    className="group relative overflow-hidden bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl p-6 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Trophy className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold mb-1">Crear Partido</h3>
                            <p className="text-sm text-orange-100">Programar nuevo encuentro</p>
                        </div>
                        <Plus className="w-6 h-6 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 3️⃣ Recent Activity */}
                {recentActivity && (
                    <div className="bg-gray-800 border border-gray-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            Actividad Reciente
                        </h3>
                        <div className="space-y-4">
                            {recentActivity.lastMatch && (
                                <div className="flex items-start gap-3 pb-4 border-b border-gray-700/50">
                                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-400">{new Date(recentActivity.lastMatch.date).toLocaleDateString('es-ES')}</p>
                                        <p className="text-white font-medium">
                                            vs {recentActivity.lastMatch.opponent}
                                        </p>
                                        <p className={`text-sm ${recentActivity.lastMatch.result === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {recentActivity.lastMatch.score}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {recentActivity.lastTraining && (
                                <div className="flex items-start gap-3 pb-4 border-b border-gray-700/50">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-400">{new Date(recentActivity.lastTraining.date).toLocaleDateString('es-ES')}</p>
                                        <p className="text-white font-medium">Entrenamiento</p>
                                        <p className="text-sm text-gray-400">
                                            {recentActivity.lastTraining.attendance}/{recentActivity.lastTraining.totalPlayers} jugadoras — {Math.round((recentActivity.lastTraining.attendance / recentActivity.lastTraining.totalPlayers) * 100)}% asistencia
                                        </p>
                                    </div>
                                </div>
                            )}

                            {recentActivity.nextMatch && (
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-400">{new Date(recentActivity.nextMatch.date).toLocaleDateString('es-ES')}</p>
                                        <p className="text-white font-medium">
                                            Próximo partido
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            vs {recentActivity.nextMatch.opponent}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!recentActivity.lastMatch && !recentActivity.lastTraining && !recentActivity.nextMatch && (
                                <p className="text-gray-400 text-center py-4">No hay actividad reciente</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 4️⃣ Team Stats */}
                {teamStats && (
                    <div className="bg-gray-800 border border-gray-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-400" />
                            Estadísticas Esenciales
                        </h3>
                        <div className="space-y-4">
                            {teamStats.attendanceAverage > 0 ? (
                                <>
                                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                                        <span className="text-gray-300">Asistencia</span>
                                        <span className="text-2xl font-bold text-white">{teamStats.attendanceAverage}%</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                                        <span className="text-gray-300">Ratio puntos/error</span>
                                        <span className="text-2xl font-bold text-white">{teamStats.pointsErrorRatio.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                                        <span className="text-gray-300">Recepción efectiva</span>
                                        <span className="text-2xl font-bold text-white">{teamStats.receptionEffectiveness}%</span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-400 text-center py-4">No hay estadísticas disponibles</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
