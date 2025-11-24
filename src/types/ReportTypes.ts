export interface PlayerReportDB {
    id: string
    club_id: string
    player_id: string
    team_id: string
    season_id: string
    match_id?: string | null
    report_date: string
    created_by: string
    sections: {
        technical: {
            serves: number
            reception: number
            attack: number
            block: number
            defense: number
            errorImpact: number
        }
        role: {
            status: 'titular' | 'rotacion' | 'suplente' | 'no_convocada'
        }
        attitude: {
            attendance: number  // asistencia / compromiso
            intensity: number
            communication: number
            adaptation: number
        }
        recommendation: {
            next: 'mantener' | 'probar_superior' | 'trabajar_area' | 'reposo_tecnico'
        }
    }
    final_comment?: string | null
    created_at: string
    updated_at: string
}
