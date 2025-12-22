import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Link2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { useCoachStore } from '@/stores/coachStore'
import { useSeasonStore } from '@/stores/seasonStore'
import { coachService } from '@/services/coachService'
import type { CoachDB } from '@/types/Coach'
import { Button } from '@/components/ui/Button'
import { CoachCard } from '@/components/coaches/CoachCard'
import { PendingCoachCard } from '@/components/coaches/PendingCoachCard'
import { GenerateSignupLinkModal } from '@/components/coaches/GenerateSignupLinkModal'
import { toast } from 'sonner'

export function Coaches() {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isAdmin } = useCurrentUserRole()
    const { coachesWithTeams, loading, loadCoachesWithTeams } = useCoachStore()
    const { activeSeasonId } = useSeasonStore()
    const [showSignupLinkModal, setShowSignupLinkModal] = useState(false)
    const [pendingCoaches, setPendingCoaches] = useState<CoachDB[]>([])

    // Access control
    useEffect(() => {
        if (!isDT && !isAdmin) {
            navigate('/')
            toast.error('No tienes permisos para acceder a esta página')
        }
    }, [isDT, isAdmin, navigate])

    const loadPendingCoaches = async () => {
        if (!profile?.club_id) return
        try {
            const pending = await coachService.getPendingCoaches(profile.club_id)
            setPendingCoaches(pending)
        } catch (error) {
            console.error('Error loading pending coaches:', error)
        }
    }

    // Load coaches and pending
    useEffect(() => {
        if (profile?.club_id && activeSeasonId) {
            loadCoachesWithTeams(profile.club_id, activeSeasonId)
            loadPendingCoaches()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.club_id, activeSeasonId])



    const handleViewCoach = (coachId: string) => {
        navigate(`/coaches/${coachId}`)
    }

    if (!isDT && !isAdmin) {
        return null
    }

    return (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-6 lg:pt-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary-600" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entrenadores</h1>
                    </div>
                    <Button variant="primary" size="md" icon={Link2} onClick={() => setShowSignupLinkModal(true)}>
                        Generar enlace de registro
                    </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gestiona los entrenadores del club y visualiza sus fichas completas
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
            ) : (
                <>
                    {/* Pending Coaches Section */}
                    {pendingCoaches.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded text-sm">
                                    {pendingCoaches.length}
                                </span>
                                Pendientes de aprobación
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {pendingCoaches.map(coach => (
                                    <PendingCoachCard
                                        key={coach.id}
                                        coach={coach}
                                        onApprove={async () => {
                                            await coachService.approveCoach(coach.id)
                                            toast.success('Entrenador aprobado')
                                            await loadPendingCoaches()
                                            if (profile?.club_id && activeSeasonId) {
                                                loadCoachesWithTeams(profile.club_id, activeSeasonId)
                                            }
                                        }}
                                        onReject={async () => {
                                            await coachService.rejectCoach(coach.id)
                                            toast.success('Entrenador rechazado')
                                            await loadPendingCoaches()
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Coaches */}
                    {coachesWithTeams.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-700 p-12 text-center">
                            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                No hay entrenadores
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Genera un enlace de registro para invitar entrenadores
                            </p>
                            <Button variant="primary" size="md" onClick={() => setShowSignupLinkModal(true)}>
                                Generar enlace de registro
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Entrenadores Activos</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {coachesWithTeams.map(coach => (
                                    <CoachCard
                                        key={coach.id}
                                        coach={coach}
                                        onViewProfile={() => handleViewCoach(coach.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}



            {/* Generate Signup Link Modal */}
            {showSignupLinkModal && (
                <GenerateSignupLinkModal
                    onClose={() => setShowSignupLinkModal(false)}
                />
            )}
        </div>
    )
}
