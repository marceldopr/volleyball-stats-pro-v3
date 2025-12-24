
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Users,
    ClipboardList,
    Activity,
    CheckCircle,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { clubStatsService, ClubOverviewSummary } from '@/services/clubStatsService'
import { RotatingAlertBanner } from './RotatingAlertBanner'
import { RecentActivityFeed } from '@/components/home/RecentActivityFeed'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'



export function ClubHomeView() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const [summary, setSummary] = useState<ClubOverviewSummary | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadSummary() {
            if (!profile?.club_id) return
            try {
                setLoading(true)
                const data = await clubStatsService.getOverview(profile.club_id)
                setSummary(data)
            } catch (error) {
                console.error('Error loading club summary:', error)
                toast.error('Error al cargar datos del club')
            } finally {
                setLoading(false)
            }
        }
        loadSummary()
    }, [profile?.club_id])

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                ))}
                <div className="col-span-full h-64 bg-gray-200 dark:bg-gray-800 rounded-xl mt-4"></div>
            </div>
        )
    }

    if (!summary) return null

    // Determine Status Colors for KPIs
    const getAttendanceColor = (val: number | null) => {
        if (val === null) return 'text-gray-400 dark:text-gray-500' // Neutral
        if (val >= 85) return 'text-emerald-500'
        if (val >= 70) return 'text-amber-500'
        return 'text-red-500'
    }

    const attendanceColor = getAttendanceColor(summary.attendanceGlobal)
    const isAttendanceLow = summary.attendanceGlobal !== null && summary.attendanceGlobal < 80
    const hasAttendanceData = summary.attendanceGlobal !== null

    return (
        <div className="space-y-8">
            {/* Header Area with Title and Rotating Alert */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Control Global</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Estado operativo del club en tiempo real</p>
                </div>
                <div className="w-full md:w-auto">
                    <RotatingAlertBanner alerts={summary.alerts} />
                </div>
            </div>

            {/* 1. KPIs Section (4 KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Asistencia Global */}
                <div
                    onClick={() => navigate('/trainings')}
                    className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-primary-500 transition-colors">Asistencia Global</h3>
                        <Users className={cn("w-5 h-5", attendanceColor)} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={cn("text-3xl font-bold", attendanceColor)}>
                            {hasAttendanceData ? `${summary.attendanceGlobal}%` : '--'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {hasAttendanceData ? (
                            <>
                                Media últimos 30 días
                                {isAttendanceLow && <span className="text-red-500 ml-1 font-medium">(Baja)</span>}
                            </>
                        ) : (
                            "Sin datos suficientes (30d)"
                        )}
                    </p>
                </div>

                {/* KPI 2: Manca de Actividad (Moved to 2nd position) */}
                <div
                    onClick={() => navigate('/teams')}
                    className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-primary-500 transition-colors">Manca de Actividad</h3>
                        <Activity className={cn("w-5 h-5", summary.inactiveTeamsCount > 0 ? "text-amber-500" : "text-emerald-500")} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={cn("text-3xl font-bold", summary.inactiveTeamsCount > 0 ? "text-amber-500" : "text-gray-900 dark:text-white")}>
                            {summary.inactiveTeamsCount}
                        </span>
                        <span className="text-sm text-gray-500">equipos</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Sin confirmar asistencia &gt; 7d
                    </p>
                </div>

                {/* KPI 3: Entrenamientos sin registrar (Moved to 3rd position) */}
                <div
                    onClick={() => navigate('/trainings')}
                    className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-primary-500 transition-colors">Entrenos sin registro</h3>
                        <ClipboardList className={cn("w-5 h-5", summary.unregisteredTrainingsCount > 0 ? (summary.unregisteredTrainingsCount > 2 ? "text-red-500" : "text-amber-500") : "text-emerald-500")} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={cn("text-3xl font-bold", summary.unregisteredTrainingsCount > 0 ? (summary.unregisteredTrainingsCount > 2 ? "text-red-500" : "text-amber-500") : "text-gray-900 dark:text-white")}>
                            {summary.unregisteredTrainingsCount}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Pendientes confirmación (7d)
                    </p>
                </div>

                {/* KPI 4: Equipos Desequilibrados (Moved to 4th Position) */}
                <div
                    onClick={() => navigate('/teams')}
                    className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-primary-500 transition-colors">Plantillas Críticas</h3>
                        <Users className={cn("w-5 h-5", summary.imbalancedTeamsCount > 0 ? "text-red-500" : "text-emerald-500")} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={cn("text-3xl font-bold", summary.imbalancedTeamsCount > 0 ? "text-red-500" : "text-gray-900 dark:text-white")}>
                            {summary.imbalancedTeamsCount}
                        </span>
                        <span className="text-sm text-gray-500">equipos</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Con &lt; 9 jugadoras
                    </p>
                </div>
            </div>

            {/* 2. Recent Activity Feed */}
            {profile?.club_id && <RecentActivityFeed clubId={profile.club_id} />}

            {/* 3. Problem Coaches (Compact Table Style) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alertas de Staff</h3>
                    <button
                        onClick={() => navigate('/reports/coaches')}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                    >
                        Ver todos
                    </button>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {summary.coaches.filter(c => (c.reportsCompletion || 0) < 50).length > 0 ? (
                        <>
                            {summary.coaches
                                .filter(c => (c.reportsCompletion || 0) < 50)
                                .slice(0, 5) // Max 5 rows
                                .map(coach => (
                                    <div key={coach.id} className="px-6 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors h-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white w-40 truncate">{coach.name}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-4 w-24">
                                                {coach.teamsCount} {coach.teamsCount === 1 ? 'equipo' : 'equipos'}
                                            </span>
                                        </div>
                                        <span className="text-sm text-red-600 dark:text-red-400 font-mono font-medium">
                                            {coach.reportsCompletion}% informes
                                        </span>
                                    </div>
                                ))}
                            {summary.coaches.filter(c => (c.reportsCompletion || 0) < 50).length > 5 && (
                                <div className="px-6 py-2 text-xs text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                                    Ver {summary.coaches.filter(c => (c.reportsCompletion || 0) < 50).length - 5} alertas más...
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="px-4 py-3 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Todo el staff al día</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
