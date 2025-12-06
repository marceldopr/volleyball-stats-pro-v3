import { create } from 'zustand'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from './authStore'

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
  // New fields
  category_stage: 'Benjamín' | 'Alevín' | 'Infantil' | 'Cadete' | 'Juvenil' | 'Júnior' | 'Sénior'
  division_name?: string | null
  team_suffix?: string | null
  gender: 'female' | 'male' | 'mixed'
  // Legacy/Computed
  players: Player[]
  createdAt: string
}

interface TeamState {
  teams: Team[]
  currentTeam: Team | null
  loading: boolean
  error: string | null

  loadTeams: () => Promise<void>
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'players'>) => Promise<void>
  updateTeam: (id: string, team: Partial<Team>) => Promise<void>
  deleteTeam: (id: string) => Promise<void>
  setCurrentTeam: (team: Team | null) => void

  addPlayer: (teamId: string, player: Omit<Player, 'id'>) => Promise<void>
  updatePlayer: (teamId: string, playerId: string, player: Partial<Player>) => Promise<void>
  deletePlayer: (teamId: string, playerId: string) => Promise<void>
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  currentTeam: null,
  loading: false,
  error: null,

  loadTeams: async () => {
    set({ loading: true, error: null })
    try {
      const { profile } = useAuthStore.getState()
      if (!profile?.club_id) throw new Error('No club ID found')

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('club_id', profile.club_id)
        .order('created_at', { ascending: false })

      if (teamsError) throw teamsError

      const teamIds = teamsData.map(t => t.id)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('team_id', teamIds)

      if (playersError) throw playersError

      const formattedTeams: Team[] = teamsData.map(team => {
        const teamPlayers = playersData
          .filter(p => p.team_id === team.id)
          .map(p => ({
            id: p.id,
            name: p.name,
            number: p.number,
            role: p.role,
            height: p.height,
            weight: p.weight,
            dominant: p.dominant_hand,
            notes: p.notes,
            isActive: p.is_active
          }))

        return {
          id: team.id,
          name: team.custom_name,
          category_stage: team.category_stage,
          division_name: team.division_name,
          team_suffix: team.team_suffix,
          gender: team.gender,
          players: teamPlayers,
          createdAt: team.created_at
        }
      })

      set({ teams: formattedTeams, loading: false })
    } catch (error) {
      console.error('Error loading teams:', error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  addTeam: async (teamData) => {
    set({ loading: true, error: null })
    try {
      const { profile } = useAuthStore.getState()
      if (!profile?.club_id) throw new Error('No club ID found')

      const { data, error } = await supabase
        .from('teams')
        .insert({
          club_id: profile.club_id,
          name: teamData.name,
          category_stage: teamData.category_stage,
          division_name: teamData.division_name,
          team_suffix: teamData.team_suffix,
          gender: teamData.gender
        })
        .select()
        .single()

      if (error) throw error

      const newTeam: Team = {
        id: data.id,
        name: data.name,
        category_stage: data.category_stage,
        division_name: data.division_name,
        team_suffix: data.team_suffix,
        gender: data.gender,
        players: [],
        createdAt: data.created_at
      }

      set(state => ({
        teams: [newTeam, ...state.teams],
        currentTeam: newTeam,
        loading: false
      }))
    } catch (error) {
      console.error('Error adding team:', error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateTeam: async (id, teamData) => {
    set({ loading: true, error: null })
    try {
      const updates: any = {}
      if (teamData.name) updates.name = teamData.name
      if (teamData.category_stage) updates.category_stage = teamData.category_stage
      if (teamData.division_name !== undefined) updates.division_name = teamData.division_name
      if (teamData.team_suffix !== undefined) updates.team_suffix = teamData.team_suffix
      if (teamData.gender) updates.gender = teamData.gender

      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      set(state => ({
        teams: state.teams.map(t => t.id === id ? { ...t, ...teamData } : t),
        currentTeam: state.currentTeam?.id === id ? { ...state.currentTeam, ...teamData } : state.currentTeam,
        loading: false
      }))
    } catch (error) {
      console.error('Error updating team:', error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteTeam: async (id) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id)

      if (error) throw error

      set(state => ({
        teams: state.teams.filter(t => t.id !== id),
        currentTeam: state.currentTeam?.id === id ? null : state.currentTeam,
        loading: false
      }))
    } catch (error) {
      console.error('Error deleting team:', error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  setCurrentTeam: (team) => {
    set({ currentTeam: team })
  },

  addPlayer: async (teamId, playerData) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('players')
        .insert({
          team_id: teamId,
          name: playerData.name,
          number: playerData.number,
          role: playerData.role,
          height: playerData.height,
          weight: playerData.weight,
          dominant_hand: playerData.dominant,
          notes: playerData.notes,
          is_active: playerData.isActive
        })
        .select()
        .single()

      if (error) throw error

      const newPlayer: Player = {
        id: data.id,
        name: data.name,
        number: data.number,
        role: data.role,
        height: data.height,
        weight: data.weight,
        dominant: data.dominant_hand,
        notes: data.notes,
        isActive: data.is_active
      }

      set(state => {
        const updatedTeams = state.teams.map(team =>
          team.id === teamId
            ? { ...team, players: [...team.players, newPlayer] }
            : team
        )

        return {
          teams: updatedTeams,
          currentTeam: state.currentTeam?.id === teamId
            ? { ...state.currentTeam, players: [...state.currentTeam.players, newPlayer] }
            : state.currentTeam,
          loading: false
        }
      })
    } catch (error) {
      console.error('Error adding player:', error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updatePlayer: async (teamId, playerId, playerData) => {
    set({ loading: true, error: null })
    try {
      const updates: any = {}
      if (playerData.name) updates.name = playerData.name
      if (playerData.number) updates.number = playerData.number
      if (playerData.role) updates.role = playerData.role
      if (playerData.height !== undefined) updates.height = playerData.height
      if (playerData.weight !== undefined) updates.weight = playerData.weight
      if (playerData.dominant) updates.dominant_hand = playerData.dominant
      if (playerData.notes !== undefined) updates.notes = playerData.notes
      if (playerData.isActive !== undefined) updates.is_active = playerData.isActive

      const { error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', playerId)

      if (error) throw error

      set(state => {
        const updatedTeams = state.teams.map(team =>
          team.id === teamId
            ? {
              ...team,
              players: team.players.map(p =>
                p.id === playerId ? { ...p, ...playerData } : p
              )
            }
            : team
        )

        return {
          teams: updatedTeams,
          currentTeam: state.currentTeam?.id === teamId
            ? {
              ...state.currentTeam,
              players: state.currentTeam.players.map(p =>
                p.id === playerId ? { ...p, ...playerData } : p
              )
            }
            : state.currentTeam,
          loading: false
        }
      })
    } catch (error) {
      console.error('Error updating player:', error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deletePlayer: async (teamId, playerId) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      if (error) throw error

      set(state => {
        const updatedTeams = state.teams.map(team =>
          team.id === teamId
            ? { ...team, players: team.players.filter(p => p.id !== playerId) }
            : team
        )

        return {
          teams: updatedTeams,
          currentTeam: state.currentTeam?.id === teamId
            ? { ...state.currentTeam, players: state.currentTeam.players.filter(p => p.id !== playerId) }
            : state.currentTeam,
          loading: false
        }
      })
    } catch (error) {
      console.error('Error deleting player:', error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  }
}))