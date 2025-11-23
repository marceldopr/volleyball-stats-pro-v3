import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Player {
  id: string
  name: string
  number: string
  role: 'S' | 'OH' | 'MB' | 'OPP' | 'L'
  height?: number
  weight?: number
  dominant?: 'left' | 'right'
  notes?: string
  isActive: boolean
}

export interface Team {
  id: string
  name: string
  category: 'female' | 'male' | 'mixed'
  ageGroup: 'U12' | 'U14' | 'U16' | 'U18' | 'senior'
  players: Player[]
  createdAt: string
}

interface TeamState {
  teams: Team[]
  currentTeam: Team | null
  addTeam: (team: Omit<Team, 'id' | 'createdAt'>) => void
  updateTeam: (id: string, team: Partial<Team>) => void
  deleteTeam: (id: string) => void
  setCurrentTeam: (team: Team | null) => void
  addPlayer: (teamId: string, player: Omit<Player, 'id'>) => void
  updatePlayer: (teamId: string, playerId: string, player: Partial<Player>) => void
  deletePlayer: (teamId: string, playerId: string) => void
  initializeTestTeam: () => void
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      teams: [],
      currentTeam: null,

      addTeam: (teamData) => {
        const newTeam: Team = {
          ...teamData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          teams: [...state.teams, newTeam],
          currentTeam: newTeam,
        }))
      },

      updateTeam: (id, teamData) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, ...teamData } : team
          ),
          currentTeam: state.currentTeam?.id === id
            ? { ...state.currentTeam, ...teamData }
            : state.currentTeam,
        }))
      },

      deleteTeam: (id) => {
        set((state) => ({
          teams: state.teams.filter((team) => team.id !== id),
          currentTeam: state.currentTeam?.id === id ? null : state.currentTeam,
        }))
      },

      setCurrentTeam: (team) => {
        set({ currentTeam: team })
      },

      addPlayer: (teamId, playerData) => {
        const newPlayer: Player = {
          ...playerData,
          id: Date.now().toString(),
        }
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? { ...team, players: [...team.players, newPlayer] }
              : team
          ),
          currentTeam: state.currentTeam?.id === teamId
            ? { ...state.currentTeam, players: [...state.currentTeam.players, newPlayer] }
            : state.currentTeam,
        }))
      },

      updatePlayer: (teamId, playerId, playerData) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? {
                ...team,
                players: team.players.map((player) =>
                  player.id === playerId ? { ...player, ...playerData } : player
                ),
              }
              : team
          ),
          currentTeam: state.currentTeam?.id === teamId
            ? {
              ...state.currentTeam,
              players: state.currentTeam.players.map((player) =>
                player.id === playerId ? { ...player, ...playerData } : player
              ),
            }
            : state.currentTeam,
        }))
      },

      deletePlayer: (teamId, playerId) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? { ...team, players: team.players.filter((p) => p.id !== playerId) }
              : team
          ),
          currentTeam: state.currentTeam?.id === teamId
            ? {
              ...state.currentTeam,
              players: state.currentTeam.players.filter((p) => p.id !== playerId),
            }
            : state.currentTeam,
        }))
      },

      initializeTestTeam: () => {
        set((state) => {
          // Check if test team already exists
          const testTeamExists = state.teams.some(team => team.id === 'test_team_auto')
          if (testTeamExists) {
            return state
          }

          // Create test team with 12 predefined players
          const testPlayers: Player[] = [
            // 2 Colocadoras (S)
            { id: 'test_player_1', name: 'Ana Test', number: '1', role: 'S', isActive: true },
            { id: 'test_player_2', name: 'Lucía Test', number: '2', role: 'S', isActive: true },

            // 2 Opuestos (OPP)
            { id: 'test_player_3', name: 'Marta Test', number: '3', role: 'OPP', isActive: true },
            { id: 'test_player_4', name: 'Irene Test', number: '4', role: 'OPP', isActive: true },

            // 2 Centrales (MB)
            { id: 'test_player_5', name: 'Paula Test', number: '5', role: 'MB', isActive: true },
            { id: 'test_player_6', name: 'Clara Test', number: '6', role: 'MB', isActive: true },

            // 2 Extremos (OH)
            { id: 'test_player_7', name: 'Julia Test', number: '7', role: 'OH', isActive: true },
            { id: 'test_player_8', name: 'Nerea Test', number: '8', role: 'OH', isActive: true },

            // 4 Líberos (L)
            { id: 'test_player_9', name: 'Eva Test', number: '9', role: 'L', isActive: true },
            { id: 'test_player_10', name: 'Noa Test', number: '10', role: 'L', isActive: true },
            { id: 'test_player_11', name: 'Aina Test', number: '11', role: 'L', isActive: true },
            { id: 'test_player_12', name: 'Nora Test', number: '12', role: 'L', isActive: true },
          ]

          const testTeam: Team = {
            id: 'test_team_auto',
            name: 'CV Antigravity Test',
            category: 'female',
            ageGroup: 'senior',
            players: testPlayers,
            createdAt: new Date().toISOString(),
          }

          return {
            teams: [...state.teams, testTeam],
            currentTeam: state.currentTeam,
          }
        })
      },
    }),
    {
      name: 'team-storage',
    }
  )
)