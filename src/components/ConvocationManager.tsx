import { useState, useEffect } from 'react'
import { X, Check, AlertTriangle } from 'lucide-react'
import { playerTeamSeasonService } from '../services/playerTeamSeasonService'
import { matchConvocationService } from '../services/matchConvocationService'

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
                const roster = await playerTeamSeasonService.getRosterByTeamAndSeason(teamId, seasonId)
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
            <div className="modal-container max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="modal-header flex justify-between items-center">
                    <div>
                        <h2 className="modal-title">Gestionar Convocatoria</h2>
                        <p className="text-sm text-gray-500 mt-1">vs {opponentName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="modal-body overflow-y-auto flex-1 p-6">
                    {!isEditable && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">Partido ya iniciado</p>
                                <p className="text-xs text-amber-700 mt-1">Este partido ya está en curso o finalizado. No se puede modificar la convocatoria.</p>
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
                            <p className="text-gray-500">Cargando jugadoras...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-gray-600">
                                    <span className="font-bold text-gray-900">{convocatedPlayers.length}</span> jugadoras seleccionadas
                                </div>
                                {isEditable && (
                                    <div className="flex space-x-2">
                                        <button onClick={selectAll} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium">
                                            Seleccionar todas
                                        </button>
                                        <button onClick={deselectAll} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium">
                                            Deseleccionar todas
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {teamRoster.map(item => {
                                    const position = (item.role && item.role !== 'starter') ? item.role : (item.player.main_position || 'L')
                                    const isSelected = convocatedPlayers.includes(item.player.id)

                                    return (
                                        <div
                                            key={item.player.id}
                                            className={`p-3 border-2 rounded-xl transition-all flex flex-col items-center justify-center gap-2 relative group min-h-[110px] ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                                                } ${isSelected
                                                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                                                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                                                }`}
                                            onClick={() => togglePlayer(item.player.id)}
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white transition-colors flex-shrink-0 ${isSelected ? 'bg-primary-600' : 'bg-gray-400'
                                                }`}>
                                                {item.jersey_number || '0'}
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${position === 'L' ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700'
                                                }`}>
                                                {position}
                                            </span>
                                            <p className="font-bold text-gray-900 text-xs truncate w-full text-center">
                                                {item.player.first_name}
                                            </p>
                                            <p className="text-gray-600 text-[10px] truncate w-full text-center">
                                                {item.player.last_name}
                                            </p>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full border-2 border-white flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {teamRoster.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">No hay jugadoras en este equipo para esta temporada.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer flex justify-between items-center p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        {isEditable ? 'Cancelar' : 'Cerrar'}
                    </button>

                    {isEditable && (
                        <button
                            onClick={handleSave}
                            disabled={saving || convocatedPlayers.length === 0}
                            className={`px-6 py-2 rounded-lg text-white font-medium shadow-sm transition-all flex items-center gap-2 ${saving || convocatedPlayers.length === 0
                                    ? 'opacity-50 cursor-not-allowed bg-primary-400'
                                    : 'hover:shadow-md bg-primary-600 hover:bg-primary-700'
                                }`}
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Guardar Convocatoria</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
