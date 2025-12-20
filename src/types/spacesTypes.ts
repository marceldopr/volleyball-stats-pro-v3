export interface Space {
    id: string
    clubId: string
    name: string
    type: 'interior' | 'exterior'
    capacity?: number
    notes?: string
    isActive: boolean
    createdAt?: string
    updatedAt?: string
}

// Mock data for demo purposes
export const MOCK_SPACES: Space[] = [
    {
        id: '1',
        clubId: 'mock-club-1',
        name: 'Pista 1',
        type: 'interior',
        capacity: undefined,
        notes: '',
        isActive: true
    },
    {
        id: '2',
        clubId: 'mock-club-1',
        name: 'Pista 2',
        type: 'interior',
        capacity: undefined,
        notes: '',
        isActive: true
    },
    {
        id: '3',
        clubId: 'mock-club-1',
        name: 'Gimnasio',
        type: 'interior',
        capacity: 20,
        notes: 'Para entrenamiento físico',
        isActive: true
    },
    {
        id: '4',
        clubId: 'mock-club-1',
        name: 'Patio exterior',
        type: 'exterior',
        capacity: undefined,
        notes: 'Solo buen tiempo',
        isActive: false
    }
]
