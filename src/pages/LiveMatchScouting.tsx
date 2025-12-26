/**
 * LiveMatchScouting.tsx
 * 
 * Main container component for live match scouting.
 * Orchestrates hooks and renders UI components.
 * 
 * REFACTORED: Handlers moved to useLiveMatchHandlers hook.
 * Rotation prep and stats calculation moved to pure helpers.
 */

import { useState, useEffect } from 'react'
import * as React from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { clsx } from 'clsx'
import { useMatchStore } from '@/stores/matchStore'
import { MatchTimeline } from '@/components/MatchTimeline'
import { formatTimeline } from '@/utils/timelineFormatter'
import { ReceptionModal } from '@/components/matches/ReceptionModal'
import { SetSummaryModal } from '@/components/matches/SetSummaryModal'
import { MatchFinishedModalV2 } from '@/components/matches/MatchFinishedModalV2'
import { SubstitutionModal } from '@/components/matches/SubstitutionModal'
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
import { useLiveMatchHandlers } from '@/hooks/match/useLiveMatchHandlers'

// Pure Helpers
import { prepareReceptionModalRotation } from '@/lib/volleyball/prepareReceptionModalRotation'
import { calculateMatchStats } from '@/lib/volleyball/calculateMatchStats'

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

    // Navigation control refs
    const allowNavigationRef = React.useRef(false)
    const isConfirmingExitRef = React.useRef(false)

    // Store Selectors
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

    // Navigation Blocker
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) => {
            const isMatchActive = !derivedState.isMatchFinished && events.length > 0
            const shouldBlock = isMatchActive && !allowNavigationRef.current && !isConfirmingExitRef.current
            return shouldBlock && currentLocation.pathname !== nextLocation.pathname
        }
    )

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
        receptionModal,
        blocker,
        allowNavigationRef,
        isConfirmingExitRef
    })

    // Custom Hooks - Timeouts
    const timeouts = useTimeouts({
        currentSet: derivedState.currentSet,
        timeoutsHome: derivedState.timeoutsHome,
        timeoutsAway: derivedState.timeoutsAway,
        addEvent,
        isMatchFinished: derivedState.isMatchFinished
    })

    // Custom Hooks - Effects
    useMatchEffects({
        matchId,
        loading,
        availablePlayers,
        derivedState,
        events,
        navigate
    })

    // Custom Hooks - Handlers (extracted from this component)
    const matchHandlers = useLiveMatchHandlers({
        derivedState,
        availablePlayers,
        addEvent,
        addReceptionEval,
        startersModal,
        substitutionModal,
        receptionModal,
        setShowSubstitutionModal: substitutionModal.setShowSubstitutionModal
    })

    // Custom Hooks - Player Helpers
    const isServing = derivedState.servingSide === 'our'
    const {
        getPlayerDisplay,
        effectiveOnCourtPlayers,
        benchPlayers
    } = usePlayerHelpers({
        availablePlayers,
        derivedState,
        isServing
    })

    // Local State
    const [showTimeline, setShowTimeline] = useState(false)
    const [activeTab, setActiveTab] = useState<TabView>('actions')

    // Blocker Effect
    useEffect(() => {
        if (blocker.state === "blocked" && !modals.exitModalOpen && !isConfirmingExitRef.current) {
            handlers.openExit()
        }
    }, [blocker.state, modals.exitModalOpen])

    // Navigation Handlers
    const handleGoToMatches = () => navigate('/matches')
    const handleGoToAnalysis = () => {
        if (matchData) navigate(`/match-analysis/${matchData.id}`)
    }

    // Loading State
    if (loading) {
        return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando datos del partido...</div>
    }

    // Error State
    if (!matchData) {
        return (
            <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-red-500 gap-4">
                <div>Error: No se han podido cargar los datos del partido.</div>
                <button onClick={() => navigate('/matches')} className="px-4 py-2 bg-zinc-800 rounded">Volver</button>
            </div>
        )
    }

    // Prepare rotation for ReceptionModal
    const receptionRotation = prepareReceptionModalRotation(
        derivedState.onCourtPlayers,
        derivedState.currentLiberoId,
        isServing,
        availablePlayers
    )

    // Calculate match stats for MatchFinished modal
    const matchStats = calculateMatchStats(events, derivedState.ourSide)

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

                {/* MOBILE TABS */}
                <MobileTabNav activeTab={activeTab} onTabChange={setActiveTab} />

                {/* MAIN GRID */}
                <div className="flex-1 px-3 pt-3 flex flex-col pb-20 lg:pb-0">

                    {/* ACTIONS TAB */}
                    <div className={clsx(activeTab === 'actions' ? 'block' : 'hidden lg:block')}>
                        <ActionButtons
                            isServing={isServing}
                            disabled={actionCapture.isProcessing}
                            onPointUs={actionCapture.handlePointUs}
                            onPointOpponent={actionCapture.handlePointOpponent}
                            onFreeballSent={actionCapture.handleFreeballSent}
                            onFreeballReceived={actionCapture.handleFreeballReceived}
                        />
                    </div>

                    {/* ROTATION TAB */}
                    <div className={clsx(activeTab === 'rotation' ? 'block' : 'hidden lg:block', "lg:mt-4")}>
                        <RotationDisplay
                            onCourtPlayers={derivedState.onCourtPlayers}
                            currentLiberoId={derivedState.currentLiberoId}
                            servingSide={derivedState.servingSide}
                            availablePlayers={availablePlayers}
                            getPlayerDisplay={getPlayerDisplay}
                            onClick={handlers.openRotation}
                        />
                    </div>

                    {/* TIMELINE TAB (Mobile) */}
                    <div className={clsx(activeTab === 'timeline' ? 'block' : 'hidden', 'lg:hidden')}>
                        <MatchTimeline
                            events={formatTimeline(events, derivedState.ourSide, homeTeamName, awayTeamName)}
                            className="mt-2"
                        />
                    </div>
                </div>

                {/* BOTTOM ACTIONS */}
                <div className={clsx(activeTab === 'actions' ? 'block' : 'hidden lg:block')}>
                    <BottomActions
                        onSubstitution={() => substitutionModal.openModal()}
                        onLiberoSwap={matchHandlers.handleInstantLiberoSwap}
                        onUndo={undoEvent}
                        onExit={handlers.openExit}
                        onToggleTimeline={() => {
                            setShowTimeline(!showTimeline)
                            if (window.innerWidth < 1024) {
                                setActiveTab(prev => prev === 'timeline' ? 'actions' : 'timeline')
                            }
                        }}
                        isTimelineOpen={showTimeline}
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

                {/* Desktop Timeline */}
                {showTimeline && (
                    <div data-testid="timeline" className="hidden lg:block border-t border-zinc-800">
                        <MatchTimeline
                            events={formatTimeline(events, derivedState.ourSide, homeTeamName, awayTeamName)}
                            className=""
                        />
                    </div>
                )}

                {/* MODALS */}
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
                    onConfirm={matchHandlers.handleConfirmStarters}
                    onBack={handlers.handleBackFromStarters}
                />

                <RotationModal
                    isOpen={modals.showRotationModal}
                    onClose={handlers.closeRotation}
                    onCourtPlayers={derivedState.onCourtPlayers}
                    getPlayerDisplay={getPlayerDisplay}
                />

                <ReceptionModal
                    isOpen={receptionModal.showReceptionModal}
                    onClose={() => receptionModal.setShowReceptionModal(false)}
                    onConfirm={matchHandlers.handleReceptionEval}
                    players={receptionRotation.map(p => ({
                        id: p.player.id,
                        name: p.player.name,
                        number: p.player.number,
                        role: p.player.role
                    }))}
                    currentSet={derivedState.currentSet}
                    rotation={receptionRotation}
                    getPlayerDisplay={getPlayerDisplay}
                    onTimeoutLocal={() => matchHandlers.handleTimeoutFromReception(derivedState.ourSide)}
                    onTimeoutVisitor={() => matchHandlers.handleTimeoutFromReception(derivedState.ourSide === 'home' ? 'away' : 'home')}
                    onSubstitution={matchHandlers.handleSubstitutionFromReception}
                    onLiberoSwap={matchHandlers.handleInstantLiberoSwap}
                    timeoutsHome={derivedState.timeoutsHome}
                    timeoutsAway={derivedState.timeoutsAway}
                    substitutionsUsed={derivedState.currentSetSubstitutions?.totalSubstitutions || 0}
                    ourSide={derivedState.ourSide}
                    liberoAvailable={availablePlayers.filter(p => p.role?.toUpperCase() === 'L' || p.role?.toUpperCase() === 'LIBERO').length > 1}
                />

                <SetSummaryModal
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
                            day: 'numeric', month: 'long', year: 'numeric'
                        }) : undefined,
                        time: matchData?.match_time || undefined,
                        competition: matchData?.competition_name || matchData?.teams?.category_stage || undefined,
                        stats: matchStats
                    }}
                    onGoToAnalysis={handleGoToAnalysis}
                    onGoToMatches={handleGoToMatches}
                />

                <SubstitutionModal
                    isOpen={modals.showSubstitutionModal}
                    onClose={() => substitutionModal.closeModal()}
                    onConfirm={matchHandlers.handleConfirmSubstitution}
                    onCourtPlayers={derivedState.onCourtPlayers}
                    benchPlayers={benchPlayers}
                    currentSetNumber={derivedState.currentSet}
                    allPlayers={availablePlayers}
                    currentSetSubstitutions={derivedState.currentSetSubstitutions}
                />

                <ExitMatchModal
                    isOpen={modals.exitModalOpen}
                    onClose={handlers.closeExit}
                    onSaveAndExit={handlers.handleSaveAndExit}
                    onExitWithoutSaving={handlers.handleExitWithoutSaving}
                />

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
