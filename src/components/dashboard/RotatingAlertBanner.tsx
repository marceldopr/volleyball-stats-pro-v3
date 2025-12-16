import { useState, useEffect } from 'react'
import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react'
import { ClubAlert } from '@/services/clubStatsService'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface RotatingAlertBannerProps {
    alerts: ClubAlert[]
}

export function RotatingAlertBanner({ alerts }: RotatingAlertBannerProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (!alerts || alerts.length === 0) return

        const interval = setInterval(() => {
            if (!isPaused) {
                setCurrentIndex((prev) => (prev + 1) % alerts.length)
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [alerts, isPaused])

    if (!alerts || alerts.length === 0) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900/20 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>Sin alertas activas</span>
            </div>
        )
    }

    const currentAlert = alerts[currentIndex]

    const handleAlertClick = (alert: ClubAlert) => {
        // Navigate based on targetType
        if (alert.targetType === 'team') {
            navigate('/teams')
        } else if (alert.targetType === 'category') {
            navigate('/teams') // Or dedicated category view if exists
        } else if (alert.targetType === 'coach') {
            navigate('/reports/coaches')
        } else {
            // Default fallbacks
            if (alert.id.includes('attendance')) navigate('/trainings')
            if (alert.id.includes('unregistered')) navigate('/trainings')
        }
    }

    return (
        <div
            className="relative overflow-hidden cursor-pointer group transition-all duration-300"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={() => handleAlertClick(currentAlert)}
        >
            <div
                className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg border text-sm font-medium shadow-sm transition-colors duration-300",
                    currentAlert.level === 'danger' && "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/30",
                    currentAlert.level === 'warning' && "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/30",
                    currentAlert.level === 'info' && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/30",
                )}
            >
                {/* Icon */}
                <div className="shrink-0 animate-pulse">
                    {currentAlert.level === 'danger' && <XCircle className="w-4 h-4" />}
                    {currentAlert.level === 'warning' && <AlertTriangle className="w-4 h-4" />}
                    {currentAlert.level === 'info' && <Info className="w-4 h-4" />}
                </div>

                {/* Message */}
                <span className="truncate max-w-[300px] md:max-w-md">
                    {currentAlert.message}
                </span>

                {/* Counter indicator */}
                {alerts.length > 1 && (
                    <span className="ml-auto text-xs opacity-60 font-mono bg-black/5 dark:bg-white/10 px-1.5 rounded">
                        {currentIndex + 1}/{alerts.length}
                    </span>
                )}
            </div>
        </div>
    )
}
