import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingUp, Activity, Users, Loader2, AlertCircle } from 'lucide-react'
import { teamStatsService, AttendanceEvolutionPoint } from '@/services/teamStatsService'
import { seasonService } from '@/services/seasonService'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { TeamAttendanceChart } from '@/components/charts/TeamAttendanceChart'

export function TeamHomePage() {
    const { teamId } = useParams<{ teamId: string }>()
    const { profile } = useAuthStore()

    const [loading, setLoading] = useState(true)
    const [currentPhase] = useState<any | null>(null)
    const [recentActivity] = useState<any | null>(null)
    const [teamStats] = useState<any | null>(null)
    const [attendanceEvolution, setAttendanceEvolution] = useState<AttendanceEvolutionPoint[]>([])
    const [loadingAttendance, setLoadingAttendance] = useState(false)

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

            // Load attendance evolution (last 30 days)
            setLoadingAttendance(true)
            try {
                const endDate = new Date()
                const startDate = new Date()
                startDate.setDate(startDate.getDate() - 30)

                const evolutionData = await teamStatsService.getAttendanceEvolution(
                    teamId,
                    startDate,
                    endDate
                )
                setAttendanceEvolution(evolutionData)
            } catch (error) {
                console.error('Error loading attendance evolution:', error)
                // Don't show error toast, just log it
            } finally {
                setLoadingAttendance(false)
            }

            // Load basic team stats (placeholder)
            // TODO: Implement when full team stats service is available
            setLoading(false)
        } catch (error) {
            console.error('Error loading home data:', error)
            toast.error('Error al cargar los datos del equipo')
        } finally {
            setLoading(false)
        }
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

    // Calculate KPIs from attendance evolution
    const totalTrainingsLast30 = attendanceEvolution.reduce(
        (sum, point) => sum + point.trainingsCount,
        0
    )

    const averageAttendanceLast30 =
        totalTrainingsLast30 > 0
            ? Math.round(
                attendanceEvolution.reduce(
                    (sum, point) => sum + point.attendancePercentage * point.trainingsCount,
                    0
                ) / totalTrainingsLast30
            )
            : null

    return (
        <div className="space-y-6">
            {/* 1️⃣ LEVEL 1 - Estado Actual */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-md">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary-500" />
                    Estado Actual
                </h2>
                {currentPhase ? (
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fase</p>
                            <p className={`text-lg font-semibold text-${phaseColor}-600 dark:text-${phaseColor}-400`}>
                                {currentPhase.phaseName}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Prioridad Principal</p>
                            <p className="text-base text-gray-900 dark:text-white">
                                {currentPhase.technicalPriority || 'Pendiente de definir'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">KPI de la Fase</p>
                            <p className="text-base text-gray-900 dark:text-white">
                                {currentPhase.kpiTarget || 'Pendiente de definir'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-4">
                        <AlertCircle className="w-5 h-5" />
                        <p>No hay planificación activa para este equipo</p>
                    </div>
                )}
            </div>

            {/* 2️⃣ LEVEL 1 - Volumen del Equipo */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-md">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary-500" />
                    Volumen del Equipo
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Asistencia media</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {teamStats?.attendanceAverage ? `${teamStats.attendanceAverage}%` : '—'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Últimos entrenamientos</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Partidos jugados</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">—</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Últimos 30 días</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jugadoras en baja</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">—</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Lesiones o ausencias</p>
                    </div>
                </div>
            </div>

            {/* LEVEL 2 - Context Blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 3️⃣ Rendimiento Deportivo */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        Rendimiento Deportivo
                    </h3>
                    {teamStats && (teamStats.pointsErrorRatio > 0 || teamStats.receptionEffectiveness > 0) ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Ratio puntos/error</span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    {teamStats.pointsErrorRatio.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Recepción efectiva</span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    {teamStats.receptionEffectiveness}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Ataque efectivo</span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    —
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-4">
                            <AlertCircle className="w-5 h-5" />
                            <p>No hay estadísticas disponibles</p>
                        </div>
                    )}
                </div>

                {/* 4️⃣ Tendencia Reciente */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        Tendencia Reciente
                    </h3>
                    {recentActivity?.lastMatch ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex-1">
                                    <span className={`font-semibold ${recentActivity.lastMatch.result === 'win'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : recentActivity.lastMatch.result === 'loss'
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}>
                                        {recentActivity.lastMatch.score}
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                                        vs {recentActivity.lastMatch.opponent}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(recentActivity.lastMatch.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                                Últimos 3 partidos próximamente
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-4">
                            <AlertCircle className="w-5 h-5" />
                            <p>No hay partidos registrados</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 5️⃣ LEVEL 3 - Evolución de Asistencia */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" />
                    Evolución de Asistencia (últimos 30 días)
                </h3>
                <TeamAttendanceChart data={attendanceEvolution} loading={loadingAttendance} />

                {/* Resumen últimos 30 días */}
                {!loadingAttendance && (
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                            <span className="font-semibold">Media últimos 30 días: </span>
                            {averageAttendanceLast30 !== null ? (
                                <span>{averageAttendanceLast30}%</span>
                            ) : (
                                <span>—</span>
                            )}
                        </div>
                        <div>
                            <span className="font-semibold">Entrenamientos en el período: </span>
                            <span>{totalTrainingsLast30}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
