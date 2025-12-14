export interface Space {
    id: string
    name: string
    type: 'interior' | 'exterior'
    capacity?: number
    notes?: string
    isActive: boolean
}

// Mock data for demo purposes
export const MOCK_SPACES: Space[] = [
    {
        id: '1',
        name: 'Pista 1',
        type: 'interior',
        capacity: undefined,
        notes: '',
        isActive: true
    },
    {
        id: '2',
        name: 'Pista 2',
        type: 'interior',
        capacity: undefined,
        notes: '',
        isActive: true
    },
    {
        id: '3',
        name: 'Gimnasio',
        type: 'interior',
        capacity: 20,
        notes: 'Para entrenamiento físico',
        isActive: true
    },
    {
        id: '4',
        name: 'Patio exterior',
        type: 'exterior',
        capacity: undefined,
        notes: 'Solo buen tiempo',
        isActive: false
    }
]
