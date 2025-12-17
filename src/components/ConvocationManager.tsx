import { useState, useEffect } from 'react'
import { X, Check, AlertTriangle } from 'lucide-react'
import { playerTeamSeasonService } from '../services/playerTeamSeasonService'
import { matchConvocationService } from '../services/matchConvocationService'
import { Button } from '@/components/ui/Button'

interface ConvocationManagerProps {
    isOpen: boolean
    onClose: () => void
    matchId: string
    teamId: string
    seasonId: string
    matchStatus: 'planned' | 'in_progress' | 'finished' | string
    opponentName: string
}

export function ConvocationManager({
    isOpen,
    onClose,
    matchId,
    teamId,
    seasonId,
    matchStatus,
    opponentName
}: ConvocationManagerProps) {
    const [teamRoster, setTeamRoster] = useState<any[]>([])
    const [convocatedPlayers, setConvocatedPlayers] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const isEditable = matchStatus === 'planned'

    useEffect(() => {
        if (!isOpen) return

        const loadData = async () => {
            try {
                setLoading(true)
                setError('')

                // Load team roster
                const roster = await playerTeamSeasonService.getActiveRosterByTeamAndSeason(teamId, seasonId)
                const filteredRoster = roster.filter((item: any) => item.player)
                setTeamRoster(filteredRoster)

                // Load existing convocations
                const existingConvocations = await matchConvocationService.getConvocationsByMatch(matchId)
                const convocatedIds = existingConvocations
                    .filter((conv: any) => conv.status === 'convocado')
                    .map((conv: any) => conv.player_id)

                setConvocatedPlayers(convocatedIds)
            } catch (err) {
                console.error('Error loading convocation data:', err)
                setError('Error al cargar los datos. Por favor intenta de nuevo.')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [isOpen, matchId, teamId, seasonId])

    const togglePlayer = (playerId: string) => {
        if (!isEditable) return

        setConvocatedPlayers(prev =>
            prev.includes(playerId)
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId]
        )
    }

    const selectAll = () => {
        if (!isEditable) return
        setConvocatedPlayers(teamRoster.map(item => item.player.id))
    }

    const deselectAll = () => {
        if (!isEditable) return
        setConvocatedPlayers([])
    }

    const handleSave = async () => {
        if (!isEditable) return

        setSaving(true)
        setError('')

        try {
            const convocations = teamRoster.map(item => ({
                player_id: item.player.id,
                status: convocatedPlayers.includes(item.player.id) ? 'convocado' : 'no_convocado',
                reason_not_convoked: convocatedPlayers.includes(item.player.id) ? undefined : 'decisión técnica',
                notes: undefined
            }))

            await matchConvocationService.setConvocationsForMatch({
                matchId,
                teamId,
                seasonId,
                convocations
            })

            // Close modal and refresh parent
            onClose()
        } catch (err) {
            console.error('Error saving convocations:', err)
            setError('Error al guardar la convocatoria. Por favor intenta de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-container max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                <div className="modal-header flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestionar Convocatoria</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">vs {opponentName}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={X} onClick={onClose}>
                        {''}
                    </Button>
                </div>

                <div className="modal-body overflow-y-auto flex-1 p-4">
                    {!isEditable && (
                        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">Partido ya iniciado</p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Este partido ya está en curso o finalizado. No se puede modificar la convocatoria.</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-start gap-3">
                            <div className="w-1 h-1 bg-danger-500 rounded-full mt-2" />
                            <p className="text-sm text-danger-800 font-medium">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Cargando jugadoras...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs text-gray-400">
                                    <span className="font-semibold text-primary-600 dark:text-primary-400">{convocatedPlayers.length}</span> jugadoras seleccionadas
                                </p>
                                {isEditable && (
                                    <div className="flex space-x-2">
                                        <Button variant="secondary" size="sm" onClick={selectAll}>
                                            Seleccionar todas
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={deselectAll}>
                                            Deseleccionar todas
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                                {teamRoster.map(item => {
                                    const position = (item.role && item.role !== 'starter') ? item.role : (item.player.main_position || 'L')
                                    const isSelected = convocatedPlayers.includes(item.player.id)

                                    return (
                                        <div
                                            key={item.player.id}
                                            className={`p-2.5 border-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 relative group min-h-[95px] ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                                                } ${isSelected
                                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 shadow-sm'
                                                    : 'border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                                }`}
                                            onClick={() => togglePlayer(item.player.id)}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm border-2 border-white transition-colors flex-shrink-0 ${isSelected ? 'bg-primary-600 dark:bg-primary-500' : 'bg-gray-400'
                                                }`}>
                                                {item.jersey_number || '0'}
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${position === 'L' ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                {position}
                                            </span>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate w-full text-center">
                                                {item.player.first_name}
                                            </p>
                                            <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full text-center">
                                                {item.player.last_name}
                                            </p>
                                            {isSelected && (
                                                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary-600 rounded-full border-2 border-white flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {teamRoster.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">No hay jugadoras en este equipo para esta temporada.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer flex justify-between items-center p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={onClose}
                    >
                        {isEditable ? 'Cancelar' : 'Cerrar'}
                    </Button>

                    {isEditable && (
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleSave}
                            disabled={saving || convocatedPlayers.length === 0}
                            icon={Check}
                        >
                            {saving ? 'Guardando...' : 'Guardar Convocatoria'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
