export interface TrainingSchedule {
    id: string
    teamName: string
    days: number[] // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    startTime: string // "HH:mm" format
    endTime: string // "HH:mm" format
    preferredSpace: string
    alternativeSpaces?: string[]
    period: 'season' | 'custom'
    customStartDate?: string
    customEndDate?: string
    isActive: boolean
}

// Mock data for demo purposes
export const MOCK_SCHEDULES: TrainingSchedule[] = [
    {
        id: '1',
        teamName: 'Cadete F',
        days: [0, 2], // Lun, Mié
        startTime: '18:00',
        endTime: '19:30',
        preferredSpace: 'Pista 2',
        alternativeSpaces: [],
        period: 'season',
        isActive: true
    },
    {
        id: '2',
        teamName: 'Junior F',
        days: [1, 3], // Mar, Jue
        startTime: '20:00',
        endTime: '21:30',
        preferredSpace: 'Pista 3',
        alternativeSpaces: ['Pista 1'],
        period: 'season',
        isActive: true
    },
    {
        id: '3',
        teamName: 'Senior M',
        days: [0, 2, 4], // Lun, Mié, Vie
        startTime: '21:00',
        endTime: '22:30',
        preferredSpace: 'Pista 1',
        alternativeSpaces: [],
        period: 'season',
        isActive: false
    }
]
