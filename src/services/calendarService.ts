import { supabase } from '@/lib/supabaseClient'
import { parseISO, isSameDay, format, addDays, startOfDay, endOfDay } from 'date-fns'

// Normalized event structure
export interface CalendarEvent {
    id: string
    type: 'match' | 'training' | 'schedule'
    title: string
    teamId: string
    teamName: string
    seasonId: string
    clubId: string
    startAt: string              // ISO UTC timestamp
    endAt?: string               // ISO UTC timestamp
    status: 'planned' | 'completed' | 'cancelled' | 'in_progress'
    location?: string
    preferredSpace?: string // New field for categorization
    notes?: string
    source: {
        table: 'matches' | 'trainings' | 'training_schedules'
        id: string
    }
    metadata?: {
        opponent?: string
        result?: string
        attendanceCount?: number
    }
}



// Transform match to calendar event
function matchToEvent(match: any, teamName: string): CalendarEvent {
    return {
        id: `match-${match.id}`,
        type: 'match',
        title: match.opponent_name,
        teamId: match.team_id,
        teamName,
        seasonId: match.season_id,
        clubId: match.club_id,
        startAt: match.match_date,
        endAt: undefined, // Matches don't have explicit end time
        status: match.status,
        location: match.location,
        notes: match.notes,
        source: {
            table: 'matches',
            id: match.id
        },
        metadata: {
            opponent: match.opponent_name,
            result: match.result
        }
    }
}

// Transform training to calendar event
function trainingToEvent(training: any, teamName: string, clubId: string, seasonId: string): CalendarEvent {
    return {
        id: `training-${training.id}`,
        type: 'training',
        title: training.title || 'Entrenamiento',
        teamId: training.team_id,
        teamName,
        seasonId,
        clubId,
        startAt: training.date, // Assuming this is stored as ISO timestamp
        endAt: undefined,
        status: 'completed', // Trainings are recorded, so they're completed
        location: undefined,
        notes: training.notes,
        source: {
            table: 'trainings',
            id: training.id
        },
        metadata: {
            attendanceCount: undefined // Could fetch from training_attendance if needed
        }
    }
}

// Transform schedule to calendar event for a specific date
function scheduleToEvent(
    schedule: any,
    date: Date,
    teamName: string
): CalendarEvent {
    // Combine date with schedule time
    const dateStr = format(date, 'yyyy-MM-dd')
    const startAt = `${dateStr}T${schedule.start_time}:00Z` // Assume UTC
    const endAt = `${dateStr}T${schedule.end_time}:00Z`

    return {
        id: `schedule-${schedule.id}-${dateStr}`,
        type: 'schedule',
        title: teamName,
        teamId: schedule.team_id,
        teamName,
        seasonId: schedule.season_id,
        clubId: schedule.club_id,
        startAt,
        endAt,
        status: 'planned',
        location: schedule.preferred_space,
        preferredSpace: schedule.preferred_space,
        notes: undefined,
        source: {
            table: 'training_schedules',
            id: schedule.id
        },
        metadata: {}
    }
}

// Expand training_schedules into concrete events for date range
function expandSchedulesToEvents(
    schedules: any[],
    startDate: Date,
    endDate: Date,
    teamsMap: Map<string, string> // teamId -> teamName
): CalendarEvent[] {
    const events: CalendarEvent[] = []

    for (const schedule of schedules) {
        if (!schedule.is_active) continue

        const teamName = teamsMap.get(schedule.team_id) || 'Equipo'

        // Iterate through each day in the range
        let currentDate = startOfDay(startDate)
        const end = endOfDay(endDate)

        while (currentDate <= end) {
            const dayOfWeek = (currentDate.getDay() + 6) % 7 // Convert to Mon=0, Sun=6

            // Check if schedule is active on this day
            if (schedule.days.includes(dayOfWeek)) {
                events.push(scheduleToEvent(schedule, currentDate, teamName))
            }

            currentDate = addDays(currentDate, 1)
        }
    }

    return events
}

// Deduplicate: training overrides schedule
function filterDuplicates(events: CalendarEvent[]): CalendarEvent[] {
    const trainings = events.filter(e => e.type === 'training')
    const schedules = events.filter(e => e.type === 'schedule')
    const others = events.filter(e => e.type !== 'training' && e.type !== 'schedule')

    // Filter schedules that have a training on the same team + day
    const dedupedSchedules = schedules.filter(schedule => {
        const scheduleDate = parseISO(schedule.startAt)

        return !trainings.some(training => {
            if (training.teamId !== schedule.teamId) return false

            const trainingDate = parseISO(training.startAt)
            if (!isSameDay(trainingDate, scheduleDate)) return false

            // For trainings without explicit time, assume it overlaps
            // In the future, can enhance trainings table to include time
            return true // If same team + same day, assume overlap
        })
    })

    const result = [...others, ...trainings, ...dedupedSchedules]

    return result
}

export const calendarService = {
    /**
     * Get all events for a specific team in a date range
     */
    async getTeamEvents(
        teamId: string,
        seasonId: string,
        startDate: Date,
        endDate: Date
    ): Promise<CalendarEvent[]> {
        const startISO = startOfDay(startDate).toISOString()
        const endISO = endOfDay(endDate).toISOString()

        // Fetch team info (teams are club entities, not seasonal)
        const { data: team } = await supabase
            .from('teams')
            .select('id, custom_name, category, identifier_id')
            .eq('id', teamId)
            .single()

        const teamName = team?.custom_name ||
            `${team?.category || ''}`.trim() ||
            'Equipo'



        const clubId = (await supabase
            .from('teams')
            .select('club_id')
            .eq('id', teamId)
            .single()).data?.club_id

        // Fetch matches (seasonal - filter by season_id)
        const { data: matches } = await supabase
            .from('matches')
            .select('*')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .gte('match_date', startISO)
            .lte('match_date', endISO)

        // Fetch trainings (seasonal - filter by season_id would go here if trainings had it)
        const { data: trainings } = await supabase
            .from('trainings')
            .select('*')
            .eq('team_id', teamId)
            .gte('date', startISO)
            .lte('date', endISO)

        // Fetch training_schedules (seasonal - filter by season_id)
        const { data: schedules } = await supabase
            .from('training_schedules')
            .select('*')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)

        // Transform to events
        const matchEvents = (matches || []).map(m => matchToEvent(m, teamName))
        const trainingEvents = (trainings || []).map(t => trainingToEvent(t, teamName, clubId, seasonId))

        const teamsMap = new Map([[teamId, teamName]])
        const scheduleEvents = expandSchedulesToEvents(schedules || [], startDate, endDate, teamsMap)

        // Combine and deduplicate
        const allEvents = [...matchEvents, ...trainingEvents, ...scheduleEvents]
        const dedupedEvents = filterDuplicates(allEvents)

        // Sort by startAt
        return dedupedEvents.sort((a, b) => a.startAt.localeCompare(b.startAt))
    },

    async getClubEvents(
        clubId: string,
        seasonId: string,
        startDate: Date,
        endDate: Date
    ): Promise<CalendarEvent[]> {
        const { data: teams } = await supabase
            .from('teams')
            .select('id')
            .eq('club_id', clubId)

        const teamIds = (teams || []).map(t => t.id)
        return this.getMultiTeamEvents(teamIds, seasonId, startDate, endDate, clubId)
    },

    /**
     * Get all events for specific team IDs
     */
    async getMultiTeamEvents(
        teamIds: string[],
        seasonId: string,
        startDate: Date,
        endDate: Date,
        clubId?: string // Optional, if known, to save a query or passed to event
    ): Promise<CalendarEvent[]> {
        if (teamIds.length === 0) return []

        const startISO = startOfDay(startDate).toISOString()
        const endISO = endOfDay(endDate).toISOString()

        // Fetch team info for map
        // Note: We need team info to display names
        const { data: teams } = await supabase
            .from('teams')
            .select('id, custom_name, category, gender, identifier_id, identifier:identifier_id(name), club_id')
            .in('id', teamIds)

        const teamsMap = new Map(
            (teams || []).map((t: any) => {
                const baseName = t.custom_name || `${t.category || ''}`.trim() || 'Equipo'
                let suffix = ''
                if (t.identifier?.name) {
                    suffix = ` ${t.identifier.name}`
                } else if (t.gender) {
                    const genderLabel = t.gender.toLowerCase() === 'male' ? 'Masc' :
                        t.gender.toLowerCase() === 'female' ? 'Fem' : t.gender
                    suffix = ` ${genderLabel}`
                }
                return [t.id, `${baseName}${suffix}`]
            })
        )

        // Use the first team's club_id if not provided (assuming all in same club usually)
        const effectiveClubId = clubId || (teams && teams.length > 0 ? teams[0].club_id : '')

        // Fetch seasonal data in parallel
        const [matchesResult, trainingsResult, schedulesResult] = await Promise.all([
            // Matches
            supabase
                .from('matches')
                .select('*')
                .in('team_id', teamIds)
                .eq('season_id', seasonId)
                .gte('match_date', startISO)
                .lte('match_date', endISO),

            // Trainings
            supabase
                .from('trainings')
                .select('*')
                .in('team_id', teamIds)
                .gte('date', startISO)
                .lte('date', endISO),

            // Schedules
            supabase
                .from('training_schedules')
                .select('*')
                .in('team_id', teamIds)
                .eq('season_id', seasonId)
        ])

        if (matchesResult.error) console.error('[Calendar] Error fetching matches:', matchesResult.error)
        if (trainingsResult.error) console.error('[Calendar] Error fetching trainings:', trainingsResult.error)
        if (schedulesResult.error) console.error('[Calendar] Error fetching schedules:', schedulesResult.error)

        const matches = matchesResult.data || []
        const trainings = trainingsResult.data || []
        const schedules = schedulesResult.data || []

        const matchEvents = matches.map(m =>
            matchToEvent(m, teamsMap.get(m.team_id) || 'Equipo')
        )

        const trainingEvents = trainings.map(t =>
            trainingToEvent(t, teamsMap.get(t.team_id) || 'Equipo', effectiveClubId, seasonId)
        )

        const scheduleEvents = expandSchedulesToEvents(schedules, startDate, endDate, teamsMap)

        const allEvents = [...matchEvents, ...trainingEvents, ...scheduleEvents]
        const dedupedEvents = filterDuplicates(allEvents)

        return dedupedEvents.sort((a, b) => a.startAt.localeCompare(b.startAt))
    }
}
