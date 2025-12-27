import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UIMode = 'DT' | 'COACH'

interface UIState {
    uiMode: UIMode
    setUiMode: (mode: UIMode) => void
    toggleUiMode: () => void
}

export const useUiStore = create<UIState>()(
    persist(
        (set, get) => ({
            uiMode: 'DT',
            setUiMode: (mode) => set({ uiMode: mode }),
            toggleUiMode: () => set((state) => ({
                uiMode: state.uiMode === 'DT' ? 'COACH' : 'DT'
            })),
        }),
        {
            name: 'ui-storage',
        }
    )
)
