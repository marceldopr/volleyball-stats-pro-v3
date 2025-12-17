import { useEffect, useState } from 'react'
import { getRecentActivities, ActivityItem } from '@/services/activityService'
import { BarChart, Activity, Trophy, Clock, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface RecentActivityFeedProps {
    clubId: string
}

export function RecentActivityFeed({ clubId }: RecentActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadActivities()
    }, [clubId])

    const loadActivities = async () => {
        setLoading(true)
        try {
            const data = await getRecentActivities(clubId, 10)
            setActivities(data)
        } catch (error) {
            console.error('Error loading activities:', error)
        } finally {
            setLoading(false)
        }
    }

    const getActivityIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'evaluation':
                return <BarChart className="w-5 h-5 text-blue-400" />
            case 'training':
                return <Activity className="w-5 h-5 text-green-400" />
            case 'match':
                return <Trophy className="w-5 h-5 text-yellow-400" />
            default:
                return <Clock className="w-5 h-5 text-gray-400" />
        }
    }

    const getRelativeTime = (timestamp: string) => {
        const now = new Date()
        const past = new Date(timestamp)
        const diffMs = now.getTime() - past.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'ahora mismo'
        if (diffMins < 60) return `hace ${diffMins} min`
        if (diffHours < 24) return `hace ${diffHours}h`
        if (diffDays === 1) return 'ayer'
        if (diffDays < 7) return `hace ${diffDays} días`
        return past.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    }

    if (loading) {
        return (
            <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-4">
                <h3 className="text-base font-semibold text-white mb-3">Última actividad registrada</h3>
                <div className="text-center text-gray-400 py-4 text-sm">
                    Cargando...
                </div>
            </div>
        )
    }

    if (activities.length === 0) {
        return (
            <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-4">
                <h3 className="text-base font-semibold text-white mb-3">Última actividad registrada</h3>
                <div className="text-center text-gray-400 py-4 text-sm">
                    No hay actividad reciente
                </div>
            </div>
        )
    }

    // Show only first 3 activities
    const recentActivities = activities.slice(0, 3)

    return (
        <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">Última actividad registrada</h3>
            </div>

            {/* Compact activity list */}
            <div className="space-y-2">
                {recentActivities.map((activity) => (
                    <div
                        key={`${activity.type}-${activity.id}`}
                        className="flex items-center gap-2 text-sm"
                    >
                        {/* Icon */}
                        <div className="flex-shrink-0">
                            {getActivityIcon(activity.type)}
                        </div>

                        {/* Content - single line */}
                        <div className="flex-1 min-w-0 flex items-center gap-2 text-gray-300">
                            <span className="truncate">{activity.description}</span>
                            {activity.teamName && (
                                <>
                                    <span className="text-gray-500">·</span>
                                    <span className="text-gray-400 truncate">{activity.teamName}</span>
                                </>
                            )}
                        </div>

                        {/* Time */}
                        <span className="flex-shrink-0 text-xs text-gray-500">
                            {getRelativeTime(activity.timestamp)}
                        </span>

                        {/* Link arrow */}
                        {activity.link && (
                            <Link
                                to={activity.link}
                                className="flex-shrink-0 text-gray-500 hover:text-primary-400 transition-colors"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {/* CTA button - only show if more than 3 activities */}
            {activities.length > 3 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                    <button
                        onClick={() => {
                            // TODO: Navigate to full activity page
                            console.log('Ver toda la actividad')
                        }}
                        className="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                    >
                        Ver toda la actividad
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
