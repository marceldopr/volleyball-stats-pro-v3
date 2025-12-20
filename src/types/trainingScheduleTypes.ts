export interface TrainingSchedule {
    id: string
    clubId: string
    seasonId: string
    teamId: string
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
    createdAt?: string
    updatedAt?: string
}

// Mock data for demo purposes (deprecated - use Supabase)
export const MOCK_SCHEDULES: TrainingSchedule[] = []

