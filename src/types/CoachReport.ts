export interface CoachReportDB {
    id: string
    club_id: string
    coach_id: string
    season_id: string
    created_by: string
    asistencia: number // 1-5
    metodologia: number // 1-5
    comunicacion: number // 1-5
    clima_equipo: number // 1-5
    notas: string | null
    fecha: string
    created_at: string
    updated_at: string
}
