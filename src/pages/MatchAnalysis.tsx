import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Calendar, Clock, Loader2 } from 'lucide-react'
import { useMatchStore } from '../stores/matchStore'
import { useTeamStore } from '../stores/teamStore'
import { AccionPartido, Equipo, Match } from '../stores/matchStore'
import { matchService } from '../services/matchService'

export function MatchAnalysis() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { matches } = useMatchStore()
  const { teams } = useTeamStore()

  const [match, setMatch] = useState<Match | undefined>(matches.find(m => m.id === id))
  const [loading, setLoading] = useState(!match || (match?.players?.length === 0))

  useEffect(() => {
    const loadMatch = async () => {
      if (!id) return

      // If match exists in store and has data, use it
      const storeMatch = matches.find(m => m.id === id)
      if (storeMatch && storeMatch.players?.length > 0 && storeMatch.sets?.length > 0) {
        setMatch(storeMatch)
        setLoading(false)
        return
      }

      // Otherwise fetch from Supabase
      setLoading(true)
      try {
        const fetchedMatch = await matchService.getMatchFullDetails(id)
        if (fetchedMatch) {
          setMatch(fetchedMatch)
        }
      } catch (err) {
        console.error('Error loading match analysis:', err)
      } finally {
        setLoading(false)
      }
    }
    loadMatch()
  }, [id, matches])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Partido no encontrado</h2>
          <button
            onClick={() => navigate('/matches')}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a partidos</span>
          </button>
        </div>
      </div>
    )
  }

  const myTeam = teams.find(team => team.id === match.teamId)
  const isHomeTeam = match.teamSide === 'local'

  // Team names
  const localTeamName = isHomeTeam ? myTeam?.name || 'Mi Equipo' : match.opponent
  const visitorTeamName = isHomeTeam ? match.opponent : myTeam?.name || 'Mi Equipo'

  // Set ending logic (same as live): 25/15 con diferencia ≥2
  const shouldEndSet = (setNumber: number, homeScore: number, awayScore: number): boolean => {
    const targetScore = setNumber === 5 ? 15 : 25
    const maxScore = Math.max(homeScore, awayScore)
    const diff = Math.abs(homeScore - awayScore)
    return maxScore >= targetScore && diff >= 2
  }

  // Calcular resultado global solo a partir de sets válidos y completos
  const setsValidos = (match.sets || []).filter(set => {
    const totalPuntos = (set.homeScore || 0) + (set.awayScore || 0)
    const esMarcadorValido = totalPuntos > 0 && shouldEndSet(set.number, set.homeScore, set.awayScore)
    return set.status === 'completed' || esMarcadorValido
  })

  // If no valid sets found from scores (e.g. loaded from Supabase without scores), try to use result string
  let finalResult = `${setsValidos.filter(s => s.homeScore > s.awayScore).length} – ${setsValidos.filter(s => s.awayScore > s.homeScore).length}`

  if (setsValidos.length === 0 && match.result) {
    finalResult = match.result
  }

  // Function to calculate action summary
  const calcularResumen = (acciones: AccionPartido[]) => {
    const resumen = {
      local: {} as Record<string, number>,
      visitante: {} as Record<string, number>,
    }

    for (const accion of acciones) {
      const bucket = resumen[accion.equipo as Equipo]
      bucket[accion.tipo] = (bucket[accion.tipo] || 0) + 1
    }

    return resumen
  }

  // Action type labels for display
  const actionLabels: Record<string, string> = {
    'punto_saque': 'Punto de saque',
    'error_saque': 'Error de saque',
    'punto_ataque': 'Punto de ataque',
    'ataque_bloqueado': 'Ataque bloqueado',
    'error_ataque': 'Error de ataque',
    'punto_bloqueo': 'Punto de bloqueo',
    'error_recepcion': 'Error de recepción',
    'error_generico': 'Error genérico',
    'error_rival': 'Error rival',
    'punto_rival': 'Punto rival'
  }

  // Calculate action summary
  const resumenAcciones = calcularResumen(match.acciones || [])
  const hasActionData = match.acciones && match.acciones.length > 0

  // Function to calculate player participation
  const calcularParticipacionJugadoras = (acciones: AccionPartido[]) => {
    const puntosJugadosPorJugadora: Record<string, number> = {}

    for (const accion of acciones) {
      if (!accion.jugadorasEnCanchaIds || accion.jugadorasEnCanchaIds.length === 0) continue

      for (const playerId of accion.jugadorasEnCanchaIds) {
        puntosJugadosPorJugadora[playerId] = (puntosJugadosPorJugadora[playerId] || 0) + 1
      }
    }

    return puntosJugadosPorJugadora
  }

  // Calculate player participation
  const participacionJugadoras = calcularParticipacionJugadoras(match.acciones || [])

  // Calculate sets played by each player
  const calcularSetsJugados = (acciones: AccionPartido[]) => {
    const setsJugadosPorJugadora: Record<string, Set<number>> = {}

    for (const accion of acciones) {
      if (!accion.jugadorasEnCanchaIds || accion.jugadorasEnCanchaIds.length === 0) continue

      for (const playerId of accion.jugadorasEnCanchaIds) {
        if (!setsJugadosPorJugadora[playerId]) {
          setsJugadosPorJugadora[playerId] = new Set<number>()
        }
        setsJugadosPorJugadora[playerId].add(accion.set)
      }
    }

    return setsJugadosPorJugadora
  }

  const setsJugadosPorJugadora = calcularSetsJugados(match.acciones || [])

  // Calculate individual player statistics
  const calcularEstadisticasJugadora = (acciones: AccionPartido[], playerId: string) => {
    // If we have stats in the player object (loaded from Supabase), use them
    const player = match.players.find(p => p.playerId === playerId)
    if (player && player.stats && (!acciones || acciones.length === 0)) {
      const s = player.stats
      const puntosAFavor = s.aces + s.kills + s.blocks
      const erroresPropios = s.serveErrors + s.attackErrors + s.receptionErrors + s.blockErrors + s.setErrors + s.digsErrors
      return {
        puntosAFavor,
        erroresPropios,
        balanceNeto: puntosAFavor - erroresPropios
      }
    }

    let puntosAFavor = 0
    let erroresPropios = 0

    for (const accion of acciones) {
      if (accion.jugadoraId === playerId) {
        // Puntos a favor: punto_saque, punto_ataque, punto_bloqueo
        if (accion.tipo === 'punto_saque' || accion.tipo === 'punto_ataque' || accion.tipo === 'punto_bloqueo') {
          puntosAFavor++
        }
        // Errores propios: error_saque, error_ataque, error_recepcion
        else if (accion.tipo === 'error_saque' || accion.tipo === 'error_ataque' || accion.tipo === 'error_recepcion') {
          erroresPropios++
        }
      }
    }

    return {
      puntosAFavor,
      erroresPropios,
      balanceNeto: puntosAFavor - erroresPropios
    }
  }

  // Calculate team reception statistics
  const calcularEstadisticasRecepcion = (acciones: AccionPartido[]) => {
    const recepcionesPorJugadora: Record<string, number[]> = {}
    let totalRecepciones = 0
    let sumaCalificaciones = 0

    for (const accion of acciones) {
      // Recepciones registradas (calificaciones 1-4)
      if (accion.recepcion && accion.equipo === match.teamSide) {
        const playerId = accion.recepcion.jugadoraId
        const calificacion = accion.recepcion.calificacion

        if (!recepcionesPorJugadora[playerId]) {
          recepcionesPorJugadora[playerId] = []
        }
        recepcionesPorJugadora[playerId].push(calificacion)

        sumaCalificaciones += calificacion
        totalRecepciones++
      }
      // Errores de recepción (valor 0) deben contarse como recepciones con calificación 0
      else if (
        accion.tipo === 'error_recepcion' &&
        accion.equipo === match.teamSide &&
        accion.jugadoraId
      ) {
        const playerId = accion.jugadoraId
        const calificacion = 0

        if (!recepcionesPorJugadora[playerId]) {
          recepcionesPorJugadora[playerId] = []
        }
        recepcionesPorJugadora[playerId].push(calificacion)

        sumaCalificaciones += calificacion
        totalRecepciones++
      }
    }

    const mediaEquipo = totalRecepciones > 0 ? sumaCalificaciones / totalRecepciones : null

    // Calculate individual player reception averages
    const mediasJugadoras = Object.entries(recepcionesPorJugadora)
      .map(([playerId, calificaciones]) => {
        const player = match.players.find(p => p.playerId === playerId)
        const suma = calificaciones.reduce((acc, cal) => acc + cal, 0)
        const media = suma / calificaciones.length

        return {
          playerId,
          name: player?.name || 'Jugadora desconocida',
          receptions: calificaciones.length,
          average: media
        }
      })
      .filter(jugadora => jugadora.receptions > 0) // incluir jugadoras con al menos 1 recepción (incluye 0)
      .sort((a, b) => b.average - a.average) // Sort by average (highest first)

    return {
      teamAverage: mediaEquipo,
      playerAverages: mediasJugadoras
    }
  }

  // For participation list, if we don't have actions, we iterate over players
  let jugadorasConParticipacion: any[] = []

  if (match.acciones && match.acciones.length > 0) {
    jugadorasConParticipacion = Object.entries(participacionJugadoras)
      .map(([playerId, puntosJugados]) => {
        const player = match.players.find(p => p.playerId === playerId)
        const setsJugados = setsJugadosPorJugadora[playerId]?.size ?? 0
        const estadisticas = calcularEstadisticasJugadora(match.acciones || [], playerId)
        return {
          playerId,
          name: player?.name || 'Jugadora desconocida',
          number: player?.number || 0,
          position: player?.position || '',
          puntosJugados,
          setsJugados,
          ...estadisticas
        }
      })
      .sort((a, b) => b.puntosJugados - a.puntosJugados)
  } else {
    // Fallback for Supabase matches without actions
    jugadorasConParticipacion = match.players.map(player => {
      const estadisticas = calcularEstadisticasJugadora([], player.playerId)
      return {
        playerId: player.playerId,
        name: player.name,
        number: player.number,
        position: player.position,
        puntosJugados: 0, // Cannot calculate without actions
        setsJugados: player.stats.sets || 0,
        ...estadisticas
      }
    }).filter(p => p.puntosAFavor > 0 || p.erroresPropios > 0 || p.setsJugados > 0) // Only show active players
      .sort((a, b) => b.puntosAFavor - a.puntosAFavor)
  }

  // Calculate reception statistics
  const estadisticasRecepcion = calcularEstadisticasRecepcion(match.acciones || [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/matches')}
            className="btn-outline flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la lista de partidos</span>
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis del partido</h1>

          <div className="flex items-center justify-center space-x-4 text-lg mb-4">
            <div className="text-center">
              <div className="font-semibold">{localTeamName}</div>
            </div>

            <div className="text-4xl font-bold text-primary-600">
              {finalResult}
            </div>

            <div className="text-center">
              <div className="font-semibold">{visitorTeamName}</div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{match.time}</span>
            </div>
            <div className="text-gray-500">•</div>
            <span>{match.location}</span>
          </div>
        </div>
      </div>

      {/* Sets Score Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
          Marcador por sets
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Set</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">{localTeamName}</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">{visitorTeamName}</th>
              </tr>
            </thead>
            <tbody>
              {match.sets.map((set) => (
                <tr key={set.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-3 px-4 font-medium">Set {set.number}</td>
                  <td className="py-3 px-4 text-center font-semibold">{set.homeScore}</td>
                  <td className="py-3 px-4 text-center font-semibold">{set.awayScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Resumen de acciones del partido
        </h2>

        {!hasActionData ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              No hay acciones detalladas registradas para este partido (importado de base de datos).
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local Team Actions */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{localTeamName}</h3>
              <div className="space-y-2">
                {Object.entries(resumenAcciones.local).length === 0 ? (
                  <div className="text-gray-500 text-sm">Sin acciones registradas</div>
                ) : (
                  Object.entries(resumenAcciones.local).map(([tipo, count]) => (
                    <div key={tipo} className="flex justify-between items-center py-1">
                      <span className="text-gray-700">{actionLabels[tipo] || tipo}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Visitor Team Actions */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{visitorTeamName}</h3>
              <div className="space-y-2">
                {Object.entries(resumenAcciones.visitante).length === 0 ? (
                  <div className="text-gray-500 text-sm">Sin acciones registradas</div>
                ) : (
                  Object.entries(resumenAcciones.visitante).map(([tipo, count]) => (
                    <div key={tipo} className="flex justify-between items-center py-1">
                      <span className="text-gray-700">{actionLabels[tipo] || tipo}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reception Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Análisis de recepción
        </h2>

        {!hasActionData || estadisticasRecepcion.playerAverages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              No hay datos detallados de recepción para este partido.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Team Reception Average */}
            {estadisticasRecepcion.teamAverage !== null && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Media de recepción del equipo</h3>
                <div className="text-2xl font-bold text-blue-800">
                  {estadisticasRecepcion.teamAverage.toFixed(2)}
                </div>
              </div>
            )}

            {/* Individual Player Reception Averages */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Media de recepción por jugadora</h3>
              <div className="space-y-2">
                {estadisticasRecepcion.playerAverages.map((jugadora) => (
                  <div key={jugadora.playerId} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">
                      {jugadora.name}
                      <span className="text-sm text-gray-500 ml-2">({jugadora.receptions} recepciones)</span>
                    </span>
                    <span className="font-semibold text-gray-900">
                      {jugadora.average.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Participation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Participación por jugadora
        </h2>

        {jugadorasConParticipacion.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              No hay datos de participación por jugadora para este partido.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Nº</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Jugadora</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Rol</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Sets jugados</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Puntos jugados</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Puntos a favor</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Errores</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Balance neto</th>
                </tr>
              </thead>
              <tbody>
                {jugadorasConParticipacion.map((jugadora) => (
                  <tr key={jugadora.playerId} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{jugadora.number}</td>
                    <td className="py-3 px-4">{jugadora.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${jugadora.position === 'S' ? 'bg-blue-100 text-blue-800' :
                          jugadora.position === 'OH' ? 'bg-green-100 text-green-800' :
                            jugadora.position === 'MB' ? 'bg-yellow-100 text-yellow-800' :
                              jugadora.position === 'OPP' ? 'bg-purple-100 text-purple-800' :
                                jugadora.position === 'L' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                        }`}>
                        {jugadora.position}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-900">{jugadora.setsJugados}</td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-900">{jugadora.puntosJugados}</td>
                    <td className="py-3 px-4 text-center font-semibold text-green-600">{jugadora.puntosAFavor}</td>
                    <td className="py-3 px-4 text-center font-semibold text-red-600">{jugadora.erroresPropios}</td>
                    <td className={`py-3 px-4 text-center font-semibold ${(jugadora.balanceNeto || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {(jugadora.balanceNeto || 0) >= 0 ? '+' : ''}{jugadora.balanceNeto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
