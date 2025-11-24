import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'

type UserRole = 'director_tecnic' | 'entrenador' | 'admin'

interface Profile {
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
    setSession: (session: Session | null) => void
    setProfile: (profile: Profile | null) => void
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,
            profile: null,
            loading: false,
            error: null,

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
                    })
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
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                session: state.session,
                profile: state.profile,
            }),
        }
    )
)
