import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'

interface ProtectedRouteProps {
    children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { session, profile, loading } = useAuthStore()
    const { isCoach, loading: roleLoading } = useCurrentUserRole()
    const location = useLocation()

    if (loading || roleLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando...</p>
                </div>
            </div>
        )
    }

    if (!session || !profile) {
        return <Navigate to="/login" replace />
    }

    // Redirect coaches to /teams if they're on the root path
    if (isCoach && location.pathname === '/') {
        return <Navigate to="/teams" replace />
    }

    return <>{children}</>
}
