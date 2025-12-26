/**
 * MatchModals.tsx
 * 
 * Presentational component that renders all match-related modals.
 * Zero store access - everything via props.
 */

import { DerivedMatchState } from '@/stores/matchStore'
import { ReceptionModal } from '@/components/matches/ReceptionModal'
import { SetSummaryModal } from '@/components/matches/SetSummaryModal'
import { MatchFinishedModalV2 } from '@/components/matches/MatchFinishedModalV2'
import { SubstitutionModal } from '@/components/matches/SubstitutionModal'
import { StartersModal } from '@/components/match/StartersModal'
import { RotationModal } from '@/components/match/RotationModal'
import { ExitMatchModal } from '@/components/match/ExitMatchModal'
import { ActionPlayerModal } from '@/components/match/ActionPlayerModal'
import { ActionType } from '@/hooks/match/useActionPlayerModal'
import { RotationEntry } from '@/lib/volleyball/prepareReceptionModalRotation'
import { MatchStats } from '@/lib/volleyball/calculateMatchStats'

// Types for props
interface PlayerDisplay {
    number: string
    name: string
    role: string
}

interface MatchModalsProps {
    // Modal visibility states
    showStartersModal: boolean
    showRotationModal: boolean
    showReceptionModal: boolean
    isSetSummaryOpen: boolean
    isMatchFinishedModalOpen: boolean
    showSubstitutionModal: boolean
    exitModalOpen: boolean
    isActionModalOpen: boolean

    // Data
    derivedState: DerivedMatchState
    availablePlayers: any[]
    benchPlayers: any[]
    effectiveOnCourtPlayers: any[]
    receptionRotation: RotationEntry[]
    matchStats: MatchStats
    matchData: {
        homeTeamName?: string
        awayTeamName?: string
        match_date?: string
        match_time?: string
        competition_name?: string
        teams?: { category_stage?: string }
    }
    homeTeamName: string | null
    awayTeamName: string | null

    // Starters modal state
    initialServerChoice: 'our' | 'opponent' | null
    selectedStarters: Record<number, string>
    selectedLiberoId: string | null

    // Action modal state
    currentActionType: ActionType | null
    currentSet: number

    // Handlers
    getPlayerDisplay: (playerId: string | null | undefined) => PlayerDisplay
    onInitialServerChange: (choice: 'our' | 'opponent' | null) => void
    onStarterSelect: (pos: number, playerId: string) => void
    onLiberoSelect: (id: string | null) => void
    onConfirmStarters: () => void
    onBackFromStarters: () => void
    onCloseRotation: () => void
    onCloseReception: () => void
    onConfirmReception: (playerId: string, rating: 0 | 1 | 2 | 3 | 4) => void
    onTimeoutLocal: () => void
    onTimeoutVisitor: () => void
    onSubstitutionFromReception: () => void
    onLiberoSwap: () => void
    onCloseSetSummary: () => void
    onConfirmSetSummary: () => Promise<void>
    onUndoSetSummary: () => void
    onGoToAnalysis: () => void
    onGoToMatches: () => void
    onCloseSubstitution: () => void
    onConfirmSubstitution: (params: { playerOutId: string; playerInId: string; position: 1 | 2 | 3 | 4 | 5 | 6 }) => void
    onCloseExit: () => void
    onSaveAndExit: () => void
    onExitWithoutSaving: () => void
    onConfirmActionPlayer: (playerId: string) => void
    onCloseActionPlayer: () => void
}

export function MatchModals({
    // Visibility
    showStartersModal,
    showRotationModal,
    showReceptionModal,
    isSetSummaryOpen,
    isMatchFinishedModalOpen,
    showSubstitutionModal,
    exitModalOpen,
    isActionModalOpen,
    // Data
    derivedState,
    availablePlayers,
    benchPlayers,
    effectiveOnCourtPlayers,
    receptionRotation,
    matchStats,
    matchData,
    homeTeamName,
    awayTeamName,
    // Starters state
    initialServerChoice,
    selectedStarters,
    selectedLiberoId,
    // Action state
    currentActionType,
    currentSet,
    // Handlers
    getPlayerDisplay,
    onInitialServerChange,
    onStarterSelect,
    onLiberoSelect,
    onConfirmStarters,
    onBackFromStarters,
    onCloseRotation,
    onCloseReception,
    onConfirmReception,
    onTimeoutLocal,
    onTimeoutVisitor,
    onSubstitutionFromReception,
    onLiberoSwap,
    onCloseSetSummary,
    onConfirmSetSummary,
    onUndoSetSummary,
    onGoToAnalysis,
    onGoToMatches,
    onCloseSubstitution,
    onConfirmSubstitution,
    onCloseExit,
    onSaveAndExit,
    onExitWithoutSaving,
    onConfirmActionPlayer,
    onCloseActionPlayer
}: MatchModalsProps) {
    return (
        <>
            {/* STARTERS MODAL */}
            <StartersModal
                isOpen={showStartersModal}
                derivedState={derivedState}
                availablePlayers={availablePlayers}
                initialServerChoice={initialServerChoice}
                selectedStarters={selectedStarters}
                selectedLiberoId={selectedLiberoId}
                homeTeamName={homeTeamName}
                awayTeamName={awayTeamName}
                getPlayerDisplay={getPlayerDisplay}
                onInitialServerChange={onInitialServerChange}
                onStarterSelect={onStarterSelect}
                onLiberoSelect={onLiberoSelect}
                onConfirm={onConfirmStarters}
                onBack={onBackFromStarters}
            />

            {/* ROTATION MODAL */}
            <RotationModal
                isOpen={showRotationModal}
                onClose={onCloseRotation}
                onCourtPlayers={derivedState.onCourtPlayers}
                getPlayerDisplay={getPlayerDisplay}
            />

            {/* RECEPTION MODAL */}
            <ReceptionModal
                isOpen={showReceptionModal}
                onClose={onCloseReception}
                onConfirm={onConfirmReception}
                players={receptionRotation.map(p => ({
                    id: p.player.id,
                    name: p.player.name,
                    number: p.player.number,
                    role: p.player.role
                }))}
                currentSet={currentSet}
                rotation={receptionRotation}
                getPlayerDisplay={getPlayerDisplay}
                onTimeoutLocal={onTimeoutLocal}
                onTimeoutVisitor={onTimeoutVisitor}
                onSubstitution={onSubstitutionFromReception}
                onLiberoSwap={onLiberoSwap}
                timeoutsHome={derivedState.timeoutsHome}
                timeoutsAway={derivedState.timeoutsAway}
                substitutionsUsed={derivedState.currentSetSubstitutions?.totalSubstitutions || 0}
                ourSide={derivedState.ourSide}
                liberoAvailable={availablePlayers.filter(p => p.role?.toUpperCase() === 'L' || p.role?.toUpperCase() === 'LIBERO').length > 1}
            />

            {/* SET SUMMARY MODAL */}
            <SetSummaryModal
                isOpen={isSetSummaryOpen}
                summary={derivedState.lastFinishedSetSummary}
                homeTeamName={homeTeamName || 'Local'}
                awayTeamName={awayTeamName || 'Visitante'}
                onClose={onCloseSetSummary}
                onConfirm={onConfirmSetSummary}
                onUndo={onUndoSetSummary}
            />

            {/* MATCH FINISHED MODAL */}
            <MatchFinishedModalV2
                isOpen={isMatchFinishedModalOpen}
                matchInfo={{
                    homeTeamName: matchData.homeTeamName || 'Nosotros',
                    awayTeamName: matchData.awayTeamName || 'Rival',
                    sets: derivedState.setsScores.map((set: any, idx: number) => ({
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
                onGoToAnalysis={onGoToAnalysis}
                onGoToMatches={onGoToMatches}
            />

            {/* SUBSTITUTION MODAL */}
            <SubstitutionModal
                isOpen={showSubstitutionModal}
                onClose={onCloseSubstitution}
                onConfirm={onConfirmSubstitution}
                onCourtPlayers={derivedState.onCourtPlayers}
                benchPlayers={benchPlayers}
                currentSetNumber={currentSet}
                allPlayers={availablePlayers}
                currentSetSubstitutions={derivedState.currentSetSubstitutions}
            />

            {/* EXIT MODAL */}
            <ExitMatchModal
                isOpen={exitModalOpen}
                onClose={onCloseExit}
                onSaveAndExit={onSaveAndExit}
                onExitWithoutSaving={onExitWithoutSaving}
            />

            {/* ACTION PLAYER MODAL */}
            <ActionPlayerModal
                isOpen={isActionModalOpen}
                actionType={currentActionType}
                currentSet={currentSet}
                onCourtPlayers={effectiveOnCourtPlayers}
                onConfirm={onConfirmActionPlayer}
                onClose={onCloseActionPlayer}
            />
        </>
    )
}
