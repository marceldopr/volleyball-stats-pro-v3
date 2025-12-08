import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Undo2, Redo2, RotateCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useMatchStoreV2 } from '@/stores/matchStoreV2'
import { matchServiceV2 } from '@/services/matchServiceV2'
import { toast } from 'sonner'

export function LiveMatchScoutingV2() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()

    // Store
    const {
        derivedState,
        events,
        futureEvents,
        loadMatch,
        addEvent,
        setInitialOnCourtPlayers,
        undoEvent,
        redoEvent
    } = useMatchStoreV2()

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
    const lastSetRef = useRef<number | null>(null)

    // Load Match & Convocations only once
    useEffect(() => {
        if (!matchId) return

        const init = async () => {
            try {
                setLoading(true)
                const match = await matchServiceV2.getMatchV2(matchId)
                if (!match) throw new Error('Match not found')

                setMatchData(match)

                // 1. Determine Our Side
                const ourSide = match.home_away === 'home' ? 'home' : 'away'

                // 2. Load Match into Store
                loadMatch(match.id, match.actions || [], ourSide)

                // 3. Load Convocations to get players
                const convos = await matchServiceV2.getConvocationsV2(matchId)

                // Map all available players
                const players = convos
                    .filter(c => c.status === 'convocado' || c.status === undefined)
                    .map(c => {
                        const pData = c.club_players || {}
                        const number = c.jersey_number || pData.jersey_number || '?'
                        const name = pData.nickname || pData.first_name || `J${number}`

                        return {
                            id: c.player_id,
                            name,
                            number,
                            role: c.role_in_match || pData.position || '?'
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

            // Only open if NO lineup exists for this new set
            if (!derivedState.hasLineupForCurrentSet) {
                setShowStartersModal(true)
            } else {
                setShowStartersModal(false)
            }
        }
    }, [derivedState.currentSet, derivedState.hasLineupForCurrentSet])

    // Initial mount check for reload scenarios
    useEffect(() => {
        // If we load the page, have no lineup, and haven't tracked it yet
        if (derivedState.currentSet && !derivedState.hasLineupForCurrentSet && lastSetRef.current === null) {
            lastSetRef.current = derivedState.currentSet
            setShowStartersModal(true)
        } else if (derivedState.currentSet && lastSetRef.current === null) {
            // If we DO have lineup, just sync the ref
            lastSetRef.current = derivedState.currentSet
        }
    }, [derivedState.currentSet, derivedState.hasLineupForCurrentSet])

    // Helper for safe actions (Anti-Double-Tap)
    const handleAction = (fn: () => void) => {
        if (buttonsDisabled) return
        setButtonsDisabled(true)
        fn()
        setTimeout(() => {
            setButtonsDisabled(false)
        }, 350)
    }

    // Handlers
    const handlePointUs = (reason: string) => {
        handleAction(() => addEvent('POINT_US', { reason }))
    }

    const handlePointOpponent = (reason: string) => {
        handleAction(() => addEvent('POINT_OPPONENT', { reason }))
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

        addEvent('SET_LINEUP', { setNumber: derivedState.currentSet, lineup: lineup as any })


        // Close modal strictly
        setShowStartersModal(false)
        setActivePosition(null)
        setSelectedStarters({})
        setInitialServerChoice(null)
    }

    // derived booleans
    // derived booleans - continued below
    // const isHome = derivedState.ourSide === 'home' // Removed duplicate

    // A simplified 'isServing' check based on rotation or score state?
    // Actually we need to know who is serving.
    // In matchStoreV2, we might not have explicitly 'servingSide' in derivedState if not defined.
    // Let's check derivedState type in matchStoreV2.ts.
    // It has: homeScore, awayScore, setsWonHome, setsWonAway, currentSet, ourSide.
    // It MISSES 'servingSide'. We need to calculate it or add it to store.
    // FOR NOW, to fix the error, we will derive it or default it.

    // NOTE: Real implementation needs 'servingSide' from store.
    // Assuming for now matchData might have it or we calculate from events.
    // BUT checking the JSX, it uses `isServing` (boolean).

    // derived booleans
    const isServing = derivedState.servingSide === 'our'


    if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando...</div>
    if (!matchData) return null

    return (
        <div className="min-h-screen bg-zinc-950 flex justify-center text-white font-sans overflow-y-auto">
            <div className="w-full max-w-md bg-zinc-950 shadow-2xl min-h-screen flex flex-col pb-4 text-white">

                {/* HEADER */}
                <header className="flex-none bg-zinc-900/90 border-b border-zinc-800 py-3 px-4 flex items-center justify-between z-20 sticky top-0 backdrop-blur-md shadow-md">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/matches')} className="h-10 w-10 text-zinc-400 hover:text-white p-0">
                        <ArrowLeft size={24} />
                    </Button>

                    <div className="flex flex-col items-center flex-1">
                        <div className="flex flex-col items-center mb-2">
                            <span className="text-zinc-500 font-mono text-[10px] font-bold tracking-widest uppercase">Set {derivedState.currentSet}</span>
                            <span className="text-[10px] text-zinc-600 font-mono font-bold">
                                ({matchData?.home_away === 'home' ? derivedState.setsWonHome : derivedState.setsWonAway} - {matchData?.home_away === 'home' ? derivedState.setsWonAway : derivedState.setsWonHome})
                            </span>
                        </div>

                        <div className="flex items-center gap-6">
                            {/* HOME SCORE */}
                            <div className={`flex flex-col items-center px-3 py-1 rounded-lg transition-all duration-300 border ${(derivedState.servingSide === 'our' && derivedState.ourSide === 'home') || (derivedState.servingSide === 'opponent' && derivedState.ourSide === 'away')
                                ? "bg-zinc-800/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                : "border-transparent opacity-60"
                                }`}>
                                <span className={`text-4xl font-black tracking-tighter leading-none ${derivedState.ourSide === 'home' ? 'text-white' : 'text-zinc-500'}`}>
                                    {derivedState.homeScore}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1 items-center opacity-30">
                                <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                                <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                            </div>

                            {/* AWAY SCORE */}
                            <div className={`flex flex-col items-center px-3 py-1 rounded-lg transition-all duration-300 border ${(derivedState.servingSide === 'our' && derivedState.ourSide === 'away') || (derivedState.servingSide === 'opponent' && derivedState.ourSide === 'home')
                                ? "bg-zinc-800/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                : "border-transparent opacity-60"
                                }`}>
                                <span className={`text-4xl font-black tracking-tighter leading-none ${derivedState.ourSide !== 'home' ? 'text-white' : 'text-zinc-500'}`}>
                                    {derivedState.awayScore}
                                </span>
                            </div>
                        </div>

                        {/* Serving Label */}
                        <div className="mt-2 flex items-center justify-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${derivedState.servingSide === 'our' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${derivedState.servingSide === 'our' ? 'text-emerald-100' : 'text-rose-100/70'}`}>
                                Saca: {derivedState.servingSide === 'our' ? 'Nosotros' : 'Rival'}
                            </span>
                        </div>
                    </div>
                    <div className="w-10" />
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

                    {/* ROTATION STRIP */}
                    <div className="mt-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-2 flex flex-col gap-1 items-center cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => setShowRotationModal(true)}>
                        <div className="flex justify-center gap-1 w-full border-b border-zinc-800/50 pb-1">
                            {[4, 3, 2].map(pos => {
                                const p = getPlayerAt(pos)
                                return (
                                    <div key={pos} className="flex-1 h-10 bg-zinc-800/80 rounded border border-zinc-700/50 flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-xs font-bold text-zinc-300">{p?.number || '-'}</span>
                                        <span className="text-[7px] text-zinc-500 uppercase">P{pos} {p?.role}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex justify-center gap-1 w-full pt-1">
                            {[5, 6, 1].map(pos => {
                                const p = getPlayerAt(pos)
                                return (
                                    <div key={pos} className="flex-1 h-10 bg-zinc-800/50 rounded border border-zinc-700/30 flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-xs font-bold text-zinc-400">{p?.number || '-'}</span>
                                        <span className="text-[7px] text-zinc-600 uppercase">P{pos} {p?.role}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>

                {/* FOOTER */}
                <div className="mt-auto pt-4 bg-zinc-950 border-t border-zinc-900 h-16 px-4 flex items-center justify-between">
                    <div className="flex gap-4">
                        <button onClick={() => undoEvent()} disabled={events.length === 0} className="flex flex-col items-center gap-1 text-zinc-500 active:text-white disabled:opacity-30">
                            <Undo2 size={20} />
                            <span className="text-[9px] font-bold">DESHACER</span>
                        </button>
                        <button onClick={() => redoEvent()} disabled={futureEvents.length === 0} className="flex flex-col items-center gap-1 text-zinc-500 active:text-white disabled:opacity-30">
                            <Redo2 size={20} />
                            <span className="text-[9px] font-bold">REHACER</span>
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <button className="flex flex-col items-center gap-1 text-zinc-600 active:text-zinc-400">
                            <Users size={20} />
                            <span className="text-[9px] font-bold">CAMBIO</span>
                        </button>
                        <button onClick={() => setShowRotationModal(true)} className="flex flex-col items-center gap-1 text-zinc-400 active:text-white">
                            <RotateCw size={18} />
                            <span className="text-[9px] font-bold">ROTACIÓN</span>
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
                                            const player = availablePlayers.find(p => p.id === selectedId);
                                            const isActive = activePosition === pos

                                            // Filter logic: Only show players NOT selected elsewhere (or the one currently selected in this pos)
                                            const availableForPos = availablePlayers.filter(p => {
                                                const usedInOtherPos = Object.entries(selectedStarters).some(([otherPos, otherId]) => {
                                                    return parseInt(otherPos) !== pos && otherId === p.id;
                                                });
                                                return !usedInOtherPos;
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
                                                        <span className={`text-[10px] font-bold mb-0.5 ${isActive ? 'text-emerald-300' : 'opacity-70'}`}>P{pos}</span>
                                                        {selectedId ? (
                                                            <>
                                                                <span className="text-xl font-bold">{player?.number}</span>
                                                                <span className="text-[9px] truncate max-w-[90%] px-1 opacity-90 leading-tight">{player?.name}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-bold text-zinc-600">+</span>
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
                                                                        <div className="flex flex-col leading-none">
                                                                            <span>{p.name}</span>
                                                                            <span className="text-[9px] text-zinc-500 uppercase">{p.role}</span>
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
                                            const player = availablePlayers.find(p => p.id === selectedId);
                                            const isActive = activePosition === pos;

                                            // Same filter logic
                                            const availableForPos = availablePlayers.filter(p => {
                                                const usedInOtherPos = Object.entries(selectedStarters).some(([otherPos, otherId]) => {
                                                    return parseInt(otherPos) !== pos && otherId === p.id;
                                                });
                                                return !usedInOtherPos;
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
                                                        <span className={`text-[10px] font-bold mb-0.5 ${isActive ? 'text-emerald-300' : 'opacity-70'}`}>P{pos}</span>
                                                        {selectedId ? (
                                                            <>
                                                                <span className="text-xl font-bold">{player?.number}</span>
                                                                <span className="text-[9px] truncate max-w-[90%] px-1 opacity-90 leading-tight">{player?.name}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-bold text-zinc-600">+</span>
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
                                                                            <span className="text-[9px] text-zinc-500 uppercase">{p.role}</span>
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
                                </div>

                                <button
                                    onClick={handleConfirmStarters}
                                    disabled={
                                        Object.keys(selectedStarters).length !== 6 ||
                                        ((derivedState.currentSet === 1 || derivedState.currentSet === 5) && !initialServerChoice)
                                    }
                                    className={`w-full h-14 font-bold rounded-xl shadow-lg border-t border-white/10 uppercase tracking-widest text-sm transition-all ${Object.keys(selectedStarters).length === 6 && ((derivedState.currentSet !== 1 && derivedState.currentSet !== 5) || initialServerChoice)
                                        ? 'bg-emerald-600 text-white active:bg-emerald-700'
                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-transparent'
                                        }`}
                                >
                                    {Object.keys(selectedStarters).length !== 6
                                        ? 'FALTAN JUGADORAS'
                                        : ((derivedState.currentSet === 1 || derivedState.currentSet === 5) && !initialServerChoice)
                                            ? 'ELIGE SAQUE'
                                            : 'CONFIRMAR TITULARES'}
                                </button>
                            </div>
                        </div>
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
                                        return (
                                            <div key={pos} className="aspect-square bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                                                <span className="text-2xl font-bold text-white z-10">{p?.number || '-'}</span>
                                                <span className="text-[10px] text-zinc-500 uppercase z-10">P{pos}</span>
                                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-transparent" />
                                            </div>
                                        )
                                    })}
                                    {/* Back: 5-6-1 */}
                                    {[5, 6, 1].map(pos => {
                                        const p = getPlayerAt(pos)
                                        return (
                                            <div key={pos} className="aspect-square bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex flex-col items-center justify-center shadow-sm">
                                                <span className="text-2xl font-bold text-zinc-400">{p?.number || '-'}</span>
                                                <span className="text-[10px] text-zinc-600 uppercase">P{pos}</span>
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

            </div >
        </div >
    )
}
