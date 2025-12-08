import { useEffect, useState } from 'react'
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

                // 4. Set Initial On Court Players (MVP: First 6)
                const readyPlayers = convos
                    .filter(c => c.status === 'convocado' || c.status === undefined)
                    .slice(0, 6)
                    .map(c => ({
                        id: c.player_id,
                        name: c.club_players?.nickname || c.club_players?.first_name || `J${c.jersey_number}`,
                        number: c.jersey_number,
                        role: c.club_players?.position || '?'
                    }))

                setInitialOnCourtPlayers(readyPlayers)

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

    // Auto-save effect
    useEffect(() => {
        if (!matchId || events.length === 0) return

        const save = async () => {
            try {
                await matchServiceV2.updateMatchV2(matchId, {
                    actions: events,
                    status: 'in_progress'
                })
            } catch (err) {
                console.error('Auto-save error', err)
            }
        }
        save()
    }, [events, matchId])


    // Helpers
    const isServing = derivedState.servingSide === 'our'
    const isReceiving = derivedState.servingSide === 'opponent'
    const onCourtPlayers = derivedState.onCourtPlayers

    const isHome = derivedState.ourSide === 'home'
    const isHomeServing = (isHome && isServing) || (!isHome && isReceiving)
    const isAwayServing = !isHomeServing

    // State for UX
    const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const [showRotationModal, setShowRotationModal] = useState(false)

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

    const handleReception = (value: 0 | 1 | 2 | 3 | 4) => {
        const playerId = onCourtPlayers[0]?.id || 'unknown'

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

    if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando...</div>
    if (!matchData) return null

    return (
        <div className="min-h-screen bg-zinc-950 flex justify-center text-white font-sans overflow-y-auto">
            {/* 1. ENVOLTORIO PRINCIPAL LAYOUT MÓVIL (Max-w-md, centrado) */}
            <div className="w-full max-w-md bg-zinc-950 shadow-2xl min-h-screen flex flex-col pb-4 text-white">

                {/* HEADER (Más grande y protagonista) */}
                <header className="flex-none bg-zinc-900/90 border-b border-zinc-800 py-3 px-4 flex items-center justify-between z-20 sticky top-0 backdrop-blur-md shadow-md">
                    <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/matches')} className="h-10 w-10 text-zinc-400 hover:text-white">
                        <span className="sr-only">Volver</span>
                    </Button>

                    {/* Scoreboard: Sets | Score | Sets */}
                    <div className="flex flex-col items-center">
                        <span className="text-zinc-500 font-mono text-xs font-bold tracking-widest mb-1">SET {derivedState.currentSet}</span>
                        <div className="flex items-center gap-6">
                            {/* HOME */}
                            <div className={`flex flex-col items-center leading-none ${derivedState.ourSide === 'home' ? 'text-white' : 'text-zinc-500'}`}>
                                <span className="text-4xl font-bold tracking-tighter">{derivedState.homeScore}</span>
                                <span className="text-[10px] text-zinc-600 font-mono mt-1">({derivedState.setsWonHome})</span>
                            </div>

                            {/* SERVE INDICATOR */}
                            <div className="flex flex-col gap-1 items-center pb-2">
                                {isHomeServing ? <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> : <div className="w-2 h-2 bg-zinc-800 rounded-full" />}
                                <span className="text-zinc-700 text-xs font-light">-</span>
                                {isAwayServing ? <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> : <div className="w-2 h-2 bg-zinc-800 rounded-full" />}
                            </div>

                            {/* AWAY */}
                            <div className={`flex flex-col items-center leading-none ${derivedState.ourSide !== 'home' ? 'text-white' : 'text-zinc-500'}`}>
                                <span className="text-4xl font-bold tracking-tighter">{derivedState.awayScore}</span>
                                <span className="text-[10px] text-zinc-600 font-mono mt-1">({derivedState.setsWonAway})</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-10" />
                </header>

                {/* 2. GRID DE BOTONES REORGANIZADA (5 Filas, Simétricas) */}
                <div className="flex-1 px-3 pt-3 flex flex-col">

                    {/* Indicador "Nosotros / Rival" */}
                    <div className="flex justify-between px-1 mb-2 text-[10px] uppercase font-bold tracking-wider opacity-80">
                        <span className="text-emerald-500">Nosotros</span>
                        <span className="text-red-500">Rival</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">

                        {/* FILA 1: SAQUE / RECEPCIÓN */}
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
                                {/* Cuando recibimos, sustituimos "Punto Saque" por "Recepción" para mantener funcionalidad */}
                                <button onClick={() => setShowReceptionModal(true)} disabled={buttonsDisabled} className="h-14 bg-blue-600 active:bg-blue-500 text-white rounded-lg font-bold text-sm shadow-sm border border-blue-400/30 transition-all hover:brightness-110">
                                    Recepción
                                </button>
                                {/* Hueco o Deshabilitado en columna derecha para mantener simetría visual */}
                                <div className="h-14 bg-zinc-900/50 rounded-lg border border-zinc-800/50 flex items-center justify-center">
                                    <span className="text-zinc-700 text-[10px] uppercase font-bold tracking-wider">Esperando...</span>
                                </div>
                            </>
                        )}


                        {/* FILA 2: ATAQUE */}
                        <button onClick={() => handlePointUs('attack_point')} disabled={buttonsDisabled} className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Punto ataque
                        </button>
                        <button onClick={() => handlePointOpponent('attack_error')} disabled={buttonsDisabled} className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Error ataque
                        </button>


                        {/* FILA 3: BLOQUEO */}
                        <button onClick={() => handlePointUs('block_point')} disabled={buttonsDisabled} className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Punto bloqueo
                        </button>
                        <button onClick={() => handlePointOpponent('attack_blocked')} disabled={buttonsDisabled} className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Bloqueado
                        </button>


                        {/* FILA 4: RIVAL GENÉRICO */}
                        <button onClick={() => handlePointUs('opponent_error')} disabled={buttonsDisabled} className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Error rival
                        </button>
                        <button onClick={() => handlePointOpponent('opponent_point')} disabled={buttonsDisabled} className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110">
                            Punto rival
                        </button>

                    </div>

                    {/* FILA 5: FREEBALL (Ancho completo) */}
                    <button onClick={() => handleAction(() => addEvent('FREEBALL'))} disabled={buttonsDisabled} className="mt-3 w-full h-12 bg-blue-600 active:bg-blue-500 text-white border border-blue-500/50 rounded-lg flex items-center justify-center font-mono text-xs uppercase tracking-widest font-bold shadow-sm hover:brightness-110 transition-all">
                        Freeball
                    </button>

                    {/* ROTATION STRIP (MOVED HERE - Abajo de Freeball) */}
                    <div className="mt-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-2 flex justify-center gap-2 items-center cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => setShowRotationModal(true)}>
                        {[3, 2, 1].map(pos => (
                            <div key={pos} className="h-9 w-7 bg-zinc-800/80 rounded border border-zinc-700/50 flex flex-col items-center justify-center shadow-sm">
                                <span className="text-xs font-bold text-zinc-300">{onCourtPlayers[pos]?.number || '-'}</span>
                                <span className="text-[7px] text-zinc-500 uppercase">P{pos + 1}</span>
                            </div>
                        ))}
                        <div className="w-px h-6 border-r border-dashed border-zinc-700/50 mx-1" />
                        {[4, 5, 0].map(pos => (
                            <div key={pos} className="h-9 w-7 bg-zinc-800/50 rounded border border-zinc-700/30 flex flex-col items-center justify-center shadow-sm">
                                <span className="text-xs font-bold text-zinc-400">{onCourtPlayers[pos]?.number || '-'}</span>
                                <span className="text-[7px] text-zinc-600 uppercase">P{pos + 1}</span>
                            </div>
                        ))}
                    </div>

                </div>

                {/* 4. FOOTER (Dentro del layout móvil) */}
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

                {/* MODAL ROTACIÓN (Detailed) */}
                {showRotationModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-in fade-in duration-100" onClick={() => setShowRotationModal(false)}>
                        <div className="bg-zinc-900 w-full max-w-xs rounded-xl border border-zinc-800 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="text-center mb-6">
                                <h3 className="text-white font-bold text-lg uppercase tracking-widest">Rotación Actual</h3>
                                <p className="text-zinc-500 text-xs mt-1">Saca: P1</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {[3, 2, 1].map(pos => (
                                    <div key={pos} className="aspect-square bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-white">{onCourtPlayers[pos]?.number || '-'}</span>
                                        <span className="text-[10px] text-zinc-500 uppercase">P{pos + 1}</span>
                                    </div>
                                ))}
                                {[4, 5, 0].map(pos => (
                                    <div key={pos} className="aspect-square bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-zinc-400">{onCourtPlayers[pos]?.number || '-'}</span>
                                        <span className="text-[10px] text-zinc-600 uppercase">P{pos + 1}</span>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setShowRotationModal(false)} className="w-full py-3 bg-zinc-800 text-white font-bold rounded-lg active:bg-zinc-700">
                                CERRAR
                            </button>
                        </div>
                    </div>
                )}

                {/* MODAL RECEPCIÓN (Bottom Sheet Style - Limited Width) */}
                {showReceptionModal && (
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
                )}
            </div>
        </div>
    )
}
