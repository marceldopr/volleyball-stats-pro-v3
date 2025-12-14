import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Undo2, Users, DoorOpen, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import { useMatchStoreV2, validateFIVBSubstitution } from '@/stores/matchStoreV2'
import { toast } from 'sonner'
import { calculateLiberoRotation } from '../lib/volleyball/liberoLogic'
import { getEffectiveOnCourtPlayers } from '../lib/volleyball/effectivePlayers'
import { MatchTimelineV2 } from '@/components/MatchTimelineV2'
import { formatTimeline } from '@/utils/timelineFormatter'
import { MatchFinishedModalV2 } from '@/components/matches/MatchFinishedModalV2'
import { ReceptionModalV2 } from '@/components/matches/ReceptionModalV2'
import { SetSummaryModalV2 } from '@/components/matches/SetSummaryModalV2'
import { SubstitutionModalV2 } from '@/components/matches/SubstitutionModalV2'
import { isLibero, isValidSubstitution } from '@/lib/volleyball/substitutionHelpers'
import { matchServiceV2 } from '@/services/matchServiceV2'

// Custom Hooks
import { useMatchData } from '@/hooks/match/useMatchData'
import { useStartersModal } from '@/hooks/match/useStartersModal'
import { useReceptionModal } from '@/hooks/match/useReceptionModal'
import { useSubstitutionModal } from '@/hooks/match/useSubstitutionModal'
import { useActionCaptureV2 } from '@/hooks/match/useActionCaptureV2'
import { useMatchModalsManagerV2 } from '@/hooks/match/useMatchModalsManagerV2'
import { useTimeoutsV2 } from '@/hooks/match/useTimeoutsV2'

// UI Components
import { ReadOnlyBanner } from '@/components/match/ReadOnlyBanner'
import { MatchHeader } from '@/components/match/MatchHeader'
import { ActionButtons } from '@/components/match/ActionButtons'
import { RotationDisplay } from '@/components/match/RotationDisplay'
import { StartersModalV2 } from '@/components/match/StartersModalV2'
import { RotationModalV2 } from '@/components/match/RotationModalV2'
import { ExitMatchModal } from '@/components/match/ExitMatchModal'
import { ActionPlayerModalV2 } from '@/components/match/ActionPlayerModalV2'
import type { MatchEvent, PlayerV2 } from '@/stores/matchStoreV2'

// Helper: Map event type/reason to short label in Spanish
const eventReasonLabels: Record<string, string> = {
    // Point reasons (our points)
    'serve_point': 'Punto saque',
    'attack_point': 'Punto ataque',
    'block_point': 'Punto bloqueo',
    'opponent_error': 'Error rival',
    // Point reasons (opponent points / our errors)
    'service_error': 'Error saque',
    'attack_error': 'Error ataque',
    'attack_blocked': 'Bloqueado',
    'unforced_error': 'Error genérico',
    'fault': 'Falta',
    'reception_error': 'Error recepción',
    'opponent_point': 'Punto rival',
}

const eventTypeLabels: Record<string, string> = {
    'POINT_US': 'Punto',
    'POINT_OPPONENT': 'Punto rival',
    'SUBSTITUTION': 'Cambio',
    'SET_LINEUP': 'Alineación',
    'SET_START': 'Inicio set',
    'SET_END': 'Fin set',
    'RECEPTION_EVAL': 'Recepción',
    'FREEBALL': 'Freeball',
    'FREEBALL_SENT': 'Freeball env.',
    'FREEBALL_RECEIVED': 'Freeball rec.',
    'TIMEOUT': 'Tiempo muerto',
    'SET_SERVICE_CHOICE': 'Saque inicial',
}

/**
 * Get a short label for the last event, showing player number if available
 * @param event - The last event
 * @param playersById - Map of player IDs to player objects
 * @returns Short label like "#12 Punto ataque" or "Punto rival"
 */
function getLastEventLabel(
    event: MatchEvent | undefined,
    playersById: Map<string, PlayerV2>
): string {
    if (!event) return 'Historial'

    // Get player number if playerId exists
    let playerPrefix = ''
    const playerId = event.payload?.playerId
    if (playerId) {
        const player = playersById.get(playerId)
        if (player?.number) {
            playerPrefix = `#${player.number} `
        } else if (player?.name) {
            playerPrefix = `${player.name.split(' ')[0]} `
        }
    }

    // Handle reception specially (has different structure)
    if (event.type === 'RECEPTION_EVAL' && event.payload?.reception) {
        const recPlayerId = event.payload.reception.playerId
        const recPlayer = playersById.get(recPlayerId)
        const recValue = event.payload.reception.value
        if (recPlayer?.number) {
            return `#${recPlayer.number} Recepción ${recValue}`
        }
        return `Recepción ${recValue}`
    }

    // Handle substitution specially
    if (event.type === 'SUBSTITUTION' && event.payload?.substitution) {
        const sub = event.payload.substitution
        if (sub.isLiberoSwap) {
            return 'Cambio líbero'
        }
        const playerIn = sub.playerIn
        if (playerIn?.number) {
            return `#${playerIn.number} Entra`
        }
        return 'Cambio'
    }

    // Get action label from reason or type
    const reason = event.payload?.reason
    let actionLabel = reason && eventReasonLabels[reason]
        ? eventReasonLabels[reason]
        : eventTypeLabels[event.type] || event.type

    return `${playerPrefix}${actionLabel}`
}

export function LiveMatchScoutingV2() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()

    // Store
    const {
        derivedState,
        events,
        loadMatch,
        addEvent,
        addReceptionEval,
        setInitialOnCourtPlayers,
        undoEvent,
        closeSetSummaryModal
    } = useMatchStoreV2()

    // Team names from root state (NOT derived state - these are stable)
    const homeTeamName = useMatchStoreV2(state => state.homeTeamName)
    const awayTeamName = useMatchStoreV2(state => state.awayTeamName)

    // Custom Hooks - Data Loading
    const { loading, matchData, availablePlayers } = useMatchData({
        matchId,
        loadMatch,
        setInitialOnCourtPlayers
    })

    // Custom Hooks - Modal Management
    const startersModal = useStartersModal({ derivedState, loading })
    const substitutionModal = useSubstitutionModal()
    const receptionModal = useReceptionModal({
        derivedState,
        showSubstitutionModal: substitutionModal.showSubstitutionModal,
        showStartersModal: startersModal.showStartersModal
    })
    const actionCapture = useActionCaptureV2({
        currentSet: derivedState.currentSet,
        addEvent
    })

    // Custom Hooks - Modals Manager
    const { modals, handlers } = useMatchModalsManagerV2({
        matchId,
        derivedState,
        events,
        navigate,
        undoEvent,
        closeSetSummaryModal,
        startersModal,
        substitutionModal,
        receptionModal
    })

    // Custom Hooks - Timeouts
    const timeouts = useTimeoutsV2({
        currentSet: derivedState.currentSet,
        timeoutsHome: derivedState.timeoutsHome,
        timeoutsAway: derivedState.timeoutsAway,
        addEvent,
        isMatchFinished: derivedState.isMatchFinished
    })

    // Timeline Logic
    const [showTimeline, setShowTimeline] = useState(false)

    // CRITICAL C5 VALIDATION: Prevent entering live match without convocated players
    // This prevents crashes in starters modal and rotation display
    useEffect(() => {
        // Only validate after loading is complete
        if (loading) return

        // Check if we have no players AND no lineup configured AND no events
        // The events.length check is CRITICAL: if match has events, it's in progress
        // and we should allow re-entry even if convocations aren't loaded yet
        if (availablePlayers.length === 0 && !derivedState.hasLineupForCurrentSet && events.length === 0) {
            console.error('⚠️ CRITICAL C5: Cannot enter live match without convocated players')
            console.error('  Match ID:', matchId)
            console.error('  Available players:', availablePlayers.length)
            console.error('  Events:', events.length)

            toast.error('No hay jugadoras convocadas. Configure la convocatoria primero.', {
                duration: 5000
            })

            // Redirect back to matches list where user can configure convocations
            navigate('/matches')
        }
    }, [loading, availablePlayers.length, derivedState.hasLineupForCurrentSet, events.length, matchId, navigate])

    const handleGoToMatches = () => {
        navigate('/matches')
    }

    const handleGoToAnalysis = () => {
        if (!matchData) return
        navigate(`/match-analysis-v2/${matchData.id}`)
    }

    // Exit Modal Handlers removed - logic moved to useMatchModalsManagerV2

    // Auto-save match when finished
    useEffect(() => {
        if (!derivedState.isMatchFinished || !matchId) return

        const saveMatchToSupabase = async () => {
            try {
                // Prepare match result string
                const setsWon = `${derivedState.setsWonHome}-${derivedState.setsWonAway}`

                // Calculate individual set scores for detailed result
                const setScores = derivedState.setsScores
                    .map(s => `${s.home}-${s.away}`)
                    .join(', ')
                const detailedResult = `Sets: ${setsWon} (${setScores})`

                // Save to Supabase
                await matchServiceV2.updateMatchV2(matchId, {
                    actions: events,  // Save all events
                    status: 'finished',
                    result: detailedResult
                })

                console.log('✅ Match saved to Supabase successfully')
            } catch (error) {
                console.error('❌ Error saving match:', error)
            }
        }

        saveMatchToSupabase()
    }, [derivedState.isMatchFinished, matchId, events, derivedState.setsWonHome, derivedState.setsWonAway, derivedState.setsScores])

    // Explicit save function removed - logic moved to useMatchModalsManagerV2


    // Set Summary Handlers
    // Set Summary Handlers removed - Logic moved to useMatchModalsManagerV2

    // Confirm Starters Handler
    const handleConfirmStarters = () => {
        // Validation for Set 1 & 5
        const needsServeChoice = derivedState.currentSet === 1 || derivedState.currentSet === 5
        if (needsServeChoice && !startersModal.initialServerChoice) return // Should be blocked by button, but safety check

        const lineup = [1, 2, 3, 4, 5, 6].map(pos => {
            const playerId = startersModal.selectedStarters[pos]
            const player = availablePlayers.find(p => p.id === playerId)
            return {
                position: pos as 1 | 2 | 3 | 4 | 5 | 6,
                playerId,
                player: player!
            }
        })

        // Dispatch Service Choice if needed
        if (needsServeChoice && startersModal.initialServerChoice) {
            addEvent('SET_SERVICE_CHOICE', {
                setNumber: derivedState.currentSet,
                initialServingSide: startersModal.initialServerChoice
            })
        }

        addEvent('SET_LINEUP', {
            setNumber: derivedState.currentSet,
            lineup: lineup as any,
            liberoId: startersModal.selectedLiberoId
        })


        // Close modal strictly
        startersModal.closeModal()
    }

    // Substitution Handler
    const handleConfirmSubstitution = ({ playerOutId, playerInId, position }: {
        playerOutId: string
        playerInId: string
        position: 1 | 2 | 3 | 4 | 5 | 6
    }) => {
        // Find full player objects
        const playerOut = availablePlayers.find(p => p.id === playerOutId)
        const playerIn = availablePlayers.find(p => p.id === playerInId)

        if (!playerIn || !playerOut) {
            toast.error('Jugadora no encontrada')
            return
        }

        // VALIDACIÃ“N DE ROLES
        if (!isValidSubstitution(playerOut, playerIn)) {
            toast.error('SustituciÃ³n no vÃ¡lida: los cambios deben ser campo por campo o lÃ­bero por lÃ­bero')
            return
        }

        // Determinar si es cambio lÃ­beroâ†”lÃ­bero
        const isLiberoSwap = isLibero(playerOut) && isLibero(playerIn)

        // NUEVA VALIDACIÃ“N FIVB: Si es cambio de campo, verificar reglas FIVB
        if (!isLiberoSwap) {
            const validation = validateFIVBSubstitution(
                derivedState.currentSetSubstitutions,
                playerOutId,
                playerInId,
                derivedState.onCourtPlayers
            )

            if (!validation.valid) {
                toast.error(validation.reason || 'SustituciÃ³n no vÃ¡lida segÃºn reglas FIVB')
                return
            }
        }

        // Dispatch substitution event
        addEvent('SUBSTITUTION', {
            substitution: {
                playerOutId,
                playerInId,
                position,
                setNumber: derivedState.currentSet,
                playerIn: playerIn,
                isLiberoSwap: isLiberoSwap
            }
        })

        // Close modal
        substitutionModal.closeModal()
        toast.success(`Cambio: ${playerIn.name} entra`)
    }

    // Handle Back from Starters Modal removed - logic moved to useMatchModalsManagerV2

    // Instant Libero Swap Handler
    const handleInstantLiberoSwap = () => {
        // Verificar que hay lineup y el set no ha terminado
        if (!derivedState.hasLineupForCurrentSet || derivedState.isSetFinished || derivedState.isMatchFinished) {
            toast.error('No se puede cambiar el lÃ­bero en este momento')
            return
        }

        const currentLiberoId = derivedState.currentLiberoId

        // Encontrar todos los lÃ­beros del equipo
        const allLiberos = availablePlayers.filter(p => {
            const role = p.role?.toUpperCase()
            return role === 'L' || role === 'LIBERO' || role === 'LÃBERO'
        })

        // Filtrar lÃ­beros disponibles (no el actual)
        const availableLiberos = allLiberos.filter(p => p.id !== currentLiberoId)

        if (availableLiberos.length === 0) {
            toast.info('Solo hay un lÃ­bero disponible')
            return
        }

        // Seleccionar el siguiente lÃ­bero (el primero disponible)
        const nextLibero = availableLiberos[0]
        const currentLibero = allLiberos.find(p => p.id === currentLiberoId)

        if (!currentLibero || !nextLibero) {
            toast.error('Error al cambiar lÃ­bero')
            return
        }

        // Lanzar evento de sustituciÃ³n lÃ­beroâ†”lÃ­bero
        addEvent('SUBSTITUTION', {
            substitution: {
                playerOutId: currentLiberoId,
                playerInId: nextLibero.id,
                position: 0 as any, // PosiciÃ³n especial para lÃ­bero
                setNumber: derivedState.currentSet,
                playerIn: nextLibero,
                isLiberoSwap: true
            }
        })
        toast.success(`Líbero: ${nextLibero.name} entra`)
    }

    // PRE-RECEPTION ACTION HANDLERS
    // These are called from within ReceptionModalV2 before the user selects a receiver

    // Timeout from reception modal - does NOT close reception modal
    const handleTimeoutFromReception = (team: 'home' | 'away') => {
        addEvent('TIMEOUT', { team, setNumber: derivedState.currentSet })
        toast.success(`Tiempo muerto: ${team === derivedState.ourSide ? 'Nuestro equipo' : 'Rival'}`)
    }

    // Substitution from reception - closes reception, opens substitution modal
    // When substitution is complete/cancelled, reception modal will auto-reopen
    // (handled by useReceptionModal hook which checks showSubstitutionModal)
    const handleSubstitutionFromReception = () => {
        receptionModal.setShowReceptionModal(false)
        substitutionModal.setShowSubstitutionModal(true)
    }

    // Helper to get player display info (used by modals and rotation views)
    const getPlayerDisplay = (playerId: string | null | undefined): { number: string; name: string; role: string } => {
        if (!playerId) {
            return { number: '?', name: '-', role: '' }
        }
        const player = availablePlayers.find(p => p.id === playerId)
        if (!player) {
            return { number: '?', name: '-', role: '' }
        }
        return {
            number: String(player.number),
            name: player.name,
            role: player.role || ''
        }
    }

    // derived booleans
    const isServing = derivedState.servingSide === 'our'

    // EFFECTIVE on-court players with libero logic applied
    // This is the SINGLE SOURCE OF TRUTH for who is actually on court
    const effectiveOnCourtPlayers = getEffectiveOnCourtPlayers(
        derivedState.onCourtPlayers,
        derivedState.currentLiberoId,
        isServing,
        availablePlayers
    )

    // Compute bench players for substitution modal
    // CRITICAL: Uses BASE rotation (onCourtPlayers), NOT effective rotation
    // This ensures consistency with SubstitutionModalV2 which shows base rotation
    const benchPlayers = availablePlayers.filter(p => {
        const isOnCourt = derivedState.onCourtPlayers.some(entry => entry.player.id === p.id)
        return !isOnCourt
    })

    // Helper functions
    const getPlayerAt = (position: number) => {
        return derivedState.onCourtPlayers.find(entry => entry.position === position)?.player
    }

    // Reception handler with player selection
    const handleReceptionEval = (playerId: string, rating: 0 | 1 | 2 | 3 | 4) => {
        addReceptionEval(playerId, rating)
        receptionModal.markReceptionCompleted()

        // If rating is 0 (error directo), award point to opponent
        if (rating === 0) {
            setTimeout(() => {
                // Direct call is safe here as modal determines timing
                addEvent('POINT_OPPONENT', { reason: 'reception_error' })
            }, 100)
        }
    }

    if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando...</div>
    if (!matchData) return null

    return (
        <div className="min-h-screen bg-zinc-950 flex justify-center text-white font-sans overflow-y-auto">
            <div className="w-full max-w-md bg-zinc-950 shadow-2xl min-h-screen flex flex-col pb-4 text-white">

                {/* READ ONLY BANNER */}
                {derivedState.isMatchFinished && !modals.isMatchFinishedModalOpen && (
                    <ReadOnlyBanner onUndo={undoEvent} />
                )}

                {/* HEADER */}
                <MatchHeader
                    currentSet={derivedState.currentSet}
                    homeTeamName={homeTeamName}
                    awayTeamName={awayTeamName}
                    homeScore={derivedState.homeScore}
                    awayScore={derivedState.awayScore}
                    ourSide={derivedState.ourSide}
                    servingSide={derivedState.servingSide}
                    setsScores={derivedState.setsScores}
                    timeoutsHome={timeouts.homeTimeoutsUsed}
                    timeoutsAway={timeouts.awayTimeoutsUsed}
                    onTimeoutHome={timeouts.callTimeoutHome}
                    onTimeoutAway={timeouts.callTimeoutAway}
                    disabled={derivedState.isMatchFinished}
                />

                {/* MAIN GRID */}
                <div className="flex-1 px-3 pt-3 flex flex-col">

                    <ActionButtons
                        isServing={isServing}
                        disabled={actionCapture.isProcessing}
                        onPointUs={actionCapture.handlePointUs}
                        onPointOpponent={actionCapture.handlePointOpponent}
                        onFreeballSent={actionCapture.handleFreeballSent}
                        onFreeballReceived={actionCapture.handleFreeballReceived}
                    />

                    {/* ROTATION STRIP - Uses shared libero logic */}
                    <RotationDisplay
                        onCourtPlayers={derivedState.onCourtPlayers}
                        currentLiberoId={derivedState.currentLiberoId}
                        servingSide={derivedState.servingSide}
                        availablePlayers={availablePlayers}
                        getPlayerDisplay={getPlayerDisplay}
                        onClick={handlers.openRotation}
                    />

                </div>

                {/* BOTTOM SECTION: Single Row with Timeline Toggle */}
                <div className="mt-auto bg-zinc-950 border-t border-zinc-900">
                    {/* Single Row: Actions + Timeline Toggle */}
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                        {/* Left: Cambio + Líbero */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => substitutionModal.openModal()}
                                disabled={!derivedState.hasLineupForCurrentSet || derivedState.isSetFinished || derivedState.isMatchFinished}
                                className="flex flex-col items-center gap-1 text-zinc-400 active:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Users size={20} />
                                <span className="text-[9px] font-bold">CAMBIO</span>
                            </button>
                            <button
                                onClick={handleInstantLiberoSwap}
                                disabled={!derivedState.hasLineupForCurrentSet || derivedState.isSetFinished || derivedState.isMatchFinished}
                                className="flex flex-col items-center gap-1 text-purple-400 active:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Users size={18} className="fill-current" />
                                <span className="text-[9px] font-bold">LÍBERO</span>
                            </button>
                        </div>

                        {/* Center: Timeline Toggle */}
                        <button
                            onClick={() => setShowTimeline(!showTimeline)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-colors"
                        >
                            <ClipboardList className="w-4 h-4 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-300 truncate max-w-[120px]">
                                {getLastEventLabel(
                                    events[events.length - 1],
                                    new Map(availablePlayers.map(p => [p.id, p]))
                                )}
                            </span>
                            <span className="text-[10px] text-zinc-500">({events.length})</span>
                            <span className="text-xs text-zinc-500">
                                {showTimeline ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                        </button>

                        {/* Right: Undo + Exit */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => undoEvent()}
                                disabled={events.length === 0}
                                className="flex flex-col items-center gap-1 text-zinc-500 active:text-white disabled:opacity-30"
                            >
                                <Undo2 size={20} />
                                <span className="text-[9px] font-bold">DESHACER</span>
                            </button>

                            <button
                                onClick={handlers.openExit}
                                className="flex flex-col items-center gap-1 text-red-400 active:text-white"
                            >
                                <DoorOpen size={20} />
                                <span className="text-[9px] font-bold">SALIR</span>
                            </button>
                        </div>
                    </div>

                    {/* Timeline Content (Expands Below) */}
                    {showTimeline && (
                        <div className="border-t border-zinc-800">
                            <MatchTimelineV2
                                events={formatTimeline(events, derivedState.ourSide, homeTeamName, awayTeamName)}
                                className=""
                            />
                        </div>
                    )}
                </div>

                {/* MODAL STARTERS (Selección de Titulares - Visual) */}
                <StartersModalV2
                    isOpen={modals.showStartersModal}
                    derivedState={derivedState}
                    availablePlayers={availablePlayers}
                    initialServerChoice={startersModal.initialServerChoice}
                    selectedStarters={startersModal.selectedStarters}
                    selectedLiberoId={startersModal.selectedLiberoId}
                    homeTeamName={homeTeamName}
                    awayTeamName={awayTeamName}
                    getPlayerDisplay={getPlayerDisplay}
                    onInitialServerChange={startersModal.setInitialServerChoice}
                    onStarterSelect={(pos, playerId) =>
                        startersModal.setSelectedStarters(prev => ({ ...prev, [pos]: playerId }))
                    }
                    onLiberoSelect={startersModal.setSelectedLiberoId}
                    onConfirm={handleConfirmStarters}
                    onBack={handlers.handleBackFromStarters}
                />

                {/* MODAL ROTATION */}
                <RotationModalV2
                    isOpen={modals.showRotationModal}
                    onClose={handlers.closeRotation}
                    onCourtPlayers={derivedState.onCourtPlayers}
                    getPlayerDisplay={getPlayerDisplay}
                />

                {/* MODAL RECEPTION */}
                {/* Reception Modal V2 */}
                {(() => {
                    // Calculate rotation with libero swap (same logic as main rotation display)
                    const baseRotationIds = [1, 2, 3, 4, 5, 6].map(pos => getPlayerAt(pos)?.id || null)
                    const isServing = derivedState.servingSide === 'our'
                    const displayRotationIds = calculateLiberoRotation(
                        baseRotationIds,
                        derivedState.currentLiberoId,
                        isServing,
                        (id) => availablePlayers.find(p => p.id === id)?.role
                    )

                    // Convert IDs array into rotation format with player objects
                    const rotationWithLibero = [1, 2, 3, 4, 5, 6].map((pos, idx) => {
                        const playerId = displayRotationIds[idx]
                        const player = availablePlayers.find(p => p.id === playerId)
                        return player ? {
                            position: pos,
                            player: {
                                id: player.id,
                                name: player.name,
                                number: player.number,
                                role: player.role || ''
                            }
                        } : null
                    }).filter(Boolean) as Array<{ position: number; player: { id: string; name: string; number: number; role: string } }>

                    return (
                        <ReceptionModalV2
                            isOpen={receptionModal.showReceptionModal}
                            onClose={() => receptionModal.setShowReceptionModal(false)}
                            onConfirm={handleReceptionEval}
                            players={rotationWithLibero.map(p => ({
                                id: p.player.id,
                                name: p.player.name,
                                number: p.player.number,
                                role: p.player.role
                            }))}
                            currentSet={derivedState.currentSet}
                            rotation={rotationWithLibero}
                            getPlayerDisplay={getPlayerDisplay}
                            // Pre-reception actions
                            onTimeoutLocal={() => handleTimeoutFromReception(derivedState.ourSide)}
                            onTimeoutVisitor={() => handleTimeoutFromReception(derivedState.ourSide === 'home' ? 'away' : 'home')}
                            onSubstitution={handleSubstitutionFromReception}
                            onLiberoSwap={handleInstantLiberoSwap}
                            timeoutsHome={derivedState.timeoutsHome}
                            timeoutsAway={derivedState.timeoutsAway}
                            substitutionsUsed={derivedState.currentSetSubstitutions?.totalSubstitutions || 0}
                            ourSide={derivedState.ourSide}
                            liberoAvailable={availablePlayers.filter(p => p.role?.toUpperCase() === 'L' || p.role?.toUpperCase() === 'LIBERO').length > 1}
                        />
                    )
                })()}

                <SetSummaryModalV2
                    isOpen={modals.isSetSummaryOpen}
                    summary={derivedState.lastFinishedSetSummary}
                    homeTeamName={homeTeamName || 'Local'}
                    awayTeamName={awayTeamName || 'Visitante'}
                    onClose={handlers.handleCloseSetSummary}
                    onConfirm={handlers.handleConfirmSetSummary}
                    onUndo={handlers.handleUndoSetSummary}
                />

                <MatchFinishedModalV2
                    isOpen={modals.isMatchFinishedModalOpen}
                    matchId={matchId}
                    matchInfo={{
                        homeTeamName: homeTeamName || 'Local',
                        awayTeamName: awayTeamName || 'Visitante',
                        sets: derivedState.setsScores || [],
                        homeSetsWon: derivedState.setsWonHome,
                        awaySetsWon: derivedState.setsWonAway,
                        date: matchData?.match_date ? new Date(matchData.match_date).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        }) : undefined,
                        time: matchData?.match_time || undefined,
                        competition: matchData?.competition_name || matchData?.teams?.category_stage || undefined,
                        stats: (() => {
                            // Helper to parse timestamp
                            const getTime = (iso: string) => new Date(iso).getTime()

                            // 1. Duration
                            let duration = "0m"
                            if (events.length > 1) {
                                const start = getTime(events[0].timestamp)
                                const end = getTime(events[events.length - 1].timestamp)
                                const diffMs = end - start
                                const hrs = Math.floor(diffMs / (1000 * 60 * 60))
                                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                                duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
                            }

                            // 2. Points
                            // Re-calculation using standard 'winner' logic from payload if available, or event type
                            const homePoints = events.filter(e => (e.type === 'POINT_US' && derivedState.ourSide === 'home') || (e.type === 'POINT_OPPONENT' && derivedState.ourSide === 'away')).length
                            const awayPoints = events.filter(e => (e.type === 'POINT_US' && derivedState.ourSide === 'away') || (e.type === 'POINT_OPPONENT' && derivedState.ourSide === 'home')).length

                            // 3. Errors (Approximation based on event flow or payload)
                            const ownErrors = events.filter(e =>
                                (e.type === 'POINT_OPPONENT' && derivedState.ourSide === 'home') ||
                                (e.type === 'POINT_US' && derivedState.ourSide === 'away' && e.payload?.reason?.toLowerCase().includes('error'))
                            ).length

                            const opponentErrors = events.filter(e =>
                                (e.type === 'POINT_US' && derivedState.ourSide === 'home' && e.payload?.reason?.toLowerCase().includes('error')) ||
                                (e.type === 'POINT_OPPONENT' && derivedState.ourSide === 'away')
                            ).length

                            // 4. Max Streak (Simplistic calculation)
                            let currentHomeStreak = 0
                            let maxHomeStreak = 0
                            let currentAwayStreak = 0
                            let maxAwayStreak = 0

                            events.forEach(e => {
                                const isHomePoint = (e.type === 'POINT_US' && derivedState.ourSide === 'home') || (e.type === 'POINT_OPPONENT' && derivedState.ourSide === 'away')
                                const isAwayPoint = (e.type === 'POINT_US' && derivedState.ourSide === 'away') || (e.type === 'POINT_OPPONENT' && derivedState.ourSide === 'home')

                                if (isHomePoint) {
                                    currentHomeStreak++
                                    currentAwayStreak = 0
                                    maxHomeStreak = Math.max(maxHomeStreak, currentHomeStreak)
                                } else if (isAwayPoint) {
                                    currentAwayStreak++
                                    currentHomeStreak = 0
                                    maxAwayStreak = Math.max(maxAwayStreak, currentAwayStreak)
                                }
                            })

                            return {
                                duration,
                                totalPointsHome: homePoints,
                                totalPointsAway: awayPoints,
                                ownErrors: ownErrors,
                                opponentErrors: opponentErrors,
                                homeMaxStreak: maxHomeStreak,
                                awayMaxStreak: maxAwayStreak
                            }
                        })()
                    }}
                    onGoToAnalysis={handleGoToAnalysis}
                    onGoToMatches={handleGoToMatches}
                />

                {/* MODAL SUBSTITUTION */}
                <SubstitutionModalV2
                    isOpen={modals.showSubstitutionModal}
                    onClose={() => substitutionModal.closeModal()}
                    onConfirm={handleConfirmSubstitution}
                    onCourtPlayers={derivedState.onCourtPlayers}
                    benchPlayers={benchPlayers}
                    currentSetNumber={derivedState.currentSet}
                    allPlayers={availablePlayers}
                    currentSetSubstitutions={derivedState.currentSetSubstitutions}
                />

                {/* EXIT MODAL */}
                <ExitMatchModal
                    isOpen={modals.exitModalOpen}
                    onClose={handlers.closeExit}
                    onSaveAndExit={handlers.handleSaveAndExit}
                    onExitWithoutSaving={handlers.handleExitWithoutSaving}
                />

                {/* MODAL ACTION PLAYER (Selección de jugadora para acciones) */}
                <ActionPlayerModalV2
                    isOpen={actionCapture.isActionModalOpen}
                    actionType={actionCapture.currentActionType}
                    currentSet={derivedState.currentSet}
                    onCourtPlayers={effectiveOnCourtPlayers}
                    onConfirm={actionCapture.handleConfirmActionPlayer}
                    onClose={actionCapture.handleCancelActionPlayer}
                />

            </div>
        </div>
    )
}



