/**
 * TrashTab - Paperera per restaurar elements eliminats
 * 
 * Mostra jugadores i equips soft-deleted amb opció de restaurar-los
 */

import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, Users, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { playerService, PlayerDB } from '@/services/playerService'
import { teamService, TeamDB } from '@/services/teamService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { toast } from 'sonner'

interface TrashTabProps {
    clubId: string
    seasonId?: string
}

export function TrashTab({ clubId, seasonId }: TrashTabProps) {
    const [deletedPlayers, setDeletedPlayers] = useState<PlayerDB[]>([])
    const [deletedTeams, setDeletedTeams] = useState<TeamDB[]>([])
    const [loading, setLoading] = useState(true)
    const [restoringId, setRestoringId] = useState<string | null>(null)

    useEffect(() => {
        loadDeletedItems()
    }, [clubId, seasonId])

    const loadDeletedItems = async () => {
        setLoading(true)
        try {
            const [players, teams] = await Promise.all([
                playerService.getDeletedPlayers(clubId),
                teamService.getDeletedTeams(clubId, seasonId)
            ])
            setDeletedPlayers(players)
            setDeletedTeams(teams)
        } catch (error) {
            console.error('Error loading deleted items:', error)
            toast.error('Error al cargar la papelera')
        } finally {
            setLoading(false)
        }
    }

    const handleRestorePlayer = async (id: string) => {
        setRestoringId(id)
        try {
            await playerService.restorePlayer(id)
            toast.success('Jugadora restaurada')
            loadDeletedItems()
        } catch (error) {
            toast.error('Error al restaurar')
        } finally {
            setRestoringId(null)
        }
    }

    const handleRestoreTeam = async (id: string) => {
        setRestoringId(id)
        try {
            await teamService.restoreTeam(id)
            toast.success('Equipo restaurado')
            loadDeletedItems()
        } catch (error) {
            toast.error('Error al restaurar')
        } finally {
            setRestoringId(null)
        }
    }

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'Fecha desconocida'
        const date = new Date(dateStr)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Hoy'
        if (diffDays === 1) return 'Ayer'
        if (diffDays < 7) return `Hace ${diffDays} días`
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    }

    const totalItems = deletedPlayers.length + deletedTeams.length

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">Papelera</h2>
                    <p className="text-sm text-gray-400">
                        {totalItems === 0
                            ? 'No hay elementos eliminados'
                            : `${totalItems} elemento${totalItems !== 1 ? 's' : ''} eliminado${totalItems !== 1 ? 's' : ''}`
                        }
                    </p>
                </div>
            </div>

            {totalItems === 0 ? (
                <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <Trash2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">La papelera está vacía</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Los elementos eliminados aparecerán aquí durante 30 días
                    </p>
                </div>
            ) : (
                <>
                    {/* Deleted Players */}
                    {deletedPlayers.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Jugadoras ({deletedPlayers.length})
                            </h3>
                            <div className="space-y-2">
                                {deletedPlayers.map(player => (
                                    <div
                                        key={player.id}
                                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                                                <span className="text-xs font-medium text-gray-400">
                                                    {player.first_name?.[0]}{player.last_name?.[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {player.first_name} {player.last_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Eliminada {formatDate(player.deleted_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleRestorePlayer(player.id)}
                                            disabled={restoringId === player.id}
                                        >
                                            <RotateCcw className={`w-4 h-4 mr-1 ${restoringId === player.id ? 'animate-spin' : ''}`} />
                                            Restaurar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Deleted Teams */}
                    {deletedTeams.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Equipos ({deletedTeams.length})
                            </h3>
                            <div className="space-y-2">
                                {deletedTeams.map(team => (
                                    <div
                                        key={team.id}
                                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                                                <Shield className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {getTeamDisplayName(team)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Eliminado {formatDate(team.deleted_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleRestoreTeam(team.id)}
                                            disabled={restoringId === team.id}
                                        >
                                            <RotateCcw className={`w-4 h-4 mr-1 ${restoringId === team.id ? 'animate-spin' : ''}`} />
                                            Restaurar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <p className="text-xs text-gray-500 text-center mt-6">
                Los elementos se eliminan permanentemente después de 30 días
            </p>
        </div>
    )
}
