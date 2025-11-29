import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, CheckCircle, AlertCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { teamService, TeamDB } from '@/services/teamService'
import { seasonService, SeasonDB } from '@/services/seasonService'
import { teamSeasonPhaseService, TeamSeasonPhaseDB } from '@/services/teamSeasonPhaseService'
import { phaseEvaluationService, PhaseEvaluationDB } from '@/services/phaseEvaluationService'
import { toast } from 'sonner'

interface TeamWithPhases {
    team: TeamDB
    phases: TeamSeasonPhaseDB[]
    evaluations: Record<string, PhaseEvaluationDB>
    latestEvaluation: PhaseEvaluationDB | null
}

export function ClubDashboardPage() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isAdmin } = useCurrentUserRole()

    const [loading, setLoading] = useState(true)
    const [currentSeason, setCurrentSeason] = useState<SeasonDB | null>(null)
    const [teamsData, setTeamsData] = useState<TeamWithPhases[]>([])

    useEffect(() => {
        // Access control: only DT and Admin
        if (!isDT && !isAdmin) {
            toast.error('No tienes permisos para acceder a este dashboard')
            navigate('/teams')
            return
        }

        const fetchData = async () => {
            if (!profile?.club_id) return

            try {
                setLoading(true)

                // Get current season
                const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                if (!season) {
                    toast.error('No hay temporada activa')
                    return
                }
                setCurrentSeason(season)

                // Get all teams for this season
                const teams = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)

                // For each team, get phases and evaluations
                const teamsWithData: TeamWithPhases[] = await Promise.all(
                    teams.map(async (team) => {
                        const phases = await teamSeasonPhaseService.getPhasesByTeamAndSeason(team.id, season.id)
                        const allEvaluations = await phaseEvaluationService.getEvaluationsByTeamAndSeason(team.id, season.id)

                        const evaluationsMap: Record<string, PhaseEvaluationDB> = {}
                        allEvaluations.forEach(evaluation => {
                            evaluationsMap[evaluation.phase_id] = evaluation
                        })

                        // Get latest evaluation (highest phase number with evaluation)
                        const phasesWithEval = phases.filter(p => evaluationsMap[p.id])
                        const latestPhase = phasesWithEval.sort((a, b) => b.phase_number - a.phase_number)[0]
                        const latestEvaluation = latestPhase ? evaluationsMap[latestPhase.id] : null

                        return {
                            team,
                            phases,
                            evaluations: evaluationsMap,
                            latestEvaluation
                        }
                    })
                )

                setTeamsData(teamsWithData)
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
                toast.error('Error al cargar el dashboard')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [profile?.club_id, isDT, isAdmin, navigate])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Cumplido':
                return <CheckCircle className="w-5 h-5 text-green-600" />
            case 'Parcial':
                return <AlertCircle className="w-5 h-5 text-yellow-600" />
            case 'No Cumplido':
                return <XCircle className="w-5 h-5 text-red-600" />
            default:
                return <Minus className="w-5 h-5 text-gray-400" />
        }
    }

    const getTrendIcon = (trend: string | null) => {
        switch (trend) {
            case 'improving':
                return <TrendingUp className="w-5 h-5 text-green-600" />
            case 'declining':
                return <TrendingDown className="w-5 h-5 text-red-600" />
            case 'stable':
                return <Minus className="w-5 h-5 text-gray-600" />
            default:
                return <Minus className="w-5 h-5 text-gray-400" />
        }
    }

    const getTrendLabel = (trend: string | null) => {
        switch (trend) {
            case 'improving':
                return '↑'
            case 'declining':
                return '↓'
            case 'stable':
                return '—'
            default:
                return '—'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Cargando dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-8 h-8 text-emerald-500" />
                    <h1 className="text-3xl font-bold text-gray-100 dark:text-white">Dashboard Club</h1>
                </div>
                <p className="text-gray-400 dark:text-gray-400">
                    Vista estratégica de la evolución de todos los equipos • {currentSeason?.name}
                </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-gray-800/20 rounded-lg border border-gray-700/50">
                <table className="w-full">
                    <thead className="bg-gray-800/30 dark:bg-gray-900/30 border-b border-gray-700/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                Equipo
                            </th>
                            <th className="px-4 py-4 text-center text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                F1
                            </th>
                            <th className="px-4 py-4 text-center text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                F2
                            </th>
                            <th className="px-4 py-4 text-center text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                F3
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                Problema Dominante
                            </th>
                            <th className="px-4 py-4 text-center text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                Tendencia
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                        {teamsData.map(({ team, phases, evaluations, latestEvaluation }) => {
                            // Get evaluations for first 3 phases
                            const phase1 = phases.find(p => p.phase_number === 1)
                            const phase2 = phases.find(p => p.phase_number === 2)
                            const phase3 = phases.find(p => p.phase_number === 3)

                            const eval1 = phase1 ? evaluations[phase1.id] : null
                            const eval2 = phase2 ? evaluations[phase2.id] : null
                            const eval3 = phase3 ? evaluations[phase3.id] : null

                            return (
                                <tr key={team.id} className="hover:bg-slate-700/30 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-100 dark:text-white">{team.name}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-400">{team.category_stage}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {eval1 ? getStatusIcon(eval1.status) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {eval2 ? getStatusIcon(eval2.status) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {eval3 ? getStatusIcon(eval3.status) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {latestEvaluation?.dominant_weakness ? (
                                            <span className="text-sm text-gray-200 dark:text-gray-200 font-medium">
                                                {latestEvaluation.dominant_weakness}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-500 dark:text-gray-500 italic">Sin evaluar</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {getTrendIcon(latestEvaluation?.trend || null)}
                                            <span className="text-sm font-medium text-gray-200 dark:text-gray-200">
                                                {getTrendLabel(latestEvaluation?.trend || null)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {teamsData.length === 0 && (
                <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <BarChart3 className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-200 dark:text-white">No hay equipos</h3>
                    <p className="text-gray-400 dark:text-gray-400 mt-1">Crea equipos para ver el dashboard del club.</p>
                </div>
            )}

            {/* Legend */}
            <div className="mt-6 bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
                <h3 className="text-sm font-bold text-gray-200 dark:text-gray-200 mb-3">Leyenda</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-gray-300 dark:text-gray-300">Cumplido</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-gray-300 dark:text-gray-300">Parcial</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-gray-300 dark:text-gray-300">No Cumplido</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Minus className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-300 dark:text-gray-300">Sin evaluar</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-gray-300 dark:text-gray-300">Mejorando ↑</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Minus className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-300 dark:text-gray-300">Estable —</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <span className="text-gray-300 dark:text-gray-300">Empeorando ↓</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

