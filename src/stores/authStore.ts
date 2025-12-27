import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'
import { seasonService } from '@/services/seasonService'
import { coachAssignmentService } from '@/services/coachAssignmentService'

export type UserRole = 'dt' | 'coach' | 'admin'

export interface Profile {
    id: string
    club_id: string
    full_name: string
    role: UserRole | null
}

interface AuthState {
    session: Session | null
    profile: Profile | null
    loading: boolean
    error: string | null
    assignedTeamIds: string[] | null // null = not loaded yet, [] = loaded but empty
    setSession: (session: Session | null) => void
    setProfile: (profile: Profile | null) => void
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    fetchAssignments: (force?: boolean) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            session: null,
            profile: null,
            loading: false,
            error: null,
            assignedTeamIds: null,

            setSession: (session) => set({ session }),

            setProfile: (profile) => set({ profile }),

            login: async (email: string, password: string) => {
                set({ loading: true, error: null })

                try {
                    // Sign in with Supabase Auth
                    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    })

                    if (authError) throw authError

                    if (!authData.user) {
                        throw new Error('No user returned from authentication')
                    }

                    // Fetch profile from profiles table
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', authData.user.id)
                        .single()

                    if (profileError) throw profileError

                    // Set session and profile in store
                    set({
                        session: authData.session,
                        profile: profileData as Profile,
                        loading: false,
                        error: null,
                        assignedTeamIds: null // Reset assignments on new login
                    })

                    // Trigger fetch assignments if coach
                    if (profileData.role === 'coach') {
                        get().fetchAssignments()
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'An error occurred during login'
                    set({
                        session: null,
                        profile: null,
                        loading: false,
                        error: errorMessage,
                    })
                    throw error
                }
            },

            logout: async () => {
                set({ loading: true, error: null })

                try {
                    const { error } = await supabase.auth.signOut()

                    if (error) throw error

                    set({
                        session: null,
                        profile: null,
                        loading: false,
                        error: null,
                        assignedTeamIds: null
                    })
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'An error occurred during logout'
                    set({
                        loading: false,
                        error: errorMessage,
                    })
                    throw error
                }
            },

            fetchAssignments: async (force = false) => {
                const { profile, assignedTeamIds } = get()

                // If we already have assignments and not forcing, skip
                if (!force && assignedTeamIds !== null) return

                // Only fetch for coaches on login, but here valid for DT too if requested
                // Modified to allow DT to fetch assignments manually or if role is coach
                if ((profile?.role !== 'coach' && profile?.role !== 'dt') || !profile?.club_id) {
                    set({ assignedTeamIds: [] })
                    return
                }

                try {
                    // No loading state set here to avoid UI flickering if background update
                    // or we could use a separate 'loadingAssignments' state if needed

                    const currentSeason = await seasonService.getCurrentSeasonByClub(profile.club_id)

                    if (!currentSeason) {
                        set({ assignedTeamIds: [] })
                        return
                    }

                    const teamIds = await coachAssignmentService.getAssignedTeamsByUser(
                        profile.id,
                        currentSeason.id
                    )

                    set({ assignedTeamIds: teamIds })
                } catch (error) {
                    console.error('Error fetching assignments in store:', error)
                    // Don't set error state to avoid blocking main UI, just log it
                    // Maybe set empty to stop retrying infinitely?
                    // set({ assignedTeamIds: [] })
                }
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                session: state.session,
                profile: state.profile,
                assignedTeamIds: state.assignedTeamIds, // Persist assignments
            }),
        }
    )
)
