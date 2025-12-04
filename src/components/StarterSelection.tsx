import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Check, Play } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { matchConvocationService } from '../services/matchConvocationService'
import { matchService } from '../services/matchService'

interface StarterSelectionProps {
    isOpen: boolean
    onClose: () => void
    matchId: string
    teamId: string
    teamSide: 'local' | 'visitante'
    opponentName: string
    teamName: string
}

export function StarterSelection({
    isOpen,
    onClose,
    matchId,
    teamId,
    teamSide,
    opponentName,
    teamName
}: StarterSelectionProps) {
    const navigate = useNavigate()

    const [convocatedPlayers, setConvocatedPlayers] = useState<any[]>([])
    const [selectedStarters, setSelectedStarters] = useState<string[]>([])
    const [weServeFirst, setWeServeFirst] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!isOpen) return

        const loadConvocatedPlayers = async () => {
            try {
                setLoading(true)
                setError('')

                console.log('Loading convocations for match:', matchId)
                const convocations = await matchConvocationService.getConvocationsByMatch(matchId)
                console.log('Convocations loaded:', convocations)

                const convocated = convocations.filter((conv: any) => conv.status === 'convocado')
                console.log('Convocated players:', convocated)

                if (convocated.length === 0) {
                    setError('Este partido no tiene jugadoras convocadas. Gestiona la convocatoria primero.')
                    setLoading(false)
                    return
                }

                if (convocated.length < 6) {
                    setError(`Solo hay ${convocated.length} jugadoras convocadas. Se necesitan al menos 6 para iniciar el partido.`)
                }

                // Load player details from player_team_season with club_players join
                const playerIds = convocated.map((c: any) => c.player_id)
                console.log('Player IDs:', playerIds)

                // Fetch player details with jersey numbers from player_team_season
                const { data: playerSeasons, error: playersError } = await supabase
                    .from('player_team_season')
                    .select(`
                        jersey_number,
                        role,
                        club_players!inner (
                            id,
                            first_name,
                            last_name,
                            main_position
                        )
                    `)
                    .in('player_id', playerIds)
                    .eq('season_id', convocated[0]?.season_id)

                if (playersError) {
                    console.error('Error fetching players:', playersError)
                    throw playersError
                }

                console.log('Player seasons loaded:', playerSeasons)

                if (!playerSeasons || playerSeasons.length === 0) {
                    setError('No se pudieron cargar los datos de las jugadoras.')
                    setLoading(false)
                    return
                }

                // Merge convocation data with player details
                const playersWithConvocation = playerSeasons.map((pts: any) => {
                    const player = pts.club_players
                    const conv = convocated.find((c: any) => c.player_id === player.id)
                    return {
                        id: player.id,
                        first_name: player.first_name,
                        last_name: player.last_name,
                        main_position: player.main_position,
                        jersey_number: pts.jersey_number,
                        convocation: conv
                    }
                })

                console.log('Players with convocation:', playersWithConvocation)
                setConvocatedPlayers(playersWithConvocation)
            } catch (err) {
                console.error('Error loading convocated players:', err)
                setError('Error al cargar las jugadoras convocadas.')
            } finally {
                setLoading(false)
            }
        }

        loadConvocatedPlayers()
    }, [isOpen, matchId])

    const toggleStarter = (playerId: string) => {
        setSelectedStarters(prev => {
            if (prev.includes(playerId)) {
                return prev.filter(id => id !== playerId)
            } else {
                // Limit to 6 starters
                if (prev.length >= 6) {
                    return prev
                }
                return [...prev, playerId]
            }
        })
    }

    const handleConfirmAndStart = async () => {
        if (selectedStarters.length !== 6) {
            setError('Debes seleccionar exactamente 6 titulares.')
            return
        }

        if (weServeFirst === null) {
            setError('Debes seleccionar quién saca primero.')
            return
        }

        setSaving(true)
        setError('')

        try {
            // 1. Update match_convocations to mark starters (role_in_match = 'starter')
            for (const playerId of selectedStarters) {
                const convocation = convocatedPlayers.find(p => p.id === playerId)?.convocation
                if (convocation) {
                    await matchConvocationService.updateConvocation(convocation.id, {
                        role_in_match: 'starter'
                    })
                }
            }

            // 2. Determine first_serve value
            const firstServe = weServeFirst ? teamSide : (teamSide === 'local' ? 'away' : 'home')

            // 3. Update match status to 'in_progress' and save first_serve
            // Note: We need to add first_serve field to matches table if it doesn't exist
            // For now, we'll just update status
            await matchService.updateMatch(matchId, {
                status: 'in_progress'
            })

            // 4. Navigate to live match
            navigate(`/matches/${matchId}/live`)
            onClose()
        } catch (err) {
            console.error('Error starting match:', err)
            setError('Error al iniciar el partido. Por favor intenta de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900 z-50 overflow-y-auto">
            <div className="min-h-screen p-6">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-t-xl p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Configuración Inicial - Set 1</h1>
                                <p className="text-sm text-gray-500 mt-1">{teamName} vs {opponentName}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="bg-white p-6">
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
                        ) : convocatedPlayers.length > 0 ? (
                            <>
                                {/* Serve Selection */}
                                <div className="mb-8">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">¿Quién saca primero?</h2>
                                    <div className="grid grid-cols-2 gap-4 max-w-2xl">
                                        <button
                                            onClick={() => setWeServeFirst(true)}
                                            className={`p-4 border-2 rounded-xl font-bold transition-all ${weServeFirst === true
                                                ? 'border-primary-600 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {teamName}
                                        </button>
                                        <button
                                            onClick={() => setWeServeFirst(false)}
                                            className={`p-4 border-2 rounded-xl font-bold transition-all ${weServeFirst === false
                                                ? 'border-primary-600 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {opponentName}
                                        </button>
                                    </div>
                                </div>

                                {/* Starters Selection */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-gray-900">
                                            Selecciona Titulares ({selectedStarters.length}/6)
                                        </h2>
                                        <span className="text-sm text-gray-500">
                                            Marca las 6 jugadoras que iniciarán en pista
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {convocatedPlayers.map(player => {
                                            const isSelected = selectedStarters.includes(player.id)
                                            const position = player.main_position || '?'

                                            return (
                                                <div
                                                    key={player.id}
                                                    className={`p-3 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 relative group min-h-[120px] ${isSelected
                                                        ? 'border-green-500 bg-green-50 shadow-sm'
                                                        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                                                        } ${!isSelected && selectedStarters.length >= 6
                                                            ? 'opacity-50 cursor-not-allowed'
                                                            : ''
                                                        }`}
                                                    onClick={() => toggleStarter(player.id)}
                                                >
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white transition-colors flex-shrink-0 ${isSelected ? 'bg-green-600' : 'bg-gray-400'
                                                        }`}>
                                                        {player.jersey_number || '0'}
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${position === 'L' ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700'
                                                        }`}>
                                                        {position}
                                                    </span>
                                                    <p className="font-bold text-gray-900 text-xs truncate w-full text-center">
                                                        {player.first_name}
                                                    </p>
                                                    <p className="text-gray-600 text-[10px] truncate w-full text-center">
                                                        {player.last_name}
                                                    </p>
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-5 h-5 bg-green-600 rounded-full border-2 border-white flex items-center justify-center">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No hay jugadoras convocadas para este partido.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-white rounded-b-xl p-6 border-t border-gray-200 flex justify-between items-center">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                            disabled={saving}
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={handleConfirmAndStart}
                            disabled={saving || selectedStarters.length !== 6 || weServeFirst === null}
                            className={`px-6 py-3 rounded-lg text-white font-bold shadow-sm transition-all flex items-center gap-2 text-base ${saving || selectedStarters.length !== 6 || weServeFirst === null
                                ? 'opacity-50 cursor-not-allowed bg-green-400'
                                : 'hover:shadow-md bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Iniciando...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    <span>Confirmar e Iniciar Partido</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
