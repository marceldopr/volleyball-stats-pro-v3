import { useState, useEffect } from 'react'
import { Plus, Calendar, CheckCircle2, Search, Trash2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { Button } from '@/components/ui/Button'
import { trainingService, TrainingDB } from '@/services/trainingService'
import { CreateTrainingModal } from '@/components/trainings/CreateTrainingModal'
import { useAuthStore } from '@/stores/authStore'
import { useRoleScope } from '@/hooks/useRoleScope'
import { toast } from 'sonner'
import { TeamDB } from '@/services/teamService'

interface TeamTrainingsProps {
    team: TeamDB
}

export function TeamTrainings({ team }: TeamTrainingsProps) {
    const navigate = useNavigate()
    const { profile } = useAuthStore()
    const { isDT, isCoach } = useRoleScope()

    // Calculate permissions
    // DT can do everything. Coach can only edit their assigned team.
    // If this component is rendered, we assume the user has access to the team dashboard.
    // So we just check roles for specific actions like delete.
    const canDelete = isDT || (isCoach && profile?.role === 'coach') // Assuming coach can delete their own trainings

    const [trainings, setTrainings] = useState<TrainingDB[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const loadTrainings = async () => {
        try {
            setLoading(true)
            const data = await trainingService.getTrainingsByTeam(team.id)
            setTrainings(data)
        } catch (error) {
            console.error('Error loading trainings:', error)
            toast.error('Error al cargar entrenamientos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTrainings()
    }, [team.id])

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('¿Estás seguro de eliminar este entrenamiento?')) return

        try {
            await trainingService.deleteTraining(id)
            toast.success('Entrenamiento eliminado')
            setTrainings(prev => prev.filter(t => t.id !== id))
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    const filteredTrainings = trainings.filter(t => {
        const dateStr = format(new Date(t.date), 'dd/MM/yyyy', { locale: es })
        return (
            t.title?.toLowerCase().includes(search.toLowerCase()) ||
            dateStr.includes(search) ||
            (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
        )
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por fecha, título..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                <Button
                    variant="primary"
                    size="md"
                    icon={Plus}
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    Nuevo Entrenamiento
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
            ) : filteredTrainings.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No hay entrenamientos
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {search ? 'No se encontraron resultados' : 'Crea el primer entrenamiento de la temporada'}
                    </p>
                    {!search && (
                        <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                            Crear Entrenamiento
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredTrainings.map(training => {
                        const date = new Date(training.date)
                        const isPast = date < new Date()

                        return (
                            <div
                                key={training.id}
                                onClick={() => navigate(`/trainings/${training.id}/attendance`)}
                                className="group bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                {format(date, 'MMM', { locale: es })}
                                            </span>
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                {format(date, 'd')}
                                            </span>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {training.title || 'Entrenamiento'}
                                                </h3>
                                                {isPast ? (
                                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 className="w-3 h-3" /> Realizado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                                        <Calendar className="w-3 h-3" /> Programado
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <span>{format(date, 'EEEE, HH:mm', { locale: es })}</span>
                                                {training.notes && (
                                                    <span className="hidden sm:inline-block max-w-xs truncate border-l border-gray-300 dark:border-gray-600 pl-3">
                                                        {training.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-400 hover:text-primary-500 hidden sm:flex"
                                        >
                                            Ver asistencia
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>

                                        {canDelete && (
                                            <button
                                                onClick={(e) => handleDelete(training.id, e)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Eliminar entrenamiento"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <CreateTrainingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                activeTeamId={team.id}
                onSuccess={() => {
                    loadTrainings()
                    toast.success('Entrenamiento creado')
                }}
            />
        </div>
    )
}
