import { supabase } from '@/lib/supabaseClient'
import { TrainingSchedule } from '@/types/trainingScheduleTypes'

export interface TrainingScheduleDB {
    id: string
    club_id: string
    season_id: string
    team_id: string
    team_name: string
    days: number[]
    start_time: string
    end_time: string
    preferred_space: string
    alternative_spaces?: string[]
    period: 'season' | 'custom'
    custom_start_date?: string
    custom_end_date?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

// Convert DB format to app format
function dbToSchedule(dbSchedule: TrainingScheduleDB): TrainingSchedule {
    return {
        id: dbSchedule.id,
        clubId: dbSchedule.club_id,
        seasonId: dbSchedule.season_id,
        teamId: dbSchedule.team_id,
        teamName: dbSchedule.team_name,
        days: dbSchedule.days,
        startTime: dbSchedule.start_time,
        endTime: dbSchedule.end_time,
        preferredSpace: dbSchedule.preferred_space,
        alternativeSpaces: dbSchedule.alternative_spaces,
        period: dbSchedule.period,
        customStartDate: dbSchedule.custom_start_date,
        customEndDate: dbSchedule.custom_end_date,
        isActive: dbSchedule.is_active,
        createdAt: dbSchedule.created_at,
        updatedAt: dbSchedule.updated_at
    }
}

// Convert app format to DB format
function scheduleToDb(schedule: Partial<TrainingSchedule>): Partial<TrainingScheduleDB> {
    const db: Partial<TrainingScheduleDB> = {}
    if (schedule.clubId !== undefined) db.club_id = schedule.clubId
    if (schedule.seasonId !== undefined) db.season_id = schedule.seasonId
    if (schedule.teamId !== undefined) db.team_id = schedule.teamId
    if (schedule.teamName !== undefined) db.team_name = schedule.teamName
    if (schedule.days !== undefined) db.days = schedule.days
    if (schedule.startTime !== undefined) db.start_time = schedule.startTime
    if (schedule.endTime !== undefined) db.end_time = schedule.endTime
    if (schedule.preferredSpace !== undefined) db.preferred_space = schedule.preferredSpace
    if (schedule.alternativeSpaces !== undefined) db.alternative_spaces = schedule.alternativeSpaces
    if (schedule.period !== undefined) db.period = schedule.period
    if (schedule.customStartDate !== undefined) db.custom_start_date = schedule.customStartDate
    if (schedule.customEndDate !== undefined) db.custom_end_date = schedule.customEndDate
    if (schedule.isActive !== undefined) db.is_active = schedule.isActive
    return db
}

export const trainingScheduleService = {
    /**
     * Get all schedules for a specific club
     */
    async getSchedulesByClubId(clubId: string) {
        const { data, error } = await supabase
            .from('training_schedules')
            .select('*')
            .eq('club_id', clubId)
            .order('team_name')

        if (error) throw error
        return (data as TrainingScheduleDB[]).map(dbToSchedule)
    },

    /**
     * Get schedules for a specific season
     */
    async getSchedulesBySeason(seasonId: string) {
        const { data, error } = await supabase
            .from('training_schedules')
            .select('*')
            .eq('season_id', seasonId)
            .order('team_name')

        if (error) throw error
        return (data as TrainingScheduleDB[]).map(dbToSchedule)
    },

    /**
     * Create a new schedule
     */
    async createSchedule(schedule: Omit<TrainingSchedule, 'id' | 'createdAt' | 'updatedAt'>) {
        const dbSchedule = scheduleToDb(schedule)

        const { data, error } = await supabase
            .from('training_schedules')
            .insert(dbSchedule)
            .select()
            .single()

        if (error) throw error
        return dbToSchedule(data as TrainingScheduleDB)
    },

    /**
     * Update an existing schedule
     */
    async updateSchedule(id: string, updates: Partial<TrainingSchedule>) {
        const dbUpdates = scheduleToDb(updates)

        const { data, error } = await supabase
            .from('training_schedules')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return dbToSchedule(data as TrainingScheduleDB)
    },

    /**
     * Delete a schedule
     */
    async deleteSchedule(id: string) {
        const { error } = await supabase
            .from('training_schedules')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    /**
     * Toggle schedule active status
     */
    async toggleScheduleActive(id: string, currentStatus: boolean) {
        return this.updateSchedule(id, { isActive: !currentStatus })
    },

    /**
     * Clone schedules from one season to another
     */
    async cloneSchedulesToSeason(fromSeasonId: string, toSeasonId: string, clubId: string) {
        // Get source schedules
        const sourceSchedules = await this.getSchedulesBySeason(fromSeasonId)

        // Create new schedules for target season
        const promises = sourceSchedules.map(schedule => {
            const { id, createdAt, updatedAt, ...scheduleData } = schedule
            return this.createSchedule({
                ...scheduleData,
                seasonId: toSeasonId,
                clubId
            })
        })

        await Promise.all(promises)
    }
}
