import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Equipo = 'local' | 'visitante'

export interface AccionPartido {
  id: string
  set: number
  equipo: Equipo
  tipo: string
  timestamp: string
  // NUEVO: ids de las jugadoras de MI EQUIPO que estaban en pista en ese rally
  jugadorasEnCanchaIds?: string[]  // longitud 6 normalmente (las 6 titulares o su configuración con líbero)
  // NUEVO: jugadora de MI equipo a la que se le asigna la acción (solo para acciones específicas)
  jugadoraId?: string
  // NUEVO: datos de recepción
  recepcion?: {
    jugadoraId: string
    calificacion: number // 0-4
    esError: boolean // true si calificacion === 0
  }
  // NUEVO: saque fallado rival (sin jugadora receptora)
  saqueFalladoRival?: boolean
}

export interface Match {
  id: string
  opponent: string
  date: string
  time: string
  location: string
  status: 'upcoming' | 'live' | 'completed'
  result?: string
  teamId: string
  teamSide: 'local' | 'visitante'
  sets: Set[]
  players: MatchPlayer[]
  startingLineup?: StartingLineup
  liberoConfig?: LiberoConfig[]
  currentSet: number
  setsWonLocal: number
  setsWonVisitor: number
  sacadorInicialSet1: 'local' | 'visitor' | null
  sacadorInicialSet5?: 'local' | 'visitor' | null
  acciones: AccionPartido[]
  timeline?: TimelineEvent[]
  // NUEVO: Parejas de sustitución por set con conteo de usos
  substitutionPairs?: {
    [setNumber: number]: {
      [playerId: string]: {
        partnerId: string
        usos: number
        maxUsos: number
      }
    }
  }
  // NUEVO: Override de líbero (jugadora de campo como líbero)
  liberoOverrideActive?: boolean
  liberoOverridePlayerId?: string
  // NUEVO: Líbero en pista por set (fuente de verdad)
  liberoOnCourtBySet?: {
    [setNumber: number]: string | null
  }
  // NUEVO: IDs de Supabase
  team_id?: string
  season_id?: string
  dbMatchId?: string // ID del partido en Supabase
  createdAt: string
  updatedAt: string
}

export interface Set {
  id: string
  number: number
  homeScore: number
  awayScore: number
  status: 'not_started' | 'in_progress' | 'completed'
}

export type TimelineEventType =
  | 'rally'
  | 'set_start'
  | 'set_end'
  | 'starters_open'
  | 'starters_confirmed'
  | 'serve_selection_chosen'
  | 'navigate_back_cancel_next_set'
  | 'match_end'
  | 'substitution'
  | 'libero_override_activated'

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  set: number
  timestamp: string
  scoreBefore?: { home: number; away: number }
  scoreAfter?: { home: number; away: number }
  serveStateBefore?: 'myTeamServing' | 'myTeamReceiving'
  serveStateAfter?: 'myTeamServing' | 'myTeamReceiving'
  rotationBefore?: number | null
  rotationAfter?: number | null
  rally?: {
    equipo: 'local' | 'visitante'
    tipo: string
    jugadoraId?: string
    jugadorasEnCanchaIds?: string[]
    recepcion?: {
      jugadoraId: string
      calificacion: number
      esError: boolean
    }
    saqueFalladoRival?: boolean
  }
  substitution?: {
    team: 'local' | 'visitante'
    playerOutId: string
    playerInId: string
    note?: string
    playersOnCourtBefore: string[]
    playersOnCourtAfter: string[]
    substitutionType: 'campo' | 'libero'
  }
  liberoOverride?: {
    playerId: string
  }
  metadata?: Record<string, any>
}

export interface MatchPlayer {
  playerId: string
  name: string
  number: number
  position: string
  starter: boolean
  stats: PlayerStats
}

export interface StartingLineup {
  position1: string | null
  position2: string | null
  position3: string | null
  position4: string | null
  position5: string | null
  position6: string | null
  libero: string | null
}

export interface LiberoConfig {
  liberoId: string
  replacesPlayerId: string
  backRowPositions: number[]
}

export interface PlayerStats {
  serves: number
  aces: number
  serveErrors: number
  receptions: number
  receptionErrors: number
  attacks: number
  kills: number
  attackErrors: number
  blocks: number
  blockErrors: number
  digs: number
  digsErrors: number
  sets: number
  setErrors: number
}

interface MatchState {
  matches: Match[]
  currentMatch: Match | null
  createMatch: (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => Match
  updateMatch: (id: string, updates: Partial<Match>) => void
  deleteMatch: (id: string) => void
  setCurrentMatch: (match: Match | null) => void
  setMatchDbId: (localMatchId: string, dbMatchId: string) => void // NUEVO
  addSetToMatch: (matchId: string, set: Set) => void
  updateSetScore: (matchId: string, setId: string, homeScore: number, awayScore: number) => void
  updatePlayerStats: (matchId: string, playerId: string, stats: Partial<PlayerStats>) => void
  updateStarters: (matchId: string, starterIds: string[]) => void
  updateStartingLineup: (matchId: string, startingLineup: StartingLineup) => void
  updateLiberoConfig: (matchId: string, liberoConfig: LiberoConfig[]) => void
  completeSet: (matchId: string, setNumber: number, homeScore: number, awayScore: number, winner: 'local' | 'visitor') => void
  startNewSet: (matchId: string, setNumber: number) => void
  updateStartingServerSet1: (matchId: string, server: 'local' | 'visitor') => void
  updateLiberoOnCourt: (matchId: string, setNumber: number, liberoId: string | null) => void
  addAction: (matchId: string, action: Omit<AccionPartido, 'id'>) => void
  removeLastAction: (matchId: string) => void
  getMatchesByTeam: (teamId: string) => Match[]
  getUpcomingMatches: () => Match[]
  getCompletedMatches: () => Match[]
  getLiveMatches: () => Match[]
}

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      matches: [],
      currentMatch: null,

      createMatch: (matchData) => {
        const newMatch: Match = {
          ...matchData,
          id: Date.now().toString(),
          currentSet: 1,
          setsWonLocal: 0,
          setsWonVisitor: 0,
          sacadorInicialSet1: matchData.sacadorInicialSet1 ?? null,
          sacadorInicialSet5: matchData.sacadorInicialSet5 ?? null,
          acciones: [],
          timeline: [
            {
              id: `${Date.now()}-set1-start`,
              type: 'set_start',
              set: 1,
              timestamp: new Date().toISOString(),
              scoreBefore: { home: 0, away: 0 },
              scoreAfter: { home: 0, away: 0 }
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          matches: [...state.matches, newMatch],
        }))

        return newMatch
      },

      updateMatch: (id, updates) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === id
              ? { ...match, ...updates, updatedAt: new Date().toISOString() }
              : match
          ),
        }))
      },

      deleteMatch: (id) => {
        set((state) => ({
          matches: state.matches.filter((match) => match.id !== id),
        }))
      },

      setCurrentMatch: (match) => {
        set({ currentMatch: match })
      },

      setMatchDbId: (localMatchId, dbMatchId) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === localMatchId
              ? { ...match, dbMatchId, updatedAt: new Date().toISOString() }
              : match
          ),
          currentMatch: state.currentMatch?.id === localMatchId
            ? { ...state.currentMatch, dbMatchId, updatedAt: new Date().toISOString() }
            : state.currentMatch
        }))
      },

      addSetToMatch: (matchId, newSet) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? { ...match, sets: [...match.sets, newSet] }
              : match
          ),
        }))
      },

      updateSetScore: (matchId, setId, homeScore, awayScore) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                sets: match.sets.map((set) =>
                  set.id === setId
                    ? { ...set, homeScore, awayScore }
                    : set
                ),
              }
              : match
          ),
        }))
      },

      updatePlayerStats: (matchId, playerId, stats) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                players: match.players.map((player) =>
                  player.playerId === playerId
                    ? { ...player, stats: { ...player.stats, ...stats } }
                    : player
                ),
              }
              : match
          ),
        }))
      },

      updateStarters: (matchId, starterIds) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                players: match.players.map((player) => ({
                  ...player,
                  starter: starterIds.includes(player.playerId)
                })),
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },

      updateStartingLineup: (matchId, startingLineup) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                startingLineup,
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },

      updateLiberoConfig: (matchId, liberoConfig) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                liberoConfig,
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },

      getMatchesByTeam: (teamId) => {
        return get().matches.filter((match) => match.teamId === teamId)
      },

      getUpcomingMatches: () => {
        return get().matches.filter((match) => match.status === 'upcoming')
      },

      getCompletedMatches: () => {
        return get().matches.filter((match) => match.status === 'completed')
      },

      getLiveMatches: () => {
        return get().matches.filter((match) => match.status === 'live')
      },

      completeSet: (matchId, setNumber, homeScore, awayScore, winner) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                sets: match.sets.map((set) =>
                  set.number === setNumber
                    ? { ...set, homeScore, awayScore, status: 'completed' }
                    : set
                ),
                setsWonLocal: winner === 'local' ? match.setsWonLocal + 1 : match.setsWonLocal,
                setsWonVisitor: winner === 'visitor' ? match.setsWonVisitor + 1 : match.setsWonVisitor,
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },

      startNewSet: (matchId, setNumber) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                currentSet: setNumber,
                sets: [...match.sets, {
                  id: `${matchId}-set${setNumber}`,
                  number: setNumber,
                  homeScore: 0,
                  awayScore: 0,
                  status: 'not_started'
                }],
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },

      updateStartingServerSet1: (matchId, server) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                sacadorInicialSet1: server,
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },

      addAction: (matchId, action) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                acciones: [...match.acciones, { ...action, id: Date.now().toString() }],
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },

      removeLastAction: (matchId) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                acciones: match.acciones.slice(0, -1),
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },

      updateLiberoOnCourt: (matchId, setNumber, liberoId) => {
        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === matchId
              ? {
                ...match,
                liberoOnCourtBySet: {
                  ...match.liberoOnCourtBySet,
                  [setNumber]: liberoId
                },
                updatedAt: new Date().toISOString()
              }
              : match
          ),
        }))
      },
    }),
    {
      name: 'match-storage',
    }
  )
)