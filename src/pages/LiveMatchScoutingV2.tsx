import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Undo2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useMatchStoreV2, validateFIVBSubstitution } from '@/stores/matchStoreV2'
import { matchServiceV2 } from '@/services/matchServiceV2'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { teamService } from '@/services/teamService'
import { toast } from 'sonner'
import { calculateLiberoRotation } from '../lib/volleyball/liberoLogic'
import { MatchFinishedModal } from '@/components/matches/MatchFinishedModal'
import { SetSummaryModalV2 } from '@/components/matches/SetSummaryModalV2'
import { SubstitutionModalV2 } from '@/components/matches/SubstitutionModalV2'
import { isLibero, isValidSubstitution } from '@/lib/volleyball/substitutionHelpers'
import { getTeamDisplayName } from '@/utils/teamDisplay'

export function LiveMatchScoutingV2() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()

    // Store
    const {
        derivedState,
        events,
        loadMatch,
        addEvent,
        setInitialOnCourtPlayers,
        undoEvent,
        closeSetSummaryModal
    } = useMatchStoreV2()

    // Team names from root state (NOT derived state - these are stable)
    const homeTeamName = useMatchStoreV2(state => state.homeTeamName)
    const awayTeamName = useMatchStoreV2(state => state.awayTeamName)

    // Local State
    const [loading, setLoading] = useState(true)
    const [showReceptionModal, setShowReceptionModal] = useState(false)
    const [matchData, setMatchData] = useState<any>(null)
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([])

    // State for UX
    const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const [showRotationModal, setShowRotationModal] = useState(false)
    const [activePosition, setActivePosition] = useState<number | null>(null)

    // Starters Logic
    const [showStartersModal, setShowStartersModal] = useState(false)
    const [initialServerChoice, setInitialServerChoice] = useState<'our' | 'opponent' | null>(null)
    const [selectedStarters, setSelectedStarters] = useState<{ [pos: number]: string }>({})
    const [selectedLiberoId, setSelectedLiberoId] = useState<string | null>(null)

    // Substitution Logic
    const [showSubstitutionModal, setShowSubstitutionModal] = useState(false)

    const lastSetRef = useRef<number | null>(null)

    // Match Finished Logic
    const [isMatchFinishedModalOpen, setIsMatchFinishedModalOpen] = useState(false)
    const hasShownFinishModal = useRef(false)

    useEffect(() => {
        if (derivedState.isMatchFinished && !hasShownFinishModal.current && !derivedState.setSummaryModalOpen) {
            setIsMatchFinishedModalOpen(true)
            hasShownFinishModal.current = true
        } else if (!derivedState.isMatchFinished) {
            // Reset if undone
            hasShownFinishModal.current = false
            setIsMatchFinishedModalOpen(false)
        }
    }, [derivedState.isMatchFinished, derivedState.setSummaryModalOpen])

    const handleConfirmFinish = async () => {
        if (!matchId || !derivedState.isMatchFinished) return

        try {
            const resultString = `${derivedState.setsWonHome}-${derivedState.setsWonAway}`

            await matchServiceV2.updateMatchV2(matchId, {
                status: 'finished',
                result: resultString
            })

            toast.success("Partido finalizado correctamente")
            navigate('/matches')
        } catch (error) {
            console.error('Error finalizando partico:', error)
            toast.error("Error al finalizar el partido")
        }
    }

    const handleUndoFinish = () => {
        setIsMatchFinishedModalOpen(false)
        undoEvent()
    }

    const handleViewReadOnly = () => {
        setIsMatchFinishedModalOpen(false)
    }

    // Load Match & Convocations only once
    useEffect(() => {
        if (!matchId) return

        const init = async () => {
            try {
                setLoading(true)

                // CRITICAL FIX: Clear cached team names from localStorage
                // This prevents old "Local"/"Visitante" from being restored
                const stored = localStorage.getItem('match-store-v2')
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored)
                        if (parsed.state?.derivedState) {
                            delete parsed.state.derivedState.homeTeamName
                            delete parsed.state.derivedState.awayTeamName
                            localStorage.setItem('match-store-v2', JSON.stringify(parsed))
                        }
                    } catch (e) {
                        console.error('Error cleaning localStorage:', e)
                    }
                }

                const match = await matchServiceV2.getMatchV2(matchId)
                if (!match) throw new Error('Match not found')

                setMatchData(match)

                // 1. Determine Our Side
                const ourSide = match.home_away === 'home' ? 'home' : 'away'

                // 2. Load full team data to get complete name (like Matches.tsx does)
                const team = await teamService.getTeamById(match.team_id)
                const teamName = team ? getTeamDisplayName(team) : 'Nuestro Equipo'
                const opponentName = match.opponent_name || 'Rival'

                const homeTeamName = ourSide === 'home' ? teamName : opponentName
                const awayTeamName = ourSide === 'away' ? teamName : opponentName

                // 3. Load Match into Store
                loadMatch(match.id, match.actions || [], ourSide, { home: homeTeamName, away: awayTeamName })

                // 3. Load Roster (Context for numbers/roles)
                const roster = await playerTeamSeasonService.getRosterByTeamAndSeason(match.team_id, match.season_id)

                // 4. Load Convocations
                const convos = await matchServiceV2.getConvocationsV2(matchId)

                // Map all available players merging Roster info
                const players = convos
                    .filter(c => c.status === 'convocado' || c.status === undefined)
                    .map(c => {
                        // Find roster entry for this player to get the correct season number/role
                        const rosterItem = roster.find(r => r.player_id === c.player_id)
                        const pData = c.club_players || {}

                        // Priority: Roster Number > Player Profile Number > '?'
                        const number = rosterItem?.jersey_number || pData.jersey_number || '?'

                        // Priority: Custom Match Role > Roster Role > Player Profile Position > '?'
                        // Priority: Custom Match Role (if not generic) > Roster Role > Player Profile Position > '?'
                        let effectiveRole = c.role_in_match
                        if (effectiveRole && (effectiveRole.toLowerCase() === 'starter' || effectiveRole.toLowerCase() === 'convocado')) {
                            effectiveRole = null
                        }

                        let rosterRole = rosterItem?.role
                        if (rosterRole && (rosterRole.toLowerCase() === 'starter' || rosterRole.toLowerCase() === 'convocado')) {
                            rosterRole = null
                        }

                        const rawRole = effectiveRole || rosterRole || pData.main_position || '?'

                        // Map Spanish/Full names to Codes
                        const roleMap: Record<string, string> = {
                            'Central': 'MB',
                            'Receptora': 'OH',
                            'Receptor': 'OH',
                            'Punta': 'OH',
                            'Opuesta': 'OPP',
                            'Opuesto': 'OPP',
                            'Colocadora': 'S',
                            'Colocador': 'S',
                            'Armadora': 'S',
                            'Líbero': 'L',
                            'Libero': 'L'
                        }

                        const role = roleMap[rawRole] || rawRole && roleMap[Object.keys(roleMap).find(k => rawRole.includes(k)) || ''] || rawRole

                        const name = pData.nickname || pData.first_name || `J${number}`

                        return {
                            id: c.player_id,
                            name,
                            number,
                            role
                        }
                    })

                setAvailablePlayers(players)

                // Initialize store with players for fallback
                setInitialOnCourtPlayers(players.slice(0, 6).map(p => ({ ...p, role: p.role || '?' })))

            } catch (error) {
                console.error('Error loading match V2:', error)
                toast.error('Error al cargar partido')
                navigate('/matches')
            } finally {
                setLoading(false)
            }
        }

        init()
    }, [matchId, navigate, loadMatch, setInitialOnCourtPlayers])

    // --- Strict Effect: Only Open Modal on Set Change if No Lineup ---
    useEffect(() => {
        if (!derivedState.currentSet) return

        // Check if set has changed
        if (lastSetRef.current !== derivedState.currentSet) {
            lastSetRef.current = derivedState.currentSet

            console.log('[DEBUG useEffect] Set changed', {
                newSet: derivedState.currentSet,
                setSummaryModalOpen: derivedState.setSummaryModalOpen,
                hasLineupForCurrentSet: derivedState.hasLineupForCurrentSet
            })

            // CRITICAL: Do NOT open starters modal if set summary modal is currently open
            // This prevents skipping the set summary when transitioning between sets
            if (derivedState.setSummaryModalOpen) {
                // Set summary takes priority - starters modal will open after user closes it
                console.log('[DEBUG useEffect] Skipping StartersModal - SetSummaryModal is open')
                return
            }

            // Only open if NO lineup exists for this new set
            if (!derivedState.hasLineupForCurrentSet) {
                console.log('[DEBUG useEffect] Opening StartersModal')
                setShowStartersModal(true)
            } else {
                setShowStartersModal(false)
            }
        }
        // Initial load check
        else if (lastSetRef.current === derivedState.currentSet && !derivedState.hasLineupForCurrentSet && !showStartersModal) {
            // If we are on the current set, have no lineup, and modal is closed... 
            // This might be redundant if the initial load handled it, but safety for "mid-set" with no lineup.
            // Actually user asked for specific logic: "Al empezar el set 1: Si no hay lineup → se muestra el modal".
            // "Cuando se cierra el set 1 y se genera SET_START del set 2: ... modal".

            // CRITICAL: Also check for set summary modal here
            if (!derivedState.setSummaryModalOpen) {
                // Can open starters modal safely
            }
        }
    }, [derivedState.currentSet, derivedState.hasLineupForCurrentSet, derivedState.setSummaryModalOpen])

    // Initial mount check for reload scenarios
    useEffect(() => {
        if (loading) return
        // If we load the page, have no lineup, we must ensure modal opens
        if (derivedState.currentSet && !derivedState.hasLineupForCurrentSet) {
            // Only if we haven't tracked this set yet or just need to force it
            setShowStartersModal(true)
            lastSetRef.current = derivedState.currentSet
        }
    }, [loading, derivedState.currentSet, derivedState.hasLineupForCurrentSet])

    // Helper to get player display info
    const getPlayerDisplay = (playerId: string | undefined | null) => {
        if (!playerId) return { number: '?', name: '-' }
        const p = availablePlayers.find(ap => ap.id === playerId)
        if (!p) return { number: '?', name: 'Unknown' }
        return {
            number: p.number,
            name: p.name,
            role: p.role
        }
    }

    // Helper for safe actions (Anti-Double-Tap)
    const handleAction = (fn: () => void) => {
        if (buttonsDisabled) return
        setButtonsDisabled(true)
        fn()
        setTimeout(() => {
            setButtonsDisabled(false)
        }, 350)
    }

    // Get Player at Position Helper
    const getPlayerAt = (pos: number) => {
        const { onCourtPlayers } = derivedState
        const entry = (onCourtPlayers as any[]).find(p => p.position === pos)
        return entry?.player
    }

    const handleReception = (value: 0 | 1 | 2 | 3 | 4) => {
        // Assume P6 receiving for now if logic not specified
        const p6 = getPlayerAt(6)
        const playerId = p6?.id || 'unknown'

        handleAction(() => {
            addEvent('RECEPTION_EVAL', { reception: { playerId, value } })
            setShowReceptionModal(false)

            if (value === 0) {
                setTimeout(() => {
                    addEvent('POINT_OPPONENT', { reason: 'reception_error' })
                }, 100)
            }
        })
    }

    // Handlers
    const handlePointOpponent = (reason: string) => {
        handleAction(() => addEvent('POINT_OPPONENT', { reason }))
    }
    const handlePointUs = (reason: string) => {
        handleAction(() => addEvent('POINT_US', { reason }))
    }

    // Set Summary Handlers
    const handleCloseSetSummary = () => {
        closeSetSummaryModal()

        // After closing set summary, check if we need to open starters modal
        setTimeout(() => {
            if (!derivedState.hasLineupForCurrentSet) {
                setShowStartersModal(true)
            }
        }, 100)
    }

    const handleConfirmSetSummary = () => {
        // Confirm just means closing the modal and effectively "accepting" the set end state
        closeSetSummaryModal()

        // After confirming set summary, check if we need to open starters modal
        setTimeout(() => {
            if (!derivedState.hasLineupForCurrentSet) {
                setShowStartersModal(true)
            }
        }, 100)
    }

    const handleUndoSetSummary = () => {
        closeSetSummaryModal()
        // Smart undo: Remove SET_START (if exists), SET_END, and the Point that caused it.
        // We use getState to access fresh state during execution
        const { events, undoEvent } = useMatchStoreV2.getState()

        const lastEvt = events[events.length - 1]
        if (lastEvt?.type === 'SET_START') {
            undoEvent() // Undo SET_START
            undoEvent() // Undo SET_END
            undoEvent() // Undo the Point that caused end
        } else if (lastEvt?.type === 'SET_END') {
            undoEvent() // Undo SET_END
            undoEvent() // Undo the Point
        } else {
            // Should not happen if modal is open, but fallback
            undoEvent()
        }
    }

    // Confirm Starters Handler
    const handleConfirmStarters = () => {
        // Validation for Set 1 & 5
        const needsServeChoice = derivedState.currentSet === 1 || derivedState.currentSet === 5
        if (needsServeChoice && !initialServerChoice) return // Should be blocked by button, but safety check

        const lineup = [1, 2, 3, 4, 5, 6].map(pos => {
            const playerId = selectedStarters[pos]
            const player = availablePlayers.find(p => p.id === playerId)
            return {
                position: pos as 1 | 2 | 3 | 4 | 5 | 6,
                playerId,
                player: player!
            }
        })

        // Dispatch Service Choice if needed
        if (needsServeChoice && initialServerChoice) {
            addEvent('SET_SERVICE_CHOICE', {
                setNumber: derivedState.currentSet,
                initialServingSide: initialServerChoice
            })
        }

        addEvent('SET_LINEUP', {
            setNumber: derivedState.currentSet,
            lineup: lineup as any,
            liberoId: selectedLiberoId
        })


        // Close modal strictly
        setShowStartersModal(false)
        setActivePosition(null)
        setSelectedStarters({})
        setSelectedLiberoId(null)
        setInitialServerChoice(null)
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

        // VALIDACIÓN DE ROLES
        if (!isValidSubstitution(playerOut, playerIn)) {
            toast.error('Sustitución no válida: los cambios deben ser campo por campo o líbero por líbero')
            return
        }

        // Determinar si es cambio líbero↔líbero
        const isLiberoSwap = isLibero(playerOut) && isLibero(playerIn)

        // NUEVA VALIDACIÓN FIVB: Si es cambio de campo, verificar reglas FIVB
        if (!isLiberoSwap) {
            const validation = validateFIVBSubstitution(
                derivedState.currentSetSubstitutions,
                playerOutId,
                playerInId,
                derivedState.onCourtPlayers
            )

            if (!validation.valid) {
                toast.error(validation.reason || 'Sustitución no válida según reglas FIVB')
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
        setShowSubstitutionModal(false)
        toast.success(`Cambio: ${playerIn.name} entra`)
    }

    // Instant Libero Swap Handler
    const handleInstantLiberoSwap = () => {
        // Verificar que hay lineup y el set no ha terminado
        if (!derivedState.hasLineupForCurrentSet || derivedState.isSetFinished || derivedState.isMatchFinished) {
            toast.error('No se puede cambiar el líbero en este momento')
            return
        }

        const currentLiberoId = derivedState.currentLiberoId

        // Encontrar todos los líberos del equipo
        const allLiberos = availablePlayers.filter(p => {
            const role = p.role?.toUpperCase()
            return role === 'L' || role === 'LIBERO' || role === 'LÍBERO'
        })

        // Filtrar líberos disponibles (no el actual)
        const availableLiberos = allLiberos.filter(p => p.id !== currentLiberoId)

        if (availableLiberos.length === 0) {
            toast.info('Solo hay un líbero disponible')
            return
        }

        // Seleccionar el siguiente líbero (el primero disponible)
        const nextLibero = availableLiberos[0]
        const currentLibero = allLiberos.find(p => p.id === currentLiberoId)

        if (!currentLibero || !nextLibero) {
            toast.error('Error al cambiar líbero')
            return
        }

        // Lanzar evento de sustitución líbero↔líbero
        addEvent('SUBSTITUTION', {
            substitution: {
                playerOutId: currentLiberoId,
                playerInId: nextLibero.id,
                position: 0 as any, // Posición especial para líbero
                setNumber: derivedState.currentSet,
                playerIn: nextLibero,
                isLiberoSwap: true
            }
        })

        toast.success(`Líbero: ${nextLibero.name} entra`)
    }

    // derived booleans
    const isServing = derivedState.servingSide === 'our'

    // Compute bench players for substitution modal
    const benchPlayers = availablePlayers.filter(p => {
        const isOnCourt = derivedState.onCourtPlayers.some(entry => entry.player.id === p.id)
        // Incluir todos los jugadores que no están en pista (incluye líberos para permitir cambio líbero↔líbero)
        return !isOnCourt
    })

    if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando...</div>
    if (!matchData) return null

    return (
        <div className="min-h-screen bg-zinc-950 flex justify-center text-white font-sans overflow-y-auto">
            <div className="w-full max-w-md bg-zinc-950 shadow-2xl min-h-screen flex flex-col pb-4 text-white">

                {/* READ ONLY BANNER */}
                {derivedState.isMatchFinished && !isMatchFinishedModalOpen && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                            🏁 Partido Finalizado — Solo Lectura
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={undoEvent}
                                className="h-6 text-[10px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-2"
                            >
                                <Undo2 size={12} className="mr-1" />
                                Deshacer
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/matches')}
                                className="h-6 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 px-2"
                            >
                                Salir
                            </Button>
                        </div>
                    </div>
                )}

                {/* HEADER */}
                <header className="flex-none bg-zinc-900/90 border-b border-zinc-800 py-3 px-4 flex flex-col z-20 sticky top-0 backdrop-blur-md shadow-md">
                    <div className="flex items-center justify-between mb-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/matches')} className="h-8 w-8 text-zinc-400 hover:text-white p-0">
                            <ArrowLeft size={20} />
                        </Button>
                        <span className="text-zinc-500 font-mono text-[10px] font-bold tracking-widest uppercase">Set {derivedState.currentSet}</span>
                        <div className="w-8" />
                    </div>

                    <div className="flex items-center justify-between gap-4 px-2">
                        {/* HOME SIDE (Fixed Left) */}
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-xs uppercase font-bold text-zinc-400 truncate w-full text-center mb-1">
                                {homeTeamName || 'Local'}
                            </span>
                            <div className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all duration-300 w-full relative overflow-hidden ${derivedState.servingSide === (derivedState.ourSide === 'home' ? 'our' : 'opponent')
                                ? "bg-zinc-800 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                : "bg-zinc-900/50 border border-zinc-800"
                                }`}>
                                <span className={`text-5xl font-black tracking-tighter leading-none ${derivedState.ourSide === 'home' ? 'text-white' : 'text-zinc-500'
                                    }`}>
                                    {derivedState.homeScore}
                                </span>
                                {derivedState.servingSide === (derivedState.ourSide === 'home' ? 'our' : 'opponent') && (
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                )}
                            </div>
                        </div>

                        {/* CENTER INFO */}
                        <div className="flex flex-col items-center gap-1 opacity-50">
                            <span className="text-xs font-bold text-zinc-600">vs</span>
                        </div>

                        {/* AWAY SIDE (Fixed Right) */}
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-xs uppercase font-bold text-zinc-400 truncate w-full text-center mb-1">
                                {awayTeamName || 'Visitante'}
                            </span>
                            <div className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all duration-300 w-full relative overflow-hidden ${derivedState.servingSide === (derivedState.ourSide === 'away' ? 'our' : 'opponent')
                                ? "bg-zinc-800 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                                : "bg-zinc-900/50 border border-zinc-800"
                                }`}>
                                <span className={`text-5xl font-black tracking-tighter leading-none ${derivedState.ourSide === 'away' ? 'text-white' : 'text-zinc-500'
                                    }`}>
                                    {derivedState.awayScore}
                                </span>
                                {derivedState.servingSide === (derivedState.ourSide === 'away' ? 'our' : 'opponent') && (
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-2">
                        <span className="text-[10px] text-zinc-600 font-mono font-bold">
                            Sets: {derivedState.setsWonHome} - {derivedState.setsWonAway}
                        </span>
                    </div>
                </header>

                {/* MAIN GRID */}
                <div className="flex-1 px-3 pt-3 flex flex-col">

                    <div className="flex justify-between px-1 mb-2 text-[10px] uppercase font-bold tracking-wider opacity-80">
                        <span className="text-emerald-500">Nosotros</span>
                        <span className="text-red-500">Rival</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">

                        {/* ROW 1 */}
                        {isServing ? (
                            <>
                                <button onClick={() => handlePointUs('serve_point')} disabled={buttonsDisabled} className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                                    Punto saque
                                </button>
                                <button onClick={() => handlePointOpponent('service_error')} disabled={buttonsDisabled} className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                                    Error saque
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setShowReceptionModal(true)} disabled={buttonsDisabled} className="h-14 bg-blue-600 active:bg-blue-500 text-white rounded-lg font-bold text-sm shadow-sm border border-blue-400/30 transition-all hover:brightness-110">
                                    Recepción
                                </button>
                                <div className="h-14 bg-zinc-900/50 rounded-lg border border-zinc-800/50 flex items-center justify-center">
                                    <span className="text-zinc-700 text-[10px] uppercase font-bold tracking-wider">Esperando...</span>
                                </div>
                            </>
                        )}


                        {/* ROW 2 */}
                        <button onClick={() => handlePointUs('attack_point')} disabled={buttonsDisabled} className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Punto ataque
                        </button>
                        <button onClick={() => handlePointOpponent('attack_error')} disabled={buttonsDisabled} className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Error ataque
                        </button>


                        {/* ROW 3 */}
                        <button onClick={() => handlePointUs('block_point')} disabled={buttonsDisabled} className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Punto bloqueo
                        </button>
                        <button onClick={() => handlePointOpponent('attack_blocked')} disabled={buttonsDisabled} className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Bloqueado
                        </button>


                        {/* ROW 4 */}
                        <button onClick={() => handlePointUs('opponent_error')} disabled={buttonsDisabled} className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Error rival
                        </button>
                        <button onClick={() => handlePointOpponent('opponent_point')} disabled={buttonsDisabled} className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Punto rival
                        </button>

                    </div>

                    {/* FREEBALL */}
                    <button onClick={() => handleAction(() => addEvent('FREEBALL'))} disabled={buttonsDisabled} className="mt-3 w-full h-12 bg-blue-600 active:bg-blue-500 text-white border border-blue-500/50 rounded-lg flex items-center justify-center font-mono text-xs uppercase tracking-widest font-bold shadow-sm hover:brightness-110 transition-all">
                        Freeball
                    </button>

                    {/* ROTATION STRIP - Uses shared libero logic */}
                    <div className="mt-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-2 flex flex-col gap-1 items-center cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => setShowRotationModal(true)}>
                        {(() => {
                            // 1. Prepare base rotation array P1-P6 from state
                            const currentRotationPlayers = [1, 2, 3, 4, 5, 6].map(pos => getPlayerAt(pos));
                            const baseRotationIds = currentRotationPlayers.map(p => p?.id || null);

                            // 2. Calculate display rotation (with libero swap)
                            const isServing = derivedState.servingSide === 'our';
                            const displayRotationIds = calculateLiberoRotation(
                                baseRotationIds,
                                derivedState.currentLiberoId,
                                isServing,
                                (id) => availablePlayers.find(p => p.id === id)?.role
                            );

                            // Helper to render a position box
                            const renderPositionBox = (posIndex: number, originalPosLabel: number) => {
                                const playerId = displayRotationIds[posIndex]; // 0-based index from calc function
                                const display = getPlayerDisplay(playerId);

                                // Determine actual P-label to show (logical position on court)
                                // The array from calculateLiberoRotation is [P1, P2, P3, P4, P5, P6] (indices 0-5)
                                // So index 0 is P1, index 1 is P2...

                                return (
                                    <div key={originalPosLabel} className="flex-1 h-14 bg-zinc-800/80 rounded border border-zinc-700/50 flex flex-col items-center justify-center shadow-sm relative overflow-visible">
                                        <div className="absolute top-0.5 left-1 opacity-80">
                                            <span className="text-[9px] font-bold text-white">P{originalPosLabel}</span>
                                        </div>
                                        {display.role && display.role.toLowerCase() !== 'starter' && (
                                            <div className="absolute top-0.5 right-1">
                                                <span className="text-[8px] font-bold text-zinc-400 bg-zinc-900/50 px-1 rounded leading-none">{display.role}</span>
                                            </div>
                                        )}

                                        <span className="text-xl font-bold text-zinc-200 z-10 leading-none mb-0.5 mt-2">{display.number}</span>
                                        <span className="text-[10px] text-zinc-400 uppercase z-10 leading-none truncate w-full text-center px-0.5">{display.name}</span>
                                    </div>
                                );
                            };

                            return (
                                <>
                                    <div className="flex justify-center gap-1 w-full border-b border-zinc-800/50 pb-1">
                                        {/* Front Row: P4 (index 3), P3 (index 2), P2 (index 1) */}
                                        {renderPositionBox(3, 4)}
                                        {renderPositionBox(2, 3)}
                                        {renderPositionBox(1, 2)}
                                    </div>
                                    <div className="flex justify-center gap-1 w-full pt-1">
                                        {/* Back Row: P5 (index 4), P6 (index 5), P1 (index 0) */}
                                        {renderPositionBox(4, 5)}
                                        {renderPositionBox(5, 6)}
                                        {renderPositionBox(0, 1)}
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                </div>

                {/* FOOTER */}
                <div className="mt-auto pt-4 bg-zinc-950 border-t border-zinc-900 h-16 px-4 flex items-center justify-between">
                    <div className="flex gap-4">
                        <button onClick={() => undoEvent()} disabled={events.length === 0} className="flex flex-col items-center gap-1 text-zinc-500 active:text-white disabled:opacity-30">
                            <Undo2 size={20} />
                            <span className="text-[9px] font-bold">DESHACER</span>
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowSubstitutionModal(true)}
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
                </div>

                {/* MODAL STARTERS (Selección de Titulares - Visual) */}
                {
                    showStartersModal && (
                        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
                            <div className="w-full max-w-sm bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-2xl relative">

                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Titulares Set {derivedState.currentSet}</h3>
                                    <p className="text-zinc-400 text-xs">Selecciona 6 jugadoras iniciales</p>
                                </div>

                                {(derivedState.currentSet === 1 || derivedState.currentSet === 5) && (
                                    <div className="w-full mb-4">
                                        <div className="text-xs text-zinc-400 mb-2 text-center uppercase tracking-wider font-bold">
                                            ¿Quién saca primero?
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                className={`py-2 rounded-lg border text-xs font-bold uppercase transition-all ${initialServerChoice === 'our'
                                                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-400/50"
                                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                                    }`}
                                                onClick={() => setInitialServerChoice('our')}
                                            >
                                                Nosotros
                                            </button>
                                            <button
                                                type="button"
                                                className={`py-2 rounded-lg border text-xs font-bold uppercase transition-all ${initialServerChoice === 'opponent'
                                                    ? "bg-rose-600 border-rose-500 text-white shadow-lg ring-1 ring-rose-400/50"
                                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                                    }`}
                                                onClick={() => setInitialServerChoice('opponent')}
                                            >
                                                Rival
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* PISTA VISUAL 3x2 con Selector Inline */}
                                <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50 mb-6 relative overflow-visible">
                                    {/* Red de Voleibol */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-20 pointer-events-none" />

                                    {/* LÍNEA DELANTERA: P4 - P3 - P2 */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        {[4, 3, 2].map(pos => {
                                            const selectedId = selectedStarters[pos];
                                            const display = getPlayerDisplay(selectedId);
                                            const isActive = activePosition === pos

                                            // Filter logic: Only show players NOT selected elsewhere (or the one currently selected in this pos)
                                            // AND EXCLUDE LIBEROS
                                            const availableForPos = availablePlayers.filter(p => {
                                                const usedInOtherPos = Object.entries(selectedStarters).some(([otherPos, otherId]) => {
                                                    return parseInt(otherPos) !== pos && otherId === p.id;
                                                });
                                                const isLibero = p.role === 'L';
                                                const isSelectedLibero = p.id === selectedLiberoId;

                                                return !usedInOtherPos && !isLibero && !isSelectedLibero;
                                            });

                                            return (
                                                <div
                                                    key={pos}
                                                    className="relative group "
                                                >
                                                    <div
                                                        onClick={() => setActivePosition(isActive ? null : pos)}
                                                        className={`cursor-pointer aspect-square rounded-full border-2 flex flex-col items-center justify-center transition-all ${isActive
                                                            ? 'bg-emerald-900/40 border-emerald-400 ring-2 ring-emerald-500/30 text-emerald-100 scale-105'
                                                            : selectedId
                                                                ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-100'
                                                                : 'bg-zinc-800 border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-800/80'
                                                            }`}
                                                    >


                                                        {selectedId ? (
                                                            <>
                                                                <span className="text-2xl font-bold">{display.number}</span>
                                                                <span className="text-xs truncate max-w-[95%] px-1 opacity-90 leading-tight text-center">{display.name}</span>

                                                                {/* Role Badge */}
                                                                {display.role && display.role.toLowerCase() !== 'starter' && (
                                                                    <span className="absolute -bottom-1 right-1 rounded-full bg-zinc-800 px-1.5 py-[1px] text-[10px] font-bold text-zinc-300 border border-zinc-600 shadow-sm z-10">
                                                                        {display.role}
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center opacity-70">
                                                                <span className="text-[10px] font-bold text-zinc-500 mb-0.5">P{pos}</span>
                                                                <span className="text-xl font-bold text-zinc-600 leading-none">+</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* INLINE POPOVER (Positioned Below for Top Row) */}
                                                    {isActive && (
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 flex flex-col animate-in slide-in-from-top-2 duration-200">
                                                            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-2 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center z-10">
                                                                Seleccionar P{pos}
                                                            </div>
                                                            {availableForPos.length === 0 ? (
                                                                <div className="p-3 text-center text-xs text-zinc-500 italic">Sin jugadoras disponibles</div>
                                                            ) : (
                                                                availableForPos.map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => {
                                                                            setSelectedStarters(prev => ({ ...prev, [pos]: p.id }));
                                                                            setActivePosition(null);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 border-b border-zinc-800/50 last:border-0 ${selectedId === p.id ? 'bg-emerald-900/20 text-emerald-100' : 'text-zinc-300'
                                                                            }`}
                                                                    >
                                                                        <span className={`font-bold w-5 text-center ${selectedId === p.id ? 'text-emerald-400' : 'text-zinc-500'}`}>{p.number}</span>
                                                                        <div className="flex items-center gap-2 leading-none">
                                                                            <span>{p.name}</span>
                                                                            {p.role && p.role.toLowerCase() !== 'starter' && (
                                                                                <span className="text-[10px] text-zinc-500 uppercase font-bold">{p.role}</span>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* LÍNEA ZAGUERA: P5 - P6 - P1 */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[5, 6, 1].map(pos => {
                                            const selectedId = selectedStarters[pos];
                                            const display = getPlayerDisplay(selectedId);
                                            const isActive = activePosition === pos;

                                            // Filter logic: Only show players NOT selected elsewhere (or the one currently selected in this pos)
                                            // AND EXCLUDE LIBEROS
                                            const availableForPos = availablePlayers.filter(p => {
                                                const usedInOtherPos = Object.entries(selectedStarters).some(([otherPos, otherId]) => {
                                                    return parseInt(otherPos) !== pos && otherId === p.id;
                                                });
                                                const isLibero = p.role === 'L';
                                                const isSelectedLibero = p.id === selectedLiberoId;

                                                return !usedInOtherPos && !isLibero && !isSelectedLibero;
                                            });

                                            return (
                                                <div
                                                    key={pos}
                                                    className="relative group"
                                                >
                                                    <div
                                                        onClick={() => setActivePosition(isActive ? null : pos)}
                                                        className={`cursor-pointer aspect-square rounded-full border-2 flex flex-col items-center justify-center transition-all ${isActive
                                                            ? 'bg-emerald-900/40 border-emerald-400 ring-2 ring-emerald-500/30 text-emerald-100 scale-105'
                                                            : selectedId
                                                                ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-100'
                                                                : 'bg-zinc-800 border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-800/80'
                                                            }`}
                                                    >


                                                        {selectedId ? (
                                                            <>
                                                                <span className="text-2xl font-bold">{display.number}</span>
                                                                <span className="text-xs truncate max-w-[95%] px-1 opacity-90 leading-tight text-center">{display.name}</span>

                                                                {/* Role Badge */}
                                                                {display.role && display.role.toLowerCase() !== 'starter' && (
                                                                    <span className="absolute -bottom-1 right-1 rounded-full bg-zinc-800 px-1.5 py-[1px] text-[10px] font-bold text-zinc-300 border border-zinc-600 shadow-sm z-10">
                                                                        {display.role}
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center opacity-70">
                                                                <span className="text-[10px] font-bold text-zinc-500 mb-0.5">P{pos}</span>
                                                                <span className="text-xl font-bold text-zinc-600 leading-none">+</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* INLINE POPOVER (Positioned ABOVE for Bottom Row to stay on screen) */}
                                                    {isActive && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                                                            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-2 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center z-10">
                                                                Seleccionar P{pos}
                                                            </div>
                                                            {availableForPos.length === 0 ? (
                                                                <div className="p-3 text-center text-xs text-zinc-500 italic">Sin jugadoras disponibles</div>
                                                            ) : (
                                                                availableForPos.map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => {
                                                                            setSelectedStarters(prev => ({ ...prev, [pos]: p.id }));
                                                                            setActivePosition(null);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 border-b border-zinc-800/50 last:border-0 ${selectedId === p.id ? 'bg-emerald-900/20 text-emerald-100' : 'text-zinc-300'
                                                                            }`}
                                                                    >
                                                                        <span className={`font-bold w-5 text-center ${selectedId === p.id ? 'text-emerald-400' : 'text-zinc-500'}`}>{p.number}</span>
                                                                        <div className="flex flex-col leading-none">
                                                                            <span>{p.name}</span>
                                                                            {p.role && p.role.toLowerCase() !== 'starter' && (
                                                                                <span className="text-[9px] text-zinc-500 uppercase">{p.role}</span>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="mt-4 flex flex-col items-center justify-center">
                                        <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2 tracking-widest">LÍBERO</div>
                                        <div className="relative group">
                                            <div
                                                onClick={() => setActivePosition(activePosition === 999 ? null : 999)}
                                                className={`cursor-pointer w-16 h-16 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all ${activePosition === 999
                                                    ? 'bg-amber-900/40 border-amber-500/50 ring-2 ring-amber-500/30 text-amber-100 scale-105'
                                                    : selectedLiberoId
                                                        ? 'bg-amber-900/20 border-amber-500/50 text-amber-100 border-solid'
                                                        : 'bg-zinc-800 border-zinc-600 text-zinc-500 hover:border-zinc-500 hover:bg-zinc-800/80'
                                                    }`}
                                            >
                                                {selectedLiberoId ? (() => {
                                                    const disp = getPlayerDisplay(selectedLiberoId);
                                                    return (
                                                        <>
                                                            <span className="text-xl font-bold">{disp.number}</span>
                                                            <span className="text-[9px] truncate max-w-[90%] px-1 opacity-90 leading-tight text-center">{disp.name}</span>
                                                            <span className="absolute -bottom-1 right-0 rounded-full bg-zinc-900 px-1.5 py-[1px] text-[8px] font-bold text-amber-500 border border-zinc-700 shadow-sm z-10">L</span>
                                                        </>
                                                    );
                                                })() : (
                                                    <span className="text-xl font-bold text-zinc-600">+</span>
                                                )}
                                            </div>

                                            {/* LIBERO SELECTOR POPOVER */}
                                            {activePosition === 999 && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                                                    <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-2 text-xs font-bold text-amber-500 uppercase tracking-wider text-center z-10">
                                                        Seleccionar Líbero
                                                    </div>
                                                    {(() => {
                                                        const availableForLibero = availablePlayers.filter(p => {
                                                            const isLibero = p.role === 'L';
                                                            const isUsedInField = Object.values(selectedStarters).includes(p.id);
                                                            return isLibero && !isUsedInField;
                                                        });

                                                        if (availableForLibero.length === 0) {
                                                            return <div className="p-3 text-center text-xs text-zinc-500 italic">Sin líberos disponibles</div>
                                                        }

                                                        return availableForLibero.map(p => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setSelectedLiberoId(p.id === selectedLiberoId ? null : p.id);
                                                                    setActivePosition(null);
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 border-b border-zinc-800/50 last:border-0 ${selectedLiberoId === p.id ? 'bg-amber-900/20 text-amber-100' : 'text-zinc-300'}`}
                                                            >
                                                                <span className={`font-bold w-5 text-center ${selectedLiberoId === p.id ? 'text-amber-500' : 'text-zinc-500'}`}>{p.number}</span>
                                                                <div className="flex items-center gap-2 leading-none">
                                                                    <span>{p.name}</span>
                                                                    <span className="text-[10px] text-zinc-500 uppercase font-bold">L</span>
                                                                </div>
                                                            </button>
                                                        ));
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConfirmStarters}
                                    disabled={
                                        Object.keys(selectedStarters).length !== 6 ||
                                        ((derivedState.currentSet === 1 || derivedState.currentSet === 5) && !initialServerChoice) ||
                                        (availablePlayers.some(p => p.role === 'L') && !selectedLiberoId)
                                    }
                                    className={`w-full h-14 font-bold rounded-xl shadow-lg border-t border-white/10 uppercase tracking-widest text-sm transition-all ${Object.keys(selectedStarters).length === 6 &&
                                        ((derivedState.currentSet !== 1 && derivedState.currentSet !== 5) || initialServerChoice) &&
                                        (!availablePlayers.some(p => p.role === 'L') || selectedLiberoId)
                                        ? 'bg-emerald-600 text-white active:bg-emerald-700'
                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-transparent'
                                        }`}
                                >
                                    {Object.keys(selectedStarters).length !== 6
                                        ? 'FALTAN JUGADORAS'
                                        : (availablePlayers.some(p => p.role === 'L') && !selectedLiberoId)
                                            ? 'FALTA LÍBERO'
                                            : ((derivedState.currentSet === 1 || derivedState.currentSet === 5) && !initialServerChoice)
                                                ? 'ELIGE SAQUE'
                                                : 'CONFIRMAR TITULARES'}
                                </button>
                            </div>
                        </div >
                    )
                }

                {/* MODAL ROTATION */}
                {
                    showRotationModal && (
                        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-in fade-in duration-100" onClick={() => setShowRotationModal(false)}>
                            <div className="bg-zinc-900 w-full max-w-xs rounded-xl border border-zinc-800 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                                <div className="text-center mb-6">
                                    <h3 className="text-white font-bold text-lg uppercase tracking-widest">Rotación Actual</h3>
                                    <p className="text-zinc-500 text-xs mt-1">Saca: P1</p>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {/* Front: 4-3-2 */}
                                    {[4, 3, 2].map(pos => {
                                        const p = getPlayerAt(pos)
                                        const display = getPlayerDisplay(p?.id)
                                        return (
                                            <div key={pos} className="aspect-square bg-zinc-800 rounded-full border border-zinc-700 flex flex-col items-center justify-center shadow-lg relative overflow-visible">
                                                <span className="text-2xl font-bold text-white z-10">{display.number}</span>
                                                <span className="text-[10px] text-zinc-500 uppercase z-10 truncate w-full text-center px-1">{display.name}</span>

                                                {/* Role Badge */}
                                                {display.role && display.role.toLowerCase() !== 'starter' && (
                                                    <div className="absolute -bottom-1.5 right-1 rounded-full bg-zinc-900 px-1.5 py-[1px] border border-zinc-700">
                                                        <span className="text-[7px] text-zinc-400 font-bold uppercase">{display.role}</span>
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-transparent rounded-full" />
                                            </div>
                                        )
                                    })}
                                    {/* Back: 5-6-1 */}
                                    {[5, 6, 1].map(pos => {
                                        const p = getPlayerAt(pos)
                                        const display = getPlayerDisplay(p?.id)
                                        return (
                                            <div key={pos} className="aspect-square bg-zinc-800/50 rounded-full border border-zinc-700/50 flex flex-col items-center justify-center shadow-sm relative overflow-visible">
                                                <span className="text-2xl font-bold text-zinc-400 z-10">{display.number}</span>
                                                <span className="text-[9px] text-zinc-600 uppercase z-10 truncate w-full text-center px-1">{display.name}</span>

                                                {/* Role Badge */}
                                                {display.role && display.role.toLowerCase() !== 'starter' && (
                                                    <div className="absolute -bottom-1.5 right-1 rounded-full bg-zinc-900/80 px-1.5 py-[1px] border border-zinc-700/50">
                                                        <span className="text-[7px] text-zinc-500 font-bold uppercase">{display.role}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                <button onClick={() => setShowRotationModal(false)} className="w-full py-3 bg-zinc-800 text-white font-bold rounded-lg active:bg-zinc-700">
                                    CERRAR
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* MODAL RECEPTION */}
                {
                    showReceptionModal && (
                        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
                            <div className="w-full max-w-md bg-zinc-900 border-t border-zinc-800 p-4 pb-8 animate-in slide-in-from-bottom duration-300 rounded-t-2xl shadow-2xl">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <span className="font-bold text-white uppercase tracking-wider text-sm">Evaluar Recepción</span>
                                    <button onClick={() => setShowReceptionModal(false)} className="text-xs text-zinc-500 font-bold p-2">CANCELAR</button>
                                </div>

                                <div className="flex gap-2 h-24">
                                    <button onClick={() => handleReception(0)} className="flex-1 bg-red-900/80 active:bg-red-800 rounded-xl flex flex-col items-center justify-center border border-red-900/50">
                                        <span className="text-3xl font-black text-red-100 mb-1">===</span>
                                        <span className="text-[10px] text-red-200 font-bold uppercase">ERROR</span>
                                    </button>

                                    <div className="flex-[2] grid grid-cols-3 gap-2">
                                        <button onClick={() => handleReception(1)} className="bg-zinc-800 active:bg-zinc-700 rounded-xl flex items-center justify-center border border-zinc-700">
                                            <span className="text-2xl font-bold text-zinc-400">1</span>
                                        </button>
                                        <button onClick={() => handleReception(2)} className="bg-zinc-800 active:bg-zinc-700 rounded-xl flex items-center justify-center border border-zinc-700">
                                            <span className="text-2xl font-bold text-zinc-400">2</span>
                                        </button>
                                        <button onClick={() => handleReception(3)} className="bg-zinc-800 active:bg-zinc-700 rounded-xl flex items-center justify-center border border-zinc-700">
                                            <span className="text-2xl font-bold text-zinc-400">3</span>
                                        </button>
                                    </div>

                                    <button onClick={() => handleReception(4)} className="flex-1 bg-emerald-900/80 active:bg-emerald-800 rounded-xl flex flex-col items-center justify-center border border-emerald-900/50">
                                        <span className="text-3xl font-black text-emerald-100 mb-1">#</span>
                                        <span className="text-[10px] text-emerald-200 font-bold uppercase">PERF</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                <SetSummaryModalV2
                    isOpen={derivedState.setSummaryModalOpen}
                    summary={derivedState.lastFinishedSetSummary}
                    homeTeamName={homeTeamName || 'Local'}
                    awayTeamName={awayTeamName || 'Visitante'}
                    onClose={handleCloseSetSummary}
                    onConfirm={handleConfirmSetSummary}
                    onUndo={handleUndoSetSummary}
                />

                <MatchFinishedModal
                    isOpen={isMatchFinishedModalOpen}
                    onConfirm={handleConfirmFinish}
                    onUndo={handleUndoFinish}
                    onViewReadOnly={handleViewReadOnly}
                    homeTeamName={homeTeamName || 'Local'}
                    awayTeamName={awayTeamName || 'Visitante'}
                    setsWonHome={derivedState.setsWonHome}
                    setsWonAway={derivedState.setsWonAway}
                    finalSetScore={derivedState.setsScores[derivedState.setsScores.length - 1] || { home: 0, away: 0 }}
                />

                {/* MODAL SUBSTITUTION */}
                <SubstitutionModalV2
                    isOpen={showSubstitutionModal}
                    onClose={() => setShowSubstitutionModal(false)}
                    onConfirm={handleConfirmSubstitution}
                    onCourtPlayers={derivedState.onCourtPlayers}
                    benchPlayers={benchPlayers}
                    currentSetNumber={derivedState.currentSet}
                    allPlayers={availablePlayers}
                    currentSetSubstitutions={derivedState.currentSetSubstitutions}
                />

            </div>
        </div>
    )
}
