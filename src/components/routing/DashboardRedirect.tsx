import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { Dashboard } from '@/pages/Dashboard'
import { Loader2 } from 'lucide-react'

export function DashboardRedirect() {
    const { isCoach, loading } = useCurrentUserRole()
    const navigate = useNavigate()

    useEffect(() => {
        if (!loading && isCoach) {
            navigate('/teams', { replace: true })
        }
    }, [isCoach, loading, navigate])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
        )
    }

    // If not a coach, show the standard Dashboard
    if (!isCoach) {
        return <Dashboard />
    }

    // While redirecting
    return null
}
