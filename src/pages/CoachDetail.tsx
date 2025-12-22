import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Edit, FileText, Calendar, BarChart, Users as UsersIcon, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { coachService } from '@/services/coachService'
import type { CoachDB } from '@/types/Coach'
import { Button } from '@/components/ui/Button'

// Tab components
import { CoachResumen } from '@/components/coach/tabs/CoachResumen'
import { CoachInformacionPersonal } from '@/components/coach/tabs/CoachInformacionPersonal'
import { CoachPerfilDeportivo } from '@/components/coach/tabs/CoachPerfilDeportivo'
import { CoachEquiposAsignados } from '@/components/coach/tabs/CoachEquiposAsignados'
import { CoachHistorialEquipos } from '@/components/coach/tabs/CoachHistorialEquipos'
import { CoachInformes } from '@/components/coach/tabs/CoachInformes'

type TabId = 'resumen' | 'personal' | 'deportivo' | 'equipos' | 'historial' | 'informes'

const tabs = [
    { id: 'resumen' as TabId, label: 'Resumen', icon: User },
    { id: 'personal' as TabId, label: 'Información Personal', icon: FileText },
    { id: 'deportivo' as TabId, label: 'Perfil Deportivo', icon: UserCircle },
    { id: 'equipos' as TabId, label: 'Equipos Asignados', icon: UsersIcon },
    { id: 'historial' as TabId, label: 'Historial de Equipos', icon: Calendar },
    { id: 'informes' as TabId, label: 'Informes', icon: BarChart }
]

export function CoachDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const [coach, setCoach] = useState<CoachDB | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabId>('resumen')

    useEffect(() => {
        loadCoach()
    }, [id, profile?.club_id])

    const loadCoach = async () => {
        if (!profile?.club_id || !id) return

        try {
            setLoading(true)
            const coachData = await coachService.getCoachById(id)

            if (coachData) {
                setCoach(coachData)
            } else {
                console.error('Coach not found')
            }
        } catch (error) {
            console.error('Error loading coach:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEditCoach = () => {
        navigate('/coaches', { state: { editCoachId: id } })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 dark flex items-center justify-center">
                <div className="text-gray-400">Cargando entrenador...</div>
            </div>
        )
    }

    if (!coach) {
        return (
            <div className="min-h-screen bg-gray-900 dark flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Entrenador no encontrado</h1>
                    <p className="text-gray-400 mb-4">El entrenador que buscas no existe.</p>
                    <Button variant="primary" size="md" onClick={() => navigate('/coaches')}>
                        Volver a entrenadores
                    </Button>
                </div>
            </div>
        )
    }

    const fullName = `${coach.first_name} ${coach.last_name}`

    return (
        <div className="min-h-screen bg-gray-900 dark">
            {/* Header */}
            <div className="bg-gray-800 dark border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/coaches')}>
                            Volver a entrenadores
                        </Button>
                        <Button variant="secondary" size="md" icon={Edit} onClick={handleEditCoach}>
                            Editar entrenador
                        </Button>
                    </div>

                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-12 h-12 text-primary-400" />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {fullName}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-400">Rol:</span>
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full font-medium border border-blue-500/30">
                                        Entrenador
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-400">Estado:</span>
                                    {coach.status === 'active' ? (
                                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full font-medium border border-green-500/30 flex items-center gap-1.5">
                                            🟢 Activo
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-gray-700/30 text-gray-400 rounded-full font-medium border border-gray-600/30 flex items-center gap-1.5">
                                            🔴 Inactivo
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="mt-6 border-b border-gray-700">
                        <nav className="flex -mb-px space-x-8 overflow-x-auto">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                const isActive = activeTab === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${isActive
                                            ? 'border-primary-500 text-primary-400'
                                            : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'resumen' && <CoachResumen coach={coach} />}
                {activeTab === 'personal' && <CoachInformacionPersonal coach={coach} />}
                {activeTab === 'deportivo' && <CoachPerfilDeportivo coach={coach} />}
                {activeTab === 'equipos' && <CoachEquiposAsignados coachId={coach.id} />}
                {activeTab === 'historial' && <CoachHistorialEquipos coachId={coach.id} />}
                {activeTab === 'informes' && <CoachInformes coachId={coach.id} />}
            </div>
        </div>
    )
}
