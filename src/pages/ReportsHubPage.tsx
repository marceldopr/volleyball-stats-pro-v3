import { useNavigate } from 'react-router-dom'
import { Users, FileText, Briefcase, Activity, Shield, Trophy } from 'lucide-react'
import { useRoleScope } from '@/hooks/useRoleScope'
import { clsx } from 'clsx'
import { useEffect } from 'react'

export function ReportsHubPage() {
    const navigate = useNavigate()
    const { isDT } = useRoleScope()

    // Debug log to confirm role resolution
    useEffect(() => {
        console.log('[ReportsHubPage] Mounted. isDT:', isDT)
    }, [isDT])

    const sections = [
        {
            id: 'players',
            title: 'Jugadoras',
            description: 'Evaluaciones individuales, progreso y rendimiento detallado.',
            icon: Users,
            color: 'bg-blue-500',
            href: '/reports/players',
            visible: true // DT & Coach
        },
        {
            id: 'teams',
            title: 'Equipos',
            description: 'Planes de temporada, resúmenes de fase y objetivos.',
            icon: Shield,
            color: 'bg-indigo-500',
            href: '/reports/team-plans',
            visible: true // DT & Coach (filtered by assignments)
        },
        {
            id: 'matches',
            title: 'Partidos',
            description: 'Análisis post-partido, estadísticas y flujo de juego.',
            icon: Activity,
            color: 'bg-emerald-500',
            href: '/matches', // Changed to /matches as it is safer
            visible: true
        },
        {
            id: 'staff',
            title: 'Staff',
            description: 'Informes de entrenador, asistencia y KPIs del cuerpo técnico.',
            icon: Briefcase,
            color: 'bg-amber-500',
            href: '/reports/coaches',
            visible: isDT // DT Only
        },
        {
            id: 'club',
            title: 'Club Dashboard',
            description: 'Visión global del club, rankings y estado general.',
            icon: Trophy,
            color: 'bg-purple-500',
            href: '/club/dashboard',
            visible: isDT // DT Only
        }
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Centro de Informes
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Acceso centralizado a toda la documentación y análisis del club
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections
                        .filter(section => section.visible)
                        .map((section) => (
                            <div
                                key={section.id}
                                onClick={() => navigate(section.href)}
                                className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md hover:border-primary-500/50 transition-all duration-200"
                            >
                                <div className="flex items-start gap-5">
                                    <div className={clsx(
                                        "p-4 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-200",
                                        section.color,
                                        "text-white"
                                    )}>
                                        <section.icon className="w-8 h-8" />
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                            {section.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                                            {section.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Arrow hint */}
                                <div className="absolute bottom-6 right-6 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    )
}
