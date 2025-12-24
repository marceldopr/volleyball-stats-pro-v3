import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * V1 to V2 Redirect Component
 * Intelligently redirects legacy V1 routes to their V2 equivalents
 */
export function V1BlockedRoute() {
    const navigate = useNavigate()
    const params = useParams()

    useEffect(() => {
        const currentPath = window.location.pathname

        // Intelligent redirect based on route pattern
        if (currentPath === '/matches/new') {
            // Legacy "New Match" → Modern "Create Match"
            console.log('🔀 Redirecting: /matches/new → /matches/create')
            navigate('/matches/create', { replace: true })
        } else if (params.id && currentPath.includes('/matches/') && currentPath.includes('/live')) {
            // Legacy "/matches/:id/live" → Modern "/live-match/:id"
            const matchId = params.id
            console.log(`🔀 Redirecting: /matches/${matchId}/live → /live-match/${matchId}`)
            navigate(`/live-match/${matchId}`, { replace: true })
        } else if (params.id) {
            // Generic "/matches/:id" → assume they want live match
            const matchId = params.id
            console.log(`🔀 Redirecting: /matches/${matchId} → /live-match/${matchId}`)
            navigate(`/live-match/${matchId}`, { replace: true })
        } else {
            // Fallback: go to matches list
            console.log('🔀 Redirecting: Unknown legacy route → /matches')
            navigate('/matches', { replace: true })
        }
    }, [navigate, params])

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="text-zinc-400 text-center">
                <div className="text-lg mb-2">Redirigiendo...</div>
                <div className="text-sm">Actualizando a la nueva ruta</div>
            </div>
        </div>
    )
}
