import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useMatchStore, validateFIVBSubstitution } from '@/stores/matchStore'
import { toast } from 'sonner'
import { calculateLiberoRotation } from '../lib/volleyball/liberoLogic'
import { MatchTimeline } from '@/components/MatchTimeline'
import { formatTimeline } from '@/utils/timelineFormatter'
import { ReceptionModal } from '@/components/matches/ReceptionModal'
import { SetSummaryModal } from '@/components/matches/SetSummaryModal'
import { MatchFinishedModalV2 } from '@/components/matches/MatchFinishedModalV2'
import { SubstitutionModal } from '@/components/matches/SubstitutionModal'
import { isLibero, isValidSubstitution } from '@/lib/volleyball/substitutionHelpers'
import { getLastEventLabel } from '@/utils/matchEventLabels'

// Custom Hooks
import { useMatchData } from '@/hooks/match/useMatchData'
import { useStartersModal } from '@/hooks/match/useStartersModal'
import { useReceptionModal } from '@/hooks/match/useReceptionModal'
import { useSubstitutionModal } from '@/hooks/match/useSubstitutionModal'
import { useActionCapture } from '@/hooks/match/useActionCapture'
import { useMatchModalsManager } from '@/hooks/match/useMatchModalsManager'
import { useTimeouts } from '@/hooks/match/useTimeouts'
import { useMatchEffects } from '@/hooks/match/useMatchEffects'
import { usePlayerHelpers } from '@/hooks/match/usePlayerHelpers'

// UI Components
import { ReadOnlyBanner } from '@/components/match/ReadOnlyBanner'
import { MatchHeader } from '@/components/match/MatchHeader'
import { ActionButtons } from '@/components/match/ActionButtons'
import { RotationDisplay } from '@/components/match/RotationDisplay'
import { BottomActions } from '@/components/match/BottomActions'
import { StartersModal } from '@/components/match/StartersModal'
import { RotationModal } from '@/components/match/RotationModal'
import { ExitMatchModal } from '@/components/match/ExitMatchModal'
import { ActionPlayerModal } from '@/components/match/ActionPlayerModal'
import { MobileTabNav, TabView } from '@/components/match/MobileTabNav'




export function LiveMatchScouting() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()

    // ... (rest of store selectors)
    // Store Selectors (Granular for performance and stability)
    const derivedState = useMatchStore(state => state.derivedState)
    const events = useMatchStore(state => state.events)
    const loadMatch = useMatchStore(state => state.loadMatch)
    const addEvent = useMatchStore(state => state.addEvent)
    const addReceptionEval = useMatchStore(state => state.addReceptionEval)
    const setInitialOnCourtPlayers = useMatchStore(state => state.setInitialOnCourtPlayers)
    const undoEvent = useMatchStore(state => state.undoEvent)
    const closeSetSummaryModal = useMatchStore(state => state.closeSetSummaryModal)
    const homeTeamName = useMatchStore(state => state.homeTeamName)
    const awayTeamName = useMatchStore(state => state.awayTeamName)

    const reset = useMatchStore(state => state.reset)

    // Custom Hooks - Data Loading
    const { loading, matchData, availablePlayers } = useMatchData({
        matchId,
        loadMatch,
        setInitialOnCourtPlayers,
        reset
    })

    // Custom Hooks - Modal Management
    const startersModal = useStartersModal({ derivedState, loading })
    const substitutionModal = useSubstitutionModal()
    const receptionModal = useReceptionModal({
        derivedState,
        showSubstitutionModal: substitutionModal.showSubstitutionModal,
        showStartersModal: startersModal.showStartersModal
    })
    const actionCapture = useActionCapture({
        currentSet: derivedState.currentSet,
        addEvent
    })

    // Custom Hooks - Modals Manager
    const { modals, handlers } = useMatchModalsManager({
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
    const timeouts = useTimeouts({
        currentSet: derivedState.currentSet,
        timeoutsHome: derivedState.timeoutsHome,
        timeoutsAway: derivedState.timeoutsAway,
        addEvent,
        isMatchFinished: derivedState.isMatchFinished
    })

    // Custom Hooks - Effects (validation, auto-save)
    useMatchEffects({
        matchId,
        loading,
        availablePlayers,
        derivedState,
        events,
        navigate
    })

    // Timeline Logic
    const [showTimeline, setShowTimeline] = useState(false)

    // Mobile Tab State
    const [activeTab, setActiveTab] = useState<TabView>('actions')

    // DEV-ONLY: Assert lineup/players validation
    if (import.meta.env.DEV) {
        // Only validate if match is active (has lineup and not finished)
        if (derivedState.hasLineupForCurrentSet && !derivedState.isMatchFinished) {
            const onCourtCount = derivedState.onCourtPlayers.length
            if (onCourtCount !== 6) {
                console.warn(
                    `[DEV][WARN] On-court players invalid length: ${onCourtCount} (expected 6) ` +
                    `matchId=${matchId} set=${derivedState.currentSet}`
                )
            }
        }
    }

    // DEV-ONLY: Performance timing for event processing

    const handleGoToMatches = () => {
        navigate('/matches')
    }

    const handleGoToAnalysis = () => {
        if (!matchData) return
        navigate(`/match-analysis/${matchData.id}`)
    }



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

    // derived booleans
    const isServing = derivedState.servingSide === 'our'

    // Custom Hooks - Player Helpers
    const {
        getPlayerDisplay,
        effectiveOnCourtPlayers,
        benchPlayers,
        getPlayerAt
    } = usePlayerHelpers({
        availablePlayers,
        derivedState,
        isServing
    })

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

    if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando datos del partido...</div>

    if (!matchData) {
        return (
            <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-red-500 gap-4">
                <div>Error: No se han podido cargar los datos del partido.</div>
                <button onClick={() => navigate('/matches')} className="px-4 py-2 bg-zinc-800 rounded">Volver</button>
            </div>
        )
    }

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

                {/* MOBILE TABS (Sticky below Header) */}
                <MobileTabNav
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {/* MAIN GRID */}
                <div className="flex-1 px-3 pt-3 flex flex-col pb-20 lg:pb-0">

                    {/* ACTIONS TAB/SECTION */}
                    <div className={clsx(
                        activeTab === 'actions' ? 'block' : 'hidden lg:block'
                    )}>
                        <ActionButtons
                            isServing={isServing}
                            disabled={actionCapture.isProcessing}
                            onPointUs={actionCapture.handlePointUs}
                            onPointOpponent={actionCapture.handlePointOpponent}
                            onFreeballSent={actionCapture.handleFreeballSent}
                            onFreeballReceived={actionCapture.handleFreeballReceived}
                        />
                    </div>

                    {/* ROTATION TAB/SECTION */}
                    <div className={clsx(
                        // On Mobile: Only show if tab is 'rotation' OR 'actions' (small rotation strip)
                        // Actually, user requested Tabs: Actions | Rotation | Timeline.
                        // Standard: Actions tab usually has a small rotation view? 
                        // User request: "Área central con tabs o switch: Acciones / Rotación / Timeline." implying full separation.
                        // Let's hide RotationDisplay on 'actions' tab in mobile to save space if desired, OR keep it if it fits. 
                        // Given portrait constraint, 'Actions' tab needs space for buttons. Let's separate or keep small.
                        // However, RotationDisplay is currently a "Strip". Let's assume on Mobile 'Rotation' tab shows the full RotationModal or a bigger view? 
                        // No, let's just show the strip in 'Rotation' tab for now to match current components, or stick to the requested separation.
                        // If I hide it in Actions tab, user can't see who serves. 
                        // Compromise: On 'Actions' tab, maybe show valid players? 
                        // Let's stick to strict separation for now to ensure space. 
                        // Wait, RotationDisplay is the STRIP. It is useful in Actions view.
                        // If I hide it, user loses context. 
                        // User said: "Match HUD... Tabs... Acciones / Rotación / Timeline".
                        // Let's follow strict tabs.
                        activeTab === 'rotation' ? 'block' : 'hidden lg:block',
                        "lg:mt-4"
                    )}>
                        {/* Wrapper for Rotation Display to add spacing in desktop */}
                        <RotationDisplay
                            onCourtPlayers={derivedState.onCourtPlayers}
                            currentLiberoId={derivedState.currentLiberoId}
                            servingSide={derivedState.servingSide}
                            availablePlayers={availablePlayers}
                            getPlayerDisplay={getPlayerDisplay}
                            onClick={handlers.openRotation}
                        />
                    </div>

                    {/* TIMELINE TAB/SECTION (Mobile Only View via Tab, Desktop via Toggle) */}
                    <div className={clsx(
                        activeTab === 'timeline' ? 'block' : 'hidden', // Mobile: Tab control
                        'lg:hidden' // Hide on desktop here, we handle it below for desktop toggle
                    )}>
                        <MatchTimeline
                            events={formatTimeline(events, derivedState.ourSide, homeTeamName, awayTeamName)}
                            className="mt-2"
                        />
                    </div>

                </div>

                {/* BOTTOM ACTIONS - Only visible on Actions Tab in Mobile? Or always?
                    User said: "BottomActions fijo con acciones principales; el resto en 'Más…'."
                    If I switch to Timeline tab, do I need bottom actions? Probably not.
                    Let's show BottomActions only on 'actions' tab in mobile.
                    Always show on Desktop.
                */}
                <div className={clsx(
                    activeTab === 'actions' ? 'block' : 'hidden lg:block'
                )}>
                    <BottomActions
                        onSubstitution={() => substitutionModal.openModal()}
                        onLiberoSwap={handleInstantLiberoSwap}
                        onUndo={undoEvent}
                        onExit={handlers.openExit}
                        onToggleTimeline={() => {
                            // Desktop: Toggle state
                            setShowTimeline(!showTimeline)
                            // Mobile: Switch tab to timeline if not there, or back to actions
                            if (window.innerWidth < 1024) {
                                setActiveTab(prev => prev === 'timeline' ? 'actions' : 'timeline')
                            }
                        }}
                        isTimelineOpen={showTimeline} // Only affects transparency/highlight
                        lastEventLabel={getLastEventLabel(
                            events[events.length - 1],
                            new Map(availablePlayers.map(p => [p.id, p]))
                        )}
                        eventCount={events.length}
                        disableSubstitution={!derivedState.hasLineupForCurrentSet || derivedState.isSetFinished || derivedState.isMatchFinished}
                        disableLibero={!derivedState.hasLineupForCurrentSet || derivedState.isSetFinished || derivedState.isMatchFinished}
                        disableUndo={events.length === 0}
                    />
                </div>

                {/* Desktop Timeline Content (Expands Below via BottomAction Toggle) */}
                {showTimeline && (
                    <div data-testid="timeline" className="hidden lg:block border-t border-zinc-800">
                        <MatchTimeline
                            events={formatTimeline(events, derivedState.ourSide, homeTeamName, awayTeamName)}
                            className=""
                        />
                    </div>
                )}

                {/* MODAL STARTERS (Selección de Titulares - Visual) */}
                <StartersModal
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
                <RotationModal
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
                                role: player.role || '',
                                firstName: player.firstName,
                                lastName: player.lastName
                            }
                        } : null
                    }).filter(Boolean) as Array<{ position: number; player: { id: string; name: string; number: number; role: string } }>

                    return (
                        <ReceptionModal
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

                <SetSummaryModal
                    isOpen={modals.isSetSummaryOpen}
                    summary={derivedState.lastFinishedSetSummary}
                    homeTeamName={homeTeamName || 'Local'}
                    awayTeamName={awayTeamName || 'Visitante'}
                    onClose={handlers.handleCloseSetSummary}
                    onConfirm={handlers.handleConfirmSetSummary}
                    onUndo={handlers.handleUndoSetSummary}
                />

                {/* Match Finished Modal - V2 */}
                <MatchFinishedModalV2
                    isOpen={modals.isMatchFinishedModalOpen}
                    matchInfo={{
                        homeTeamName: matchData.homeTeamName || 'Nosotros',
                        awayTeamName: matchData.awayTeamName || 'Rival',
                        sets: derivedState.setsScores.map((set, idx) => ({
                            setNumber: idx + 1,
                            home: set.home,
                            away: set.away
                        })),
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
                <SubstitutionModal
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
                <ActionPlayerModal
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



